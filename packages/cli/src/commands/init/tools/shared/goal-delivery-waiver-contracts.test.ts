import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * goal-delivery-freshness p03 (brief Outcomes 3 and 4): pr-progress tells
 * whoever merges a goal milestone PR to run `delivery check` first, accepts a
 * waived delivery like any other, and offers the operator-only freshness
 * waiver where its `dNN` re-checks (Step 5.5 items 3a and 8) find a delivery
 * stale past its endpoint. oat-project-goal's hand-back names that offer and
 * never waives. The brief contract names every `delivery waive` refusal code
 * and when each closeout command lists waivers, and implement's milestone
 * exit-gate step states p01's path rule. These pins hold that prose.
 */

const REPO_ROOT = join(import.meta.dirname, '../../../../../../../');
const PROGRESS = '.agents/skills/oat-project-pr-progress/SKILL.md';
const GOAL = '.agents/skills/oat-project-goal/SKILL.md';
const CONTRACT =
  '.agents/skills/oat-project-brief/references/brief-contract.md';
const CLOSEOUT =
  '.agents/skills/oat-project-implement/references/completion-and-closeout.md';

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8').replace(
    /\s+/g,
    ' ',
  );
}

function section(content: string, start: string, end: string): string {
  const from = content.indexOf(start);
  const to = content.indexOf(end, from + start.length);
  expect(from, start).toBeGreaterThanOrEqual(0);
  expect(to, end).toBeGreaterThan(from);
  return content.slice(from, to);
}

function registration(): string {
  return section(
    read(PROGRESS),
    '### Step 5.5: Goal Delivery Registration (`goal` only)',
    '### Step 6: Optional - Open PR',
  );
}

describe('pr-progress goal delivery waiver and pre-merge prose', () => {
  it('accepts a waived delivery on the ordinary status: ok branch', () => {
    expect(registration()).toContain(
      "A waived delivery is judged like any other. When the check for a registered `dNN` reports `status: ok` and the delivery carries `freshness_waivers` (written by `oat project delivery waive`, section 12.7), take the item's `status: ok` branch: never re-register, re-gate or route it to recovery because it carries a waiver. When this run regenerates the local progress PR description for that delivery, list its waivers there (a waiver written later in this run, in item 3a or 8, appears the next time the description is regenerated); the posted PR body was written at creation, before any waiver could exist, and is not rewritten, so closeout output (section 12.9) is where waivers are read.",
    );
  });

  it('offers the waiver from item 3a before applying item 3', () => {
    const content = registration();
    const item3a = section(
      content,
      '**3a. Already-registered active delivery.**',
      '4. **Idempotent registration.**',
    );
    expect(item3a).toContain(
      "On a not-fresh report for a delivery stale past its endpoint, first offer the waiver (below); otherwise, or when the waiver is declined or refused, apply item 3 (active milestone's delivery).",
    );
  });

  it('offers the waiver from item 8 instead of a recovery that cannot complete', () => {
    const item8 = section(
      registration(),
      '8. **Recovery targets.**',
      '**Stale past its endpoint: offer the waiver.**',
    );
    expect(item8).toContain(
      'A delivery stale past its endpoint can take no pushed fix: offer the waiver (below) instead of a recovery that cannot complete, and when the waiver is declined or refused, leave the record and stop, reporting its stage owner.',
    );
  });

  it('defines stale past its endpoint and keeps the waiver operator-only', () => {
    const offer = section(
      registration(),
      '**Stale past its endpoint: offer the waiver.**',
      '**Before merging.**',
    );
    expect(offer).toContain(
      'A delivery is stale past its endpoint when refresh observes it `at_endpoint` with its members merged, so no fix can be pushed to them, and its `dNN` check still reports the integrated review or the `exit` carrier not fresh.',
    );
    expect(offer).toContain(
      'The waiver is operator-only (section 12.7, Operator waiver): it covers head movement only, and this skill never issues one on its own.',
    );
    expect(offer).toContain(
      'Only on the user\'s explicit choice and with the reason the user gives, run `oat project delivery waive --project "$PROJECT_PATH" --delivery <dNN> --reason "<reason>" --json`, commit `state.md` as bookkeeping (`chore(oat): record freshness waiver <dNN>`;',
    );
    expect(offer).toContain(
      'offer two options: waive, or decline (continue as the item says for a declined waiver: item 3a applies item 3, item 8 leaves the record and stops).',
    );
    expect(offer).not.toContain('waive, or stop');
    expect(offer).toContain(
      '**Non-interactive run** (`OAT_NON_INTERACTIVE=1` or `OAT_AUTONOMOUS=1`): never run the waiver.',
    );
  });

  it('tells whoever merges to run delivery check first, in the report and the PR body', () => {
    const merge = section(
      registration(),
      '**Before merging.**',
      '`delivered` means registered, open and review-ready.',
    );
    expect(merge).toContain(
      'In the registration report and in the milestone PR body (the template\'s `## Before Merging` section), tell whoever merges it to run `oat project delivery check --project "$PROJECT_PATH" --subject <dNN>` first, and, when it reports the delivery stale, to re-gate it (re-run the exit gate and the integrated review) or, for head movement the operator accepts, to waive it with `oat project delivery waive` before merging.',
    );
  });

  it('carries the pre-merge section and the waiver listing in the PR template', () => {
    const template = section(
      read(PROGRESS),
      'Recommended template:',
      '### Step 5.5: Goal Delivery Registration (`goal` only)',
    );
    expect(template).toContain(
      "{goal only, when this description is regenerated for a registered delivery: one bullet per entry in its `freshness_waivers`, oldest first: who waived, when, the reason and each member's waived head; omit when there are none}",
    );
    expect(template).toContain(
      '## Before Merging {goal only: the Step 5.5 pre-merge instruction for this delivery, naming its `dNN`; omit outside goal mode}',
    );
  });
});

describe('oat-project-goal hand-back for a delivery stale past its endpoint', () => {
  it('names the owner offer and never waives', () => {
    const entry = section(
      read(GOAL),
      '### Step 8: Re-alignment Entry (at `delivered`)',
      '2. **Log the entry.**',
    );
    expect(entry).toContain(
      "When that delivery is stale past its endpoint (observed `at_endpoint` with its members merged), say so in the report: the owner's re-check offers the operator the freshness waiver (`oat project delivery waive`), because a recovery that queues fixes cannot land them on that pull request; declining it keeps the owner's ordinary recovery path. Never run the waiver from this skill.",
    );
  });
});

describe('brief contract and implement closeout alignment', () => {
  it('names every delivery waive refusal code', () => {
    const waiver = section(
      read(CONTRACT),
      '**Operator waiver.** `oat project delivery waive --project',
      '### 12.8 Bookkeeping-successor freshness',
    );
    for (const code of [
      'autonomous',
      'reason-missing',
      'author-missing',
      'unknown-delivery',
      'delivery-not-observable',
      'observation-failed',
      'missing-object',
      'review-not-passed',
      'carrier-not-allowed',
      'configuration-changed',
      'already-fresh',
      'not-head-movement',
    ]) {
      expect(waiver).toContain(`(\`${code}\``);
    }
    expect(waiver).toContain(
      "for a delivery whose every consumer's live evaluation already reads fresh (`already-fresh`: there is no head movement to waive; when its recorded disposition is nonetheless `stale`, the refusal says so and names the recovery, a new integrated review received clean, because refresh never writes `passed` and the waiver does not restore a record whose evidence is already fresh);",
    );
  });

  it('says complete-state lists waivers on success only', () => {
    expect(read(CONTRACT)).toContain(
      '`closeout-check` on success and on refusal, `complete-state` on success, since its refusal writes nothing and completes nothing.',
    );
  });

  it('states the exit-gate artifact path rule apart from shared-evidence membership', () => {
    const closeout = read(CLOSEOUT);
    expect(closeout).toContain(
      "The gate's artifact commit is bookkeeping by path: any single file directly under this project's `reviews/` or `reviews/archived/` is a permitted bookkeeping path (brief contract section 12.8, Paths), whatever evidence it belongs to.",
    );
    expect(closeout).toContain(
      "Separately, the carrier's evidence scope lists the gate's Reviews row artifact as shared evidence only when the row has Type `code`, Invocation `gate`, and a non-placeholder Reviewed Head equal to the carrier's `reviewed_head`",
    );
    expect(closeout).not.toContain('admitted as carrier bookkeeping only when');
  });
});
