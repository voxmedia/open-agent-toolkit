import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Complexity review at budget exhaustion.
 *
 * Every review or gate budget-exhaustion point dispatches one complexity review
 * defined by the shared `complexity-review-fallback.md` doc, shows its decision
 * message (or carries it in the autonomous boundary report), and records the
 * operator's choice. Agents never select the disposition. One row per
 * exhaustion point, so deleting a pointer fails at the site it left.
 */

const REPO_ROOT = join(import.meta.dirname, '../../../../../../../');
const SHARED_DOC = '.agents/docs/complexity-review-fallback.md';
const VENDORED_DOC = 'references/docs/complexity-review-fallback.md';

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function sliceBetween(content: string, start: string, end: string): string {
  const startIndex = content.indexOf(start);
  if (startIndex < 0) {
    throw new Error(`Missing section start: ${start}`);
  }
  const endIndex = content.indexOf(end, startIndex + start.length);
  if (endIndex < 0) {
    throw new Error(`Missing section end after ${start}: ${end}`);
  }
  return content.slice(startIndex, endIndex);
}

interface ExhaustionPoint {
  name: string;
  skill: string;
  file: string;
  start: string;
  end: string;
}

const IMPLEMENT = 'oat-project-implement';
const PHASE_EXECUTION = `.agents/skills/${IMPLEMENT}/references/phase-execution.md`;
const COMPLETION = `.agents/skills/${IMPLEMENT}/references/completion-and-closeout.md`;

const RECEIVE = 'oat-project-review-receive';
const RECEIVE_STEP_8 = {
  start: '### Step 8: Check Review Cycle Count',
  end: '### Step 8.5: Final Scope Deferred-Medium Resurfacing',
};

const EXHAUSTION_POINTS: readonly ExhaustionPoint[] = [
  {
    name: 'implement root review cap',
    skill: IMPLEMENT,
    file: PHASE_EXECUTION,
    start: '#### Bounded Fix and Re-Review Loop',
    end: '### Optional External Phase Review Gate',
  },
  {
    name: 'implement phase gate exhaustion',
    skill: IMPLEMENT,
    file: PHASE_EXECUTION,
    start: '### Optional External Phase Review Gate',
    end: '#### Reviews Ledger Mutation Contract',
  },
  {
    name: 'implement final review cap',
    skill: IMPLEMENT,
    file: COMPLETION,
    start: '**If final review is not marked `passed`:**',
    end: '### Step 14: Gate Execution',
  },
  {
    name: 'implement exit gate maxAttempts',
    skill: IMPLEMENT,
    file: COMPLETION,
    start: '5. Do not route policy from a generic nonzero exit.',
    end: '6. Runtime selection note',
  },
  {
    name: 'review-receive cycle cap',
    skill: RECEIVE,
    file: `.agents/skills/${RECEIVE}/SKILL.md`,
    ...RECEIVE_STEP_8,
  },
];

function expectExhaustionPointer(raw: string, name: string): void {
  // Prose wraps freely, so assertions run over whitespace-normalized text.
  const section = raw.replace(/\s+/g, ' ');
  expect(section, `${name} points at the shared doc`).toContain(VENDORED_DOC);

  const dispatch = /dispatch the complexity review/i.exec(section);
  expect(dispatch, `${name} dispatches the complexity review`).not.toBeNull();
  const decision = section.search(/decision message/i);
  const boundary = section.search(/OAT_AUTONOMOUS=1[^.]*boundary report/i);
  expect(decision, `${name} presents a decision message`).toBeGreaterThan(-1);
  expect(
    boundary,
    `${name} carries the decision into the autonomous boundary report`,
  ).toBeGreaterThan(-1);
  expect(
    dispatch!.index,
    `${name} dispatches before the decision message`,
  ).toBeLessThan(decision);
  expect(
    dispatch!.index,
    `${name} dispatches before the boundary report`,
  ).toBeLessThan(boundary);
  expect(section, `${name} records the choice with the report path`).toMatch(
    /record the operator's choice with the report path in `implementation\.md`/i,
  );
  expect(section, `${name} forbids agent-selected dispositions`).toMatch(
    /Agents never select the disposition/,
  );
}

describe('complexity review at budget exhaustion', () => {
  it('defines the shared doc once and vendors it into each owning skill', () => {
    const doc = readRepoFile(SHARED_DOC);

    for (const skill of new Set(EXHAUSTION_POINTS.map((row) => row.skill))) {
      expect(
        existsSync(join(REPO_ROOT, '.agents/skills', skill, VENDORED_DOC)),
        `${skill} vendors the shared doc`,
      ).toBe(true);
      expect(doc, `the doc lists ${skill}`).toContain(`\`${skill}\``);
    }

    // Probe order: user agents, user Claude, then repository skills.
    const probe = [
      '${HOME:-}/.agents/skills/complexity-review/SKILL.md',
      '${HOME:-}/.claude/skills/complexity-review/SKILL.md',
      '$REPO_ROOT/.agents/skills/complexity-review/SKILL.md',
    ].map((candidate) => doc.indexOf(candidate));
    expect(probe.every((index) => index > -1)).toBe(true);
    expect(probe[0]).toBeLessThan(probe[1]!);
    expect(probe[1]).toBeLessThan(probe[2]!);

    expect(doc).toMatch(
      /writes nothing, commits nothing, and launches nothing/,
    );
    expect(doc).toContain('Agents never select the disposition');
    expect(doc).toMatch(/OAT_AUTONOMOUS=1[^.]*boundary report/);
    expect(doc).toContain('`simplify`');
  });

  it.each(EXHAUSTION_POINTS)(
    'dispatches the complexity review at the $name',
    ({ name, file, start, end }) => {
      expectExhaustionPointer(
        sliceBetween(readRepoFile(file), start, end),
        name,
      );
    },
  );

  it('offers simplify at the receive cycle cap and keeps its count', () => {
    const step8 = sliceBetween(
      readRepoFile(`.agents/skills/${RECEIVE}/SKILL.md`),
      RECEIVE_STEP_8.start,
      RECEIVE_STEP_8.end,
    );
    const menu = step8.slice(step8.indexOf('Review cycle limit reached'));

    // The three-cycle cap and the gate-artifact exclusion are unchanged.
    expect(step8).toContain('**If 3 or more cycles:**');
    expect(step8).toContain('grep -q "oat_review_invocation: gate"');
    // A saved complexity report names the scope but is not a review cycle.
    expect(step8).toMatch(/complexity-\*\) continue ;;/);
    // Simplify joins the existing dispositions in the menu.
    expect(menu).toMatch(/\d\. Simplify/);
    for (const option of [
      'Review findings manually and decide which to address',
      'Proceed to PR with current state',
      'Request explicit user override to continue',
    ]) {
      expect(menu).toContain(option);
    }
  });

  it('logs root judgment and keeps logging out of dispatched children', () => {
    const appendPoints = sliceBetween(
      readRepoFile(`.agents/skills/${IMPLEMENT}/SKILL.md`),
      '## Project Log Append Points',
      '## Autonomy Policy',
    ).replace(/\s+/g, ' ');

    expect(appendPoints).toContain('oat project log append --help');
    expect(appendPoints).toContain('the helper no-ops when the feature is off');
    expect(appendPoints).toMatch(
      /root-judgment entr(?:y|ies)[\s\S]*?oat project log append/i,
    );
    expect(appendPoints).toContain(
      'breaks, surprises, workarounds, or notable successes',
    );
    expect(appendPoints).toMatch(/relayed\s+from\s+subagent\s+reports/i);
    expect(appendPoints).toMatch(/queue[\s\S]*?next bookkeeping boundary/i);
    expect(appendPoints).toMatch(
      /Phase implementers and dispatched subagents have no\s+logging duties/,
    );
  });
});
