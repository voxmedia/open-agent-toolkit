import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { executeCommandInvocation } from '@review/command-invocation';
import { afterEach, describe, expect, it } from 'vitest';

import { registerCommands } from './index';

// Commands that accept --scope as a local option. Only these get the
// auto-injected `--scope project` in the integration helper so that
// non-consumer commands (e.g. `cleanup`, `review`) are not accidentally passed
// a flag they do not recognise. Mirrors the set in src/e2e/workflow.test.ts.
const SCOPE_CONSUMER_COMMANDS = new Set([
  'init',
  'sync',
  'status',
  'doctor',
  'providers',
  'tools',
  'remove',
]);

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cli-int-'));
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
): Promise<CliResult> {
  const program = createProgram();
  registerCommands(program);

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  (process.stdout.write as unknown as (chunk: unknown) => boolean) = (
    chunk: unknown,
  ) => {
    stdoutChunks.push(String(chunk));
    return true;
  };
  (process.stderr.write as unknown as (chunk: unknown) => boolean) = (
    chunk: unknown,
  ) => {
    stderrChunks.push(String(chunk));
    return true;
  };

  try {
    // --scope is a per-command option on scope-consumer commands. Inject
    // `--scope project` only when the top-level command is a consumer so that
    // non-consumer commands do not receive an unrecognised flag. Insert after
    // the subcommand tokens (all tokens before the first flag) so it is parsed
    // on the right command. This makes doctor/status/sync tests deterministic
    // in CI where $HOME has no user-scope OAT state.
    //
    // NOTE: the injection targets the `init`/`tools` parent, which is visible
    // to leaf subcommands via getOptionValueSourceWithGlobals. The hardcoded
    // tool-pack leaves reject a conflicting explicit scope, so callers that
    // invoke `init tools core` / `tools install core` (fixed: user) or
    // `init tools project-management` / `tools install project-management`
    // (fixed: project) directly via runCli must pass the matching `--scope`
    // explicitly rather than relying on this `--scope project` auto-injection.
    const topLevelCommand = args[0];
    const isConsumer =
      topLevelCommand !== undefined &&
      SCOPE_CONSUMER_COMMANDS.has(topLevelCommand);

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
  }

  const exitCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode;

  return {
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    exitCode,
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

async function seedValidOatSkill(
  root: string,
  skillName: string,
): Promise<void> {
  await mkdir(join(root, '.agents', 'skills', skillName), { recursive: true });
  await writeFile(
    join(root, '.agents', 'skills', skillName, 'SKILL.md'),
    [
      '---',
      `name: ${skillName}`,
      'description: Use when validating internal CLI skill checks. Provides a valid oat-* fixture for integration tests.',
      'disable-model-invocation: true',
      'user-invocable: true',
      'allowed-tools: Read, Write',
      '---',
      '',
      '# Skill',
      '',
      '## Progress Indicators (User-Facing)',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ' OAT ▸ TEST',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Body',
    ].join('\n'),
    'utf8',
  );
}

async function seedProjectTemplates(root: string): Promise<void> {
  await mkdir(join(root, '.oat', 'templates'), { recursive: true });
  for (const template of [
    'state.md',
    'discovery.md',
    'spec.md',
    'design.md',
    'plan.md',
    'implementation.md',
    'project-index.md',
  ]) {
    const content =
      template === 'state.md'
        ? [
            '---',
            'oat_template: true',
            'oat_template_name: state',
            'oat_hill_checkpoints: {OAT_HILL_CHECKPOINTS}',
            'oat_phase: {OAT_PHASE}',
            'oat_phase_status: in_progress',
            'oat_workflow_mode: {OAT_WORKFLOW_MODE}',
            '---',
            '',
            '# Project State: {Project Name}',
            '',
            '**Status:** {OAT_STATUS}',
            '**Started:** YYYY-MM-DD',
            '**Last Updated:** YYYY-MM-DD',
            '',
            '## Current Phase',
            '',
            '{OAT_CURRENT_PHASE}',
            '',
            '## Artifacts',
            '',
            '{OAT_ARTIFACTS}',
            '',
            '## Progress',
            '',
            '{OAT_PROGRESS}',
            '',
            '## Next Milestone',
            '',
            '{OAT_NEXT_MILESTONE}',
          ].join('\n')
        : [
            '---',
            'oat_template: true',
            `oat_template_name: ${template.replace('.md', '')}`,
            '---',
            '',
            `# {Project Name} ${template}`,
            'Date: YYYY-MM-DD',
          ].join('\n');
    await writeFile(join(root, '.oat', 'templates', template), content, 'utf8');
  }
}

describe('CLI command integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('init → status → sync → status: full workflow', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);

    const before = await runCli(root, ['status', '--json'], ['--json']);
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.missing).toBeGreaterThan(0);

    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    const after = await runCli(root, ['status', '--json'], ['--json']);
    expect(after.exitCode).toBe(0);
    const payload = JSON.parse(after.stdout);
    expect(payload.summary.drifted).toBe(0);
    expect(payload.summary.missing).toBe(0);
    expect(payload.summary.stray).toBe(0);
    expect(payload.summary.inSync).toBeGreaterThan(0);
  });

  it('init on empty repo creates directories and empty manifest', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, ['init']);
    expect(result.exitCode).toBe(0);

    await expect(lstat(join(root, '.agents', 'skills'))).resolves.toBeDefined();
    await expect(lstat(join(root, '.agents', 'agents'))).resolves.toBeDefined();
    const manifestRaw = await readFile(
      join(root, '.oat', 'sync', 'manifest.json'),
      'utf8',
    );
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.entries).toEqual([]);
  });

  it('sync uses Cursor native skills while retaining Cursor agent views', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);

    const result = await runCli(root, ['sync']);
    expect(result.exitCode).toBe(0);

    const claudeSkillStat = await lstat(
      join(root, '.claude', 'skills', 'skill-one'),
    );
    const claudeAgentStat = await lstat(
      join(root, '.claude', 'agents', 'agent-one'),
    );
    const cursorAgentStat = await lstat(
      join(root, '.cursor', 'agents', 'agent-one'),
    );

    expect(claudeSkillStat.isSymbolicLink()).toBe(true);
    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(claudeAgentStat.isSymbolicLink()).toBe(true);
    expect(cursorAgentStat.isSymbolicLink()).toBe(true);
    const manifest = JSON.parse(
      await readFile(join(root, '.oat', 'sync', 'manifest.json'), 'utf8'),
    );
    expect(
      manifest.entries.some(
        (entry: { contentType: string; provider: string }) =>
          entry.provider === 'cursor' && entry.contentType === 'skill',
      ),
    ).toBe(false);
  });

  it('sync safely retires legacy Cursor skill ownership', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);
    await mkdir(join(root, '.agents', 'skills', 'skill-two'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'skills', 'skill-two', 'SKILL.md'),
      'skill two',
      'utf8',
    );

    await mkdir(join(root, '.cursor', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'skill-one'),
      join(root, '.cursor', 'skills', 'skill-one'),
      'dir',
    );
    await mkdir(join(root, '.cursor', 'skills', 'skill-two'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.cursor', 'skills', 'skill-two', 'SKILL.md'),
      'user replacement',
      'utf8',
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
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.entries.push(
      {
        canonicalPath: '.agents/skills/skill-one',
        providerPath: '.cursor/skills/skill-one',
        provider: 'cursor',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        isFile: false,
        lastSynced: new Date().toISOString(),
      },
      {
        canonicalPath: '.agents/skills/skill-two',
        providerPath: '.cursor/skills/skill-two',
        provider: 'cursor',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        isFile: false,
        lastSynced: new Date().toISOString(),
      },
    );
    await writeFile(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );

    const dryRun = await runCli(root, ['sync', '--dry-run']);
    expect(dryRun.exitCode).toBe(0);
    expect(dryRun.stdout).toContain(
      'remove cursor/skill-one (obsolete mapping has verified clean managed symlink)',
    );
    expect(dryRun.stdout).toContain(
      'detach cursor/skill-two (obsolete mapping provider path is changed or unverified; preserve and detach manifest ownership)',
    );
    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).resolves.toBeDefined();

    const result = await runCli(root, ['sync']);
    expect(result.exitCode).toBe(0);
    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      readFile(
        join(root, '.cursor', 'skills', 'skill-two', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('user replacement');
    await expect(
      readFile(
        join(root, '.cursor', 'skills', 'cursor-only', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('cursor only');

    const updatedManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    expect(
      updatedManifest.entries.some(
        (entry: { contentType: string; provider: string }) =>
          entry.provider === 'cursor' && entry.contentType === 'skill',
      ),
    ).toBe(false);

    const status = await runCli(root, ['status', '--json'], ['--json']);
    const statusPayload = JSON.parse(status.stdout);
    expect(statusPayload.reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'cursor',
          providerPath: '.cursor/skills/skill-two',
          state: { status: 'stray' },
        }),
        expect.objectContaining({
          provider: 'cursor',
          providerPath: '.cursor/skills/cursor-only',
          state: { status: 'stray' },
        }),
      ]),
    );
  });

  it('status --json outputs valid JSON with no prompts', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);

    const result = await runCli(root, ['status', '--json'], ['--json']);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stderr).not.toContain('Adopt stray');
  });

  it('doctor on healthy setup reports all pass', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await rm(join(root, '.cursor'), { recursive: true, force: true });
    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      await runCli(root, ['init']);
      await seedCanonical(root);
      await runCli(root, ['sync']);

      const result = await runCli(root, ['doctor', '--json'], ['--json']);
      const payload = JSON.parse(result.stdout);
      expect(
        payload.checks.every(
          (check: { status: string }) => check.status === 'pass',
        ),
      ).toBe(true);
      expect(result.exitCode).toBe(0);
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });

  it('providers list shows all registered adapters', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(
      root,
      ['providers', 'list', '--json'],
      ['--json'],
    );
    const payload = JSON.parse(result.stdout);
    const names = payload.map((item: { name: string }) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(['claude', 'cursor', 'codex']),
    );
  });

  it('review latest is registered and emits an empty json result when no reviews exist', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(
      root,
      ['review', 'latest', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      path: null,
      scope: null,
      generatedAt: null,
      kind: null,
      archived: null,
      actionable: null,
    });
  });

  it('registers the complete review validation command lifecycle', () => {
    const program = createProgram();
    registerCommands(program);
    const review = program.commands.find(
      (command) => command.name() === 'review',
    );

    expect(review?.commands.map((command) => command.name())).toEqual([
      'latest',
      'authority-broker',
      'prepare-context',
      'checkpoint-artifacts',
      'validate-plan',
      'begin-evidence',
      'validate-output',
      'publish-output',
    ]);
  });

  it('executes branch-local review command identity ahead of ambient PATH', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    const candidate = join(root, 'branch-candidate.cjs');
    const ambient = join(root, 'ambient');
    await mkdir(ambient);
    await writeFile(
      candidate,
      'process.stdout.write(JSON.stringify({ candidate: __filename, argv: process.argv.slice(2) }))',
    );
    await writeFile(join(ambient, 'oat'), 'older global installation');

    const result = await executeCommandInvocation(
      {
        executable: process.execPath,
        argv: [candidate, 'review', 'checkpoint-artifacts'],
        stdin: 'none',
      },
      {
        environment: {
          ...process.env,
          PATH: `${ambient}:${process.env.PATH ?? ''}`,
        },
      },
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      candidate: await realpath(candidate),
      argv: ['review', 'checkpoint-artifacts'],
    });
  });

  it('providers set writes provider enablement to sync config', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, [
      'providers',
      'set',
      '--enabled',
      'claude,cursor',
      '--disabled',
      'codex',
    ]);

    expect(result.exitCode).toBe(0);

    const configRaw = await readFile(
      join(root, '.oat', 'sync', 'config.json'),
      'utf8',
    );
    const config = JSON.parse(configRaw);
    expect(config.providers.claude.enabled).toBe(true);
    expect(config.providers.cursor.enabled).toBe(true);
    expect(config.providers.codex.enabled).toBe(false);
  });

  it('idempotency: init + sync twice produces same state', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);
    await runCli(root, ['sync']);

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const before = await readFile(manifestPath, 'utf8');

    await runCli(root, ['init']);
    await runCli(root, ['sync']);

    const after = await readFile(manifestPath, 'utf8');
    expect(after).toBe(before);
  });

  it('internal validate-oat-skills succeeds for valid oat-* skills', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await seedValidOatSkill(root, 'oat-sample');

    const result = await runCli(root, ['internal', 'validate-oat-skills']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('OK: validated 1 oat-* skills');
  });

  it('project new creates quick-mode scaffold artifacts', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await seedProjectTemplates(root);

    const result = await runCli(root, [
      'project',
      'new',
      'quick-smoke',
      '--mode',
      'quick',
      '--no-dashboard',
      '--no-commit',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Created/updated OAT project: quick-smoke');
    expect(result.stdout).not.toContain('Dashboard generated: .oat/state.md');

    for (const file of [
      'state.md',
      'discovery.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(
        readFile(
          join(root, '.oat', 'projects', 'shared', 'quick-smoke', file),
          'utf8',
        ),
      ).resolves.toContain('quick-smoke');
    }

    for (const file of ['spec.md', 'design.md']) {
      await expect(
        readFile(
          join(root, '.oat', 'projects', 'shared', 'quick-smoke', file),
          'utf8',
        ),
      ).rejects.toThrow();
    }

    const state = await readFile(
      join(root, '.oat', 'projects', 'shared', 'quick-smoke', 'state.md'),
      'utf8',
    );
    expect(state).toContain('oat_workflow_mode: quick');
    expect(state).toContain('- **Spec:** N/A (quick mode)');
    expect(state).toContain(
      'Complete discovery and generate a quick implementation plan',
    );
  });

  it('cleanup subcommands parse successfully', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const projectResult = await runCli(root, ['cleanup', 'project']);
    const artifactsResult = await runCli(root, ['cleanup', 'artifacts']);

    expect(projectResult.exitCode).toBe(0);
    expect(artifactsResult.exitCode).toBe(0);
  });

  it('dispatch-ceiling resolve emits optional Dispatch Report V1 JSON', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const result = await runCli(root, [
      'project',
      'dispatch-ceiling',
      'resolve',
      '--provider',
      'codex',
      '--candidate-model',
      'gpt-5.6-terra',
      '--candidate-effort',
      'medium',
      '--task-class',
      'default-implementation',
      '--task-effort',
      'high',
      '--report-scope',
      'p03-t04',
      '--report-action',
      'implementation',
      '--json',
    ]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.providers.codex.selection.candidateIndex).toBe(1);
    expect(payload.dispatchReport).toMatchObject({
      schemaVersion: 1,
      route: {
        scope: 'p03-t04',
        action: 'implementation',
        role: 'implementer',
      },
      selection: {
        candidateIndex: 1,
        selectionBranch: 'candidate-requested',
      },
      classification: {
        taskClass: 'default-implementation',
        preferredEffort: 'high',
        source: 'caller',
      },
      notices: [],
    });
  });

  it('cleanup artifacts --json emits stable contract fields', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'repo', 'reviews'), { recursive: true });
    await mkdir(join(root, '.oat', 'repo', 'reference', 'external-plans'), {
      recursive: true,
    });
    await writeFile(join(root, '.oat', 'repo', 'reviews', 'r1.md'), '# r1');
    await writeFile(
      join(root, '.oat', 'repo', 'reference', 'external-plans', 'p1.md'),
      '# p1',
    );

    const result = await runCli(
      root,
      ['cleanup', 'artifacts', '--dry-run', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(
      expect.objectContaining({
        status: 'drift',
        mode: 'dry-run',
        summary: expect.any(Object),
        actions: expect.any(Array),
      }),
    );
    expect(payload.summary).toEqual(
      expect.objectContaining({
        scanned: 2,
        issuesFound: 2,
      }),
    );
    expect(payload.actions.length).toBeGreaterThan(0);
  });

  it('cleanup project --json emits stable contract fields', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'plan.md'),
      '# plan',
      'utf8',
    );

    const result = await runCli(
      root,
      ['cleanup', 'project', '--dry-run', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(
      expect.objectContaining({
        status: 'drift',
        mode: expect.any(String),
        summary: expect.any(Object),
        actions: expect.any(Array),
      }),
    );
  });
});
