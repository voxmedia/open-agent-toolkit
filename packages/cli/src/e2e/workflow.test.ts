import { execFileSync } from 'node:child_process';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import type { SyncConfig } from '@config/index';
import { checkbox, confirm } from '@inquirer/prompts';
import type { Manifest } from '@manifest/index';
import { createSyncedFixture } from '@test-support/synced-fixture';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(async () => []),
  confirm: vi.fn(async () => false),
}));

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const mockedConfirm = vi.mocked(confirm);
const mockedCheckbox = vi.mocked(checkbox);

// Commands that accept --scope as a local option. Only these get the
// auto-injected `--scope project` in the e2e helper so that non-consumer
// commands (e.g. `config set`, `instructions sync`) are not accidentally
// passed a flag they do not recognise.
const SCOPE_CONSUMER_COMMANDS = new Set([
  'init',
  'sync',
  'status',
  'doctor',
  'providers',
  'tools',
  'remove',
]);

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cli-e2e-'));
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.cursor'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  return root;
}

async function runCli(
  root: string,
  args: string[],
  globalArgs: string[] = [],
  interactive = false,
): Promise<CliResult> {
  const program = createProgram();
  registerCommands(program);

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const stdinIsTTYDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    'isTTY',
  );
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  process.stdout.write = createWriteCapture(stdoutChunks);
  process.stderr.write = createWriteCapture(stderrChunks);
  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: interactive,
  });

  try {
    // --scope is a per-command option on scope-consumer commands. Only inject
    // it when the top-level command is a scope consumer so that non-consumer
    // commands do not receive an unrecognised flag. Insert after the subcommand
    // tokens (all tokens before the first flag) so it is parsed on the right
    // command. An explicit caller-supplied scope in either supported syntax
    // always wins.
    const topLevelCommand = args[0];
    const isConsumer =
      topLevelCommand !== undefined &&
      SCOPE_CONSUMER_COMMANDS.has(topLevelCommand) &&
      !args.some((arg) => arg === '--scope' || arg.startsWith('--scope='));

    let finalArgs: string[];
    if (isConsumer) {
      let insertAt = args.length;
      for (let i = 0; i < args.length; i++) {
        if (args[i]!.startsWith('-')) {
          insertAt = i;
          break;
        }
      }
      finalArgs = [
        ...args.slice(0, insertAt),
        '--scope',
        'project',
        ...args.slice(insertAt),
      ];
    } else {
      finalArgs = args;
    }

    await program.parseAsync(['--cwd', root, ...globalArgs, ...finalArgs], {
      from: 'user',
    });
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    if (stdinIsTTYDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinIsTTYDescriptor);
    }
  }

  const exitCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode;

  return {
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    exitCode,
  };
}

function createWriteCapture(chunks: string[]): typeof process.stdout.write {
  return (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void,
  ): boolean => {
    const text =
      typeof chunk === 'string'
        ? chunk
        : Buffer.from(chunk).toString(
            typeof encoding === 'string' ? encoding : 'utf8',
          );
    chunks.push(text);

    if (typeof encoding === 'function') {
      encoding();
      return true;
    }

    callback?.();
    return true;
  };
}

async function seedCanonical(root: string): Promise<void> {
  await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
    'skill one',
    'utf8',
  );

  await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.agents', 'agents', 'agent-one', 'AGENT.md'),
    'agent one',
    'utf8',
  );
}

async function readManifest(root: string): Promise<Manifest> {
  const manifestRaw = await readFile(
    join(root, '.oat', 'sync', 'manifest.json'),
    'utf8',
  );
  return JSON.parse(manifestRaw) as Manifest;
}

async function writeSyncConfig(
  root: string,
  config: SyncConfig,
): Promise<void> {
  await mkdir(join(root, '.oat', 'sync'), { recursive: true });
  await writeFile(
    join(root, '.oat', 'sync', 'config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf8',
  );
}

describe('e2e workflow', () => {
  const tempDirs: string[] = [];
  const stdinDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    'isTTY',
  );

  beforeEach(() => {
    mockedConfirm.mockResolvedValue(false);
    mockedCheckbox.mockResolvedValue([]);
  });

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;

    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    }
  });

  it.each([
    ['separate', ['--scope', 'user']],
    ['joined', ['--scope=user']],
  ])('respects an explicit %s user scope', async (_syntax, scopeArgs) => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(join(tmpdir(), 'oat-cli-e2e-user-scope-'));
    tempDirs.push(root, userRoot);
    await mkdir(join(userRoot, '.claude'), { recursive: true });
    await seedCanonical(userRoot);

    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      const result = await runCli(root, ['sync', ...scopeArgs]);

      expect(result.exitCode).toBe(0);
      const preview = await runCli(
        root,
        [
          'tools',
          'remove',
          '--pack',
          'core',
          '--dry-run',
          '--no-sync',
          '--json',
          ...scopeArgs,
        ],
        ['--json'],
      );
      expect(preview.exitCode).toBe(0);
      expect(JSON.parse(preview.stdout).lifecycle[0].selection).toMatchObject({
        pack: 'core',
        targetScopes: ['user'],
      });
      await expect(
        lstat(join(userRoot, '.claude', 'skills', 'skill-one')),
      ).resolves.toBeDefined();
      await expect(
        lstat(join(root, '.claude', 'skills', 'skill-one')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('reports existing aggregate guidance recovery explicitly and reruns idempotently', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(
      join(tmpdir(), 'oat-cli-e2e-guidance-home-'),
    );
    tempDirs.push(root, userRoot);
    const existingGuidance = [
      '# User guidance',
      '',
      '<!-- OAT project-management -->',
      'Existing PJM guidance',
      '<!-- END OAT project-management -->',
      '',
    ].join('\n');
    await writeFile(join(root, 'AGENTS.md'), existingGuidance, 'utf8');

    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      const declined = await runCli(root, [
        'tools',
        'install',
        '--scope',
        'project',
        '--no-project-guidance',
        '--no-sync',
      ]);
      expect(declined.exitCode).toBe(0);
      await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).resolves.toBe(
        existingGuidance,
      );

      const first = await runCli(root, [
        'tools',
        'install',
        '--scope',
        'project',
        '--project-guidance',
        '--no-sync',
      ]);
      const second = await runCli(root, [
        'tools',
        'install',
        '--scope',
        'project',
        '--project-guidance',
        '--no-sync',
      ]);

      expect(first.exitCode).toBe(1);
      expect(`${first.stdout}\n${first.stderr}`).toMatch(/requires recovery/i);
      expect(`${first.stdout}\n${first.stderr}`).not.toContain(root);
      expect(second.exitCode).toBe(1);
      expect(`${second.stdout}\n${second.stderr}`).toMatch(
        /requires recovery/i,
      );
      const guidance = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect(guidance).toContain('# User guidance');
      expect(guidance).toContain('Existing PJM guidance');
      expect(guidance.match(/<!-- OAT tools -->/g)).toHaveLength(1);
      expect(guidance).toContain('### Installed Packs');
      expect(guidance).not.toContain('<!-- OAT decisions -->');
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('reports existing registered-workflows guidance as a redacted partial recovery', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(
      join(tmpdir(), 'oat-cli-e2e-guidance-home-'),
    );
    tempDirs.push(root, userRoot);
    await writeFile(join(root, 'AGENTS.md'), '# Existing guidance\n', 'utf8');

    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      const result = await runCli(
        root,
        [
          'tools',
          'install',
          '--scope',
          'project',
          '--no-sync',
          '--project-guidance',
          'workflows',
        ],
        ['--json'],
      );

      expect(result.exitCode).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload).toMatchObject({
        status: 'partial',
        projectGuidance: {
          action: 'blocked',
          reason: expect.stringMatching(/requires recovery/i),
        },
      });
      expect(payload.projectGuidance.reason).not.toContain(root);
      await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).resolves.toMatch(
        /# Existing guidance[\s\S]*<!-- OAT tools -->/,
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('creates missing guidance and updates it through a contained symlink', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(
      join(tmpdir(), 'oat-cli-e2e-guidance-home-'),
    );
    tempDirs.push(root, userRoot);
    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      const first = await runCli(root, [
        'tools',
        'install',
        '--scope',
        'project',
        '--project-guidance',
        '--no-sync',
      ]);
      expect(first.exitCode).toBe(0);
      await expect(
        readFile(join(root, 'AGENTS.md'), 'utf8'),
      ).resolves.toContain('<!-- OAT tools -->');

      await mkdir(join(root, 'guidance'));
      const target = join(root, 'guidance', 'shared-agents.md');
      await rename(join(root, 'AGENTS.md'), target);
      await symlink('guidance/shared-agents.md', join(root, 'AGENTS.md'));

      const second = await runCli(root, [
        'tools',
        'install',
        '--scope',
        'project',
        '--project-guidance',
        '--no-sync',
      ]);
      expect(second.exitCode).toBe(0);
      expect((await lstat(join(root, 'AGENTS.md'))).isSymbolicLink()).toBe(
        true,
      );
      const guidance = await readFile(target, 'utf8');
      expect(guidance.match(/<!-- OAT tools -->/g)).toHaveLength(1);
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it.each(
    (['docs', 'pjm', 'decision'] as const).flatMap((consumer) =>
      (['direct', 'symlink'] as const).flatMap((targetKind) =>
        [false, true].map((json) => ({ consumer, targetKind, json })),
      ),
    ),
  )(
    'reports $consumer recovery truthfully for a $targetKind target in json=$json mode',
    async ({ consumer, targetKind, json }) => {
      const root = await createWorkspace();
      const userRoot = await mkdtemp(
        join(tmpdir(), 'oat-cli-e2e-consumer-home-'),
      );
      tempDirs.push(root, userRoot);
      const target =
        targetKind === 'direct'
          ? join(root, 'AGENTS.md')
          : join(root, 'guidance', 'shared.md');
      await mkdir(join(root, 'guidance'), { recursive: true });
      await writeFile(target, '# Existing guidance\n', 'utf8');
      if (targetKind === 'symlink') {
        await symlink('guidance/shared.md', join(root, 'AGENTS.md'));
      }
      if (consumer === 'decision') {
        await mkdir(join(root, '.oat', 'repo'), { recursive: true });
        await writeFile(
          join(root, '.oat', 'config.json'),
          JSON.stringify({
            version: 1,
            pjm: { initialized: true, schemaVersion: 1 },
          }),
          'utf8',
        );
      }

      const previousHome = process.env.HOME;
      process.env.HOME = userRoot;
      try {
        const args =
          consumer === 'docs'
            ? [
                'docs',
                'init',
                '--framework',
                'mkdocs',
                '--app-name',
                'docs',
                '--target-dir',
                'docs-app',
                '--description',
                'Test docs',
                '--format',
                'none',
                '--no-root-patch',
                '--yes',
              ]
            : consumer === 'pjm'
              ? ['pjm', 'init']
              : ['decision', 'init'];
        const result = await runCli(root, args, json ? ['--json'] : []);

        expect(result.exitCode).toBe(1);
        if (json) {
          const payload = JSON.parse(result.stdout);
          expect(payload.status).toBe('partial');
          expect(result.stdout).not.toContain('"status": "ok"');
        } else {
          expect(`${result.stdout}\n${result.stderr}`).toMatch(
            /requires recovery/i,
          );
        }
        expect(`${result.stdout}\n${result.stderr}`).not.toContain(root);
        const recoveryNames = (await readdir(join(target, '..'))).filter(
          (name) => name.includes('oat-recovery-'),
        );
        expect(recoveryNames.length).toBeGreaterThan(0);

        const config = JSON.parse(
          await readFile(join(root, '.oat', 'config.json'), 'utf8'),
        );
        if (consumer === 'docs') expect(config.pjm).toBeUndefined();
        else expect(config.pjm.initialized).toBe(true);
      } finally {
        if (previousHome === undefined) delete process.env.HOME;
        else process.env.HOME = previousHome;
      }
    },
  );

  it.each([
    {
      position: 'before',
      scope: 'project' as const,
      json: false,
    },
    { position: 'after', scope: 'project' as const, json: true },
    { position: 'before', scope: 'user' as const, json: true },
    { position: 'after', scope: 'user' as const, json: false },
  ])(
    'applies registered workflows guidance with the option $position the subcommand at $scope scope',
    async ({ position, scope, json }) => {
      const root = await createWorkspace();
      const userRoot = await mkdtemp(
        join(tmpdir(), 'oat-cli-e2e-workflows-home-'),
      );
      tempDirs.push(root, userRoot);
      const previousHome = process.env.HOME;
      process.env.HOME = userRoot;
      try {
        const prefix = ['tools', 'install', '--scope', scope, '--no-sync'];
        const args =
          position === 'before'
            ? [...prefix, '--project-guidance', 'workflows']
            : [...prefix, 'workflows', '--project-guidance'];
        const result = await runCli(root, args, json ? ['--json'] : []);

        expect(result.exitCode).toBe(0);
        await expect(
          readFile(join(root, 'AGENTS.md'), 'utf8'),
        ).resolves.toContain('<!-- OAT tools -->');
        const capabilityRoot = scope === 'project' ? root : userRoot;
        await expect(
          lstat(
            join(capabilityRoot, '.agents', 'skills', 'oat-project-implement'),
          ),
        ).resolves.toBeDefined();
        if (json) {
          expect(JSON.parse(result.stdout)).toMatchObject({
            status: 'ok',
            pack: 'workflows',
            scopes: [scope],
            projectGuidance: { action: expect.stringMatching(/create|update/) },
          });
        } else {
          expect(result.stdout).toContain('Installed workflows tool pack');
          expect(result.stdout).toContain('Project guidance:');
        }
      } finally {
        if (previousHome === undefined) delete process.env.HOME;
        else process.env.HOME = previousHome;
      }
    },
  );

  it('keeps registered workflows decline write-free in human output', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(
      join(tmpdir(), 'oat-cli-e2e-workflows-home-'),
    );
    tempDirs.push(root, userRoot);
    const original = '# User guidance\n';
    await writeFile(join(root, 'AGENTS.md'), original, 'utf8');
    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      const result = await runCli(root, [
        'tools',
        'install',
        '--scope',
        'project',
        '--no-sync',
        'workflows',
        '--no-project-guidance',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project guidance: declined');
      await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).resolves.toBe(
        original,
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('keeps registered workflows non-interactive default write-free in JSON', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(
      join(tmpdir(), 'oat-cli-e2e-workflows-home-'),
    );
    tempDirs.push(root, userRoot);
    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      const result = await runCli(
        root,
        ['tools', 'install', '--scope', 'project', '--no-sync', 'workflows'],
        ['--json'],
      );

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: 'ok',
        projectGuidance: { action: 'not-requested' },
      });
      await expect(lstat(join(root, 'AGENTS.md'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it.each([
    {
      path: 'aggregate',
      args: [] as string[],
      legacy:
        '# User guidance\n\n<!-- OAT workflows -->\nunterminated legacy\n',
    },
    {
      path: 'registered workflows',
      args: ['workflows'],
      legacy:
        '# User guidance\n\n<!-- OAT workflows -->\none\n<!-- END OAT workflows -->\n\n<!-- OAT workflows -->\ntwo\n<!-- END OAT workflows -->\n',
    },
  ])(
    'leaves malformed legacy guidance byte-for-byte unchanged for the $path path',
    async ({ args, legacy }) => {
      const root = await createWorkspace();
      const userRoot = await mkdtemp(
        join(tmpdir(), 'oat-cli-e2e-workflows-home-'),
      );
      tempDirs.push(root, userRoot);
      await writeFile(join(root, 'AGENTS.md'), legacy, 'utf8');
      const previousHome = process.env.HOME;
      process.env.HOME = userRoot;
      try {
        const result = await runCli(
          root,
          [
            'tools',
            'install',
            '--scope',
            'project',
            '--no-sync',
            '--project-guidance',
            ...args,
          ],
          ['--json'],
        );

        expect(result.exitCode).toBe(1);
        expect(JSON.parse(result.stdout)).toMatchObject({
          status: 'partial',
          projectGuidance: { action: 'blocked' },
        });
        await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).resolves.toBe(
          legacy,
        );
      } finally {
        if (previousHome === undefined) delete process.env.HOME;
        else process.env.HOME = previousHome;
      }
    },
  );

  it.each(
    (['aggregate', 'registered workflows'] as const).flatMap((path) =>
      [
        {
          shape: 'tools containing workflows',
          content: [
            '# Prefix user text',
            '<!-- OAT tools -->',
            'old tools',
            '<!-- OAT workflows -->',
            'legacy',
            '<!-- END OAT workflows -->',
            'interstitial user text',
            '<!-- END OAT tools -->',
            '# Suffix user text',
            '',
          ].join('\n'),
        },
        {
          shape: 'workflows containing tools',
          content: [
            '# Prefix user text',
            '<!-- OAT workflows -->',
            'legacy',
            '<!-- OAT tools -->',
            'old tools',
            '<!-- END OAT tools -->',
            'interstitial user text',
            '<!-- END OAT workflows -->',
            '# Suffix user text',
            '',
          ].join('\n'),
        },
        {
          shape: 'crossed tools and workflows',
          content: [
            '# Prefix user text',
            '<!-- OAT tools -->',
            'old tools',
            '<!-- OAT workflows -->',
            'interstitial user text',
            '<!-- END OAT tools -->',
            '# Suffix user text',
            '<!-- END OAT workflows -->',
            '',
          ].join('\n'),
        },
      ].map((fixture) => ({ path, ...fixture })),
    ),
  )(
    'blocks $shape markers byte-for-byte on the $path path',
    async ({ path, content }) => {
      const root = await createWorkspace();
      const userRoot = await mkdtemp(
        join(tmpdir(), 'oat-cli-e2e-workflows-home-'),
      );
      tempDirs.push(root, userRoot);
      await writeFile(join(root, 'AGENTS.md'), content, 'utf8');
      const previousHome = process.env.HOME;
      process.env.HOME = userRoot;
      try {
        const result = await runCli(
          root,
          [
            'tools',
            'install',
            '--scope',
            'project',
            '--no-sync',
            '--project-guidance',
            ...(path === 'registered workflows' ? ['workflows'] : []),
          ],
          ['--json'],
        );

        expect(result.exitCode).toBe(1);
        expect(JSON.parse(result.stdout)).toMatchObject({
          status: 'partial',
          projectGuidance: {
            action: 'blocked',
            reason: expect.stringMatching(/overlap|cross|disjoint/i),
          },
        });
        await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).resolves.toBe(
          content,
        );
      } finally {
        if (previousHome === undefined) delete process.env.HOME;
        else process.env.HOME = previousHome;
      }
    },
  );

  it('fresh repo: init → sync → providers list → status (all in sync)', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    const providers = await runCli(
      root,
      ['providers', 'list', '--json'],
      ['--json'],
    );
    expect(providers.exitCode).toBe(0);
    const providerPayload = JSON.parse(providers.stdout);
    expect(providerPayload.map((item: { name: string }) => item.name)).toEqual(
      expect.arrayContaining(['claude', 'cursor', 'codex']),
    );

    const status = await runCli(root, ['status', '--json'], ['--json']);
    expect(status.exitCode).toBe(0);
    const payload = JSON.parse(status.stdout);
    expect(payload.summary.drifted).toBe(0);
    expect(payload.summary.missing).toBe(0);
    expect(payload.summary.stray).toBe(0);
    expect(payload.summary.inSync).toBeGreaterThan(0);
  });

  it('drift scenario: sync → modify provider file → status reports drift → sync fixes it', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    await writeSyncConfig(root, {
      version: 1,
      defaultStrategy: 'symlink',
      providers: {},
    });
    await runCli(root, ['sync']);

    const driftPath = join(root, '.claude', 'skills', 'skill-one');
    await rm(driftPath, { recursive: true, force: true });
    await mkdir(driftPath, { recursive: true });
    await writeFile(join(driftPath, 'SKILL.md'), 'drifted content', 'utf8');

    const before = await runCli(root, ['status', '--json'], ['--json']);
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.drifted).toBeGreaterThan(0);

    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    const after = await runCli(root, ['status', '--json'], ['--json']);
    expect(after.exitCode).toBe(0);
    const afterPayload = JSON.parse(after.stdout);
    expect(afterPayload.summary.drifted).toBe(0);
  });

  it('adoption: create provider-local skill → init detects and adopts', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, '.claude', 'skills', 'adopt-me'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.claude', 'skills', 'adopt-me', 'SKILL.md'),
      'adopt me',
      'utf8',
    );

    mockedConfirm.mockResolvedValue(false);
    mockedCheckbox
      .mockResolvedValueOnce(['claude', 'cursor', 'codex'])
      .mockResolvedValueOnce(['0']);

    const init = await runCli(root, ['init'], [], true);
    expect(init.exitCode).toBe(0);

    const canonicalPath = join(root, '.agents', 'skills', 'adopt-me');
    const providerPath = join(root, '.claude', 'skills', 'adopt-me');
    const canonicalStat = await lstat(canonicalPath);
    const providerStat = await lstat(providerPath);

    expect(canonicalStat.isDirectory()).toBe(true);
    expect(providerStat.isSymbolicLink()).toBe(true);
  });

  it('copy fallback: force copy strategy → sync creates copies with hashes', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    await writeSyncConfig(root, {
      version: 1,
      defaultStrategy: 'copy',
      providers: {},
    });

    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    const copiedPath = join(root, '.claude', 'skills', 'skill-one');
    const copiedStat = await lstat(copiedPath);
    expect(copiedStat.isSymbolicLink()).toBe(false);

    const manifest = await readManifest(root);
    const entry = manifest.entries.find(
      (candidate) =>
        candidate.provider === 'claude' &&
        candidate.canonicalPath === '.agents/skills/skill-one',
    );
    expect(entry).toBeDefined();
    expect(entry?.strategy).toBe('copy');
    expect(entry?.contentHash).toBeTruthy();
  });

  it('Cursor native-read upgrade retires legacy views once without recreating them', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    await mkdir(join(root, '.cursor', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'skill-one'),
      join(root, '.cursor', 'skills', 'skill-one'),
      'dir',
    );
    await mkdir(join(root, '.cursor', 'skills', 'cursor-only'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.cursor', 'skills', 'cursor-only', 'SKILL.md'),
      'cursor only',
      'utf8',
    );

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const legacyManifest = await readManifest(root);
    legacyManifest.entries.push({
      canonicalPath: '.agents/skills/skill-one',
      providerPath: '.cursor/skills/skill-one',
      provider: 'cursor',
      contentType: 'skill',
      strategy: 'symlink',
      contentHash: null,
      isFile: false,
      lastSynced: new Date().toISOString(),
    });
    await writeFile(
      manifestPath,
      `${JSON.stringify(legacyManifest, null, 2)}\n`,
      'utf8',
    );

    const firstSync = await runCli(root, ['sync']);
    expect(firstSync.exitCode).toBe(0);
    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      readFile(
        join(root, '.cursor', 'skills', 'cursor-only', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('cursor only');

    const firstManifest = await readManifest(root);
    expect(
      firstManifest.entries.some(
        (entry) => entry.provider === 'cursor' && entry.contentType === 'skill',
      ),
    ).toBe(false);

    const secondSync = await runCli(root, ['sync']);
    expect(secondSync.exitCode).toBe(0);
    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    const secondManifest = await readManifest(root);
    expect(
      secondManifest.entries.some(
        (entry) => entry.provider === 'cursor' && entry.contentType === 'skill',
      ),
    ).toBe(false);
  });

  it('rule status: sync → frontmatter edit → status still in sync', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'test-rule.md'),
      '---\ndescription: original\nactivation: always\n---\n\n# Rule Body\n',
      'utf8',
    );

    // First sync creates the copies
    const firstSync = await runCli(root, ['sync']);
    expect(firstSync.exitCode).toBe(0);

    // Status should be clean
    const beforeEdit = await runCli(root, ['status', '--json'], ['--json']);
    expect(beforeEdit.exitCode).toBe(0);
    const beforePayload = JSON.parse(beforeEdit.stdout);
    expect(beforePayload.summary.drifted).toBe(0);

    // Edit only frontmatter (body stays the same)
    await writeFile(
      join(root, '.agents', 'rules', 'test-rule.md'),
      '---\ndescription: updated description\nactivation: always\n---\n\n# Rule Body\n',
      'utf8',
    );

    // Sync should skip (transformed output unchanged for claude)
    const secondSync = await runCli(root, ['sync']);
    expect(secondSync.exitCode).toBe(0);

    // Status should still report in sync (not false-positive drift)
    const afterEdit = await runCli(root, ['status', '--json'], ['--json']);
    expect(afterEdit.exitCode).toBe(0);
    const afterPayload = JSON.parse(afterEdit.stdout);
    expect(afterPayload.summary.drifted).toBe(0);
  });

  it('removal: delete canonical → sync removes provider view', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    await runCli(root, ['sync']);

    await rm(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
      force: true,
    });

    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });

    const manifest = await readManifest(root);
    expect(
      manifest.entries.some(
        (entry) => entry.canonicalPath === '.agents/skills/skill-one',
      ),
    ).toBe(false);
  });
});

describe('synced project lifecycle', () => {
  it('creates, pushes, and pulls a default synced project while preserving explicit shared scope', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    try {
      const cloneB = fixture.cloneB!;
      const base = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }).trim();
      const awsKeys = Object.keys(process.env).filter((key) =>
        key.startsWith('AWS_'),
      );
      const savedAws = new Map(awsKeys.map((key) => [key, process.env[key]]));
      const savedPath = process.env.PATH;
      const isolatedToolPath = await mkdtemp(join(tmpdir(), 'oat-gh-missing-'));
      for (const key of awsKeys) delete process.env[key];

      try {
        const created = await runCli(
          fixture.cloneA,
          ['project', 'new', 'demo', '--no-dashboard'],
          ['--json'],
        );
        expect(created.exitCode).toBe(0);
        expect(JSON.parse(created.stdout)).toMatchObject({
          status: 'ok',
          scope: 'synced',
          ref: 'refs/oat/projects/demo',
        });
        expect(
          execFileSync('git', ['diff', '--name-only', `${base}..HEAD`], {
            cwd: fixture.cloneA,
            encoding: 'utf8',
          })
            .trim()
            .split('\n'),
        ).toEqual(['.oat/projects/synced/demo.json']);

        await writeFile(
          join(
            fixture.cloneA,
            '.oat',
            'projects',
            'synced',
            'demo',
            'state.md',
          ),
          '---\noat_phase: plan\noat_phase_status: in_progress\noat_workflow_mode: quick\noat_pr_status: open\noat_pr_url: "https://github.com/example/oat-fixture/pull/1"\n---\n\n# Updated remotely\n',
          'utf8',
        );
        await symlink(
          execFileSync('which', ['git'], { encoding: 'utf8' }).trim(),
          join(isolatedToolPath, 'git'),
        );
        process.env.PATH = isolatedToolPath;
        const pushed = await runCli(
          fixture.cloneA,
          ['project', 'push', 'demo'],
          ['--json'],
        );
        expect(pushed.exitCode).toBe(0);
        expect(JSON.parse(pushed.stdout)).toMatchObject({
          status: 'pushed',
          prRefresh: 'skipped',
        });
        expect(pushed.stderr).toBe('');
        const warnedPush = await runCli(fixture.cloneA, [
          'project',
          'push',
          'demo',
        ]);
        expect(warnedPush.exitCode).toBe(0);
        expect(warnedPush.stderr).toContain(
          'Skipping PR link refresh because the GitHub CLI is unavailable.',
        );

        execFileSync('git', ['push', '-q', 'origin', 'main'], {
          cwd: fixture.cloneA,
        });
        execFileSync('git', ['pull', '-q', '--ff-only'], { cwd: cloneB });
        const pulled = await runCli(
          cloneB,
          ['project', 'pull', 'demo'],
          ['--json'],
        );
        expect(pulled.exitCode).toBe(0);
        expect(JSON.parse(pulled.stdout)).toMatchObject({ status: 'created' });
        await expect(
          readFile(
            join(cloneB, '.oat', 'projects', 'synced', 'demo', 'state.md'),
            'utf8',
          ),
        ).resolves.toContain('# Updated remotely');
        process.env.PATH = savedPath;

        const archived = await runCli(
          fixture.cloneA,
          ['project', 'archive', '.oat/projects/synced/demo'],
          ['--json'],
        );
        expect(archived.stderr).toBe('');
        const archivedPayload = JSON.parse(archived.stdout);
        expect(archivedPayload).toMatchObject({
          status: 'ok',
          projectName: 'demo',
          snapshotId: expect.stringMatching(/^\d{8}-demo$/),
          lifecycleCommit: expect.stringMatching(/^[a-f0-9]{40}$/),
        });
        expect(archived.exitCode).toBe(0);
        await expect(
          lstat(join(fixture.cloneA, '.oat/projects/synced/demo')),
        ).rejects.toMatchObject({ code: 'ENOENT' });
        expect(
          execFileSync(
            'git',
            ['ls-remote', 'origin', 'refs/oat/projects/demo'],
            { cwd: fixture.cloneA, encoding: 'utf8' },
          ),
        ).toContain('refs/oat/projects/demo');
        expect(
          JSON.parse(
            await readFile(
              join(fixture.cloneA, '.oat/projects/synced/demo.json'),
              'utf8',
            ),
          ),
        ).toMatchObject({
          status: 'complete',
          archiveSnapshot: expect.stringMatching(/^\d{8}-demo$/),
        });

        const legacy = await runCli(
          fixture.cloneA,
          ['project', 'new', 'legacy', '--scope', 'shared', '--no-dashboard'],
          ['--json'],
        );
        expect(legacy.exitCode).toBe(0);
        expect(JSON.parse(legacy.stdout)).toMatchObject({
          scope: 'shared',
          projectPath: '.oat/projects/shared/legacy',
        });
        expect(
          execFileSync(
            'git',
            [
              'ls-tree',
              '--name-only',
              'HEAD',
              '.oat/projects/shared/legacy/state.md',
            ],
            { cwd: fixture.cloneA, encoding: 'utf8' },
          ).trim(),
        ).toBe('.oat/projects/shared/legacy/state.md');
      } finally {
        process.env.PATH = savedPath;
        await rm(isolatedToolPath, { recursive: true, force: true });
        for (const [key, value] of savedAws) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    } finally {
      await fixture.cleanup();
    }
  });
});
