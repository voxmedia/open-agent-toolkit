import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';

import { parseReviewGateVerdict } from '@commands/gate/review-verdict';
import {
  buildSubjectEvidenceScope,
  loadGoalDeliveryProject,
} from '@commands/project/delivery/check';
import { evaluateSuccessor } from '@commands/project/delivery/evidence';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { resolveProjectRoot } from '@fs/paths';
import { getProjectState } from '@open-agent-toolkit/control-plane';

import {
  type ClericalSettlementEntry,
  type ClericalSettlementProposal,
  type ClericalSettlementReport,
  type ProposalFinding,
  type ReviewRowField,
  type SettlementCheck,
} from './contract';
import {
  extractReceipt,
  isRecord,
  parseSettlementEntries,
  readReviewArtifactMetadata,
  readReviewRows,
  renderSettlementEntry,
  sha256,
} from './parsing';

interface GateProof {
  runId: string;
  target: string;
  artifactPath: string;
  generatedAt: string;
}

export interface ClericalSettlementDependencies {
  git: GitRunner;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  getProjectState: typeof getProjectState;
}

const DEFAULT_DEPENDENCIES: ClericalSettlementDependencies = {
  git: defaultGitRunner,
  readFile: (path, encoding) => readFile(path, encoding),
  resolveProjectRoot,
  getProjectState,
};

class Refusal extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function refuse(code: string, message: string): never {
  throw new Refusal(code, message);
}

function sameEvent(
  left: { scope: string; type: string; artifact: string },
  right: { scope: string; type: string; artifact: string },
): boolean {
  return (
    left.scope === right.scope &&
    left.type === right.type &&
    left.artifact === right.artifact
  );
}

function check(
  checks: SettlementCheck[],
  id: string,
  action: () => string,
): void {
  try {
    checks.push({ id, status: 'passed', reason: action() });
  } catch (error) {
    const refusal =
      error instanceof Refusal
        ? error
        : new Refusal(
            'inspection-failed',
            error instanceof Error ? error.message : String(error),
          );
    checks.push({
      id,
      status: 'failed',
      reason: `${refusal.code}: ${refusal.message}`,
    });
    throw refusal;
  }
}

async function asyncCheck(
  checks: SettlementCheck[],
  id: string,
  action: () => Promise<string>,
): Promise<void> {
  try {
    checks.push({ id, status: 'passed', reason: await action() });
  } catch (error) {
    const refusal =
      error instanceof Refusal
        ? error
        : new Refusal(
            'inspection-failed',
            error instanceof Error ? error.message : String(error),
          );
    checks.push({
      id,
      status: 'failed',
      reason: `${refusal.code}: ${refusal.message}`,
    });
    throw refusal;
  }
}

async function gitText(
  git: GitRunner,
  cwd: string,
  args: string[],
): Promise<string> {
  const result = await git.run(args, { cwd, allowFailure: true });
  if (result.code !== 0) {
    refuse(
      'git-inspection-failed',
      `git ${args.join(' ')} failed: ${result.stderr || result.stdout || `exit ${result.code}`}`,
    );
  }
  return result.stdout;
}

async function resolveCommit(
  git: GitRunner,
  repoRoot: string,
  revision: string,
): Promise<string> {
  const resolved = await gitText(git, repoRoot, [
    'rev-parse',
    '--verify',
    `${revision}^{commit}`,
  ]);
  if (!/^[0-9a-f]{40}$/.test(resolved)) {
    refuse('missing-revision', `revision ${revision} did not resolve`);
  }
  return resolved;
}

async function readBlob(
  git: GitRunner,
  repoRoot: string,
  revision: string,
  repoPath: string,
): Promise<string> {
  return gitText(git, repoRoot, ['show', `${revision}:${repoPath}`]);
}

function projectFile(projectPath: string, projectRelative: string): string {
  if (
    isAbsolute(projectRelative) ||
    posix.normalize(projectRelative) !== projectRelative ||
    projectRelative.startsWith('../')
  ) {
    refuse(
      'path-outside-project',
      `${projectRelative} is not a normalized project-relative path`,
    );
  }
  const candidate = resolve(projectPath, projectRelative);
  if (
    candidate !== projectPath &&
    !candidate.startsWith(`${projectPath}${sep}`)
  ) {
    refuse('path-outside-project', `${projectRelative} escapes the project`);
  }
  return candidate;
}

async function readOptionalFile(
  dependencies: ClericalSettlementDependencies,
  path: string,
): Promise<string | null> {
  try {
    return await dependencies.readFile(path, 'utf8');
  } catch (error) {
    if (isRecord(error) && error['code'] === 'ENOENT') return null;
    throw error;
  }
}

function parseGateProof(content: string): GateProof {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    refuse('gate-proof-malformed', 'retained gate proof is not JSON');
  }
  if (!isRecord(value)) {
    refuse('gate-proof-malformed', 'retained gate proof is not an object');
  }
  const keys = ['runId', 'target', 'artifactPath', 'generatedAt'];
  if (
    keys.some(
      (key) => typeof value[key] !== 'string' || value[key].trim() === '',
    )
  ) {
    refuse(
      'gate-proof-malformed',
      'captured oat --json gate review output must contain non-empty runId, target, artifactPath and generatedAt',
    );
  }
  return {
    runId: value['runId'] as string,
    target: value['target'] as string,
    artifactPath: value['artifactPath'] as string,
    generatedAt: value['generatedAt'] as string,
  };
}

function readCell(
  cells: Readonly<Record<string, string>>,
  field: ReviewRowField,
): string {
  return cells[field] ?? '';
}

function artifactSourceValue(
  metadata: ReturnType<typeof readReviewArtifactMetadata>,
  field: Extract<
    ProposalFinding['authoritativeSource'],
    { kind: 'review-artifact' }
  >['field'],
): string | null {
  switch (field) {
    case 'generatedAt':
      return generatedDate(metadata.generatedAt);
    case 'reviewedHead':
      return metadata.reviewedHead;
    case 'invocation':
      return metadata.invocation;
    case 'gateTarget':
      return metadata.gateTarget;
  }
}

function generatedDate(timestamp: string | null): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.exec(
    timestamp ?? '',
  );
  return match?.[1] ?? null;
}

function generatedTimestampToken(timestamp: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(
    timestamp,
  );
  return match ? `${match[1]}T${match[2]}${match[3]}${match[4]}Z` : null;
}

function gateSourceValue(
  proof: GateProof,
  field: Extract<
    ProposalFinding['authoritativeSource'],
    { kind: 'gate-proof' }
  >['field'],
): string {
  switch (field) {
    case 'runId':
      return proof.runId;
    case 'target':
      return proof.target;
    case 'reviewedHead':
    case 'artifact':
      throw new Error(
        `${field} is derived from artifact evidence, not gate JSON`,
      );
  }
}

function artifactReferenceMatches(
  actual: string,
  expected: string,
  projectPath: string,
): boolean {
  return (
    actual === expected ||
    resolve(actual) === projectFile(projectPath, expected) ||
    actual.endsWith(`/${expected}`)
  );
}

function eventRowCandidates(
  plan: string,
  proposal: ClericalSettlementProposal,
): ReturnType<typeof readReviewRows> {
  return readReviewRows(plan).filter((row) =>
    sameEvent(row.event, proposal.event),
  );
}

function archiveSourcePaths(
  proposal: ClericalSettlementProposal,
): { sourcePath: string; archivedPath: string } | null {
  const sources = proposal.findings
    .map((finding) => finding.authoritativeSource)
    .filter((source) => source.kind === 'archived-artifact');
  if (sources.length === 0) return null;
  const [first] = sources;
  if (
    sources.some(
      (source) =>
        source.sourcePath !== first!.sourcePath ||
        source.archivedPath !== first!.archivedPath,
    )
  ) {
    refuse(
      'archive-proof-ambiguous',
      'archived-artifact findings name different source/archive pairs',
    );
  }
  return first!;
}

function validateProposalKinds(proposal: ClericalSettlementProposal): string {
  const ids = new Set<string>();
  const targets = new Set<string>();
  for (const finding of proposal.findings) {
    if (ids.has(finding.id)) {
      refuse('proposal-finding-duplicate', `finding ${finding.id} is repeated`);
    }
    ids.add(finding.id);
    const target = JSON.stringify({
      record: finding.record,
      field: finding.correctedField,
    });
    if (targets.has(target)) {
      refuse(
        'repair-target-shared',
        `${finding.id} shares ${finding.correctedField} on ${finding.record.path} with another finding`,
      );
    }
    targets.add(target);
    const source = finding.authoritativeSource;
    if (
      finding.correctedField === 'Reviewed Head' &&
      source.kind === 'review-row'
    ) {
      refuse(
        'reviewed-head-self-oracle',
        `${finding.id} proposes Reviewed Head from the Reviews row itself`,
      );
    }
    if (finding.repairKind === 'review-row metadata') {
      const artifactField =
        source.kind === 'review-artifact'
          ? {
              generatedAt: 'Date',
              reviewedHead: 'Reviewed Head',
              invocation: 'Invocation',
              gateTarget: 'Gate Target',
            }[source.field]
          : null;
      if (
        finding.record.kind !== 'reviews-row' ||
        !['review-artifact', 'gate-proof'].includes(source.kind) ||
        (source.kind === 'review-artifact' &&
          artifactField !== finding.correctedField) ||
        (source.kind === 'gate-proof' &&
          (source.field !== 'target' ||
            finding.correctedField !== 'Gate Target'))
      ) {
        refuse(
          'repair-kind-ineligible',
          `${finding.id} review-row metadata must target plan.md and use review artifact or gate proof`,
        );
      }
    } else if (finding.repairKind === 'archived-artifact reference') {
      if (
        finding.record.kind !== 'reviews-row' ||
        finding.correctedField !== 'Artifact' ||
        source.kind !== 'archived-artifact'
      ) {
        refuse(
          'repair-kind-ineligible',
          `${finding.id} archived-artifact reference must correct the Reviews Artifact cell from an archived-artifact source`,
        );
      }
    } else {
      refuse(
        'descriptive-prose-target-unavailable',
        `${finding.id} descriptive prose has no lifecycle-produced target until the receive workflow defines one`,
      );
    }
  }
  return `${proposal.findings.length} proposal entries use only the three closed repair kinds`;
}

function canonicalReviewTable(
  content: string,
  proposal: ClericalSettlementProposal,
  maskResolvedStatus = false,
): string {
  const match = /^## Reviews[ \t]*$/m.exec(content);
  if (!match)
    refuse('reviews-table-missing', 'plan.md has no ## Reviews table');
  const afterHeading = match.index + match[0].length;
  const remaining = content.slice(afterHeading);
  const sectionEnd = remaining.search(/^##(?!#)[ \t]+\S/m);
  const section = sectionEnd < 0 ? remaining : remaining.slice(0, sectionEnd);
  const lines = section.split('\n');
  const tableIndices = lines
    .map((line, index) => (line.trim().startsWith('|') ? index : -1))
    .filter((index) => index >= 0);
  if (tableIndices.length < 2) {
    refuse('reviews-table-malformed', 'Reviews table is missing its header');
  }
  const cells = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());
  const header = cells(lines[tableIndices[0]!]!);
  const masked = new Set<string>(
    proposal.findings
      .filter((finding) => finding.record.kind === 'reviews-row')
      .map((finding) => finding.correctedField),
  );
  if (maskResolvedStatus) masked.add('Status');
  const archive = archiveSourcePaths(proposal);
  let matches = 0;
  const canonicalRows = tableIndices.slice(2).map((index) => {
    const values = cells(lines[index]!);
    const record = Object.fromEntries(
      header.map((name, cell) => [name, values[cell] ?? '']),
    );
    const artifact = record['Artifact'] ?? '';
    const selected =
      record['Scope'] === proposal.event.scope &&
      record['Type'] === proposal.event.type &&
      (artifact === proposal.event.artifact ||
        artifact === archive?.sourcePath ||
        artifact === archive?.archivedPath);
    if (selected) {
      matches += 1;
      for (const field of masked) {
        const at = header.indexOf(field);
        if (at < 0) {
          refuse(
            'reviews-field-missing',
            `Reviews table has no ${field} column`,
          );
        }
        values[at] = `<clerical:${field}>`;
      }
    }
    return JSON.stringify(values);
  });
  if (matches !== 1) {
    refuse(
      'repair-event-ambiguous',
      `repair snapshot contains ${matches} rows for the selected event lineage`,
    );
  }
  const tableStart = tableIndices[0]!;
  const tableEnd = tableIndices.at(-1)!;
  lines.splice(
    tableStart,
    tableEnd - tableStart + 1,
    JSON.stringify(header),
    ...canonicalRows,
  );
  const canonicalSection = lines.join('\n');
  return `${content.slice(0, afterHeading)}${canonicalSection}${
    sectionEnd < 0 ? '' : remaining.slice(sectionEnd)
  }`;
}

function maskJournalFields(
  content: string,
  proposal: ClericalSettlementProposal,
): string {
  let result = content;
  for (const finding of proposal.findings) {
    if (finding.record.kind !== 'journal-field') continue;
    const heading = finding.record.heading.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    const sectionPattern = new RegExp(
      `(^### ${heading}[ \\t]*$)([\\s\\S]*?)(?=^#{1,3}[ \\t]+\\S|(?![\\s\\S]))`,
      'm',
    );
    const match = sectionPattern.exec(result);
    if (!match) {
      refuse(
        'journal-record-missing',
        `journal heading ${finding.record.heading} was not found`,
      );
    }
    const fieldWord = finding.correctedField.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    const fieldPattern = new RegExp(
      `^(\\*\\*${fieldWord}:\\*\\*)[^\\n]*$`,
      'm',
    );
    const body = match[2]!;
    const fieldMatches = [...body.matchAll(new RegExp(fieldPattern, 'gm'))];
    if (fieldMatches.length !== 1) {
      refuse(
        'journal-field-ambiguous',
        `${finding.record.heading} has ${fieldMatches.length} fields matching ${finding.correctedField}`,
      );
    }
    const maskedBody = body.replace(
      fieldPattern,
      `$1 <clerical:${finding.correctedField}>`,
    );
    result =
      result.slice(0, match.index) +
      match[1] +
      maskedBody +
      result.slice(match.index + match[0].length);
  }
  return result;
}

async function verifyRepairCommits(
  dependencies: ClericalSettlementDependencies,
  repoRoot: string,
  projectDir: string,
  proposal: ClericalSettlementProposal,
): Promise<string> {
  const listed = await gitText(dependencies.git, repoRoot, [
    'rev-list',
    '--reverse',
    '--parents',
    `${proposal.repairRange.base}..${proposal.repairRange.head}`,
  ]);
  const commits = listed.split('\n').filter(Boolean);
  if (commits.length === 0) {
    refuse('repair-range-empty', 'repair range contains no commit');
  }
  const permittedPaths = new Set(
    proposal.findings.map((finding) => `${projectDir}/${finding.record.path}`),
  );
  for (const line of commits) {
    const [commit, parent, ...otherParents] = line.split(/\s+/);
    if (!commit || !parent || otherParents.length > 0) {
      refuse(
        'repair-merge-ineligible',
        `repair commit ${commit ?? '(unknown)'} is not a single-parent commit`,
      );
    }
    const names = (
      await gitText(dependencies.git, repoRoot, [
        'diff',
        '--no-renames',
        '--name-only',
        parent,
        commit,
      ])
    )
      .split('\n')
      .filter(Boolean);
    for (const path of names) {
      if (!permittedPaths.has(path)) {
        refuse(
          'repair-path-ineligible',
          `${commit} changes ${path}, which no proposal entry names`,
        );
      }
      const before = await readBlob(dependencies.git, repoRoot, parent, path);
      const after = await readBlob(dependencies.git, repoRoot, commit, path);
      const relativePath = path.slice(projectDir.length + 1);
      const maskedBefore =
        relativePath === 'plan.md'
          ? canonicalReviewTable(before, proposal)
          : maskJournalFields(before, proposal);
      const maskedAfter =
        relativePath === 'plan.md'
          ? canonicalReviewTable(after, proposal)
          : maskJournalFields(after, proposal);
      if (maskedBefore !== maskedAfter) {
        refuse(
          'repair-field-overreach',
          `${commit} changes content outside the named permitted fields in ${path}`,
        );
      }
    }
  }
  return `${commits.length} repair commit(s) change only named fields`;
}

function canonicalReceipt(content: string): string {
  return content
    .split('\n')
    .filter(
      (line) => !/^\*\*(?:Outcome|Clerical settlement):\*\*\s+\S/.test(line),
    )
    .join('\n');
}

async function verifyNonGoalSuccessors(
  dependencies: ClericalSettlementDependencies,
  repoRoot: string,
  projectDir: string,
  proposal: ClericalSettlementProposal,
): Promise<string> {
  const archive = archiveSourcePaths(proposal);
  const successor = await evaluateSuccessor(
    dependencies.git,
    {
      repoRoot,
      projectDir,
      evidenceArtifacts: [
        proposal.event.artifact,
        archive?.sourcePath,
        archive?.archivedPath,
      ].filter((value): value is string => Boolean(value)),
    },
    proposal.repairRange.head,
    proposal.publishedHead,
  );
  if (!successor.fresh) {
    refuse(`bookkeeping-successor-${successor.code}`, successor.reason);
  }
  return `production bookkeeping judgments accept ${successor.inspected.length} non-goal successor commit(s) (${successor.code})`;
}

function journalFieldValue(journal: string, finding: ProposalFinding): string {
  if (finding.record.kind !== 'journal-field') return '';
  const heading = finding.record.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(
    `^### ${heading}[ \\t]*$([\\s\\S]*?)(?=^#{1,3}[ \\t]+\\S|(?![\\s\\S]))`,
    'm',
  ).exec(journal);
  if (!match) return '';
  const fieldWord = finding.correctedField.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
  const field = new RegExp(
    `^\\*\\*${fieldWord}:\\*\\*\\s*(.+?)\\s*$`,
    'm',
  ).exec(match[1]!);
  return field?.[1]?.trim() ?? '';
}

function validateLocation(
  finding: {
    id: string;
    title: string;
    location: string | null;
  },
  proposalFinding: ProposalFinding,
  repairBasePlan: string,
  repairBaseJournal: string,
  proposal: ClericalSettlementProposal,
): void {
  if (!finding.location) {
    refuse(
      'finding-location-missing',
      `${finding.id} has no record location to corroborate a clerical repair`,
    );
  }
  const basename = posix.basename(proposalFinding.record.path);
  if (
    !finding.location.includes(proposalFinding.record.path) &&
    !finding.location.includes(basename)
  ) {
    refuse(
      'finding-location-mismatch',
      `${finding.id} points to ${finding.location}, not ${proposalFinding.record.path}`,
    );
  }
  const locationPattern = new RegExp(
    `${proposalFinding.record.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`,
  );
  const lineNumber = Number(locationPattern.exec(finding.location)?.[1]);
  if (!Number.isInteger(lineNumber) || lineNumber <= 0) {
    refuse(
      'finding-location-line-missing',
      `${finding.id} location must include an exact line in ${proposalFinding.record.path}`,
    );
  }
  const lines =
    proposalFinding.record.path === 'plan.md'
      ? repairBasePlan.split('\n')
      : repairBaseJournal.split('\n');
  const locatedLine = lines[lineNumber - 1]?.trim() ?? '';
  if (proposalFinding.record.kind === 'reviews-row') {
    const archive = archiveSourcePaths(proposal);
    const eligibleRows = readReviewRows(repairBasePlan).filter(
      (row) =>
        row.event.scope === proposal.event.scope &&
        row.event.type === proposal.event.type &&
        (row.event.artifact === proposal.event.artifact ||
          row.event.artifact === archive?.sourcePath ||
          row.event.artifact === archive?.archivedPath),
    );
    if (!eligibleRows.some((row) => row.line === locatedLine)) {
      refuse(
        'finding-location-record-mismatch',
        `${finding.id} line ${lineNumber} is not the selected Reviews row`,
      );
    }
  } else {
    const label = `**${proposalFinding.correctedField}:**`;
    if (!locatedLine.startsWith(label)) {
      refuse(
        'finding-location-record-mismatch',
        `${finding.id} line ${lineNumber} is not the exact ${proposalFinding.correctedField} field`,
      );
    }
  }
  const fieldClaim = new RegExp(
    `\\b${proposalFinding.correctedField
      .split(/\s+/)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+')}\\s+(?:cell|column)\\b`,
    'i',
  );
  if (!fieldClaim.test(finding.title)) {
    refuse(
      'finding-claim-field-mismatch',
      `${finding.id} claim must identify the exact ${proposalFinding.correctedField} cell or column`,
    );
  }
}

function settlementId(proposal: ClericalSettlementProposal): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        event: proposal.event,
        repairRange: proposal.repairRange,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

function receiptEvidence(
  content: string,
  proposal: ClericalSettlementProposal,
  counts: ClericalSettlementEntry['counts'],
  findings: ClericalSettlementEntry['findings'],
): string {
  const escapedScope = proposal.event.scope.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
  if (
    !new RegExp(
      `^Review Received: ${escapedScope}(?: \\(round \\d+\\))?$`,
    ).test(proposal.receipt)
  ) {
    refuse(
      'receipt-event-mismatch',
      `${proposal.receipt} does not identify event scope ${proposal.event.scope}`,
    );
  }
  const artifact =
    /^\*\*Review artifact \(local-only\):\*\*\s*(\S+)\s*$/m.exec(
      content,
    )?.[1] ?? null;
  const archive = archiveSourcePaths(proposal);
  const eligibleArtifacts = new Set(
    [
      proposal.event.artifact,
      archive?.sourcePath,
      archive?.archivedPath,
    ].filter((value): value is string => Boolean(value)),
  );
  if (!artifact || !eligibleArtifacts.has(artifact)) {
    refuse(
      'receipt-artifact-mismatch',
      `receipt artifact ${artifact ?? '(missing)'} is not the selected event or its archived counterpart`,
    );
  }
  const countLine =
    /^\*\*Findings:\*\*\s*Critical\s+(\d+)\s*[·,]\s*High\s+(\d+)\s*[·,]\s*Medium\s+(\d+)\s*[·,]\s*Low\s+(\d+)\s*$/m.exec(
      content,
    );
  if (
    !countLine ||
    Number(countLine[1]) !== counts.critical ||
    Number(countLine[2]) !== counts.high ||
    Number(countLine[3]) !== counts.medium ||
    Number(countLine[4]) !== counts.low
  ) {
    refuse(
      'receipt-counts-mismatch',
      'receipt finding counts do not match the corroborated verdict',
    );
  }
  const listed = [
    ...content.matchAll(/^-\s+([CHML]\d+)\s+\((Critical|High|Medium|Low)\):/gm),
  ].map((match) => `${match[1]}:${match[2]!.toLowerCase()}`);
  const expected = findings.map(
    (finding) => `${finding.id}:${finding.severity}`,
  );
  if (
    listed.length !== expected.length ||
    listed.some((entry) => !expected.includes(entry))
  ) {
    refuse(
      'receipt-findings-mismatch',
      'receipt finding IDs and severities do not match the corroborated findings',
    );
  }
  return `receipt binds ${artifact}, matching counts, and ${listed.length} finding IDs`;
}

function goalSubjectFromScope(scope: string): string | null {
  const normalized = scope.trim();
  const direct = /^(m\d+|d\d+)(?:\s*:.*)?$/i.exec(normalized);
  if (direct) return direct[1]!.toLowerCase();
  const delivery = /^m\d+\/(d\d+)(?:\s*:.*)?$/i.exec(normalized);
  return delivery?.[1]?.toLowerCase() ?? null;
}

async function verifyNonGoalSubject(
  dependencies: ClericalSettlementDependencies,
  repoRoot: string,
  projectDir: string,
  reviewed: string,
  repairHead: string,
): Promise<string> {
  const names = (
    await gitText(dependencies.git, repoRoot, [
      'diff',
      '--no-renames',
      '--name-only',
      reviewed,
      repairHead,
    ])
  )
    .split('\n')
    .filter(Boolean);
  const outside = names.filter((path) => !path.startsWith(`${projectDir}/`));
  if (outside.length > 0) {
    refuse(
      'reviewed-subject-changed',
      `reviewed subject changed outside project records: ${outside.join(', ')}`,
    );
  }
  return `no files outside ${projectDir} changed after the reviewed revision`;
}

export async function verifyClericalSettlement(
  project: string,
  proposal: ClericalSettlementProposal,
  cwd: string,
  overrides: Partial<ClericalSettlementDependencies> = {},
): Promise<ClericalSettlementReport> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const checks: SettlementCheck[] = [];
  const report = (
    status: ClericalSettlementReport['status'],
    reason: string | null,
    settlement: ClericalSettlementEntry | null,
  ): ClericalSettlementReport => ({
    schemaVersion: 1,
    status,
    mode: proposal.mode,
    event: proposal.event,
    repairRange: proposal.repairRange,
    checks,
    settlement,
    reason,
  });

  try {
    const repoRoot = await dependencies.resolveProjectRoot(cwd);
    const projectPath = isAbsolute(project)
      ? resolve(project)
      : resolve(repoRoot, project);
    if (
      projectPath !== repoRoot &&
      !projectPath.startsWith(`${repoRoot}${sep}`)
    ) {
      refuse(
        'project-outside-repository',
        `${project} is outside the repository`,
      );
    }
    const projectDir = relative(repoRoot, projectPath).split(sep).join('/');
    const currentHead = await resolveCommit(dependencies.git, repoRoot, 'HEAD');
    const expectedHead =
      proposal.mode === 'replay'
        ? proposal.publishedHead!
        : proposal.repairRange.head;
    await asyncCheck(checks, 'head-binding', async () => {
      const resolved = await resolveCommit(
        dependencies.git,
        repoRoot,
        expectedHead,
      );
      if (currentHead !== resolved) {
        refuse(
          'head-mismatch',
          `working HEAD ${currentHead} is not proposal head ${resolved}`,
        );
      }
      await resolveCommit(
        dependencies.git,
        repoRoot,
        proposal.repairRange.base,
      );
      await resolveCommit(
        dependencies.git,
        repoRoot,
        proposal.repairRange.head,
      );
      const ancestry = await dependencies.git.run(
        [
          'merge-base',
          '--is-ancestor',
          proposal.repairRange.base,
          proposal.repairRange.head,
        ],
        { cwd: repoRoot, allowFailure: true },
      );
      if (ancestry.code !== 0) {
        refuse(
          'repair-range-not-ancestral',
          'repairRange.base is not an ancestor of repairRange.head',
        );
      }
      return `proposal revisions resolve and HEAD is ${resolved}`;
    });

    const planPath = `${projectDir}/plan.md`;
    const journalPath = `${projectDir}/implementation.md`;
    const evaluationHead =
      proposal.mode === 'replay'
        ? proposal.publishedHead!
        : proposal.repairRange.head;
    await asyncCheck(checks, 'committed-project-state', async () => {
      const dirty = await gitText(dependencies.git, repoRoot, [
        'status',
        '--porcelain',
        '--untracked-files=no',
        '--',
        projectDir,
      ]);
      if (dirty) {
        refuse(
          'project-state-dirty',
          'verifier requires committed project records; tracked working-tree changes are not evidence',
        );
      }
      return 'project state and goal scope inputs are committed at the evaluation head';
    });
    const [plan, journal, repairBasePlan, repairBaseJournal, state] =
      await Promise.all([
        readBlob(dependencies.git, repoRoot, evaluationHead, planPath),
        readBlob(dependencies.git, repoRoot, evaluationHead, journalPath),
        readBlob(
          dependencies.git,
          repoRoot,
          proposal.repairRange.base,
          planPath,
        ),
        readBlob(
          dependencies.git,
          repoRoot,
          proposal.repairRange.base,
          journalPath,
        ),
        dependencies.getProjectState(projectPath),
      ]);

    let row = eventRowCandidates(plan, proposal)[0]!;
    check(checks, 'event-unique', () => {
      const matches = eventRowCandidates(plan, proposal);
      if (matches.length !== 1) {
        refuse(
          'event-not-unique',
          `expected exactly one Reviews row for (${proposal.event.scope}, ${proposal.event.type}, ${proposal.event.artifact}); found ${matches.length}`,
        );
      }
      row = matches[0]!;
      return 'exactly one Reviews row matches the selected tuple';
    });

    check(checks, 'proposal-eligibility', () =>
      validateProposalKinds(proposal),
    );

    const goalSubject =
      state.workflowMode === 'goal'
        ? goalSubjectFromScope(proposal.event.scope)
        : null;
    const goalDeliveryScope = goalSubject !== null;
    check(checks, 'goal-scope-binding', () => {
      if (!goalDeliveryScope && proposal.goal) {
        refuse(
          'goal-scope-mismatch',
          'proposal.goal is permitted only for an actual goal milestone or delivery event',
        );
      }
      if (
        goalDeliveryScope &&
        (!proposal.goal || proposal.goal.subject !== goalSubject)
      ) {
        refuse(
          'goal-subject-mismatch',
          `goal event ${proposal.event.scope} resolves to ${goalSubject}; proposal.goal.subject must match`,
        );
      }
      return goalDeliveryScope
        ? `goal event scope normalizes to ${goalSubject}`
        : 'proposal carries no goal-only fields outside a goal delivery scope';
    });
    check(checks, 'known-goal-ineligibility', () => {
      if (
        goalDeliveryScope &&
        proposal.findings.some(
          (finding) =>
            finding.correctedField === 'Reviewed Head' ||
            finding.record.kind === 'journal-field',
        )
      ) {
        refuse(
          'goal-12.8-known-ineligible',
          'goal section 12.8 cannot preserve a Reviewed Head correction or journal observation repair',
        );
      }
      return 'proposal has no statically known section 12.8 violation';
    });

    const archive = archiveSourcePaths(proposal);
    const artifactPath = projectFile(projectPath, proposal.event.artifact);
    let artifactContent = '';
    let artifactMetadata:
      | ReturnType<typeof readReviewArtifactMetadata>
      | undefined;
    let verdict: Awaited<ReturnType<typeof parseReviewGateVerdict>> | undefined;
    let persisted: ClericalSettlementEntry | null = null;
    const receipt = extractReceipt(journal, proposal.receipt);

    if (proposal.mode === 'first-settlement') {
      await asyncCheck(checks, 'artifact-corroboration', async () => {
        artifactContent = await dependencies.readFile(artifactPath, 'utf8');
        artifactMetadata = readReviewArtifactMetadata(artifactContent);
        verdict = await parseReviewGateVerdict(artifactPath);
        if (
          proposal.event.type !== 'code' ||
          artifactMetadata.reviewType !== 'code' ||
          verdict.reviewType !== 'code'
        ) {
          refuse(
            'review-type-ineligible',
            'settlement requires ledger, artifact metadata and parsed verdict to corroborate type code',
          );
        }
        const artifactScope =
          artifactMetadata.scope === proposal.event.scope ||
          (goalDeliveryScope &&
            artifactMetadata.scope !== null &&
            goalSubjectFromScope(artifactMetadata.scope) === goalSubject);
        const verdictScope =
          verdict.scope === proposal.event.scope ||
          (goalDeliveryScope &&
            verdict.scope !== null &&
            goalSubjectFromScope(verdict.scope) === goalSubject);
        if (!artifactScope || !verdictScope) {
          refuse(
            'artifact-event-mismatch',
            'artifact scope does not match the selected ledger event',
          );
        }
        if (
          !artifactMetadata.reviewedHead ||
          !/^[0-9a-f]{40}$/.test(artifactMetadata.reviewedHead) ||
          !artifactMetadata.generatedAt ||
          row.cells['Reviewed Head'] !== artifactMetadata.reviewedHead ||
          row.cells['Date'] !== generatedDate(artifactMetadata.generatedAt) ||
          row.cells['Invocation'] !== (artifactMetadata.invocation ?? '-') ||
          row.cells['Gate Target'] !== (artifactMetadata.gateTarget ?? '-')
        ) {
          refuse(
            'reviewed-revision-mismatch',
            'artifact generated-at, reviewed revision, invocation or gate target does not match the selected Reviews row',
          );
        }
        await resolveCommit(
          dependencies.git,
          repoRoot,
          artifactMetadata.reviewedHead,
        );
        return `artifact corroborates code event at ${artifactMetadata.reviewedHead}`;
      });

      if (archive) {
        await asyncCheck(checks, 'archive-identity', async () => {
          if (archive.archivedPath !== proposal.event.artifact) {
            refuse(
              'archive-target-mismatch',
              'archivedPath is not the selected event artifact',
            );
          }
          const source = await readOptionalFile(
            dependencies,
            projectFile(projectPath, archive.sourcePath),
          );
          if (source !== null && sha256(source) !== sha256(artifactContent)) {
            refuse(
              'archive-identity-mismatch',
              'a surviving source and the archived artifact do not have identical bytes',
            );
          }
          if (
            archive.sourcePath === archive.archivedPath ||
            !artifactMetadata?.reviewedHead ||
            !artifactMetadata.generatedAt
          ) {
            refuse(
              'archive-identity-mismatch',
              'archived artifact lacks distinct source/archive references or event identity',
            );
          }
          const timestampToken = generatedTimestampToken(
            artifactMetadata.generatedAt,
          );
          const sourceStem = posix.basename(archive.sourcePath, '.md');
          const archivedStem = posix.basename(archive.archivedPath, '.md');
          if (
            !timestampToken ||
            !sourceStem.includes(timestampToken) ||
            (archivedStem !== sourceStem &&
              !archivedStem.startsWith(`${sourceStem}-`))
          ) {
            refuse(
              'archive-identity-mismatch',
              'archived filename lineage does not bind the artifact generated timestamp and source identity',
            );
          }
          return source === null
            ? `moved source is absent; archived frontmatter and ledger bind digest ${sha256(artifactContent)}`
            : `surviving source is byte-identical to archived digest ${sha256(artifactContent)}`;
        });
      }
    } else {
      const parsedSettlements = parseSettlementEntries(journal);
      check(checks, 'settlement-entry-schema', () => {
        if (parsedSettlements.errors.length > 0) {
          refuse(
            'settlement-entry-malformed',
            parsedSettlements.errors.join('; '),
          );
        }
        return `${parsedSettlements.entries.length} settlement entry or entries are strictly schema-valid under Reviews and Gates`;
      });
      const matches = parsedSettlements.entries.filter((entry) =>
        sameEvent(entry.event, proposal.event),
      );
      persisted = matches[0] ?? null;
      check(checks, 'settlement-entry', () => {
        if (matches.length !== 1) {
          refuse(
            'settlement-entry-not-unique',
            `expected one committed settlement entry for the event; found ${matches.length}`,
          );
        }
        if (!persisted) {
          refuse(
            'settlement-entry-not-unique',
            'matching settlement entry is unavailable',
          );
        }
        if (
          persisted.repairRange.base !== proposal.repairRange.base ||
          persisted.repairRange.head !== proposal.repairRange.head
        ) {
          refuse(
            'settlement-range-mismatch',
            'settlement entry repair range does not match the proposal',
          );
        }
        if (row.cells['Status']?.toLowerCase() !== 'resolved') {
          refuse(
            'resolved-status-missing',
            'replay requires Reviews Status resolved; resolved is terminal for routing but never passed',
          );
        }
        return `settlement ${persisted.settlementId} is uniquely committed and the row is resolved`;
      });
      check(checks, 'durable-proof', () => {
        if (
          !persisted ||
          proposal.event.type !== 'code' ||
          row.event.type !== 'code' ||
          persisted.receipt.heading !== proposal.receipt ||
          persisted.findingsComplete !== true ||
          !persisted.proof?.artifact?.sha256 ||
          persisted.proof.artifact.reviewType !== 'code'
        ) {
          refuse(
            'durable-proof-missing',
            'replay requires a code ledger event and settlement proof with its receipt, complete findings and corroborated code artifact',
          );
        }
        const proof = persisted.proof.artifact;
        const proofScopeMatches =
          proof.scope === proposal.event.scope ||
          (goalDeliveryScope &&
            goalSubjectFromScope(proof.scope) === goalSubject);
        if (
          persisted.settlementId !== settlementId(proposal) ||
          proof.path !== proposal.event.artifact ||
          !proofScopeMatches ||
          proof.reviewedHead !== persisted.reviewedRevision ||
          proof.reviewedHead !== row.cells['Reviewed Head'] ||
          !/^[0-9a-f]{40}$/.test(proof.reviewedHead) ||
          !proof.generatedAt ||
          row.cells['Date'] !== generatedDate(proof.generatedAt) ||
          row.cells['Invocation'] !== (proof.invocation ?? '-') ||
          row.cells['Gate Target'] !== (proof.gateTarget ?? '-') ||
          persisted.findings.some(
            (finding, index) =>
              finding.id !== proposal.findings[index]?.id ||
              finding.repairKind !== proposal.findings[index]?.repairKind ||
              finding.correctedField !==
                proposal.findings[index]?.correctedField,
          )
        ) {
          refuse(
            'durable-proof-contradictory',
            'settlement identity, event, findings or immutable reviewed revision contradict the ledger/proposal',
          );
        }
        const recordedCounts = Object.values(persisted.counts).reduce(
          (sum, value) => sum + value,
          0,
        );
        if (
          recordedCounts !== persisted.findings.length ||
          receipt.count !== 1 ||
          sha256(canonicalReceipt(receipt.content)) !== persisted.receipt.sha256
        ) {
          refuse(
            'durable-proof-contradictory',
            'settlement finding counts or receipt digest do not corroborate the committed proof',
          );
        }
        artifactMetadata = {
          generatedAt: persisted.proof.artifact.generatedAt,
          reviewType: persisted.proof.artifact.reviewType,
          scope: persisted.proof.artifact.scope,
          reviewedHead: persisted.proof.artifact.reviewedHead,
          invocation: persisted.proof.artifact.invocation,
          gateRunId: persisted.proof.artifact.gateRunId,
          gateTarget: persisted.proof.artifact.gateTarget,
        };
        return 'committed settlement proof supplies the immutable artifact bindings';
      });
    }

    let gateProof: GateProof | null = null;
    const gateEvent =
      row.cells['Invocation'] === 'gate' ||
      artifactMetadata?.invocation === 'gate' ||
      artifactMetadata?.gateRunId != null;
    if (proposal.mode === 'first-settlement' && gateEvent) {
      await asyncCheck(checks, 'gate-proof', async () => {
        if (!proposal.gateProof) {
          refuse(
            'gate-proof-missing',
            'gate event requires a retained gate proof path',
          );
        }
        const proofPath = projectFile(projectPath, proposal.gateProof);
        const content = await dependencies.readFile(proofPath, 'utf8');
        gateProof = parseGateProof(content);
        const expectedGateArtifact =
          archive?.sourcePath ?? proposal.event.artifact;
        if (
          gateProof.runId !== artifactMetadata?.gateRunId ||
          gateProof.target !== artifactMetadata?.gateTarget ||
          gateProof.target !== row.cells['Gate Target'] ||
          gateProof.generatedAt !== artifactMetadata?.generatedAt ||
          !artifactReferenceMatches(
            gateProof.artifactPath,
            expectedGateArtifact,
            projectPath,
          )
        ) {
          refuse(
            'gate-proof-mismatch',
            'captured gate JSON, artifact run/target/generated-at, source/archive mapping and Reviews row do not agree',
          );
        }
        return `gate run ${gateProof.runId} and target ${gateProof.target} are corroborated`;
      });
    } else if (proposal.mode === 'replay' && gateEvent) {
      check(checks, 'gate-proof', () => {
        if (!persisted?.proof.gate) {
          refuse(
            'durable-proof-missing',
            'gate-event replay requires the committed settlement gate proof',
          );
        }
        gateProof = {
          runId: persisted.proof.gate.runId,
          target: persisted.proof.gate.target,
          artifactPath: persisted.proof.gate.artifactPath,
          generatedAt: persisted.proof.gate.generatedAt,
        };
        if (
          gateProof.runId !== artifactMetadata?.gateRunId ||
          gateProof.target !== artifactMetadata?.gateTarget ||
          gateProof.target !== row.cells['Gate Target'] ||
          gateProof.generatedAt !== artifactMetadata?.generatedAt ||
          persisted!.proof.gate!.reviewedHead !==
            artifactMetadata?.reviewedHead ||
          persisted!.proof.gate!.archivedArtifact !== proposal.event.artifact ||
          !artifactReferenceMatches(
            gateProof.artifactPath,
            archive?.sourcePath ?? proposal.event.artifact,
            projectPath,
          )
        ) {
          refuse(
            'gate-proof-mismatch',
            'committed gate proof no longer agrees with the selected event',
          );
        }
        return `committed gate run ${gateProof.runId} is corroborated`;
      });
    }

    let findingRecords: ClericalSettlementEntry['findings'] = [];
    let counts: ClericalSettlementEntry['counts'];
    check(checks, 'finding-coverage', () => {
      const sourceFindings =
        proposal.mode === 'first-settlement'
          ? verdict?.findings
          : persisted?.findings;
      const complete =
        proposal.mode === 'first-settlement'
          ? verdict?.findingsComplete
          : persisted?.findingsComplete;
      if (!complete || !sourceFindings) {
        refuse(
          'finding-records-incomplete',
          'per-finding records are not complete for the event verdict',
        );
      }
      const sourceById = new Map(
        sourceFindings.map((finding) => [finding.id, finding]),
      );
      if (
        sourceById.size !== sourceFindings.length ||
        sourceById.size !== proposal.findings.length ||
        proposal.findings.some((finding) => !sourceById.has(finding.id))
      ) {
        refuse(
          'finding-coverage-incomplete',
          'proposal entries do not cover every event finding exactly once',
        );
      }
      findingRecords = proposal.findings.map((entry) => {
        const source = sourceById.get(entry.id)!;
        validateLocation(
          source,
          entry,
          repairBasePlan,
          repairBaseJournal,
          proposal,
        );
        if (!source.location) {
          refuse('finding-location-missing', `${source.id} has no location`);
        }
        return {
          ...entry,
          severity: source.severity,
          title: source.title,
          location: source.location,
        };
      });
      counts =
        proposal.mode === 'first-settlement'
          ? verdict!.counts
          : persisted!.counts;
      return `all ${sourceFindings.length} complete finding records are covered`;
    });

    check(checks, 'receipt-binding', () => {
      if (receipt.count !== 1) {
        refuse(
          'receipt-not-unique',
          `expected one ### ${proposal.receipt} receipt; found ${receipt.count}`,
        );
      }
      if (
        proposal.mode === 'replay' &&
        sha256(canonicalReceipt(receipt.content)) !== persisted?.receipt.sha256
      ) {
        refuse(
          'receipt-proof-mismatch',
          'committed Review Received receipt does not match the settlement binding',
        );
      }
      const corroboration = receiptEvidence(
        receipt.content,
        proposal,
        counts!,
        findingRecords,
      );
      return `receipt ${proposal.receipt} is unique and digest-bound; ${corroboration}`;
    });

    await asyncCheck(checks, 'repair-range', async () =>
      verifyRepairCommits(dependencies, repoRoot, projectDir, proposal),
    );

    check(checks, 'corrected-values', () => {
      const baseRows = readReviewRows(repairBasePlan);
      for (const finding of proposal.findings) {
        const source = finding.authoritativeSource;
        let expected: string | null;
        if (source.kind === 'review-artifact') {
          expected = artifactSourceValue(artifactMetadata!, source.field);
        } else if (source.kind === 'gate-proof') {
          if (!gateProof) {
            refuse(
              'gate-proof-missing',
              `${finding.id} names a gate-proof source without corroborated proof`,
            );
          }
          expected = gateSourceValue(gateProof, source.field);
        } else if (source.kind === 'archived-artifact') {
          expected = source.archivedPath;
        } else {
          expected = readCell(row.cells, source.field);
        }
        const actual =
          finding.record.kind === 'reviews-row'
            ? readCell(row.cells, finding.correctedField)
            : journalFieldValue(journal, finding);
        if (!expected || actual !== expected) {
          refuse(
            'corrected-value-mismatch',
            `${finding.id} ${finding.correctedField} is ${JSON.stringify(actual)}, not authoritative ${JSON.stringify(expected)}`,
          );
        }
        const baseValue =
          finding.record.kind === 'reviews-row'
            ? readCell(
                baseRows.find(
                  (baseRow) =>
                    baseRow.event.scope === proposal.event.scope &&
                    baseRow.event.type === proposal.event.type &&
                    (baseRow.event.artifact === proposal.event.artifact ||
                      baseRow.event.artifact === archive?.sourcePath),
                )?.cells ?? {},
                finding.correctedField,
              )
            : journalFieldValue(repairBaseJournal, finding);
        if (baseValue === actual) {
          refuse(
            'repair-field-unchanged',
            `${finding.id} names ${finding.correctedField}, but the repair range did not change it`,
          );
        }
      }
      return 'every corrected field changed and now equals its authoritative source';
    });

    const reviewedRevision = artifactMetadata!.reviewedHead!;
    if (goalDeliveryScope) {
      await asyncCheck(checks, 'goal-successor-chain', async () => {
        const loaded = await loadGoalDeliveryProject(projectPath, repoRoot, {
          resolveProjectRoot: dependencies.resolveProjectRoot,
          readFile: dependencies.readFile,
          getProjectState: dependencies.getProjectState,
        });
        const subjectScope = buildSubjectEvidenceScope(loaded, goalSubject!);
        const chainHead =
          proposal.mode === 'first-settlement'
            ? proposal.repairRange.head
            : proposal.publishedHead!;
        const successor = await evaluateSuccessor(
          dependencies.git,
          subjectScope.evidence,
          reviewedRevision,
          chainHead,
        );
        if (!successor.fresh) {
          refuse(`goal-12.8-${successor.code}`, successor.reason);
        }
        return `section 12.8 accepts the complete chain through ${chainHead} (${successor.code})`;
      });
    } else {
      await asyncCheck(checks, 'reviewed-subject', async () =>
        verifyNonGoalSubject(
          dependencies,
          repoRoot,
          projectDir,
          reviewedRevision,
          proposal.mode === 'replay'
            ? proposal.publishedHead!
            : proposal.repairRange.head,
        ),
      );
      if (proposal.mode === 'replay') {
        await asyncCheck(checks, 'non-goal-successor-chain', async () =>
          verifyNonGoalSuccessors(dependencies, repoRoot, projectDir, proposal),
        );
      }
    }

    if (proposal.mode === 'replay') {
      check(checks, 'replay-consistency', () => {
        if (
          !persisted ||
          JSON.stringify(persisted.findings) !== JSON.stringify(findingRecords)
        ) {
          refuse(
            'proposal-settlement-mismatch',
            'replay proposal findings differ from the committed settlement',
          );
        }
        return 'replay proposal exactly matches the committed settlement findings';
      });
      return report('verified', null, persisted);
    }

    const gateProofContent =
      proposal.gateProof && gateProof
        ? await dependencies.readFile(
            projectFile(projectPath, proposal.gateProof),
            'utf8',
          )
        : null;
    const settlementGateProof = gateProof as GateProof | null;
    const entry: ClericalSettlementEntry = {
      schemaVersion: 1,
      settlementId: settlementId(proposal),
      event: proposal.event,
      receipt: {
        heading: proposal.receipt,
        sha256: sha256(canonicalReceipt(receipt.content)),
      },
      findingsComplete: true,
      findings: findingRecords,
      counts: counts!,
      reviewedRevision,
      repairRange: proposal.repairRange,
      proof: {
        artifact: {
          path: proposal.event.artifact,
          sha256: sha256(artifactContent),
          generatedAt: artifactMetadata!.generatedAt!,
          reviewType: 'code',
          scope: artifactMetadata!.scope!,
          reviewedHead: reviewedRevision,
          invocation: artifactMetadata!.invocation,
          gateRunId: artifactMetadata!.gateRunId,
          gateTarget: artifactMetadata!.gateTarget,
        },
        gate:
          proposal.gateProof && settlementGateProof && gateProofContent
            ? {
                path: proposal.gateProof,
                sha256: sha256(gateProofContent),
                ...settlementGateProof,
                reviewedHead: reviewedRevision,
                archivedArtifact: proposal.event.artifact,
              }
            : null,
      },
    };
    checks.push({
      id: 'settlement-record',
      status: 'passed',
      reason: `record ${entry.settlementId} is ready; Reviews Status resolved means verified no-re-review routing, never reviewer pass`,
    });
    return report('verified', null, entry);
  } catch (error) {
    const reason =
      error instanceof Refusal
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    return report('refused', reason, null);
  }
}

export { renderSettlementEntry };
