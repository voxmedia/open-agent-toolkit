import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import {
  readOatConfig,
  readUserConfig,
  writeUserConfig,
} from '@config/oat-config';
import { resolveEffectiveConfig } from '@config/resolve';
import { afterEach, describe, expect, it } from 'vitest';

import { createConfigCommand } from './index';

const roots: string[] = [];
afterEach(async () => {
  process.exitCode = 0;
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'oat-guidance-'));
  roots.push(root);
  const repo = join(root, 'repo');
  const home = join(root, 'home');
  const user = join(home, '.oat');
  await mkdir(join(repo, '.oat'), { recursive: true });
  await mkdir(user, { recursive: true });
  const repoPath = join(repo, '.oat/config.json');
  const userPath = join(user, 'config.json');
  await writeFile(
    repoPath,
    JSON.stringify({
      version: 1,
      documentation: {
        root: 'docs',
        tooling: 'markdown',
        future: { keep: true },
      },
      future: { repo: true },
    }),
  );
  await writeFile(
    userPath,
    JSON.stringify({
      version: 1,
      updateNotifications: false,
      documentation: { future: { keep: true } },
      future: { user: true },
    }),
  );
  async function command(...args: string[]) {
    const capture = createLoggerCapture();
    const config = createConfigCommand({
      buildCommandContext: (): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: true,
        cwd: repo,
        home,
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => repo,
      processEnv: {},
    });
    await config.parseAsync(args, { from: 'user' });
    return capture.jsonPayloads.at(-1) as {
      status: string;
      key: string;
      value: unknown;
      source: string;
      message?: string;
    };
  }
  return { repo, user, repoPath, userPath, command };
}

function select(input: unknown, ...args: string[]) {
  const script = resolve(
    process.cwd(),
    '../../.agents/skills/authoring-docs/scripts/resolve-guidance.mjs',
  );
  return JSON.parse(
    execFileSync(
      process.execPath,
      [script, '--builtin', 'builtin/information-architecture.md', ...args],
      {
        input: JSON.stringify(input),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    ),
  ) as { sources: Array<{ location: string; source: string }> };
}

describe('documentation.guidance through real config files and skill selection', () => {
  it('round-trips scalar and ordered arrays at both supported tiers and preserves unrelated fields', async () => {
    const f = await fixture();
    for (const flag of ['--user', '--shared']) {
      for (const value of [
        '~/guidance/index.md',
        '["https://example.com/ia/index.md","./guide,one/index.md","./guide,one/index.md"]',
      ]) {
        const expected = value.startsWith('[') ? JSON.parse(value) : value;
        expect(
          await f.command('set', 'documentation.guidance', value, flag),
        ).toMatchObject({ status: 'ok', value: expected });
        expect(await f.command('get', 'documentation.guidance')).toMatchObject({
          status: 'ok',
          value: expected,
          source: flag === '--user' ? 'user' : 'shared',
        });
        const disk = JSON.parse(
          await readFile(flag === '--user' ? f.userPath : f.repoPath, 'utf8'),
        );
        expect(disk.documentation.future).toEqual({ keep: true });
        expect(disk.future).toEqual(
          flag === '--user' ? { user: true } : { repo: true },
        );
      }
    }
    expect((await readOatConfig(f.repo)).documentation?.root).toBe('docs');
    expect((await readUserConfig(f.user)).documentation?.guidance).toEqual([
      'https://example.com/ia/index.md',
      './guide,one/index.md',
      './guide,one/index.md',
    ]);
    const config = await readUserConfig(f.user);
    await writeUserConfig(f.user, { ...config, activeIdea: 'another-idea' });
    expect((await readUserConfig(f.user)).documentation).toEqual(
      config.documentation,
    );
    expect(JSON.parse(await readFile(f.userPath, 'utf8')).future).toEqual({
      user: true,
    });
    expect(
      JSON.parse(await readFile(f.userPath, 'utf8')).documentation.future,
    ).toEqual({ keep: true });
    await writeFile(
      f.userPath,
      JSON.stringify({
        version: 1,
        documentation: {
          root: 'not-a-user-setting',
          guidance: 'user/index.md',
        },
      }),
    );
    await f.command('unset', 'documentation.guidance', '--shared');
    expect(
      (await resolveEffectiveConfig(f.repo, f.user, {})).resolved[
        'documentation.root'
      ],
    ).toEqual({ value: 'docs', source: 'shared' });
    expect((await readUserConfig(f.user)).documentation).toEqual({
      guidance: 'user/index.md',
    });
  });

  it('selects explicit/conversation, repo, user, then built-in with ordered provenance', async () => {
    const f = await fixture();
    await f.command(
      'set',
      'documentation.guidance',
      '["user/first/index.md","user/second/index.md"]',
      '--user',
    );
    await f.command(
      'set',
      'documentation.guidance',
      '["repo/first/index.md","repo/second/index.md"]',
      '--shared',
    );
    const repoInput = await f.command('get', 'documentation.guidance');
    expect(select(repoInput)).toEqual({
      sources: [
        { location: 'repo/first/index.md', source: 'shared' },
        { location: 'repo/second/index.md', source: 'shared' },
      ],
    });
    expect(
      select(
        repoInput,
        '--ia-guidance',
        'explicit/index.md',
        '--ia-guidance',
        'second/index.md',
      ),
    ).toEqual({
      sources: [
        { location: 'explicit/index.md', source: 'explicit' },
        { location: 'second/index.md', source: 'explicit' },
      ],
    });
    expect(
      select(repoInput, '--conversation-guidance', 'conversation/index.md'),
    ).toEqual({
      sources: [{ location: 'conversation/index.md', source: 'conversation' }],
    });
    await f.command('unset', 'documentation.guidance', '--shared');
    expect(select(await f.command('get', 'documentation.guidance'))).toEqual({
      sources: [
        { location: 'user/first/index.md', source: 'user' },
        { location: 'user/second/index.md', source: 'user' },
      ],
    });
    await f.command('unset', 'documentation.guidance', '--user');
    const fallback = await f.command('get', 'documentation.guidance');
    expect(fallback).toMatchObject({
      status: 'ok',
      value: null,
      source: 'default',
    });
    expect(select(fallback)).toEqual({
      sources: [
        { location: 'builtin/information-architecture.md', source: 'builtin' },
      ],
    });
    expect(
      (await resolveEffectiveConfig(f.repo, f.user, {})).resolved[
        'documentation.guidance'
      ],
    ).toEqual({ value: null, source: 'default' });
  });

  it('rejects malformed inputs and local scope without changing valid config', async () => {
    const f = await fixture();
    await f.command('set', 'documentation.guidance', './valid/index.md');
    const before = await readFile(f.repoPath, 'utf8');
    for (const value of ['[]', '[1]', '["valid",""]', '']) {
      expect(
        await f.command('set', 'documentation.guidance', value),
      ).toMatchObject({ status: 'error' });
    }
    expect(
      await f.command(
        'set',
        'documentation.guidance',
        'local/index.md',
        '--local',
      ),
    ).toMatchObject({ status: 'error' });
    expect(await readFile(f.repoPath, 'utf8')).toBe(before);
    expect(() => select({ status: 'error', message: 'unknown key' })).toThrow();
    expect(() =>
      select(
        { status: 'ok', key: 'documentation.guidance', value: null },
        '--ia-guidance',
        'a',
        '--conversation-guidance',
        'b',
      ),
    ).toThrow();
    await writeFile(
      f.userPath,
      JSON.stringify({ version: 1, documentation: { guidance: [42] } }),
    );
    await expect(readUserConfig(f.user)).rejects.toThrow(
      'Invalid documentation.guidance',
    );
    await writeFile(
      f.repoPath,
      JSON.stringify({ version: 1, documentation: { guidance: [] } }),
    );
    await expect(readOatConfig(f.repo)).rejects.toThrow(
      'Invalid documentation.guidance',
    );
  });
});
