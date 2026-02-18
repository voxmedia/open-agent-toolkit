import { relative } from 'node:path';
import type {
  CleanupActionRecord,
  CleanupJsonPayload,
  CleanupMode,
  CleanupStatus,
  CleanupSummary,
} from './cleanup.types';

export function toRepoRelativePath(
  repoRoot: string,
  targetPath: string,
): string {
  return relative(repoRoot, targetPath).replaceAll('\\', '/');
}

interface BuildCleanupSummaryArgs {
  scanned: number;
  issuesFound: number;
  actions: CleanupActionRecord[];
}

interface CreateCleanupPayloadArgs extends BuildCleanupSummaryArgs {
  status: CleanupStatus;
  apply: boolean;
}

export function toCleanupMode(apply: boolean): CleanupMode {
  return apply ? 'apply' : 'dry-run';
}

export function normalizeCleanupActions(
  actions: CleanupActionRecord[],
): CleanupActionRecord[] {
  return [...actions].sort((left, right) => {
    return (
      left.target.localeCompare(right.target) ||
      left.phase.localeCompare(right.phase) ||
      left.type.localeCompare(right.type) ||
      left.result.localeCompare(right.result) ||
      left.reason.localeCompare(right.reason)
    );
  });
}

export function buildCleanupSummary({
  scanned,
  issuesFound,
  actions,
}: BuildCleanupSummaryArgs): CleanupSummary {
  const normalizedActions = normalizeCleanupActions(actions);

  return {
    scanned,
    issuesFound,
    planned: normalizedActions.filter((action) => action.result === 'planned')
      .length,
    applied: normalizedActions.filter((action) => action.result === 'applied')
      .length,
    skipped: normalizedActions.filter((action) => action.result === 'skipped')
      .length,
    blocked: normalizedActions.filter((action) => action.result === 'blocked')
      .length,
  };
}

export function createCleanupPayload({
  status,
  apply,
  scanned,
  issuesFound,
  actions,
}: CreateCleanupPayloadArgs): CleanupJsonPayload {
  const normalizedActions = normalizeCleanupActions(actions);
  return {
    status,
    mode: toCleanupMode(apply),
    summary: buildCleanupSummary({
      scanned,
      issuesFound,
      actions: normalizedActions,
    }),
    actions: normalizedActions,
  };
}
