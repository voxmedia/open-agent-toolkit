import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  computeGateConvergence,
  convergenceLogTokens,
  findingLocationKey,
  findingTitleKey,
  markFindings,
  readPhaseIds,
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
      Date.parse('2026-11-03T03:17:46Z'),
      Date.parse('2026-11-06T23:30:00Z'),
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
      amendmentAfter: '2026-11-03T03:17:46.000Z',
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
