import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

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
      "Under `OAT_AUTONOMOUS=1`, or with no operator channel, the receiver records the class, creates no fix work for that finding, commits the receive's bookkeeping and stops at a `product-judgment` boundary",
    );
  });

  it('adds no allowance and leaves counts, verdicts, cycles and gate attempts unchanged', () => {
    expect(classes).toContain(
      'Routing a finding to the operator changes no count, severity, verdict, Reviews status rule, review-cycle count or gate attempt, and adds no allowance: a blocking gate stays blocked, and its `onFailure` policy and attempt count apply to the result as before.',
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
      'Under `OAT_AUTONOMOUS=1` (`REVIEWRECEIVE-10`), create no fix work for it, finish and commit the receive bookkeeping (Steps 7 to 7.6), and stop at a `product-judgment` boundary',
    );
    expect(step26).toContain(
      'Routing changes no count, severity, verdict, status rule, review-cycle count or gate attempt.',
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
      "A finding routed to the operator records the operator's decision as its disposition (`operator: accepted as a requirement`, `operator: deferred` or `operator: rejected`, with the operator's reason), or `awaiting operator` when the run stopped at the `REVIEWRECEIVE-10` boundary.",
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
      step11.split('- Routed to the operator: {IDs and classes, or none}'),
    ).toHaveLength(3);
  });

  it('REVIEWRECEIVE-10 stops at a product-judgment boundary', () => {
    const row = autonomyRow(readRepoFile(AUTONOMY), 'REVIEWRECEIVE-10');
    expect(row).toContain('Finding routed to the operator');
    expect(row).toContain('Accept as a requirement, defer, or reject');
    expect(row).toContain(
      'create no fix task, edit or deferral for a `new-hardening` finding, an `accepted-requirement` that cites no source, or an unclassified finding',
    );
    expect(row).toContain('`boundary:product-judgment`');
  });
});
