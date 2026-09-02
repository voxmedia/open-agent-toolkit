import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { reconcilePackLifecycle } from '@commands/tools/shared/pack-lifecycle';
import { resolveAssetsRoot } from '@fs/assets';
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
      SCOPE_CONSUMER_COMMANDS.has(topLevelCommand) &&
      !(topLevelCommand === 'tools' && args[1] === 'migrate') &&
      // An explicit caller-supplied scope always wins; injecting a second
      // `--scope` would make the effective scope depend on argument order.
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

function dispatchRecordFixture() {
  return {
    request_id: 'dispatch-native-1',
    caller: 'oat-project-implement',
    scope: 'p07',
    objective: 'Integrate runtime observation',
    action: 'implementation',
    role_name: 'oat-phase-implementer',
    role_class: 'implementation',
    provider: 'codex',
    dispatch_context: 'root-native',
    catalog_snapshot: {
      id: 'catalog-1',
      source: 'tool-schema',
      observed_at: '2026-09-02T00:00:00.000Z',
    },
    authority: 'phase-files',
    role_selector: 'oat-phase-implementer-gpt-5-6-sol-high',
    model_selector: 'gpt-5.6-sol',
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: 'high',
    service_tier_selector: 'priority',
    selection_source: 'policy-resolved',
    candidates_considered: ['oat-phase-implementer-gpt-5-6-sol-high'],
    selection_reason: 'native-catalog',
    selected_route: 'native',
    deadline_seconds: 600,
    retry_limit: 0,
    payload: {},
    launch_status: 'accepted',
    child_outcome: 'completed',
    configured_invocation_evidence: ['dispatch ceiling resolver'],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
  };
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

  it('sync falls Claude skills back per-entry while retaining Cursor native skills and agent views', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);

    const result = await runCli(root, ['sync']);
    expect(result.exitCode).toBe(0);

    const claudeSkillCollectionStat = await lstat(
      join(root, '.claude', 'skills'),
    );
    const claudeSkillStat = await lstat(
      join(root, '.claude', 'skills', 'skill-one'),
    );
    const claudeAgentStat = await lstat(
      join(root, '.claude', 'agents', 'agent-one'),
    );
    const cursorAgentStat = await lstat(
      join(root, '.cursor', 'agents', 'agent-one'),
    );

    expect(claudeSkillCollectionStat.isDirectory()).toBe(true);
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
    expect(
      manifest.collections.some(
        (collection: { contentType: string; provider: string }) =>
          collection.provider === 'claude' &&
          collection.contentType === 'skill',
      ),
    ).toBe(false);
    expect(
      manifest.entries.some(
        (entry: { contentType: string; provider: string; strategy: string }) =>
          entry.provider === 'claude' &&
          entry.contentType === 'skill' &&
          entry.strategy === 'symlink',
      ),
    ).toBe(true);
  });

  it('sync uses Copilot native skills while retaining Copilot agent and rule views', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await mkdir(join(root, '.github', 'agents'), { recursive: true });
    await runCli(root, ['init']);
    await seedCanonical(root);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'rule-one.md'),
      '---\ndescription: Rule one\nactivation: always\n---\n\n# Rule One\n',
      'utf8',
    );

    const result = await runCli(root, ['sync']);
    expect(result.exitCode).toBe(0);

    await expect(
      lstat(join(root, '.github', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      lstat(join(root, '.github', 'agents', 'agent-one')),
    ).resolves.toMatchObject({});
    await expect(
      lstat(join(root, '.github', 'instructions', 'rule-one.instructions.md')),
    ).resolves.toMatchObject({});

    const manifest = JSON.parse(
      await readFile(join(root, '.oat', 'sync', 'manifest.json'), 'utf8'),
    );
    expect(
      manifest.entries.some(
        (entry: { contentType: string; provider: string }) =>
          entry.provider === 'copilot' && entry.contentType === 'skill',
      ),
    ).toBe(false);
    expect(
      manifest.entries.some(
        (entry: { contentType: string; provider: string }) =>
          entry.provider === 'copilot' && entry.contentType === 'agent',
      ),
    ).toBe(true);
    expect(
      manifest.entries.some(
        (entry: { contentType: string; provider: string }) =>
          entry.provider === 'copilot' && entry.contentType === 'rule',
      ),
    ).toBe(true);

    const status = await runCli(root, ['status', '--json'], ['--json']);
    expect(status.exitCode).toBe(0);
    const statusPayload = JSON.parse(status.stdout);
    expect(statusPayload.summary.missing).toBe(0);
    expect(
      statusPayload.reports.some(
        (report: { provider: string; providerPath: string }) =>
          report.provider === 'copilot' &&
          report.providerPath.startsWith('.github/skills/'),
      ),
    ).toBe(false);
  });

  it('sync safely retires legacy Copilot skill ownership', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await mkdir(join(root, '.github', 'agents'), { recursive: true });
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

    await mkdir(join(root, '.github', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'skill-one'),
      join(root, '.github', 'skills', 'skill-one'),
      'dir',
    );
    await mkdir(join(root, '.github', 'skills', 'skill-two'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.github', 'skills', 'skill-two', 'SKILL.md'),
      'user replacement',
      'utf8',
    );
    await mkdir(join(root, '.github', 'skills', 'copilot-only'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.github', 'skills', 'copilot-only', 'SKILL.md'),
      'copilot only',
      'utf8',
    );

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.entries.push(
      {
        canonicalPath: '.agents/skills/skill-one',
        providerPath: '.github/skills/skill-one',
        provider: 'copilot',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        isFile: false,
        lastSynced: new Date().toISOString(),
      },
      {
        canonicalPath: '.agents/skills/skill-two',
        providerPath: '.github/skills/skill-two',
        provider: 'copilot',
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
      'remove copilot/skill-one (obsolete mapping has verified clean managed symlink)',
    );
    expect(dryRun.stdout).toContain(
      'detach copilot/skill-two (obsolete mapping provider path is changed or unverified; preserve and detach manifest ownership)',
    );

    const result = await runCli(root, ['sync']);
    expect(result.exitCode).toBe(0);
    await expect(
      lstat(join(root, '.github', 'skills', 'skill-one')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      readFile(
        join(root, '.github', 'skills', 'skill-two', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('user replacement');
    await expect(
      readFile(
        join(root, '.github', 'skills', 'copilot-only', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe('copilot only');

    const updatedManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    expect(
      updatedManifest.entries.some(
        (entry: { contentType: string; provider: string }) =>
          entry.provider === 'copilot' && entry.contentType === 'skill',
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

  it('doctor reports an invalid defaultScope as a failing check', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      await runCli(root, ['init']);
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          projects: {
            root: '.oat/projects/shared',
            defaultScope: 'remote',
          },
        })}\n`,
      );

      const result = await runCli(root, ['doctor', '--json'], ['--json']);
      const payload = JSON.parse(result.stdout);
      expect(payload.checks).toContainEqual(
        expect.objectContaining({
          name: 'project:projects_default_scope',
          status: 'fail',
        }),
      );
      expect(result.exitCode).toBe(2);
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  }, 15_000);

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

  it('tools migrate is registered and previews project to user without mutation', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(join(tmpdir(), 'oat-cli-migrate-home-'));
    tempDirs.push(root, userRoot);
    const assetsRoot = await resolveAssetsRoot();
    await reconcilePackLifecycle({
      pack: 'ideas',
      scope: 'project',
      scopeRoot: root,
      assetsRoot,
      action: 'install',
    });
    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;

    try {
      const result = await runCli(
        root,
        [
          'tools',
          'migrate',
          '--pack',
          'ideas',
          '--from',
          'project',
          '--to',
          'user',
          '--dry-run',
        ],
        ['--json'],
      );

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: 'previewed',
        operation: 'migrate',
        dryRun: true,
        preview: {
          pack: 'ideas',
          from: 'project',
          to: 'user',
          status: 'ready',
        },
      });
      await expect(
        lstat(join(userRoot, '.agents', 'skills', 'oat-idea-new')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(
        lstat(join(root, '.agents', 'skills', 'oat-idea-new')),
      ).resolves.toBeDefined();
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
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
      '--scope',
      'shared',
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

  it('sync --scope user materializes user skills through mappings and user agents through the codex extension', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(join(tmpdir(), 'oat-cli-user-scope-'));
    tempDirs.push(root, userRoot);
    await mkdir(join(userRoot, '.claude'), { recursive: true });
    await mkdir(join(userRoot, '.codex'), { recursive: true });
    await seedCanonical(userRoot);

    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      await runCli(root, ['init', '--scope=user']);
      const sync = await runCli(root, ['sync', '--scope', 'user']);
      expect(sync.exitCode).toBe(0);

      for (const scopeArgs of [['--scope', 'user'], ['--scope=user']]) {
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
        expect(JSON.parse(preview.stdout).lifecycle[0].selection).toMatchObject(
          { pack: 'core', targetScopes: ['user'] },
        );
      }

      // Skills materialize through user path mappings.
      await expect(
        lstat(join(userRoot, '.claude', 'skills', 'skill-one')),
      ).resolves.toBeDefined();

      // User canonical agents materialize when the active provider declares
      // user-agent capability. Claude owns a user-agent path mapping, so this
      // generic canonical agent reaches its provider view.
      await expect(
        lstat(join(userRoot, '.claude', 'agents', 'agent-one')),
      ).resolves.toBeDefined();

      // Managed user agents reach Codex through the materialization
      // extension, which sources bundled managed agent definitions.
      await expect(
        lstat(join(userRoot, '.codex', 'agents', 'oat-reviewer.toml')),
      ).resolves.toBeDefined();
      await expect(
        lstat(join(userRoot, '.codex', 'agents', 'oat-phase-implementer.toml')),
      ).resolves.toBeDefined();

      // User-scope sync must not create project provider views.
      await expect(
        lstat(join(root, '.claude', 'skills', 'skill-one')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('sync --scope all materializes duplicate cross-scope sources into both provider views', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(join(tmpdir(), 'oat-cli-dup-scope-'));
    tempDirs.push(root, userRoot);
    await mkdir(join(userRoot, '.claude'), { recursive: true });

    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      await runCli(root, ['init', '--scope', 'project']);
      await runCli(root, ['init', '--scope', 'user']);
      // The same canonical skill name exists at both scopes.
      await seedCanonical(root);
      await seedCanonical(userRoot);

      const sync = await runCli(root, ['sync', '--scope', 'all']);
      expect(sync.exitCode).toBe(0);

      // Both scopes materialize independently; neither prunes the other and
      // no execution precedence is implied between them.
      await expect(
        lstat(join(root, '.claude', 'skills', 'skill-one')),
      ).resolves.toBeDefined();
      await expect(
        lstat(join(userRoot, '.claude', 'skills', 'skill-one')),
      ).resolves.toBeDefined();

      const projectManifest = JSON.parse(
        await readFile(join(root, '.oat', 'sync', 'manifest.json'), 'utf8'),
      );
      const userManifest = JSON.parse(
        await readFile(join(userRoot, '.oat', 'sync', 'manifest.json'), 'utf8'),
      );
      expect(
        projectManifest.entries.some(
          (entry: { canonicalPath: string }) =>
            entry.canonicalPath === '.agents/skills/skill-one',
        ),
      ).toBe(true);
      expect(
        userManifest.entries.some(
          (entry: { canonicalPath: string }) =>
            entry.canonicalPath === '.agents/skills/skill-one',
        ),
      ).toBe(true);
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('sync --scope user materializes a user-installed pack into provider views', async () => {
    const root = await createWorkspace();
    const userRoot = await mkdtemp(join(tmpdir(), 'oat-cli-user-pack-'));
    tempDirs.push(root, userRoot);
    await mkdir(join(userRoot, '.claude'), { recursive: true });
    const assetsRoot = await resolveAssetsRoot();
    await reconcilePackLifecycle({
      pack: 'ideas',
      scope: 'user',
      scopeRoot: userRoot,
      assetsRoot,
      action: 'install',
    });

    const previousHome = process.env.HOME;
    process.env.HOME = userRoot;
    try {
      await runCli(root, ['init', '--scope', 'user']);
      const sync = await runCli(root, ['sync', '--scope', 'user']);
      expect(sync.exitCode).toBe(0);

      await expect(
        lstat(join(userRoot, '.agents', 'skills', 'oat-idea-new')),
      ).resolves.toBeDefined();
      await expect(
        lstat(join(userRoot, '.claude', 'skills', 'oat-idea-new')),
      ).resolves.toBeDefined();
      await expect(
        lstat(join(root, '.agents', 'skills', 'oat-idea-new')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  it('project dispatch record persists an observation without launching a provider', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '# state\n', 'utf8');

    const dispatchRecord = dispatchRecordFixture();
    const eventFile = join(root, 'observation.json');
    await writeFile(
      eventFile,
      JSON.stringify({
        record: dispatchRecord,
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          metadata: {
            provider: 'codex',
            observedAt: '2026-09-02T12:00:00.000Z',
            entries: [
              {
                type: 'session_meta',
                payload: { id: 'sess-root', role: 'oat-phase-implementer' },
              },
              {
                type: 'turn_context',
                payload: {
                  model: 'gpt-5.6-terra',
                  effort: 'high',
                  service_tier: 'priority',
                },
              },
            ],
          },
        },
      }),
      'utf8',
    );

    const result = await runCli(
      root,
      [
        'project',
        'dispatch',
        'record',
        '--project',
        '.oat/projects/shared/demo',
        '--event-file',
        eventFile,
      ],
      ['--json'],
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe('persisted');
    expect(payload.path).toBe('dispatch/dispatch-native-1.json');
    expect(payload.runtimeIdentity).toMatchObject({
      status: 'reported',
      match: 'mismatching',
      configured: { model: 'gpt-5.6-sol', effort: 'high' },
      observed: { model: 'gpt-5.6-terra', provider: 'codex' },
    });
    // The observation is corroboration only: the configured invocation and the
    // launch lifecycle are unchanged, and no conversation content is stored.
    expect(payload.record.model_selector).toBe('gpt-5.6-sol');
    expect(payload.record.launch_status).toBe('accepted');
    expect(result.stdout).not.toContain(root);

    const persisted = JSON.parse(
      await readFile(
        join(projectPath, 'dispatch', 'dispatch-native-1.json'),
        'utf8',
      ),
    );
    expect(persisted.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      match: 'mismatching',
      source: 'codex-rollout-metadata',
    });
  });

  it('project dispatch record drops content from a raw observation envelope', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '# state\n', 'utf8');

    const eventFile = join(root, 'content.json');
    await writeFile(
      eventFile,
      JSON.stringify({
        record: dispatchRecordFixture(),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          metadata: {
            provider: 'codex',
            observedAt: '2026-09-02T12:00:00.000Z',
            entries: [
              { type: 'session_meta', payload: { id: 'sess-root' } },
              {
                type: 'response_item',
                payload: { content: 'SECRET-USER-MESSAGE' },
              },
            ],
          },
        },
      }),
      'utf8',
    );

    const result = await runCli(
      root,
      [
        'project',
        'dispatch',
        'record',
        '--project',
        '.oat/projects/shared/demo',
        '--event-file',
        eventFile,
      ],
      ['--json'],
    );

    // The observation channel is metadata-only, enforced by the allowlist
    // projection rather than by caller discipline: a raw envelope is accepted
    // and its conversation content never reaches the journal or stdout.
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe('persisted');
    expect(result.stdout).not.toContain('SECRET-USER-MESSAGE');
    expect(result.stdout).not.toContain(root);
    const journal = await readFile(
      join(projectPath, 'dispatch', 'dispatch-native-1.json'),
      'utf8',
    );
    expect(journal).not.toContain('SECRET-USER-MESSAGE');
    expect(journal).not.toContain('entries');
  });
});
