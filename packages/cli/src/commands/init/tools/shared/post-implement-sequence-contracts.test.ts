import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readImplementSkill(): string {
  const root = join(
    import.meta.dirname,
    '../../../../../../../.agents/skills/oat-project-implement',
  );
  const entry = readFileSync(join(root, 'SKILL.md'), 'utf8');
  const successIndex = entry.indexOf('## Success Criteria');
  const references = [
    'dispatch-and-dry-run.md',
    'plan-and-resume.md',
    'phase-execution.md',
    'completion-and-closeout.md',
  ].map((path) => readFileSync(join(root, 'references', path), 'utf8'));
  return [
    entry.slice(0, successIndex),
    ...references,
    entry.slice(successIndex),
  ].join('\n\n');
}

function readNextSkill(): string {
  return readFileSync(
    join(
      import.meta.dirname,
      '../../../../../../../.agents/skills/oat-project-next/SKILL.md',
    ),
    'utf8',
  );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

describe('post-implementation sequence contracts', () => {
  it('keeps non-final checkpoints and root-owned phase execution intact', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(normalized).toContain(
      'Example: `["p01", "p04"]` → pause after p01 completes and after p04 completes; skip p02, p03.',
    );
    expect(skill).toContain('After each phase or parallel group');
    expect(skill).toContain('exactly one phase implementer');
    expect(skill).toContain('directly executes every task');
    expect(skill).toContain('root workflow owns implementation review');
    expect(skill).toContain('Optional third-tier readiness is not');
  });

  it('defers only the final checkpoint until final review and pre-approval work finish', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(skill).toContain('### Step 15: Final HiLL Closeout Sequence');
    expect(normalized).toContain(
      'Defer only a checkpoint on the final implementation phase; non-final checkpoint behavior remains unchanged.',
    );
    expect(normalized).toContain(
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

  it('enforces the configured implementation exit gate before every completion boundary', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);
    const verificationIndex = skill.indexOf('### Step 12: Final Verification');
    const reviewIndex = skill.indexOf('### Step 13: Trigger Final Review');
    const gateIndex = skill.indexOf('### Step 14: Gate Execution');
    const sequenceIndex = skill.indexOf(
      '### Step 15: Final HiLL Closeout Sequence',
    );
    const completionIndex = skill.indexOf(
      '### Step 16: Mark Implementation Complete',
    );
    const promptIndex = skill.indexOf('### Step 17: Prompt for Next Steps');
    const outputIndex = skill.indexOf('### Step 18: Output Summary');

    expect(verificationIndex).toBeGreaterThanOrEqual(0);
    expect(reviewIndex).toBeGreaterThan(verificationIndex);
    expect(gateIndex).toBeGreaterThan(reviewIndex);
    expect(sequenceIndex).toBeGreaterThan(gateIndex);
    expect(completionIndex).toBeGreaterThan(sequenceIndex);
    expect(promptIndex).toBeGreaterThan(completionIndex);
    expect(outputIndex).toBeGreaterThan(promptIndex);
    expect(normalized).toContain(
      'The configured implementation exit gate is independent from the optional `oat_phase_review_gate`',
    );
    expect(normalized).toContain(
      'A missing, disabled, or unconfigured phase gate never disables or satisfies this configured exit gate.',
    );
    expect(skill.slice(outputIndex)).not.toContain('### Gate Execution');
  });

  it('persists every implementation exit-gate outcome and resumes without duplicate work', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    for (const field of [
      'status',
      'resolution',
      'disposition',
      'config_fingerprint',
      'resolved_command',
      'resolved_description',
      'on_failure',
      'max_attempts',
      'attempts_completed',
      'reviewed_head',
      'implementation_fingerprint',
      'gate_run_id',
      'envelope_status',
      'artifact',
      'handoff',
      'receive_eligible',
      'receive_completed',
      'failure',
      'updated_at',
    ]) {
      expect(skill, `persisted gate field ${field}`).toContain(`${field}:`);
    }
    expect(normalized).toContain(
      'A `null` resolution persists `allowed/no_gate` with `disposition: no_gate`',
    );
    expect(normalized).toContain(
      '`block` outcomes consume remediation attempts only after a valid configured gate result',
    );
    expect(normalized).toContain(
      'At `maxAttempts`, persist `blocked` and stop without another gate launch.',
    );
    expect(normalized).toContain(
      'Launch failures, missing CLIs, unavailable runtimes, and transport failures do not increment `attempts_completed`.',
    );
    expect(normalized).toContain(
      'An explicit prompt continuation persists `allowed/prompt_approved`; defer or no response persists `blocked` and stops.',
    );
    expect(normalized).toContain(
      'A warn continuation persists `allowed/warned` before closeout proceeds.',
    );
    expect(normalized).toContain(
      'Resume `pending` or `blocked` from the persisted transition without replacing its generation.',
    );
    expect(normalized).toContain(
      'A fresh `allowed` result resumes after the gate without executing the gate or receive a second time.',
    );
  });

  it('enforces structured receive provenance and fail-closed freshness', () => {
    const skill = readImplementSkill();
    const next = readNextSkill();
    const normalized = normalizeWhitespace(skill);
    const normalizedNext = normalizeWhitespace(next);

    expect(normalized).toContain(
      'Receive is eligible only for `ok` or `blocked` with `receiveEligible: true` and a corroborated non-null `handoff`.',
    );
    expect(normalized).toContain(
      'Persist `receive_completed: true` before continuing; an already-completed receive is idempotent and must not run again.',
    );
    expect(normalized).toContain(
      'A receive failure persists `blocked` and cannot become an allowed disposition.',
    );
    expect(normalized).toContain(
      'Manual review provenance is rejected: only `oat_review_invocation: gate` with the matching `oat_gate_run_id` may satisfy the configured gate.',
    );
    expect(normalized).toContain(
      'Closeout-only descendants include configured gate artifacts and receipts, project tracking, `project-log.md` appends, summary/documentation/PR sequence outputs, final HiLL bookkeeping, and completion bookkeeping.',
    );
    expect(normalized).toContain(
      'An unknown changed path fails closed as substantive implementation change.',
    );
    expect(normalized).toContain(
      'Implementation, test, skill, template, or workflow configuration changes make the prior result `stale`.',
    );
    expect(normalized).toContain(
      'An in-flight `pending` or `blocked` generation reuses its persisted resolved configuration and never re-resolves it.',
    );
    expect(normalized).toContain(
      'If the persisted resolved configuration does not reproduce `config_fingerprint`, mark the generation `stale` and fail closed.',
    );
    expect(normalizedNext).toContain(
      'Recognized closeout-only descendants preserve a fresh allowed result; unknown paths and substantive changes route as stale.',
    );
    expect(normalizedNext).toContain(
      'Pending and blocked generations resume their persisted configuration; configuration-fingerprint mismatch fails closed.',
    );
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
      'If the preference is unset and autonomy is inactive, do not create a sequence snapshot. Retain the existing next-step prompt only after final approval when a final checkpoint is configured.',
    );
  });

  it('preserves incomplete sequence routing and PR state integration', () => {
    const next = readNextSkill();
    const prFinal = readFileSync(
      join(
        import.meta.dirname,
        '../../../../../../../.agents/skills/oat-project-pr-final/SKILL.md',
      ),
      'utf8',
    );
    expect(next).toContain(
      'Incomplete approval-aware post-implementation sequence',
    );
    expect(next).toContain('route to\n`oat-project-implement`');
    expect(prFinal).toContain('Reuse a\ncompleted `summary` step');
    expect(prFinal).toContain('merge with, never replace');
  });

  it('routes unresolved implementation exit gates before every normal closeout route', () => {
    const next = readNextSkill();
    const normalized = normalizeWhitespace(next);
    const gateCheckIndex = next.indexOf(
      '**5.0: Unresolved implementation exit gate**',
    );
    const sequenceIndex = next.indexOf(
      '**5.1: Incomplete approval-aware post-implementation sequence**',
    );

    expect(gateCheckIndex).toBeGreaterThanOrEqual(0);
    expect(sequenceIndex).toBeGreaterThan(gateCheckIndex);
    expect(gateCheckIndex).toBeLessThan(
      next.indexOf('**5.5: Summary not done**'),
    );
    expect(gateCheckIndex).toBeLessThan(
      next.indexOf('**5.6: PR not created**'),
    );
    expect(gateCheckIndex).toBeLessThan(next.indexOf('**5.7: PR is open**'));
    expect(normalized).toContain(
      '`oat_implement_exit_gate` is absent, `pending`, `blocked`, `stale`, malformed, or not fresh',
    );
    expect(normalized).toContain(
      'This override applies even when `oat_phase_status` is `complete` or `pr_open`, and before the summary, document, PR, or `oat-project-complete` routes.',
    );
    expect(normalized).toContain(
      'Implementation exit gate unresolved or stale — resume with `oat-project-implement` before post-implementation routing.',
    );
    expect(normalized).toContain(
      'Only an `allowed` and fresh exit-gate disposition falls through',
    );
  });
});
