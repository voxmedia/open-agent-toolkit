import type { StructuredFinding, StructuredFindings } from './types';

export type { StructuredFinding, StructuredFindings } from './types';
export type FindingSeverity = StructuredFinding['severity'];

const SEVERITIES: ReadonlySet<string> = new Set([
  'critical',
  'important',
  'medium',
  'minor',
]);

export class StructuredFindingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StructuredFindingsError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateFinding(value: unknown, index: number): StructuredFinding {
  const at = `findings[${index}]`;
  if (!isObject(value)) {
    throw new StructuredFindingsError(`${at} must be an object.`);
  }

  if (typeof value['id'] !== 'string' || value['id'] === '') {
    throw new StructuredFindingsError(`${at}.id must be a non-empty string.`);
  }
  if (
    typeof value['severity'] !== 'string' ||
    !SEVERITIES.has(value['severity'])
  ) {
    throw new StructuredFindingsError(
      `${at}.severity must be one of critical|important|medium|minor.`,
    );
  }
  if (typeof value['title'] !== 'string') {
    throw new StructuredFindingsError(`${at}.title must be a string.`);
  }
  if (typeof value['body'] !== 'string') {
    throw new StructuredFindingsError(`${at}.body must be a string.`);
  }

  const file = value['file'];
  const line = value['line'];
  const fileSet = file !== null;
  const lineSet = line !== null;
  if (fileSet !== lineSet) {
    throw new StructuredFindingsError(
      `${at} must set both file and line, or set both to null.`,
    );
  }
  if (fileSet && typeof file !== 'string') {
    throw new StructuredFindingsError(`${at}.file must be a string or null.`);
  }
  if (lineSet && typeof line !== 'number') {
    throw new StructuredFindingsError(`${at}.line must be a number or null.`);
  }

  const fixGuidance = value['fix_guidance'];
  if (fixGuidance !== null && typeof fixGuidance !== 'string') {
    throw new StructuredFindingsError(
      `${at}.fix_guidance must be a string or null.`,
    );
  }

  return {
    id: value['id'],
    severity: value['severity'] as FindingSeverity,
    title: value['title'],
    file: fileSet ? (file as string) : null,
    line: lineSet ? (line as number) : null,
    body: value['body'],
    fix_guidance: fixGuidance === null ? null : (fixGuidance as string),
  };
}

export function validateStructuredFindings(value: unknown): StructuredFindings {
  if (!isObject(value)) {
    throw new StructuredFindingsError('StructuredFindings must be an object.');
  }
  if (typeof value['summary'] !== 'string') {
    throw new StructuredFindingsError('summary must be a string.');
  }
  if (!Array.isArray(value['findings'])) {
    throw new StructuredFindingsError('findings must be an array.');
  }
  const commands = value['verification_commands'];
  if (
    !Array.isArray(commands) ||
    !commands.every((command) => typeof command === 'string')
  ) {
    throw new StructuredFindingsError(
      'verification_commands must be an array of strings.',
    );
  }

  return {
    summary: value['summary'],
    findings: value['findings'].map((finding, index) =>
      validateFinding(finding, index),
    ),
    verification_commands: commands as string[],
  };
}
