import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import {
  atomicWriteJsonContained,
  jsonJournalDigest,
  withContainedWriterLock,
} from '@fs/io';
import {
  assertNoSensitiveDispatchContent,
  parseGenericDispatchRecord,
  type GenericDispatchRecord,
} from '@providers/identity/generic-dispatch-record';
import {
  augmentDispatchRecord,
  parsePersistedOatDispatchRecord,
  type OatDispatchEvidenceEvent,
  type PersistedOatDispatchRecordV1,
} from '@providers/identity/oat-dispatch-record';

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

interface PersistedRevision {
  record: PersistedOatDispatchRecordV1;
  digest: string;
}

export interface DispatchRecordInput {
  record: GenericDispatchRecord;
  event: OatDispatchEvidenceEvent;
}

export type ProjectDispatchRecordResult = {
  status: 'persisted' | 'validated-only';
  path: string | null;
  created: boolean;
  record: PersistedOatDispatchRecordV1;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
    event: value.event as OatDispatchEvidenceEvent,
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

async function readPersistedRevision(
  path: string,
): Promise<PersistedRevision | null> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingError(error)) {
      return null;
    }
    throw error;
  }
  return {
    record: parsePersistedOatDispatchRecord(JSON.parse(content)),
    digest: jsonJournalDigest(content),
  };
}

async function readPersistedRecord(
  path: string,
): Promise<PersistedOatDispatchRecordV1 | null> {
  return (await readPersistedRevision(path))?.record ?? null;
}

async function readRelatedRecords(
  dispatchDir: string,
): Promise<PersistedOatDispatchRecordV1[]> {
  let names: string[];
  try {
    names = await readdir(dispatchDir);
  } catch (error) {
    if (isMissingError(error)) {
      return [];
    }
    throw error;
  }
  const records: PersistedOatDispatchRecordV1[] = [];
  for (const name of names.sort()) {
    if (!name.endsWith('.json')) continue;
    const record = await readPersistedRecord(join(dispatchDir, name));
    if (record) records.push(record);
  }
  return records;
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

export async function recordProjectDispatch(input: {
  projectPath: string | null;
  input: DispatchRecordInput;
  raceBarriers?: DispatchRecordRaceBarriers;
}): Promise<ProjectDispatchRecordResult> {
  const parsedInput = parseDispatchRecordInput(input.input);
  if (input.projectPath === null) {
    return {
      status: 'validated-only',
      path: null,
      created: false,
      record: augmentDispatchRecord(parsedInput),
    };
  }

  const projectPath = input.projectPath;
  const dispatchDir = join(projectPath, 'dispatch');
  const recordPath = join(dispatchDir, `${parsedInput.record.request_id}.json`);
  const existing = await readPersistedRevision(recordPath);
  if (
    existing &&
    !sameGenericRecord(genericPart(existing.record), parsedInput.record)
  ) {
    throw new Error(
      'Existing generic fields are immutable and cannot be redefined.',
    );
  }

  const relatedRecords = await readRelatedRecords(dispatchDir);
  const triggerRequestId = fallbackTriggerRequestId(parsedInput.event);
  const triggerPath =
    triggerRequestId === null
      ? null
      : join(dispatchDir, `${triggerRequestId}.json`);
  const trigger = triggerPath ? await readPersistedRevision(triggerPath) : null;
  if (triggerPath !== null && trigger === null) {
    throw new Error('Fallback requires the rejected trigger record.');
  }

  await input.raceBarriers?.afterRead?.();

  // One shared, identity-bound transition. The lock serializes claim and
  // publication; every write additionally compares and swaps the exact revision
  // it was derived from, so a stale concurrent writer fails instead of silently
  // discarding the winner's evidence.
  return withContainedWriterLock(
    join(projectPath, DISPATCH_LOCK_NAME),
    projectPath,
    async () => {
      let triggerRecord = trigger?.record;
      if (trigger && triggerPath && triggerRequestId) {
        const claimed = augmentDispatchRecord({
          record: trigger.record,
          event: {
            kind: 'fallback-claim',
            requestId: triggerRequestId,
            source: 'provider-wrapper',
            claim: {
              fallbackRequestId: parsedInput.record.request_id,
              claimedAt: new Date().toISOString(),
            },
          },
        });
        if (JSON.stringify(claimed) !== JSON.stringify(trigger.record)) {
          await atomicWriteJsonContained(triggerPath, claimed, projectPath, {
            expectedDigest: trigger.digest,
          });
        }
        triggerRecord = claimed;
      }

      const record = augmentDispatchRecord({
        record: existing?.record ?? parsedInput.record,
        event: parsedInput.event,
        ...(triggerRecord ? { triggerRecord } : {}),
        relatedRecords,
      });
      await atomicWriteJsonContained(
        recordPath,
        record,
        projectPath,
        existing === null
          ? { createOnly: true }
          : { expectedDigest: existing.digest },
      );
      return {
        status: 'persisted' as const,
        path: `dispatch/${parsedInput.record.request_id}.json`,
        created: existing === null,
        record,
      };
    },
  );
}
