import {
  lstat,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import {
  DEFAULT_SYNC_CONFIG,
  loadSyncConfig as defaultLoadSyncConfig,
} from '@config/sync-config';
import { dirExists, fileExists } from '@fs/io';
import { computeContentHash } from '@manifest/hash';
import {
  createEmptyManifest,
  loadManifest,
  type Manifest,
  saveManifest,
} from '@manifest/index';
import {
  getConfigAwareAdapters,
  getSyncMappings,
  type ProviderAdapter,
} from '@providers/shared';
import { getAdoptionSources } from '@providers/shared/adapter.utils';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRemoveSkillCommand } from './remove-skill';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-remove-skill-'));
  tempDirs.push(dir);
  return dir;
}

function createAdapter(name: string, providerDir: string): ProviderAdapter {
  return {
    name,
    displayName: name,
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir,
        nativeRead: false,
      },
    ],
    userMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir,
        nativeRead: false,
      },
    ],
    detect: async () => true,
  };
}

function createCursorAdapter(): ProviderAdapter {
  const skillMapping = {
    contentType: 'skill' as const,
    canonicalDir: '.agents/skills',
    providerDir: '.agents/skills',
    nativeRead: true,
    adoptionSourceDirs: ['.cursor/skills'],
  };

  return {
    name: 'cursor',
    displayName: 'cursor',
    defaultStrategy: 'symlink',
    projectMappings: [skillMapping],
    userMappings: [skillMapping],
    detect: async () => true,
  };
}

function createCopilotAdapter(): ProviderAdapter {
  return {
    name: 'copilot',
    displayName: 'GitHub Copilot',
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
        adoptionSourceDirs: ['.github/skills'],
      },
    ],
    userMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.agents/skills',
        nativeRead: true,
        adoptionSourceDirs: ['.copilot/skills'],
      },
    ],
    detect: async () => true,
  };
}

function createHarness(options: {
  projectRoot: string;
  userRoot?: string;
  scope?: Scope;
  adapters?: ProviderAdapter[];
}): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const adapters = options.adapters ?? [
    createAdapter('claude', '.claude/skills'),
    createCursorAdapter(),
  ];

  const command = createRemoveSkillCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? options.scope ?? 'project') as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: options.projectRoot,
      home: options.userRoot ?? options.projectRoot,
      interactive: false,
      logger: capture.logger,
    }),
    resolveScopeRoot: async (scope) =>
      scope === 'project'
        ? options.projectRoot
        : (options.userRoot ?? options.projectRoot),
    loadManifest,
    saveManifest,
    loadSyncConfig: async (configPath) =>
      defaultLoadSyncConfig(configPath, DEFAULT_SYNC_CONFIG),
    getAdapters: () => adapters,
    getConfigAwareAdapters,
    getSyncMappings,
    getAdoptionSources,
    pathExists: async (path) =>
      (await fileExists(path)) || (await dirExists(path)),
    removeDirectory: async (path) => {
      await rm(path, { recursive: true, force: true });
    },
  });

  return { capture, command };
}

async function runRemoveSkillCommand(
  command: Command,
  globalArgs: string[],
  commandArgs: string[],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const remove = new Command('remove');
  remove.addCommand(command);
  program.addCommand(remove);

  await program.parseAsync([...globalArgs, 'remove', 'skill', ...commandArgs], {
    from: 'user',
  });
}

function withSkillEntry(
  manifest: Manifest,
  skillName: string,
  provider: string,
  providerPath: string,
  contentHash = 'hash',
): Manifest {
  return {
    ...manifest,
    entries: [
      ...manifest.entries,
      {
        canonicalPath: `.agents/skills/${skillName}`,
        providerPath,
        provider,
        contentType: 'skill',
        strategy: 'copy',
        contentHash,
        isFile: false,
        lastSynced: new Date().toISOString(),
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

function withCollectionSkillEntry(
  manifest: Manifest,
  skillName: string,
): Manifest {
  manifest.collections.push({
    id: 'claude-skills',
    provider: 'claude',
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir: '.claude/skills',
    linkTarget: '.agents/skills',
    ownership: 'adopted-exact',
    lastVerified: '2026-02-13T00:00:00.000Z',
  });
  (manifest.entries as unknown[]).push({
    canonicalPath: `.agents/skills/${skillName}`,
    providerPath: `.claude/skills/${skillName}`,
    provider: 'claude',
    contentType: 'skill',
    strategy: 'collection',
    collectionId: 'claude-skills',
    contentHash: null,
    isFile: false,
    lastSynced: '2026-02-13T00:00:00.000Z',
  });
  return manifest;
}

describe('createRemoveSkillCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('shows a dry-run plan with managed and unmanaged provider views', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.claude', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.cursor', 'skills', skillName), {
      recursive: true,
    });

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await saveManifest(
      manifestPath,
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'claude',
        `.claude/skills/${skillName}`,
      ),
    );

    const { command, capture } = createHarness({ projectRoot: root });
    await runRemoveSkillCommand(
      command,
      ['--scope', 'project'],
      [skillName, '--dry-run'],
    );

    await expect(
      dirExists(join(root, '.agents', 'skills', skillName)),
    ).resolves.toBe(true);
    await expect(
      dirExists(join(root, '.claude', 'skills', skillName)),
    ).resolves.toBe(true);

    expect(capture.info.join('\n')).toContain('[dry-run][project] remove');
    expect(capture.info.join('\n')).toContain(
      'claude: .claude/skills/oat-demo',
    );
    expect(capture.warn.join('\n')).toContain(
      'cursor: .cursor/skills/oat-demo',
    );
    expect(process.exitCode).toBe(0);
  });

  it('applies removal for canonical + managed provider views and updates manifest', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.claude', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.cursor', 'skills', skillName), {
      recursive: true,
    });

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await saveManifest(
      manifestPath,
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'claude',
        `.claude/skills/${skillName}`,
      ),
    );

    const { command } = createHarness({ projectRoot: root });
    await runRemoveSkillCommand(command, ['--scope', 'project'], [skillName]);

    await expect(
      dirExists(join(root, '.agents', 'skills', skillName)),
    ).resolves.toBe(false);
    await expect(
      dirExists(join(root, '.claude', 'skills', skillName)),
    ).resolves.toBe(false);
    await expect(
      dirExists(join(root, '.cursor', 'skills', skillName)),
    ).resolves.toBe(true);

    const manifest = await loadManifest(manifestPath);
    expect(
      manifest.entries.find(
        (entry) =>
          entry.canonicalPath === `.agents/skills/${skillName}` &&
          entry.provider === 'claude',
      ),
    ).toBeUndefined();
    expect(process.exitCode).toBe(0);
  });

  it('removes collection inheritance without mutating beneath the alias', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'skills', skillName, 'SKILL.md'),
      '# demo\n',
      'utf8',
    );
    await mkdir(join(root, '.agents', 'skills', 'other'), { recursive: true });
    await mkdir(join(root, '.claude'), { recursive: true });
    await symlink(
      join('..', '.agents', 'skills'),
      join(root, '.claude', 'skills'),
      'dir',
    );
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await saveManifest(
      manifestPath,
      withCollectionSkillEntry(createEmptyManifest(), skillName) as never,
    );

    const { command } = createHarness({ projectRoot: root });
    await runRemoveSkillCommand(command, ['--scope', 'project'], [skillName]);

    expect(
      (await lstat(join(root, '.claude', 'skills'))).isSymbolicLink(),
    ).toBe(true);
    await expect(
      dirExists(join(root, '.agents', 'skills', 'other')),
    ).resolves.toBe(true);
    const updated = await loadManifest(manifestPath);
    expect(updated.collections).toHaveLength(1);
    expect(updated.entries).toEqual([]);
  });

  it('preserves unmanaged Copilot-local skill content during canonical removal', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.claude', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.github', 'skills', skillName), {
      recursive: true,
    });

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await saveManifest(
      manifestPath,
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'claude',
        `.claude/skills/${skillName}`,
      ),
    );

    const { command, capture } = createHarness({
      projectRoot: root,
      adapters: [
        createAdapter('claude', '.claude/skills'),
        createCopilotAdapter(),
      ],
    });
    await runRemoveSkillCommand(command, ['--scope', 'project'], [skillName]);

    await expect(
      dirExists(join(root, '.agents', 'skills', skillName)),
    ).resolves.toBe(false);
    await expect(
      dirExists(join(root, '.claude', 'skills', skillName)),
    ).resolves.toBe(false);
    await expect(
      dirExists(join(root, '.github', 'skills', skillName)),
    ).resolves.toBe(true);
    expect(capture.warn.join('\n')).toContain(
      'copilot: .github/skills/oat-demo',
    );
    expect(process.exitCode).toBe(0);
  });

  it('removes a manifest-owned legacy Copilot view during canonical removal', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.github', 'skills', skillName), {
      recursive: true,
    });
    await writeFile(
      join(root, '.github', 'skills', skillName, 'SKILL.md'),
      '# Legacy managed copy\n',
      'utf8',
    );
    const legacyPath = join(root, '.github', 'skills', skillName);

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await saveManifest(
      manifestPath,
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'copilot',
        `.github/skills/${skillName}`,
        await computeContentHash(legacyPath, false),
      ),
    );

    const { command, capture } = createHarness({
      projectRoot: root,
      adapters: [createCopilotAdapter()],
    });
    await runRemoveSkillCommand(command, ['--scope', 'project'], [skillName]);

    await expect(
      dirExists(join(root, '.agents', 'skills', skillName)),
    ).resolves.toBe(false);
    await expect(
      dirExists(join(root, '.github', 'skills', skillName)),
    ).resolves.toBe(false);
    expect((await loadManifest(manifestPath)).entries).toHaveLength(0);
    expect(capture.warn.join('\n')).not.toContain('unmanaged provider views');
    expect(process.exitCode).toBe(0);
  });

  it('preserves a replaced legacy Copilot view while detaching manifest ownership', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.github', 'skills', skillName), {
      recursive: true,
    });
    await writeFile(
      join(root, '.github', 'skills', skillName, 'SKILL.md'),
      '# User replacement\n',
      'utf8',
    );

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await saveManifest(
      manifestPath,
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'copilot',
        `.github/skills/${skillName}`,
        'stale-managed-hash',
      ),
    );

    const { command, capture } = createHarness({
      projectRoot: root,
      adapters: [createCopilotAdapter()],
    });
    await runRemoveSkillCommand(command, ['--scope', 'project'], [skillName]);

    await expect(
      dirExists(join(root, '.github', 'skills', skillName)),
    ).resolves.toBe(true);
    expect((await loadManifest(manifestPath)).entries).toHaveLength(0);
    expect(capture.warn.join('\n')).toContain(
      'copilot: .github/skills/oat-demo',
    );
    expect(process.exitCode).toBe(0);
  });

  it('detaches a missing legacy Copilot view without reporting a deletion', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await saveManifest(
      manifestPath,
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'copilot',
        `.github/skills/${skillName}`,
      ),
    );

    const { command, capture } = createHarness({
      projectRoot: root,
      adapters: [createCopilotAdapter()],
    });
    await runRemoveSkillCommand(command, ['--scope', 'project'], [skillName]);

    expect((await loadManifest(manifestPath)).entries).toHaveLength(0);
    expect(capture.info.join('\n')).not.toContain('.github/skills/oat-demo');
    expect(capture.warn.join('\n')).not.toContain('.github/skills/oat-demo');
  });

  it('keeps Cursor adoption-source removal behavior unchanged for legacy rows', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.cursor', 'skills', skillName), {
      recursive: true,
    });

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await saveManifest(
      manifestPath,
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'cursor',
        `.cursor/skills/${skillName}`,
      ),
    );

    const { command, capture } = createHarness({
      projectRoot: root,
      adapters: [createCursorAdapter()],
    });
    await runRemoveSkillCommand(command, ['--scope', 'project'], [skillName]);

    await expect(
      dirExists(join(root, '.cursor', 'skills', skillName)),
    ).resolves.toBe(true);
    expect((await loadManifest(manifestPath)).entries).toHaveLength(1);
    expect(capture.warn.join('\n')).toContain(
      'cursor: .cursor/skills/oat-demo',
    );
  });

  it('returns exit code 1 when skill is not found in selected scopes', async () => {
    const root = await makeTempDir();
    const { command, capture } = createHarness({ projectRoot: root });

    await runRemoveSkillCommand(
      command,
      ['--scope', 'project'],
      ['oat-missing'],
    );

    expect(capture.warn.join('\n')).toContain(
      'Skill not found in selected scope(s)',
    );
    expect(process.exitCode).toBe(1);
  });

  it('resolves across all scopes and removes where present', async () => {
    const projectRoot = await makeTempDir();
    const userRoot = await makeTempDir();
    const skillName = 'oat-demo';

    await mkdir(join(userRoot, '.agents', 'skills', skillName), {
      recursive: true,
    });

    const { command, capture } = createHarness({
      projectRoot,
      userRoot,
      scope: 'all',
    });

    await runRemoveSkillCommand(
      command,
      ['--scope', 'all'],
      [skillName, '--dry-run'],
    );

    expect(capture.info.join('\n')).toContain('[dry-run][user] remove');
    expect(capture.info.join('\n')).not.toContain('[dry-run][project] remove');
    expect(process.exitCode).toBe(0);
  });

  it('applies removal across project and user scopes when both contain the skill', async () => {
    const projectRoot = await makeTempDir();
    const userRoot = await makeTempDir();
    const skillName = 'oat-demo';

    await mkdir(join(projectRoot, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(projectRoot, '.claude', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(userRoot, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(userRoot, '.claude', 'skills', skillName), {
      recursive: true,
    });

    await saveManifest(
      join(projectRoot, '.oat', 'sync', 'manifest.json'),
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'claude',
        `.claude/skills/${skillName}`,
      ),
    );
    await saveManifest(
      join(userRoot, '.oat', 'sync', 'manifest.json'),
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'claude',
        `.claude/skills/${skillName}`,
      ),
    );

    const { command } = createHarness({ projectRoot, userRoot, scope: 'all' });
    await runRemoveSkillCommand(command, ['--scope', 'all'], [skillName]);

    await expect(
      dirExists(join(projectRoot, '.agents', 'skills', skillName)),
    ).resolves.toBe(false);
    await expect(
      dirExists(join(userRoot, '.agents', 'skills', skillName)),
    ).resolves.toBe(false);

    const projectManifest = await loadManifest(
      join(projectRoot, '.oat', 'sync', 'manifest.json'),
    );
    const userManifest = await loadManifest(
      join(userRoot, '.oat', 'sync', 'manifest.json'),
    );
    expect(projectManifest.entries).toEqual([]);
    expect(userManifest.entries).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it('emits not_found JSON payload in json mode', async () => {
    const root = await makeTempDir();
    const { command, capture } = createHarness({ projectRoot: root });

    await runRemoveSkillCommand(
      command,
      ['--json', '--scope', 'project'],
      ['oat-missing'],
    );

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'not_found',
      skill: 'oat-missing',
    });
    expect(process.exitCode).toBe(1);
  });

  it('emits dry_run JSON payload when skill is found in json mode', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.claude', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.cursor', 'skills', skillName), {
      recursive: true,
    });

    await saveManifest(
      join(root, '.oat', 'sync', 'manifest.json'),
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'claude',
        `.claude/skills/${skillName}`,
      ),
    );

    const { command, capture } = createHarness({ projectRoot: root });
    await runRemoveSkillCommand(
      command,
      ['--json', '--scope', 'project'],
      [skillName, '--dry-run'],
    );

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'dry_run',
      skill: skillName,
      scopes: [
        {
          scope: 'project',
          canonicalPath: `.agents/skills/${skillName}`,
          managedProviderViews: [`.claude/skills/${skillName}`],
          unmanagedProviderViews: [`.cursor/skills/${skillName}`],
        },
      ],
    });
    expect(process.exitCode).toBe(0);
  });

  it('emits removed JSON payload when apply succeeds in json mode', async () => {
    const root = await makeTempDir();
    const skillName = 'oat-demo';
    await mkdir(join(root, '.agents', 'skills', skillName), {
      recursive: true,
    });
    await mkdir(join(root, '.claude', 'skills', skillName), {
      recursive: true,
    });

    await saveManifest(
      join(root, '.oat', 'sync', 'manifest.json'),
      withSkillEntry(
        createEmptyManifest(),
        skillName,
        'claude',
        `.claude/skills/${skillName}`,
      ),
    );

    const { command, capture } = createHarness({ projectRoot: root });
    await runRemoveSkillCommand(
      command,
      ['--json', '--scope', 'project'],
      [skillName],
    );

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'removed',
      skill: skillName,
      scopes: [
        {
          scope: 'project',
          canonicalPath: `.agents/skills/${skillName}`,
          managedProviderViews: [`.claude/skills/${skillName}`],
          unmanagedProviderViews: [],
        },
      ],
    });
    expect(process.exitCode).toBe(0);
  });
});
