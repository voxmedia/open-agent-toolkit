import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { DoctorCheck } from '@ui/output';

import {
  RemoteBindingMetadataSchema,
  RemoteBindingStateSchema,
  RemoteOperationRecordSchema,
  assertRecordIdMatchesFilename,
  type RemoteBindingMetadata,
  type RemoteBindingState,
  type RemoteOperationRecord,
} from './schema';

export interface RemoteDoctorInput {
  portableBindingsDir: string;
  operationalBindingsDir: string;
  operationsDir: string;
  associatedBindingIds?: readonly string[];
  policy?: unknown;
}

interface LoadedRecord<T> {
  filename: string;
  raw: unknown;
  parsed: T | null;
}

export async function runRemoteDoctorChecks(
  input: RemoteDoctorInput,
): Promise<DoctorCheck[]> {
  const [metadataFiles, stateFiles, operationFiles] = await Promise.all([
    loadRecords(input.portableBindingsDir, RemoteBindingMetadataSchema),
    loadRecords(input.operationalBindingsDir, RemoteBindingStateSchema),
    loadRecords(input.operationsDir, RemoteOperationRecordSchema),
  ]);
  const adopted =
    metadataFiles.length > 0 ||
    stateFiles.length > 0 ||
    operationFiles.length > 0 ||
    (input.associatedBindingIds?.length ?? 0) > 0 ||
    input.policy !== undefined;
  if (!adopted) return [];

  const schemaFindings = collectSchemaFindings(
    metadataFiles,
    stateFiles,
    operationFiles,
  );
  const metadata = metadataFiles.flatMap((file) =>
    file.parsed ? [file.parsed] : [],
  );
  const states = stateFiles.flatMap((file) =>
    file.parsed ? [file.parsed] : [],
  );
  const operations = operationFiles.flatMap((file) =>
    file.parsed ? [file.parsed] : [],
  );

  const identityFindings = collectIdentityFindings(
    metadata,
    states,
    input.associatedBindingIds ?? [],
  );
  const metadataStateFindings = collectMetadataStateFindings(metadata, states);
  const forbiddenContent = metadataFiles
    .filter((file) => containsForbiddenPortableKey(file.raw))
    .map((file) => file.filename);
  const policyValid =
    input.policy === undefined || isValidRemotePolicy(input.policy);
  const concurrentBindings = collectConcurrentBindings(operations);

  return [
    findingCheck(
      'pjm:remote_schema',
      'Remote record schema and filename identity',
      schemaFindings,
    ),
    findingCheck(
      'pjm:remote_binding_ids',
      'Remote binding references and stable identities',
      identityFindings,
    ),
    findingCheck(
      'pjm:remote_metadata_state',
      'Portable metadata and operational state agreement',
      metadataStateFindings,
    ),
    findingCheck(
      'pjm:remote_storage_content',
      'Portable metadata excludes operational or sensitive content',
      forbiddenContent,
    ),
    {
      name: 'pjm:remote_policy',
      description: 'Remote repository policy is valid and fail-closed',
      status: policyValid ? 'pass' : 'fail',
      message: policyValid
        ? 'Remote policy is valid or not configured.'
        : 'Remote policy contains an invalid schema, description, storage, or authority value.',
      fix: policyValid
        ? undefined
        : 'Repair pjm.remote policy in shared .oat/config.json before any remote mutation.',
    },
    findingCheck(
      'pjm:remote_concurrent_intents',
      'Concurrent active remote operation intents',
      concurrentBindings,
    ),
  ];
}

async function loadRecords<T>(
  directory: string,
  schema: {
    safeParse(value: unknown): { success: true; data: T } | { success: false };
  },
): Promise<LoadedRecord<T>[]> {
  let filenames: string[];
  try {
    filenames = (await readdir(directory)).filter((name) =>
      name.endsWith('.json'),
    );
  } catch (error) {
    if (isFilesystemError(error, 'ENOENT')) return [];
    throw error;
  }
  const records: LoadedRecord<T>[] = [];
  for (const filename of filenames.sort()) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(await readFile(join(directory, filename), 'utf8'));
    } catch {
      records.push({ filename, raw: null, parsed: null });
      continue;
    }
    const result = schema.safeParse(raw);
    records.push({
      filename,
      raw,
      parsed: result.success ? result.data : null,
    });
  }
  return records;
}

function collectSchemaFindings(
  metadata: LoadedRecord<RemoteBindingMetadata>[],
  states: LoadedRecord<RemoteBindingState>[],
  operations: LoadedRecord<RemoteOperationRecord>[],
): string[] {
  const findings: string[] = [];
  for (const [files, idFor] of [
    [metadata, (record: RemoteBindingMetadata) => record.bindingId],
    [states, (record: RemoteBindingState) => record.bindingId],
    [operations, (record: RemoteOperationRecord) => record.operationId],
  ] as const) {
    for (const file of files) {
      if (!file.parsed) {
        findings.push(file.filename);
        continue;
      }
      try {
        assertRecordIdMatchesFilename(
          file.filename,
          idFor(file.parsed as never),
        );
      } catch {
        findings.push(file.filename);
      }
    }
  }
  return findings;
}

function collectIdentityFindings(
  metadata: RemoteBindingMetadata[],
  states: RemoteBindingState[],
  associatedBindingIds: readonly string[],
): string[] {
  const findings: string[] = [];
  const known = new Set(metadata.map((record) => record.bindingId));
  for (const bindingId of associatedBindingIds) {
    if (!known.has(bindingId)) findings.push(`dangling:${bindingId}`);
  }
  for (const state of states) {
    if (!known.has(state.bindingId))
      findings.push(`dangling-state:${state.bindingId}`);
  }
  const byIdentity = new Map<string, string[]>();
  for (const record of metadata) {
    const key = `${record.provider}:${record.remoteIdentity.stableId}`;
    const ids = byIdentity.get(key) ?? [];
    ids.push(record.bindingId);
    byIdentity.set(key, ids);
  }
  for (const ids of byIdentity.values()) {
    if (ids.length > 1) findings.push(`duplicate:${ids.join(',')}`);
  }
  return findings;
}

function collectMetadataStateFindings(
  metadata: RemoteBindingMetadata[],
  states: RemoteBindingState[],
): string[] {
  const metadataById = new Map(
    metadata.map((record) => [record.bindingId, record]),
  );
  const statesById = new Map(
    states.map((record) => [record.bindingId, record]),
  );
  const findings: string[] = [];
  for (const record of metadata) {
    const state = statesById.get(record.bindingId);
    if (state && state.metadataUpdatedAt !== record.updatedAt) {
      findings.push(record.bindingId);
    }
  }
  for (const state of states) {
    if (!metadataById.has(state.bindingId)) findings.push(state.bindingId);
  }
  return [...new Set(findings)];
}

function containsForbiddenPortableKey(
  value: unknown,
  path: readonly string[] = [],
): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenPortableKey(entry, path));
  }
  if (!isRecord(value)) return false;
  const forbidden = new Set([
    'snapshot',
    'baseline',
    'attempts',
    'receipt',
    'rawPayload',
    'credential',
    'authorization',
  ]);
  return Object.entries(value).some(
    ([key, child]) =>
      forbidden.has(key) ||
      (key === 'description' && path.length === 0) ||
      containsForbiddenPortableKey(child, [...path, key]),
  );
}

function isValidRemotePolicy(value: unknown): boolean {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isRecord(value.policy)
  ) {
    return false;
  }
  if (
    isRecord(value.storage) &&
    value.storage.state !== 'local' &&
    value.storage.state !== 'shared'
  ) {
    return false;
  }
  if (
    !['none', 'managed-section', 'replace'].includes(
      String(value.policy.description),
    )
  ) {
    return false;
  }
  if (!isRecord(value.policy.authority)) return false;
  const authorities = new Set([
    'read-only',
    'user-approved',
    'user-authorized',
    'autonomous',
  ]);
  return authorities.has(String(value.policy.authority.default));
}

function collectConcurrentBindings(
  operations: RemoteOperationRecord[],
): string[] {
  const counts = new Map<string, number>();
  const active = new Set([
    'planned',
    'authorized',
    'attempt-started',
    'partial',
    'uncertain',
  ]);
  for (const operation of operations) {
    if (active.has(operation.state)) {
      counts.set(
        operation.bindingId,
        (counts.get(operation.bindingId) ?? 0) + 1,
      );
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([bindingId]) => bindingId)
    .sort();
}

function findingCheck(
  name: string,
  description: string,
  findings: string[],
): DoctorCheck {
  return {
    name,
    description,
    status: findings.length === 0 ? 'pass' : 'fail',
    message:
      findings.length === 0
        ? `${description} passed.`
        : `${description} findings: ${findings.join(', ')}`,
    fix:
      findings.length === 0
        ? undefined
        : 'Inspect the named local record identifiers and reconcile them before remote mutation.',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilesystemError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
