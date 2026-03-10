import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface IndexEntry {
  title: string;
  description?: string;
  path: string;
  children?: IndexEntry[];
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const HEADING_RE = /^#\s+(.+)$/m;

function fileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.md$/, '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseFrontmatter(content: string): {
  title?: string;
  description?: string;
} {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    return {};
  }

  const fm = match[1]!;
  const titleMatch = /^title:\s*(.+)$/m.exec(fm);
  const descMatch = /^description:\s*(.+)$/m.exec(fm);

  return {
    title: titleMatch?.[1]?.trim().replace(/^["']|["']$/g, '') || undefined,
    description:
      descMatch?.[1]?.trim().replace(/^["']|["']$/g, '') || undefined,
  };
}

function resolveTitle(
  content: string,
  fileName: string,
): { title: string; description?: string } {
  const fm = parseFrontmatter(content);

  if (fm.title) {
    return { title: fm.title, description: fm.description };
  }

  const headingMatch = HEADING_RE.exec(content);
  if (headingMatch) {
    return { title: headingMatch[1]!.trim(), description: fm.description };
  }

  return { title: fileNameToTitle(fileName), description: fm.description };
}

function sortEntries(entries: IndexEntry[]): IndexEntry[] {
  return entries.sort((a, b) => {
    // index.md always first
    const aIsIndex = a.path.endsWith('index.md');
    const bIsIndex = b.path.endsWith('index.md');
    if (aIsIndex && !bIsIndex) return -1;
    if (!aIsIndex && bIsIndex) return 1;
    // directories (entries with children) before files
    const aIsDir = a.children !== undefined;
    const bIsDir = b.children !== undefined;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.path.localeCompare(b.path);
  });
}

export async function generateIndex(docsDir: string): Promise<IndexEntry[]> {
  const entries: IndexEntry[] = [];
  const subdirs: string[] = [];

  const dirEntries = await readdir(docsDir, { withFileTypes: true });

  for (const entry of dirEntries) {
    if (entry.isDirectory()) {
      subdirs.push(entry.name);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const filePath = join(docsDir, entry.name);
      const content = await readFile(filePath, 'utf8');
      const { title, description } = resolveTitle(content, entry.name);
      entries.push({
        title,
        description: description || undefined,
        path: entry.name,
      });
    }
  }

  for (const subdir of subdirs.sort()) {
    const children = await generateIndex(join(docsDir, subdir));
    if (children.length > 0) {
      entries.push({
        title: fileNameToTitle(subdir),
        path: subdir,
        children: children.map((child) => ({
          ...child,
          path: join(subdir, child.path),
        })),
      });
    }
  }

  return sortEntries(entries);
}

function renderEntries(entries: IndexEntry[], indent: number): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const entry of entries) {
    if (entry.children) {
      lines.push(`${prefix}- ${entry.title}`);
      lines.push(...renderEntries(entry.children, indent + 1));
    } else {
      const desc = entry.description ? ` — ${entry.description}` : '';
      lines.push(`${prefix}- [${entry.title}](${entry.path})${desc}`);
    }
  }

  return lines;
}

export function renderIndex(entries: IndexEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  return `${renderEntries(entries, 0).join('\n')}\n`;
}
