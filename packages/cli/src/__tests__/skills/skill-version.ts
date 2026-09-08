import {
  getFrontmatterBlock,
  parseSkillFrontmatter,
  type ResolvedSkillVersion,
  resolveSkillVersion,
} from '@commands/shared/frontmatter';

/**
 * Read the version a canonical skill or agent file declares, through the shared
 * resolver in `@commands/shared/frontmatter` rather than a line-anchored
 * `version:` regex.
 *
 * A raw `^version:` capture only ever sees the deprecated top-level alias, so
 * every pin written that way silently stops matching the moment its file moves
 * the declaration under `metadata`. These helpers keep the pinned values
 * meaningful across both shapes; the pins themselves stay exact.
 *
 * `resolveDeclaredVersion` exposes the full resolution so a caller can assert
 * on `source` or reject a `conflict`; `readDeclaredVersion` returns just the
 * version, and `undefined` when none resolves, matching what the regex capture
 * used to yield for a file with no declaration.
 */
export function resolveDeclaredVersion(
  content: string,
): ResolvedSkillVersion | null {
  const block = getFrontmatterBlock(content);
  return block === null
    ? null
    : resolveSkillVersion(parseSkillFrontmatter(block));
}

export function readDeclaredVersion(content: string): string | undefined {
  return resolveDeclaredVersion(content)?.version;
}

/**
 * Rewrite the version a skill declares, in whichever position it declares it.
 *
 * A shape-blind `^version:` replacement silently becomes a no-op once a skill
 * moves its declaration under `metadata`, which would leave a mutation-based
 * test asserting nothing at all. Returns the content unchanged when no version
 * resolves, so callers can assert that the rewrite actually happened.
 */
export function withDeclaredVersion(content: string, version: string): string {
  const source = resolveDeclaredVersion(content)?.source;
  if (source === undefined) {
    return content;
  }

  const lines = content.split('\n');
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  let inMetadata = false;
  let childIndent: number | null = null;

  for (let index = 1; index < end; index += 1) {
    const line = lines[index] ?? '';
    if (/^\S/.test(line)) {
      inMetadata = /^metadata:\s*$/.test(line);
      childIndent = null;
      if (source === 'top-level' && /^version:[ \t]/.test(line)) {
        lines[index] = `version: ${version}`;
        return lines.join('\n');
      }
      continue;
    }
    if (!inMetadata || line.trim() === '') {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    childIndent ??= indent;
    if (indent !== childIndent) {
      continue;
    }
    if (source === 'metadata' && /^version:[ \t]/.test(line.trimStart())) {
      lines[index] = `${' '.repeat(indent)}version: ${version}`;
      return lines.join('\n');
    }
  }

  return content;
}
