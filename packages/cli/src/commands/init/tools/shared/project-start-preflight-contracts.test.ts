import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const PROJECT_START_SKILLS = [
  'oat-project-new',
  'oat-project-quick-start',
  'oat-project-import-plan',
] as const;

const PJM_WRITE_SKILLS = [
  'oat-pjm-add-backlog-item',
  'oat-pjm-decision',
  'oat-pjm-update-repo-reference',
  'oat-pjm-review-backlog',
] as const;

const PJM_CONSUMER_SKILLS = [
  'oat-project-document',
  'oat-project-summary',
  'oat-brainstorm',
] as const;

function readSkill(name: string): string {
  return readFileSync(
    join(
      import.meta.dirname,
      `../../../../../../../.agents/skills/${name}/SKILL.md`,
    ),
    'utf8',
  );
}

function readPreflightStep(name: string): string {
  const content = readSkill(name);
  const start = content.indexOf('### Step 0 (Preflight): Inherited Git State');
  expect(start, `${name} has a Step 0 preflight`).toBeGreaterThanOrEqual(0);
  const end = content.indexOf('### Step 0.5', start);
  return content.slice(start, end > start ? end : undefined);
}

/**
 * Porcelain codes that pair `M` with an unsafe second state. An earlier version
 * of this rule allowed "status `M` in either column", which silently admitted
 * every one of these — `MD` would have staged and committed a worktree
 * deletion of the manifest.
 */
const UNSAFE_M_MIXES = ['MD', 'MT', 'AM', 'RM', 'CM'] as const;

describe('project-start preflight contracts', () => {
  it.each(PROJECT_START_SKILLS)(
    '%s restricts the manifest auto-commit to plain modifications',
    (name) => {
      const step = readPreflightStep(name);

      expect(step).toContain('made up solely of the letter `M` and blanks');
      expect(step).toContain('`??`');
      // The loose phrasing this replaced.
      expect(step).not.toContain('in either column');
    },
  );

  it.each(PROJECT_START_SKILLS)(
    '%s names every unsafe code that pairs with M',
    (name) => {
      const step = readPreflightStep(name);

      for (const code of UNSAFE_M_MIXES) {
        expect(step, `${name} rejects ${code}`).toContain(`\`${code}\``);
      }
      expect(step).toContain('every unmerged state');
    },
  );

  it.each(PROJECT_START_SKILLS)(
    '%s scopes the auto-commit to the manifest path alone',
    (name) => {
      const step = readPreflightStep(name);

      expect(step).toContain('git add -- .oat/sync/manifest.json');
      expect(step).not.toContain('git add -A');
      expect(step).not.toContain('git add .');
    },
  );

  it.each(PROJECT_START_SKILLS)(
    '%s keeps the explicit-choice guard off the auto-commit branch',
    (name) => {
      const step = readPreflightStep(name);

      expect(step).toContain(
        'Once the dirty list has been presented, do not advance past this gate without',
      );
      expect(step).toContain(
        'The step 2 manifest-only auto-commit is not a choice point',
      );
    },
  );

  it('records the QS-01 autonomy gate only in quick-start', () => {
    expect(readSkill('oat-project-quick-start')).toContain('QS-01');
    expect(readSkill('oat-project-new')).not.toContain('QS-01');
    expect(readSkill('oat-project-import-plan')).not.toContain('QS-01');
  });

  it.each(PJM_WRITE_SKILLS)(
    '%s checks repository adoption read-only before writes',
    (name) => {
      const content = readSkill(name);
      const processStart = content.indexOf('## Process');
      const preflight = content.indexOf('oat pjm doctor --json', processStart);
      const firstWrite = Math.min(
        ...[
          'oat backlog new',
          'oat decision new',
          'Write the **living** review',
        ]
          .map((needle) => content.indexOf(needle, processStart))
          .filter((index) => index >= 0),
      );

      expect(preflight).toBeGreaterThanOrEqual(0);
      expect(preflight).toBeLessThan(firstWrite);
      expect(content).toContain('adoption.state');
      expect(content).toContain('partial-initialization');
      expect(content).toContain('oat pjm init');
    },
  );

  it('resolves backlog-review templates from the loaded skill directory', () => {
    const content = readSkill('oat-pjm-review-backlog');
    expect(content).toContain(
      '$SKILL_DIR/references/backlog-review-template.md',
    );
    expect(content).toContain(
      '$SKILL_DIR/references/priority-alignment-template.md',
    );
    expect(content).not.toContain(
      '.agents/skills/oat-pjm-review-backlog/references/',
    );
  });

  it.each(PJM_CONSUMER_SKILLS)(
    '%s separates capability presence from repository adoption',
    (name) => {
      const content = readSkill(name);
      expect(content).toContain('oat tools has project-management');
      expect(content).toContain('oat pjm doctor --json');
      expect(content).toContain('adoption.state');
      expect(content).toContain('partial-initialization');
      expect(content).toContain('oat pjm init');
    },
  );

  it('does not initialize decisions as an implicit PJM adoption path', () => {
    expect(readSkill('oat-project-summary')).not.toContain(
      'test -f .oat/repo/reference/decisions/index.md || oat decision init',
    );
  });
});
