import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import YAML from 'yaml';

const INDEX_START = '<!-- OAT BACKLOG-INDEX -->';
const INDEX_END = '<!-- END OAT BACKLOG-INDEX -->';

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

interface BacklogIndexItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  scope: string;
  scopeEstimate: string;
}

function parseItemFrontmatter(
  content: string,
  filePath: string,
): BacklogIndexItem | null {
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
    title: String(frontmatter.title ?? ''),
    status: String(frontmatter.status ?? ''),
    priority: String(frontmatter.priority ?? ''),
    scope: String(frontmatter.scope ?? ''),
    scopeEstimate: String(frontmatter.scope_estimate ?? ''),
  };
}

function compareItems(a: BacklogIndexItem, b: BacklogIndexItem): number {
  const priorityDiff =
    (PRIORITY_ORDER[a.priority] ?? Number.MAX_SAFE_INTEGER) -
    (PRIORITY_ORDER[b.priority] ?? Number.MAX_SAFE_INTEGER);

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return a.title.localeCompare(b.title);
}

function renderManagedSection(items: BacklogIndexItem[]): string {
  const rows =
    items.length > 0
      ? items.map(
          (item) =>
            `| ${item.id} | ${item.title} | ${item.status} | ${item.priority} | ${item.scope} | ${item.scopeEstimate} |`,
        )
      : ['| _No backlog items yet_ | - | - | - | - | - |'];

  return [
    INDEX_START,
    '| ID | Title | Status | Priority | Scope | Estimate |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
    INDEX_END,
  ].join('\n');
}

export async function regenerateBacklogIndex(
  backlogRoot: string,
): Promise<void> {
  const itemsDir = join(backlogRoot, 'items');
  const indexPath = join(backlogRoot, 'index.md');

  const entries = (await readdir(itemsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);

  const items: BacklogIndexItem[] = [];
  for (const entry of entries) {
    const filePath = join(itemsDir, entry);
    const item = parseItemFrontmatter(
      await readFile(filePath, 'utf8'),
      filePath,
    );
    if (item) {
      items.push(item);
    }
  }

  items.sort(compareItems);

  const content = await readFile(indexPath, 'utf8');
  const startIndex = content.indexOf(INDEX_START);
  const endIndex = content.indexOf(INDEX_END);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error(
      `Managed backlog index markers missing in ${indexPath}. Expected the exact marker pair:\n${INDEX_START}\n${INDEX_END}\nRun \`oat backlog init\` if the backlog scaffold is missing, or restore those exact markers in \`backlog/index.md\` before rerunning \`oat backlog regenerate-index\`.`,
    );
  }

  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex + INDEX_END.length);
  const updated = `${before}${renderManagedSection(items)}${after}`;
  await writeFile(indexPath, updated, 'utf8');
}
