import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists } from '@fs/io';

const SECTION_START = '# OAT local paths';
const SECTION_END = '# END OAT local paths';

export interface ApplyResult {
  action: 'created' | 'updated' | 'no-change';
  paths: string[];
}

function normalizePath(p: string): string {
  return p.endsWith('/') ? p : `${p}/`;
}

function buildSection(localPaths: string[]): string {
  if (localPaths.length === 0) return '';
  const entries = localPaths.map(normalizePath).join('\n');
  return `${SECTION_START}\n${entries}\n${SECTION_END}`;
}

export async function applyGitignore(
  repoRoot: string,
  localPaths: string[],
): Promise<ApplyResult> {
  const gitignorePath = join(repoRoot, '.gitignore');
  const exists = await fileExists(gitignorePath);
  const normalizedPaths = localPaths.map(normalizePath);

  if (!exists) {
    const section = buildSection(localPaths);
    if (section) {
      await writeFile(gitignorePath, `${section}\n`, 'utf8');
    }
    return { action: 'created', paths: normalizedPaths };
  }

  const content = await readFile(gitignorePath, 'utf8');
  const startIdx = content.indexOf(SECTION_START);
  const endIdx = content.indexOf(SECTION_END);

  const newSection = buildSection(localPaths);

  if (startIdx !== -1 && endIdx !== -1) {
    // Extract existing section to check for no-change
    const existingSection = content.slice(
      startIdx,
      endIdx + SECTION_END.length,
    );
    if (existingSection === newSection) {
      return { action: 'no-change', paths: normalizedPaths };
    }

    // Replace existing section
    const before = content.slice(0, startIdx);
    const after = content.slice(endIdx + SECTION_END.length);

    let updated: string;
    if (newSection) {
      updated = `${before}${newSection}${after}`;
    } else {
      // Remove section and clean up surrounding blank lines
      updated = `${before.replace(/\n+$/, '\n')}${after.replace(/^\n+/, '')}`;
    }

    await writeFile(gitignorePath, updated, 'utf8');
    return { action: 'updated', paths: normalizedPaths };
  }

  // No existing section — append
  if (newSection) {
    const separator = content.endsWith('\n') ? '\n' : '\n\n';
    await writeFile(
      gitignorePath,
      `${content}${separator}${newSection}\n`,
      'utf8',
    );
  }

  return { action: 'updated', paths: normalizedPaths };
}
