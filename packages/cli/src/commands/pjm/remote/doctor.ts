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

type RemoteContext = RemoteBindingMetadata['remoteIdentity']['context'];
const REMOTE_CONTEXT_FIELDS = [
  'host',
  'owner',
  'repositoryId',
  'workspaceId',
  'teamId',
  'cloudId',
  'siteId',
  'projectId',
] as const satisfies readonly (keyof RemoteContext)[];

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
  const policyFindings = collectRemotePolicyFindings(input.policy);
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
      status: policyFindings.length === 0 ? 'pass' : 'fail',
      message:
        policyFindings.length === 0
          ? 'Remote policy is valid or not configured.'
          : `Remote policy contains invalid or unknown fields: ${policyFindings.join(', ')}.`,
      fix:
        policyFindings.length === 0
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
    if (!state) continue;
    if (state.metadataUpdatedAt !== record.updatedAt) {
      findings.push(`${record.bindingId}:metadata-timestamp`);
    }
    if (state.provider !== record.provider) {
      findings.push(`${record.bindingId}:provider`);
    }
    if (state.snapshot) {
      if (state.snapshot.identity.stableId !== record.remoteIdentity.stableId) {
        findings.push(`${record.bindingId}:identity`);
      }
      if (
        !remoteContextsMatch(
          state.snapshot.identity.context,
          record.remoteIdentity.context,
        )
      ) {
        findings.push(`${record.bindingId}:identity-context`);
      }
    }
    if (
      state.capability &&
      !remoteContextsMatch(
        state.capability.context,
        record.remoteIdentity.context,
      )
    ) {
      findings.push(`${record.bindingId}:capability-context`);
    }
  }
  for (const state of states) {
    if (!metadataById.has(state.bindingId)) findings.push(state.bindingId);
  }
  return [...new Set(findings)];
}

function remoteContextsMatch(
  left: RemoteContext,
  right: RemoteContext,
): boolean {
  return REMOTE_CONTEXT_FIELDS.every((field) => left[field] === right[field]);
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

function collectRemotePolicyFindings(value: unknown): string[] {
  if (value === undefined) return [];
  const findings: string[] = [];
  if (!isRecord(value)) return ['pjm.remote'];
  collectUnknownKeys(
    value,
    ['schemaVersion', 'storage', 'policy'],
    'pjm.remote',
    findings,
  );
  if (value.schemaVersion !== 1) findings.push('pjm.remote.schemaVersion');
  if ('storage' in value) {
    if (!isRecord(value.storage)) {
      findings.push('pjm.remote.storage');
    } else {
      collectUnknownKeys(
        value.storage,
        ['state'],
        'pjm.remote.storage',
        findings,
      );
      if (!['local', 'shared'].includes(String(value.storage.state))) {
        findings.push('pjm.remote.storage.state');
      }
    }
  }
  if (!isRecord(value.policy)) {
    findings.push('pjm.remote.policy');
    return [...new Set(findings)];
  }
  collectUnknownKeys(
    value.policy,
    ['description', 'authority', 'providers'],
    'pjm.remote.policy',
    findings,
  );
  if (!isDescriptionMode(value.policy.description)) {
    findings.push('pjm.remote.policy.description');
  }
  collectAuthorityFindings(
    value.policy.authority,
    'pjm.remote.policy.authority',
    findings,
    true,
  );
  if ('providers' in value.policy) {
    if (!isRecord(value.policy.providers)) {
      findings.push('pjm.remote.policy.providers');
    } else {
      const providers = new Set(['github', 'linear', 'jira']);
      for (const [provider, providerPolicy] of Object.entries(
        value.policy.providers,
      )) {
        const path = `pjm.remote.policy.providers.${provider}`;
        if (!providers.has(provider) || !isRecord(providerPolicy)) {
          findings.push(path);
          continue;
        }
        collectUnknownKeys(
          providerPolicy,
          ['description', 'authority'],
          path,
          findings,
        );
        if (
          'description' in providerPolicy &&
          !isDescriptionMode(providerPolicy.description)
        ) {
          findings.push(`${path}.description`);
        }
        if ('authority' in providerPolicy) {
          collectAuthorityFindings(
            providerPolicy.authority,
            `${path}.authority`,
            findings,
            false,
          );
        }
      }
    }
  }
  return [...new Set(findings)].sort();
}

function collectAuthorityFindings(
  value: unknown,
  path: string,
  findings: string[],
  requireDefault: boolean,
): void {
  if (!isRecord(value)) {
    findings.push(path);
    return;
  }
  collectUnknownKeys(value, ['default', 'operations'], path, findings);
  if (requireDefault && !('default' in value)) findings.push(`${path}.default`);
  if ('default' in value && !isAuthority(value.default)) {
    findings.push(`${path}.default`);
  }
  if ('operations' in value) {
    if (!isRecord(value.operations)) {
      findings.push(`${path}.operations`);
      return;
    }
    const operations = new Set([
      'create',
      'update-fields',
      'transition',
      'annotate',
      'delete',
      'relink',
      'detach',
      'recreate',
    ]);
    for (const [operation, authority] of Object.entries(value.operations)) {
      const operationPath = `${path}.operations.${operation}`;
      if (!operations.has(operation) || !isAuthority(authority)) {
        findings.push(operationPath);
      }
    }
  }
}

function collectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  findings: string[],
): void {
  const keys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) findings.push(`${path}.${key}`);
  }
}

function isDescriptionMode(value: unknown): boolean {
  return ['none', 'managed-section', 'replace'].includes(String(value));
}

function isAuthority(value: unknown): boolean {
  return [
    'read-only',
    'user-approved',
    'user-authorized',
    'autonomous',
  ].includes(String(value));
}

function collectConcurrentBindings(
  operations: RemoteOperationRecord[],
): string[] {
  const counts = new Map<string, number>();
  const active = new Set([
    'planned',
    'pending',
    'authorized',
    'attempt-started',
    'verification-pending',
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
