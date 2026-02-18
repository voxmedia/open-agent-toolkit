import { readFile } from 'node:fs/promises';

export function getFrontmatterBlock(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? null;
}

export function getFrontmatterField(
  frontmatter: string,
  field: string,
): string | null {
  const regex = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const match = frontmatter.match(regex);
  if (!match) return null;
  return match[1]!.replace(/\s*#.*$/, '').trim();
}

export async function parseFrontmatterField(
  filePath: string,
  field: string,
): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf8');
    const block = getFrontmatterBlock(content);
    if (!block) return '';
    return getFrontmatterField(block, field) ?? '';
  } catch {
    return '';
  }
}
