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
import { createLoggerCapture } from '@commands/__tests__/helpers';
import {
  type InitToolsDependencies,
  loadRealizedGuidanceState,
} from '@commands/init/tools';
import {
  buildToolPacksSectionBody,
  type ProjectGuidancePack,
} from '@commands/init/tools/project-guidance';
import { upsertAgentsMdSections } from '@commands/shared/agents-md';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createToolsGuidanceCommand } from './index';

const PACKS: ProjectGuidancePack[] = [
  { pack: 'workflows', scope: 'project' },
  { pack: 'core', scope: 'user' },
];

async function snapshotTree(root: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else snapshot[relative(root, full)] = await readFile(full, 'utf8');
    }
  }
  await walk(root);
  return snapshot;
}

async function run(command: Command, globalArgs: string[] = []) {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const tools = new Command('tools');
  tools.addCommand(command);
  program.addCommand(tools);
  await program.parseAsync([...globalArgs, 'tools', 'guidance'], {
    from: 'user',
  });
}

function contextBuilder(capture: ReturnType<typeof createLoggerCapture>) {
  return (globalOptions: GlobalOptions): CommandContext => ({
    scope: 'all' as Scope,
    dryRun: false,
    verbose: false,
    json: globalOptions.json ?? false,
    cwd: globalOptions.cwd ?? '/tmp/workspace',
    home: '/tmp/home',
    interactive: false,
    logger: capture.logger,
  });
}

describe('oat tools guidance', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('prints exactly the managed block the AGENTS.md writer would produce', async () => {
    const capture = createLoggerCapture();
    const command = createToolsGuidanceCommand({
      buildCommandContext: contextBuilder(capture),
      resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
      loadGuidanceState: vi.fn(async () => ({
        packs: PACKS,
        otherProjectSkills: [],
      })),
    });

    await run(command);

    const writerRoot = await mkdtemp(join(tmpdir(), 'oat-tools-guidance-'));
    tempDirs.push(writerRoot);
    await upsertAgentsMdSections(writerRoot, [
      { key: 'tools', body: buildToolPacksSectionBody(PACKS) },
    ]);
    const written = await readFile(join(writerRoot, 'AGENTS.md'), 'utf8');
    expect(capture.info.join('\n')).toBe(written.trimEnd());
    expect(process.exitCode).toBe(0);
  });

  it('emits a stable --json shape', async () => {
    const capture = createLoggerCapture();
    const command = createToolsGuidanceCommand({
      buildCommandContext: contextBuilder(capture),
      resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
      loadGuidanceState: vi.fn(async () => ({
        packs: PACKS,
        otherProjectSkills: [],
      })),
    });

    await run(command, ['--json']);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'ok',
        sectionKey: 'tools',
        target: 'AGENTS.md',
        packs: PACKS,
        otherProjectSkills: [],
        managedBlock: `<!-- OAT tools -->\n${buildToolPacksSectionBody(PACKS)}\n<!-- END OAT tools -->`,
      },
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('renders user-scope packs outside a repository', async () => {
    const capture = createLoggerCapture();
    const loadGuidanceState = vi.fn(async () => ({
      packs: [{ pack: 'core', scope: 'user' } as const],
      otherProjectSkills: [],
    }));
    const command = createToolsGuidanceCommand({
      buildCommandContext: contextBuilder(capture),
      resolveProjectRoot: vi.fn(async () => {
        throw new Error('not a repository');
      }),
      loadGuidanceState,
    });

    await run(command, ['--json']);

    expect(loadGuidanceState).toHaveBeenCalledWith(expect.anything(), null);
    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'ok' });
    expect(process.exitCode).toBe(0);
  });

  it.each([false, true])(
    'says no OAT pack is installed instead of printing a placeholder block in json=%s mode',
    async (json) => {
      const capture = createLoggerCapture();
      const command = createToolsGuidanceCommand({
        buildCommandContext: contextBuilder(capture),
        resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
        loadGuidanceState: vi.fn(async () => ({
          packs: [],
          otherProjectSkills: [],
        })),
      });

      await run(command, json ? ['--json'] : []);

      if (json) {
        expect(capture.jsonPayloads).toEqual([
          {
            status: 'no-packs',
            sectionKey: 'tools',
            target: 'AGENTS.md',
            packs: [],
            otherProjectSkills: [],
            managedBlock: null,
            message: expect.stringContaining('No OAT tool pack is installed'),
          },
        ]);
      } else {
        const output = [...capture.info, ...capture.warn].join('\n');
        expect(output).toContain('No OAT tool pack is installed');
        expect(output).not.toContain('<!-- OAT tools -->');
      }
      expect(process.exitCode).toBe(0);
    },
  );

  it('writes nothing and never reaches the install, upgrade, or AGENTS.md write path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-tools-guidance-repo-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-tools-guidance-home-'));
    tempDirs.push(root, home);
    await writeFile(join(root, 'AGENTS.md'), '# Mine\nno block\n', 'utf8');
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(join(root, '.oat', 'config.json'), '{"version":1}\n');
    const beforeRoot = await snapshotTree(root);
    const beforeHome = await snapshotTree(home);
    const reconcilePacks = vi.fn();
    const upsertAgentsMdSection = vi.fn();
    const installWorkflows = vi.fn();
    const inventoryPack = vi.fn(
      async ({ pack }: { pack: string; projectRoot?: string }) => ({
        pack,
        placement: 'unavailable' as const,
        scopes: [],
        diagnostics: [],
      }),
    );
    const capture = createLoggerCapture();
    const command = createToolsGuidanceCommand({
      buildCommandContext: (globalOptions) => ({
        ...contextBuilder(capture)(globalOptions),
        home,
      }),
      resolveProjectRoot: vi.fn(async () => root),
      loadGuidanceState: (context, projectRoot) =>
        loadRealizedGuidanceState(context, projectRoot, {
          resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
          resolveScopeRoot: vi.fn(() => home),
          inventoryPack: inventoryPack as unknown as NonNullable<
            InitToolsDependencies['inventoryPack']
          >,
          reconcilePacks,
          upsertAgentsMdSection,
          installWorkflows,
        }),
    });

    await run(command, ['--cwd', root]);

    expect(inventoryPack).toHaveBeenCalled();
    expect(reconcilePacks).not.toHaveBeenCalled();
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
    expect(installWorkflows).not.toHaveBeenCalled();
    expect(await snapshotTree(root)).toEqual(beforeRoot);
    expect(await snapshotTree(home)).toEqual(beforeHome);
    // No pack is realized in this fixture, so the read-only path ends in the
    // no-packs note rather than a block.
    expect(capture.warn.join('\n')).toContain('No OAT tool pack is installed');
    expect(process.exitCode).toBe(0);
  });

  it('reports a failure to read pack state as an error without writing', async () => {
    const capture = createLoggerCapture();
    const command = createToolsGuidanceCommand({
      buildCommandContext: contextBuilder(capture),
      resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
      loadGuidanceState: vi.fn(async () => {
        throw new Error('inventory failed');
      }),
    });

    await run(command, ['--json']);

    expect(capture.jsonPayloads).toEqual([
      { status: 'error', message: 'inventory failed' },
    ]);
    expect(process.exitCode).toBe(1);
  });
});
