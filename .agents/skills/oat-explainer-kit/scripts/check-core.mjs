import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

export const CORE_INSTALL_COMMAND = 'oat tools install utility --scope user';
export const CORE_UPDATE_COMMAND =
  'oat tools update --pack utility --scope user';

export async function checkCoreCompatibility({
  adapterRoot,
  userSkillsRoot = join(homedir(), '.agents', 'skills'),
  minimumVersion,
}) {
  const minimum = parseVersion(minimumVersion);
  if (minimum === null) {
    throw new TypeError(
      `minimumVersion must be a semantic version, received: ${minimumVersion}`,
    );
  }

  const canonicalAdapterRoot = resolve(adapterRoot);
  const adapterSkillsRoot = dirname(canonicalAdapterRoot);
  const canonicalUserSkillsRoot = resolve(userSkillsRoot);
  const coreRoot = join(canonicalUserSkillsRoot, 'explainer-kit');
  if (
    basename(canonicalAdapterRoot) !== 'oat-explainer-kit' ||
    basename(adapterSkillsRoot) !== 'skills' ||
    basename(dirname(adapterSkillsRoot)) !== '.agents' ||
    basename(canonicalUserSkillsRoot) !== 'skills' ||
    basename(dirname(canonicalUserSkillsRoot)) !== '.agents'
  ) {
    return failure({
      code: 'invalid-layout',
      coreRoot,
      minimumVersion,
      message:
        'oat-explainer-kit is not running from an installed canonical .agents/skills path.',
      guidance: CORE_INSTALL_COMMAND,
    });
  }

  let skill;
  try {
    skill = await readFile(join(coreRoot, 'SKILL.md'), 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return failure({
        code: 'missing',
        coreRoot,
        minimumVersion,
        message: 'A canonical installed explainer-kit core was not found.',
        guidance: CORE_INSTALL_COMMAND,
      });
    }
    throw error;
  }

  const installedVersion = readFrontmatterVersion(skill);
  const installed = parseVersion(installedVersion);
  if (
    installed === null ||
    installed.major !== minimum.major ||
    installed.minor < minimum.minor
  ) {
    return failure({
      code: 'incompatible',
      coreRoot,
      installedVersion,
      minimumVersion,
      message: installedVersion
        ? `Installed explainer-kit ${installedVersion} is incompatible with required ${minimumVersion}.`
        : 'Installed explainer-kit has no valid version.',
      guidance: CORE_UPDATE_COMMAND,
    });
  }

  return {
    ok: true,
    code: 'compatible',
    coreRoot,
    installedVersion,
    minimumVersion,
    message: `Installed explainer-kit ${installedVersion} is compatible.`,
    guidance: null,
  };
}

function failure({
  code,
  coreRoot,
  installedVersion = null,
  minimumVersion,
  message,
  guidance,
}) {
  return {
    ok: false,
    code,
    coreRoot,
    installedVersion,
    minimumVersion,
    message,
    guidance,
  };
}

/**
 * Read a skill's canonical version from its frontmatter, with
 * `metadata.version` taking precedence over the deprecated top-level `version`
 * alias.
 *
 * ACCEPTED EXCEPTION to the repository rule that only
 * `packages/cli/src/commands/shared/frontmatter.ts` implements this precedence:
 * this script is installed into user projects by pack install, where it can
 * import neither that resolver nor the `yaml` package, so it carries a
 * self-contained reader. The parity contract
 * `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` runs one
 * shared fixture corpus — plus every bundled `SKILL.md` — through this reader
 * and the canonical resolver and requires the same answer; a change to the
 * canonical precedence rule must update those fixtures and this reader
 * together.
 *
 * Anything the canonical resolver cannot resolve cleanly returns `null` so the
 * compatibility check fails closed instead of guessing: a conflict between the
 * two positions, a malformed block, a duplicate key, a tagged, anchored, or
 * aliased scalar, and a plain scalar YAML would read as a number, boolean, or
 * null.
 *
 * Deliberate limits of a parser-free reader, all of which fail closed rather
 * than guess a version: flow collections (`metadata: {version: 1.2.3}`), block
 * scalars, quoted keys, quote escape sequences, multi-line plain scalars, and
 * document markers inside the block all return `null` even where a full YAML
 * parser would resolve them. Nothing in the authoring templates emits those
 * shapes.
 *
 * Every key and value in the block is checked, not just `version`, and the
 * whole block is walked to any depth, so a syntax error anywhere in it fails
 * closed rather than leaving a readable version behind. What remains outside
 * the reader's reach is the content of a shape it refuses outright — the body
 * of a block scalar, or anything inside a flow collection — which it never
 * parses because it never accepts the shape that introduces it.
 */
export function readFrontmatterVersion(content) {
  const block = frontmatterBlock(content);
  if (block === null) {
    return null;
  }

  const root = readBlockMap(block.split('\n').map(classifyLine), -1);
  if (root === null || (root.indent !== null && root.indent !== 0)) {
    return null;
  }

  let topLevel;
  let metadata;
  let unusable = false;

  for (const child of root.children) {
    if (child.name === 'version') {
      const scalar = declaredScalar(child);
      if (scalar === null) {
        unusable = true;
      } else {
        topLevel = scalar;
      }
      continue;
    }
    if (child.name === 'metadata') {
      // A `metadata:` key with a scalar or flow value is not the block map the
      // canonical resolver requires, and one with no children is a null scalar.
      if (scalarText(child.value) !== '' || child.map.indent === null) {
        return null;
      }
      const nested = child.map.children.find(
        (entry) => entry.name === 'version',
      );
      if (nested !== undefined) {
        const scalar = declaredScalar(nested);
        if (scalar === null) {
          unusable = true;
        } else {
          metadata = scalar;
        }
      }
    }
  }

  if (unusable) {
    return null;
  }
  if (metadata !== undefined) {
    return topLevel !== undefined && topLevel !== metadata ? null : metadata;
  }
  return topLevel ?? null;
}

function frontmatterBlock(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? null;
}

/**
 * Sort one frontmatter line into the few shapes this reader understands.
 *
 * A key must be followed by `:` and then whitespace or the end of the line,
 * which is what YAML requires of a block mapping: `version:1.2.3` is a plain
 * scalar, not a key, and the canonical resolver reads no version from it. A tab
 * in the indentation is never valid YAML indentation, and a quoted key is a
 * shape this reader refuses rather than compares raw against a plain one.
 */
function classifyLine(line) {
  if (line.trim() === '') {
    return { kind: 'blank' };
  }
  const indentation = line.match(/^[ \t]*/)[0];
  if (indentation.includes('\t')) {
    return { kind: 'invalid' };
  }
  const indent = indentation.length;
  const rest = line.slice(indent);
  if (rest.startsWith('#')) {
    return { kind: 'comment', indent };
  }
  const key = rest.match(/^([^\s:#]+):(?=[ \t]|$)([ \t].*)?$/);
  // A key is a plain scalar too: a quoted key is a shape this reader refuses
  // rather than compares raw against a plain one, and a key opening with an
  // indicator is not a key at all.
  if (key === null || /^["']/.test(key[1]) || !isPlainScalar(key[1])) {
    return { kind: 'invalid', indent };
  }
  return { kind: 'key', indent, name: key[1], value: key[2] ?? '' };
}

/**
 * Read one block map and everything under it, rejecting every structure this
 * reader cannot validate: an inconsistent indent, a duplicate key at any depth,
 * a value shape it cannot read, or a line it cannot classify. Rejection is
 * always `null`, never a guess.
 */
function readBlockMap(lines, parentIndent) {
  let indent = null;
  const names = [];
  const children = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    if (line.kind === 'invalid') {
      return null;
    }
    if (line.kind === 'blank' || line.kind === 'comment') {
      index += 1;
      continue;
    }
    if (line.indent <= parentIndent) {
      return null;
    }
    if (indent === null) {
      indent = line.indent;
    }
    if (line.indent !== indent) {
      return null;
    }
    const identity = keyIdentity(line.name);
    if (names.includes(identity) || !isReadableValue(line.value)) {
      return null;
    }
    names.push(identity);

    let end = index + 1;
    while (
      end < lines.length &&
      (lines[end].kind === 'blank' ||
        lines[end].kind === 'comment' ||
        lines[end].kind === 'invalid' ||
        lines[end].indent > indent)
    ) {
      end += 1;
    }
    const body = lines.slice(index + 1, end);
    const map = body.some((entry) => entry.kind !== 'blank')
      ? readBlockMap(body, indent)
      : { indent: null, children: [] };
    // A key cannot own both a scalar and a nested map. This also refuses a
    // multi-line plain scalar, whose continuation lines arrive here as
    // children: folding one is beyond a parser-free reader, so it fails closed.
    if (
      map === null ||
      (map.indent !== null && scalarText(line.value) !== '')
    ) {
      return null;
    }
    children.push({ ...line, map });
    index = end;
  }

  return { indent, children };
}

/**
 * The scalar a key declares, or `null` when it declares something this reader
 * refuses to read as a version — including a multi-line scalar or a nested map,
 * both of which arrive here as children.
 */
function declaredScalar(child) {
  return child.map.indent === null ? scalarValue(child.value) : null;
}

/**
 * Whether a raw value is a shape this reader can read at all. Every key's value
 * is checked, not just `version`, so no syntax error is silently walked past:
 * the canonical resolver rejects the whole document for any of them.
 */
function isReadableValue(raw) {
  const text = raw.trim();
  if (text === '' || text.startsWith('#')) {
    return true;
  }
  if (/^["']/.test(text)) {
    return quotedScalar(text) !== null;
  }
  return isPlainScalar(scalarText(text));
}

/**
 * Whether a comment-stripped value is a plain scalar YAML reads as a string.
 *
 * Refused: every character YAML forbids at the start of a plain scalar — the
 * flow, block-scalar, anchor, alias, and tag indicators, and the reserved `@`,
 * `` ` ``, and `%` — plus `-`, `?`, and `:` when whitespace or the end of the
 * value follows, which is what makes them indicators rather than the first
 * letter of a word. A `:` anywhere in the value gets the same treatment,
 * because `: ` opens a nested mapping instead of continuing the scalar.
 *
 * Still readable, because none of these is an indicator in block context: a `:`
 * inside a word (`https://example.com`), a `,` after the first character
 * (`allowed-tools: Read, Write`), and a leading `-` or `?` that starts a word
 * (`-word`).
 */
function isPlainScalar(plain) {
  return (
    !/^[&*!|>[\]{},@`%]/.test(plain) &&
    !/^[-?](?:[ \t]|$)/.test(plain) &&
    !/:(?:[ \t]|$)/.test(plain)
  );
}

/**
 * The identity YAML gives a mapping key, so two spellings of one key are caught
 * as the duplicate they are: `true` and `True` are the same boolean key, and
 * `1` and `01` the same integer key, even though their text differs.
 */
function keyIdentity(name) {
  if (/^(null|Null|NULL|~)$/.test(name)) {
    return 'null';
  }
  if (/^(true|True|TRUE)$/.test(name)) {
    return 'bool:true';
  }
  if (/^(false|False|FALSE)$/.test(name)) {
    return 'bool:false';
  }
  if (
    /^[-+]?[0-9]+$/.test(name) ||
    /^0x[0-9a-fA-F]+$/.test(name) ||
    /^0o[0-7]+$/.test(name) ||
    /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/.test(name)
  ) {
    return `number:${Number(name)}`;
  }
  return `string:${name}`;
}

/**
 * Strip a trailing comment from a raw value. YAML only starts a comment at a
 * `#` preceded by whitespace, so `1.2.3#note` is the string it looks like.
 */
function scalarText(raw) {
  const text = raw.trim();
  if (text.startsWith('#')) {
    return '';
  }
  const comment = text.search(/[ \t]#/);
  return (comment === -1 ? text : text.slice(0, comment)).trim();
}

function quotedScalar(text) {
  const quoted =
    text.match(/^"([^"\\]*)"(?:[ \t]+#.*)?$/) ??
    text.match(/^'([^']*)'(?:[ \t]+#.*)?$/);
  return quoted?.[1] ?? null;
}

/**
 * Read one plain or quoted string scalar, returning `null` for every value the
 * canonical resolver refuses to treat as a version string.
 */
function scalarValue(raw) {
  const text = raw.trim();
  if (text === '' || text.startsWith('#')) {
    return null;
  }

  if (/^["']/.test(text)) {
    const quoted = quotedScalar(text)?.trim();
    return quoted === undefined || quoted === '' ? null : quoted;
  }

  const plain = scalarText(text);
  if (plain === '') {
    return null;
  }
  if (!isPlainScalar(plain)) {
    return null;
  }
  // Core-schema scalars that resolve to a non-string type: `version: 1.10` is
  // the number 1.1, never the string an author meant to write.
  if (
    /^(null|Null|NULL|~)$/.test(plain) ||
    /^(true|True|TRUE|false|False|FALSE)$/.test(plain) ||
    /^[-+]?[0-9]+$/.test(plain) ||
    /^0o[0-7]+$/.test(plain) ||
    /^0x[0-9a-fA-F]+$/.test(plain) ||
    /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/.test(plain) ||
    /^[-+]?\.(inf|Inf|INF)$/.test(plain) ||
    /^\.(nan|NaN|NAN)$/.test(plain)
  ) {
    return null;
  }
  return plain;
}

function parseVersion(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/,
  );
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}
