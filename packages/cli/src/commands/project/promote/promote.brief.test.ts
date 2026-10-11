import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { GitRunner } from '@commands/project/sync/git';
import type { PushResult } from '@commands/project/sync/ref-sync';
import { resolveTemplate as defaultResolveTemplate } from '@commands/shared/template-source';
import {
  evaluateQuickPlanReadiness,
  getProjectState,
  parseTaskProgress,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import YAML from 'yaml';

import { createProjectPromoteCommand } from './promote';

// Hand-written brief fixtures following design.md "plan-brief.md" and
// "implementation-brief.md"; no scaffold or bundled brief template is used.

const SHA = {
  p01Base: 'a'.repeat(40),
  p01Head: 'b'.repeat(40),
  p02Base: 'c'.repeat(40),
  p02Head: 'd'.repeat(40),
  p03Base: 'e'.repeat(40),
  t1: '1'.repeat(40),
  t2: '2'.repeat(40),
  t3: '3'.repeat(40),
};

const REVIEW_ROWS = [
  '| Scope | Type     | Status      | Date       | Artifact              |',
  '| ----- | -------- | ----------- | ---------- | --------------------- |',
  '| plan  | artifact | passed      | 2026-09-30 | reviews/plan.md       |',
  '| p01   | code     | passed      | 2026-10-01 | reviews/p01-review.md |',
  '| p03   | code     | fixes_added | 2026-10-02 | reviews/p03-review.md |',
  '| final | code     | pending     | -          | -                     |',
];

function phaseBlock(id: string, name: string, extra: string[] = []): string[] {
  return [
    `## Phase ${id}: ${name}`,
    '',
    `**Intent:** Deliver ${name.toLowerCase()}.`,
    `**Exit evidence:** \`pnpm test\` passes for ${id}.`,
    ...extra,
    '',
  ];
}

function briefPlan(phases: string[][]): string {
  return [
    '---',
    'oat_status: in_progress',
    'oat_ready_for: null',
    'oat_blockers: []',
    'oat_last_updated: 2026-10-01',
    'oat_phase: plan',
    'oat_phase_status: in_progress',
    'oat_plan_hill_phases: []',
    'oat_plan_parallel_groups: []',
    'oat_plan_source: brief',
    'oat_generated: false',
    'oat_template: false',
    'oat_template_name: plan-brief',
    '---',
    '',
    '# Project Brief',
    '',
    '## Goal',
    '',
    'Ship the widget renderer safely.',
    '',
    '## Outcomes',
    '',
    '1. Widgets render — evidence: `pnpm test` covers rendering.',
    '',
    '## Approach',
    '',
    'Incremental phases.',
    '',
    '### Design',
    '',
    'Render through the existing pipeline.',
    '',
    '## Constraints and Out of Scope',
    '',
    '- No new runtime dependencies.',
    '',
    '## Decisions',
    '',
    '- Reuse the existing renderer.',
    '',
    '## Known Unknowns',
    '',
    '- Cache invalidation timing (resolve in p03).',
    '',
    '## Delivery endpoint and authority',
    '',
    'A PR against main; the user merges.',
    '',
    '## Phases',
    '',
    '```markdown',
    '## Phase p09: Example only',
    '```',
    '',
    ...phases.flat(),
    '## Parallelism',
    '',
    'Sequential.',
    '',
    '## Reviews',
    '',
    ...REVIEW_ROWS,
    '',
    '## Implementation Complete',
    '',
    'Pending.',
    '',
    '## References',
    '',
    '- Research: `references/research/`',
    '',
  ].join('\n');
}

function journalPhase(
  id: string,
  name: string,
  markers: string[],
  records: { id: string; title: string; status: string; commit?: string }[],
): string[] {
  return [
    `## Phase ${id}: ${name}`,
    '',
    ...markers,
    '',
    'Summary prose for the phase.',
    '',
    ...records.flatMap((record) => [
      `### Task ${record.id}: ${record.title}`,
      '',
      `**Status:** ${record.status}`,
      `**Commit:** ${record.commit ?? '-'}`,
      '**Executor:** root',
      '',
      `Record body for ${record.id}.`,
      '',
    ]),
  ];
}

function journal(sections: string[][]): string {
  return [
    '---',
    'oat_current_task_id: p03',
    '---',
    '',
    '# Implementation: demo',
    '',
    ...sections.flat(),
    '## Orchestration Runs',
    '',
    '- none',
    '',
  ].join('\n');
}

const MIXED_PLAN = briefPlan([
  phaseBlock('p01', 'Accepted with records'),
  phaseBlock('p02', 'Accepted without records'),
  phaseBlock('p03', 'Active work'),
  phaseBlock('p04', 'Pending work'),
  phaseBlock('p05', 'Provisional work', ['**Provisional:** yes']),
]);

const MIXED_JOURNAL = journal([
  journalPhase(
    'p01',
    'Accepted with records',
    [
      '**Status:** completed',
      `**Base:** ${SHA.p01Base}`,
      `**Head:** ${SHA.p01Head}`,
    ],
    [
      {
        id: 'p01-t01',
        title: 'First record',
        status: 'completed',
        commit: SHA.t1,
      },
      {
        id: 'p01-t02',
        title: 'Second record',
        status: 'completed',
        commit: SHA.t2,
      },
      { id: 'p01-t03', title: 'Abandoned record', status: 'cancelled' },
    ],
  ),
  journalPhase(
    'p02',
    'Accepted without records',
    [
      '**Status:** completed',
      `**Base:** ${SHA.p02Base}`,
      `**Head:** ${SHA.p02Head}`,
    ],
    [],
  ),
  journalPhase(
    'p03',
    'Active work',
    ['**Status:** in_progress', `**Base:** ${SHA.p03Base}`],
    [
      {
        id: 'p03-t01',
        title: 'Done slice',
        status: 'completed',
        commit: SHA.t3,
      },
      { id: 'p03-t02', title: 'Queued slice', status: 'pending' },
      { id: 'p03-t03', title: 'Running slice', status: 'in_progress' },
    ],
  ),
  journalPhase('p04', 'Pending work', ['**Status:** pending'], []),
]);

const DISCOVERY_TEMPLATE = [
  '---',
  'oat_status: in_progress',
  'oat_ready_for: null',
  'oat_last_updated: YYYY-MM-DD',
  'oat_template: true',
  '---',
  '',
  '# Discovery: {Project Name}',
  '',
  '## Initial Request',
  '',
  '{Initial request}',
  '',
  '## Key Decisions',
  '',
  '{Decisions}',
  '',
  '## Solution Space',
  '',
  '### Approach 1: {Strategy Name}',
  '',
  '**Description:** {What this approach involves}',
  '',
  '### Chosen Direction',
  '',
  '**Approach:** {Which approach was selected}',
  '',
  '## Constraints',
  '',
  '{Constraints}',
  '',
  '## Success Criteria',
  '',
  '{Success criteria}',
  '',
  '## Open Questions',
  '',
  '{Open questions}',
  '',
  '## Next Steps',
  '',
  '{Next steps}',
  '',
].join('\n');

function briefState(): string {
  return [
    '---',
    'oat_workflow_mode: brief',
    'oat_workflow_origin: native',
    'oat_phase: implement',
    'oat_phase_status: in_progress',
    'oat_ready_for: null',
    'oat_hill_checkpoints: []',
    'oat_project_state_updated: "2026-10-01T00:00:00.000Z"',
    '---',
    '',
    '# Project State: demo',
    '',
  ].join('\n');
}

function frontmatterOf(content: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  return YAML.parse(match?.[1] ?? '') as Record<string, unknown>;
}

function sectionOf(content: string, heading: string): string {
  const start = content.indexOf(`${heading}\n`);
  if (start < 0) throw new Error(`missing ${heading}`);
  const rest = content.slice(start + heading.length + 1);
  const next = /^## /m.exec(rest);
  return rest.slice(0, next?.index ?? rest.length);
}

function createHarness(repoRoot: string): {
  capture: LoggerCapture;
  command: Command;
  gitRunner: GitRunner & { run: ReturnType<typeof vi.fn> };
} {
  const capture = createLoggerCapture();
  const gitRunner = {
    run: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' })),
  } as GitRunner & { run: ReturnType<typeof vi.fn> };
  const command = createProjectPromoteCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: 'project',
      dryRun: false,
      verbose: false,
      json: globalOptions.json ?? true,
      cwd: repoRoot,
      home: join(repoRoot, 'home'),
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => repoRoot,
    resolveProjectsRoot: async () => '.oat/projects/shared',
    resolveTemplate: defaultResolveTemplate,
    gitRunner,
    pushSynced: vi.fn(
      async (): Promise<PushResult> => ({
        status: 'pushed',
        sha: 'f'.repeat(40),
      }),
    ),
    processEnv: {},
    now: () => new Date('2026-10-10T12:00:00.000Z'),
  });
  return { capture, command, gitRunner };
}

async function runPromote(
  command: Command,
  projectPath: string,
): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync(
    ['--json', 'project', 'promote', projectPath, '--to', 'quick'],
    { from: 'user' },
  );
}

describe('oat project promote: brief → quick', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function seed(
    options: {
      scope?: 'shared' | 'local';
      plan?: string;
      journal?: string | null;
      archive?: string;
    } = {},
  ): Promise<{ repoRoot: string; projectPath: string; projectRoot: string }> {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-promote-brief-'));
    tempDirs.push(repoRoot);
    const git = (args: string[]) =>
      execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
    git(['init', '-q']);
    git(['config', 'user.name', 'OAT']);
    git(['config', 'user.email', 'oat@example.com']);
    const projectPath = `.oat/projects/${options.scope ?? 'shared'}/demo`;
    const projectRoot = join(repoRoot, projectPath);
    await mkdir(projectRoot, { recursive: true });
    await mkdir(join(repoRoot, '.oat', 'templates'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'discovery.md'),
      DISCOVERY_TEMPLATE,
    );
    await writeFile(join(projectRoot, 'state.md'), briefState());
    await writeFile(join(projectRoot, 'plan.md'), options.plan ?? MIXED_PLAN);
    if (options.journal !== null) {
      await writeFile(
        join(projectRoot, 'implementation.md'),
        options.journal ?? MIXED_JOURNAL,
      );
    }
    if (options.archive !== undefined) {
      await mkdir(join(projectRoot, 'references'), { recursive: true });
      await writeFile(
        join(projectRoot, 'references', 'brief-archive.md'),
        options.archive,
      );
    }
    git(['add', '-A']);
    git(['commit', '-qm', 'brief project']);
    return { repoRoot, projectPath, projectRoot };
  }

  async function read(projectRoot: string, file: string): Promise<string> {
    return readFile(join(projectRoot, file), 'utf8');
  }

  it('migrates every phase state by disposition and persists the exact files', async () => {
    const { repoRoot, projectPath, projectRoot } = await seed();
    const { capture, command } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'promoted',
        reason: 'promoted',
        files: [
          'discovery.md',
          'references/brief-archive.md',
          'implementation.md',
          'plan.md',
          'state.md',
        ],
      },
    ]);
    expect(process.exitCode).toBe(0);

    const plan = await read(projectRoot, 'plan.md');
    const journalAfter = await read(projectRoot, 'implementation.md');

    expect(frontmatterOf(plan)).toMatchObject({
      oat_status: 'in_progress',
      oat_ready_for: null,
      oat_template: true,
      oat_plan_source: 'quick',
      oat_promoted_from: 'brief',
      oat_promotion_pending_phases: ['p03', 'p04', 'p05'],
    });

    // Accepted with records: completed records copied with their IDs; the
    // cancelled one stays in the journal and is listed as historical.
    const p01 = sectionOf(plan, '## Phase p01: Accepted with records');
    expect(p01.match(/^### Task .*$/gm)).toEqual([
      '### Task p01-t01: First record',
      '### Task p01-t02: Second record',
    ]);
    expect(p01).toContain('**Historical records:** p01-t03 (cancelled)');
    expect(p01).toContain('**Intent:** Deliver accepted with records.');
    expect(p01).not.toContain(SYNTHESIZED);

    // Accepted without records: one synthesized task at the next free ID.
    const p02 = sectionOf(plan, '## Phase p02: Accepted without records');
    expect(p02.match(/^### Task .*$/gm)).toEqual([
      `### Task p02-t01: ${SYNTHESIZED}`,
    ]);
    const p02Journal = sectionOf(
      journalAfter,
      '## Phase p02: Accepted without records',
    );
    expect(p02Journal).toContain(
      `### Task p02-t01: ${SYNTHESIZED}\n\n**Status:** completed\n**Commit:** ${SHA.p02Head}\n`,
    );

    // Active: completed records copied, unfinished records keep their IDs in
    // the journal, and no acceptance task is synthesized.
    const p03 = sectionOf(plan, '## Phase p03: Active work');
    expect(p03.match(/^### Task .*$/gm)).toEqual([
      '### Task p03-t01: Done slice',
    ]);
    expect(p03).toContain(
      '**Unfinished records:** p03-t02 (pending), p03-t03 (in_progress)',
    );
    expect(p03).not.toContain(SYNTHESIZED);

    // Pending and provisional phases stay taskless.
    expect(sectionOf(plan, '## Phase p04: Pending work')).not.toMatch(
      /^### Task/m,
    );
    expect(sectionOf(plan, '## Phase p05: Provisional work')).not.toMatch(
      /^### Task/m,
    );

    // No fabricated completion: the journal is the original plus exactly the
    // one synthesized p02 record.
    expect(journalAfter.match(/^### Task .*$/gm)).toEqual([
      '### Task p01-t01: First record',
      '### Task p01-t02: Second record',
      '### Task p01-t03: Abandoned record',
      `### Task p02-t01: ${SYNTHESIZED}`,
      '### Task p03-t01: Done slice',
      '### Task p03-t02: Queued slice',
      '### Task p03-t03: Running slice',
    ]);
    expect(
      journalAfter.replace(
        /\n### Task p02-t01: Accepted via phase evidence\n[\s\S]*?(?=\n## Phase p03)/,
        '',
      ),
    ).toBe(MIXED_JOURNAL);

    // Quick task-mode progress counts the migrated history as done.
    const progress = parseTaskProgress(plan, journalAfter);
    expect(
      progress.phases.map(({ phaseId, total, completed }) => ({
        phaseId,
        total,
        completed,
      })),
    ).toEqual([
      { phaseId: 'p01', total: 2, completed: 2 },
      { phaseId: 'p02', total: 1, completed: 1 },
      { phaseId: 'p03', total: 1, completed: 1 },
    ]);

    // The fenced example phase and the brief-only sections are not in the plan.
    expect(plan).not.toContain('p09');
    expect(plan).not.toMatch(/^## (Goal|Outcomes|Known Unknowns|Phases)$/m);
    expect(plan).toContain('**Goal:** Ship the widget renderer safely.');
    // Review rows keep their identity cells byte-for-byte; provenance is one
    // line under the heading, never a Scope-cell suffix.
    const reviews = sectionOf(plan, '## Reviews');
    expect(reviews).toContain(
      'Rows dated on or before 2026-10-10 were recorded pre-promotion under workflow mode brief.',
    );
    expect(reviews.split('\n').filter((line) => line.startsWith('|'))).toEqual(
      REVIEW_ROWS,
    );
    expect(plan).not.toContain('(pre-promotion');
    expect(plan).toContain('- Brief archive: `references/brief-archive.md`');

    await expect(
      read(projectRoot, 'references/brief-archive.md'),
    ).resolves.toBe(MIXED_PLAN);

    const discovery = await read(projectRoot, 'discovery.md');
    expect(frontmatterOf(discovery)['oat_ready_for']).toBe(
      'oat-project-quick-start',
    );
    expect(sectionOf(discovery, '## Initial Request')).toContain(
      'Ship the widget renderer safely.',
    );
    expect(sectionOf(discovery, '## Success Criteria')).toContain(
      'Widgets render',
    );
    expect(sectionOf(discovery, '## Key Decisions')).toContain(
      'Reuse the existing renderer.',
    );
    expect(sectionOf(discovery, '## Open Questions')).toContain(
      'Cache invalidation timing',
    );
    expect(
      sectionOf(discovery, '## Delivery Endpoint and Authority (from brief)'),
    ).toContain('A PR against main; the user merges.');

    expect(frontmatterOf(await read(projectRoot, 'state.md'))).toMatchObject({
      oat_workflow_mode: 'quick',
      oat_phase: 'plan',
      oat_phase_status: 'in_progress',
      oat_ready_for: 'oat-project-quick-start',
      oat_project_state_updated: '2026-10-10T12:00:00.000Z',
    });

    const committed = execFileSync(
      'git',
      ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'],
      { cwd: repoRoot, encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .sort();
    expect(committed).toEqual(
      [
        'discovery.md',
        'implementation.md',
        'plan.md',
        'references/brief-archive.md',
        'state.md',
      ].map((file) => `${projectPath}/${file}`),
    );
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: repoRoot,
        encoding: 'utf8',
      }),
    ).toBe('');

    const state = await getProjectState(projectRoot);
    expect(state.recommendation.skill).toBe('oat-project-quick-start');
  });

  it('carries the brief Approach into discovery as the chosen direction', async () => {
    const { repoRoot, projectPath, projectRoot } = await seed();
    const { command } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    const discovery = await read(projectRoot, 'discovery.md');
    // The brief's Approach becomes discovery's Chosen Direction, with its own
    // subheadings demoted to stay inside it.
    const solutionSpace = sectionOf(discovery, '## Solution Space');
    const chosen = solutionSpace.slice(
      solutionSpace.indexOf('### Chosen Direction'),
    );
    expect(chosen).toContain('Incremental phases.');
    expect(chosen).toContain('#### Design');
    expect(chosen).toContain('Render through the existing pipeline.');
    expect(chosen).not.toContain('{Which approach was selected}');
    expect(discovery.indexOf('### Chosen Direction')).toBeLessThan(
      discovery.indexOf('## Constraints'),
    );
  });

  it('demotes only real Approach subheadings, never fenced example lines', async () => {
    const plan = MIXED_PLAN.replace(
      'Render through the existing pipeline.',
      [
        'Render through the existing pipeline.',
        '',
        '```markdown',
        '### not a heading',
        '```',
      ].join('\n'),
    );
    const { repoRoot, projectPath, projectRoot } = await seed({ plan });
    const { command } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    const discovery = await read(projectRoot, 'discovery.md');
    expect(discovery).toMatch(/^#### Design$/m);
    expect(discovery).not.toMatch(/^### Design$/m);
    expect(discovery).toContain('```markdown\n### not a heading\n```');
    expect(discovery).not.toContain('#### not a heading');
  });

  it('keeps the promoted plan not ready while phases still need tasks', async () => {
    const { repoRoot, projectPath, projectRoot } = await seed();
    const { command } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    // Simulate quick-start finishing every other readiness clause.
    const plan = (await read(projectRoot, 'plan.md'))
      .replace(/^oat_status: .*$/m, 'oat_status: complete')
      .replace(/^oat_ready_for: .*$/m, 'oat_ready_for: oat-project-implement')
      .replace(/^oat_template: .*$/m, 'oat_template: false')
      .replace(
        /^## Reviews\n/m,
        '## Reviews\n\n- Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)\n',
      );
    expect(evaluateQuickPlanReadiness(plan)).toEqual({
      ready: false,
      failure: 'promotion-pending-phases',
    });
    const authored = plan.replace(
      /^oat_promotion_pending_phases:\n(?: {2}- .*\n)+/m,
      'oat_promotion_pending_phases: []\n',
    );
    expect(evaluateQuickPlanReadiness(authored)).toEqual({
      ready: true,
      failure: null,
    });
  });

  it('synthesizes the acceptance task after the highest existing record ID', async () => {
    const plan = briefPlan([phaseBlock('p01', 'Only cancelled work')]);
    const journalContent = journal([
      journalPhase(
        'p01',
        'Only cancelled work',
        ['**Status:** completed', `**Head:** ${SHA.p01Head}`],
        [
          { id: 'p01-t01', title: 'Dropped', status: 'cancelled' },
          { id: 'p01-t02', title: 'Nothing to do', status: 'no-change' },
        ],
      ),
    ]);
    const { repoRoot, projectPath, projectRoot } = await seed({
      plan,
      journal: journalContent,
    });
    const { command } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    const promoted = await read(projectRoot, 'plan.md');
    expect(promoted.match(/^### Task .*$/gm)).toEqual([
      `### Task p01-t03: ${SYNTHESIZED}`,
    ]);
    expect(promoted).toContain(
      '**Historical records:** p01-t01 (cancelled), p01-t02 (no-change)',
    );
    expect(frontmatterOf(promoted)['oat_promotion_pending_phases']).toEqual([]);
    const journalAfter = await read(projectRoot, 'implementation.md');
    expect(journalAfter).toContain(
      `### Task p01-t03: ${SYNTHESIZED}\n\n**Status:** completed\n**Commit:** ${SHA.p01Head}\n`,
    );
    expect(journalAfter.indexOf('### Task p01-t03')).toBeLessThan(
      journalAfter.indexOf('## Orchestration Runs'),
    );
  });

  it('never synthesizes a task for an unaccepted phase and leaves the journal untouched', async () => {
    const plan = briefPlan([
      phaseBlock('p01', 'Active without completions'),
      phaseBlock('p02', 'Pending'),
      phaseBlock('p03', 'Later', ['**Provisional:** yes']),
    ]);
    const journalContent = journal([
      journalPhase(
        'p01',
        'Active without completions',
        ['**Status:** in_progress', `**Base:** ${SHA.p01Base}`],
        [{ id: 'p01-t01', title: 'Queued', status: 'pending' }],
      ),
      journalPhase('p02', 'Pending', ['**Status:** pending'], []),
      // A completed marker on a provisional phase does not accept it.
      journalPhase('p03', 'Later', ['**Status:** completed'], []),
    ]);
    const { repoRoot, projectPath, projectRoot } = await seed({
      scope: 'local',
      plan,
      journal: journalContent,
    });
    const { capture, command, gitRunner } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'promoted',
      files: [
        'discovery.md',
        'references/brief-archive.md',
        'plan.md',
        'state.md',
      ],
    });
    expect(gitRunner.run).not.toHaveBeenCalled();
    await expect(read(projectRoot, 'implementation.md')).resolves.toBe(
      journalContent,
    );
    expect(
      frontmatterOf(await read(projectRoot, 'plan.md'))[
        'oat_promotion_pending_phases'
      ],
    ).toEqual(['p01', 'p02', 'p03']);
    expect(await read(projectRoot, 'plan.md')).not.toMatch(/^### Task/m);
  });

  it('refuses an accepted phase without a head instead of fabricating a record', async () => {
    const plan = briefPlan([
      phaseBlock('p01', 'Headless'),
      phaseBlock('p02', 'Pending'),
    ]);
    const journalContent = journal([
      journalPhase('p01', 'Headless', ['**Status:** completed'], []),
    ]);
    const { repoRoot, projectPath, projectRoot } = await seed({
      plan,
      journal: journalContent,
    });
    const { capture, command, gitRunner } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'refused',
        reason: 'missing-phase-head',
        files: [],
        phases: ['p01'],
      },
    ]);
    expect(process.exitCode).toBe(1);
    expect(gitRunner.run).not.toHaveBeenCalled();
    await expect(read(projectRoot, 'implementation.md')).resolves.toBe(
      journalContent,
    );
    await expect(read(projectRoot, 'plan.md')).resolves.toBe(plan);
    await expect(read(projectRoot, 'discovery.md')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it.each([
    [
      'an extracted phase',
      {
        journal: journal([
          journalPhase(
            'p01',
            'Accepted with records',
            ['**Status:** extracted', '**Extracted to:** child-goal'],
            [],
          ),
        ]),
      },
      'extracted-phases',
    ],
    ['an existing brief archive', { archive: 'old' }, 'brief-archive-exists'],
    ['a brief with no phases', { plan: briefPlan([]) }, 'invalid-brief-plan'],
  ] as const)('refuses %s without writes', async (_, options, reason) => {
    const { repoRoot, projectPath, projectRoot } = await seed(options);
    const before = await Promise.all(
      ['plan.md', 'state.md', 'implementation.md'].map((file) =>
        read(projectRoot, file),
      ),
    );
    const { capture, command, gitRunner } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    expect(capture.jsonPayloads).toEqual([
      { status: 'refused', reason, files: [] },
    ]);
    expect(process.exitCode).toBe(1);
    expect(gitRunner.run).not.toHaveBeenCalled();
    await expect(
      Promise.all(
        ['plan.md', 'state.md', 'implementation.md'].map((file) =>
          read(projectRoot, file),
        ),
      ),
    ).resolves.toEqual(before);
    await expect(read(projectRoot, 'discovery.md')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});

const SYNTHESIZED = 'Accepted via phase evidence';
