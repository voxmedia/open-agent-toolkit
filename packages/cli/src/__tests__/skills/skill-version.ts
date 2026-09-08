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
 * Rewrite every version declaration a skill's frontmatter carries.
 *
 * A shape-blind `^version:` replacement silently becomes a no-op once a skill
 * moves its declaration under `metadata`, which would leave a mutation-based
 * test asserting nothing at all. Rewriting only the position the resolver
 * happens to pick is the other half of that trap: a file carrying both
 * declarations would come out self-contradictory, and the consumer under test
 * would then be rejecting a conflict rather than the version it was handed.
 * `withSkillVersion` in `tools/smoke/explainer-kit/packaged-layout.test.mjs`
 * follows the same rule.
 *
 * Comment lines carry no structure in YAML, so they neither end a block nor set
 * its indentation: a block scalar reached past a misread indent would otherwise
 * have its payload rewritten while the real declaration kept its old value.
 *
 * Returns the content unchanged when the shared resolver reads no version from
 * it, and when a declaration is repeated, so callers can assert that the
 * rewrite actually happened rather than silently mutating a file nothing can
 * resolve.
 */
export function withDeclaredVersion(content: string, version: string): string {
  if (resolveDeclaredVersion(content) === null) {
    return content;
  }

  const lines = content.split('\n');
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  const targets: { index: number; indent: number }[] = [];
  let inMetadata = false;
  let seenMetadata = false;
  let childIndent: number | null = null;
  let duplicated = false;

  for (let index = 1; index < end; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      continue;
    }
    if (/^\S/.test(line)) {
      inMetadata = /^metadata:[ \t]*(?:#.*)?$/.test(line);
      duplicated ||= inMetadata && seenMetadata;
      seenMetadata ||= inMetadata;
      childIndent = null;
      if (/^version:[ \t]+/.test(line)) {
        duplicated ||= targets.some((target) => target.indent === 0);
        targets.push({ index, indent: 0 });
      }
      continue;
    }
    if (!inMetadata) {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    childIndent ??= indent;
    if (indent !== childIndent) {
      continue;
    }
    if (/^version:[ \t]+/.test(line.trimStart())) {
      duplicated ||= targets.some((target) => target.indent > 0);
      targets.push({ index, indent });
    }
  }

  if (duplicated || targets.length === 0) {
    return content;
  }
  for (const target of targets) {
    lines[target.index] = `${' '.repeat(target.indent)}version: ${version}`;
  }

  return lines.join('\n');
}
