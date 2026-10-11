import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

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
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import YAML from 'yaml';

import { createProjectPromoteCommand } from './promote';

// Hand-written goal fixtures following design.md "Goal transition contract"
// and "Delivery registry and closeout boundary" (registry YAML) and the
// landed control-plane goal state reader.

const HEAD = {
  p01: 'a'.repeat(40),
  p02: 'b'.repeat(40),
  base: 'c'.repeat(40),
};

const REVIEW_ROWS = [
  '| Scope | Type     | Status | Date       | Artifact                       |',
  '| ----- | -------- | ------ | ---------- | ------------------------------ |',
  '| plan  | artifact | passed | 2026-10-01 | reviews/plan.md                |',
  '| m01   | code     | passed | 2026-10-05 | reviews/archived/m01-review.md |',
];

const GOAL_PLAN = [
  '---',
  'oat_status: complete',
  'oat_ready_for: oat-project-implement',
  'oat_blockers: []',
  'oat_last_updated: 2026-10-05',
  'oat_plan_hill_phases: []',
  'oat_plan_parallel_groups: []',
  'oat_plan_source: goal',
  'oat_generated: false',
  'oat_template: false',
  '---',
  '',
  '# Project Brief',
  '',
  '## Goal',
  '',
  'Ship the widget platform in milestones.',
  '',
  '## Outcomes',
  '',
  '1. Widgets render — evidence: `pnpm test` covers rendering.',
  '',
  '## Delivery endpoint and authority',
  '',
  'One PR per milestone against main; the user merges.',
  '',
  '## Milestones',
  '',
  '| Milestone | Phases   |',
  '| --------- | -------- |',
  '| m01       | p01, p02 |',
  '| m02       | p03      |',
  '',
  '## Phase p01: Renderer',
  '',
  '**Intent:** Render widgets.',
  '**Exit evidence:** `pnpm test` passes for p01.',
  '',
  '## Phase p02: Cache',
  '',
  '**Intent:** Cache renders.',
  '**Exit evidence:** `pnpm test` passes for p02.',
  '',
  '## Phase p03: Themes',
  '',
  '**Intent:** Theme widgets.',
  '**Exit evidence:** `pnpm test` passes for p03.',
  '',
  '## Reviews',
  '',
  ...REVIEW_ROWS,
  '',
].join('\n');

function goalJournal(p03: string[] = ['**Status:** pending']): string {
  return [
    '---',
    'oat_current_task_id: p03',
    '---',
    '',
    '# Implementation: demo',
    '',
    '## Phase p01: Renderer',
    '',
    '**Status:** completed',
    `**Head:** ${HEAD.p01}`,
    '',
    '## Phase p02: Cache',
    '',
    '**Status:** completed',
    `**Head:** ${HEAD.p02}`,
    '',
    '## Phase p03: Themes',
    '',
    ...p03,
    '',
  ].join('\n');
}

interface GoalStateOptions {
  milestoneStatus?: string;
  recovery?: string;
  deliveries?: string;
}

const SETTLED_DELIVERIES = `oat_deliveries:
  - delivery_id: d01
    milestone: m01
    scope: [p01]
    endpoint: merged
    kind: pr
    status: superseded
    superseded_by: d02
    corrects_delivery_id: null
    covers_scope_of: null
    members:
      - url: https://github.com/owner/name/pull/1
        base: '${HEAD.base}'
        reviewed_head: '${HEAD.p01}'
        observed_head: '${HEAD.p01}'
        observed_base: '${HEAD.base}'
        status: closed
  - delivery_id: d02
    milestone: m01
    scope: [p02]
    endpoint: merged
    kind: pr
    status: at_endpoint
    superseded_by: null
    corrects_delivery_id: null
    covers_scope_of: d01
    members:
      - url: https://github.com/owner/name/pull/2
        base: '${HEAD.base}'
        reviewed_head: '${HEAD.p02}'
        observed_head: '${HEAD.p02}'
        observed_base: '${HEAD.base}'
        status: merged
    integrated_review:
      artifact: reviews/archived/m01-review.md
      scope: [p01, p02]
      bound_revisions: [{ member: 0, base: '${HEAD.base}', head: '${HEAD.p02}' }]
      disposition: passed
    endpoint_attainment:
      observed_at: '2026-10-06T10:00:00.000Z'
      members:
        - { url: https://github.com/owner/name/pull/2, head: '${HEAD.p02}', base: '${HEAD.base}', status: merged }`;

function goalState(options: GoalStateOptions = {}): string {
  return [
    '---',
    'oat_workflow_mode: goal',
    'oat_workflow_origin: native',
    'oat_phase: implement',
    'oat_phase_status: in_progress',
    'oat_ready_for: null',
    'oat_hill_checkpoints: []',
    'oat_project_state_updated: "2026-10-06T00:00:00.000Z"',
    'oat_milestone: m01',
    `oat_milestone_status: ${options.milestoneStatus ?? 'delivered'}`,
    'oat_goal_status: active',
    `oat_goal_recovery: ${options.recovery ?? 'null'}`,
    'oat_goal_outcome_audit: null',
    options.deliveries ?? SETTLED_DELIVERIES,
    'oat_milestone_gates:',
    '  m01:',
    '    plan: { status: allowed, resolution: no_gate, disposition: no_gate, config_fingerprint: null, reviewed_head: null, subject: { kind: plan, scope: [p01, p02] }, decided_at: "2026-10-01T00:00:00Z" }',
    '    exit: { status: allowed, resolution: no_gate, disposition: no_gate, config_fingerprint: null, reviewed_head: null, subject: { kind: code, scope: [p01, p02] }, decided_at: "2026-10-05T00:00:00Z", freshness: fresh, freshness_reason: null }',
    '---',
    '',
    '# Project State: demo',
    '',
  ].join('\n');
}

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
  '## Next Steps',
  '',
  '{Next steps}',
  '',
].join('\n');

function frontmatterOf(content: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  return YAML.parse(match?.[1] ?? '') as Record<string, unknown>;
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
    now: () => new Date('2026-10-11T12:00:00.000Z'),
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

/** Every file under the repository (except `.git`) with its content. */
async function snapshotTree(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else files[relative(root, path)] = await readFile(path, 'utf8');
    }
  };
  await walk(root);
  return files;
}

describe('oat project promote: goal → quick (B3)', () => {
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
    options: { state?: string; journal?: string } = {},
  ): Promise<{ repoRoot: string; projectPath: string; projectRoot: string }> {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-promote-goal-'));
    tempDirs.push(repoRoot);
    const git = (args: string[]) =>
      execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
    git(['init', '-q']);
    git(['config', 'user.name', 'OAT']);
    git(['config', 'user.email', 'oat@example.com']);
    git(['config', 'core.hooksPath', '/dev/null']);
    const projectPath = '.oat/projects/shared/demo';
    const projectRoot = join(repoRoot, projectPath);
    await mkdir(projectRoot, { recursive: true });
    await mkdir(join(repoRoot, '.oat', 'templates'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'templates', 'discovery.md'),
      DISCOVERY_TEMPLATE,
    );
    await writeFile(
      join(projectRoot, 'state.md'),
      options.state ?? goalState(),
    );
    await writeFile(join(projectRoot, 'plan.md'), GOAL_PLAN);
    await writeFile(
      join(projectRoot, 'implementation.md'),
      options.journal ?? goalJournal(),
    );
    git(['add', '-A']);
    git(['commit', '-qm', 'goal project']);
    return { repoRoot, projectPath, projectRoot };
  }

  async function read(projectRoot: string, file: string): Promise<string> {
    return readFile(join(projectRoot, file), 'utf8');
  }

  it('promotes a settled goal, preserving its delivery history, and resumes through quick-start', async () => {
    const { repoRoot, projectPath, projectRoot } = await seed();
    const before = frontmatterOf(await read(projectRoot, 'state.md'));
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
    expect(frontmatterOf(plan)).toMatchObject({
      oat_status: 'in_progress',
      oat_plan_source: 'quick',
      oat_promoted_from: 'goal',
      oat_promotion_pending_phases: ['p03'],
    });
    expect(plan).toContain('> Promoted from a goal brief on 2026-10-11.');
    expect(plan).not.toContain('## Milestones');
    // Historical Reviews cells are kept; the provenance names the source mode.
    expect(plan).toContain(
      'Rows dated on or before 2026-10-11 were recorded pre-promotion under workflow mode goal.',
    );
    for (const row of REVIEW_ROWS) expect(plan).toContain(row);

    // The registry, milestone gates and audit stay verbatim in state.md ...
    const state = frontmatterOf(await read(projectRoot, 'state.md'));
    expect(state).toMatchObject({
      oat_workflow_mode: 'quick',
      oat_phase: 'plan',
      oat_ready_for: 'oat-project-quick-start',
    });
    for (const key of [
      'oat_deliveries',
      'oat_milestone_gates',
      'oat_goal_outcome_audit',
    ]) {
      expect(state[key]).toEqual(before[key]);
    }
    // ... and are copied into the archive under the original brief.
    const archive = await read(projectRoot, 'references/brief-archive.md');
    expect(archive.startsWith(GOAL_PLAN.trimEnd())).toBe(true);
    const history = YAML.parse(
      /## Delivery History[\s\S]*?```yaml\n([\s\S]*?)```/.exec(archive)![1]!,
    ) as Record<string, unknown>;
    expect(history).toEqual({
      oat_deliveries: before['oat_deliveries'],
      oat_milestone_gates: before['oat_milestone_gates'],
      oat_goal_outcome_audit: null,
    });

    // Resume: quick-start owns the promoted project, and the shared pending
    // phases clause keeps it not ready until p03 has authored tasks.
    const project = await getProjectState(projectRoot);
    expect(project.workflowMode).toBe('quick');
    expect(project.recommendation.skill).toBe('oat-project-quick-start');
    const finished = plan
      .replace(/^oat_status: .*$/m, 'oat_status: complete')
      .replace(/^oat_ready_for: .*$/m, 'oat_ready_for: oat-project-implement')
      .replace(/^oat_template: .*$/m, 'oat_template: false')
      .replace(
        /^## Reviews\n/m,
        '## Reviews\n\n- Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)\n',
      );
    expect(evaluateQuickPlanReadiness(finished)).toEqual({
      ready: false,
      failure: 'promotion-pending-phases',
    });
    const authored = finished
      .replace(
        /^oat_promotion_pending_phases:\n(?: {2}- .*\n)+/m,
        'oat_promotion_pending_phases: []\n',
      )
      .replace(
        '## Phase p03: Themes\n',
        '## Phase p03: Themes\n\n### Task p03-t01: Add the theme registry\n',
      );
    expect(evaluateQuickPlanReadiness(authored)).toEqual({
      ready: true,
      failure: null,
    });
  });

  const OPEN_DELIVERY = SETTLED_DELIVERIES.replace(
    'status: at_endpoint',
    'status: open',
  );

  it.each([
    [
      'an active milestone',
      { state: goalState({ milestoneStatus: 'implementing' }) },
      { reason: 'goal-milestone-active' },
    ],
    [
      'a registering delivery',
      {
        state: goalState({
          deliveries: SETTLED_DELIVERIES.replace(
            'status: at_endpoint',
            'status: registering',
          ),
        }),
      },
      { reason: 'goal-delivery-unsettled', deliveries: ['d02'] },
    ],
    [
      'an open delivery',
      { state: goalState({ deliveries: OPEN_DELIVERY }) },
      { reason: 'goal-delivery-unsettled', deliveries: ['d02'] },
    ],
    [
      'a delivered milestone with an empty registry',
      { state: goalState({ deliveries: 'oat_deliveries: []' }) },
      { reason: 'goal-delivery-unsettled', deliveries: [] },
    ],
    [
      'a delivered milestone with no registry',
      { state: goalState({ deliveries: '' }) },
      { reason: 'goal-delivery-unsettled', deliveries: [] },
    ],
    [
      'a pending recovery',
      {
        state: goalState({
          recovery:
            '{ milestone: m01, delivery_id: d02, phase_ids: [p02], stage: implementing, review_artifact: null }',
        }),
      },
      { reason: 'goal-recovery-pending' },
    ],
    [
      'an extracted phase',
      {
        journal: goalJournal([
          '**Status:** extracted',
          '**Extracted to:** themes-child',
        ]),
      },
      { reason: 'extracted-phases' },
    ],
  ] as const)('refuses %s without writes', async (_, options, refusal) => {
    const { repoRoot, projectPath } = await seed(options);
    const before = await snapshotTree(repoRoot);
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const { capture, command, gitRunner } = createHarness(repoRoot);

    await runPromote(command, projectPath);

    expect(capture.jsonPayloads).toEqual([
      { status: 'refused', files: [], ...refusal },
    ]);
    expect(process.exitCode).toBe(1);
    expect(gitRunner.run).not.toHaveBeenCalled();
    expect(await snapshotTree(repoRoot)).toEqual(before);
    expect(
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repoRoot,
        encoding: 'utf8',
      }),
    ).toBe(head);
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: repoRoot,
        encoding: 'utf8',
      }),
    ).toBe('');
  });
});
