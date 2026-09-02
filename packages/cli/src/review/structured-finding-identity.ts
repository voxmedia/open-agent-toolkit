import type { StructuredFinding } from './types';

type FindingSeverity = StructuredFinding['severity'];

const FINDING_ID_PATTERNS: Record<FindingSeverity, RegExp> = {
  critical: /^C[1-9]\d*$/,
  important: /^I[1-9]\d*$/,
  medium: /^M[1-9]\d*$/,
  minor: /^m[1-9]\d*$/,
};

export function findingIdMatchesSeverity(
  id: string,
  severity: FindingSeverity,
): boolean {
  return FINDING_ID_PATTERNS[severity].test(id);
}
