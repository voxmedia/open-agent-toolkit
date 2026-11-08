import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  computeGateConvergence,
  convergenceLogTokens,
  findingLocationKey,
  findingLocationLine,
  findingTitleKey,
  markFindings,
  readPhaseIds,
  readSequenceProjectRecords,
  sequenceSubject,
  stableFindingKey,
  type SequenceProjectRecords,
} from './convergence';
import {
  parseReviewGateVerdict,
  type ReviewFindingRecord,
} from './review-verdict';

/**
 * Key-rule fixtures over per-finding records. Records are written in the
 * shape `parseReviewGateVerdict` emits; the titles and locations of the
 * m02-derived cases are taken from the captured m02 exit-gate artifacts.
 */
function record(
  id: string,
  title: string,
  location: string | null,
  severity: ReviewFindingRecord['severity'] = 'medium',
): ReviewFindingRecord {
  return { id, severity, title, location };
}

const M02_R1 = [
  record(
    'M1',
    'Preserve invalid Reviewed Head cells for exact-event validation',
    'packages/cli/src/commands/review/resolve.ts:430',
  ),
  record(
    'M2',
    'Resolve synced-project review ancestry in the source repository',
    'packages/cli/src/commands/review/head-ancestry.ts:65',
  ),
];
const M02_R2 = [
  record(
    'M1',
    'Keep an expired waiver from hiding a later pending review',
    'packages/cli/src/commands/review/pending.ts:329',
  ),
];

describe('stable finding key', () => {
  it('drops a trailing line reference and case from the location', () => {
    expect(
      findingLocationKey('packages/cli/src/commands/review/resolve.ts:430'),
    ).toBe('packages/cli/src/commands/review/resolve.ts');
    expect(findingLocationKey('Packages/X.ts:534-544')).toBe('packages/x.ts');
    expect(findingLocationKey('src/a.ts:12:3')).toBe('src/a.ts');
    expect(findingLocationKey('src/a.ts#L10-L20')).toBe('src/a.ts');
    expect(findingLocationKey('plan.md')).toBe('plan.md');
    expect(findingLocationKey(null)).toBeNull();
  });

  it('reads the first line of a trailing line reference', () => {
    expect(findingLocationLine('src/a.ts:430')).toBe(430);
    expect(findingLocationLine('src/a.ts:534-544')).toBe(534);
    expect(findingLocationLine('src/a.ts:12:3')).toBe(12);
    expect(findingLocationLine('src/a.ts#L10-L20')).toBe(10);
    expect(findingLocationLine('plan.md')).toBeNull();
    expect(findingLocationLine(null)).toBeNull();
  });

  it('ignores the advisory bookkeeping mark, case and punctuation in the title', () => {
    expect(
      findingTitleKey(
        'Refresh the human-readable next action from recorded state (bookkeeping)',
      ),
    ).toBe(
      findingTitleKey(
        'refresh the human readable next action, from recorded state',
      ),
    );
  });

  it('never reads the reviewer ID or severity', () => {
    const left = record('M1', 'Same title', 'a.ts:1', 'medium');
    const right = record('H7', 'Same title', 'a.ts:99', 'high');
    expect(stableFindingKey(left)).toBe(stableFindingKey(right));
    expect(stableFindingKey(left)).toBe('a.ts::same title');
  });
});

describe('markFindings', () => {
  it('reports the real m02 runs as converging: new, then resolved', () => {
    const second = markFindings(M02_R2, M02_R1, 'run-1');
    expect(second.counts).toEqual({ new: 1, carriedOver: 0, resolved: 2 });
    expect(second.findings.map((finding) => finding.mark)).toEqual(['new']);
    expect(second.resolved.map((finding) => finding.id)).toEqual(['M1', 'M2']);

    const third = markFindings([], M02_R2, 'run-2');
    expect(third.counts).toEqual({ new: 0, carriedOver: 0, resolved: 1 });
  });

  it('reports a stuck rerun as every finding carried over, with the earlier reference', () => {
    const renumbered = [M02_R1[1]!, M02_R1[0]!].map((finding, index) => ({
      ...finding,
      id: `M${index + 1}`,
    }));
    const marked = markFindings(renumbered, M02_R1, 'run-1');
    expect(marked.counts).toEqual({ new: 0, carriedOver: 2, resolved: 0 });
    expect(marked.findings.map((finding) => finding.previous)).toEqual([
      { runId: 'run-1', id: 'M2', severity: 'medium' },
      { runId: 'run-1', id: 'M1', severity: 'medium' },
    ]);
  });

  it('carries over a reworded finding at the same location and severity', () => {
    const reworded = [
      M02_R1[0]!,
      record(
        'M2',
        'Status still runs review ancestry in the nested tracking checkout',
        'packages/cli/src/commands/review/head-ancestry.ts:71',
      ),
    ];
    const marked = markFindings(reworded, M02_R1, 'run-1');
    expect(marked.counts).toEqual({ new: 0, carriedOver: 2, resolved: 0 });
    expect(marked.findings[1]).toMatchObject({
      mark: 'carried_over',
      previous: { runId: 'run-1', id: 'M2' },
    });
  });

  it('never carries over an unrelated finding that only shares a file and severity', () => {
    // The p08 review's counterexample: two distinct Medium findings on plan.md.
    const marked = markFindings(
      [record('M1', 'Outcome 3 lacks named evidence', 'plan.md:80')],
      [record('M1', 'Plan gate subject merges two amendments', 'plan.md:120')],
      'run-1',
    );
    expect(marked.findings[0]?.mark).toBe('new');
    expect(marked.counts).toEqual({ new: 1, carriedOver: 0, resolved: 1 });
  });

  it('never counts IDs or numbers as words that corroborate a rewording', () => {
    // The p08 review round 2 counterexample: two distinct Low findings on one
    // tracking file that share only the phase ID and `stale`.
    const marked = markFindings(
      [
        record(
          'L1',
          'p08 journal Head line is stale',
          'implementation.md:1953',
          'low',
        ),
      ],
      [
        record(
          'L1',
          'p08 Reviews row date is stale',
          'implementation.md:1960',
          'low',
        ),
      ],
      'run-1',
    );
    expect(marked.findings[0]?.mark).toBe('new');
    expect(marked.counts).toEqual({ new: 1, carriedOver: 0, resolved: 1 });
    // Task IDs and plain numbers do not corroborate either.
    expect(
      markFindings(
        [record('M1', 'p08-t04 step 12 drifted', 'plan.md:40')],
        [record('M1', 'p08-t04 step 12 missing', 'plan.md:44')],
        'run-1',
      ).counts,
    ).toEqual({ new: 1, carriedOver: 0, resolved: 1 });
  });

  it('needs two shared title words to carry over a reworded finding', () => {
    const previous = [
      record('M1', 'Gate result omits ancestry', 'src/a.ts:10'),
    ];
    expect(
      markFindings(
        [record('M1', 'Status misses ancestry entirely', 'src/a.ts:12')],
        previous,
        'run-1',
      ).counts,
    ).toEqual({ new: 1, carriedOver: 0, resolved: 1 });
    expect(
      markFindings(
        [record('M1', 'Gate status misses ancestry', 'src/a.ts:12')],
        previous,
        'run-1',
      ).counts,
    ).toEqual({ new: 0, carriedOver: 1, resolved: 0 });
  });

  it('does not carry over a reworded finding whose line moved more than 20 lines', () => {
    const previous = [
      record('M1', 'Gate result omits ancestry', 'src/a.ts:10'),
    ];
    const at = (location: string) =>
      markFindings(
        [record('M1', 'Gate status omits ancestry', location)],
        previous,
        'run-1',
      ).counts.carriedOver;
    expect(at('src/a.ts:30')).toBe(1);
    expect(at('src/a.ts:31')).toBe(0);
    expect(at('src/a.ts')).toBe(1);
  });

  it('keeps a regraded finding carried over when its title and location are unchanged', () => {
    const regraded = [{ ...M02_R1[0]!, id: 'H1', severity: 'high' as const }];
    const marked = markFindings(regraded, [M02_R1[0]!], 'run-1');
    expect(marked.findings[0]).toMatchObject({
      mark: 'carried_over',
      severity: 'high',
      previous: { severity: 'medium', id: 'M1' },
    });
  });

  it('never merges: a reworded finding is new when its location is ambiguous or absent', () => {
    const previous = [
      record('M1', 'First problem in one file', 'src/shared.ts:10'),
      record('M2', 'Second problem in one file', 'src/shared.ts:40'),
      record('M3', 'Problem without a location', null),
    ];
    const current = [
      record('M1', 'A reworded problem in that file', 'src/shared.ts:12'),
      record('M2', 'A reworded problem without a location', null),
    ];
    const marked = markFindings(current, previous, 'run-1');
    expect(marked.counts).toEqual({ new: 2, carriedOver: 0, resolved: 3 });
  });

  it('does not carry over a reworded finding whose severity changed', () => {
    const marked = markFindings(
      [record('L1', 'Different words entirely', 'src/a.ts:5', 'low')],
      [record('M1', 'Original wording', 'src/a.ts:5', 'medium')],
      'run-1',
    );
    expect(marked.counts).toEqual({ new: 1, carriedOver: 0, resolved: 1 });
  });

  it('leaves two identical findings of one run unmatched rather than pairing either', () => {
    const twin = record('M1', 'Twin', 'a.ts:1');
    const marked = markFindings(
      [twin, { ...twin, id: 'M2' }],
      [{ ...twin, id: 'M9' }],
      'run-1',
    );
    expect(marked.counts).toEqual({ new: 2, carriedOver: 0, resolved: 1 });
  });
});

describe('sequenceSubject', () => {
  const goal: SequenceProjectRecords = {
    goal: true,
    phaseMilestones: new Map([
      ['p07', 'm02'],
      ['p12', 'm02'],
      ['p13', 'm02'],
      ['p-rev1', 'm02'],
      ['p-rev2', 'm02'],
      ['p-rev3', 'm02'],
      ['p08', 'm03'],
    ]),
    planApprovals: [
      {
        id: 'ee377dd7',
        start: Date.parse('2026-11-03T03:17:46Z'),
        end: Date.parse('2026-11-03T03:17:46Z'),
      },
      {
        id: 'e38f33e5',
        start: Date.parse('2026-11-06T23:30:00Z'),
        end: Date.parse('2026-11-06T23:30:00Z'),
      },
    ],
  };

  it('attributes goal exit runs to their milestone whatever scope token they used', () => {
    for (const [scope, phaseIds] of [
      ['p07-p13', ['p07', 'p12', 'p13']],
      ['p07-p-rev2', ['p07', 'p12', 'p13', 'p-rev1', 'p-rev2']],
      ['final', ['p07', 'p12', 'p13', 'p-rev1', 'p-rev2', 'p-rev3']],
    ] as const) {
      expect(
        sequenceSubject(
          { reviewType: 'code', scope, phaseIds, generatedTime: 0 },
          goal,
        ),
      ).toEqual({ kind: 'milestone', value: 'm02' });
    }
  });

  it('attributes a final-token run with one phase to that phase’s milestone', () => {
    expect(
      sequenceSubject(
        {
          reviewType: 'code',
          scope: 'final',
          phaseIds: ['p08'],
          generatedTime: 0,
        },
        goal,
      ),
    ).toEqual({ kind: 'milestone', value: 'm03' });
  });

  it('keeps a single-phase gate, a cross-milestone run and a run without phase ids on their scope', () => {
    const subject = (scope: string, phaseIds: string[]) =>
      sequenceSubject(
        { reviewType: 'code', scope, phaseIds, generatedTime: 0 },
        goal,
      );
    expect(subject('p07', ['p07'])).toEqual({ kind: 'scope', value: 'p07' });
    expect(subject('final', ['p07', 'p08'])).toEqual({
      kind: 'scope',
      value: 'final',
    });
    expect(subject('final', [])).toEqual({ kind: 'scope', value: 'final' });
  });

  it('separates goal plan gate runs at every recorded plan approval', () => {
    const plan = (at: string) =>
      sequenceSubject(
        {
          reviewType: 'artifact',
          scope: 'plan',
          phaseIds: [],
          generatedTime: Date.parse(at),
        },
        goal,
      );
    expect(plan('2026-11-03T02:32:06Z')).toEqual({
      kind: 'plan-amendment',
      value: 'plan',
      amendmentAfter: null,
    });
    expect(plan('2026-11-06T22:20:01Z')).toEqual({
      kind: 'plan-amendment',
      value: 'plan',
      amendmentAfter: 'ee377dd7',
    });
    expect(plan('2026-11-07T10:00:00Z')).toEqual(plan('2026-11-08T10:00:00Z'));
    expect(plan('2026-11-07T10:00:00Z')).not.toEqual(
      plan('2026-11-06T22:20:01Z'),
    );
  });

  it('uses the scope outside goal mode', () => {
    expect(
      sequenceSubject(
        {
          reviewType: 'code',
          scope: 'final',
          phaseIds: ['p07', 'p12'],
          generatedTime: 0,
        },
        { goal: false, phaseMilestones: new Map(), planApprovals: [] },
      ),
    ).toEqual({ kind: 'scope', value: 'final' });
  });

  it('reads phase ids from a YAML list or a comma string', () => {
    expect(readPhaseIds(['p07', 'p-rev1'])).toEqual(['p07', 'p-rev1']);
    expect(readPhaseIds('[p07, `p12`]')).toEqual(['p07', 'p12']);
    expect(readPhaseIds(undefined)).toEqual([]);
  });
});

describe('convergenceLogTokens', () => {
  it('names the previous run by an 8-character prefix only', () => {
    const tokens = convergenceLogTokens({
      sequence: {
        reviewType: 'code',
        subject: { kind: 'milestone', value: 'm02' },
        run: 2,
        previousRun: {
          runId: '93e1b0a1-9b04-4c31-9aa2-e032b9820a9d',
          artifactPath: 'reviews/archived/r1.md',
          generatedAt: '2026-11-03T21:56:01Z',
        },
      },
      status: 'compared',
      counts: { new: 1, carriedOver: 0, resolved: 2 },
    });
    expect(tokens).toBe(
      ' convergence=new:1,carried:0,resolved:2 sequence=milestone:m02 sequence_run=2 previous_run=93e1b0a1',
    );
    expect(tokens).not.toContain('93e1b0a1-9b04');
  });
});

describe('computeGateConvergence over the captured m02 exit-gate runs', () => {
  const tempDirs: string[] = [];
  const project = '.oat/projects/shared/review-gate-integrity-goal';

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function fixture(name: string): Promise<string> {
    const text = await readFile(
      fileURLToPath(
        new URL(`./__fixtures__/convergence/${name}`, import.meta.url),
      ),
      'utf8',
    );
    return text.replace(/^<!--[\s\S]*?-->\n\n/, '');
  }

  async function goalProject(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-gate-convergence-'));
    tempDirs.push(root);
    await mkdir(join(root, project, 'reviews', 'archived'), {
      recursive: true,
    });
    await writeFile(
      join(root, project, 'state.md'),
      '---\noat_workflow_mode: goal\noat_milestone: m02\n---\n',
    );
    await writeFile(
      join(root, project, 'plan.md'),
      [
        '# Project Brief',
        '',
        '## Milestones',
        '',
        '| Milestone | Phases |',
        '| --------- | ------ |',
        '| m02 | p07, p12, p13, p-rev1, p-rev2, p-rev3 |',
        '',
        ...['p07', 'p12', 'p13', 'p-rev1', 'p-rev2', 'p-rev3'].flatMap((id) => [
          `## Phase ${id}: Work`,
          '',
          '**Intent:** work',
          '**Exit evidence:** done',
          '**Provisional:** no',
          '',
        ]),
      ].join('\n'),
    );
    return root;
  }

  async function current(root: string, name: string, path: string) {
    const content = await fixture(name);
    await writeFile(join(root, path), content);
    const verdict = await parseReviewGateVerdict(join(root, path));
    const runId = /^oat_gate_run_id: (.+)$/m.exec(content)![1]!;
    const generatedAt = /^oat_generated_at: (.+)$/m.exec(content)![1]!;
    return computeGateConvergence({
      repoRoot: root,
      projectPath: project,
      current: {
        artifactPath: path,
        content,
        runId,
        generatedTime: Date.parse(generatedAt),
        verdict,
      },
      parsePrevious: async (run) =>
        parseReviewGateVerdict(join(root, run.path)),
    });
  }

  it('links the three runs as one m02 sequence and reports them converging', async () => {
    const root = await goalProject();
    const archived = `${project}/reviews/archived`;

    const first = await current(
      root,
      'm02-exit-r1-range-review-2026-11-03T215601Z.md',
      `${project}/reviews/range-review-2026-11-03T215601Z.md`,
    );
    expect(first).toBeNull();
    await rm(join(root, project, 'reviews/range-review-2026-11-03T215601Z.md'));
    await writeFile(
      join(root, archived, 'range-review-2026-11-03T215601Z.md'),
      await fixture('m02-exit-r1-range-review-2026-11-03T215601Z.md'),
    );

    const second = await current(
      root,
      'm02-exit-r2-range-review-2026-11-03T224623Z.md',
      `${project}/reviews/range-review-2026-11-03T224623Z.md`,
    );
    expect(second).toMatchObject({
      sequence: {
        reviewType: 'code',
        subject: { kind: 'milestone', value: 'm02' },
        run: 2,
        previousRun: {
          runId: '93e1b0a1-9b04-4c31-9aa2-e032b9820a9d',
          artifactPath: `${archived}/range-review-2026-11-03T215601Z.md`,
        },
      },
      status: 'compared',
      counts: { new: 1, carriedOver: 0, resolved: 2 },
    });
    await rm(join(root, project, 'reviews/range-review-2026-11-03T224623Z.md'));
    await writeFile(
      join(root, archived, 'range-review-2026-11-03T224623Z.md'),
      await fixture('m02-exit-r2-range-review-2026-11-03T224623Z.md'),
    );

    const third = await current(
      root,
      'm02-exit-r3-range-review-2026-11-04T015726Z.md',
      `${project}/reviews/range-review-2026-11-04T015726Z.md`,
    );
    expect(third).toMatchObject({
      sequence: {
        subject: { kind: 'milestone', value: 'm02' },
        run: 3,
        previousRun: { runId: 'd738cd0e-5795-48ef-a387-e3ec184f90e5' },
      },
      status: 'compared',
      counts: { new: 0, carriedOver: 0, resolved: 1 },
      findings: [],
      resolved: [
        {
          id: 'M1',
          title: 'Keep an expired waiver from hiding a later pending review',
        },
      ],
    });
  });

  it('reports either run as unavailable when its records do not cover its counts', async () => {
    const root = await goalProject();
    const countLineOnly = (content: string): string =>
      content.slice(0, content.indexOf('\n## Findings') + 1);
    const archivedR1 = join(
      root,
      project,
      'reviews/archived/range-review-2026-11-03T215601Z.md',
    );
    const r1 = await fixture('m02-exit-r1-range-review-2026-11-03T215601Z.md');
    await writeFile(archivedR1, countLineOnly(r1));
    await expect(
      current(
        root,
        'm02-exit-r2-range-review-2026-11-03T224623Z.md',
        `${project}/reviews/range-review-2026-11-03T224623Z.md`,
      ),
    ).resolves.toEqual({
      sequence: expect.objectContaining({ run: 2 }),
      status: 'unavailable',
      reason: 'previous_findings_incomplete',
    });

    await writeFile(archivedR1, r1);
    const path = `${project}/reviews/range-review-2026-11-03T224623Z.md`;
    const content = countLineOnly(
      await fixture('m02-exit-r2-range-review-2026-11-03T224623Z.md'),
    );
    await writeFile(join(root, path), content);
    const verdict = await parseReviewGateVerdict(join(root, path));
    expect(verdict.findingsComplete).toBe(false);
    await expect(
      computeGateConvergence({
        repoRoot: root,
        projectPath: project,
        current: {
          artifactPath: path,
          content,
          runId: 'd738cd0e-5795-48ef-a387-e3ec184f90e5',
          generatedTime: Date.parse('2026-11-03T22:46:23Z'),
          verdict,
        },
        parsePrevious: async (run) =>
          parseReviewGateVerdict(join(root, run.path)),
      }),
    ).resolves.toEqual({
      sequence: expect.objectContaining({ run: 2 }),
      status: 'unavailable',
      reason: 'findings_incomplete',
    });
  });

  it('does not link the exit runs when the project is not in goal mode', async () => {
    const root = await goalProject();
    await writeFile(
      join(root, project, 'state.md'),
      '---\noat_workflow_mode: quick\n---\n',
    );
    await writeFile(
      join(
        root,
        project,
        'reviews/archived/range-review-2026-11-03T215601Z.md',
      ),
      await fixture('m02-exit-r1-range-review-2026-11-03T215601Z.md'),
    );
    await expect(
      current(
        root,
        'm02-exit-r2-range-review-2026-11-03T224623Z.md',
        `${project}/reviews/range-review-2026-11-03T224623Z.md`,
      ),
    ).resolves.toBeNull();
  });

  /** The real m02 run-1 artifact with only the named frontmatter fields set. */
  async function adaptedR1(fields: Record<string, string>): Promise<string> {
    let text = await fixture('m02-exit-r1-range-review-2026-11-03T215601Z.md');
    for (const [key, value] of Object.entries(fields)) {
      text = text.replace(new RegExp(`^${key}: .+$`, 'm'), `${key}: ${value}`);
    }
    return text;
  }

  /** Writes `first` as an archived run, then computes `second` as current. */
  async function rerun(root: string, first: string, second: string) {
    await writeFile(join(root, project, 'reviews/archived/first.md'), first);
    const path = `${project}/reviews/second.md`;
    await writeFile(join(root, path), second);
    return computeGateConvergence({
      repoRoot: root,
      projectPath: project,
      current: {
        artifactPath: path,
        content: second,
        runId: 'second',
        generatedTime: Date.parse('2026-11-01T12:10:00Z'),
        verdict: await parseReviewGateVerdict(join(root, path)),
      },
      parsePrevious: async (run) =>
        parseReviewGateVerdict(join(root, run.path)),
    });
  }

  it('keeps a resumed plan rerun in its amendment across a blocked plan carrier', async () => {
    const root = await goalProject();
    const approved = 'a'.repeat(40);
    await writeFile(
      join(root, project, 'plan.md'),
      [
        '# Project Brief',
        '',
        '## Delivery endpoint and authority',
        '',
        `- **Milestone m01 approved:** 2026-10-01 by user at ${approved}`,
        '',
      ].join('\n'),
    );
    // The m02 carrier is the `status: blocked, disposition: null` record a
    // stopped plan gate persists; it falls between the two runs.
    const carrier = (milestone: string, status: string, at: string) => [
      `  ${milestone}:`,
      '    plan:',
      `      status: ${status}`,
      `      disposition: ${status === 'allowed' ? 'passed' : 'null'}`,
      `      reviewed_head: ${status === 'allowed' ? approved : 'b'.repeat(40)}`,
      `      decided_at: '${at}'`,
    ];
    await writeFile(
      join(root, project, 'state.md'),
      [
        '---',
        'oat_workflow_mode: goal',
        'oat_milestone_gates:',
        ...carrier('m01', 'allowed', '2026-10-01T12:00:00Z'),
        ...carrier('m02', 'blocked', '2026-11-01T12:05:00Z'),
        '---',
        '',
      ].join('\n'),
    );
    const plan = (runId: string, at: string) =>
      adaptedR1({
        oat_generated_at: at,
        oat_review_type: 'artifact',
        oat_review_scope: 'plan',
        oat_review_requested_scope: 'plan',
        oat_gate_run_id: runId,
      });
    await expect(
      rerun(
        root,
        await plan('first', '2026-11-01T12:00:00Z'),
        await plan('second', '2026-11-01T12:10:00Z'),
      ),
    ).resolves.toMatchObject({
      sequence: {
        subject: { kind: 'plan-amendment', amendmentAfter: approved },
        run: 2,
        previousRun: { runId: 'first' },
      },
      counts: { new: 0, carriedOver: 2, resolved: 0 },
    });
  });

  it('reports a previous run it cannot parse as unavailable, never as all-new', async () => {
    const root = await goalProject();
    const broken = (
      await fixture('m02-exit-r1-range-review-2026-11-03T215601Z.md')
    ).replace(
      'Findings by severity: 0 critical, 0 high, 2 medium, 0 low',
      'Findings by severity: 0 critical, 0 high, 5 medium, 0 low',
    );
    await writeFile(
      join(
        root,
        project,
        'reviews/archived/range-review-2026-11-03T215601Z.md',
      ),
      broken,
    );
    await expect(
      current(
        root,
        'm02-exit-r2-range-review-2026-11-03T224623Z.md',
        `${project}/reviews/range-review-2026-11-03T224623Z.md`,
      ),
    ).resolves.toMatchObject({
      sequence: { run: 2 },
      status: 'unavailable',
      reason: 'previous_artifact_unparsable',
    });
  });
});

describe('goal plan-gate amendments from this project’s own records', () => {
  // The plan carriers and approval lines are copied verbatim from this
  // project's state.md (`oat_milestone_gates.*.plan`) and plan.md
  // (`## Delivery endpoint and authority`) at a2afa719c. The run IDs and times
  // are the four archived plan-gate artifacts'. The m01 carrier was
  // overwritten by the m01 re-approval, so the brief approval keeps only the
  // date on its line.
  const tempDirs: string[] = [];
  const project = '.oat/projects/shared/review-gate-integrity-goal';
  const runs = [
    ['5e3ad377-2f84-4f4d-8906-f8577b7a604e', '2026-11-01T21:41:29Z'],
    ['803a6f3e-a36a-4bd8-a4d8-fc2047ee60aa', '2026-11-02T15:55:47Z'],
    ['6cf18b35-39f7-4103-9625-ad09950fd3c7', '2026-11-03T02:32:06Z'],
    ['0d1fa309-a0e6-45a0-b4a9-c319f0fe3fa3', '2026-11-06T22:20:01Z'],
  ] as const;
  const carrier = (milestone: string, commit: string, decidedAt: string) => [
    `  ${milestone}:`,
    '    plan:',
    '      status: allowed',
    '      disposition: passed',
    `      reviewed_head: ${commit}`,
    '      subject:',
    '        kind: plan',
    `        ref: ${commit}`,
    `      decided_at: '${decidedAt}'`,
  ];
  const approvalLines = [
    '- **Brief approved:** 2026-11-01 by user at cbc8836c7ca14d56742831a13fc0cd8e1fba2057',
    '- **Milestone m01 approved:** 2026-11-02 by user at b2a38a09005e35818eccfa4191ad97444316e020',
    '- **Milestone m02 approved:** 2026-11-03 by user at ee377dd7bcbedec4e0c66cc8d12a754c45c1587d',
    '- **Milestone m03 approved:** 2026-11-06 by user at e38f33e5e58e4b9fd30f84240d250a3c2555febf',
  ];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function projectWith(lines: string[]): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-gate-plan-amendment-'));
    tempDirs.push(root);
    await mkdir(join(root, project, 'reviews', 'archived'), {
      recursive: true,
    });
    await writeFile(
      join(root, project, 'state.md'),
      [
        '---',
        'oat_workflow_mode: goal',
        'oat_milestone_gates:',
        ...carrier(
          'm01',
          'b2a38a09005e35818eccfa4191ad97444316e020',
          '2026-11-02T16:13:30Z',
        ),
        ...carrier(
          'm02',
          'ee377dd7bcbedec4e0c66cc8d12a754c45c1587d',
          '2026-11-03T03:17:46Z',
        ),
        ...carrier(
          'm03',
          'e38f33e5e58e4b9fd30f84240d250a3c2555febf',
          '2026-11-06T23:34:45Z',
        ),
        '---',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(root, project, 'plan.md'),
      [
        '# Project Brief',
        '',
        '## Delivery endpoint and authority',
        '',
        '- **Endpoint:** merged',
        ...lines,
        '',
        '## Milestones',
        '',
      ].join('\n'),
    );
    return root;
  }

  function planArtifact(runId: string, generatedAt: string): string {
    return [
      '---',
      'oat_generated: true',
      `oat_generated_at: ${generatedAt}`,
      'oat_review_scope: plan',
      'oat_review_type: artifact',
      'oat_review_invocation: gate',
      `oat_project: ${project}`,
      `oat_gate_run_id: ${runId}`,
      '---',
      '',
      '# Artifact Review: plan',
      '',
      'Findings by severity: 0 critical, 0 high, 1 medium, 0 low',
      '',
      '## Findings',
      '',
      '### Critical',
      '',
      'None',
      '',
      '### High',
      '',
      'None',
      '',
      '### Medium',
      '',
      '- **M1: Plan carrier wording** (`plan.md:120`)',
      '',
      '### Low',
      '',
      'None',
      '',
    ].join('\n');
  }

  async function convergenceFor(
    root: string,
    runId: string,
    generatedAt: string,
  ) {
    const path = `${project}/reviews/current-plan-review.md`;
    const content = planArtifact(runId, generatedAt);
    await writeFile(join(root, path), content);
    const verdict = await parseReviewGateVerdict(join(root, path));
    return computeGateConvergence({
      repoRoot: root,
      projectPath: project,
      current: {
        artifactPath: path,
        content,
        runId,
        generatedTime: Date.parse(generatedAt),
        verdict,
      },
      parsePrevious: async (run) =>
        parseReviewGateVerdict(join(root, run.path)),
    });
  }

  it('places each real plan run in its own amendment and leaves the brief’s run unplaced', async () => {
    const root = await projectWith(approvalLines);
    const records = await readSequenceProjectRecords(join(root, project));
    expect(
      runs.map(([, at]) =>
        sequenceSubject(
          {
            reviewType: 'artifact',
            scope: 'plan',
            phaseIds: [],
            generatedTime: Date.parse(at),
          },
          records,
        ),
      ),
    ).toEqual([
      {
        kind: 'plan-amendment',
        value: 'plan',
        amendmentAfter: null,
        undetermined: true,
      },
      {
        kind: 'plan-amendment',
        value: 'plan',
        amendmentAfter: 'cbc8836c7ca14d56742831a13fc0cd8e1fba2057',
      },
      {
        kind: 'plan-amendment',
        value: 'plan',
        amendmentAfter: 'b2a38a09005e35818eccfa4191ad97444316e020',
      },
      {
        kind: 'plan-amendment',
        value: 'plan',
        amendmentAfter: 'ee377dd7bcbedec4e0c66cc8d12a754c45c1587d',
      },
    ]);
  });

  it('never links a plan run to a run of an earlier amendment', async () => {
    const root = await projectWith(approvalLines);
    for (const [runId, at] of runs) {
      await writeFile(
        join(root, project, 'reviews', 'archived', `${runId}.md`),
        planArtifact(runId, at),
      );
    }
    // The m01 amendment's run follows the brief's run, a different amendment.
    await expect(convergenceFor(root, runs[1][0], runs[1][1])).resolves.toBe(
      null,
    );
    // The brief's own run cannot be placed, so it is never linked, not even
    // to a run that certainly precedes every approval.
    await writeFile(
      join(root, project, 'reviews', 'archived', 'pre-brief.md'),
      planArtifact(
        '00000000-0000-4000-8000-0000000000bb',
        '2026-10-30T12:00:00Z',
      ),
    );
    await expect(convergenceFor(root, runs[0][0], runs[0][1])).resolves.toBe(
      null,
    );
    // A rerun inside the m03 amendment links to that amendment's run only.
    await expect(
      convergenceFor(
        root,
        '00000000-0000-4000-8000-0000000000aa',
        '2026-11-06T23:00:00Z',
      ),
    ).resolves.toMatchObject({
      sequence: {
        subject: {
          kind: 'plan-amendment',
          amendmentAfter: 'ee377dd7bcbedec4e0c66cc8d12a754c45c1587d',
        },
        run: 2,
        previousRun: { runId: runs[3][0] },
      },
      status: 'compared',
      counts: { new: 0, carriedOver: 1, resolved: 0 },
    });
  });

  it('keeps runs before any approval in one amendment', async () => {
    const root = await projectWith([]);
    await writeFile(
      join(root, project, 'state.md'),
      '---\noat_workflow_mode: goal\n---\n',
    );
    await writeFile(
      join(root, project, 'reviews', 'archived', 'first.md'),
      planArtifact(runs[0][0], runs[0][1]),
    );
    await expect(
      convergenceFor(root, runs[1][0], runs[1][1]),
    ).resolves.toMatchObject({
      sequence: {
        subject: { kind: 'plan-amendment', amendmentAfter: null },
        run: 2,
      },
    });
  });
});
