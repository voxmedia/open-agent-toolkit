import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import {
  applyTemplateReplacements,
  resolveTemplateSource as defaultResolveTemplateSource,
} from '@commands/project/new/scaffold';
import type { GitRunner } from '@commands/project/sync/git';
import type { PushResult } from '@commands/project/sync/ref-sync';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { getProjectState } from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import YAML from 'yaml';

import { createProjectPromoteCommand, parseLitePlanSections } from './promote';

const SPEC_SECTIONS = [
  'Summary',
  'Decisions',
  'Assumptions',
  'Out of Scope',
  'Validation Criteria',
] as const;

type LiteContentShape = 'minimal' | 'product' | 'technical' | 'both';

function litePlanContent(shape: LiteContentShape = 'minimal'): string {
  const productBehavior = [
    '## Product Behavior',
    '',
    '1. **Visible result** — Users see the promoted behavior.',
    '',
  ];
  const technicalDesign = [
    '## Technical Design',
    '',
    '- **Current operation:** `promoteLite()` reads the five core sections.',
    '- **Proposed changes:** `promoteLite()` carries adaptive sections forward.',
    '- **Data flow:** Lite plan content flows into discovery context.',
    '',
  ];
  return [
    '---',
    'oat_template: true',
    'oat_plan_source: lite',
    '---',
    '',
    '# Lite Plan: demo',
    '',
    '## Summary',
    '',
    'Ship safe behavior.',
    '',
    '## Decisions',
    '',
    `- **Content shape:** \`${shape}\` — Matches the observable triggers.`,
    '- Keep the command mechanical.',
    '',
    ...(shape === 'product' || shape === 'both' ? productBehavior : []),
    ...(shape === 'technical' || shape === 'both' ? technicalDesign : []),
    '## Assumptions',
    '',
    '- The project is already registered.',
    '',
    '## Out of Scope',
    '',
    '- Spec-driven promotion.',
    '',
    '## Validation Criteria',
    '',
    '- [ ] Promotion preserves provenance — Check: `pnpm test`',
    '',
    '## Parallelism',
    '',
    'This plan has one phase.',
    '',
    '## Phase 1: Implement',
    '',
  ].join('\n');
}

function stateContent(
  mode = 'lite',
  origin: 'native' | 'imported' = 'native',
): string {
  return [
    '---',
    `oat_workflow_mode: ${mode}`,
    `oat_workflow_origin: ${origin}`,
    'oat_phase: plan',
    'oat_phase_status: in_progress',
    'oat_project_state_updated: "2026-01-01T00:00:00.000Z"',
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
  '## Key Decisions',
  '',
  '{Decisions}',
  '',
  '## Assumptions',
  '',
  '{Assumptions}',
  '',
  '## Out of Scope',
  '',
  '{Out of scope}',
  '',
  '## Success Criteria',
  '',
  '{Success criteria}',
  '',
  '## Next Steps',
  '',
  '{Next steps}',
  '',
].join('\n');

const QUICK_PLAN_TEMPLATE = [
  '---',
  'oat_phase: { OAT_PHASE }',
  'oat_phase_status: in_progress',
  'oat_plan_source: quick',
  'oat_template: true',
  '---',
  '',
  '# Implementation Plan: {Project Name}',
  '',
  '**Goal:** {Author from discovery}',
  '',
].join('\n');

interface Harness {
  capture: LoggerCapture;
  command: Command;
  gitRunner: GitRunner & { run: ReturnType<typeof vi.fn> };
  pushSynced: ReturnType<typeof vi.fn>;
  events: string[];
}

function createHarness(
  repoRoot: string,
  json = false,
  options: {
    failGit?: boolean;
    failWriteFile?: string;
    liteTemplatePath?: string;
  } = {},
): Harness {
  const capture = createLoggerCapture();
  const events: string[] = [];
  const gitRun = vi.fn(async (args: string[]) => {
    events.push(`git:${args.join(' ')}`);
    if (options.failGit) {
      throw new Error('injected git persistence failure');
    }
    return { code: 0, stdout: '', stderr: '' };
  });
  const gitRunner = { run: gitRun } as GitRunner & {
    run: ReturnType<typeof vi.fn>;
  };
  const pushSynced = vi.fn(async (): Promise<PushResult> => {
    events.push('pushSynced');
    return { status: 'pushed', sha: 'a'.repeat(40) };
  });
  const command = createProjectPromoteCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: 'project',
      dryRun: false,
      verbose: false,
      json: globalOptions.json ?? json,
      cwd: repoRoot,
      home: join(repoRoot, 'home'),
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => repoRoot,
    resolveProjectsRoot: async () => '.oat/projects/shared',
    resolveTemplateSource: async (userOatRoot, templateRepoRoot, file) =>
      file === 'plan-lite.md' && options.liteTemplatePath
        ? options.liteTemplatePath
        : defaultResolveTemplateSource(userOatRoot, templateRepoRoot, file),
    mkdir: async (...args: Parameters<typeof mkdir>) => {
      events.push(`mkdir:${String(args[0])}`);
      return mkdir(...args);
    },
    rename: async (...args: Parameters<typeof rename>) => {
      events.push(`rename:${String(args[0])}`);
      return rename(...args);
    },
    writeFile: async (...args: Parameters<typeof writeFile>) => {
      events.push(`write:${String(args[0])}`);
      if (
        options.failWriteFile &&
        String(args[0]).endsWith(options.failWriteFile)
      ) {
        throw new Error(`injected ${options.failWriteFile} write failure`);
      }
      return writeFile(...args);
    },
    gitRunner,
    pushSynced,
    processEnv: {},
    now: () => new Date('2026-09-05T21:00:00.000Z'),
  });
  return { capture, command, gitRunner, pushSynced, events };
}

async function runCommand(
  command: Command,
  projectPath: string,
  to = 'quick',
  json = false,
): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  const args = [
    ...(json ? ['--json'] : []),
    'project',
    'promote',
    projectPath,
    '--to',
    to,
  ];
  await program.parseAsync(args, { from: 'user' });
}

async function seedRepo(
  repoRoot: string,
  options: {
    scope?: 'shared' | 'local' | 'synced' | 'outside';
    mode?: string;
    origin?: 'native' | 'imported';
    plan?: string;
    existingReference?: string;
  } = {},
): Promise<{ projectPath: string; projectRoot: string }> {
  const scope = options.scope ?? 'shared';
  const projectPath = `.oat/projects/${scope}/demo`;
  const projectRoot = join(repoRoot, projectPath);
  await mkdir(projectRoot, { recursive: true });
  await mkdir(join(repoRoot, '.oat', 'templates'), { recursive: true });
  await writeFile(
    join(repoRoot, '.oat', 'templates', 'discovery.md'),
    DISCOVERY_TEMPLATE,
    'utf8',
  );
  await writeFile(
    join(repoRoot, '.oat', 'templates', 'plan.md'),
    QUICK_PLAN_TEMPLATE,
    'utf8',
  );
  await writeFile(
    join(projectRoot, 'plan.md'),
    options.plan ?? litePlanContent(),
  );
  await writeFile(
    join(projectRoot, 'state.md'),
    stateContent(options.mode, options.origin),
  );
  if (options.existingReference !== undefined) {
    await mkdir(join(projectRoot, 'references'), { recursive: true });
    await writeFile(
      join(projectRoot, 'references', 'lite-plan.md'),
      options.existingReference,
    );
  }
  return { projectPath, projectRoot };
}

async function expectNoPromotionWrites(
  projectRoot: string,
  originalPlan: string,
  originalState: string,
): Promise<void> {
  await expect(readFile(join(projectRoot, 'plan.md'), 'utf8')).resolves.toBe(
    originalPlan,
  );
  await expect(readFile(join(projectRoot, 'state.md'), 'utf8')).resolves.toBe(
    originalState,
  );
  await expect(
    readFile(join(projectRoot, 'discovery.md'), 'utf8'),
  ).rejects.toMatchObject({ code: 'ENOENT' });
}

describe('oat project promote', () => {
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

  async function createRepo(): Promise<string> {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-promote-'));
    tempDirs.push(repoRoot);
    return repoRoot;
  }

  it.each(['minimal', 'product', 'technical', 'both'] as const)(
    'parses the %s adaptive lite content shape as a pure operation',
    (shape) => {
      const parsed = parseLitePlanSections(litePlanContent(shape));
      expect(parsed).toMatchObject({
        summary: 'Ship safe behavior.',
        decisions: expect.stringContaining(`**Content shape:** \`${shape}\``),
        assumptions: '- The project is already registered.',
        outOfScope: '- Spec-driven promotion.',
        validationCriteria:
          '- [ ] Promotion preserves provenance — Check: `pnpm test`',
      });
      expect(parsed?.productBehavior !== undefined).toBe(
        shape === 'product' || shape === 'both',
      );
      expect(parsed?.technicalDesign !== undefined).toBe(
        shape === 'technical' || shape === 'both',
      );
    },
  );

  it.each(['minimal', 'product', 'technical', 'both'] as const)(
    'preserves the %s adaptive shape during promotion',
    async (shape) => {
      const repoRoot = await createRepo();
      const originalPlan = litePlanContent(shape);
      const { projectPath, projectRoot } = await seedRepo(repoRoot, {
        plan: originalPlan,
      });
      const { command } = createHarness(repoRoot);

      await runCommand(command, projectPath);

      const discovery = await readFile(
        join(projectRoot, 'discovery.md'),
        'utf8',
      );
      const carriesProduct = shape === 'product' || shape === 'both';
      const carriesTechnical = shape === 'technical' || shape === 'both';
      expect(discovery.includes('### Product Behavior (from Lite plan)')).toBe(
        carriesProduct,
      );
      expect(discovery.includes('## Carried-Forward Technical Design')).toBe(
        carriesTechnical,
      );
      if (carriesProduct) {
        expect(discovery).toContain(
          '### Product Behavior (from Lite plan)\n\n1. **Visible result** — Users see the promoted behavior.',
        );
      }
      if (carriesTechnical) {
        expect(
          discovery.indexOf('## Carried-Forward Technical Design'),
        ).toBeLessThan(discovery.indexOf('## Next Steps'));
        expect(discovery).toContain('not a new discovery deliverable');
        expect(discovery).toContain(
          '## Carried-Forward Technical Design\n\n> Prior implementation context carried forward from the Lite plan; this is not a new discovery deliverable.\n\n- **Current operation:** `promoteLite()` reads the five core sections.\n- **Proposed changes:** `promoteLite()` carries adaptive sections forward.',
        );
      }
      await expect(
        readFile(join(projectRoot, 'references', 'lite-plan.md'), 'utf8'),
      ).resolves.toBe(originalPlan);
    },
  );

  it.each(['native', 'imported'] as const)(
    'promotes an authored lite project while preserving %s origin',
    async (origin) => {
      const repoRoot = await createRepo();
      const { projectPath, projectRoot } = await seedRepo(repoRoot, { origin });
      const originalPlan = await readFile(join(projectRoot, 'plan.md'), 'utf8');
      const { capture, command, gitRunner, events } = createHarness(repoRoot);

      await runCommand(command, projectPath);

      expect(process.exitCode).toBe(0);
      await expect(
        readFile(join(projectRoot, 'references', 'lite-plan.md'), 'utf8'),
      ).resolves.toBe(originalPlan);
      const expectedPlan = applyTemplateReplacements(
        QUICK_PLAN_TEMPLATE,
        'demo',
        '2026-09-05',
        '2026-09-05T21:00:00.000Z',
        'quick',
      );
      await expect(
        readFile(join(projectRoot, 'plan.md'), 'utf8'),
      ).resolves.toBe(expectedPlan);
      const discovery = await readFile(
        join(projectRoot, 'discovery.md'),
        'utf8',
      );
      expect(YAML.parse(getFrontmatterBlock(discovery) ?? '')).toMatchObject({
        oat_status: 'in_progress',
        oat_ready_for: 'oat-project-quick-start',
      });
      expect(discovery).toContain('## Initial Request\n\nShip safe behavior.');
      expect(discovery).toContain(
        '## Key Decisions\n\n- **Content shape:** `minimal` — Matches the observable triggers.\n- Keep the command mechanical.',
      );
      expect(discovery).toContain(
        '## Assumptions\n\n- The project is already registered.',
      );
      expect(discovery).toContain(
        '## Out of Scope\n\n- Spec-driven promotion.',
      );
      expect(discovery).toContain(
        '## Success Criteria\n\n- [ ] Promotion preserves provenance — Check: `pnpm test`',
      );
      const state = await readFile(join(projectRoot, 'state.md'), 'utf8');
      const frontmatter = YAML.parse(
        getFrontmatterBlock(state) ?? '',
      ) as Record<string, unknown>;
      expect(frontmatter).toMatchObject({
        oat_workflow_mode: 'quick',
        oat_workflow_origin: origin,
        oat_phase: 'discovery',
        oat_phase_status: 'complete',
        oat_ready_for: 'oat-project-quick-start',
        oat_project_state_updated: '2026-09-05T21:00:00.000Z',
      });
      const exactPaths = [
        'discovery.md',
        'references/lite-plan.md',
        'plan.md',
        'state.md',
      ].map((file) => relative(repoRoot, join(projectRoot, file)));
      expect(gitRunner.run).toHaveBeenNthCalledWith(
        1,
        ['add', '--', ...exactPaths],
        { cwd: repoRoot },
      );
      expect(gitRunner.run).toHaveBeenNthCalledWith(
        2,
        [
          'commit',
          '-m',
          'chore(oat): promote demo to quick',
          '--',
          ...exactPaths,
        ],
        { cwd: repoRoot },
      );
      expect(
        events.findIndex((event) => event.startsWith('git:')),
      ).toBeGreaterThan(
        events.findLastIndex(
          (event) => event.startsWith('write:') || event.startsWith('rename:'),
        ),
      );
      expect(capture.info).toContain(`Promoted ${projectPath} to quick.`);
    },
  );

  it('pushes a synced project only after all promotion writes finish', async () => {
    const repoRoot = await createRepo();
    const { projectPath } = await seedRepo(repoRoot, { scope: 'synced' });
    const { command, events, gitRunner, pushSynced } = createHarness(repoRoot);

    await runCommand(command, projectPath);

    expect(process.exitCode).toBe(0);
    expect(gitRunner.run).not.toHaveBeenCalled();
    expect(pushSynced).toHaveBeenCalledOnce();
    expect(events.indexOf('pushSynced')).toBeGreaterThan(
      events.findLastIndex(
        (event) => event.startsWith('write:') || event.startsWith('rename:'),
      ),
    );
  });

  it('promotes a local project without git persistence', async () => {
    const repoRoot = await createRepo();
    const { projectPath } = await seedRepo(repoRoot, { scope: 'local' });
    const { capture, command, gitRunner, pushSynced } = createHarness(
      repoRoot,
      true,
      { failGit: true },
    );

    await runCommand(command, projectPath, 'quick', true);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'promoted',
        reason: 'promoted',
        files: [
          'discovery.md',
          'references/lite-plan.md',
          'plan.md',
          'state.md',
        ],
      },
    ]);
    expect(process.exitCode).toBe(0);
    expect(gitRunner.run).not.toHaveBeenCalled();
    expect(pushSynced).not.toHaveBeenCalled();
  });

  it.each(['shared', 'local'] as const)(
    'routes a real promoted %s project to quick-start',
    async (scope) => {
      const repoRoot = await createRepo();
      const { projectPath, projectRoot } = await seedRepo(repoRoot, { scope });
      const { command } = createHarness(repoRoot, true);

      await runCommand(command, projectPath, 'quick', true);

      const promotedState = await getProjectState(projectRoot);
      expect(promotedState.recommendation.skill).toBe(
        'oat-project-quick-start',
      );
      expect(
        promotedState.artifacts.find(({ type }) => type === 'discovery'),
      ).toMatchObject({
        status: 'in_progress',
        readyFor: 'oat-project-quick-start',
      });
    },
  );

  it('does not run git when the final project write fails', async () => {
    const repoRoot = await createRepo();
    const { projectPath } = await seedRepo(repoRoot);
    const { capture, command, gitRunner, pushSynced } = createHarness(
      repoRoot,
      true,
      { failWriteFile: 'state.md' },
    );

    await runCommand(command, projectPath, 'quick', true);

    expect(process.exitCode).toBe(1);
    expect(gitRunner.run).not.toHaveBeenCalled();
    expect(pushSynced).not.toHaveBeenCalled();
    expect(capture.jsonPayloads).toEqual([
      {
        status: 'refused',
        reason: 'write-failed',
        files: ['discovery.md', 'references/lite-plan.md', 'plan.md'],
      },
    ]);
  });

  it('ignores oat_template when every lite section has been authored', async () => {
    const repoRoot = await createRepo();
    const { projectPath, projectRoot } = await seedRepo(repoRoot);
    const { command } = createHarness(repoRoot);

    await runCommand(command, projectPath);

    expect(process.exitCode).toBe(0);
    await expect(
      readFile(join(projectRoot, 'references', 'lite-plan.md'), 'utf8'),
    ).resolves.toContain('oat_template: true');
  });

  it('refuses the repository canonical untouched lite template without writing', async () => {
    const repositoryRoot = resolve(process.cwd(), '../..');
    const canonicalTemplatePath = join(
      repositoryRoot,
      '.oat',
      'templates',
      'plan-lite.md',
    );
    const canonicalTemplate = await readFile(canonicalTemplatePath, 'utf8');
    const repoRoot = await createRepo();
    const { projectPath, projectRoot } = await seedRepo(repoRoot, {
      plan: canonicalTemplate,
    });
    const originalState = await readFile(join(projectRoot, 'state.md'), 'utf8');
    const { capture, command, gitRunner, pushSynced } = createHarness(
      repoRoot,
      true,
      { liteTemplatePath: canonicalTemplatePath },
    );

    await runCommand(command, projectPath, 'quick', true);

    expect(process.exitCode).toBe(1);
    expect(capture.jsonPayloads).toEqual([
      { status: 'refused', reason: 'invalid-lite-plan', files: [] },
    ]);
    await expectNoPromotionWrites(
      projectRoot,
      canonicalTemplate,
      originalState,
    );
    await expect(
      readFile(join(projectRoot, 'references', 'lite-plan.md'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(gitRunner.run).not.toHaveBeenCalled();
    expect(pushSynced).not.toHaveBeenCalled();
  });

  it('emits the promoted JSON contract', async () => {
    const repoRoot = await createRepo();
    const { projectPath } = await seedRepo(repoRoot);
    const { capture, command } = createHarness(repoRoot, true);

    await runCommand(command, projectPath, 'quick', true);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'promoted',
        reason: 'promoted',
        files: [
          'discovery.md',
          'references/lite-plan.md',
          'plan.md',
          'state.md',
        ],
      },
    ]);
  });

  it('refuses a non-lite project with no writes and categorical JSON', async () => {
    const repoRoot = await createRepo();
    const { projectPath, projectRoot } = await seedRepo(repoRoot, {
      mode: 'quick',
    });
    const originalPlan = await readFile(join(projectRoot, 'plan.md'), 'utf8');
    const originalState = await readFile(join(projectRoot, 'state.md'), 'utf8');
    const { capture, command, gitRunner } = createHarness(repoRoot, true);

    await runCommand(command, projectPath, 'quick', true);

    expect(process.exitCode).toBe(1);
    await expectNoPromotionWrites(projectRoot, originalPlan, originalState);
    expect(gitRunner.run).not.toHaveBeenCalled();
    expect(capture.jsonPayloads).toEqual([
      { status: 'refused', reason: 'not-lite', files: [] },
    ]);
  });

  it('refuses an unsupported promotion target before any write', async () => {
    const repoRoot = await createRepo();
    const { projectPath, projectRoot } = await seedRepo(repoRoot);
    const originalPlan = await readFile(join(projectRoot, 'plan.md'), 'utf8');
    const originalState = await readFile(join(projectRoot, 'state.md'), 'utf8');
    const { command, gitRunner } = createHarness(repoRoot);

    await runCommand(command, projectPath, 'spec-driven');

    expect(process.exitCode).toBe(1);
    await expectNoPromotionWrites(projectRoot, originalPlan, originalState);
    expect(gitRunner.run).not.toHaveBeenCalled();
  });

  it('refuses an existing lite-plan provenance file without changing it', async () => {
    const repoRoot = await createRepo();
    const { projectPath, projectRoot } = await seedRepo(repoRoot, {
      existingReference: 'existing provenance\n',
    });
    const originalPlan = await readFile(join(projectRoot, 'plan.md'), 'utf8');
    const originalState = await readFile(join(projectRoot, 'state.md'), 'utf8');
    const { command, gitRunner } = createHarness(repoRoot);

    await runCommand(command, projectPath);

    expect(process.exitCode).toBe(1);
    await expectNoPromotionWrites(projectRoot, originalPlan, originalState);
    await expect(
      readFile(join(projectRoot, 'references', 'lite-plan.md'), 'utf8'),
    ).resolves.toBe('existing provenance\n');
    expect(gitRunner.run).not.toHaveBeenCalled();
  });

  it('refuses when the project path cannot resolve to a project scope', async () => {
    const repoRoot = await createRepo();
    const { projectPath, projectRoot } = await seedRepo(repoRoot, {
      scope: 'outside',
    });
    const originalPlan = await readFile(join(projectRoot, 'plan.md'), 'utf8');
    const originalState = await readFile(join(projectRoot, 'state.md'), 'utf8');
    const { command, gitRunner } = createHarness(repoRoot);

    await runCommand(command, projectPath);

    expect(process.exitCode).toBe(1);
    await expectNoPromotionWrites(projectRoot, originalPlan, originalState);
    expect(gitRunner.run).not.toHaveBeenCalled();
  });

  it.each(SPEC_SECTIONS)(
    'refuses an unauthored lite plan missing %s without any write',
    async (section) => {
      const repoRoot = await createRepo();
      const plan = litePlanContent().replace(
        new RegExp(`\\n## ${section}\\n[\\s\\S]*?(?=\\n## )`),
        '',
      );
      const { projectPath, projectRoot } = await seedRepo(repoRoot, { plan });
      const originalState = await readFile(
        join(projectRoot, 'state.md'),
        'utf8',
      );
      const { command, gitRunner } = createHarness(repoRoot);

      await runCommand(command, projectPath);

      expect(process.exitCode).toBe(1);
      await expectNoPromotionWrites(projectRoot, plan, originalState);
      expect(gitRunner.run).not.toHaveBeenCalled();
    },
  );

  it('accepts legitimate authored brace syntax in a required section', async () => {
    const repoRoot = await createRepo();
    const plan = litePlanContent().replace(
      'Ship safe behavior.',
      'Render authored JSON such as `{ "ok": true }` without rewriting braces.',
    );
    const { projectPath, projectRoot } = await seedRepo(repoRoot, { plan });
    const { command } = createHarness(repoRoot);

    await runCommand(command, projectPath);

    expect(process.exitCode).toBe(0);
    await expect(
      readFile(join(projectRoot, 'references', 'lite-plan.md'), 'utf8'),
    ).resolves.toBe(plan);
  });
});
