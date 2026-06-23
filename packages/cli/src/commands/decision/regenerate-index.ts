import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import YAML from 'yaml';

export const DECISION_INDEX_START = '<!-- OAT DECISION-INDEX -->';
export const DECISION_INDEX_END = '<!-- END OAT DECISION-INDEX -->';

interface DecisionIndexRecord {
  id: string;
  date: string;
  status: string;
  title: string;
  legacyId: string;
}

function parseDecisionFrontmatter(
  content: string,
  filePath: string,
): DecisionIndexRecord | null {
  const rawFrontmatter = getFrontmatterBlock(content);
  if (!rawFrontmatter) {
    return null;
  }

  const parsed = YAML.parse(rawFrontmatter);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Frontmatter in ${filePath} must be a YAML object.`);
  }

  const frontmatter = parsed as Record<string, unknown>;

  return {
    id: String(frontmatter.id ?? ''),
    date: String(frontmatter.date ?? ''),
    status: String(frontmatter.status ?? ''),
    title: String(frontmatter.title ?? ''),
    legacyId:
      frontmatter.legacy_id === null || frontmatter.legacy_id === undefined
        ? ''
        : String(frontmatter.legacy_id),
  };
}

function compareRecords(
  a: DecisionIndexRecord,
  b: DecisionIndexRecord,
): number {
  if (a.date > b.date) {
    return -1;
  }

  if (a.date < b.date) {
    return 1;
  }

  if (a.id < b.id) {
    return -1;
  }

  if (a.id > b.id) {
    return 1;
  }

  return 0;
}

function formatCell(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '-';
  }

  return trimmed.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

export function renderDecisionManagedSection(
  records: DecisionIndexRecord[],
): string {
  const rows =
    records.length > 0
      ? records.map(
          (record) =>
            `| ${formatCell(record.id)} | ${formatCell(record.date)} | ${formatCell(record.status)} | ${formatCell(record.title)} | ${formatCell(record.legacyId)} |`,
        )
      : ['| _No decisions yet_ | - | - | - | - |'];

  return [
    DECISION_INDEX_START,
    '| ID | Date | Status | Title | Legacy |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    DECISION_INDEX_END,
  ].join('\n');
}

export async function regenerateDecisionIndex(
  decisionsRoot: string,
): Promise<void> {
  const indexPath = join(decisionsRoot, 'index.md');
  const entries = (await readdir(decisionsRoot, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== 'index.md',
    )
    .map((entry) => entry.name)
    .sort();

  const records: DecisionIndexRecord[] = [];
  for (const entry of entries) {
    const filePath = join(decisionsRoot, entry);
    const record = parseDecisionFrontmatter(
      await readFile(filePath, 'utf8'),
      filePath,
    );
    if (record) {
      records.push(record);
    }
  }

  records.sort(compareRecords);

  const content = await readFile(indexPath, 'utf8');
  const startIndex = content.indexOf(DECISION_INDEX_START);
  const endIndex = content.indexOf(DECISION_INDEX_END);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      `Managed decision index markers missing in ${indexPath}. Expected the exact marker pair:\n${DECISION_INDEX_START}\n${DECISION_INDEX_END}\nRun \`oat decision init\` if the decision scaffold is missing, or restore those exact markers in \`decisions/index.md\` before rerunning \`oat decision regenerate\`.`,
    );
  }

  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex + DECISION_INDEX_END.length);
  await writeFile(
    indexPath,
    `${before}${renderDecisionManagedSection(records)}${after}`,
    'utf8',
  );
}
