import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { resolveEffectiveConfig } from '@config/resolve';
import { buildCodexMaterializedTargetRoleName } from '@providers/codex/codec/shared';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectDispatchCeilingCommand } from './index';

interface HarnessOptions {
  cwd: string;
  home: string;
  activeProjectPath?: string | null;
  processEnv?: NodeJS.ProcessEnv;
}

interface ReviewSelectionExpectation {
  policy: string;
  source: string;
  ceilingTier: string;
  target: unknown;
  dispatchArgs: unknown;
  modelAxis: string;
  effortAxis: string;
}

function coordinatorReviewSelectionMatches(
  payload: Record<string, unknown>,
  providerName: string,
  expected: ReviewSelectionExpectation,
): boolean {
  const providers = payload.providers as
    | Record<string, Record<string, unknown>>
    | undefined;
  const provider = providers?.[providerName];
  const selection = provider?.selection as Record<string, unknown> | undefined;

  return (
    payload.policy === expected.policy &&
    payload.source === expected.source &&
    selection?.ceilingTier === expected.ceilingTier &&
    isDeepStrictEqual(selection?.target, expected.target) &&
    isDeepStrictEqual(provider?.dispatchArgs, expected.dispatchArgs) &&
    provider?.modelAxis === expected.modelAxis &&
    provider?.effortAxis === expected.effortAxis
  );
}

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const activeProjectPath =
    options.activeProjectPath ?? '.oat/projects/shared/demo';

  const command = createProjectDispatchCeilingCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: options.home,
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
    resolveEffectiveConfig,
    resolveActiveProject: vi.fn(async () => ({
      name: activeProjectPath ? 'demo' : null,
      path: activeProjectPath,
      status: activeProjectPath ? 'active' : 'unset',
    })),
    processEnv: options.processEnv ?? {},
  });

  return { capture, command };
}

async function runCommand(
  command: Command,
  commandArgs: string[],
  globalArgs: string[] = [],
): Promise<void> {
  await runDispatchCeilingCommand(
    command,
    ['resolve', ...commandArgs],
    globalArgs,
  );
}

async function runDispatchCeilingCommand(
  command: Command,
  commandArgs: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);

  await program.parseAsync(
    [...globalArgs, 'project', 'dispatch-ceiling', ...commandArgs],
    { from: 'user' },
  );
}

async function createRepo(): Promise<{ root: string; home: string }> {
  const root = await mkdtemp(join(tmpdir(), 'oat-dispatch-ceiling-'));
  const home = await mkdtemp(join(tmpdir(), 'oat-dispatch-ceiling-home-'));
  await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.oat', 'config.local.json'),
    `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/demo' })}\n`,
    'utf8',
  );
  await writeFile(
    join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
    '---\noat_phase: implement\noat_phase_status: in_progress\n---\n\n# State\n',
    'utf8',
  );
  return { root, home };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('oat project dispatch-ceiling resolve', () => {
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

  async function setup(): Promise<{ root: string; home: string }> {
    const repo = await createRepo();
    tempDirs.push(repo.root, repo.home);
    return repo;
  }

  it('prints dispatch policy choices as markdown from canonical metadata', async () => {
    const { root, home } = await setup();
    const { command, capture } = createHarness({ cwd: root, home });

    await runDispatchCeilingCommand(command, [
      'choices',
      '--format',
      'markdown',
    ]);

    expect(capture.info.join('\n')).toContain('4. Frontier');
    expect(capture.info.join('\n')).toContain('5. Uncapped');
    expect(capture.info.join('\n')).toContain('6. Inherit Host Defaults');
    expect(capture.info.join('\n')).toContain('7. Leave Unresolved');
    expect(capture.info.join('\n')).toContain('planning/preflight deferral');
    expect(process.exitCode).toBe(0);
  });

  it('prints dispatch policy choices as json', async () => {
    const { root, home } = await setup();
    const { command, capture } = createHarness({ cwd: root, home });

    await runDispatchCeilingCommand(command, ['choices', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      choices: expect.arrayContaining([
        expect.objectContaining({
          value: 'frontier',
          kind: 'managed-capped',
          runtimePolicy: true,
        }),
        expect.objectContaining({
          value: 'leave-unresolved',
          kind: 'unresolved',
          runtimePolicy: false,
        }),
      ]),
    });
    expect(process.exitCode).toBe(0);
  });

  it.each(['reviewr', ' reviewer', 'Reviewer'])(
    'rejects invalid dispatch role %j before resolution',
    async (role) => {
      const { root, home } = await setup();
      const { command, capture } = createHarness({ cwd: root, home });

      await expect(
        runCommand(command, ['--provider', 'codex', '--role', role, '--json']),
      ).rejects.toThrow('process.exit unexpectedly called with "1"');

      expect(capture.jsonPayloads).toHaveLength(0);
    },
  );

  it('resolves repo config before project state', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchCeiling: { providers: { codex: 'high' } } },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_ceiling:',
        '  providers:',
        '    codex: xhigh',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'high',
      source: 'repo-config',
      unresolved: false,
      providerDefaultEffort: 'unknown',
      providers: {
        codex: {
          value: 'high',
          mode: 'advisory',
          mechanism: 'pinned-variant',
          dispatchArgs: null,
          modelAxis: 'unresolved',
          effortAxis: 'unresolved',
          selection: { candidateIndex: null },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('falls back to project-state frontmatter and reports Codex provider default', async () => {
    const { root, home } = await setup();
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(
      join(home, '.codex', 'config.toml'),
      'model_reasoning_effort = "high"\n',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_ceiling:',
        '  providers:',
        '    codex: xhigh',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'xhigh',
      source: 'project-state',
      unresolved: false,
      providerDefaultEffort: 'high',
      providers: {
        codex: {
          value: 'xhigh',
          mode: 'advisory',
          mechanism: 'pinned-variant',
          dispatchArgs: null,
          modelAxis: 'unresolved',
          effortAxis: 'unresolved',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('reads explicit project dispatch policy frontmatter before legacy ceiling state', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: balanced',
        '  providers:',
        '    codex: high',
        '  source: project-state',
        'oat_dispatch_ceiling:',
        '  providers:',
        '    codex: medium',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'high',
      source: 'project-state',
      preset: 'balanced',
      unresolved: false,
      providers: {
        codex: {
          value: 'high',
          mode: 'advisory',
          mechanism: 'pinned-variant',
          dispatchArgs: null,
          modelAxis: 'unresolved',
          effortAxis: 'unresolved',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('parses sparse project dispatch matrix overrides from policy frontmatter', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    cursor:',
        '      balanced:',
        '        - composer-2.5',
        '        - harness: cursor',
        '          model: gpt-5.3-codex-high',
        '          effort: high',
        '          ignored: true',
        '      high: glm-5.2-max',
        '      experimental: ignored',
        '    codex:',
        '      high: xhigh',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      matrix: {
        cursor: {
          balanced: [
            'composer-2.5',
            {
              harness: 'cursor',
              model: 'gpt-5.3-codex-high',
              effort: 'high',
            },
          ],
          high: 'glm-5.2-max',
        },
        codex: {
          high: 'xhigh',
        },
      },
    });
    expect(capture.warn).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it('reports no project dispatch matrix override when matrix key is absent', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: balanced',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      matrix: null,
    });
    expect(capture.warn).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it('ignores direct structured project-state tier targets as malformed legacy input', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    codex:',
        '      high: { model: gpt-5.6-sol, effort: high }',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'xhigh',
      matrix: null,
      providers: { codex: { selection: { candidateIndex: null } } },
    });
    expect(capture.warn).toEqual([
      'Ignoring malformed oat_dispatch_policy.matrix in project state.',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('preserves modern project candidate ladders in the top-level JSON compatibility field', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    codex:',
        '      balanced:',
        '        candidates:',
        '          - { harness: codex, model: gpt-5.6-terra, effort: medium }',
        '      high:',
        '        candidates:',
        '          - { harness: codex, model: gpt-5.6-sol, effort: high }',
        '          - route:',
        '              - { harness: codex, model: gpt-5.6-sol, effort: xhigh }',
        '              - { harness: cursor, model: gpt-5.6-sol-xhigh }',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--candidate-model',
      'gpt-5.6-terra',
      '--candidate-effort',
      'medium',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      matrix: {
        codex: {
          balanced: {
            candidates: [
              {
                harness: 'codex',
                model: 'gpt-5.6-terra',
                effort: 'medium',
              },
            ],
          },
          high: {
            candidates: [
              {
                harness: 'codex',
                model: 'gpt-5.6-sol',
                effort: 'high',
              },
              {
                route: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'xhigh',
                  },
                  { harness: 'cursor', model: 'gpt-5.6-sol-xhigh' },
                ],
              },
            ],
          },
        },
      },
      providers: {
        codex: {
          cellSource: 'project-state',
          selection: {
            candidateTier: 'balanced',
            requestedCandidate: {
              model: 'gpt-5.6-terra',
              effort: 'medium',
            },
          },
        },
      },
    });
    expect(capture.warn).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it('ignores malformed project dispatch matrix overrides with a warning', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: balanced',
        '  matrix:',
        '    cursor:',
        '      high:',
        '        - {}',
        '      frontier: []',
        '    claude:',
        '      high: super-opus',
        '  source: project-state',
        'oat_dispatch_ceiling:',
        '  providers:',
        '    codex: medium',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'high',
      matrix: null,
    });
    expect(capture.warn).toEqual([
      'Ignoring malformed oat_dispatch_policy.matrix in project state.',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('warns when the project dispatch matrix is not an object', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: balanced',
        '  matrix: malformed',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      matrix: null,
    });
    expect(capture.warn).toEqual([
      'Ignoring malformed oat_dispatch_policy.matrix in project state.',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('resolves merged matrix cells with project override over repo and user config', async () => {
    const { root, home } = await setup();
    await writeJson(join(home, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            cursor: { high: 'composer-2.5' },
          },
        },
      },
    });
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            cursor: { high: 'gpt-5.3-codex-high' },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    cursor:',
        '      high: glm-5.2-max',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'cursor', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'cursor',
      value: 'glm-5.2-max',
      providers: {
        cursor: {
          value: 'glm-5.2-max',
          mode: 'enforced',
          mechanism: 'model-arg',
          dispatchArgs: { model: 'glm-5.2-max' },
          modelAxis: 'selected:glm-5.2-max',
          effortAxis: 'not-applicable',
          cellSource: 'project-state',
          selection: {
            selectedValue: 'glm-5.2-max',
            selectionBranch: 'matrix-pinned',
            family: 'glm',
            cellSource: 'project-state',
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('re-resolves the same abstract tier through the active provider column', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            codex: { high: 'xhigh' },
            claude: { high: 'opus' },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);
    await runCommand(command, ['--provider', 'claude', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      provider: 'codex',
      value: 'xhigh',
      providers: {
        codex: {
          cellSource: 'repo-config',
          selection: {
            role: 'implementer',
            selectedValue: 'xhigh',
            family: 'openai',
            selectionBranch: 'matrix-pinned',
          },
        },
      },
    });
    expect(capture.jsonPayloads[1]).toMatchObject({
      provider: 'claude',
      value: 'opus',
      providers: {
        claude: {
          cellSource: 'repo-config',
          selection: {
            selectedValue: 'opus',
            family: 'claude',
            selectionBranch: 'matrix-pinned',
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('resolves ordered route floors and discrete escalation entries', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            cursor: {
              high: [
                'composer-2.5',
                { harness: 'cursor', model: 'gpt-5.5-xhigh' },
              ],
            },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'cursor', '--json']);
    await runCommand(command, [
      '--provider',
      'cursor',
      '--escalation-level',
      '1',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'cursor',
      value: 'composer-2.5',
      providers: {
        cursor: {
          value: 'composer-2.5',
          dispatchArgs: { model: 'composer-2.5' },
          selection: {
            selectedValue: 'composer-2.5',
            selectionBranch: 'matrix-pinned',
            family: 'composer',
            target: {
              harness: 'cursor',
              model: 'composer-2.5',
              routeIndex: 0,
              routeLength: 2,
            },
          },
        },
      },
    });
    expect(capture.jsonPayloads[1]).toMatchObject({
      status: 'resolved',
      provider: 'cursor',
      value: 'gpt-5.5-xhigh',
      providers: {
        cursor: {
          value: 'gpt-5.5-xhigh',
          dispatchArgs: { model: 'gpt-5.5-xhigh' },
          selection: {
            selectedValue: 'gpt-5.5-xhigh',
            selectionBranch: 'escalation-target',
            family: 'openai',
            target: {
              harness: 'cursor',
              model: 'gpt-5.5-xhigh',
              routeIndex: 1,
              routeLength: 2,
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it.each([
    ['economy', 'gpt-5.6-luna-high'],
    ['balanced', 'gpt-5.6-terra-xhigh'],
    ['high', 'gpt-5.6-sol-high'],
    ['frontier', 'gpt-5.6-sol-max'],
  ] as const)(
    'round-trips the opaque Cursor %s model for implementer and reviewer resolution',
    async (policy, model) => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy },
          dispatchCeiling: {
            providers: {
              cursor: {
                economy: ['gpt-5.6-luna-high'],
                balanced: ['gpt-5.6-terra-xhigh'],
                high: ['gpt-5.6-sol-high'],
                frontier: ['gpt-5.6-sol-max'],
              },
            },
          },
        },
      });
      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'cursor',
        '--role',
        'implementer',
        '--preflight',
        '--non-interactive',
        '--json',
      ]);
      const reviewerArgs = [
        '--provider',
        'cursor',
        '--role',
        'reviewer',
        '--preflight',
        '--non-interactive',
        '--report-scope',
        'p04',
        '--report-action',
        'review',
        '--json',
      ];
      expect(reviewerArgs).not.toContain('--ceiling-tier');
      await runCommand(command, reviewerArgs);

      for (const payload of capture.jsonPayloads) {
        expect(payload).toMatchObject({
          status: 'resolved',
          provider: 'cursor',
          value: model,
          unresolved: false,
          providers: {
            cursor: {
              mode: 'enforced',
              dispatchArgs: { model },
              modelAxis: `selected:${model}`,
              effortAxis: 'not-applicable',
              selection: {
                selectedValue: model,
                target: { model, crossHarness: false },
              },
            },
          },
        });
      }
      expect(process.exitCode).toBe(0);
    },
  );

  it('matches the coordinator review envelope and rejects source or target drift', async () => {
    const { root, home } = await setup();
    const target = 'gpt-5.6-sol-xhigh';
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    cursor:',
        `      high: ${target}`,
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'cursor',
      '--role',
      'reviewer',
      '--preflight',
      '--non-interactive',
      '--report-scope',
      'p04',
      '--report-action',
      'review',
      '--project-path',
      '.oat/projects/shared/demo',
      '--json',
    ]);

    const payload = capture.jsonPayloads[0] as Record<string, unknown>;
    const expected: ReviewSelectionExpectation = {
      policy: 'high',
      source: 'project-state',
      ceilingTier: 'high',
      target: {
        harness: 'cursor',
        crossHarness: false,
        routeIndex: 0,
        routeLength: 1,
        model: target,
      },
      dispatchArgs: { model: target },
      modelAxis: `selected:${target}`,
      effortAxis: 'not-applicable',
    };

    expect(coordinatorReviewSelectionMatches(payload, 'cursor', expected)).toBe(
      true,
    );
    expect(
      coordinatorReviewSelectionMatches(payload, 'cursor', {
        ...expected,
        source: 'project',
      }),
    ).toBe(false);
    expect(
      coordinatorReviewSelectionMatches(payload, 'cursor', {
        ...expected,
        target: {
          harness: 'cursor',
          crossHarness: false,
          routeIndex: 0,
          routeLength: 1,
          model: 'different-target',
        },
      }),
    ).toBe(false);
    expect(process.exitCode).toBe(0);
  });

  it('keeps single-axis capped selection unchanged when escalation level is present', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchCeiling: { providers: { codex: 'medium' } } },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'implementer',
      '--preferred',
      'xhigh',
      '--escalation-level',
      '1',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      value: 'medium',
      providers: {
        codex: {
          dispatchArgs: null,
          selection: {
            preferredValue: 'xhigh',
            selectedValue: 'medium',
            capped: true,
            selectionMode: 'capped',
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports same-harness route targets and active-harness bare route entries', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            cursor: {
              high: [
                { harness: 'cursor', model: 'gpt-5.5-xhigh' },
                'composer-2.5',
              ],
            },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'cursor', '--json']);
    await runCommand(command, [
      '--provider',
      'cursor',
      '--escalation-level',
      '1',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      providers: {
        cursor: {
          dispatchArgs: { model: 'gpt-5.5-xhigh' },
          selection: {
            selectedValue: 'gpt-5.5-xhigh',
            target: {
              harness: 'cursor',
              model: 'gpt-5.5-xhigh',
              crossHarness: false,
            },
          },
        },
      },
    });
    expect(capture.jsonPayloads[1]).toMatchObject({
      providers: {
        cursor: {
          dispatchArgs: { model: 'composer-2.5' },
          selection: {
            selectedValue: 'composer-2.5',
            target: {
              harness: 'cursor',
              model: 'composer-2.5',
              crossHarness: false,
            },
          },
        },
      },
    });
  });

  it('uses the provider dispatch axis from same-harness route target objects', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            codex: {
              high: [
                {
                  harness: 'codex',
                  model: 'gpt-5.5',
                  effort: 'high',
                },
              ],
            },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'implementer',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'high',
      providers: {
        codex: {
          value: 'high',
          mode: 'enforced',
          dispatchArgs: {
            variant: buildCodexMaterializedTargetRoleName({
              agentName: 'oat-phase-implementer',
              model: 'gpt-5.5',
              effort: 'high',
            }),
          },
          selection: {
            selectedValue: 'high',
            target: {
              harness: 'codex',
              model: 'gpt-5.5',
              effort: 'high',
              crossHarness: false,
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('preserves codex matrix targets with model and effort', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            codex: {
              high: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-terra',
                  effort: 'xhigh',
                },
              ],
            },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'xhigh',
      providers: {
        codex: {
          value: 'xhigh',
          dispatchArgs: {
            variant: 'oat-phase-implementer-gpt-5-6-terra-xhigh',
          },
          modelAxis: 'selected:gpt-5.6-terra',
          effortAxis: 'selected:xhigh',
          selection: {
            selectedValue: 'xhigh',
            target: {
              harness: 'codex',
              model: 'gpt-5.6-terra',
              effort: 'xhigh',
              crossHarness: false,
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('dispatches reviewer codex matrix targets to reviewer materialized roles', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            codex: {
              high: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'xhigh',
                },
              ],
            },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'reviewer',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      providers: {
        codex: {
          value: 'xhigh',
          dispatchArgs: {
            variant: 'oat-reviewer-gpt-5-6-sol-xhigh',
          },
          modelAxis: 'selected:gpt-5.6-sol',
          effortAxis: 'selected:xhigh',
          selection: {
            role: 'reviewer',
            selectedValue: 'xhigh',
            target: {
              harness: 'codex',
              model: 'gpt-5.6-sol',
              effort: 'xhigh',
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it.each([
    ['low', 'low', false],
    ['medium', 'medium', false],
    ['high', 'high', false],
    ['xhigh', 'high', true],
    ['max', 'high', true],
  ] as const)(
    'retains the shipped managed High Codex model for preferred %s',
    async (preferred, selected, capped) => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'high' },
          dispatchCeiling: {
            providers: {
              codex: {
                economy: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-luna',
                    effort: 'high',
                  },
                ],
                balanced: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'xhigh',
                  },
                ],
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'high',
                  },
                ],
                frontier: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'max',
                  },
                ],
              },
            },
          },
        },
      });
      await mkdir(join(root, '.codex'), { recursive: true });
      await writeFile(
        join(root, '.codex', 'config.toml'),
        '[agents]\nmax_depth = 2\n',
        'utf8',
      );

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        preferred,
        '--preflight',
        '--non-interactive',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: 'high',
        unresolved: false,
        providers: {
          codex: {
            mode: 'enforced',
            dispatchArgs: {
              variant: `oat-phase-implementer-gpt-5-6-sol-${selected}`,
            },
            modelAxis: 'selected:gpt-5.6-sol',
            effortAxis: `selected:${selected}`,
            selection: {
              preferredValue: preferred,
              selectedValue: selected,
              capped,
              target: {
                harness: 'codex',
                model: 'gpt-5.6-sol',
                effort: selected,
                crossHarness: false,
              },
            },
          },
        },
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it('uses only the final modern ladder candidate as the ceiling before adaptive selection', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            codex: {
              high: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-luna',
                    effort: 'medium',
                  },
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      },
    });
    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'implementer',
      '--preferred',
      'medium',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      providers: {
        codex: {
          dispatchArgs: {
            variant: 'oat-phase-implementer-gpt-5-6-sol-medium',
          },
          selection: {
            selectedValue: 'medium',
            target: {
              model: 'gpt-5.6-sol',
              effort: 'medium',
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it.each([
    ['gpt-5.6-luna', 'medium', 'economy'],
    ['gpt-5.6-terra', 'low', 'balanced'],
  ] as const)(
    'allows High to select configured lower candidate %s/%s from %s',
    async (model, effort, candidateTier) => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'high' },
          dispatchCeiling: {
            providers: {
              codex: {
                economy: {
                  candidates: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-luna',
                      effort: 'medium',
                    },
                  ],
                },
                balanced: {
                  candidates: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-terra',
                      effort: 'low',
                    },
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-terra',
                      effort: 'medium',
                    },
                  ],
                },
                high: {
                  candidates: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-sol',
                      effort: 'high',
                    },
                  ],
                },
                frontier: {
                  candidates: [
                    {
                      harness: 'codex',
                      model: 'gpt-5.6-sol',
                      effort: 'max',
                    },
                  ],
                },
              },
            },
          },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--candidate-model',
        model,
        '--candidate-effort',
        effort,
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: 'high',
        policy: 'high',
        providers: {
          codex: {
            dispatchArgs: {
              variant: `oat-phase-implementer-${model.replaceAll('.', '-')}-${effort}`,
            },
            modelAxis: `selected:${model}`,
            effortAxis: `selected:${effort}`,
            selection: {
              requestedCandidate: { model, effort },
              candidateTier,
              ceilingTier: 'high',
              ceilingTarget: {
                harness: 'codex',
                model: 'gpt-5.6-sol',
                effort: 'high',
              },
              selectedValue: effort,
              selectionMode: 'candidate',
              target: { harness: 'codex', model, effort },
            },
          },
        },
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it('rejects a configured Frontier-only Codex candidate beneath High', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            codex: {
              high: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'high',
                  },
                ],
              },
              frontier: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'max',
                  },
                ],
              },
            },
          },
        },
      },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--candidate-model',
      'gpt-5.6-sol',
      '--candidate-effort',
      'max',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
    expect(capture.jsonPayloads[0]?.message).toContain(
      'above the configured high ceiling',
    );
    expect(process.exitCode).toBe(1);
  });

  it('allows configured Terra/medium beneath Balanced and rejects absent Terra/xhigh', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'balanced' },
        dispatchCeiling: {
          providers: {
            codex: {
              economy: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-luna',
                    effort: 'medium',
                  },
                ],
              },
              balanced: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'low',
                  },
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'medium',
                  },
                ],
              },
            },
          },
        },
      },
    });

    const allowed = createHarness({ cwd: root, home });
    await runCommand(allowed.command, [
      '--provider',
      'codex',
      '--candidate-model',
      'gpt-5.6-terra',
      '--candidate-effort',
      'medium',
      '--json',
    ]);
    expect(allowed.capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      providers: {
        codex: {
          dispatchArgs: {
            variant: 'oat-phase-implementer-gpt-5-6-terra-medium',
          },
          selection: {
            candidateTier: 'balanced',
            candidateIndex: 1,
            ceilingTier: 'balanced',
          },
        },
      },
    });

    const absent = createHarness({ cwd: root, home });
    await runCommand(absent.command, [
      '--provider',
      'codex',
      '--candidate-model',
      'gpt-5.6-terra',
      '--candidate-effort',
      'xhigh',
      '--json',
    ]);
    expect(absent.capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
    expect(absent.capture.jsonPayloads[0]?.message).toContain(
      'is not present in the configured codex candidate ladders',
    );
    expect(process.exitCode).toBe(1);
  });

  it('adds an optional dispatch report after exact resolution and preserves non-first candidate provenance', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'balanced' },
        dispatchCeiling: {
          providers: {
            codex: {
              balanced: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'low',
                  },
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'medium',
                  },
                ],
              },
            },
          },
        },
      },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--candidate-model',
      'gpt-5.6-terra',
      '--candidate-effort',
      'medium',
      '--report-scope',
      'p03-t04',
      '--report-action',
      'implementation',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      policy: 'balanced',
      source: 'repo-config',
      providers: {
        codex: {
          selection: {
            candidateIndex: 1,
            selectionBranch: 'candidate-requested',
          },
        },
      },
      dispatchReport: {
        schemaVersion: 1,
        route: {
          scope: 'p03-t04',
          action: 'implementation',
          role: 'implementer',
          target: 'oat-phase-implementer-gpt-5-6-terra-medium',
        },
        policy: {
          status: 'resolved',
          mode: 'managed',
          name: 'balanced',
          source: 'repo-config',
        },
        selection: {
          requestedCandidate: {
            model: 'gpt-5.6-terra',
            effort: 'medium',
          },
          candidateTier: 'balanced',
          candidateIndex: 1,
          exactSelectedTarget: {
            model: 'gpt-5.6-terra',
            effort: 'medium',
          },
          selectionBranch: 'candidate-requested',
          cellSource: 'repo-config',
        },
        requestedControls: {
          model: {
            value: 'gpt-5.6-terra',
            mechanism: 'materialized-role',
          },
          effort: {
            value: 'medium',
            mechanism: 'materialized-role',
          },
        },
        configuredDefaults: {
          effort: null,
          effortSource: null,
        },
        runtimeIdentity: {
          producer: null,
          provenance: 'unknown',
          confidence: 'not-reported',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('leaves JSON and human output unchanged when report context is absent', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchPolicy: { mode: 'inherit' } },
    });

    const jsonHarness = createHarness({ cwd: root, home });
    await runCommand(jsonHarness.command, ['--provider', 'codex', '--json']);
    expect({
      ...(jsonHarness.capture.jsonPayloads[0] as Record<string, unknown>),
      projectPath: '<project-path>',
    }).toMatchInlineSnapshot(`
      {
        "matrix": null,
        "policy": null,
        "policyMode": "inherit",
        "preset": null,
        "projectPath": "<project-path>",
        "provider": "codex",
        "providerDefaultEffort": "unknown",
        "providers": {
          "codex": {
            "cellSource": null,
            "dispatchArgs": null,
            "effortAxis": "provider-default",
            "mechanism": "pinned-variant",
            "mode": "advisory",
            "modelAxis": "inherited",
            "selection": {
              "candidateIndex": null,
              "candidateTier": null,
              "capped": false,
              "ceilingTarget": null,
              "ceilingTier": null,
              "cellSource": null,
              "family": "unknown",
              "policy": null,
              "policyMode": "inherit",
              "preferredValue": null,
              "requestedCandidate": null,
              "role": "implementer",
              "selectedValue": null,
              "selectionBranch": "inherit",
              "selectionMode": "inherit-default",
              "target": null,
            },
            "target": null,
            "value": null,
            "verifyOnDispatch": false,
          },
        },
        "source": "repo-config",
        "status": "resolved",
        "unresolved": false,
        "value": null,
      }
    `);

    const humanHarness = createHarness({ cwd: root, home });
    await runCommand(humanHarness.command, ['--provider', 'codex']);
    expect(humanHarness.capture.info.join('\n')).toMatchInlineSnapshot(`
      "Codex dispatch policy: inherit host defaults
      Resolved cap: none
      Source: repo config
      Mode: advisory (pinned-variant)
      Selection: inherit-default
      Codex provider default effort: unknown
      Note: OAT will not select a Codex effort; base/unpinned roles resolve through the provider default."
    `);
  });

  it('reports the Codex config source only when the configured default effort is known', async () => {
    const { root, home } = await setup();
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(
      join(home, '.codex', 'config.toml'),
      'model_reasoning_effort = "high"\n',
      'utf8',
    );
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchPolicy: { mode: 'inherit' } },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'reviewer',
      '--report-scope',
      'p03-review',
      '--report-action',
      'review',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      providerDefaultEffort: 'high',
      dispatchReport: {
        configuredDefaults: {
          effort: 'high',
          effortSource: 'codex-config',
        },
      },
    });
  });

  it('prints formatted human report output after the existing resolver output', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchPolicy: { mode: 'inherit' } },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'reviewer',
      '--report-scope',
      'p03-review',
      '--report-action',
      'review',
    ]);

    const output = capture.info.join('\n');
    expect(output).toContain('Codex dispatch policy: inherit host defaults');
    expect(output).toContain('Dispatch Report V1');
    expect(output).toContain('Action / role: review / reviewer');
    expect(output).toContain('Runtime identity was not reported.');
  });

  it('requires complete report context and validates action against the resolver role', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchPolicy: { mode: 'inherit' } },
    });

    const incomplete = createHarness({ cwd: root, home });
    await runCommand(incomplete.command, [
      '--provider',
      'codex',
      '--report-scope',
      'p03-t04',
      '--json',
    ]);
    expect(incomplete.capture.jsonPayloads[0]).toEqual({
      status: 'error',
      message: '--report-scope and --report-action must be provided together.',
    });

    const mismatch = createHarness({ cwd: root, home });
    await runCommand(mismatch.command, [
      '--provider',
      'codex',
      '--report-scope',
      'p03-review',
      '--report-action',
      'review',
      '--json',
    ]);
    expect(mismatch.capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        'review/reviewer requires resolver role reviewer, received implementer',
      ),
    });
    expect(process.exitCode).toBe(1);
  });

  it('applies an explicit named ceiling tier to one invocation without rewriting configuration', async () => {
    const { root, home } = await setup();
    const configPath = join(root, '.oat', 'config.json');
    const statePath = join(
      root,
      '.oat',
      'projects',
      'shared',
      'demo',
      'state.md',
    );
    await writeJson(configPath, {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            codex: {
              economy: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-luna',
                    effort: 'medium',
                  },
                ],
              },
              balanced: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'medium',
                  },
                ],
              },
              high: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'high',
                  },
                ],
              },
              frontier: {
                candidates: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'max',
                  },
                ],
              },
            },
          },
        },
      },
    });
    await writeFile(
      statePath,
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: balanced',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );
    const configBefore = await readFile(configPath, 'utf8');
    const stateBefore = await readFile(statePath, 'utf8');

    const explicit = createHarness({ cwd: root, home });
    await runCommand(explicit.command, [
      '--provider',
      'codex',
      '--role',
      'implementer',
      '--ceiling-tier',
      'balanced',
      '--candidate-model',
      'gpt-5.6-terra',
      '--candidate-effort',
      'medium',
      '--json',
    ]);

    expect(explicit.capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      policy: 'balanced',
      source: 'invocation',
      providers: {
        codex: {
          cellSource: 'repo-config',
          dispatchArgs: {
            variant: 'oat-phase-implementer-gpt-5-6-terra-medium',
          },
          selection: {
            candidateTier: 'balanced',
            ceilingTier: 'balanced',
            requestedCandidate: {
              model: 'gpt-5.6-terra',
              effort: 'medium',
            },
          },
        },
      },
    });
    expect(await readFile(configPath, 'utf8')).toBe(configBefore);
    expect(await readFile(statePath, 'utf8')).toBe(stateBefore);

    const inherited = createHarness({ cwd: root, home });
    await runCommand(inherited.command, [
      '--provider',
      'codex',
      '--role',
      'implementer',
      '--candidate-model',
      'gpt-5.6-sol',
      '--candidate-effort',
      'high',
      '--json',
    ]);
    expect(inherited.capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      policy: 'high',
      source: 'repo-config',
      providers: {
        codex: {
          dispatchArgs: {
            variant: 'oat-phase-implementer-gpt-5-6-sol-high',
          },
          selection: { ceilingTier: 'high' },
        },
      },
    });
  });

  it.each([
    {
      provider: 'claude',
      model: 'sonnet',
      matrix: {
        economy: { candidates: ['haiku'] },
        balanced: { candidates: ['sonnet'] },
        high: { candidates: ['opus'] },
        frontier: { candidates: ['fable'] },
      },
    },
    {
      provider: 'cursor',
      model: 'opaque:model/balanced [v2]',
      matrix: {
        economy: { candidates: ['opaque:model/economy [v1]'] },
        balanced: { candidates: ['opaque:model/balanced [v2]'] },
        high: { candidates: ['opaque:model/high [v3]'] },
        frontier: { candidates: ['opaque:model/frontier [v4]'] },
      },
    },
  ])(
    'preserves the exact $provider model under an explicit invocation ceiling',
    async ({ provider, model, matrix }) => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'frontier' },
          dispatchCeiling: { providers: { [provider]: matrix } },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        provider,
        '--role',
        'implementer',
        '--ceiling-tier',
        'high',
        '--candidate-model',
        model,
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        policy: 'high',
        source: 'invocation',
        providers: {
          [provider]: {
            cellSource: 'repo-config',
            dispatchArgs: { model },
            modelAxis: `selected:${model}`,
            selection: {
              ceilingTier: 'high',
              requestedCandidate: { model },
              target: { model },
            },
          },
        },
      });
    },
  );

  it.each([
    {
      provider: 'claude',
      policy: 'high',
      matrix: {
        economy: { candidates: ['haiku', 'sonnet'] },
        high: { candidates: ['opus'] },
      },
      model: 'sonnet',
      tier: 'economy',
    },
    {
      provider: 'cursor',
      policy: 'high',
      matrix: {
        economy: {
          candidates: ['opaque:model/lower [v1]'],
        },
        high: {
          candidates: ['opaque:model/high [v2]'],
        },
      },
      model: 'opaque:model/lower [v1]',
      tier: 'economy',
    },
  ] as const)(
    'preserves exact $provider candidate model output',
    async ({ provider, policy, matrix, model, tier }) => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy },
          dispatchCeiling: { providers: { [provider]: matrix } },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        provider,
        '--candidate-model',
        model,
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        providers: {
          [provider]: {
            dispatchArgs: { model },
            modelAxis: `selected:${model}`,
            selection: {
              requestedCandidate: { model },
              candidateTier: tier,
              ceilingTier: 'high',
              ceilingTarget: {
                model:
                  provider === 'claude' ? 'opus' : 'opaque:model/high [v2]',
              },
              selectedValue: model,
              target: { model },
            },
          },
        },
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it('rejects malformed closed-provider candidate ordering', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            claude: {
              high: { candidates: ['opus', 'sonnet'] },
            },
          },
        },
      },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'claude',
      '--candidate-model',
      'sonnet',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
    expect(capture.jsonPayloads[0]?.message).toContain(
      'Malformed claude candidate ordering in high',
    );
    expect(process.exitCode).toBe(1);
  });

  it.each([
    {
      args: [
        '--provider',
        'codex',
        '--candidate-model',
        'gpt-5.6-sol',
        '--candidate-effort',
        'high',
        '--preferred',
        'medium',
      ],
      message: 'cannot be combined with --preferred',
    },
    {
      args: [
        '--provider',
        'codex',
        '--role',
        'reviewer',
        '--candidate-model',
        'gpt-5.6-sol',
        '--candidate-effort',
        'high',
      ],
      message: 'Reviewer candidate requests are not supported',
    },
    {
      args: [
        '--provider',
        'codex',
        '--candidate-model',
        'oat-phase-implementer-gpt-5-6-sol-high',
        '--candidate-effort',
        'high',
      ],
      message: 'Direct dispatch role names are not candidate models',
    },
  ])(
    'rejects invalid candidate request: $message',
    async ({ args, message }) => {
      const { root, home } = await setup();
      const { command, capture } = createHarness({ cwd: root, home });

      await runCommand(command, [...args, '--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
      expect(capture.jsonPayloads[0]?.message).toContain(message);
      expect(process.exitCode).toBe(1);
    },
  );

  it('keeps exact candidate requests out of the legacy scalar policy path', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchCeiling: { providers: { codex: 'high' } } },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--candidate-model',
      'gpt-5.6-sol',
      '--candidate-effort',
      'high',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
    expect(capture.jsonPayloads[0]?.message).toContain(
      'requires a configured candidate ladder',
    );
    expect(process.exitCode).toBe(1);
  });

  it('resolves a lower exact candidate from a project-state named ceiling', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  matrix:',
        '    codex:',
        '      economy:',
        '        candidates:',
        '          - { harness: codex, model: gpt-5.6-luna, effort: low }',
        '          - { harness: codex, model: gpt-5.6-luna, effort: medium }',
        '      high:',
        '        candidates:',
        '          - { harness: codex, model: gpt-5.6-sol, effort: high }',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--candidate-model',
      'gpt-5.6-luna',
      '--candidate-effort',
      'medium',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      source: 'project-state',
      providers: {
        codex: {
          dispatchArgs: {
            variant: 'oat-phase-implementer-gpt-5-6-luna-medium',
          },
          selection: {
            requestedCandidate: {
              model: 'gpt-5.6-luna',
              effort: 'medium',
            },
            candidateTier: 'economy',
            candidateIndex: 1,
            ceilingTier: 'high',
            ceilingTarget: {
              model: 'gpt-5.6-sol',
              effort: 'high',
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('fails closed when one exact payload maps to distinct configured routes', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            cursor: {
              economy: { candidates: ['opaque-shared-target'] },
              balanced: {
                candidates: [
                  {
                    route: [
                      'opaque-shared-target',
                      { harness: 'claude', model: 'sonnet' },
                    ],
                  },
                ],
              },
              high: { candidates: ['opaque-high-target'] },
            },
          },
        },
      },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'cursor',
      '--candidate-model',
      'opaque-shared-target',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
    expect(capture.jsonPayloads[0]?.message).toContain(
      'configured with multiple routes',
    );
    expect(process.exitCode).toBe(1);
  });

  it('keeps candidate ordering distinct from fallback-route escalation', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            cursor: {
              economy: {
                candidates: [
                  {
                    route: [
                      'opaque-lower-target',
                      { harness: 'claude', model: 'sonnet' },
                    ],
                  },
                ],
              },
              high: { candidates: ['opaque-high-target'] },
            },
          },
        },
      },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'cursor',
      '--candidate-model',
      'opaque-lower-target',
      '--escalation-level',
      '1',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      providers: {
        cursor: {
          mode: 'advisory',
          dispatchArgs: null,
          selection: {
            selectionMode: 'candidate',
            selectionBranch: 'escalation-target',
            requestedCandidate: { model: 'opaque-lower-target' },
            candidateTier: 'economy',
            candidateIndex: 0,
            ceilingTier: 'high',
            selectedValue: 'sonnet',
            target: {
              harness: 'claude',
              model: 'sonnet',
              crossHarness: true,
              routeIndex: 1,
              routeLength: 2,
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('does not select another Codex model from duplicate effort cells', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            codex: {
              economy: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-luna',
                  effort: 'high',
                },
              ],
              balanced: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-terra',
                  effort: 'high',
                },
              ],
              high: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'xhigh',
                },
              ],
            },
          },
        },
      },
    });
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 2\n',
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'implementer',
      '--preferred',
      'high',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      value: 'xhigh',
      providers: {
        codex: {
          dispatchArgs: {
            variant: 'oat-phase-implementer-gpt-5-6-sol-high',
          },
          modelAxis: 'selected:gpt-5.6-sol',
          effortAxis: 'selected:high',
          selection: {
            selectedValue: 'high',
            target: {
              model: 'gpt-5.6-sol',
              effort: 'high',
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('retains the capped codex target when preferred effort exceeds it', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            codex: {
              high: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'high',
                },
              ],
            },
          },
        },
      },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--preferred',
      'max',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      value: 'high',
      providers: {
        codex: {
          mode: 'enforced',
          dispatchArgs: {
            variant: 'oat-phase-implementer-gpt-5-6-sol-high',
          },
          selection: {
            preferredValue: 'max',
            selectedValue: 'high',
            capped: true,
            target: {
              model: 'gpt-5.6-sol',
              effort: 'high',
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('blocks preflight for incomplete codex materialized targets', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            codex: {
              high: [
                {
                  harness: 'codex',
                  effort: 'xhigh',
                },
              ],
            },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      provider: 'codex',
      value: null,
      unresolved: true,
      providers: {
        codex: {
          value: null,
          mode: 'advisory',
          dispatchArgs: null,
          selection: {
            selectedValue: null,
            selectionMode: 'unresolved',
            target: {
              harness: 'codex',
              effort: 'xhigh',
              crossHarness: false,
            },
          },
        },
      },
    });
    expect(capture.warn.join('\n')).toContain('model and effort');
    expect(process.exitCode).toBe(1);
  });

  it('blocks preflight when managed codex policy has no materialized target', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
      },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      provider: 'codex',
      value: 'xhigh',
      policyMode: 'managed',
      policy: 'high',
      unresolved: true,
      providers: {
        codex: {
          mode: 'advisory',
          dispatchArgs: null,
          selection: {
            selectedValue: 'xhigh',
            selectionMode: 'capped',
          },
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('resolves preflight for an explicit max codex materialized target', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'frontier' },
        dispatchCeiling: {
          providers: {
            codex: {
              frontier: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'max',
                },
              ],
            },
          },
        },
      },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'reviewer',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      value: 'max',
      unresolved: false,
      providers: {
        codex: {
          mode: 'enforced',
          dispatchArgs: { variant: 'oat-reviewer-gpt-5-6-sol-max' },
          modelAxis: 'selected:gpt-5.6-sol',
          effortAxis: 'selected:max',
          selection: {
            selectedValue: 'max',
            target: {
              model: 'gpt-5.6-sol',
              effort: 'max',
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it.each([
    ['missing', ''],
    ['invalid', 'max_depth = "invalid"'],
    ['below the required floor', 'max_depth = 1'],
  ])(
    'blocks managed codex implementation preflight when project max depth is %s',
    async (_label, depthLine) => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'high' },
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      });
      await mkdir(join(root, '.codex'), { recursive: true });
      await writeFile(
        join(root, '.codex', 'config.toml'),
        `[agents]\n${depthLine}\n`,
        'utf8',
      );

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preflight',
        '--non-interactive',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'blocked',
        provider: 'codex',
        unresolved: true,
      });
      expect(
        (capture.jsonPayloads[0] as { message?: string }).message,
      ).toContain('root (0) → phase coordinator (1) → task worker (2)');
      expect(
        (capture.jsonPayloads[0] as { message?: string }).message,
      ).toContain('oat sync --scope project');
      expect(
        (capture.jsonPayloads[0] as { message?: string }).message,
      ).toContain(
        'oat providers codex materialize <agent-name> --model <model> --effort <effort> --scope project',
      );
      expect(process.exitCode).toBe(1);
    },
  );

  it.each([2, 4])(
    'passes managed codex implementation preflight at project max depth %i',
    async (maxDepth) => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'high' },
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      });
      await mkdir(join(root, '.codex'), { recursive: true });
      await writeFile(
        join(root, '.codex', 'config.toml'),
        `[agents]\nmax_depth = ${maxDepth}\n`,
        'utf8',
      );

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preflight',
        '--non-interactive',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        provider: 'codex',
        unresolved: false,
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it('inherits user max depth for project implementation preflight only when project depth is absent', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            codex: {
              high: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'high',
                },
              ],
            },
          },
        },
      },
    });
    await mkdir(join(root, '.codex'), { recursive: true });
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(join(root, '.codex', 'config.toml'), '[agents]\n', 'utf8');
    await writeFile(
      join(home, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 3\n',
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'implementer',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      unresolved: false,
    });
    expect(process.exitCode).toBe(0);
  });

  it('does not inherit user max depth over an invalid project value during preflight', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            codex: {
              high: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'high',
                },
              ],
            },
          },
        },
      },
    });
    await mkdir(join(root, '.codex'), { recursive: true });
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[agents]\nmax_depth = "invalid"\n',
      'utf8',
    );
    await writeFile(
      join(home, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 4\n',
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--role',
      'implementer',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      provider: 'codex',
      unresolved: true,
    });
    expect((capture.jsonPayloads[0] as { message?: string }).message).toContain(
      'agents.max_depth is not a valid number',
    );
    expect(process.exitCode).toBe(1);
  });

  it('uses user-scoped depth and remediation for user implementation preflight', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchPolicy: { mode: 'managed', policy: 'high' },
        dispatchCeiling: {
          providers: {
            codex: {
              high: [
                {
                  harness: 'codex',
                  model: 'gpt-5.6-sol',
                  effort: 'high',
                },
              ],
            },
          },
        },
      },
    });
    await mkdir(join(root, '.codex'), { recursive: true });
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 4\n',
      'utf8',
    );
    await writeFile(
      join(home, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 1\n',
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(
      command,
      [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preflight',
        '--non-interactive',
        '--json',
      ],
      ['--scope', 'user'],
    );

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      provider: 'codex',
      unresolved: true,
    });
    expect((capture.jsonPayloads[0] as { message?: string }).message).toContain(
      'oat sync --scope user',
    );
    expect((capture.jsonPayloads[0] as { message?: string }).message).toContain(
      'oat providers codex materialize <agent-name> --model <model> --effort <effort> --scope user',
    );
    expect(process.exitCode).toBe(1);
  });

  it('does not use harness as a same-harness route dispatch value', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            cursor: {
              high: [{ harness: 'cursor' }],
            },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'cursor', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'cursor',
      value: null,
      providers: {
        cursor: {
          value: null,
          mode: 'advisory',
          dispatchArgs: null,
          target: {
            harness: 'cursor',
            crossHarness: false,
          },
          selection: {
            selectedValue: null,
            selectionMode: 'unresolved',
            target: {
              harness: 'cursor',
              crossHarness: false,
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('marks cross-harness route targets advisory without native dispatch args', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: {
        dispatchCeiling: {
          providers: {
            codex: {
              high: [{ harness: 'cursor', model: 'gpt-5.5-xhigh' }],
            },
          },
        },
      },
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[agents]\nmax_depth = 2\n',
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: 'gpt-5.5-xhigh',
      providers: {
        codex: {
          value: 'gpt-5.5-xhigh',
          mode: 'advisory',
          dispatchArgs: null,
          target: {
            harness: 'cursor',
            model: 'gpt-5.5-xhigh',
            crossHarness: true,
          },
          selection: {
            selectedValue: 'gpt-5.5-xhigh',
            target: {
              harness: 'cursor',
              model: 'gpt-5.5-xhigh',
              crossHarness: true,
            },
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('blocks non-interactive preflight when a managed provider cell is absent', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: high',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'cursor',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      provider: 'cursor',
      value: null,
      unresolved: true,
      providers: {
        cursor: {
          value: null,
          mode: 'advisory',
          selection: {
            selectedValue: null,
            selectionBranch: 'unresolved',
            family: 'unknown',
          },
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('keeps absent project policy and legacy ceiling state unresolved', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'unresolved',
      provider: 'codex',
      value: null,
      source: null,
      preset: null,
      unresolved: true,
      providers: {
        codex: {
          value: null,
          dispatchArgs: null,
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('blocks unresolved non-interactive preflight', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'codex',
      '--preflight',
      '--non-interactive',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      provider: 'codex',
      value: null,
      source: null,
      unresolved: true,
    });
    expect((capture.jsonPayloads[0] as { message?: string }).message).toContain(
      'BLOCKED: Codex dispatch policy is unresolved',
    );
    expect(process.exitCode).toBe(1);
  });

  it('reports unresolved json preflight without blocking interactive-capable callers', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--preflight', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'unresolved',
      provider: 'codex',
      value: null,
      source: null,
      unresolved: true,
    });
    expect(
      (capture.jsonPayloads[0] as { message?: string }).message,
    ).toBeUndefined();
    expect(process.exitCode).toBe(0);
  });

  it('blocks unresolved preflight when OAT_NON_INTERACTIVE is set', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({
      cwd: root,
      home,
      processEnv: { OAT_NON_INTERACTIVE: '1' },
    });
    await runCommand(command, ['--provider', 'codex', '--preflight', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      provider: 'codex',
      value: null,
      source: null,
      unresolved: true,
    });
    expect((capture.jsonPayloads[0] as { message?: string }).message).toContain(
      'BLOCKED: Codex dispatch policy is unresolved',
    );
    expect(process.exitCode).toBe(1);
  });

  it('prints human-readable Claude resolution', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchCeiling: { providers: { claude: 'sonnet' } } },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'claude']);

    expect(capture.info).toContain('Claude dispatch policy: legacy capped');
    expect(capture.info).toContain('Resolved cap: sonnet');
    expect(capture.info).toContain('Source: repo config');
    expect(capture.info).toContain('Mode: enforced (model-arg)');
    expect(capture.info).toContain('Selection: capped');
    expect(capture.info).toContain('Effort axis: not-applicable');
    expect(process.exitCode).toBe(0);
  });

  it('reports clear guidance for invalid project dispatch policy values', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_policy:',
        '  mode: managed',
        '  policy: maximum',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
    expect((capture.jsonPayloads[0] as { message?: string }).message).toContain(
      'Invalid project dispatch policy "maximum". Valid managed policies: economy, balanced, high, frontier, uncapped.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('resolves Claude fable from repo config to Task model args', async () => {
    const { root, home } = await setup();
    await writeJson(join(root, '.oat', 'config.json'), {
      version: 1,
      workflow: { dispatchCeiling: { providers: { claude: 'fable' } } },
    });

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, [
      '--provider',
      'claude',
      '--role',
      'reviewer',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'claude',
      value: 'fable',
      source: 'repo-config',
      unresolved: false,
      providers: {
        claude: {
          value: 'fable',
          mode: 'enforced',
          mechanism: 'model-arg',
          dispatchArgs: { model: 'fable' },
          modelAxis: 'selected:fable',
          effortAxis: 'not-applicable',
          selection: {
            role: 'reviewer',
            selectedValue: 'fable',
          },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('resolves Claude fable from project state to Task model args', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
      [
        '---',
        'oat_phase: implement',
        'oat_dispatch_ceiling:',
        '  providers:',
        '    claude: fable',
        '  source: project-state',
        '---',
        '',
        '# State',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'claude', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'claude',
      value: 'fable',
      source: 'project-state',
      unresolved: false,
      providers: {
        claude: {
          value: 'fable',
          mode: 'enforced',
          mechanism: 'model-arg',
          dispatchArgs: { model: 'fable' },
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('resolves unknown providers as advisory/unsupported instead of erroring', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'other-provider', '--json']);

    const payload = capture.jsonPayloads[0] as {
      status: string;
      provider: string;
      providers: Record<
        string,
        { value: string | null; mode: string; dispatchArgs: unknown }
      >;
    };

    // Provider-neutral design: an unknown provider must NOT produce a command
    // error. It flows through the fallback no-op adapter and resolves advisory.
    expect(payload.status).not.toBe('error');
    expect(payload.provider).toBe('other-provider');
    expect(payload.providers['other-provider'].mode).toBe('unsupported');
    expect(payload.providers['other-provider'].value).toBeNull();
    expect(payload.providers['other-provider'].dispatchArgs).toBeNull();
    // Unknown providers never have concrete config/state values, so they are
    // unresolved (advisory) rather than blocked or errored.
    expect(payload.status).toBe('unresolved');
    expect(process.exitCode).toBe(0);
  });

  it('supports explicit project paths without active project lookup', async () => {
    const { root, home } = await setup();
    const explicitProject = join(
      root,
      '.oat',
      'projects',
      'shared',
      'explicit',
    );
    await mkdir(explicitProject, { recursive: true });
    await writeFile(
      join(explicitProject, 'state.md'),
      [
        '---',
        'oat_dispatch_ceiling:',
        '  providers:',
        '    codex: medium',
        '  source: project-state',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );

    const { command, capture } = createHarness({
      cwd: root,
      home,
      activeProjectPath: null,
    });
    await runCommand(command, [
      '--provider',
      'codex',
      '--project-path',
      '.oat/projects/shared/explicit',
      '--json',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      value: 'medium',
      source: 'project-state',
      projectPath: explicitProject,
    });
    expect(process.exitCode).toBe(0);
  });

  it('leaves project state unmodified when only resolving', async () => {
    const { root, home } = await setup();
    const statePath = join(
      root,
      '.oat',
      'projects',
      'shared',
      'demo',
      'state.md',
    );
    const before = await readFile(statePath, 'utf8');

    const { command } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

    await expect(readFile(statePath, 'utf8')).resolves.toBe(before);
  });

  describe('adapter-aware resolution', () => {
    it('reads concrete providers and never the preset label for dispatch', async () => {
      const { root, home } = await setup();
      // Preset persisted as provenance only; concrete providers must drive dispatch.
      await writeFile(
        join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
        [
          '---',
          'oat_phase: implement',
          'oat_dispatch_ceiling:',
          '  preset: balanced',
          '  providers:',
          '    codex: high',
          '  source: project-state',
          '---',
          '',
          '# State',
          '',
        ].join('\n'),
        'utf8',
      );

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, ['--provider', 'codex', '--json']);

      const payload = capture.jsonPayloads[0] as {
        value: string;
        preset: string | null;
        providers: Record<string, { value: string | null }>;
      };
      // Resolved value is the concrete provider value, not the preset label.
      expect(payload.value).toBe('high');
      expect(payload.providers.codex.value).toBe('high');
      expect(payload.preset).toBe('balanced');
    });

    it('computes mode from the adapter registry, never from persisted state', async () => {
      const { root, home } = await setup();
      // Even if state carries a bogus mode-like field, the resolver ignores it
      // and computes mode fresh from the adapter.
      await writeFile(
        join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
        [
          '---',
          'oat_phase: implement',
          'oat_dispatch_ceiling:',
          '  providers:',
          '    claude: sonnet',
          '  mode: unsupported',
          '  source: project-state',
          '---',
          '',
          '# State',
          '',
        ].join('\n'),
        'utf8',
      );

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, ['--provider', 'claude', '--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        providers: {
          claude: {
            value: 'sonnet',
            mode: 'enforced',
            mechanism: 'model-arg',
            dispatchArgs: { model: 'sonnet' },
          },
        },
      });
    });

    it('does not set verifyOnDispatch for a cap-down request', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { claude: 'sonnet' } } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'claude',
        '--orchestrator-tier',
        'opus',
        '--json',
      ]);

      const payload = capture.jsonPayloads[0] as {
        providers: Record<string, { verifyOnDispatch?: boolean }>;
      };
      expect(payload.providers.claude.verifyOnDispatch).toBe(false);
    });

    it('sets verifyOnDispatch for an above-orchestrator upgrade request', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { claude: 'opus' } } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'claude',
        '--orchestrator-tier',
        'sonnet',
        '--json',
      ]);

      const payload = capture.jsonPayloads[0] as {
        providers: Record<string, { verifyOnDispatch?: boolean }>;
      };
      expect(payload.providers.claude.verifyOnDispatch).toBe(true);
    });

    it('reports the reviewer variant when role is reviewer', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { codex: 'high' } } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'reviewer',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        providers: {
          codex: {
            dispatchArgs: null,
          },
        },
      });
    });

    it('selects the lower preferred Codex effort under a higher ceiling', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { codex: 'xhigh' } } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'medium',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        value: 'xhigh',
        providers: {
          codex: {
            value: 'xhigh',
            dispatchArgs: null,
            modelAxis: 'unresolved',
            effortAxis: 'unresolved',
            selection: {
              role: 'implementer',
              preferredValue: 'medium',
              selectedValue: 'medium',
              capped: false,
              selectionMode: 'capped',
              policyMode: 'managed',
              policy: 'legacy-ceiling',
            },
          },
        },
      });
    });

    it('caps implementer dispatch args down when preferred exceeds the Codex ceiling', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { codex: 'medium' } } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'xhigh',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        value: 'medium',
        providers: {
          codex: {
            dispatchArgs: null,
            selection: {
              role: 'implementer',
              preferredValue: 'xhigh',
              selectedValue: 'medium',
              capped: true,
              selectionMode: 'capped',
              policyMode: 'managed',
              policy: 'legacy-ceiling',
            },
          },
        },
      });
    });

    it('reports an error for invalid preferred Codex effort', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { codex: 'xhigh' } } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'bogus',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
      });
      expect(
        (capture.jsonPayloads[0] as { message?: string }).message,
      ).toContain('Invalid preferred dispatch value "bogus" for codex');
      expect(process.exitCode).toBe(1);
    });

    it('keeps preferred effort informational when the Codex ceiling is unresolved', async () => {
      const { root, home } = await setup();

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'medium',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'unresolved',
        value: null,
        providers: {
          codex: {
            value: null,
            dispatchArgs: null,
            selection: {
              role: 'implementer',
              preferredValue: 'medium',
              selectedValue: null,
              capped: false,
              selectionMode: 'unresolved',
              policyMode: null,
              policy: null,
            },
          },
        },
      });
      expect(process.exitCode).toBe(0);
    });

    it('ignores preferred values for unsupported providers', async () => {
      const { root, home } = await setup();

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'other-provider',
        '--role',
        'implementer',
        '--preferred',
        'medium',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'unresolved',
        provider: 'other-provider',
        providers: {
          'other-provider': {
            value: null,
            mode: 'unsupported',
            dispatchArgs: null,
            selection: {
              role: 'implementer',
              preferredValue: null,
              selectedValue: null,
              capped: false,
              selectionMode: 'unresolved',
              policyMode: null,
              policy: null,
            },
          },
        },
      });
      expect(process.exitCode).toBe(0);
    });

    it('caps Claude implementer dispatch args down when preferred exceeds the ceiling', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { claude: 'sonnet' } } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'claude',
        '--role',
        'implementer',
        '--preferred',
        'opus',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        value: 'sonnet',
        providers: {
          claude: {
            dispatchArgs: { model: 'sonnet' },
            modelAxis: 'selected:sonnet',
            effortAxis: 'not-applicable',
            selection: {
              role: 'implementer',
              preferredValue: 'opus',
              selectedValue: 'sonnet',
              capped: true,
            },
          },
        },
      });
    });

    it('keeps reviewer dispatch args at the Codex ceiling even with a preferred value', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { codex: 'xhigh' } } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'reviewer',
        '--preferred',
        'medium',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        providers: {
          codex: {
            dispatchArgs: null,
            selection: {
              role: 'reviewer',
              preferredValue: 'medium',
              selectedValue: 'xhigh',
              capped: false,
              selectionMode: 'review-target',
              policyMode: 'managed',
              policy: 'legacy-ceiling',
            },
          },
        },
      });
    });

    it('selects preferred Codex effort for managed uncapped implementer dispatch', async () => {
      const { root, home } = await setup();
      await writeFile(
        join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
        [
          '---',
          'oat_phase: implement',
          'oat_dispatch_policy:',
          '  mode: managed',
          '  policy: uncapped',
          '  source: project-state',
          '---',
          '',
          '# State',
          '',
        ].join('\n'),
        'utf8',
      );

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'xhigh',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: null,
        source: 'project-state',
        preset: 'uncapped',
        unresolved: false,
        providers: {
          codex: {
            value: null,
            mode: 'advisory',
            dispatchArgs: null,
            selection: {
              role: 'implementer',
              preferredValue: 'xhigh',
              selectedValue: 'xhigh',
              capped: false,
              selectionMode: 'uncapped',
              policyMode: 'managed',
              policy: 'uncapped',
            },
          },
        },
      });
      expect(process.exitCode).toBe(0);
    });

    it('selects preferred Codex matrix target for repo-config managed uncapped policy', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'uncapped' },
          dispatchCeiling: {
            providers: {
              codex: {
                high: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-terra',
                    effort: 'high',
                  },
                ],
              },
            },
          },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'high',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: null,
        source: 'repo-config',
        preset: 'uncapped',
        providers: {
          codex: {
            mode: 'enforced',
            mechanism: 'pinned-variant',
            dispatchArgs: {
              variant: 'oat-phase-implementer-gpt-5-6-terra-high',
            },
            modelAxis: 'selected:gpt-5.6-terra',
            effortAxis: 'selected:high',
            selection: {
              preferredValue: 'high',
              selectedValue: 'high',
              selectionMode: 'uncapped',
              policy: 'uncapped',
              target: {
                harness: 'codex',
                model: 'gpt-5.6-terra',
                effort: 'high',
                crossHarness: false,
              },
            },
          },
        },
      });
    });

    it('maps preferred xhigh Codex effort to frontier matrix target for managed uncapped policy', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'uncapped' },
          dispatchCeiling: {
            providers: {
              codex: {
                frontier: [
                  {
                    harness: 'codex',
                    model: 'gpt-5.6-sol',
                    effort: 'xhigh',
                  },
                ],
              },
            },
          },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'xhigh',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: null,
        source: 'repo-config',
        preset: 'uncapped',
        providers: {
          codex: {
            mode: 'enforced',
            mechanism: 'pinned-variant',
            dispatchArgs: {
              variant: 'oat-phase-implementer-gpt-5-6-sol-xhigh',
            },
            modelAxis: 'selected:gpt-5.6-sol',
            effortAxis: 'selected:xhigh',
            selection: {
              preferredValue: 'xhigh',
              selectedValue: 'xhigh',
              selectionMode: 'uncapped',
              policy: 'uncapped',
              target: {
                harness: 'codex',
                model: 'gpt-5.6-sol',
                effort: 'xhigh',
                crossHarness: false,
              },
            },
          },
        },
      });
    });

    it('keeps repo legacy cap over lower-precedence user managed uncapped policy', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { codex: 'medium' } } },
      });
      await writeJson(join(home, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'uncapped' },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'xhigh',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: 'medium',
        source: 'repo-config',
        policyMode: 'managed',
        policy: 'legacy-ceiling',
        providers: {
          codex: {
            dispatchArgs: null,
            selection: {
              preferredValue: 'xhigh',
              selectedValue: 'medium',
              capped: true,
              selectionMode: 'capped',
              policy: 'legacy-ceiling',
            },
          },
        },
      });
    });

    it('keeps local legacy cap over lower-precedence user inherit policy', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.local.json'), {
        version: 1,
        activeProject: '.oat/projects/shared/demo',
        workflow: { dispatchCeiling: { providers: { codex: 'medium' } } },
      });
      await writeJson(join(home, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchPolicy: { mode: 'inherit' } },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'xhigh',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: 'medium',
        source: 'local-config',
        policyMode: 'managed',
        policy: 'legacy-ceiling',
        providers: {
          codex: {
            dispatchArgs: null,
            selection: {
              preferredValue: 'xhigh',
              selectedValue: 'medium',
              capped: true,
              selectionMode: 'capped',
              policyMode: 'managed',
              policy: 'legacy-ceiling',
            },
          },
        },
      });
    });

    it('prefers higher-precedence managed uncapped policy over legacy cap', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: { dispatchCeiling: { providers: { codex: 'medium' } } },
      });
      await writeJson(join(root, '.oat', 'config.local.json'), {
        version: 1,
        activeProject: '.oat/projects/shared/demo',
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'uncapped' },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'xhigh',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: null,
        source: 'local-config',
        policyMode: 'managed',
        policy: 'uncapped',
        preset: 'uncapped',
        providers: {
          codex: {
            dispatchArgs: null,
            selection: {
              preferredValue: 'xhigh',
              selectedValue: 'xhigh',
              capped: false,
              selectionMode: 'uncapped',
              policy: 'uncapped',
            },
          },
        },
      });
    });

    it('documents Codex uncapped pinned variant host-default caveat in human output', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'uncapped' },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'xhigh',
      ]);

      const output = capture.info.join('\n');
      expect(capture.info).toContain('Codex dispatch policy: uncapped');
      expect(capture.info).toContain('Resolved cap: none');
      expect(capture.info).toContain('Selection: uncapped');
      expect(output).toContain(
        'Actual host support for upward effort selection must be verified by the dispatching host.',
      );
    });

    it('returns explicit no-target reviewer fallback for managed uncapped policy', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'uncapped' },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'reviewer',
        '--preflight',
        '--non-interactive',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: null,
        source: 'repo-config',
        preset: 'uncapped',
        unresolved: false,
        providers: {
          codex: {
            value: null,
            mode: 'advisory',
            dispatchArgs: null,
            selection: {
              role: 'reviewer',
              preferredValue: null,
              selectedValue: null,
              capped: false,
              selectionMode: 'no-review-target',
              policyMode: 'managed',
              policy: 'uncapped',
            },
          },
        },
      });
    });

    it('selects preferred Claude fable model for managed uncapped implementer dispatch', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'uncapped' },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'claude',
        '--role',
        'implementer',
        '--preferred',
        'fable',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        provider: 'claude',
        value: null,
        providers: {
          claude: {
            mode: 'enforced',
            mechanism: 'model-arg',
            dispatchArgs: { model: 'fable' },
            modelAxis: 'selected:fable',
            effortAxis: 'not-applicable',
            selection: {
              preferredValue: 'fable',
              selectedValue: 'fable',
              selectionMode: 'uncapped',
              policy: 'uncapped',
            },
          },
        },
      });
    });

    it('returns no dispatch args for Codex inherit/default config policy', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'inherit' },
          dispatchCeiling: { providers: { codex: 'xhigh' } },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'codex',
        '--role',
        'implementer',
        '--preferred',
        'high',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        value: null,
        policyMode: 'inherit',
        policy: null,
        providers: {
          codex: {
            mode: 'advisory',
            dispatchArgs: null,
            selection: {
              preferredValue: null,
              selectedValue: null,
              selectionMode: 'inherit-default',
              policyMode: 'inherit',
            },
          },
        },
      });
    });

    it('returns no dispatch args for inherit/default project policy', async () => {
      const { root, home } = await setup();
      await writeFile(
        join(root, '.oat', 'projects', 'shared', 'demo', 'state.md'),
        [
          '---',
          'oat_phase: implement',
          'oat_dispatch_policy:',
          '  mode: inherit',
          '  source: project-state',
          '---',
          '',
          '# State',
          '',
        ].join('\n'),
        'utf8',
      );

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'claude',
        '--role',
        'implementer',
        '--preferred',
        'fable',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        provider: 'claude',
        value: null,
        source: 'project-state',
        preset: null,
        unresolved: false,
        providers: {
          claude: {
            value: null,
            mode: 'advisory',
            dispatchArgs: null,
            selection: {
              role: 'implementer',
              preferredValue: null,
              selectedValue: null,
              capped: false,
              selectionMode: 'inherit-default',
              policyMode: 'inherit',
              policy: null,
            },
          },
        },
      });
    });

    it('keeps Cursor with no managed cell unresolved', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'frontier' },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, ['--provider', 'cursor', '--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'unresolved',
        provider: 'cursor',
        value: null,
        policyMode: null,
        policy: null,
        unresolved: true,
        providers: {
          cursor: {
            value: null,
            mode: 'advisory',
            mechanism: 'model-arg',
            dispatchArgs: null,
            selection: {
              selectedValue: null,
              selectionMode: 'unresolved',
              selectionBranch: 'unresolved',
              family: 'unknown',
            },
          },
        },
      });
    });

    it('resolves unsupported providers with managed uncapped policy as unsupported', async () => {
      const { root, home } = await setup();
      await writeJson(join(root, '.oat', 'config.json'), {
        version: 1,
        workflow: {
          dispatchPolicy: { mode: 'managed', policy: 'uncapped' },
        },
      });

      const { command, capture } = createHarness({ cwd: root, home });
      await runCommand(command, [
        '--provider',
        'other-provider',
        '--role',
        'implementer',
        '--preferred',
        'xhigh',
        '--json',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'resolved',
        provider: 'other-provider',
        value: null,
        policyMode: 'managed',
        policy: 'uncapped',
        providers: {
          'other-provider': {
            mode: 'unsupported',
            mechanism: 'none',
            dispatchArgs: null,
            selection: {
              preferredValue: null,
              selectedValue: null,
              selectionMode: 'uncapped',
              policy: 'uncapped',
            },
          },
        },
      });
    });
  });
});
