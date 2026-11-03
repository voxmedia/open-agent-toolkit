import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { applyTemplateReplacements } from '@commands/project/new/scaffold';
import type { WorkflowMode } from '@open-agent-toolkit/control-plane';
import { describe, expect, it } from 'vitest';

/**
 * One row per review event and read-side supersession (m02, p07).
 *
 * `oat-project-plan-writing` owns the Reviews ledger rules: the event key, the
 * one-writer rule and the read-side supersession rule. Review-provide Step 9
 * states the one-writer rule from the writer's side, review-receive Step 1
 * states that a superseded row is never received, and the planning skills
 * record a structured plan review on its own event row.
 */

const REPO_ROOT = join(import.meta.dirname, '../../../../../../../');

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), 'utf8');
}

function skill(name: string): string {
  return read(`.agents/skills/${name}/SKILL.md`);
}

/** Collapse Markdown line wrapping so sentences can be pinned whole. */
function flat(text: string): string {
  return text.replace(/\s+/g, ' ');
}

const PLAN_WRITING = 'oat-project-plan-writing';

describe('Reviews ledger rules in oat-project-plan-writing', () => {
  const rules = flat(skill(PLAN_WRITING));

  it('keys an event from ledger cells alone, and an artifact-less row never keys', () => {
    expect(rules).toContain(
      "The key is read from ledger cells alone. `Reviewed Head` and the artifact's `oat_gate_run_id` only corroborate it. A row whose Artifact is `-` (an unclaimed placeholder, or a structured review that writes no artifact) never shares a key with another row.",
    );
  });

  it('states the one-writer rule', () => {
    expect(rules).toContain(
      '**One writer per event.** Each review event has exactly one row. When a gate child or `oat-project-review-provide` Step 9 has already written the row for an event, a lifecycle skill that records the outcome of that review updates that row, matched by Scope + Type + Artifact filename, and never appends a second row for it. A structured review that writes no artifact claims the unbound `pending` placeholder for its scope and type, and appends a row only when no unbound placeholder remains.',
    );
  });

  it('states read-side supersession with its class, head and `-` limits, and no ledger edit', () => {
    expect(rules).toContain(
      '**Superseded rows (read-side).** A `received` row is superseded by a later row of the same Scope, Type and Invocation class that records a review (any status but `pending`) at the same or a descendant Reviewed Head. The classes are gate (any Gate Target) and lifecycle (`manual` or `auto`); rows of different classes never supersede each other, and a row whose Invocation or Reviewed Head is `-` is never superseded. Readers that select a review event ignore a superseded row. Nothing edits, promotes or deletes it, and its Status stays `received`.',
    );
    expect(rules).toContain(
      '`oat review check --project "$PROJECT_PATH" --json` reports superseded rows and duplicate keys; it is read-only and advisory.',
    );
  });

  it('records a structured plan review on its own event row, never on the gate row', () => {
    expect(rules).toContain(
      "That row is this structured review's own event row under the one-writer rule in Review Table Preservation Rules: the unbound `plan` placeholder it claims, or one appended row when none remains. A row a gate child wrote belongs to the gate's event and is updated by that event's receive; never record this outcome on it or add a second row for it.",
    );
  });
});

describe('the writer and receiver sides', () => {
  it('review-provide Step 9 writes the one row and later steps update it', () => {
    expect(flat(skill('oat-project-review-provide'))).toContain(
      "**One writer per event.** This step writes the event's row once, and it is the event's only row. A later step that records this review's outcome, such as review-receive or the planning skill whose gate dispatched this review, updates this same row, matched by Scope + Type + Artifact filename, and never appends a second row for the event (the plan-writing Review Table Preservation Rules).",
    );
  });

  it('review-receive never receives a superseded row', () => {
    expect(flat(skill('oat-project-review-receive'))).toContain(
      'A superseded `received` row is never actionable: a later row of the same Scope, Type and Invocation class recorded a review at the same or a descendant Reviewed Head (`oat-project-plan-writing` Review Table Preservation Rules). The resolver skips its artifact, and this skill never receives it or edits its row.',
    );
  });

  it('review-receive applies same-head supersession in its CLI-unavailable fallback', () => {
    expect(flat(skill('oat-project-review-receive'))).toContain(
      "The fallback cannot apply supersession for you. Before processing a fallback candidate, read its `## Reviews` row (matched by Scope, Type and Artifact filename) and skip the candidate when a later row of the same Scope, Type and Invocation class records a review (any status except `pending`) at the same Reviewed Head. A later row at a different head leaves the candidate live, because only the CLI can resolve whether that head descends from the candidate's. A candidate row whose Invocation or Reviewed Head is `-` is never skipped.",
    );
  });

  it.each(['oat-project-quick-start', 'oat-project-import-plan'])(
    '%s records the structured plan review on its own event row',
    (name) => {
      const text = flat(skill(name));
      expect(text).toContain(
        "That row is the structured review's own event row under the one-writer rule in `oat-project-plan-writing` (the claimed `plan` placeholder), never a row the gate child wrote and never a second row.",
      );
      expect(text).toContain(
        "The row is this review's own event row under the plan-writing one-writer rule; never append a second row for it.",
      );
    },
  );

  it('oat-project-plan records the plan review on its own event row', () => {
    expect(flat(skill('oat-project-plan'))).toContain(
      "The row is this review's own event row under the plan-writing one-writer rule; never append a second row for it.",
    );
  });

  it.each(['oat-project-brief', 'oat-project-goal'])(
    '%s records the review on the seeded plan placeholder',
    (name) => {
      expect(flat(skill(name))).toContain(
        "The row is the review's own event row under the plan-writing one-writer rule: the seeded `plan | artifact` placeholder, never a second row.",
      );
    },
  );

  it('oat-project-lite records the review on the template placeholder', () => {
    expect(flat(skill('oat-project-lite'))).toContain(
      "The row is the review's own event row under the plan-writing one-writer rule: the template's `plan | artifact` placeholder, never a second row.",
    );
  });
});

/**
 * Review-provide Step 9's documented row write, applied to a rendered plan:
 * claim the first unbound `pending` placeholder of the same Scope + Type whose
 * Artifact is `-`, otherwise append one row. Pinned to the Step 9 text below.
 */
function recordReviewEvent(
  plan: string,
  event: { scope: string; type: string; artifact: string },
): string {
  const lines = plan.split('\n');
  const tableRows = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) =>
      /^\|\s*[a-z0-9-]+\s*\|\s*(code|artifact)\s*\|/.test(line),
    );
  const newRow = `| ${event.scope} | ${event.type} | received | 2026-11-03 | ${event.artifact} | - | - | - |`;
  const placeholder = tableRows.find(({ line }) => {
    const cells = line.split('|').map((cell) => cell.trim());
    return (
      cells[1] === event.scope &&
      cells[2] === event.type &&
      cells[3] === 'pending' &&
      cells[5] === '-'
    );
  });
  if (placeholder) {
    lines[placeholder.index] = newRow;
  } else {
    const last = tableRows.at(-1);
    if (!last) {
      throw new Error('no Reviews table');
    }
    lines.splice(last.index + 1, 0, newRow);
  }
  return lines.join('\n');
}

function artifactRows(plan: string, scope: string): string[] {
  return plan
    .split('\n')
    .filter((line) =>
      new RegExp(`^\\|\\s*${scope}\\s*\\|\\s*artifact\\s*\\|`).test(line),
    );
}

describe('a lightweight-design review records exactly one design row', () => {
  it('pins the Step 9 placeholder-or-append rule the simulation applies', () => {
    expect(flat(skill('oat-project-review-provide'))).toContain(
      'For the first event with this Scope + Type, claim an unbound `pending` placeholder only when its Artifact is `-`. Otherwise append a new row for the new artifact.',
    );
  });

  it.each([
    ['quick', 0],
    ['spec-driven', 1],
  ] as const)(
    'in a %s scaffold (%i design placeholder before the review)',
    (mode: WorkflowMode, placeholders: number) => {
      const plan = applyTemplateReplacements(
        read('.oat/templates/plan.md'),
        'demo',
        '2026-11-03',
        '2026-11-03T00:00:00.000Z',
        mode,
      );
      expect(artifactRows(plan, 'design')).toHaveLength(placeholders);

      const reviewed = recordReviewEvent(plan, {
        scope: 'design',
        type: 'artifact',
        artifact: 'reviews/artifact-design-review-2026-11-03T000000Z.md',
      });

      expect(artifactRows(reviewed, 'design')).toEqual([
        '| design | artifact | received | 2026-11-03 | reviews/artifact-design-review-2026-11-03T000000Z.md | - | - | - |',
      ]);
    },
  );
});
