import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readImplementSkill(): string {
  return readFileSync(
    join(
      import.meta.dirname,
      '../../../../../../../.agents/skills/oat-project-implement/SKILL.md',
    ),
    'utf8',
  );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

describe('post-implementation sequence contracts', () => {
  it('keeps non-final checkpoints and target-first phase execution intact', () => {
    const skill = readImplementSkill();

    expect(skill).toContain(
      'Example: `["p01", "p04"]` → pause after p01 completes and after p04 completes; skip p02, p03.',
    );
    expect(skill).toContain(
      'After each phase (sequential) or each parallel group',
    );
    expect(skill).toContain('dispatch exactly one phase coordinator');
    expect(skill).toContain('one exact task worker per task');
    expect(skill).toContain('Task Scope, never the full phase task list');
    expect(skill).toContain('`source` must be `invocation`');
  });

  it('defers only the final checkpoint until final review and pre-approval work finish', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(skill).toContain('### Step 15: Final HiLL Closeout Sequence');
    expect(normalized).toContain(
      'Defer only a checkpoint on the final implementation phase; non-final checkpoint behavior remains unchanged.',
    );
    expect(skill).toContain(
      'If this is the final implementation phase checkpoint, run `oat-project-review-provide code final`',
    );

    const closeout = skill.slice(
      skill.indexOf('### Step 15: Final HiLL Closeout Sequence'),
    );
    expect(closeout.indexOf('Run final verification (Step 13).')).toBeLessThan(
      closeout.indexOf('Persist this immutable state'),
    );
    expect(closeout.indexOf('Final review must be `passed`')).toBeLessThan(
      closeout.indexOf('Persist this immutable state'),
    );
    expect(closeout).toContain('`oat_post_implement_sequence`');
    expect(closeout).toContain('`pre_approval`');
    expect(closeout).toContain('awaiting_approval');
  });

  it('uses one immutable snapshot and its stored order across every closeout boundary', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(normalized).toContain(
      'legacy or structured preference, normalize legacy values before snapshotting: `wait` → `{ preApproval: [], postApproval: [] }`, `summary` → `{ preApproval: ["summary"], postApproval: [] }`, `pr` → `{ preApproval: ["summary", "pr"], postApproval: [] }`, and `docs-pr` → `{ preApproval: ["summary", "document", "pr"], postApproval: [] }`.',
    );
    expect(normalized).toContain(
      'The snapshot is immutable for this closeout: never re-resolve `workflow.postImplementSequence` while it is incomplete.',
    );
    expect(normalized).toContain(
      'Iterate `pre_approval` and `post_approval` in their stored array order; do not sort or substitute a vocabulary order.',
    );
    expect(normalized).toContain(
      'Resume from the first incomplete stored step, including a partially completed noncanonical order.',
    );
    expect(normalized).toContain(
      'Every `summary`, `document`, and `pr` child receives the authoritative snapshot',
    );
    expect(normalized).toContain(
      'merge state updates without replacing `oat_post_implement_sequence`',
    );
    expect(normalized).toContain(
      'Re-read and verify the snapshot after every child returns before recording step success',
    );
  });

  it('persists approval and failure boundaries without implicitly crossing them', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(normalized).toContain(
      'Commit each completed step before dispatching the next step.',
    );
    expect(normalized).toContain(
      'When they succeed and a final checkpoint exists, commit `status: awaiting_approval` with `approval: pending` before asking for final HiLL approval.',
    );
    expect(normalized).toContain(
      'Record explicit approval as `approval: approved` and `status: post_approval` before any post-approval dispatch.',
    );
    expect(normalized).toContain(
      'A decline or defer keeps `status: awaiting_approval` and `approval: pending`; record neither approval nor failure and run no post-approval step.',
    );
    expect(normalized).toContain(
      '`approval: not_required` is valid only when no final checkpoint exists.',
    );
    expect(normalized).toContain(
      'A pre-approval failure leaves `approval: pending`; a post-approval failure retains `approval: approved`.',
    );
    expect(normalized).toContain(
      'Fail fast with the boundary, failed step, and exact resume command: `oat-project-implement`.',
    );
  });

  it('keeps the unset preference prompt until after final approval', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(normalized).toContain(
      'When the preference is unset, retain the existing next-step prompt only after final approval when a final checkpoint is configured.',
    );
  });
});
