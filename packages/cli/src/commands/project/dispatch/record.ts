import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import {
  publishContainedJsonRevision,
  redactedFsError,
  withContainedWriterLock,
} from '@fs/io';
import {
  assertNoSensitiveDispatchContent,
  parseGenericDispatchRecord,
  type GenericDispatchRecord,
} from '@providers/identity/generic-dispatch-record';
import {
  augmentDispatchRecord,
  compareObservedRuntimeMetadata,
  configuredInvocationForObservation,
  parsePersistedOatDispatchRecord,
  parseRuntimeObservation,
  type OatDispatchEvidenceEvent,
  type ObservedRuntimeMetadata,
  type PersistedOatDispatchRecordV1,
  type RuntimeObservation,
} from '@providers/identity/oat-dispatch-record';
import {
  normalizeRuntimeObservation,
  parseRuntimeObservationEnvelope,
} from '@providers/identity/runtime-observation';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const DISPATCH_LOCK_NAME = '.dispatch-lock';

/**
 * Test seam for deterministic concurrency coverage. `afterRead` fires after the
 * caller has read the journal revision it will publish against and before the
 * writer lock is acquired, which is exactly the window a stale concurrent
 * writer occupies.
 */
export interface DispatchRecordRaceBarriers {
  afterRead?: () => Promise<void>;
}

/**
 * The journal is append-only. Revision 1 keeps the plain `<request-id>.json`
 * name; every later revision is published create-only under
 * `<request-id>@<NNNN>.json`. Publishing revision N+1 exclusively is the
 * compare-and-swap: a caller that lost the race observes `EEXIST` instead of
 * replacing the winner, and no publication can ever clobber an existing file.
 * `@` is outside the request-ID character class, so the split is unambiguous.
 */
const REVISION_SEPARATOR = '@';
const REVISION_SUFFIX_PATTERN = /^(.*)@(\d{4})$/;
const MAX_REVISION = 9999;

interface JournalEntry {
  requestId: string;
  revision: number;
  fileName: string;
}

function revisionFileName(requestId: string, revision: number): string {
  return revision === 1
    ? `${requestId}.json`
    : `${requestId}${REVISION_SEPARATOR}${String(revision).padStart(4, '0')}.json`;
}

function parseJournalEntry(fileName: string): JournalEntry | null {
  if (!fileName.endsWith('.json')) return null;
  const stem = fileName.slice(0, -'.json'.length);
  const suffixed = REVISION_SUFFIX_PATTERN.exec(stem);
  const requestId = suffixed?.[1] ?? stem;
  const revision = suffixed ? Number(suffixed[2]) : 1;
  if (!REQUEST_ID_PATTERN.test(requestId) || revision < 1) return null;
  return { requestId, revision, fileName };
}

/**
 * Hard redaction boundary. Producers redact their own messages, but this is the
 * last stop before a message reaches `--json`, so a future call site that
 * forgets cannot regress NFR1. Known roots become stable labels; anything else
 * that still looks like an absolute path is scrubbed.
 */
const ABSOLUTE_PATH_PATTERN =
  /(?<=^|[\s'"([])(?:[A-Za-z]:)?[\\/](?:[^\s'"`;,)\]]+[\\/])+[^\s'"`;,)\]]*/g;

export function redactDispatchMessage(
  message: string,
  roots: {
    project?: string | null;
    repo?: string | null;
    home?: string | null;
  } = {},
): string {
  let redacted = message;
  const labelled: readonly (readonly [string, string | null | undefined])[] = [
    ['<project>', roots.project],
    ['<repo>', roots.repo],
    ['<home>', roots.home],
  ];
  // Longest root first so a nested project path is not masked by its repo.
  for (const [label, root] of [...labelled].sort(
    ([, left], [, right]) => (right?.length ?? 0) - (left?.length ?? 0),
  )) {
    if (root) redacted = redacted.split(root).join(label);
  }
  return redacted.replace(ABSOLUTE_PATH_PATTERN, '<redacted-path>');
}

export interface DispatchRecordInput {
  record: GenericDispatchRecord;
  event: OatDispatchEvidenceEvent;
}

/**
 * Configured and observed identity, reported side by side and never merged.
 * `configured` is the launcher-owned immutable selection; `observed` is
 * optional per-run corroboration that is `null` whenever the provider reported
 * nothing. A `match` of `mismatching` is evidence, not authorization.
 */
export interface DispatchRecordRuntimeIdentity {
  configured: {
    roleName: string;
    roleSelector: string | null;
    model: string | null;
    effort: string | null;
    serviceTier: string | null;
  };
  observed: {
    provider: string;
    source: string;
    observedAt: string;
    childLineage: string | null;
    role: string | null;
    model: string | null;
    effort: string | null;
    serviceTier: string | null;
  } | null;
  match: 'matching' | 'mismatching' | 'not-comparable' | null;
  status: 'reported' | 'not-reported';
}

export type ProjectDispatchRecordResult = {
  status: 'persisted' | 'validated-only';
  path: string | null;
  created: boolean;
  record: PersistedOatDispatchRecordV1;
  runtimeIdentity: DispatchRecordRuntimeIdentity;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Resolve a post-launch observation event.
 *
 * A caller may submit either a finished `observation` or the sanitized provider
 * `metadata` it was derived from. Submitting both is ambiguous and is refused
 * rather than silently preferring one.
 *
 * Both forms are validated here, at the durable-write boundary, rather than
 * being trusted from the producer. An earlier revision normalized only the
 * metadata form, which left the finished-observation form able to assert its
 * own `match`, name a provider the record does not use, and store values the
 * metadata path would have refused. That is the per-producer-obligation class
 * this boundary exists to prevent, so `match` is always derived and never read
 * from the caller, and the provider is always bound to the record's own.
 *
 * Value shape is enforced once more in `runtimeObservationSchema`, so both
 * forms converge on the same identifier rules without either path carrying its
 * own copy of them.
 */
function resolveObservationEvent(
  record: GenericDispatchRecord,
  event: Record<string, unknown>,
): Record<string, unknown> {
  if (event.kind !== 'runtime-observation') return event;
  if ('metadata' in event && 'observation' in event) {
    throw new Error(
      'A runtime observation event carries either observation or metadata, not both.',
    );
  }

  if ('metadata' in event) {
    const { metadata, ...rest } = event;
    const envelope = parseRuntimeObservationEnvelope(metadata);
    return {
      ...rest,
      observation: normalizeRuntimeObservation({ record, envelope }),
    };
  }

  const observation = event.observation;
  if (!isRecord(observation) || observation.status !== 'reported') {
    return event;
  }
  if (observation.provider !== record.provider) {
    throw new Error(
      'A runtime observation must name the same provider as its dispatch record.',
    );
  }
  return {
    ...event,
    observation: parseRuntimeObservation({
      ...observation,
      match: compareObservedRuntimeMetadata(
        observation as ObservedRuntimeMetadata,
        configuredInvocationForObservation(record),
      ),
    }),
  };
}

export function parseDispatchRecordInput(value: unknown): DispatchRecordInput {
  assertNoSensitiveDispatchContent(value);
  if (!isRecord(value)) {
    throw new Error('Dispatch record input must be a JSON object.');
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== 'event' || keys[1] !== 'record') {
    throw new Error('Dispatch record input accepts only record and event.');
  }
  const record = parseGenericDispatchRecord(value.record);
  if (!isRecord(value.event)) {
    throw new Error('Dispatch record event must be a JSON object.');
  }
  return {
    record,
    event: resolveObservationEvent(
      record,
      value.event,
    ) as OatDispatchEvidenceEvent,
  };
}

function runtimeIdentityFor(
  record: PersistedOatDispatchRecordV1,
): DispatchRecordRuntimeIdentity {
  const observation: RuntimeObservation = record.oat.runtimeObservation;
  return {
    configured: {
      roleName: record.role_name,
      roleSelector: record.role_selector,
      model: record.model_selector,
      effort: record.effort_selector,
      serviceTier: record.service_tier_selector ?? null,
    },
    observed:
      observation.status === 'reported'
        ? {
            provider: observation.provider,
            source: observation.source,
            observedAt: observation.observedAt,
            childLineage: observation.childLineage ?? null,
            role: observation.role ?? null,
            model: observation.model ?? null,
            effort: observation.effort ?? null,
            serviceTier: observation.serviceTier ?? null,
          }
        : null,
    match: observation.status === 'reported' ? observation.match : null,
    status: observation.status,
  };
}

function genericPart(
  record: PersistedOatDispatchRecordV1,
): GenericDispatchRecord {
  const { oat: _oat, ...generic } = record;
  return parseGenericDispatchRecord(generic);
}

function sameGenericRecord(
  left: GenericDispatchRecord,
  right: GenericDispatchRecord,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isMissingError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

async function readPersistedRecord(
  path: string,
  reportedPath: string,
): Promise<PersistedOatDispatchRecordV1 | null> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingError(error)) {
      return null;
    }
    // A damaged or unreadable journal must not put an absolute project path
    // into durable output; NFR1 treats that as a P0 disclosure.
    throw redactedFsError(error, 'read', reportedPath);
  }
  return parsePersistedOatDispatchRecord(JSON.parse(content));
}

/** Highest published revision per request ID. */
async function readLatestRevisions(
  dispatchDir: string,
): Promise<Map<string, JournalEntry>> {
  let names: string[];
  try {
    names = await readdir(dispatchDir);
  } catch (error) {
    if (isMissingError(error)) {
      return new Map();
    }
    throw redactedFsError(error, 'scan', 'dispatch/');
  }
  const latest = new Map<string, JournalEntry>();
  for (const name of names.sort()) {
    const entry = parseJournalEntry(name);
    if (!entry) continue;
    const known = latest.get(entry.requestId);
    if (!known || entry.revision > known.revision) {
      latest.set(entry.requestId, entry);
    }
  }
  return latest;
}

function fallbackTriggerRequestId(
  event: OatDispatchEvidenceEvent,
): string | null {
  if (event.kind !== 'fallback-link') return null;
  const requestId = event.evidence?.triggerRequestId;
  if (typeof requestId !== 'string' || !REQUEST_ID_PATTERN.test(requestId)) {
    throw new Error('Fallback trigger request ID is invalid.');
  }
  return requestId;
}

function isAlreadyPublished(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'EEXIST'
  );
}

async function publishRevision(
  projectPath: string,
  dispatchDir: string,
  requestId: string,
  revision: number,
  record: PersistedOatDispatchRecordV1,
): Promise<string> {
  if (revision > MAX_REVISION) {
    throw new Error(
      `Dispatch journal for ${requestId} reached its ${MAX_REVISION}-revision limit.`,
    );
  }
  const fileName = revisionFileName(requestId, revision);
  try {
    await publishContainedJsonRevision(
      join(dispatchDir, fileName),
      record,
      projectPath,
    );
  } catch (error) {
    if (isAlreadyPublished(error)) {
      throw new Error(
        'The dispatch journal advanced to a newer revision while this write was prepared; the concurrent update was preserved and this stale write was refused.',
        { cause: error },
      );
    }
    throw error;
  }
  return `dispatch/${fileName}`;
}

export async function recordProjectDispatch(input: {
  projectPath: string | null;
  input: DispatchRecordInput;
  raceBarriers?: DispatchRecordRaceBarriers;
}): Promise<ProjectDispatchRecordResult> {
  const parsedInput = parseDispatchRecordInput(input.input);
  if (input.projectPath === null) {
    const record = augmentDispatchRecord(parsedInput);
    return {
      status: 'validated-only',
      path: null,
      created: false,
      record,
      runtimeIdentity: runtimeIdentityFor(record),
    };
  }

  const projectPath = input.projectPath;
  const dispatchDir = join(projectPath, 'dispatch');
  const requestId = parsedInput.record.request_id;
  const latest = await readLatestRevisions(dispatchDir);

  const existingEntry = latest.get(requestId) ?? null;
  const existing = existingEntry
    ? await readPersistedRecord(
        join(dispatchDir, existingEntry.fileName),
        `dispatch/${existingEntry.fileName}`,
      )
    : null;
  if (
    existing &&
    !sameGenericRecord(genericPart(existing), parsedInput.record)
  ) {
    throw new Error(
      'Existing generic fields are immutable and cannot be redefined.',
    );
  }

  const relatedRecords: PersistedOatDispatchRecordV1[] = [];
  for (const [otherId, entry] of [...latest].sort(([left], [right]) =>
    left < right ? -1 : 1,
  )) {
    if (otherId === requestId) continue;
    const related = await readPersistedRecord(
      join(dispatchDir, entry.fileName),
      `dispatch/${entry.fileName}`,
    );
    if (related) relatedRecords.push(related);
  }

  const triggerRequestId = fallbackTriggerRequestId(parsedInput.event);
  const triggerEntry = triggerRequestId
    ? (latest.get(triggerRequestId) ?? null)
    : null;
  const trigger = triggerEntry
    ? await readPersistedRecord(
        join(dispatchDir, triggerEntry.fileName),
        `dispatch/${triggerEntry.fileName}`,
      )
    : null;
  if (triggerRequestId !== null && trigger === null) {
    throw new Error('Fallback requires the rejected trigger record.');
  }

  await input.raceBarriers?.afterRead?.();

  // One shared, identity-bound transition. The lock serializes the trigger
  // claim and the fallback publication; the exclusive revision name is the
  // compare-and-swap, so a stale concurrent writer loses without any write
  // being able to replace the winner's evidence.
  return withContainedWriterLock(
    join(projectPath, DISPATCH_LOCK_NAME),
    projectPath,
    async () => {
      let triggerRecord = trigger ?? undefined;
      if (trigger && triggerEntry && triggerRequestId) {
        const claimed = augmentDispatchRecord({
          record: trigger,
          event: {
            kind: 'fallback-claim',
            requestId: triggerRequestId,
            source: 'provider-wrapper',
            claim: {
              fallbackRequestId: requestId,
              claimedAt: new Date().toISOString(),
            },
          },
        });
        if (JSON.stringify(claimed) !== JSON.stringify(trigger)) {
          await publishRevision(
            projectPath,
            dispatchDir,
            triggerRequestId,
            triggerEntry.revision + 1,
            claimed,
          );
        }
        triggerRecord = claimed;
      }

      const record = augmentDispatchRecord({
        record: existing ?? parsedInput.record,
        event: parsedInput.event,
        ...(triggerRecord ? { triggerRecord } : {}),
        relatedRecords,
      });
      const revision = (existingEntry?.revision ?? 0) + 1;
      const path = await publishRevision(
        projectPath,
        dispatchDir,
        requestId,
        revision,
        record,
      );
      return {
        status: 'persisted' as const,
        path,
        created: revision === 1,
        record,
        runtimeIdentity: runtimeIdentityFor(record),
      };
    },
  );
}
