import { createHash } from 'node:crypto';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import YAML from 'yaml';

import {
  CLERICAL_SETTLEMENT_SCHEMA_VERSION,
  REPAIR_KINDS,
  REVIEW_ROW_FIELDS,
  type AuthoritativeSource,
  type ClericalSettlementEntry,
  type ClericalSettlementProposal,
  type ProposalFinding,
  type ReviewRowField,
  type SettlementEvent,
} from './contract';

const FULL_SHA = /^[0-9a-f]{40}$/;
const REVIEW_FIELDS = new Set<string>(REVIEW_ROW_FIELDS);
const REPAIR_KIND_SET = new Set<string>(REPAIR_KINDS);

export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const permitted = new Set([...required, ...optional]);
  const missing = required.filter((key) => !(key in value));
  const extra = Object.keys(value).filter((key) => !permitted.has(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label} has invalid keys${missing.length > 0 ? `; missing ${missing.join(', ')}` : ''}${extra.length > 0 ? `; unknown ${extra.join(', ')}` : ''}`,
    );
  }
}

function parseEvent(value: unknown, label: string): SettlementEvent {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  exactKeys(value, ['scope', 'type', 'artifact'], [], label);
  return {
    scope: nonEmptyString(value['scope'], `${label}.scope`),
    type: nonEmptyString(value['type'], `${label}.type`),
    artifact: nonEmptyString(value['artifact'], `${label}.artifact`),
  };
}

function parseReviewField(value: unknown, label: string): ReviewRowField {
  const field = nonEmptyString(value, label);
  if (!REVIEW_FIELDS.has(field)) {
    throw new Error(
      `${label} must be one of ${REVIEW_ROW_FIELDS.join(', ')}; Status is never eligible`,
    );
  }
  return field as ReviewRowField;
}

function parseSource(value: unknown, label: string): AuthoritativeSource {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const kind = nonEmptyString(value['kind'], `${label}.kind`);
  if (kind === 'review-artifact') {
    exactKeys(value, ['kind', 'field'], [], label);
    const field = nonEmptyString(value['field'], `${label}.field`);
    if (
      !['generatedAt', 'reviewedHead', 'invocation', 'gateTarget'].includes(
        field,
      )
    ) {
      throw new Error(`${label}.field is not a review-artifact field`);
    }
    return {
      kind,
      field: field as Extract<
        AuthoritativeSource,
        { kind: 'review-artifact' }
      >['field'],
    };
  }
  if (kind === 'gate-proof') {
    exactKeys(value, ['kind', 'path', 'field'], [], label);
    const field = nonEmptyString(value['field'], `${label}.field`);
    if (!['runId', 'target', 'reviewedHead', 'artifact'].includes(field)) {
      throw new Error(`${label}.field is not a gate-proof field`);
    }
    return {
      kind,
      path: nonEmptyString(value['path'], `${label}.path`),
      field: field as Extract<
        AuthoritativeSource,
        { kind: 'gate-proof' }
      >['field'],
    };
  }
  if (kind === 'archived-artifact') {
    exactKeys(value, ['kind', 'sourcePath', 'archivedPath'], [], label);
    return {
      kind,
      sourcePath: nonEmptyString(value['sourcePath'], `${label}.sourcePath`),
      archivedPath: nonEmptyString(
        value['archivedPath'],
        `${label}.archivedPath`,
      ),
    };
  }
  if (kind === 'review-row') {
    exactKeys(value, ['kind', 'field'], [], label);
    return {
      kind,
      field: parseReviewField(value['field'], `${label}.field`),
    };
  }
  throw new Error(`${label}.kind is not a closed authoritative-source kind`);
}

function parseFinding(value: unknown, index: number): ProposalFinding {
  const label = `findings[${index}]`;
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  exactKeys(
    value,
    ['id', 'repairKind', 'correctedField', 'record', 'authoritativeSource'],
    [],
    label,
  );
  const repairKind = nonEmptyString(value['repairKind'], `${label}.repairKind`);
  if (!REPAIR_KIND_SET.has(repairKind)) {
    throw new Error(
      `${label}.repairKind must be one of ${REPAIR_KINDS.join(', ')}`,
    );
  }
  const record = value['record'];
  if (!isRecord(record)) throw new Error(`${label}.record must be an object`);
  const recordKind = nonEmptyString(record['kind'], `${label}.record.kind`);
  let parsedRecord: ProposalFinding['record'];
  if (recordKind === 'reviews-row') {
    exactKeys(record, ['kind', 'path'], [], `${label}.record`);
    if (record['path'] !== 'plan.md') {
      throw new Error(`${label}.record.path must be plan.md`);
    }
    parsedRecord = { kind: recordKind, path: 'plan.md' };
  } else if (recordKind === 'journal-field') {
    exactKeys(record, ['kind', 'path', 'heading'], [], `${label}.record`);
    if (record['path'] !== 'implementation.md') {
      throw new Error(`${label}.record.path must be implementation.md`);
    }
    parsedRecord = {
      kind: recordKind,
      path: 'implementation.md',
      heading: nonEmptyString(record['heading'], `${label}.record.heading`),
    };
  } else {
    throw new Error(`${label}.record.kind is not permitted`);
  }
  return {
    id: nonEmptyString(value['id'], `${label}.id`),
    repairKind: repairKind as ProposalFinding['repairKind'],
    correctedField: parseReviewField(
      value['correctedField'],
      `${label}.correctedField`,
    ),
    record: parsedRecord,
    authoritativeSource: parseSource(
      value['authoritativeSource'],
      `${label}.authoritativeSource`,
    ),
  };
}

export function parseProposal(content: string): ClericalSettlementProposal {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `proposal is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  if (!isRecord(raw)) throw new Error('proposal must be a JSON object');
  exactKeys(
    raw,
    ['schemaVersion', 'mode', 'event', 'repairRange', 'receipt', 'findings'],
    ['gateProof', 'goal'],
    'proposal',
  );
  if (raw['schemaVersion'] !== CLERICAL_SETTLEMENT_SCHEMA_VERSION) {
    throw new Error('proposal.schemaVersion must be 1');
  }
  if (raw['mode'] !== 'first-settlement' && raw['mode'] !== 'replay') {
    throw new Error('proposal.mode must be first-settlement or replay');
  }
  const repairRange = raw['repairRange'];
  if (!isRecord(repairRange)) {
    throw new Error('proposal.repairRange must be an object');
  }
  exactKeys(repairRange, ['base', 'head'], [], 'proposal.repairRange');
  const base = nonEmptyString(repairRange['base'], 'proposal.repairRange.base');
  const head = nonEmptyString(repairRange['head'], 'proposal.repairRange.head');
  if (!FULL_SHA.test(base) || !FULL_SHA.test(head)) {
    throw new Error('proposal repair range revisions must be full commit SHAs');
  }
  if (!Array.isArray(raw['findings']) || raw['findings'].length === 0) {
    throw new Error('proposal.findings must be a non-empty array');
  }
  const goal = raw['goal'];
  let parsedGoal: ClericalSettlementProposal['goal'];
  if (goal !== undefined) {
    if (!isRecord(goal)) throw new Error('proposal.goal must be an object');
    exactKeys(goal, ['subject', 'publishedHead'], [], 'proposal.goal');
    const publishedHead = nonEmptyString(
      goal['publishedHead'],
      'proposal.goal.publishedHead',
    );
    if (!FULL_SHA.test(publishedHead)) {
      throw new Error('proposal.goal.publishedHead must be a full commit SHA');
    }
    parsedGoal = {
      subject: nonEmptyString(goal['subject'], 'proposal.goal.subject'),
      publishedHead,
    };
  }
  return {
    schemaVersion: 1,
    mode: raw['mode'],
    event: parseEvent(raw['event'], 'proposal.event'),
    repairRange: { base, head },
    receipt: nonEmptyString(raw['receipt'], 'proposal.receipt'),
    findings: raw['findings'].map(parseFinding),
    ...(raw['gateProof'] === undefined
      ? {}
      : {
          gateProof: nonEmptyString(raw['gateProof'], 'proposal.gateProof'),
        }),
    ...(parsedGoal ? { goal: parsedGoal } : {}),
  };
}

export interface ReviewLedgerRow {
  event: SettlementEvent;
  cells: Readonly<Record<string, string>>;
  line: string;
}

function tableCells(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function readReviewRows(plan: string): ReviewLedgerRow[] {
  const match = /^## Reviews[ \t]*$/m.exec(plan);
  if (!match) return [];
  const rest = plan.slice(match.index + match[0].length);
  const end = rest.search(/^##(?!#)[ \t]+\S/m);
  const section = end < 0 ? rest : rest.slice(0, end);
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));
  const header = tableCells(lines[0] ?? '');
  return lines.slice(2).flatMap((line) => {
    const cells = tableCells(line);
    const record = Object.fromEntries(
      header.map((name, index) => [name, cells[index] ?? '']),
    );
    if (!record['Scope'] || !record['Type'] || !record['Artifact']) return [];
    return [
      {
        event: {
          scope: record['Scope'],
          type: record['Type'],
          artifact: record['Artifact'],
        },
        cells: record,
        line,
      },
    ];
  });
}

export interface ReviewArtifactMetadata {
  generatedAt: string | null;
  reviewType: string | null;
  scope: string | null;
  reviewedHead: string | null;
  invocation: string | null;
  gateRunId: string | null;
  gateTarget: string | null;
}

export function readReviewArtifactMetadata(
  content: string,
): ReviewArtifactMetadata {
  const block = getFrontmatterBlock(content);
  const parsed = block ? YAML.parse(block) : {};
  const data = isRecord(parsed) ? parsed : {};
  const read = (key: string): string | null =>
    typeof data[key] === 'string' && data[key].trim() !== ''
      ? data[key].trim()
      : null;
  return {
    generatedAt: read('oat_generated_at'),
    reviewType: read('oat_review_type'),
    scope: read('oat_review_scope'),
    reviewedHead: read('oat_review_head_sha'),
    invocation: read('oat_review_invocation'),
    gateRunId: read('oat_gate_run_id'),
    gateTarget: read('oat_gate_target'),
  };
}

export function extractReceipt(
  journal: string,
  heading: string,
): { content: string; count: number } {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^### ${escaped}[ \\t]*$`, 'gm');
  const matches = [...journal.matchAll(pattern)];
  if (matches.length !== 1) return { content: '', count: matches.length };
  const start = matches[0]!.index!;
  const tail = journal.slice(start + matches[0]![0].length);
  const next = tail.search(/^#{1,3}[ \t]+\S/m);
  return {
    content: `${matches[0]![0]}${next < 0 ? tail : tail.slice(0, next)}`.trim(),
    count: 1,
  };
}

export function parseSettlementEntries(
  journal: string,
): ClericalSettlementEntry[] {
  const pattern =
    /^### Clerical Settlement: [^\n]+\n+```json\n([\s\S]*?)\n```[ \t]*$/gm;
  const entries: ClericalSettlementEntry[] = [];
  for (const match of journal.matchAll(pattern)) {
    try {
      const parsed: unknown = JSON.parse(match[1]!);
      if (isRecord(parsed) && parsed['schemaVersion'] === 1) {
        entries.push(parsed as unknown as ClericalSettlementEntry);
      }
    } catch {
      // Malformed entries are not durable proof and therefore do not match.
    }
  }
  return entries;
}

export function settlementHeading(entry: ClericalSettlementEntry): string {
  return `### Clerical Settlement: ${entry.settlementId}`;
}

export function renderSettlementEntry(entry: ClericalSettlementEntry): string {
  return `${settlementHeading(entry)}

\`\`\`json
${JSON.stringify(entry, null, 2)}
\`\`\``;
}
