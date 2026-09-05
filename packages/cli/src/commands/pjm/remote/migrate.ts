import { semanticDigest } from './provider';

export interface RemoteMigrationResult {
  schemaVersion: 1;
  mode: 'check' | 'apply';
  previewDigest: string;
  changed: boolean;
  applied: boolean;
  associatedIssues: unknown[];
}

export function migrateRemoteAssociations(input: {
  mode: 'check' | 'apply';
  associatedIssues: readonly unknown[];
  approvalDigest?: string;
}): RemoteMigrationResult {
  const associatedIssues = input.associatedIssues.map(canonicalizeAssociation);
  const previewDigest = semanticDigest({
    operation: 'local-remote-association-migration',
    before: input.associatedIssues,
    after: associatedIssues,
  });
  const changed =
    JSON.stringify(input.associatedIssues) !== JSON.stringify(associatedIssues);
  if (input.mode === 'apply' && input.approvalDigest !== previewDigest) {
    throw new Error('Apply requires the exact approved migration preview.');
  }
  return {
    schemaVersion: 1,
    mode: input.mode,
    previewDigest,
    changed,
    applied: input.mode === 'apply',
    associatedIssues,
  };
}

function canonicalizeAssociation(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) return value;
  const type = value.slice(0, separator);
  if (!['github', 'linear', 'jira'].includes(type)) return value;
  return { type, ref: value.slice(separator + 1) };
}
