import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { fileExists } from '@fs/io';

/**
 * Manages HTML-comment-delimited sections in AGENTS.md.
 *
 * Section markers follow the pattern:
 *   <!-- OAT <key> -->
 *   ... content ...
 *   <!-- END OAT <key> -->
 */

function sectionStart(key: string): string {
  return `<!-- OAT ${key} -->`;
}

function sectionEnd(key: string): string {
  return `<!-- END OAT ${key} -->`;
}

function buildSection(key: string, body: string): string {
  return `${sectionStart(key)}\n${body}\n${sectionEnd(key)}`;
}

export interface UpsertSectionResult {
  action: 'created' | 'updated' | 'no-change';
}

/**
 * Insert or replace a managed section in AGENTS.md.
 *
 * - If AGENTS.md doesn't exist, creates it with the section.
 * - If the section markers exist, replaces the content between them.
 * - If AGENTS.md exists but the section markers don't, appends.
 */
export async function upsertAgentsMdSection(
  repoRoot: string,
  key: string,
  body: string,
): Promise<UpsertSectionResult> {
  const agentsMdPath = join(repoRoot, 'AGENTS.md');
  const section = buildSection(key, body);
  const exists = await fileExists(agentsMdPath);

  if (!exists) {
    await writeFile(agentsMdPath, `${section}\n`, 'utf8');
    return { action: 'created' };
  }

  const content = await readFile(agentsMdPath, 'utf8');
  const start = sectionStart(key);
  const end = sectionEnd(key);
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end);

  if (startIdx !== -1 && endIdx !== -1) {
    const existingSection = content.slice(startIdx, endIdx + end.length);
    if (existingSection === section) {
      return { action: 'no-change' };
    }

    const before = content.slice(0, startIdx);
    const after = content.slice(endIdx + end.length);
    await writeFile(agentsMdPath, `${before}${section}${after}`, 'utf8');
    return { action: 'updated' };
  }

  // Append to end
  const separator = content.endsWith('\n') ? '\n' : '\n\n';
  await writeFile(agentsMdPath, `${content}${separator}${section}\n`, 'utf8');
  return { action: 'updated' };
}

/**
 * Remove a managed section from AGENTS.md if it exists.
 *
 * Returns true if the section was found and removed, false otherwise.
 */
export async function removeAgentsMdSection(
  repoRoot: string,
  key: string,
): Promise<boolean> {
  const agentsMdPath = join(repoRoot, 'AGENTS.md');
  const exists = await fileExists(agentsMdPath);

  if (!exists) {
    return false;
  }

  const content = await readFile(agentsMdPath, 'utf8');
  const start = sectionStart(key);
  const end = sectionEnd(key);
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end);

  if (startIdx === -1 || endIdx === -1) {
    return false;
  }

  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx + end.length);
  // Collapse extra blank lines left by removal
  const cleaned = (before + after).replace(/\n{3,}/g, '\n\n');
  await writeFile(agentsMdPath, cleaned, 'utf8');
  return true;
}
