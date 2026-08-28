import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: import.meta.dirname,
  encoding: 'utf8',
}).trim();

const SKILLS_DIR = join(REPO_ROOT, '.agents', 'skills');
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

interface BareCrossSkillReference {
  file: string;
  target: string;
}

const BARE_CROSS_SKILL_READ =
  /(?<![/a-zA-Z0-9_-])(?:\.\.?\/)?\.agents\/skills\/([a-zA-Z0-9_-]+)\/SKILL\.md/g;

const PORTABLE_SKILLS_ROOT_CANDIDATES = [
  '`${SKILL_DIR}/..`',
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

function expectPortableSkillsRootCandidateOrder(
  content: string,
  source: string,
): void {
  const positions = PORTABLE_SKILLS_ROOT_CANDIDATES.map((candidate) =>
    content.indexOf(candidate),
  );

  for (const [index, candidate] of PORTABLE_SKILLS_ROOT_CANDIDATES.entries()) {
    expect(
      positions[index],
      `${source} is missing ${candidate}`,
    ).toBeGreaterThan(-1);
  }
  for (let index = 1; index < positions.length; index += 1) {
    expect(
      positions[index - 1],
      `${source} must list ${PORTABLE_SKILLS_ROOT_CANDIDATES[index - 1]} before ${PORTABLE_SKILLS_ROOT_CANDIDATES[index]}`,
    ).toBeLessThan(positions[index]!);
  }
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

function collectBareCrossSkillTargets(
  content: string,
  sourceSkill: string,
): string[] {
  return [
    ...new Set(
      [...content.matchAll(BARE_CROSS_SKILL_READ)]
        .map((match) => match[1]!)
        .filter((target) => target !== sourceSkill),
    ),
  ].sort();
}

function collectBareCrossSkillReferencesForSkill(
  skillDir: string,
  sourceSkill: string,
  relativeRoot: string,
): BareCrossSkillReference[] {
  const references: BareCrossSkillReference[] = [];

  for (const file of listAuthoredMarkdown(skillDir)) {
    const relFile = file.slice(relativeRoot.length + 1);
    for (const target of collectBareCrossSkillTargets(
      readFileSync(file, 'utf8'),
      sourceSkill,
    )) {
      references.push({ file: relFile, target });
    }
  }

  return references;
}

function collectBareCrossSkillReferences(): BareCrossSkillReference[] {
  const userScopeSkills = new Set(
    PACK_MANIFEST.filter((pack) => pack.defaultScope === 'user').flatMap(
      (pack) =>
        pack.assets
          .filter((asset) => asset.kind === 'skill')
          .map((asset) => asset.id.slice('skill:'.length)),
    ),
  );
  const references: BareCrossSkillReference[] = [];

  for (const skill of [...userScopeSkills].sort()) {
    const skillDir = join(SKILLS_DIR, skill);
    if (!existsSync(skillDir)) continue;

    references.push(
      ...collectBareCrossSkillReferencesForSkill(skillDir, skill, REPO_ROOT),
    );
  }

  return references.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.target.localeCompare(right.target),
  );
}

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

  it('does not add bare repo-relative cross-skill reads to user-scope packs', () => {
    // A skill in a pack that defaults to user scope is normally installed at
    // `~/.agents/skills/`, so a bare `.agents/skills/<name>/SKILL.md` read
    // dangles: the repo-relative path does not exist on a default install.
    // The chained read must resolve the skills root from the loaded skill's
    // scope (user-scope candidate probed first) instead.
    //
    // Every executable legacy reference has been removed. This exact inventory
    // retains only historical evidence, pinned by source file and target so it
    // cannot become a wildcard allowance for new authored Markdown.
    const PINNED_HISTORICAL_BARE_READS: readonly BareCrossSkillReference[] = [
      // Historical dogfood evidence records the paths exercised at that time.
      ...[
        'oat-idea-ideate',
        'oat-idea-new',
        'oat-idea-summarize',
        'oat-pjm-add-backlog-item',
        'oat-project-new',
      ].map((target) => ({
        file: '.agents/skills/oat-brainstorm/references/dogfood-results.md',
        target,
      })),
      // The mini-wave fixture documents the canonical path promoted by its test.
      {
        file: '.agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md',
        target: 'oat-wave-program',
      },
    ];

    const found = collectBareCrossSkillReferences();
    const detail = found
      .map(({ file, target }) => `  ${file} -> ${target}`)
      .join('\n');

    expect(
      found,
      `Bare repo-relative cross-skill reads changed; resolve executable reads from the loaded skill scope and baseline only exact historical evidence:\n${detail}`,
    ).toEqual(PINNED_HISTORICAL_BARE_READS);
  });

  it.each([
    ['backticked', 'Read `.agents/skills/sibling/SKILL.md`.', ['sibling']],
    ['plain text', 'Read .agents/skills/sibling/SKILL.md next.', ['sibling']],
    [
      'dot-relative path',
      'Read ./.agents/skills/sibling/SKILL.md next.',
      ['sibling'],
    ],
    [
      'parent-relative path',
      'Read ../.agents/skills/sibling/SKILL.md next.',
      ['sibling'],
    ],
    [
      'Markdown link',
      'Read [the sibling contract](.agents/skills/sibling/SKILL.md).',
      ['sibling'],
    ],
    ['portable skills root', 'Read `${SKILLS_ROOT}/sibling/SKILL.md`.', []],
    [
      'user-scope absolute path',
      'Read `${HOME}/.agents/skills/sibling/SKILL.md`.',
      [],
    ],
    ['self-reference', 'Read `.agents/skills/source/SKILL.md`.', []],
  ])('matches %s cross-skill syntax', (_name, content, expected) => {
    expect(collectBareCrossSkillTargets(content as string, 'source')).toEqual(
      expected,
    );
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
        collectBareCrossSkillReferencesForSkill(
          fixtureRoot,
          'source',
          fixtureRoot,
        ),
      ).toEqual([
        {
          file: 'examples/references/docs/authored.md',
          target: 'sibling',
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
        '`${SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`';
      const sharedDispatchRead =
        '`${SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`';

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
});
