import type { DocsCheckRule } from '@config/documentation-check';
export interface DocsFinding {
  ruleId: DocsCheckRule | 'configuration';
  severity: 'error' | 'warn';
  path: string;
  line?: number;
  message: string;
}
export interface DocsCheckResult {
  summary: { errors: number; warnings: number };
  findings: DocsFinding[];
}
export type Report = (
  rule: DocsCheckRule,
  severity: 'error' | 'warn',
  path: string,
  message: string,
  line?: number,
) => void;
