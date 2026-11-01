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
    ['publishedHead', 'gateProof', 'goal'],
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
  let publishedHead: string | undefined;
  if (raw['publishedHead'] !== undefined) {
    publishedHead = nonEmptyString(
      raw['publishedHead'],
      'proposal.publishedHead',
    );
    if (!FULL_SHA.test(publishedHead)) {
      throw new Error('proposal.publishedHead must be a full commit SHA');
    }
  }
  if (raw['mode'] === 'replay' && !publishedHead) {
    throw new Error('proposal.publishedHead is required in replay mode');
  }
  if (raw['mode'] === 'first-settlement' && publishedHead) {
    throw new Error('proposal.publishedHead is permitted only in replay mode');
  }
  const goal = raw['goal'];
  let parsedGoal: ClericalSettlementProposal['goal'];
  if (goal !== undefined) {
    if (!isRecord(goal)) throw new Error('proposal.goal must be an object');
    exactKeys(goal, ['subject'], [], 'proposal.goal');
    parsedGoal = {
      subject: nonEmptyString(goal['subject'], 'proposal.goal.subject'),
    };
  }
  return {
    schemaVersion: 1,
    mode: raw['mode'],
    event: parseEvent(raw['event'], 'proposal.event'),
    repairRange: { base, head },
    ...(publishedHead ? { publishedHead } : {}),
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

export interface SettlementEntryParseResult {
  entries: ClericalSettlementEntry[];
  errors: string[];
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return nonEmptyString(value, label);
}

function parseSettlementEntry(
  value: unknown,
  label: string,
): ClericalSettlementEntry {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  exactKeys(
    value,
    [
      'schemaVersion',
      'settlementId',
      'event',
      'receipt',
      'findingsComplete',
      'findings',
      'counts',
      'reviewedRevision',
      'repairRange',
      'proof',
    ],
    [],
    label,
  );
  if (value['schemaVersion'] !== CLERICAL_SETTLEMENT_SCHEMA_VERSION) {
    throw new Error(`${label}.schemaVersion must be 1`);
  }
  const settlementId = nonEmptyString(
    value['settlementId'],
    `${label}.settlementId`,
  );
  if (!/^[0-9a-f]{16}$/.test(settlementId)) {
    throw new Error(`${label}.settlementId must be 16 lowercase hex digits`);
  }
  const receipt = value['receipt'];
  if (!isRecord(receipt)) throw new Error(`${label}.receipt must be an object`);
  exactKeys(receipt, ['heading', 'sha256'], [], `${label}.receipt`);
  const receiptSha = nonEmptyString(
    receipt['sha256'],
    `${label}.receipt.sha256`,
  );
  if (!/^[0-9a-f]{64}$/.test(receiptSha)) {
    throw new Error(`${label}.receipt.sha256 must be a SHA-256 digest`);
  }
  if (value['findingsComplete'] !== true) {
    throw new Error(`${label}.findingsComplete must be true`);
  }
  if (!Array.isArray(value['findings']) || value['findings'].length === 0) {
    throw new Error(`${label}.findings must be a non-empty array`);
  }
  const findings = value['findings'].map((finding, index) => {
    const findingLabel = `${label}.findings[${index}]`;
    if (!isRecord(finding)) {
      throw new Error(`${findingLabel} must be an object`);
    }
    exactKeys(
      finding,
      [
        'id',
        'repairKind',
        'correctedField',
        'record',
        'authoritativeSource',
        'severity',
        'title',
        'location',
      ],
      [],
      findingLabel,
    );
    const proposalFinding = parseFinding(
      {
        id: finding['id'],
        repairKind: finding['repairKind'],
        correctedField: finding['correctedField'],
        record: finding['record'],
        authoritativeSource: finding['authoritativeSource'],
      },
      index,
    );
    const severity = nonEmptyString(
      finding['severity'],
      `${findingLabel}.severity`,
    );
    if (!['critical', 'high', 'medium', 'low'].includes(severity)) {
      throw new Error(`${findingLabel}.severity is invalid`);
    }
    return {
      ...proposalFinding,
      severity:
        severity as ClericalSettlementEntry['findings'][number]['severity'],
      title: nonEmptyString(finding['title'], `${findingLabel}.title`),
      location: nonEmptyString(finding['location'], `${findingLabel}.location`),
    };
  });
  const counts = value['counts'];
  if (!isRecord(counts)) throw new Error(`${label}.counts must be an object`);
  exactKeys(
    counts,
    ['critical', 'high', 'medium', 'low'],
    [],
    `${label}.counts`,
  );
  const parsedCounts = Object.fromEntries(
    ['critical', 'high', 'medium', 'low'].map((severity) => {
      const count = counts[severity];
      if (!Number.isInteger(count) || (count as number) < 0) {
        throw new Error(`${label}.counts.${severity} must be non-negative`);
      }
      return [severity, count];
    }),
  ) as unknown as ClericalSettlementEntry['counts'];
  const reviewedRevision = nonEmptyString(
    value['reviewedRevision'],
    `${label}.reviewedRevision`,
  );
  if (!FULL_SHA.test(reviewedRevision)) {
    throw new Error(`${label}.reviewedRevision must be a full commit SHA`);
  }
  const repairRange = value['repairRange'];
  if (!isRecord(repairRange)) {
    throw new Error(`${label}.repairRange must be an object`);
  }
  exactKeys(repairRange, ['base', 'head'], [], `${label}.repairRange`);
  const repairBase = nonEmptyString(
    repairRange['base'],
    `${label}.repairRange.base`,
  );
  const repairHead = nonEmptyString(
    repairRange['head'],
    `${label}.repairRange.head`,
  );
  if (!FULL_SHA.test(repairBase) || !FULL_SHA.test(repairHead)) {
    throw new Error(`${label}.repairRange revisions must be full commit SHAs`);
  }
  const proof = value['proof'];
  if (!isRecord(proof)) throw new Error(`${label}.proof must be an object`);
  exactKeys(proof, ['artifact', 'gate'], [], `${label}.proof`);
  const artifact = proof['artifact'];
  if (!isRecord(artifact)) {
    throw new Error(`${label}.proof.artifact must be an object`);
  }
  exactKeys(
    artifact,
    [
      'path',
      'sha256',
      'generatedAt',
      'reviewType',
      'scope',
      'reviewedHead',
      'invocation',
      'gateRunId',
      'gateTarget',
    ],
    [],
    `${label}.proof.artifact`,
  );
  const artifactSha = nonEmptyString(
    artifact['sha256'],
    `${label}.proof.artifact.sha256`,
  );
  if (!/^[0-9a-f]{64}$/.test(artifactSha)) {
    throw new Error(`${label}.proof.artifact.sha256 must be a SHA-256 digest`);
  }
  if (artifact['reviewType'] !== 'code') {
    throw new Error(`${label}.proof.artifact.reviewType must be code`);
  }
  const artifactReviewedHead = nonEmptyString(
    artifact['reviewedHead'],
    `${label}.proof.artifact.reviewedHead`,
  );
  if (!FULL_SHA.test(artifactReviewedHead)) {
    throw new Error(
      `${label}.proof.artifact.reviewedHead must be a full commit SHA`,
    );
  }
  const gate = proof['gate'];
  let parsedGate: NonNullable<ClericalSettlementEntry['proof']['gate']> | null =
    null;
  if (gate !== null) {
    if (!isRecord(gate)) {
      throw new Error(`${label}.proof.gate must be an object or null`);
    }
    exactKeys(
      gate,
      [
        'path',
        'sha256',
        'runId',
        'target',
        'artifactPath',
        'generatedAt',
        'reviewedHead',
        'archivedArtifact',
      ],
      [],
      `${label}.proof.gate`,
    );
    const gateSha = nonEmptyString(
      gate['sha256'],
      `${label}.proof.gate.sha256`,
    );
    if (!/^[0-9a-f]{64}$/.test(gateSha)) {
      throw new Error(`${label}.proof.gate.sha256 must be a SHA-256 digest`);
    }
    const gateReviewedHead = nonEmptyString(
      gate['reviewedHead'],
      `${label}.proof.gate.reviewedHead`,
    );
    if (!FULL_SHA.test(gateReviewedHead)) {
      throw new Error(
        `${label}.proof.gate.reviewedHead must be a full commit SHA`,
      );
    }
    parsedGate = {
      path: nonEmptyString(gate['path'], `${label}.proof.gate.path`),
      sha256: gateSha,
      runId: nonEmptyString(gate['runId'], `${label}.proof.gate.runId`),
      target: nonEmptyString(gate['target'], `${label}.proof.gate.target`),
      artifactPath: nonEmptyString(
        gate['artifactPath'],
        `${label}.proof.gate.artifactPath`,
      ),
      generatedAt: nonEmptyString(
        gate['generatedAt'],
        `${label}.proof.gate.generatedAt`,
      ),
      reviewedHead: gateReviewedHead,
      archivedArtifact: nonEmptyString(
        gate['archivedArtifact'],
        `${label}.proof.gate.archivedArtifact`,
      ),
    };
  }
  return {
    schemaVersion: 1,
    settlementId,
    event: parseEvent(value['event'], `${label}.event`),
    receipt: {
      heading: nonEmptyString(receipt['heading'], `${label}.receipt.heading`),
      sha256: receiptSha,
    },
    findingsComplete: true,
    findings,
    counts: parsedCounts,
    reviewedRevision,
    repairRange: { base: repairBase, head: repairHead },
    proof: {
      artifact: {
        path: nonEmptyString(artifact['path'], `${label}.proof.artifact.path`),
        sha256: artifactSha,
        generatedAt: nonEmptyString(
          artifact['generatedAt'],
          `${label}.proof.artifact.generatedAt`,
        ),
        reviewType: 'code',
        scope: nonEmptyString(
          artifact['scope'],
          `${label}.proof.artifact.scope`,
        ),
        reviewedHead: artifactReviewedHead,
        invocation: nullableString(
          artifact['invocation'],
          `${label}.proof.artifact.invocation`,
        ),
        gateRunId: nullableString(
          artifact['gateRunId'],
          `${label}.proof.artifact.gateRunId`,
        ),
        gateTarget: nullableString(
          artifact['gateTarget'],
          `${label}.proof.artifact.gateTarget`,
        ),
      },
      gate: parsedGate,
    },
  };
}

export function parseSettlementEntries(
  journal: string,
): SettlementEntryParseResult {
  const sectionMatch = /^## Reviews and Gates[ \t]*$/m.exec(journal);
  if (!sectionMatch) {
    return { entries: [], errors: ['journal has no ## Reviews and Gates'] };
  }
  const tail = journal.slice(sectionMatch.index + sectionMatch[0].length);
  const sectionEnd = tail.search(/^##(?!#)[ \t]+\S/m);
  const section = sectionEnd < 0 ? tail : tail.slice(0, sectionEnd);
  const pattern =
    /^### Clerical Settlement: ([^\n]+)\n+```json\n([\s\S]*?)\n```[ \t]*$/gm;
  const entries: ClericalSettlementEntry[] = [];
  const errors: string[] = [];
  for (const [index, match] of [...section.matchAll(pattern)].entries()) {
    try {
      const parsed: unknown = JSON.parse(match[2]!);
      const entry = parseSettlementEntry(parsed, `settlement[${index}]`);
      if (match[1]!.trim() !== entry.settlementId) {
        throw new Error(
          `settlement[${index}] heading does not match settlementId`,
        );
      }
      entries.push(entry);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { entries, errors };
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
