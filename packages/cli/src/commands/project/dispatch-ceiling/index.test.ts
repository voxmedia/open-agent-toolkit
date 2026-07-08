import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { resolveEffectiveConfig } from '@config/resolve';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectDispatchCeilingCommand } from './index';

interface HarnessOptions {
  cwd: string;
  home: string;
  activeProjectPath?: string | null;
  processEnv?: NodeJS.ProcessEnv;
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
    [...globalArgs, 'project', 'dispatch-ceiling', 'resolve', ...commandArgs],
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
          mode: 'enforced',
          mechanism: 'pinned-variant',
          dispatchArgs: { variant: 'oat-phase-implementer-high' },
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
          mode: 'enforced',
          mechanism: 'pinned-variant',
          dispatchArgs: { variant: 'oat-phase-implementer-xhigh' },
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
          mode: 'enforced',
          mechanism: 'pinned-variant',
          dispatchArgs: { variant: 'oat-phase-implementer-high' },
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
          dispatchArgs: { variant: 'oat-phase-implementer-medium' },
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
          dispatchArgs: { variant: 'oat-phase-implementer-high' },
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

  it('reports incomplete codex materialized targets as unresolved', async () => {
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
    await runCommand(command, ['--provider', 'codex', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'resolved',
      provider: 'codex',
      value: null,
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
    expect(process.exitCode).toBe(0);
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

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['--provider', 'codex', '--json']);

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
    await runCommand(command, ['--provider', 'claude', '--json']);

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
            dispatchArgs: { variant: 'oat-reviewer-high' },
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
            dispatchArgs: { variant: 'oat-phase-implementer-medium' },
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
            dispatchArgs: { variant: 'oat-phase-implementer-medium' },
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
            dispatchArgs: { variant: 'oat-reviewer-xhigh' },
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
            mode: 'enforced',
            dispatchArgs: { variant: 'oat-phase-implementer-xhigh' },
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

    it('selects preferred Codex pinned variant for repo-config managed uncapped policy', async () => {
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
            dispatchArgs: { variant: 'oat-phase-implementer-high' },
            selection: {
              preferredValue: 'high',
              selectedValue: 'high',
              selectionMode: 'uncapped',
              policy: 'uncapped',
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
            dispatchArgs: { variant: 'oat-phase-implementer-medium' },
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
            dispatchArgs: { variant: 'oat-phase-implementer-medium' },
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
            dispatchArgs: { variant: 'oat-phase-implementer-xhigh' },
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
