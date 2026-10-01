import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import type { CommandContext } from '@app/command-context';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProjectDispatchCommand } from './index';
import { recordProjectDispatch } from './record';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
  roots.length = 0;
});

async function writeRole(
  canonicalRoot: string,
  role: string,
  version = '1.2.3',
) {
  await mkdir(join(canonicalRoot, 'agents'), { recursive: true });
  await writeFile(
    join(canonicalRoot, 'agents', `${role}.md`),
    `---\nname: ${role}\nversion: ${version}\ndescription: Fixture role\n---\n\n# ${role}\n`,
  );
}

/**
 * Three isolated tiers: a loaded skill checkout, a user home, and a repository.
 * The role under test lives only where each case puts it.
 */
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'oat-canonical-role-cmd-'));
  roots.push(root);
  const loadedRoot = join(root, 'loaded', '.agents');
  const skillDir = join(loadedRoot, 'skills', 'oat-project-implement');
  const home = join(root, 'home');
  const repo = join(root, 'repo');
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '---\nname: fixture\n---\n');
  await mkdir(join(home, '.agents'), { recursive: true });
  await mkdir(join(repo, '.agents'), { recursive: true });
  return { root, loadedRoot, skillDir, home, repo };
}

async function listTree(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true });
  return entries.map((entry) => String(entry)).sort();
}

async function run(
  args: string[],
  env: { home: string; repo: string; json?: boolean },
) {
  const json = vi.fn();
  const info = vi.fn();
  const error = vi.fn();
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    const context: CommandContext = {
      scope: 'all',
      dryRun: false,
      verbose: false,
      json: env.json ?? true,
      cwd: env.repo,
      home: env.home,
      interactive: false,
      logger: {
        debug: vi.fn(),
        info,
        warn: vi.fn(),
        error,
        success: vi.fn(),
        json,
      },
    };
    const command = createProjectDispatchCommand({
      buildCommandContext: () => context,
      resolveProjectRoot: async () => env.repo,
    });
    command.exitOverride();
    for (const sub of command.commands) {
      sub.exitOverride();
      sub.configureOutput({ writeErr: () => {}, writeOut: () => {} });
    }
    let thrown: unknown = null;
    try {
      await command.parseAsync(['canonical-role', ...args], { from: 'user' });
    } catch (caught) {
      thrown = caught;
    }
    return {
      exitCode: process.exitCode,
      payload: json.mock.calls.at(-1)?.[0] as Record<string, unknown>,
      info: info.mock.calls.map((call) => String(call[0])),
      error: error.mock.calls.map((call) => String(call[0])),
      thrown,
    };
  } finally {
    process.exitCode = previousExitCode;
  }
}

describe('oat project dispatch canonical-role', () => {
  it('resolves a role present only in the loaded tier and emits an event the recorder accepts unchanged', async () => {
    const { skillDir, loadedRoot, home, repo } = await fixture();
    await writeRole(loadedRoot, 'fixture-implementer');

    const result = await run(
      [
        '--role',
        'fixture-implementer',
        '--request-id',
        'managed-claude-implementation',
        '--skill-dir',
        relative(repo, skillDir),
      ],
      { home, repo },
    );

    expect(result.exitCode).toBe(0);
    expect(result.payload).toEqual({
      kind: 'canonical-role-resolution',
      requestId: 'managed-claude-implementation',
      source: 'canonical-role-resolver',
      evidence: {
        status: 'resolved',
        dependency: 'workflows',
        canonicalRole: 'fixture-implementer',
        tier: 'loaded',
        validation: 'direct-canonical',
        canonicalPath: '<loaded>/agents/fixture-implementer.md',
        selectedPath: '<loaded>/agents/fixture-implementer.md',
        roleVersion: '1.2.3',
        contentDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        candidateMisses: [],
      },
    });
    expect(JSON.stringify(result.payload)).not.toContain(home);

    const recorded = await recordProjectDispatch({
      input: {
        record: genericRecord('managed-claude-implementation'),
        event: result.payload,
      },
    });
    expect(recorded.status).toBe('validated-only');
    expect(recorded.record.oat.canonicalRole).toEqual(
      (result.payload as { evidence: unknown }).evidence,
    );
  });

  it('falls through to the user tier and records the loaded miss', async () => {
    const { skillDir, home, repo } = await fixture();
    await writeRole(join(home, '.agents'), 'fixture-reviewer', '2.0.0');

    const result = await run(
      [
        '--role',
        'fixture-reviewer',
        '--request-id',
        'req-1',
        '--skill-dir',
        skillDir,
      ],
      { home, repo },
    );
    expect(result.payload).toMatchObject({
      evidence: {
        status: 'resolved',
        tier: 'user',
        roleVersion: '2.0.0',
        candidateMisses: [
          {
            tier: 'loaded',
            candidate: '<loaded>/agents/fixture-reviewer.md',
            outcome: 'missing',
          },
        ],
      },
    });
  });

  it('returns missing evidence with recovery commands for an unknown role', async () => {
    const { skillDir, home, repo } = await fixture();
    const result = await run(
      [
        '--role',
        'no-such-role',
        '--request-id',
        'req-2',
        '--skill-dir',
        skillDir,
      ],
      { home, repo },
    );
    expect(result.exitCode).toBe(0);
    expect(result.payload).toMatchObject({
      kind: 'canonical-role-resolution',
      evidence: {
        status: 'missing',
        canonicalRole: 'no-such-role',
        recovery: [
          { command: 'oat tools install workflows --scope <user|project>' },
          {
            command: 'oat tools update --pack workflows --scope <user|project>',
          },
        ],
      },
    });
    expect(
      (result.payload.evidence as { candidateMisses: unknown[] })
        .candidateMisses,
    ).toHaveLength(3);
  });

  it('fails clearly when --skill-dir is missing', async () => {
    const { home, repo } = await fixture();
    const result = await run(['--role', 'x', '--request-id', 'req-3'], {
      home,
      repo,
    });
    expect(String(result.thrown)).toMatch(/--skill-dir/);
    expect(result.payload).toBeUndefined();
  });

  it.each([
    ['a directory that does not exist', 'nope/skills/oat-project-implement'],
    ['a directory without SKILL.md', '.agents'],
  ])(
    'fails clearly for %s without leaking its absolute path',
    async (_name, dir) => {
      const { home, repo } = await fixture();
      const result = await run(
        ['--role', 'x', '--request-id', 'req-4', '--skill-dir', dir],
        { home, repo },
      );
      expect(result.exitCode).toBe(1);
      expect(result.payload.status).toBe('error');
      expect(String(result.payload.message)).toMatch(
        /--skill-dir must name a loaded skill directory containing SKILL\.md/,
      );
      expect(String(result.payload.message)).not.toContain(repo);
    },
  );

  it('rejects a role or request ID the recorder would refuse', async () => {
    const { skillDir, home, repo } = await fixture();
    const badRole = await run(
      ['--role', '../escape', '--request-id', 'req-5', '--skill-dir', skillDir],
      { home, repo },
    );
    expect(badRole.exitCode).toBe(1);
    expect(String(badRole.payload.message)).toMatch(/--role/);

    const badRequest = await run(
      ['--role', 'x', '--request-id', '../escape', '--skill-dir', skillDir],
      { home, repo },
    );
    expect(badRequest.exitCode).toBe(1);
    expect(String(badRequest.payload.message)).toMatch(/--request-id/);
  });

  it('writes no files', async () => {
    const { root, skillDir, loadedRoot, home, repo } = await fixture();
    await writeRole(loadedRoot, 'fixture-implementer');
    const before = await listTree(root);
    await run(
      [
        '--role',
        'fixture-implementer',
        '--request-id',
        'req-6',
        '--skill-dir',
        skillDir,
      ],
      { home, repo },
    );
    await run(
      [
        '--role',
        'no-such-role',
        '--request-id',
        'req-7',
        '--skill-dir',
        skillDir,
      ],
      { home, repo, json: false },
    );
    expect(await listTree(root)).toEqual(before);
  });

  it('summarizes the evidence without --json', async () => {
    const { skillDir, loadedRoot, home, repo } = await fixture();
    await writeRole(loadedRoot, 'fixture-implementer');
    const result = await run(
      [
        '--role',
        'fixture-implementer',
        '--request-id',
        'req-8',
        '--skill-dir',
        skillDir,
      ],
      { home, repo, json: false },
    );
    expect(result.exitCode).toBe(0);
    expect(result.info.join('\n')).toMatch(
      /fixture-implementer resolved from the loaded tier/,
    );
    expect(result.info.join('\n')).toContain(
      '"kind": "canonical-role-resolution"',
    );
  });
});

function genericRecord(requestId: string) {
  return {
    request_id: requestId,
    caller: 'oat-project-implement',
    scope: 'p03',
    objective: 'Accept producer evidence unchanged',
    action: 'implementation',
    role_name: 'fixture-implementer',
    role_class: 'implementation',
    provider: 'codex',
    dispatch_context: 'root-native',
    catalog_snapshot: {
      id: 'catalog-1',
      source: 'tool-schema',
      observed_at: '2026-09-02T00:00:00.000Z',
    },
    authority: 'phase-files',
    role_selector: null,
    model_selector: null,
    model_selector_granularity: null,
    effort_selector: null,
    selection_source: 'native-default',
    candidates_considered: [],
    selection_reason: 'inherit',
    selected_route: 'native',
    deadline_seconds: 600,
    retry_limit: 0,
    payload: {},
    launch_status: 'planned',
    child_outcome: null,
    configured_invocation_evidence: [],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
  };
}
