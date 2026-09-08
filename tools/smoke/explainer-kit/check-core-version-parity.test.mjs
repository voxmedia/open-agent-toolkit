import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { readFrontmatterVersion } from '../../../.agents/skills/oat-explainer-kit/scripts/check-core.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const RESOLVER_MODULE_PATH = 'packages/cli/dist/commands/shared/frontmatter.js';
const RESOLVER_DIST = join(REPO_ROOT, RESOLVER_MODULE_PATH);

if (!existsSync(RESOLVER_DIST)) {
  throw new Error(
    `Missing ${RESOLVER_MODULE_PATH}; run \`pnpm build\` before \`pnpm test:smoke\`.`,
  );
}

const { getFrontmatterBlock, parseSkillFrontmatter, resolveSkillVersion } =
  await import(pathToFileURL(RESOLVER_DIST).href);

/**
 * Every declaration shape that must resolve identically in both readers.
 *
 * Each entry is a whole SKILL.md, not a frontmatter block, so the block
 * delimiters themselves (missing, CRLF) are part of the corpus.
 */
const FIXTURES = [
  ['metadata only', '---\nname: core\nmetadata:\n  version: 1.2.3\n---\n'],
  ['top-level alias only', '---\nname: core\nversion: 1.2.3\n---\n'],
  [
    'both agreeing',
    '---\nname: core\nversion: 1.2.3\nmetadata:\n  version: 1.2.3\n---\n',
  ],
  [
    'both conflicting',
    '---\nname: core\nversion: 1.2.3\nmetadata:\n  version: 9.9.9\n---\n',
  ],
  ['double-quoted alias', '---\nname: core\nversion: "1.2.3"\n---\n'],
  [
    'single-quoted metadata',
    "---\nname: core\nmetadata:\n  version: '1.2.3'\n---\n",
  ],
  ['trailing comment', '---\nname: core\nversion: 1.2.3 # pinned\n---\n'],
  [
    'trailing comment under metadata',
    '---\nname: core\nmetadata:\n  version: 1.2.3 # pinned\n---\n',
  ],
  ['tagged scalar', '---\nname: core\nversion: !!str 1.2.3\n---\n'],
  ['anchored scalar', '---\nname: core\nversion: &pin 1.2.3\n---\n'],
  ['duplicate key', '---\nname: core\nversion: 1.2.3\nversion: 1.2.4\n---\n'],
  [
    'duplicate key under metadata',
    '---\nname: core\nmetadata:\n  version: 1.2.3\n  version: 1.2.4\n---\n',
  ],
  ['non-string scalar', '---\nname: core\nversion: 1.10\n---\n'],
  [
    'non-string scalar under metadata',
    '---\nname: core\nmetadata:\n  version: 1.10\n---\n',
  ],
  ['unterminated quote', '---\nname: core\nversion: "1.2.3\n---\n'],
  ['empty declaration', '---\nname: core\nversion:\n---\n'],
  ['no version at all', '---\nname: core\n---\n'],
  ['metadata with no children', '---\nname: core\nmetadata:\n---\n'],
  [
    'metadata carrying other keys',
    '---\nname: core\nmetadata:\n  author: someone\n  version: 1.2.3\n---\n',
  ],
  [
    'version nested deeper than metadata',
    '---\nname: core\nmetadata:\n  nested:\n    version: 1.2.3\n---\n',
  ],
  [
    'key with no space after the colon',
    '---\nname: core\nversion:1.2.3\n---\n',
  ],
  ['tab indentation', '---\nname: core\nversion: 1.2.3\n\tother: x\n---\n'],
  [
    'tab after the key separator',
    '---\nname: core\nmetadata:\n  version:\t1.2.3\n---\n',
  ],
  [
    'comment after the metadata key',
    '---\nname: core\nmetadata: # info\n  version: 1.2.3\n---\n',
  ],
  [
    'comment at column zero inside metadata',
    '---\nname: core\nmetadata:\n  author: a\n# info\n  version: 1.2.3\n---\n',
  ],
  [
    'duplicate metadata version separated by a comment',
    '---\nname: core\nmetadata:\n  version: 1.2.3\n# info\n  version: 4.5.6\n---\n',
  ],
  [
    'comment containing a tab inside metadata',
    '---\nname: core\nmetadata:\n  version: 1.2.3\n  #\tcomment\n---\n',
  ],
  [
    'quoted value with an unspaced comment',
    '---\nname: core\nversion: "1.2.3"#note\n---\n',
  ],
  [
    'plain value with an unspaced comment',
    '---\nname: core\nversion: 1.2.3#note\n---\n',
  ],
  ['case-varied boolean lookalike', '---\nname: core\nversion: tRuE\n---\n'],
  ['binary-looking scalar', '---\nname: core\nversion: 0b11\n---\n'],
  [
    'unusable alias beside a usable metadata version',
    '---\nname: core\nversion: 1.10\nmetadata:\n  version: 1.2.3\n---\n',
  ],
  [
    'usable alias beside an empty metadata version',
    '---\nname: core\nversion: 1.2.3\nmetadata:\n  version:\n---\n',
  ],
  [
    'malformed value in an unrelated key',
    '---\nname: core\nversion: 1.2.3\nother: [\n---\n',
  ],
  [
    'duplicate key nested below metadata',
    '---\nname: core\nversion: 1.2.3\nmetadata:\n  nested:\n    x: a\n    x: b\n---\n',
  ],
  [
    'quoted duplicate of a plain key',
    '---\nname: core\nversion: 1.2.3\nmetadata:\n  author: a\n"metadata":\n  author: b\n---\n',
  ],
  [
    'deeper content after a metadata scalar',
    '---\nname: core\nmetadata:\n  version: 1.2.3\n    other: x\n---\n',
  ],
  ['no frontmatter block', 'name: core\nversion: 1.2.3\n'],
  ['CRLF frontmatter', '---\r\nname: core\r\nversion: 1.2.3\r\n---\r\n'],
];

/**
 * The canonical answer: the version only when the resolver resolves one
 * cleanly. A malformed block, a declared-but-unreadable version, and a
 * metadata/top-level conflict are all "no usable version" for a consumer that
 * must not guess.
 */
function canonicalVersion(content) {
  const block = getFrontmatterBlock(content);
  if (block === null) {
    return null;
  }
  const parsed = parseSkillFrontmatter(block);
  if (parsed.malformed || parsed.unusableVersionDeclaration) {
    return null;
  }
  const resolved = resolveSkillVersion(parsed);
  if (resolved === null || resolved.conflict !== undefined) {
    return null;
  }
  return resolved.version;
}

test('the bundled core check reads versions exactly as the CLI resolver does', () => {
  for (const [label, content] of FIXTURES) {
    assert.equal(
      readFrontmatterVersion(content),
      canonicalVersion(content),
      label,
    );
  }
});

test('the parity corpus covers both a resolving and a rejecting outcome', () => {
  const outcomes = FIXTURES.map(([, content]) => canonicalVersion(content));
  assert.ok(
    outcomes.some((version) => version === '1.2.3'),
    'corpus must contain fixtures that resolve',
  );
  assert.ok(
    outcomes.some((version) => version === null),
    'corpus must contain fixtures that fail closed',
  );
});

test('the stricter consumer policy is pinned, not accidental', () => {
  // The resolver still resolves a usable position when the *other* one is
  // broken; the installed check must refuse both, so the divergence is pinned
  // here rather than left to be discovered as a parity failure later.
  for (const content of [
    '---\nname: core\nversion: 1.10\nmetadata:\n  version: 1.2.3\n---\n',
    '---\nname: core\nversion: 1.2.3\nmetadata:\n  version:\n---\n',
  ]) {
    const parsed = parseSkillFrontmatter(getFrontmatterBlock(content));
    const resolved = resolveSkillVersion(parsed);
    assert.equal(resolved.version, '1.2.3');
    assert.equal(resolved.conflict, undefined);
    assert.equal(parsed.unusableVersionDeclaration, true);
    assert.equal(canonicalVersion(content), null);
    assert.equal(readFrontmatterVersion(content), null);
  }
});

test('every bundled skill reads identically in both readers', async () => {
  const skillsRoot = join(REPO_ROOT, '.agents/skills');
  const names = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();

  assert.ok(names.length > 0);
  const divergent = [];
  for (const name of names) {
    const content = await readFile(join(skillsRoot, name, 'SKILL.md'), 'utf8');
    const canonical = canonicalVersion(content);
    const standalone = readFrontmatterVersion(content);
    if (canonical !== standalone) {
      divergent.push(`${name}: ${canonical} !== ${standalone}`);
    }
    assert.match(String(canonical), /^\d+\.\d+\.\d+$/, name);
  }
  assert.deepEqual(divergent, []);
});

/**
 * Shapes a parser-free reader deliberately refuses even though a full YAML
 * parser resolves them. Every one fails closed — the compatibility check
 * reports an unreadable core rather than guessing a version — and no bundled
 * skill or agent frontmatter uses any of them. They are pinned here so the
 * exception's limits are recorded rather than rediscovered.
 */
const DOCUMENTED_FAIL_CLOSED = [
  ['multi-line plain scalar', '---\nname: core\nversion: 1.2.3\n  beta\n---\n'],
  [
    'multi-line plain scalar under metadata',
    '---\nname: core\nmetadata:\n  version: 1.2.3\n   beta\n---\n',
  ],
  ['flow map metadata', '---\nname: core\nmetadata: {version: 1.2.3}\n---\n'],
  [
    'empty flow map metadata',
    '---\nname: core\nversion: 1.2.3\nmetadata: {}\n---\n',
  ],
  ['literal block scalar', '---\nname: core\nversion: |\n  1.2.3\n---\n'],
  [
    'folded block scalar under metadata',
    '---\nname: core\nmetadata:\n  version: >-\n    1.2.3\n---\n',
  ],
  ['document-end marker', '---\nname: core\nversion: 1.2.3\n...\n---\n'],
  ['quoted key', '---\n"version": 1.2.3\n---\n'],
  ['single-quote escape', "---\nname: core\nversion: '1.2.3''beta'\n---\n"],
  ['double-quote escape', '---\nname: core\nversion: "1.2.\\x33"\n---\n'],
];

test('every documented divergence fails closed and none fails open', () => {
  for (const [label, content] of DOCUMENTED_FAIL_CLOSED) {
    assert.notEqual(canonicalVersion(content), null, label);
    assert.equal(readFrontmatterVersion(content), null, label);
  }
});
