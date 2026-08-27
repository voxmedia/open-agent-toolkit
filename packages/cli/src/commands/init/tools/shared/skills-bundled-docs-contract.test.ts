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
    // This inventory is a ratchet, not an endorsement. It pins the reads that
    // predate the fix so any *new* one fails, while the listed skills are
    // remediated on their own schedule. Only remove entries here; never add.
    const PINNED_LEGACY_BARE_READS: Readonly<
      Record<string, readonly string[]>
    > = {
      'oat-idea-ideate': ['oat-idea-new'],
      'oat-idea-new': ['oat-idea-ideate'],
      'oat-idea-summarize': ['oat-idea-ideate'],
      'oat-project-implement': [
        'oat-dispatch-subagents',
        'oat-project-dispatch-subagents',
      ],
      'oat-project-plan-writing': [
        'oat-dispatch-subagents',
        'oat-project-dispatch-subagents',
      ],
    };

    const userScopeSkills = new Set(
      PACK_MANIFEST.filter((pack) => pack.defaultScope === 'user').flatMap(
        (pack) =>
          pack.assets
            .filter((asset) => asset.kind === 'skill')
            .map((asset) => asset.id.slice('skill:'.length)),
      ),
    );
    expect(userScopeSkills.has('oat-brainstorm')).toBe(true);

    const BARE_CROSS_SKILL_READ =
      /`\.agents\/skills\/([a-zA-Z0-9_-]+)\/SKILL\.md`/g;
    const found: Record<string, string[]> = {};

    for (const skill of listSkillDirs()) {
      if (!userScopeSkills.has(skill)) continue;
      const skillFile = join(SKILLS_DIR, skill, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const referenced = new Set<string>();
      for (const match of readFileSync(skillFile, 'utf8').matchAll(
        BARE_CROSS_SKILL_READ,
      )) {
        if (match[1] !== skill) referenced.add(match[1]!);
      }
      if (referenced.size > 0) found[skill] = [...referenced].sort();
    }

    for (const [skill, referenced] of Object.entries(found)) {
      expect(
        PINNED_LEGACY_BARE_READS[skill] ?? [],
        `${skill} adds a bare repo-relative cross-skill read; resolve the skills root from the loaded skill scope instead`,
      ).toEqual(expect.arrayContaining(referenced));
    }

    // The remediated skill must stay clean.
    expect(found['oat-brainstorm']).toBeUndefined();
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
      expect(content, skill).toContain(
        'SCOPE_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"',
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
