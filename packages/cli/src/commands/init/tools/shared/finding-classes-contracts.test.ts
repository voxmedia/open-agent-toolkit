import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  convergenceLogTokens,
  type GateConvergence,
} from '@commands/gate/convergence';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Finding classes at receive (m03, p14; Outcome 5, BL-261013).
 *
 * Every project review and gate receive records one class per finding
 * (`bookkeeping`, `regression`, `accepted-requirement` citing its contract
 * source, or `new-hardening`) in the receipt it already writes. The class
 * vocabulary and the operator routing live once, in
 * `.agents/docs/bookkeeping-findings.md`, beside m01's bookkeeping definition.
 * A finding no contract source requires reaches the operator before any fix
 * work exists, and the complexity-review fallback starts from the recorded
 * classes.
 */

const REPO_ROOT = join(import.meta.dirname, '../../../../../../../');
const SHARED_DOC = '.agents/docs/bookkeeping-findings.md';
const RECEIVE = '.agents/skills/oat-project-review-receive/SKILL.md';
const AUTONOMY = '.agents/docs/autonomy-contract.md';

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ');
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

function section(doc: string, heading: string): string {
  const start = doc.indexOf(`\n## ${heading}\n`);
  if (start < 0) {
    throw new Error(`Missing doc section: ${heading}`);
  }
  const next = doc.indexOf('\n## ', start + 1);
  return doc.slice(start, next < 0 ? doc.length : next);
}

function autonomyRow(contract: string, id: string): string {
  const row = contract.split('\n').find((line) => line.startsWith(`| ${id} `));
  if (!row) {
    throw new Error(`Missing autonomy row ${id}`);
  }
  return normalize(row);
}

/** The routing partition, exactly as the shared doc ships it. */
function routingSnippet(doc: string): string {
  const routing = sliceBetween(
    section(doc, 'Finding classes at receive'),
    '**Routing.**',
    'The operator decides each finding routed to it',
  );
  const match = /```bash\n([\s\S]*?)```/.exec(routing);
  if (!match) {
    throw new Error('Missing routing snippet');
  }
  return match[1]!;
}

function route(snippet: string, findingClasses: string): string[] {
  return execFileSync('bash', ['-c', snippet], {
    encoding: 'utf8',
    env: { ...process.env, FINDING_CLASSES: findingClasses },
  })
    .trim()
    .split('\n');
}

describe('shared finding classes (p14)', () => {
  const doc = readRepoFile(SHARED_DOC);
  const classes = normalize(section(doc, 'Finding classes at receive'));

  it('records exactly one of the four classes per finding before any fix work', () => {
    expect(classes).toContain(
      'Every project review and gate receive records exactly one class for each finding of the result before it creates any fix task, execution record, artifact edit or deferral for that finding.',
    );
    for (const row of [
      '| `bookkeeping` | The finding meets the definition above, its exclusions and its limits | none |',
      '| `regression` | The reviewed change broke behavior that worked before it | what broke |',
      '| `accepted-requirement` | A contract source requires what the finding asks for | the contract source |',
      '| `new-hardening` | No contract source requires it: it asks for a guarantee, safeguard or behavior beyond the contract | none |',
    ]) {
      expect(classes, row).toContain(row);
    }
    expect(classes).toContain(
      'When more than one class fits, the first in this order wins: `bookkeeping`, `regression`, `accepted-requirement`, `new-hardening`.',
    );
    expect(classes).toContain(
      'a finding the receiver cannot tie to a contract source is `new-hardening`.',
    );
  });

  it('reuses the m01 bookkeeping definition rather than a second classifier', () => {
    expect(classes).toContain(
      '| `bookkeeping` | The finding meets the definition above',
    );
    expect(normalize(doc)).toContain(
      'Bookkeeping is one of those classes, decided by the definition below.',
    );
  });

  it('names the contract sources and never lets a reviewed artifact cite itself', () => {
    for (const source of [
      "the project's requirement artifacts: `discovery.md`, `spec.md` and `design.md`; the imported plan in import mode; and, in lite, brief and goal modes, the requirement sections of `plan.md`",
      "for a code review, the approved plan's tasks or phase blocks that cover the reviewed work",
      'the backlog items the project closes and the decision records under `.oat/repo/reference/decisions/`',
      'the repository instructions every change must meet (the applicable `AGENTS.md` files)',
    ]) {
      expect(classes, source).toContain(source);
    }
    expect(classes).toContain(
      'A reviewed artifact is never its own contract source: a plan review cites what the plan was built from, never the plan.',
    );
  });

  it('records the classes in one receipt line and adds no Reviews column or status', () => {
    expect(classes).toContain(
      'The receipt each path already writes carries one line beside its `**Findings:**` line. It adds no Reviews column, status or record:',
    );
    expect(classes).toContain(
      '**Finding classes:** H1 accepted-requirement (spec.md FR3) · M1 regression (first-run gate envelope) · M2 new-hardening · L1 bookkeeping',
    );
  });

  it('sends a finding no contract source requires to the operator before fix work, in every mode and under autonomy', () => {
    expect(classes).toContain(
      'reaches the operator before any fix work, edit or deferral exists for it.',
    );
    expect(classes).toContain(
      "accept it as a requirement (it is then recorded `accepted-requirement` citing that decision and handled like any other), defer it (one `## Deferred Findings` line that names the operator), or reject it (recorded with the operator's reason).",
    );
    expect(classes).toContain(
      'No receive mode decides such a finding by its own defaults.',
    );
    expect(classes).toContain(
      'Under `OAT_AUTONOMOUS=1`, or with no operator channel, the receiver records the class and creates no fix work for that finding; what happens next depends on its severity:',
    );
  });

  it('stops an autonomous run only for an uncited Critical or High finding (operator decision, 2026-11-08)', () => {
    expect(classes).toContain(
      "- **Critical or High:** the run stops. The receiver commits the receive's bookkeeping and stops at a `product-judgment` boundary that lists each such finding with its missing source.",
    );
    expect(classes).toContain(
      "- **Medium or Low:** the run does not stop. The finding's entry in the `**Finding classes:**` line ends with `, awaiting operator` (for example `L2 new-hardening, awaiting operator`), it gets no fix task, edit or deferral, and the run lists it at its next stop or in its boundary report.",
    );
    expect(classes).toContain('the classes line is never rewritten.');
  });

  it('adds no allowance and leaves counts, verdicts, cycles and gate attempts unchanged', () => {
    expect(classes).toContain(
      'Routing a finding to the operator changes no count, severity, verdict, Reviews status rule, review-cycle count or gate attempt, and adds no allowance: a blocking gate stays blocked, and its `onFailure` policy and attempt count apply to the result as before.',
    );
  });

  it('leaves the pass rule unmet after a rejected or deferred blocking finding', () => {
    expect(classes).toContain(
      "Nor does the operator's decision change them. Rejecting or deferring a Critical or High finding leaves the review's pass rule unmet and a blocking gate blocked, so the run continues through the path's existing retry limit and exhaustion stop, where the operator decides the disposition (for example `proceed with override`); only accepting it as a requirement makes it fix work.",
    );
  });
});

describe('class routing fixture (p14 exit evidence)', () => {
  const snippet = routingSnippet(readRepoFile(SHARED_DOC));

  // Fixture derived from the incident BL-261013 records: the artifact-cleanup
  // exit gate asked for safety between two simultaneous archive runs of one
  // project, a guarantee no discovery, design or decision record named (root
  // AGENTS.md, "Before turning a review or gate finding into a fix task").
  // H1 is that finding, classed new-hardening because it cites no source; M1
  // is the accepted-requirement control, which cites one.
  const INCIDENT =
    'H1 new-hardening · M1 accepted-requirement (discovery.md Requirements: archived projects move under .oat/projects/archived)';

  it('routes the uncited new-hardening finding to the operator, never to a plan task', () => {
    const routed = route(snippet, INCIDENT);

    expect(routed).toContain('operator H1');
    expect(routed).not.toContain('fix H1');
  });

  it('still turns the cited accepted-requirement control into fix work', () => {
    const routed = route(snippet, INCIDENT);

    expect(routed).toEqual(['operator H1', 'fix M1']);
  });

  it('treats an accepted-requirement that cites no source as uncited', () => {
    expect(
      route(snippet, 'M2 accepted-requirement · M3 accepted-requirement ()'),
    ).toEqual(['operator M2', 'operator M3']);
  });

  it('sends regression and bookkeeping findings to fix work and anything unknown to the operator', () => {
    expect(
      route(
        snippet,
        'H2 regression (gate suite first-run envelope) · M4 regression · L1 bookkeeping · L2 nit · L3',
      ),
    ).toEqual(['fix H2', 'fix M4', 'fix L1', 'operator L2', 'operator L3']);
  });
});

describe('review-receive records classes and routes to the operator (p14)', () => {
  const skill = readRepoFile(RECEIVE);
  const step26 = normalize(
    sliceBetween(
      skill,
      '### Step 2.6: Select Review Handling Mode (Required)',
      '### Step 3: Determine Task Scope',
    ),
  );

  it('records one class per finding in the register and the overview', () => {
    const step2 = normalize(
      sliceBetween(skill, '### Step 2: Parse Findings', '### Step 2.6'),
    );
    expect(step2).toContain(
      '- Class: exactly one of `bookkeeping`, `regression` (naming what broke), `accepted-requirement` (citing its contract source) or `new-hardening`, under the "Finding classes at receive" section of `references/docs/bookkeeping-findings.md`',
    );
    expect(step2).toContain(
      '- Class: {bookkeeping | regression ({what broke}) | accepted-requirement ({contract source}) | new-hardening}',
    );
    expect(step2).toContain(
      '- Every finding must include exactly one `Class` line.',
    );
  });

  it('routes classes in every mode after the bookkeeping-only check, before the mode bullets', () => {
    const paragraph = step26.indexOf(
      '**Finding classes and operator routing (every result, every mode).**',
    );
    expect(paragraph).toBeGreaterThan(
      step26.indexOf('**Bookkeeping-only mode (checked first'),
    );
    expect(paragraph).toBeLessThan(
      step26.indexOf('- If `oat_review_type == artifact`:'),
    );
    expect(step26).toContain(
      'A `new-hardening` finding, an `accepted-requirement` that cites no source, or a finding with no recorded class reaches the operator before any fix work, edit or deferral exists for it; the auto-disposition and judgment-sweep defaults never decide it.',
    );
    expect(step26).toContain(
      'Under `OAT_AUTONOMOUS=1` (`REVIEWRECEIVE-10`), create no fix work for it. When such a finding is Critical or High, finish and commit the receive bookkeeping (Steps 7 to 7.6) and stop at a `product-judgment` boundary',
    );
    expect(step26).toContain(
      "A Medium or Low one does not stop the run: record its entry `awaiting operator`, continue with the result's other findings, and list it in the Step 11 summary and at the run's next stop or in its boundary report.",
    );
    expect(step26).toContain(
      "Routing changes no count, severity, verdict, status rule, review-cycle count or gate attempt, and neither does the operator's decision: a rejected or deferred Critical or High finding leaves the pass rule unmet, so the existing cycle cap and exhaustion stop apply.",
    );
  });

  it('creates fix tasks only for findings the class routing sends to fix work', () => {
    const step5 = normalize(
      sliceBetween(
        skill,
        '### Step 5: Convert Findings to Tasks',
        '**For each Critical, High, and Medium finding (default):**',
      ),
    );
    expect(step5).toContain(
      "Only findings that Step 2.6's class routing sends to fix work become tasks. A finding routed to the operator gets no task until the operator accepts it as a requirement",
    );
  });

  it('writes the classes line beside the Findings line of the receipt', () => {
    const step7 = sliceBetween(
      skill,
      '### Step 7: Update Implementation.md',
      '### Step 7.5',
    );
    expect(step7).toContain(
      '**Findings:** Critical {N} · High {N} · Medium {N} · Low {N}\n**Finding classes:** {finding_id} {class} ({contract source | what broke}) · {finding_id} {class} · …',
    );
    expect(normalize(step7)).toContain(
      "A finding routed to the operator records the operator's decision as its disposition (`operator: accepted as a requirement`, `operator: deferred` or `operator: rejected`, with the operator's reason), or `awaiting operator` when the operator has not decided it yet: the run stopped at the `REVIEWRECEIVE-10` boundary, or, for a Medium or Low finding under autonomy, the run continued and the finding's `**Finding classes:**` entry ends with `, awaiting operator`.",
    );
  });

  it('reports the classes and the operator-routed findings in both summaries', () => {
    const step11 = sliceBetween(
      skill,
      '### Step 11: Output Summary',
      '## Re-Review Scoping',
    );
    expect(
      step11.split('- Finding classes: {ID -> class (citation)}'),
    ).toHaveLength(3);
    expect(
      step11.split(
        '- Routed to the operator: {IDs and classes, each `awaiting operator` or with its decision, or none}',
      ),
    ).toHaveLength(3);
  });

  it('REVIEWRECEIVE-10 stops only for a Critical or High finding at a product-judgment boundary', () => {
    const row = autonomyRow(readRepoFile(AUTONOMY), 'REVIEWRECEIVE-10');
    expect(row).toContain('Finding routed to the operator');
    expect(row).toContain('Accept as a requirement, defer, or reject');
    expect(row).toContain(
      'create no fix task, edit or deferral for a `new-hardening` finding, an `accepted-requirement` that cites no source, or an unclassified finding',
    );
    expect(row).toContain(
      'for a Critical or High one, commit the receive bookkeeping and stop, listing each such finding with its missing source; a Medium or Low one does not stop the run: record it `awaiting operator` and list it at the next stop or boundary report; a rejected or deferred Critical or High one leaves the pass rule unmet;',
    );
    expect(row).toContain('`boundary:product-judgment`');
  });

  it.each([
    [
      'REVIEWRECEIVE-03',
      'Convert valid fix-routed findings to fix tasks (`REVIEWRECEIVE-10` decides the rest);',
    ],
    [
      'REVIEWRECEIVE-04',
      'Default to conversion of fix-routed findings only (`REVIEWRECEIVE-10`);',
    ],
    [
      'REVIEWRECEIVE-05',
      'Convert in-scope fix-routed Lows by default (`REVIEWRECEIVE-10` decides the rest);',
    ],
  ])('%s converts only fix-routed findings by default', (id, clause) => {
    expect(autonomyRow(readRepoFile(AUTONOMY), id)).toContain(clause);
  });
});

describe('implement review and gate paths record classes (p14)', () => {
  const phaseExecution = readRepoFile(
    '.agents/skills/oat-project-implement/references/phase-execution.md',
  );
  const closeout = readRepoFile(
    '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
  );

  it('classifies a per-phase round before the fix child and holds an operator-routed Critical or High', () => {
    const loop = normalize(
      sliceBetween(
        phaseExecution,
        '#### Bounded Fix and Re-Review Loop',
        'On Critical/High findings:',
      ),
    );
    expect(loop).toContain(
      '**Finding classes (every round, before step 1).** Record one class per finding of the round under the "Finding classes at receive" section of `references/docs/bookkeeping-findings.md`',
    );
    expect(loop).toContain(
      "Only findings that section routes to fix work enter step 2's bounded findings.",
    );
    expect(loop).toContain(
      'dispatch no fix child for the round until the operator decides it; under `OAT_AUTONOMOUS=1` (`IMPLEMENT-21`), commit the receipt and stop at a `product-judgment` boundary.',
    );
    expect(loop).toContain(
      "A Medium or Low finding routed there gets no fix task or deferral until the operator decides it, and it does not stop the run: in an autonomous run its receipt entry ends with `, awaiting operator`, and the root lists it at the run's next stop or in its boundary report.",
    );
    expect(loop).toContain(
      'The retry limit, the pass rule and the review-cycle cap are unchanged.',
    );
    expect(loop).toContain(
      'A Critical or High finding the operator rejects or defers still fails the pass rule, so the round continues through the retry limit to the exhaustion stop below; only accepting it as a requirement gives the fix child work.',
    );
  });

  it('sends only fix-routed phase gate findings to the phase implementer', () => {
    const gate = normalize(
      sliceBetween(
        phaseExecution,
        '### Optional External Phase Review Gate',
        '#### Reviews Ledger Mutation Contract',
      ),
    );
    expect(gate).toContain(
      "Only findings it routes to fix work go to the phase implementer; a Critical or High finding it routes to the operator holds the gate's fix round until the operator decides it (`REVIEWRECEIVE-10` under autonomy), and a routed Medium or Low gets no fix work and is recorded `awaiting operator` under autonomy without stopping the run. The gate verdict and the gate retry limit apply as before: a rejected or deferred blocking finding leaves the gate blocked, so the gate's retry limit and exhaustion stop apply.",
    );
  });

  it('keeps the classes line in the per-phase review record', () => {
    const step7b = normalize(
      sliceBetween(
        phaseExecution,
        '#### Step 7b: Post-Review Bookkeeping',
        'Phase row transitions:',
      ),
    );
    expect(step7b).toContain(
      "Either record carries the round's `**Finding classes:**` line whenever the round has findings.",
    );
  });

  it('routes an uncited final review finding to the operator on both routes', () => {
    const step13 = normalize(
      sliceBetween(
        closeout,
        '### Step 13: Trigger Final Review',
        '### Step 14: Gate Execution',
      ),
    );
    expect(step13).toContain(
      "A finding it routes to the operator gets no fix task. For a Critical or High one, the run stops at receive's `REVIEWRECEIVE-10` boundary until the operator decides it; a Medium or Low one is recorded `awaiting operator`, the run continues, and the finding is listed at the run's next stop or in its boundary report.",
    );
    expect(step13).toContain(
      'a finding no contract source requires reaches the operator before any fix task exists for it',
    );
  });

  it('leaves the exit gate status, policy and attempts unchanged by routing', () => {
    const step14 = normalize(
      sliceBetween(
        closeout,
        '### Step 14: Gate Execution',
        '### Step 15: Final HiLL Closeout Sequence',
      ),
    );
    expect(step14).toContain(
      'A finding it routes to the operator gets no remediation work until the operator decides it (a Medium or Low one is recorded `awaiting operator` under autonomy without a stop). That routing changes no envelope status, `on_failure` policy or `attempts_completed`; an attempt is consumed only as the `block` rule below states.',
    );
    expect(step14).toContain(
      "Neither does the operator's decision: a rejected or deferred blocking finding leaves the outcome `block`, so `maxAttempts` and the exhaustion stop apply.",
    );
  });

  it('applies the same routing to the goal milestone exit gate', () => {
    const milestone = normalize(
      sliceBetween(
        closeout,
        '### Goal Milestone Closeout',
        '### Step 11: Prepare Final Closeout Baseline',
      ),
    );
    expect(milestone).toContain(
      'Receive records one class per finding of the gate result and routes a finding no contract source requires to the operator, as Step 14 states; the carrier rules above are unchanged.',
    );
  });

  it('IMPLEMENT-21 stops a round at a product-judgment boundary', () => {
    const row = autonomyRow(readRepoFile(AUTONOMY), 'IMPLEMENT-21');
    expect(row).toContain('Phase review finding for the operator');
    expect(row).toContain(
      'dispatch no fix child for a round whose Critical or High finding is `new-hardening`, an `accepted-requirement` that cites no source, or unclassified',
    );
    expect(row).toContain(
      'a routed Medium or Low gets no fix task and no stop: record it `awaiting operator` and list it at the next stop or boundary report; a rejected or deferred Critical or High one leaves the pass rule unmet;',
    );
    expect(row).toContain('`boundary:product-judgment`');
  });
});

describe('planning review and gate paths record classes (p14)', () => {
  const GATE_SKILLS = [
    'oat-project-quick-start',
    'oat-project-plan',
    'oat-project-import-plan',
    'oat-project-brief',
    'oat-project-goal',
    'oat-project-lite',
    'oat-project-discover',
    'oat-project-design',
  ] as const;

  it.each(GATE_SKILLS)(
    '%s Gate Execution routes an uncited gate finding to the operator with attempts unchanged',
    (skill) => {
      const content = normalize(
        readRepoFile(`.agents/skills/${skill}/SKILL.md`),
      );
      const paragraph =
        'Review-receive records one class per finding of the gate result, in its Step 2.6 under `references/docs/bookkeeping-findings.md`. A finding it routes to the operator (`new-hardening`, or an `accepted-requirement` that cites no source) gets no remediation edit until the operator decides it; under `OAT_AUTONOMOUS=1` receive stops at `REVIEWRECEIVE-10` for a Critical or High one and records a Medium or Low one `awaiting operator` without stopping. The `onFailure` policy and the attempt count apply to the result unchanged, whatever the operator decides.';
      expect(content).toContain(paragraph);
      // Beside the bookkeeping-only settlement, inside Gate Execution.
      expect(content.indexOf(paragraph)).toBeGreaterThan(
        content.indexOf(
          'A receive-eligible `blocked` result that review-receive settled in its bookkeeping-only mode',
        ),
      );
    },
  );

  it('plan-writing classifies a plan result before applying or offering any fix', () => {
    const loop = normalize(
      sliceBetween(
        readRepoFile('.agents/skills/oat-project-plan-writing/SKILL.md'),
        '4. **Apply or offer fixes by severity**',
        '5. **Rewrite and re-dispatch within the bound**',
      ),
    );
    expect(loop).toContain(
      '- Finding classes (`plan` target, every result): before applying or offering any fix, record one class per finding under the "Finding classes at receive" section of `references/docs/bookkeeping-findings.md`. The bullets below apply only to findings that section routes to fix work.',
    );
    expect(loop).toContain(
      'is never applied as a Critical or High default fix or offered as a routine Medium or Low edit: it goes to the operator before any edit for it. Under `OAT_AUTONOMOUS=1` a Critical or High one stops the loop at a `product-judgment` boundary, and a Medium or Low one is recorded `awaiting operator` with no edit and the loop continues.',
    );
    expect(loop).toContain('A reviewed plan is never its own contract source.');
  });

  it('plan-writing records the classes line with the outcome', () => {
    const outcome = normalize(
      sliceBetween(
        readRepoFile('.agents/skills/oat-project-plan-writing/SKILL.md'),
        '6. **Record the outcome**',
        '## Canonical Plan Format',
      ),
    );
    expect(outcome).toContain(
      "For `plan`, record the step 4 classes with the outcome as one `**Finding classes:**` line in the shared definition's format, together with the operator's decision on each operator-routed finding.",
    );
  });

  it.each(['oat-project-brief', 'oat-project-goal'] as const)(
    '%s Step 3.6 treats a new-hardening finding as material',
    (skill) => {
      const content = normalize(
        readRepoFile(`.agents/skills/${skill}/SKILL.md`),
      );
      expect(content).toMatch(
        /a finding no contract source requires \(`new-hardening`\) (is a material finding: it goes back to the user before any edit|is a material finding that goes back to the user before any edit)\. Under autonomy a Critical or High one stops the loop, and a Medium or Low one is recorded `awaiting operator` with no edit\./i,
      );
    },
  );

  it('the brief contract review ladder returns an uncited finding to the user', () => {
    const ladder = normalize(
      section(
        readRepoFile(
          '.agents/skills/oat-project-brief/references/brief-contract.md',
        ),
        '5. Review ladder',
      ),
    );
    expect(ladder).toContain(
      'A finding no contract source requires (`new-hardening`) returns to the user before any fix work exists for it, as a material finding does',
    );
  });

  it.each(['QS-11', 'LITE-08', 'BRIEF-09', 'GOAL-09', 'PLAN-09', 'IMPORT-08'])(
    '%s stops only an operator-routed Critical or High artifact-review finding',
    (id) => {
      const row = autonomyRow(readRepoFile(AUTONOMY), id);
      expect(row).toContain(
        'a Critical or High finding routed to the operator under `bookkeeping-findings.md` (`new-hardening`, or an `accepted-requirement` that cites no source) stops before any edit for it; a routed Medium or Low gets no edit, is recorded `awaiting operator` and is listed at the next stop or boundary report',
      );
      expect(row).toContain('`boundary:product-judgment`');
    },
  );
});

describe('complexity-review fallback starts from recorded classes and convergence (p14)', () => {
  const FALLBACK = '.agents/docs/complexity-review-fallback.md';
  const fallback = readRepoFile(FALLBACK);
  const flat = normalize(fallback);

  const tempDirs: string[] = [];
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gives the reviewer the recorded classes and the gate convergence marks', () => {
    expect(flat).toContain(
      '- **Recorded classes:** the `**Finding classes:**` line of each receipt in the loop, which records one class per finding under the "Finding classes at receive" section of `bookkeeping-findings.md`',
    );
    expect(flat).toContain(
      '- **Convergence (gate loops):** for each gate run of the loop, its convergence marks, read as [Convergence of a gate loop](#convergence-of-a-gate-loop) describes.',
    );
  });

  it('classifies open findings from the recorded classes, never re-deriving or rewriting them', () => {
    const open = normalize(
      sliceBetween(
        fallback,
        '- **Open findings:**',
        '- **Dissolvable findings:**',
      ),
    );
    expect(open).toContain(
      "start from the class each finding's receipt recorded: `bookkeeping`, `accepted-requirement` (the contract requires it; carry its cited source), `regression` (the change broke something that worked), or `new-hardening` (a new demand beyond the contract).",
    );
    expect(open).toContain(
      'Classify only a finding no receipt classified, and mark it `unrecorded`.',
    );
    expect(open).toContain(
      'keep the recorded class and add the disagreement as a note; never rewrite it.',
    );
    expect(open).toContain(
      'for a gate loop the findings its convergence marks carry over from run to run.',
    );
  });

  it("puts the recorded classes and each gate run's counts in the exhaustion stop", () => {
    expect(flat).toContain(
      "why the loop stopped: the budget, the count reached, and the findings still blocking with their recorded classes; for a gate loop, also each run's new, carried-over and resolved counts from [Convergence of a gate loop](#convergence-of-a-gate-loop);",
    );
    expect(flat).toContain(
      'presents the decision with the loop-stop reasons alone, recorded classes and convergence counts included.',
    );
    expect(flat).toContain(
      'Report such runs as they are, never as zero counts.',
    );
    expect(flat).toContain(
      'The marks are read only; nothing recomputes or rewrites them.',
    );
  });

  it('reads each run of the m02 exit-gate sequence from the gate log by run ID', () => {
    const block = sliceBetween(
      fallback,
      '### Convergence of a gate loop',
      '### Routing outside implement',
    );
    const match = /```bash\n([\s\S]*?)```/.exec(block);
    expect(match).not.toBeNull();
    const snippet = match![1]!;

    // Provenance: the three real m02 exit-gate runs of this repository's
    // review-gate-integrity-goal project (project-log.md entries written by
    // the released 0.3.45 gate, run IDs from the archived range-review
    // artifacts). Runs 2 and 3 carry the tokens the branch gate appends,
    // produced here by p08's own `convergenceLogTokens` with the counts p08's
    // m02 sequence probe recorded (r2 1/0/2, r3 0/0/1).
    const r1 = '93e1b0a1-9b04-4c31-9aa2-e032b9820a9d';
    const r2 = 'd738cd0e-5795-48ef-a387-e3ec184f90e5';
    const r3 = '81c12aac-482e-4ffd-93f3-b796e9c4ae76';
    const stuck = '0f0f0f0f-0000-4000-8000-000000000001';
    const unparsable = '0f0f0f0f-0000-4000-8000-000000000002';
    const unlogged = '0f0f0f0f-0000-4000-8000-000000000003';
    const subject = { kind: 'milestone', value: 'm02' } as const;
    const marks = (
      run: number,
      previous: string,
      rest: Pick<GateConvergence, 'status' | 'counts' | 'reason'>,
    ): string =>
      convergenceLogTokens({
        sequence: {
          reviewType: 'code',
          subject,
          run,
          previousRun: {
            runId: previous,
            artifactPath: 'reviews/archived/previous.md',
            generatedAt: '2026-11-03T21:56:01Z',
          },
        },
        ...rest,
      });
    const entry = (heading: string, body: string): string =>
      `### ${heading}\n\n${body}\n`;
    const log = [
      '# Project Log\n',
      entry(
        '2026-11-03 · structural · oat gate review · p07-p13',
        `target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-03T215601Z.md run=${r1}`,
      ),
      entry(
        '2026-11-03 · structural · oat gate review · p07-p-rev2',
        `target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-03T224623Z.md${marks(2, r1, { status: 'compared', counts: { new: 1, carriedOver: 0, resolved: 2 } })} run=${r2}`,
      ),
      entry(
        '2026-11-04 · structural · oat gate review · p07-p-rev3',
        `target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-04T015726Z.md${marks(3, r2, { status: 'compared', counts: { new: 0, carriedOver: 0, resolved: 1 } })} run=${r3}`,
      ),
      entry(
        '2026-11-04 · structural · oat gate review · p07-p13',
        `target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=1 status=blocked${marks(2, r1, { status: 'compared', counts: { new: 0, carriedOver: 2, resolved: 0 } })} run=${stuck}`,
      ),
      entry(
        '2026-11-04 · structural · oat gate review · p07-p13',
        `target=codex-6-sol-xhigh threshold=high exit=1 status=blocked${marks(2, r1, { status: 'unavailable', reason: 'previous_artifact_unparsable' })} run=${unparsable}`,
      ),
    ].join('\n');

    const projectPath = mkdtempSync(join(tmpdir(), 'oat-p14-convergence-'));
    tempDirs.push(projectPath);
    writeFileSync(join(projectPath, 'project-log.md'), log);

    const output = execFileSync(
      'bash',
      [
        '-c',
        `GATE_RUN_IDS=("${r1}" "${r2}" "${r3}" "${stuck}" "${unparsable}" "${unlogged}")\n${snippet}`,
      ],
      { encoding: 'utf8', env: { ...process.env, PROJECT_PATH: projectPath } },
    );

    expect(output.trim().split('\n')).toEqual([
      '93e1b0a1 no convergence marks',
      'd738cd0e convergence=new:1,carried:0,resolved:2 sequence=milestone:m02 sequence_run=2 previous_run=93e1b0a1',
      '81c12aac convergence=new:0,carried:0,resolved:1 sequence=milestone:m02 sequence_run=3 previous_run=d738cd0e',
      '0f0f0f0f convergence=new:0,carried:2,resolved:0 sequence=milestone:m02 sequence_run=2 previous_run=93e1b0a1',
      '0f0f0f0f convergence=unavailable:previous_artifact_unparsable sequence=milestone:m02 sequence_run=2 previous_run=93e1b0a1',
      '0f0f0f0f no convergence marks',
    ]);
  });
});
