import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import type { PackDefinition } from '@commands/tools/shared/pack-manifest';
import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: import.meta.dirname,
  encoding: 'utf8',
}).trim();

const SKILLS_DIR = join(REPO_ROOT, '.agents', 'skills');
const AGENTS_DIR = join(REPO_ROOT, '.agents', 'agents');
const SHARED_DOCS_DIR = join(REPO_ROOT, '.agents', 'docs');
const BUNDLE_ASSETS_SCRIPT = join(
  REPO_ROOT,
  'packages',
  'cli',
  'scripts',
  'bundle-assets.sh',
);

// Matches a Markdown reference to a real shared doc, e.g. `.agents/docs/skills-guide.md`.
const SHARED_DOC_REF = /\.agents\/docs\/([a-zA-Z0-9_-]+)\.md/g;

// A line carrying this marker is opting out: the reference is intentionally
// monorepo-internal and not expected to resolve in consumer repos.
const MONOREPO_ONLY_MARKER = /monorepo only/i;

interface Violation {
  file: string;
  doc: string;
  line: string;
}

// A cross-skill read, identified by the authoring file plus the exact skill and
// path it points at. Keeping the target path inside the identity stops a new
// file, a new target skill, or a new target file from silently inheriting an
// existing exemption.
interface CrossSkillReference {
  file: string;
  targetSkill: string;
  targetPath: string;
}

interface CrossSkillTarget {
  targetSkill: string;
  targetPath: string;
}

type PortableAssetTarget =
  | { kind: 'skill'; name: string }
  | { kind: 'agent'; name: string };

interface PortableAssetFinding {
  asset: PortableAssetTarget;
  target: string;
  evidence: string;
}

type AgentCandidateTier = 'loaded' | 'user' | 'project';
type AgentCandidateOutcome =
  | 'missing'
  | 'broken-symlink'
  | 'escaping-symlink'
  | 'noncanonical-copy'
  | 'wrong-target';

interface AgentCandidateAttempt {
  tier: AgentCandidateTier;
  candidate: string;
  outcome: AgentCandidateOutcome;
}

interface ResolveCanonicalAgentInput {
  dependency: string;
  canonicalName: string;
  skillDir: string;
  userCanonicalRoot: string;
  projectCanonicalRoot: string;
}

type CanonicalAgentResolution =
  | {
      status: 'resolved';
      dependency: string;
      canonicalName: string;
      tier: AgentCandidateTier;
      providerRoot: string;
      selectedFile: string;
      canonicalFile: string;
      validation: 'direct-canonical' | 'exact-canonical-symlink';
      attempts: AgentCandidateAttempt[];
    }
  | {
      status: 'miss';
      dependency: string;
      canonicalName: string;
      attempts: AgentCandidateAttempt[];
      recovery: string[];
    };

// Authored Markdown shipped by one user-default pack asset.
interface MarkdownAsset {
  kind: 'skill' | 'agent';
  owner: string;
  files: string[];
}

// Executable repository-relative cross-skill reads take two spellings, and both
// dangle once the owning pack is installed at user scope:
//   - `.agents/skills/<name>/…`, optionally prefixed by any number of `./` or
//     `../` segments; and
//   - `../<name>/…`, a parent-relative hop out of the authoring skill, with any
//     number of `../` segments.
// Either spelling can target the sibling's `SKILL.md` or a file or directory at
// or below the sibling's `references/`.
//
// The parent-segment repetition is load-bearing, not defensive: authored
// Markdown is collected from the whole skill tree, so a file at
// `.agents/skills/<owner>/references/<doc>.md` reaches a sibling skill through
// exactly `../../<name>/…`. Matching only a single `../` would let that
// spelling — the natural one from every scanned `references/` file — slip past
// the ratchet.
//
// Portable reads stay unmatched once repetition is allowed, by two separate
// guards. The leading lookbehind rejects any candidate start preceded by `/` or
// an identifier character, which covers every rooted spelling:
// `${SKILL_DIR}/../<name>/…`, `${SKILL_DIR}/../../<name>/…`, and
// `${HOME}/.agents/skills/…`. The required prefix alternation independently
// rejects `${SKILLS_ROOT}/<name>/…`, which carries neither an `.agents/skills/`
// segment nor a leading `../`.
//
// Short forms such as `subagent-orchestration/references/provider-codex.md` are
// deliberately not matched: they are follow-on reads local to a sibling root
// that an earlier read already bound and validated. The caller-contract
// assertions below enforce that anchoring requirement instead.
const PORTABLE_SKILL_READ =
  /(?<![/a-zA-Z0-9_.-])(?:(?:\.\.?\/)*\.agents\/skills\/|(?:\.\.\/)+)([a-zA-Z0-9_-]+)\/(SKILL\.md|references(?:\/[a-zA-Z0-9_.-]+)*\/?)/g;

const PORTABLE_AGENT_READ =
  /(?<![/a-zA-Z0-9_.-])(?:(?:\.\.?\/)*\.agents\/agents\/|(?:\.\.\/)+agents\/)([a-zA-Z0-9_-]+)\.md/g;

const PORTABLE_SKILLS_ROOT_CANDIDATES = [
  '`${SKILL_DIR}/..`',
  '`${HOME}/.agents/skills`',
  '`<repo-root>/.agents/skills`',
] as const;

// A materialized agent has no stable loaded-agent source path across Codex,
// Claude, and Cursor, so it resolves siblings from user scope, then project
// scope, and must not invent a loaded-agent candidate.
const PORTABLE_AGENT_SKILLS_ROOT_CANDIDATES = [
  '`${HOME}/.agents/skills`',
  '`<repo-root>/.agents/skills`',
] as const;

function listSkillDirs(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listAuthoredMarkdown(skillDir: string): string[] {
  // Recurse the skill, but skip references/docs/ — those are vendored copies of
  // shared docs (symlinks materialized at build time), not authored pointers.
  return readdirSync(skillDir, { recursive: true, encoding: 'utf8' })
    .filter((rel) => {
      const normalizedSegments = rel.replaceAll('\\', '/').split('/');
      const isMaterializedDocsCopy =
        normalizedSegments[0] === 'references' &&
        normalizedSegments[1] === 'docs';

      return rel.endsWith('.md') && !isMaterializedDocsCopy;
    })
    .map((rel) => join(skillDir, rel));
}

function expectCandidateOrder(
  content: string,
  candidates: readonly string[],
  source: string,
): void {
  const positions = candidates.map((candidate) => content.indexOf(candidate));

  for (const [index, candidate] of candidates.entries()) {
    expect(
      positions[index],
      `${source} is missing ${candidate}`,
    ).toBeGreaterThan(-1);
  }
  for (let index = 1; index < positions.length; index += 1) {
    expect(
      positions[index - 1],
      `${source} must list ${candidates[index - 1]} before ${candidates[index]}`,
    ).toBeLessThan(positions[index]!);
  }
}

function expectPortableSkillsRootCandidateOrder(
  content: string,
  source: string,
): void {
  expectCandidateOrder(content, PORTABLE_SKILLS_ROOT_CANDIDATES, source);
}

function expectPortableAgentSkillsRootCandidateOrder(
  content: string,
  source: string,
): void {
  expectCandidateOrder(content, PORTABLE_AGENT_SKILLS_ROOT_CANDIDATES, source);
  // A materialized agent must not claim a loaded-agent or loaded-skill root.
  expect(content, `${source} must not invent a loaded-agent root`).not.toMatch(
    /\$\{(?:SKILL_DIR|AGENT_DIR)\}/,
  );
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];

  for (const skill of listSkillDirs()) {
    const skillDir = join(SKILLS_DIR, skill);

    for (const file of listAuthoredMarkdown(skillDir)) {
      const relFile = file.slice(REPO_ROOT.length + 1);

      for (const line of readFileSync(file, 'utf8').split('\n')) {
        for (const match of line.matchAll(SHARED_DOC_REF)) {
          const doc = match[1];

          // Illustrative example paths (e.g. my-guide.md) don't exist — skip.
          if (!existsSync(join(SHARED_DOCS_DIR, `${doc}.md`))) continue;
          // The skill vendors the doc into its own bundle — it travels. OK.
          if (existsSync(join(skillDir, 'references', 'docs', `${doc}.md`))) {
            continue;
          }
          // Explicit opt-out: intentionally monorepo-internal.
          if (MONOREPO_ONLY_MARKER.test(line)) continue;

          violations.push({
            file: relFile,
            doc: `${doc}.md`,
            line: line.trim(),
          });
        }
      }
    }
  }

  return violations;
}

function compareCrossSkillTargets(
  left: CrossSkillTarget,
  right: CrossSkillTarget,
): number {
  return (
    left.targetSkill.localeCompare(right.targetSkill) ||
    left.targetPath.localeCompare(right.targetPath)
  );
}

function compareCrossSkillReferences(
  left: CrossSkillReference,
  right: CrossSkillReference,
): number {
  return (
    left.file.localeCompare(right.file) || compareCrossSkillTargets(left, right)
  );
}

function crossSkillReferenceKey({
  file,
  targetSkill,
  targetPath,
}: CrossSkillReference): string {
  return `${file}|${targetSkill}|${targetPath}`;
}

function classifyPortableAssetTargets(
  markdown: string,
): PortableAssetFinding[] {
  const indexed: Array<PortableAssetFinding & { index: number }> = [];

  for (const match of markdown.matchAll(PORTABLE_SKILL_READ)) {
    const evidence = match[0];
    indexed.push({
      asset: { kind: 'skill', name: match[1]! },
      target: evidence,
      evidence,
      index: match.index,
    });
  }

  const canonicalAgentNames = new Set(
    readdirSync(AGENTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.slice(0, -'.md'.length)),
  );
  for (const match of markdown.matchAll(PORTABLE_AGENT_READ)) {
    const name = match[1]!;
    if (!canonicalAgentNames.has(name)) continue;
    const evidence = match[0];
    indexed.push({
      asset: { kind: 'agent', name },
      target: evidence,
      evidence,
      index: match.index,
    });
  }

  return indexed
    .sort((left, right) => left.index - right.index)
    .map(({ index: _index, ...finding }) => finding);
}

function inspectCanonicalAgentCandidate(
  tier: AgentCandidateTier,
  providerRoot: string,
  canonicalRoot: string,
  canonicalName: string,
):
  | {
      status: 'resolved';
      selectedFile: string;
      canonicalFile: string;
      validation: 'direct-canonical' | 'exact-canonical-symlink';
    }
  | { status: 'miss'; attempt: AgentCandidateAttempt } {
  const selectedFile = join(providerRoot, 'agents', `${canonicalName}.md`);
  const canonicalFile = join(canonicalRoot, 'agents', `${canonicalName}.md`);
  let selectedStat;

  try {
    selectedStat = lstatSync(selectedFile);
  } catch {
    return {
      status: 'miss',
      attempt: { tier, candidate: selectedFile, outcome: 'missing' },
    };
  }

  if (selectedStat.isSymbolicLink()) {
    let selectedRealpath: string;
    try {
      selectedRealpath = realpathSync(selectedFile);
    } catch {
      return {
        status: 'miss',
        attempt: {
          tier,
          candidate: selectedFile,
          outcome: 'broken-symlink',
        },
      };
    }

    let canonicalRealpath: string;
    try {
      if (!lstatSync(canonicalFile).isFile()) {
        throw new Error('Canonical target is not a regular file');
      }
      canonicalRealpath = realpathSync(canonicalFile);
    } catch {
      return {
        status: 'miss',
        attempt: {
          tier,
          candidate: selectedFile,
          outcome: 'escaping-symlink',
        },
      };
    }

    if (
      selectedRealpath === canonicalRealpath &&
      selectedFile !== canonicalFile
    ) {
      return {
        status: 'resolved',
        selectedFile,
        canonicalFile,
        validation: 'exact-canonical-symlink',
      };
    }

    return {
      status: 'miss',
      attempt: {
        tier,
        candidate: selectedFile,
        outcome: 'escaping-symlink',
      },
    };
  }

  if (!selectedStat.isFile()) {
    return {
      status: 'miss',
      attempt: { tier, candidate: selectedFile, outcome: 'wrong-target' },
    };
  }

  if (selectedFile === canonicalFile) {
    return {
      status: 'resolved',
      selectedFile,
      canonicalFile,
      validation: 'direct-canonical',
    };
  }

  return {
    status: 'miss',
    attempt: {
      tier,
      candidate: selectedFile,
      outcome: 'noncanonical-copy',
    },
  };
}

function resolveCanonicalAgentTarget({
  dependency,
  canonicalName,
  skillDir,
  userCanonicalRoot,
  projectCanonicalRoot,
}: ResolveCanonicalAgentInput): CanonicalAgentResolution {
  const loadedRoot = resolve(skillDir, '..', '..');
  const loadedCanonicalRoot =
    basename(loadedRoot) === '.agents'
      ? loadedRoot
      : join(dirname(loadedRoot), '.agents');
  const candidates: Array<{
    tier: AgentCandidateTier;
    providerRoot: string;
    canonicalRoot: string;
  }> = [
    {
      tier: 'loaded',
      providerRoot: loadedRoot,
      canonicalRoot: loadedCanonicalRoot,
    },
    {
      tier: 'user',
      providerRoot: userCanonicalRoot,
      canonicalRoot: userCanonicalRoot,
    },
    {
      tier: 'project',
      providerRoot: projectCanonicalRoot,
      canonicalRoot: projectCanonicalRoot,
    },
  ];
  const attempts: AgentCandidateAttempt[] = [];

  for (const candidate of candidates) {
    const result = inspectCanonicalAgentCandidate(
      candidate.tier,
      candidate.providerRoot,
      candidate.canonicalRoot,
      canonicalName,
    );
    if (result.status === 'resolved') {
      return {
        status: 'resolved',
        dependency,
        canonicalName,
        tier: candidate.tier,
        providerRoot: candidate.providerRoot,
        selectedFile: result.selectedFile,
        canonicalFile: result.canonicalFile,
        validation: result.validation,
        attempts,
      };
    }
    attempts.push(result.attempt);
  }

  return {
    status: 'miss',
    dependency,
    canonicalName,
    attempts,
    recovery: [
      `oat tools install ${dependency} --scope <user|project>`,
      `oat tools update --pack ${dependency} --scope <user|project>`,
    ],
  };
}

function collectCrossSkillTargets(
  content: string,
  owner: string,
): CrossSkillTarget[] {
  const targets = new Map<string, CrossSkillTarget>();

  for (const finding of classifyPortableAssetTargets(content)) {
    if (finding.asset.kind !== 'skill') continue;
    const targetSkill = finding.asset.name;
    // A read that names the authoring asset's own skill travels with the
    // bundle, so it is a local read rather than a cross-skill dependency.
    if (targetSkill === owner) continue;
    const targetPath = finding.target.slice(
      finding.target.lastIndexOf(`${targetSkill}/`) + targetSkill.length + 1,
    );
    targets.set(`${targetSkill}/${targetPath}`, { targetSkill, targetPath });
  }

  return [...targets.values()].sort(compareCrossSkillTargets);
}

function collectBareCrossSkillTargets(
  content: string,
  owner: string,
): string[] {
  return [
    ...new Set(
      collectCrossSkillTargets(content, owner).map(
        ({ targetSkill }) => targetSkill,
      ),
    ),
  ].sort();
}

/**
 * Derive the user-default skill and agent asset surface from a pack manifest.
 * Coverage follows the manifest rather than a hand-curated skill list, so a new
 * user-default asset is scanned the moment it ships.
 */
function selectUserDefaultAssetRefs(
  manifest: readonly PackDefinition[],
): { kind: 'skill' | 'agent'; name: string }[] {
  const refs = new Map<string, { kind: 'skill' | 'agent'; name: string }>();

  for (const pack of manifest) {
    if (pack.defaultScope !== 'user') continue;

    for (const asset of pack.assets) {
      if (asset.kind === 'skill') {
        refs.set(asset.id, {
          kind: 'skill',
          name: asset.id.slice('skill:'.length),
        });
      } else if (asset.kind === 'agent') {
        refs.set(asset.id, {
          kind: 'agent',
          name: asset.id.slice('agent:'.length).replace(/\.md$/, ''),
        });
      }
    }
  }

  return [...refs.values()].sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.name.localeCompare(right.name),
  );
}

function collectUserDefaultMarkdownAssets(
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): MarkdownAsset[] {
  const assets: MarkdownAsset[] = [];

  for (const ref of selectUserDefaultAssetRefs(manifest)) {
    if (ref.kind === 'skill') {
      const skillDir = join(SKILLS_DIR, ref.name);
      if (!existsSync(skillDir)) continue;
      assets.push({
        kind: 'skill',
        owner: ref.name,
        files: listAuthoredMarkdown(skillDir),
      });
      continue;
    }

    const agentFile = join(AGENTS_DIR, `${ref.name}.md`);
    if (!existsSync(agentFile)) continue;
    assets.push({ kind: 'agent', owner: ref.name, files: [agentFile] });
  }

  return assets;
}

function collectCrossSkillReferencesForAsset(
  asset: MarkdownAsset,
  relativeRoot: string,
): CrossSkillReference[] {
  const references: CrossSkillReference[] = [];

  for (const file of asset.files) {
    const relFile = file.slice(relativeRoot.length + 1);
    for (const { targetSkill, targetPath } of collectCrossSkillTargets(
      readFileSync(file, 'utf8'),
      asset.owner,
    )) {
      references.push({ file: relFile, targetSkill, targetPath });
    }
  }

  return references;
}

function collectUserDefaultCrossSkillReferences(): CrossSkillReference[] {
  return collectUserDefaultMarkdownAssets()
    .flatMap((asset) => collectCrossSkillReferencesForAsset(asset, REPO_ROOT))
    .sort(compareCrossSkillReferences);
}

// Non-executable evidence only. Each entry is pinned by source file, target
// skill, and target path so it can never widen into a wildcard allowance.
const PINNED_HISTORICAL_CROSS_SKILL_READS: readonly CrossSkillReference[] = [
  // Historical dogfood evidence records the paths exercised at that time.
  ...[
    'oat-idea-ideate',
    'oat-idea-new',
    'oat-idea-summarize',
    'oat-pjm-add-backlog-item',
    'oat-project-new',
  ].map((targetSkill) => ({
    file: '.agents/skills/oat-brainstorm/references/dogfood-results.md',
    targetSkill,
    targetPath: 'SKILL.md',
  })),
  // The mini-wave fixture documents the canonical path promoted by its test.
  {
    file: '.agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md',
    targetSkill: 'oat-wave-program',
    targetPath: 'SKILL.md',
  },
];

describe('skills bundled docs contract', () => {
  it('no shipped skill references a shared .agents/docs/ doc that does not travel with it', () => {
    const violations = collectViolations();

    // A reference to `.agents/docs/<doc>.md` resolves inside this monorepo but
    // dangles once the skill is installed standalone, since `.agents/docs/` is
    // not part of the skill bundle. Fix by vendoring the doc via symlink into
    // the skill's `references/docs/` and pointing at that bundled path, or — if
    // the reference is intentionally monorepo-internal — annotate the line with
    // a "monorepo only" marker.
    const detail = violations
      .map((v) => `  ${v.file} -> .agents/docs/${v.doc}\n    ${v.line}`)
      .join('\n');

    expect(
      violations,
      `Skill(s) reference a shared doc that won't ship with the bundle:\n${detail}`,
    ).toEqual([]);
  });

  it('does not add bare repo-relative cross-skill reads to user-default packs', () => {
    // A skill or agent in a pack that defaults to user scope is normally
    // installed under `~/.agents/`, so a repo-relative
    // `.agents/skills/<name>/…` read — or a `../<name>/…` hop out of the
    // authoring skill directory — dangles: neither path exists on a default
    // install. Executable reads must bind an installed root instead.
    //
    // The accepted set is exactly the historical evidence, pinned by source
    // file, target skill, and target path, so no new file or target inherits
    // an exemption. There is no migration allowlist: executable debt is fixed
    // at the caller, never parked in a temporary inventory.
    const found = collectUserDefaultCrossSkillReferences();
    const detail = found
      .map(
        ({ file, targetSkill, targetPath }) =>
          `  ${file} -> ${targetSkill}/${targetPath}`,
      )
      .join('\n');

    expect(
      found,
      `Repo-relative cross-skill reads changed; resolve executable reads from the installed scope and baseline only exact historical evidence:\n${detail}`,
    ).toEqual(
      [...PINNED_HISTORICAL_CROSS_SKILL_READS].sort(
        compareCrossSkillReferences,
      ),
    );
  });

  it('leaves zero executable cross-skill debt in user-default assets', () => {
    // Applying only the exact historical/self-reference classification must
    // leave the manifest-derived executable finding set empty.
    const historical = new Set(
      PINNED_HISTORICAL_CROSS_SKILL_READS.map(crossSkillReferenceKey),
    );
    const executable = collectUserDefaultCrossSkillReferences().filter(
      (reference) => !historical.has(crossSkillReferenceKey(reference)),
    );
    const detail = executable
      .map(
        ({ file, targetSkill, targetPath }) =>
          `  ${file} -> ${targetSkill}/${targetPath}`,
      )
      .join('\n');

    expect(
      executable,
      `Executable cross-skill debt must be fixed at the caller, not baselined:\n${detail}`,
    ).toEqual([]);
    // Every pinned entry must still describe a real, non-executable read.
    expect(
      PINNED_HISTORICAL_CROSS_SKILL_READS.every(
        ({ file }) =>
          file.includes('/references/dogfood-results.md') ||
          file.includes('/tests/'),
      ),
      'Historical evidence stays limited to dogfood records and test fixtures',
    ).toBe(true);
  });

  it.each([
    [
      'canonical repo-relative skill',
      'Read `.agents/skills/oat-dispatch-subagents/SKILL.md`.',
      [
        {
          asset: { kind: 'skill', name: 'oat-dispatch-subagents' },
          evidence: '.agents/skills/oat-dispatch-subagents/SKILL.md',
          target: '.agents/skills/oat-dispatch-subagents/SKILL.md',
        },
      ],
    ],
    [
      'canonical repo-relative agent',
      'Read `.agents/agents/oat-reviewer.md`.',
      [
        {
          asset: { kind: 'agent', name: 'oat-reviewer' },
          evidence: '.agents/agents/oat-reviewer.md',
          target: '.agents/agents/oat-reviewer.md',
        },
      ],
    ],
    [
      'dot-relative canonical agent',
      'Read `./.agents/agents/oat-reviewer.md`.',
      [
        {
          asset: { kind: 'agent', name: 'oat-reviewer' },
          evidence: './.agents/agents/oat-reviewer.md',
          target: './.agents/agents/oat-reviewer.md',
        },
      ],
    ],
    [
      'repeated-parent canonical agent hop',
      'Read `../../agents/oat-reviewer.md`.',
      [
        {
          asset: { kind: 'agent', name: 'oat-reviewer' },
          evidence: '../../agents/oat-reviewer.md',
          target: '../../agents/oat-reviewer.md',
        },
      ],
    ],
    [
      'portable provider root',
      'Read `${AGENT_PROVIDER_ROOT}/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'canonical user root',
      'Read `${HOME}/.agents/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'canonical repository root',
      'Read `<repo-root>/.agents/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'Claude provider view',
      'Claude exposes `.claude/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'Cursor provider view',
      'Cursor exposes `.cursor/agents/oat-reviewer.md`.',
      [],
    ],
    [
      'suffixed provider variant',
      'Read `.cursor/agents/oat-reviewer-gpt-5-6-sol-medium.md`.',
      [],
    ],
    ['Codex TOML variant', 'Read `.codex/agents/oat-reviewer.toml`.', []],
    ['unanchored prose', 'The canonical role is agents/oat-reviewer.md.', []],
  ])('classifies %s portable asset syntax', (_name, content, expected) => {
    expect(classifyPortableAssetTargets(content as string)).toEqual(expected);
  });

  it.each([
    [
      'backticked SKILL.md',
      'Read `.agents/skills/sibling/SKILL.md`.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'plain text SKILL.md',
      'Read .agents/skills/sibling/SKILL.md next.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'dot-relative path',
      'Read ./.agents/skills/sibling/SKILL.md next.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'parent-relative path',
      'Read ../.agents/skills/sibling/SKILL.md next.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'Markdown link',
      'Read [the sibling contract](.agents/skills/sibling/SKILL.md).',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'parent-relative sibling hop',
      'Read `../sibling/SKILL.md` before dispatch.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      // The spelling a scanned `references/<doc>.md` file would actually use.
      'two-level parent-relative sibling hop',
      'Read `../../sibling/SKILL.md` before dispatch.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'two-level parent-relative reference file',
      'Read `../../sibling/references/schema-base.md`.',
      [{ targetSkill: 'sibling', targetPath: 'references/schema-base.md' }],
    ],
    [
      'two-level parent-relative reference directory',
      'Pick one file from `../../sibling/references/`.',
      [{ targetSkill: 'sibling', targetPath: 'references/' }],
    ],
    [
      'two-level dot-relative path',
      'Read `../../.agents/skills/sibling/SKILL.md`.',
      [{ targetSkill: 'sibling', targetPath: 'SKILL.md' }],
    ],
    [
      'reference file',
      'Read `.agents/skills/sibling/references/schema-base.md`.',
      [{ targetSkill: 'sibling', targetPath: 'references/schema-base.md' }],
    ],
    [
      'parent-relative reference file',
      'Read `../sibling/references/schema-base.md`.',
      [{ targetSkill: 'sibling', targetPath: 'references/schema-base.md' }],
    ],
    [
      'Markdown-linked reference file',
      'See [the schema](../sibling/references/schema-base.md).',
      [{ targetSkill: 'sibling', targetPath: 'references/schema-base.md' }],
    ],
    [
      'reference directory with trailing slash',
      'Pick one file from `.agents/skills/sibling/references/`.',
      [{ targetSkill: 'sibling', targetPath: 'references/' }],
    ],
    [
      'reference directory without trailing slash',
      'Pick one file from `.agents/skills/sibling/references`.',
      [{ targetSkill: 'sibling', targetPath: 'references' }],
    ],
    [
      'nested reference directory',
      'Copy the templates in `.agents/skills/sibling/references/templates/`.',
      [{ targetSkill: 'sibling', targetPath: 'references/templates/' }],
    ],
    [
      'parent-relative reference directory',
      'Pick the mechanics reference from `../sibling/references/`.',
      [{ targetSkill: 'sibling', targetPath: 'references/' }],
    ],
    ['portable skills root', 'Read `${SKILLS_ROOT}/sibling/SKILL.md`.', []],
    [
      // The lookbehind must keep holding once repeated segments are allowed.
      'portable loaded-skill root hop',
      'Read `${SKILL_DIR}/../sibling/SKILL.md`.',
      [],
    ],
    [
      'portable loaded-skill root two-level hop',
      'Read `${SKILL_DIR}/../../sibling/SKILL.md`.',
      [],
    ],
    [
      'unrelated repeated parent path',
      'See `../../roadmap.md` and `../../../../docs/skills-guide.md`.',
      [],
    ],
    [
      'portable reference read',
      'Read `${DISPATCH_SKILLS_ROOT}/sibling/references/schema-base.md`.',
      [],
    ],
    [
      'user-scope absolute path',
      'Read `${HOME}/.agents/skills/sibling/SKILL.md`.',
      [],
    ],
    [
      'short-form follow-on read',
      'Then read `sibling/references/provider-codex.md` under that bound root.',
      [],
    ],
    ['same-owner local reference', 'Read `references/audit-playbook.md`.', []],
    ['self-reference SKILL.md', 'Read `.agents/skills/source/SKILL.md`.', []],
    [
      'self-reference file',
      'Read `.agents/skills/source/references/plan-template.md`.',
      [],
    ],
  ])('matches %s cross-skill syntax', (_name, content, expected) => {
    expect(collectCrossSkillTargets(content as string, 'source')).toEqual(
      expected,
    );
  });

  it('derives the scanned surface from user-default manifest packs', () => {
    const bothScopes = ['project', 'user'] as const;
    const asset = (id: string, kind: 'skill' | 'agent' | 'template') => ({
      id,
      kind,
      destination: `.agents/${id}`,
      scopes: bothScopes,
      ownership: { project: 'managed', user: 'managed' } as const,
    });
    const manifestFixture: readonly PackDefinition[] = [
      {
        name: 'utility',
        allowedScopes: bothScopes,
        defaultScope: 'user',
        assets: [
          asset('skill:user-default-skill', 'skill'),
          asset('agent:user-default-agent.md', 'agent'),
          asset('template:ignored.md', 'template'),
        ],
      },
      {
        name: 'research',
        allowedScopes: bothScopes,
        defaultScope: 'project',
        assets: [
          asset('skill:project-default-skill', 'skill'),
          asset('agent:project-default-agent.md', 'agent'),
        ],
      },
    ];

    expect(selectUserDefaultAssetRefs(manifestFixture)).toEqual([
      { kind: 'agent', name: 'user-default-agent' },
      { kind: 'skill', name: 'user-default-skill' },
    ]);
  });

  it('scans user-default agent assets alongside user-default skills', () => {
    expect(selectUserDefaultAssetRefs(PACK_MANIFEST)).toEqual(
      expect.arrayContaining([
        { kind: 'agent', name: 'oat-codebase-mapper' },
        { kind: 'agent', name: 'oat-phase-implementer' },
        { kind: 'agent', name: 'oat-reviewer' },
        { kind: 'skill', name: 'oat-dispatch-subagents' },
      ]),
    );

    const scanned = collectUserDefaultMarkdownAssets().map(
      ({ kind, owner }) => `${kind}:${owner}`,
    );

    expect(scanned).toEqual(
      expect.arrayContaining([
        'agent:oat-codebase-mapper',
        'agent:oat-phase-implementer',
        'agent:oat-reviewer',
        'skill:oat-dispatch-subagents',
      ]),
    );
    // Skills that ship in no user-default pack stay outside the rule.
    expect(scanned).not.toContain('skill:codex-skill');
    expect(scanned).not.toContain('skill:create-oat-skill');
  });

  it('proves the manifest-derived user-default surface covers every canonical agent', () => {
    const canonicalAgents = readdirSync(AGENTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.slice(0, -'.md'.length))
      .sort();
    const manifestAgents = collectUserDefaultMarkdownAssets()
      .filter((asset) => asset.kind === 'agent')
      .map((asset) => asset.owner)
      .sort();

    expect(manifestAgents).toEqual(canonicalAgents);
  });

  it('skips only the materialized references/docs subtree', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'oat-authored-markdown-'));
    const materializedDocsDir = join(fixtureRoot, 'references', 'docs');
    const authoredReference = join(
      fixtureRoot,
      'references',
      'docs-root-resolution.md',
    );
    const nestedAuthoredDir = join(
      fixtureRoot,
      'examples',
      'references',
      'docs',
    );
    const nestedAuthoredReference = join(nestedAuthoredDir, 'authored.md');

    try {
      mkdirSync(materializedDocsDir, { recursive: true });
      mkdirSync(nestedAuthoredDir, { recursive: true });
      writeFileSync(join(materializedDocsDir, 'shared.md'), '# Shared copy\n');
      writeFileSync(authoredReference, '# Authored reference\n');
      writeFileSync(
        nestedAuthoredReference,
        'Read `.agents/skills/sibling/SKILL.md`.\n',
      );

      expect(listAuthoredMarkdown(fixtureRoot)).toHaveLength(2);
      expect(listAuthoredMarkdown(fixtureRoot)).toEqual(
        expect.arrayContaining([authoredReference, nestedAuthoredReference]),
      );
      expect(
        collectCrossSkillReferencesForAsset(
          {
            kind: 'skill',
            owner: 'source',
            files: listAuthoredMarkdown(fixtureRoot),
          },
          fixtureRoot,
        ),
      ).toEqual([
        {
          file: 'examples/references/docs/authored.md',
          targetSkill: 'sibling',
          targetPath: 'SKILL.md',
        },
      ]);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it.each(['oat-idea-ideate', 'oat-idea-new', 'oat-idea-summarize'])(
    '%s resolves chained idea skills from its installed scope',
    (skill) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

      expectPortableSkillsRootCandidateOrder(content, skill);
      expect(content).toContain('Probe each candidate for `<name>/SKILL.md`');
      expect(content).toContain(
        'stop the current branch instead of improvising its process',
      );
      expect(content).toContain(
        'oat tools install ideas --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack ideas --scope <user|project>',
      );
      expect(collectBareCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

  it('maps brainstorm sibling recovery to the owning pack', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-brainstorm', 'SKILL.md'),
      'utf8',
    );

    expect(content).toContain('`ideas` for `oat-idea-*`');
    expect(content).toContain('`project-management` for `oat-pjm-*`');
    expect(content).toContain('`workflows` for `oat-project-*`');
    expect(content).toContain(
      'oat tools install <pack> --scope <user|project>',
    );
    expect(content).toContain(
      'oat tools update --pack <pack> --scope <user|project>',
    );
  });

  it('ships the portable brainstorm summarize handoff in the bundled copy', () => {
    const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-portable-assets-'));

    try {
      execFileSync('bash', [BUNDLE_ASSETS_SCRIPT], {
        env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
        stdio: 'pipe',
      });
      const bundledDestination = readFileSync(
        join(
          assetsRoot,
          'skills',
          'oat-brainstorm',
          'references',
          'destinations.md',
        ),
        'utf8',
      );

      expect(bundledDestination).toContain(
        '`${SKILLS_ROOT}/oat-idea-new/SKILL.md`',
      );
      expect(bundledDestination).toContain(
        '`${SKILLS_ROOT}/oat-idea-summarize/SKILL.md`',
      );
      expect(
        collectBareCrossSkillTargets(bundledDestination, 'oat-brainstorm'),
      ).toEqual([]);
    } finally {
      rmSync(assetsRoot, { recursive: true, force: true });
    }
  }, 15_000);

  it('ships portable sibling reads in the bundled skill and agent copies', () => {
    const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-portable-bundle-'));
    const bundledSkills = [
      [
        'oat-dispatch-subagents',
        '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
        'utility',
      ],
      [
        'oat-repo-improve',
        '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
        'utility',
      ],
      [
        'oat-review-provide-remote',
        '${REVIEW_PROVIDE_SKILLS_ROOT}/oat-review-provide/references/review-artifact-template.md',
        'utility',
      ],
      [
        'oat-project-review-provide',
        '${REVIEW_PROVIDE_SKILLS_ROOT}/oat-review-provide/references/review-artifact-template.md',
        'utility',
      ],
      [
        'analyze',
        '${RESEARCH_SKILLS_ROOT}/deep-research/references/schema-base.md',
        'research',
      ],
      [
        'compare',
        '${RESEARCH_SKILLS_ROOT}/deep-research/references/schema-comparative.md',
        'research',
      ],
    ] as const;
    const bundledAgents = [
      [
        'oat-phase-implementer',
        '${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md',
        'workflows',
      ],
      [
        'oat-reviewer',
        '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
        'utility',
      ],
      [
        'oat-codebase-mapper',
        '${KNOWLEDGE_INDEX_SKILLS_ROOT}/oat-repo-knowledge-index/references/templates/',
        'workflows',
      ],
    ] as const;

    try {
      execFileSync('bash', [BUNDLE_ASSETS_SCRIPT], {
        env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
        stdio: 'pipe',
      });

      for (const [skill, exactTarget, pack] of bundledSkills) {
        const content = readFileSync(
          join(assetsRoot, 'skills', skill, 'SKILL.md'),
          'utf8',
        );

        expectPortableSkillsRootCandidateOrder(content, `bundled ${skill}`);
        expect(content, `bundled ${skill} exact target`).toContain(exactTarget);
        expect(content, `bundled ${skill} recovery`).toContain(
          `oat tools install ${pack} --scope <user|project>`,
        );
        expect(collectCrossSkillTargets(content, skill)).toEqual([]);
      }

      for (const [agent, exactTarget, pack] of bundledAgents) {
        const content = readFileSync(
          join(assetsRoot, 'agents', `${agent}.md`),
          'utf8',
        );

        expectPortableAgentSkillsRootCandidateOrder(
          content,
          `bundled ${agent}`,
        );
        expect(content, `bundled ${agent} exact target`).toContain(exactTarget);
        expect(content, `bundled ${agent} recovery`).toContain(
          `oat tools install ${pack} --scope <user|project>`,
        );
        expect(collectCrossSkillTargets(content, agent)).toEqual([]);
      }
    } finally {
      rmSync(assetsRoot, { recursive: true, force: true });
    }
  }, 30_000);

  it.each([
    [
      'oat-project-implement',
      'stop every implementation, fix, or reviewer\ndispatch',
    ],
    [
      'oat-project-plan-writing',
      'Stop before the artifact self-review dispatch',
    ],
  ])(
    '%s resolves both dispatch contracts before dispatch',
    (skill, stopText) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
      const projectDispatchRead =
        skill === 'oat-project-implement'
          ? '`${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`'
          : '`${SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`';
      const sharedDispatchRead =
        skill === 'oat-project-implement'
          ? '`${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`'
          : '`${SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`';

      expectPortableSkillsRootCandidateOrder(content, skill);
      expect(content).toContain('`<name>/SKILL.md`');
      expect(content).toContain(stopText);
      expect(content).toMatch(
        /never ambient\s+discovery|Do not fall back to ambient skill\s+discovery/,
      );
      expect(content).toContain(
        'oat tools install workflows --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack workflows --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools install utility --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack utility --scope <user|project>',
      );
      expect(content.indexOf(projectDispatchRead)).toBeLessThan(
        content.indexOf(sharedDispatchRead),
      );
      expect(collectBareCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

  it('preserves launch notices and effective-target disclosure', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-project-implement', 'SKILL.md'),
      'utf8',
    );

    expect(content).toContain(
      'Display structured resolver notices before every implementation, fix, or reviewer launch',
    );
    expect(content).toContain('uses the effective resolved target');
    expect(content).toContain('never the bundled recommendation version');
    expect(content).toContain(
      'the named `provider-cursor.md`, `provider-codex.md`, or',
    );
    expect(content.indexOf('active-provider selection')).toBeLessThan(
      content.indexOf('matching mechanics reference'),
    );
  });

  it('resolves implementation dispatch dependencies independently', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-project-implement', 'SKILL.md'),
      'utf8',
    );
    const bindings = [
      [
        'PROJECT_DISPATCH_SKILLS_ROOT',
        'oat-project-dispatch-subagents/SKILL.md',
      ],
      ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/SKILL.md'],
      [
        'ORCHESTRATION_SKILLS_ROOT',
        'subagent-orchestration/references/model-selection-principles.md',
      ],
    ] as const;

    expect(content).toContain('independently probe each required');
    for (const [root, path] of bindings) {
      expect(content).toContain(`\${${root}}`);
      expect(content).toContain(`\${${root}}/${path}`);
    }
    expect(content).toContain(
      '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/references/',
    );
    expect(content).not.toMatch(
      /\$\{SKILLS_ROOT\}\/(?:oat-project-dispatch-subagents|oat-dispatch-subagents|subagent-orchestration)/,
    );
  });

  it.each([
    [
      'oat-dispatch-subagents',
      [
        [
          'ORCHESTRATION_SKILLS_ROOT',
          'subagent-orchestration/references/model-selection-principles.md',
        ],
      ],
      'stop class-constrained dispatch',
    ],
    [
      'oat-repo-improve',
      [
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/SKILL.md'],
        [
          'ORCHESTRATION_SKILLS_ROOT',
          'subagent-orchestration/references/model-selection-principles.md',
        ],
      ],
      'stop delegated reconnaissance',
    ],
    [
      'oat-review-provide-remote',
      [
        [
          'REVIEW_PROVIDE_SKILLS_ROOT',
          'oat-review-provide/references/review-artifact-template.md',
        ],
      ],
      'stop the review instead of improvising a checklist',
    ],
  ] as const)(
    '%s resolves its utility siblings from the installed skill scope',
    (skill, bindings, stopText) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

      // Loaded-skill candidate order: loaded scope, then user, then project.
      expectPortableSkillsRootCandidateOrder(content, skill);
      expect(content).toContain('`<name>/SKILL.md`');
      expect(content).toContain('never ambient discovery');
      expect(content).toContain(stopText);
      // Every dependency binds its own root, so mixed-scope installs work.
      expect(content).toMatch(/[Ii]ndependently probe\s+each required/);
      for (const [root, path] of bindings) {
        expect(content, `${skill} binds \${${root}}`).toContain(`\${${root}}`);
        // The exact target is validated, not merely the root.
        expect(content, `${skill} reads \${${root}}/${path}`).toContain(
          `\${${root}}/${path}`,
        );
      }
      // Fail closed with owning-pack recovery for the intended scope.
      expect(content).toContain(
        'oat tools install utility --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack utility --scope <user|project>',
      );
      expect(collectCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

  it.each([
    ['analyze', ['references/schema-base.md', 'references/schema-analysis.md']],
    ['compare', ['references/schema-comparative.md']],
  ] as const)(
    '%s resolves deep-research schemas from the installed skill scope',
    (skill, schemas) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

      expectPortableSkillsRootCandidateOrder(content, skill);
      expect(content).toContain('`<name>/SKILL.md`');
      expect(content).toMatch(/[Ii]ndependently probe\s+each required/);
      expect(content).toContain('never ambient discovery');
      // Fail closed rather than inventing a report schema.
      expect(content).toContain(
        'stop before writing the artifact instead of inventing a schema',
      );
      for (const schema of schemas) {
        // The exact target is validated, not merely the resolved root.
        expect(content, `${skill} reads ${schema}`).toContain(
          `\${RESEARCH_SKILLS_ROOT}/deep-research/${schema}`,
        );
      }
      expect(content).toContain(
        'oat tools install research --scope <user|project>',
      );
      expect(content).toContain(
        'oat tools update --pack research --scope <user|project>',
      );
      expect(collectCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

  it('oat-project-review-provide resolves the utility review template portably', () => {
    const skill = 'oat-project-review-provide';
    const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

    expectPortableSkillsRootCandidateOrder(content, skill);
    expect(content).toContain('`<name>/SKILL.md`');
    expect(content).toMatch(/[Ii]ndependently probe\s+each required/);
    expect(content).toMatch(/never ambient\s+discovery/);
    // The exact companion template is bound, not just its owning root.
    expect(content).toContain(
      '${REVIEW_PROVIDE_SKILLS_ROOT}/oat-review-provide/references/review-artifact-template.md',
    );
    // The companion is optional context, so a miss must not silently swap in an
    // improvised format for the project review output.
    expect(content).toMatch(
      /without substituting an improvised companion\s+format/,
    );
    expect(content).toContain(
      'oat tools install utility --scope <user|project>',
    );
    expect(content).toContain(
      'oat tools update --pack utility --scope <user|project>',
    );
    expect(collectCrossSkillTargets(content, skill)).toEqual([]);
  });

  it.each([
    [
      'oat-phase-implementer',
      [
        [
          'PROJECT_DISPATCH_SKILLS_ROOT',
          'oat-project-dispatch-subagents/SKILL.md',
        ],
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/SKILL.md'],
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/references/'],
        [
          'ORCHESTRATION_SKILLS_ROOT',
          'subagent-orchestration/references/model-selection-principles.md',
        ],
        ['ORCHESTRATION_SKILLS_ROOT', 'subagent-orchestration/references/'],
      ],
      ['workflows', 'utility'],
      'stop the optional launch and implement the task directly',
    ],
    [
      'oat-reviewer',
      [
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/SKILL.md'],
        ['DISPATCH_SKILLS_ROOT', 'oat-dispatch-subagents/references/'],
        [
          'ORCHESTRATION_SKILLS_ROOT',
          'subagent-orchestration/references/model-selection-principles.md',
        ],
        ['ORCHESTRATION_SKILLS_ROOT', 'subagent-orchestration/references/'],
      ],
      ['utility'],
      'stop the reconnaissance launch and review inline',
    ],
    [
      'oat-codebase-mapper',
      [
        [
          'KNOWLEDGE_INDEX_SKILLS_ROOT',
          'oat-repo-knowledge-index/references/templates/',
        ],
      ],
      ['workflows'],
      'stop before writing any document instead of inventing a format',
    ],
  ] as const)(
    '%s resolves sibling skills from user then project scope',
    (agent, bindings, packs, stopText) => {
      const content = readFileSync(join(AGENTS_DIR, `${agent}.md`), 'utf8');

      expectPortableAgentSkillsRootCandidateOrder(content, agent);
      expect(content).toContain('`<name>/SKILL.md`');
      expect(content).toMatch(/[Ii]ndependently probe each required/);
      expect(content).toContain('never ambient discovery');
      expect(content).toContain(stopText);
      for (const [root, path] of bindings) {
        // Independent roots keep mixed-scope installs resolvable, and the exact
        // target is validated rather than only its containing root.
        expect(content, `${agent} reads \${${root}}/${path}`).toContain(
          `\${${root}}/${path}`,
        );
      }
      for (const pack of packs) {
        expect(content, `${agent} ${pack} install recovery`).toContain(
          `oat tools install ${pack} --scope <user|project>`,
        );
        expect(content, `${agent} ${pack} update recovery`).toContain(
          `oat tools update --pack ${pack} --scope <user|project>`,
        );
      }
      // No executable bare agent read survives.
      expect(collectCrossSkillTargets(content, agent)).toEqual([]);
      expect(content).not.toMatch(
        /\$\{SKILLS_ROOT\}\/(?:oat-project-dispatch-subagents|oat-dispatch-subagents|subagent-orchestration|oat-repo-knowledge-index)/,
      );
    },
  );

  it('binds repo-improve dispatch and orchestration references independently', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-repo-improve', 'SKILL.md'),
      'utf8',
    );

    expect(content).toContain(
      '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/',
    );
    expect(content).toContain(
      '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/references/',
    );
    // A single shared root would silently break a mixed-scope install.
    expect(content).not.toMatch(
      /\$\{SKILLS_ROOT\}\/(?:oat-dispatch-subagents|subagent-orchestration)/,
    );
  });

  it('anchors dispatch short-form provider reads to an already bound root', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'oat-dispatch-subagents', 'SKILL.md'),
      'utf8',
    );
    const anchor = content.indexOf(
      '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
    );

    expect(anchor).toBeGreaterThan(-1);
    expect(content).toMatch(
      /short-form paths below are relative to those two already-bound\s+roots/,
    );
    // Short-form follow-on reads must come after the anchoring bound read.
    for (const shortForm of [
      'subagent-orchestration/references/provider-claude.md',
      'subagent-orchestration/references/provider-codex.md',
      'subagent-orchestration/references/provider-cursor.md',
      'subagent-orchestration/references/evidence-and-refresh.md',
    ]) {
      expect(content.indexOf(shortForm), shortForm).toBeGreaterThan(anchor);
    }
  });

  it('resolves shared tracking scripts from each loaded skill scope', () => {
    const consumers: string[] = [];
    const bareReferences: string[] = [];

    for (const skill of listSkillDirs()) {
      const skillFile = join(SKILLS_DIR, skill, 'SKILL.md');
      const content = readFileSync(skillFile, 'utf8');
      if (!content.includes('resolve-tracking.sh')) continue;
      consumers.push(skill);
      if (
        content.includes('TRACKING_SCRIPT=".oat/scripts/resolve-tracking.sh"')
      ) {
        bareReferences.push(skill);
      }
      const loadedSkillDir =
        skill === 'oat-agent-instructions-apply'
          ? 'APPLY_SKILL_DIR'
          : 'SKILL_DIR';
      expect(content, skill).toContain(
        `SCOPE_ROOT="$(cd "$${loadedSkillDir}/../../.." && pwd)"`,
      );
      expect(content, skill).toContain(
        'TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh"',
      );
    }

    expect(consumers).toEqual(
      expect.arrayContaining([
        'oat-docs-analyze',
        'oat-docs-apply',
        'oat-agent-instructions-analyze',
        'oat-agent-instructions-apply',
        'oat-repo-knowledge-index',
      ]),
    );
    expect(bareReferences).toEqual([]);
  });

  it('resolves only exact canonical agent targets across provider layouts', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'oat-agent-provider-root-'));
    const userScope = join(fixtureRoot, 'user');
    const projectScope = join(fixtureRoot, 'project');
    const canonicalName = 'oat-reviewer';
    const canonicalRelative = join('agents', `${canonicalName}.md`);

    try {
      const userCanonical = join(userScope, '.agents', canonicalRelative);
      const projectCanonical = join(projectScope, '.agents', canonicalRelative);
      const canonicalSkillDir = join(
        userScope,
        '.agents',
        'skills',
        'consumer',
      );
      const claudeSkillDir = join(userScope, '.claude', 'skills', 'consumer');
      const claudeAgent = join(userScope, '.claude', canonicalRelative);
      const cursorSkillDir = join(userScope, '.cursor', 'skills', 'consumer');
      const cursorAgent = join(userScope, '.cursor', canonicalRelative);

      mkdirSync(join(userCanonical, '..'), { recursive: true });
      mkdirSync(join(projectCanonical, '..'), { recursive: true });
      mkdirSync(canonicalSkillDir, { recursive: true });
      mkdirSync(join(claudeSkillDir, '..'), { recursive: true });
      mkdirSync(join(claudeAgent, '..'), { recursive: true });
      mkdirSync(cursorSkillDir, { recursive: true });
      mkdirSync(join(cursorAgent, '..'), { recursive: true });
      writeFileSync(userCanonical, '# User canonical\n');
      writeFileSync(projectCanonical, '# Project canonical\n');
      symlinkSync(canonicalSkillDir, claudeSkillDir, 'dir');
      symlinkSync(userCanonical, claudeAgent);
      symlinkSync(userCanonical, cursorAgent);

      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName,
          skillDir: claudeSkillDir,
          userCanonicalRoot: join(userScope, '.agents'),
          projectCanonicalRoot: join(projectScope, '.agents'),
        }),
      ).toEqual(
        expect.objectContaining({
          status: 'resolved',
          tier: 'loaded',
          providerRoot: join(userScope, '.claude'),
          selectedFile: claudeAgent,
          canonicalFile: userCanonical,
          validation: 'exact-canonical-symlink',
        }),
      );

      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName,
          skillDir: cursorSkillDir,
          userCanonicalRoot: join(userScope, '.agents'),
          projectCanonicalRoot: join(projectScope, '.agents'),
        }),
      ).toEqual(
        expect.objectContaining({
          status: 'resolved',
          tier: 'loaded',
          providerRoot: join(userScope, '.cursor'),
          selectedFile: cursorAgent,
          canonicalFile: userCanonical,
          validation: 'exact-canonical-symlink',
        }),
      );

      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName,
          skillDir: realpathSync(claudeSkillDir),
          userCanonicalRoot: join(userScope, '.agents'),
          projectCanonicalRoot: join(projectScope, '.agents'),
        }),
      ).toEqual(
        expect.objectContaining({
          status: 'resolved',
          tier: 'loaded',
          providerRoot: realpathSync(join(userScope, '.agents')),
          selectedFile: realpathSync(userCanonical),
          validation: 'direct-canonical',
        }),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('continues past copies, variants, TOML, and unsafe loaded targets', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'oat-agent-misses-'));
    const canonicalName = 'oat-reviewer';

    try {
      const userCanonicalRoot = join(fixtureRoot, 'user', '.agents');
      const projectCanonicalRoot = join(fixtureRoot, 'project', '.agents');
      const cursorRoot = join(fixtureRoot, 'loaded', '.cursor');
      const cursorSkillDir = join(cursorRoot, 'skills', 'consumer');
      const cursorAgentDir = join(cursorRoot, 'agents');
      const userCanonical = join(
        userCanonicalRoot,
        'agents',
        `${canonicalName}.md`,
      );

      mkdirSync(cursorSkillDir, { recursive: true });
      mkdirSync(cursorAgentDir, { recursive: true });
      mkdirSync(join(userCanonical, '..'), { recursive: true });
      writeFileSync(userCanonical, '# Canonical bytes\n');
      writeFileSync(
        join(cursorAgentDir, `${canonicalName}.md`),
        '# Canonical bytes\n',
      );
      writeFileSync(
        join(cursorAgentDir, `${canonicalName}-gpt-5-6-sol-medium.md`),
        '# Variant\n',
      );
      mkdirSync(join(cursorRoot, '..', '.codex', 'agents'), {
        recursive: true,
      });
      writeFileSync(
        join(cursorRoot, '..', '.codex', 'agents', `${canonicalName}.toml`),
        'developer_instructions = "transformed"\n',
      );

      const copyMiss = resolveCanonicalAgentTarget({
        dependency: 'workflows',
        canonicalName,
        skillDir: cursorSkillDir,
        userCanonicalRoot,
        projectCanonicalRoot,
      });
      expect(copyMiss).toEqual(
        expect.objectContaining({ status: 'resolved', tier: 'user' }),
      );
      expect(copyMiss.attempts).toEqual([
        expect.objectContaining({
          tier: 'loaded',
          outcome: 'noncanonical-copy',
        }),
      ]);

      const codexRoot = join(fixtureRoot, 'codex', '.codex');
      const codexSkillDir = join(codexRoot, 'skills', 'consumer');
      const codexAgentDir = join(codexRoot, 'agents');
      mkdirSync(codexSkillDir, { recursive: true });
      mkdirSync(codexAgentDir, { recursive: true });
      writeFileSync(
        join(codexAgentDir, `${canonicalName}.md`),
        '# Transformed Markdown copy\n',
      );
      writeFileSync(
        join(codexAgentDir, `${canonicalName}.toml`),
        'developer_instructions = "transformed"\n',
      );
      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName,
          skillDir: codexSkillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).attempts,
      ).toEqual([
        expect.objectContaining({
          tier: 'loaded',
          outcome: 'noncanonical-copy',
        }),
      ]);
      rmSync(join(codexAgentDir, `${canonicalName}.md`));
      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName,
          skillDir: codexSkillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).attempts,
      ).toEqual([
        expect.objectContaining({ tier: 'loaded', outcome: 'missing' }),
      ]);

      rmSync(join(cursorAgentDir, `${canonicalName}.md`));
      symlinkSync(
        join(fixtureRoot, 'outside.md'),
        join(cursorAgentDir, `${canonicalName}.md`),
      );
      writeFileSync(join(fixtureRoot, 'outside.md'), '# Outside\n');
      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName,
          skillDir: cursorSkillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).attempts,
      ).toEqual([
        expect.objectContaining({
          tier: 'loaded',
          outcome: 'escaping-symlink',
        }),
      ]);

      rmSync(join(cursorAgentDir, `${canonicalName}.md`));
      symlinkSync(
        join(fixtureRoot, 'missing.md'),
        join(cursorAgentDir, `${canonicalName}.md`),
      );
      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName,
          skillDir: cursorSkillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).attempts,
      ).toEqual([
        expect.objectContaining({
          tier: 'loaded',
          outcome: 'broken-symlink',
        }),
      ]);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('uses loaded then user then project and fails closed per dependency', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'oat-agent-order-'));

    try {
      const loadedRoot = join(fixtureRoot, 'loaded', '.agents');
      const skillDir = join(loadedRoot, 'skills', 'consumer');
      const userCanonicalRoot = join(fixtureRoot, 'user', '.agents');
      const projectCanonicalRoot = join(fixtureRoot, 'project', '.agents');
      mkdirSync(skillDir, { recursive: true });

      const writeAgent = (root: string, name: string): string => {
        const file = join(root, 'agents', `${name}.md`);
        mkdirSync(join(file, '..'), { recursive: true });
        writeFileSync(file, `# ${name}\n`);
        return file;
      };

      writeAgent(userCanonicalRoot, 'oat-reviewer');
      writeAgent(projectCanonicalRoot, 'oat-reviewer');
      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName: 'oat-reviewer',
          skillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }),
      ).toEqual(expect.objectContaining({ status: 'resolved', tier: 'user' }));

      writeAgent(loadedRoot, 'oat-reviewer');
      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName: 'oat-reviewer',
          skillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }),
      ).toEqual(
        expect.objectContaining({ status: 'resolved', tier: 'loaded' }),
      );

      const missing = resolveCanonicalAgentTarget({
        dependency: 'research',
        canonicalName: 'skeptical-evaluator',
        skillDir,
        userCanonicalRoot,
        projectCanonicalRoot,
      });
      expect(missing).toEqual(
        expect.objectContaining({
          status: 'miss',
          dependency: 'research',
          recovery: [
            'oat tools install research --scope <user|project>',
            'oat tools update --pack research --scope <user|project>',
          ],
        }),
      );
      expect(missing.attempts.map(({ tier }) => tier)).toEqual([
        'loaded',
        'user',
        'project',
      ]);

      writeAgent(projectCanonicalRoot, 'skeptical-evaluator');
      expect(
        resolveCanonicalAgentTarget({
          dependency: 'research',
          canonicalName: 'skeptical-evaluator',
          skillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }),
      ).toEqual(
        expect.objectContaining({ status: 'resolved', tier: 'project' }),
      );
      expect(
        resolveCanonicalAgentTarget({
          dependency: 'workflows',
          canonicalName: 'oat-phase-implementer',
          skillDir,
          userCanonicalRoot,
          projectCanonicalRoot,
        }).status,
      ).toBe('miss');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
