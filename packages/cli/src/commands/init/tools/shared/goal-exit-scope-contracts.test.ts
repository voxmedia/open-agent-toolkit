import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Goal milestone exit gate scope (m03, p15; Outcome 7,
 * BL-261104-goal-mode-exit-gate-resolve).
 *
 * In a goal milestone closeout the configured implement exit gate runs
 * unchanged with `--review-scope final` and a prompt that delegates scope to
 * project state. Review-provide resolves that state-selected `final` hint to
 * the active milestone's ordered accepted phases, mirroring the recovery-exit
 * hint, so a squash-merged earlier milestone's anchors are never read. An
 * explicit whole-project `code final` keeps its meaning.
 */

const REPO_ROOT = join(import.meta.dirname, '../../../../../../../');
const PROVIDE = '.agents/skills/oat-project-review-provide/SKILL.md';
const CLOSEOUT =
  '.agents/skills/oat-project-implement/references/completion-and-closeout.md';

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8').replace(
    /\s+/g,
    ' ',
  );
}

function milestoneHint(): string {
  const content = read(PROVIDE);
  const start = content.indexOf(
    '**State-selected goal milestone exit hint (before normal inference or `final` expansion):**',
  );
  const end = content.indexOf(
    '**If no arguments — infer from project state:**',
  );
  if (start < 0 || end < start) {
    throw new Error('Missing state-selected goal milestone exit hint');
  }
  return content.slice(start, end);
}

describe('goal milestone exit gate scope', () => {
  it('applies only to a state-selected code gate in an active, unrecovered goal', () => {
    expect(milestoneHint()).toContain(
      "Resolve a supplied `final` hint to the active milestone's phase set only when all of these hold: invocation is a `code` gate; its prompt explicitly asks to use project state to determine the review scope; workflow mode is `goal`; `oat_goal_status` is `active`; and no `oat_goal_recovery` record is pending.",
    );
  });

  it('keeps the configured argv unchanged', () => {
    expect(milestoneHint()).toContain(
      'The configured command and its argv remain unchanged.',
    );
  });

  it('keeps an explicit whole-project final and a declared goal whole-project', () => {
    expect(milestoneHint()).toContain(
      'An explicit request for a whole-project final review, including a prompt asking for `code final` without state-based selection, retains the ordinary `final` meaning, and so does a state-selected `final` once `oat_goal_status` is `declared_met` (terminal closeout).',
    );
  });

  it('reads the exact ordered milestone set from the shared Milestones reader', () => {
    expect(milestoneHint()).toContain(
      'Read the active milestone (`oat_milestone`) and its exact ordered phase set from the shared Milestones reader (`oat project status --json`), and require every phase in it to be accepted.',
    );
  });

  it('selects only an exact token and never widens to the whole project', () => {
    expect(milestoneHint()).toContain(
      'An unaccepted phase or a set with no exact supported token refuses the review; never flatten a noncontiguous set or widen it to the whole project.',
    );
  });

  it('runs the unchanged anchor resolver on the selected token only', () => {
    expect(milestoneHint()).toContain(
      "Run Step 3.0 unchanged on the selected token, so earlier milestones' anchors are not read and a squash-merged earlier milestone no longer refuses; invalid selected anchors still refuse.",
    );
  });

  it('records the original hint and the resolved phase set', () => {
    expect(milestoneHint()).toContain(
      "Record as the recovery hint does: `oat_review_requested_scope: final`, `oat_review_scope` the selected token, the exact milestone set in `oat_review_phase_ids`, and a Review Scope disclosure that the state-selection prompt resolved the original `final` hint through the active milestone's phase set.",
    );
  });

  it('states the rule where implement runs the milestone exit gate', () => {
    expect(read(CLOSEOUT)).toContain(
      "With no recovery pending, the same prompt resolves the hint through its state-selected milestone-exit rule to the active milestone's ordered accepted phases",
    );
  });
});
