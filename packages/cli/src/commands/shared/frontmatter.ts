import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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

export async function getSkillVersion(
  skillDir: string,
): Promise<string | null> {
  // parseFrontmatterField() returns '' when SKILL.md is missing or unreadable,
  // so read failures are normalized to null here.
  const version = await parseFrontmatterField(
    join(skillDir, 'SKILL.md'),
    'version',
  );
  return version.length > 0 ? version : null;
}

export async function getAgentVersion(
  agentPath: string,
): Promise<string | null> {
  const version = await parseFrontmatterField(agentPath, 'version');
  return version.length > 0 ? version : null;
}
