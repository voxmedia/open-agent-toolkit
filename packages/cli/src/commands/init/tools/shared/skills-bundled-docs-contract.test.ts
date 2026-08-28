import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: import.meta.dirname,
  encoding: 'utf8',
}).trim();

const SKILLS_DIR = join(REPO_ROOT, '.agents', 'skills');
const SHARED_DOCS_DIR = join(REPO_ROOT, '.agents', 'docs');

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
  /(?<![/a-zA-Z0-9_-])\.agents\/skills\/([a-zA-Z0-9_-]+)\/SKILL\.md/g;

function listSkillDirs(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listAuthoredMarkdown(skillDir: string): string[] {
  // Recurse the skill, but skip references/docs/ — those are vendored copies of
  // shared docs (symlinks materialized at build time), not authored pointers.
  return readdirSync(skillDir, { recursive: true, encoding: 'utf8' })
    .filter((rel) => rel.endsWith('.md') && !rel.includes('references/docs'))
    .map((rel) => join(skillDir, rel));
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

    for (const file of listAuthoredMarkdown(skillDir)) {
      const relFile = file.slice(REPO_ROOT.length + 1);
      for (const target of collectBareCrossSkillTargets(
        readFileSync(file, 'utf8'),
        skill,
      )) {
        references.push({ file: relFile, target });
      }
    }
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
    // This exact inventory is a ratchet, not an endorsement. Executable legacy
    // references are removed by the migration tasks below; historical evidence
    // remains pinned by its exact source file and target so it cannot become a
    // wildcard allowance for new authored Markdown.
    const PINNED_LEGACY_BARE_READS: readonly BareCrossSkillReference[] = [
      // Executable legacy references scheduled for migration.
      {
        file: '.agents/skills/oat-brainstorm/references/destinations.md',
        target: 'oat-idea-new',
      },
      {
        file: '.agents/skills/oat-brainstorm/references/destinations.md',
        target: 'oat-idea-summarize',
      },
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
      {
        file: '.agents/skills/oat-project-implement/SKILL.md',
        target: 'oat-dispatch-subagents',
      },
      {
        file: '.agents/skills/oat-project-implement/SKILL.md',
        target: 'oat-project-dispatch-subagents',
      },
      {
        file: '.agents/skills/oat-project-plan-writing/SKILL.md',
        target: 'oat-dispatch-subagents',
      },
      {
        file: '.agents/skills/oat-project-plan-writing/SKILL.md',
        target: 'oat-project-dispatch-subagents',
      },
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
    ).toEqual(PINNED_LEGACY_BARE_READS);
  });

  it.each([
    ['backticked', 'Read `.agents/skills/sibling/SKILL.md`.', ['sibling']],
    ['plain text', 'Read .agents/skills/sibling/SKILL.md next.', ['sibling']],
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

  it.each(['oat-idea-ideate', 'oat-idea-new', 'oat-idea-summarize'])(
    '%s resolves chained idea skills from its installed scope',
    (skill) => {
      const content = readFileSync(join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');

      expect(content).toContain('`${SKILL_DIR}/..`');
      expect(content).toContain('`${HOME}/.agents/skills`');
      expect(content).toContain('`<repo-root>/.agents/skills`');
      expect(content).toContain(
        'Probe each candidate for `<name>/SKILL.md` and treat the first match as',
      );
      expect(content).toContain(
        'stop the current branch instead of improvising its process',
      );
      expect(collectBareCrossSkillTargets(content, skill)).toEqual([]);
    },
  );

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
