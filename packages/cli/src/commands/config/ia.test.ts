import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { readOatConfig, readUserConfig } from '@config/oat-config';
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
  const root = await mkdtemp(join(tmpdir(), 'oat-ia-'));
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

const ia = {
  preset: 'Consumer and Maintainer',
  decision: '.oat/repo/reference/decisions/DR-example.md',
  tracks: [{ path: 'guide', principle: 'reader task' }],
  verification: 'none',
};

describe('repository IA mirrors through real command and storage', () => {
  it('round-trips atomic IA and independent sidebar ownership, preserving guidance and unknown fields', async () => {
    const f = await fixture();
    await f.command('set', 'documentation.guidance', 'public/index.md');
    expect(await f.command('get', 'documentation.ia')).toMatchObject({
      value: null,
      source: 'default',
    });
    expect(await f.command('get', 'documentation.navOwner')).toMatchObject({
      value: null,
      source: 'default',
    });
    expect(
      await f.command('set', 'documentation.ia', JSON.stringify(ia)),
    ).toMatchObject({ status: 'ok', value: ia });
    expect(await f.command('get', 'documentation.ia')).toMatchObject({
      value: ia,
      source: 'shared',
    });
    for (const owner of ['nav-sync', 'hand-authored']) {
      expect(
        await f.command('set', 'documentation.navOwner', owner),
      ).toMatchObject({ status: 'ok', value: owner });
      expect((await readOatConfig(f.repo)).documentation?.navOwner).toBe(owner);
    }
    expect(
      (await resolveEffectiveConfig(f.repo, f.user, {})).resolved[
        'documentation.ia'
      ],
    ).toEqual({ value: ia, source: 'shared' });
    const disk = JSON.parse(await readFile(f.repoPath, 'utf8'));
    expect(disk.documentation).toEqual({
      root: 'docs',
      tooling: 'markdown',
      future: { keep: true },
      guidance: 'public/index.md',
      ia,
      navOwner: 'hand-authored',
    });
    expect(disk.future).toEqual({ repo: true });
    await f.command('unset', 'documentation.ia');
    expect((await readOatConfig(f.repo)).documentation?.navOwner).toBe(
      'hand-authored',
    );
    await f.command('unset', 'documentation.navOwner');
    expect(await f.command('get', 'documentation.navOwner')).toMatchObject({
      value: null,
      source: 'default',
    });
    expect((await readOatConfig(f.repo)).documentation?.guidance).toBe(
      'public/index.md',
    );
  });

  it.each(['--user', '--local'])(
    'rejects mirror writes/unsets at %s and ignores unsupported stored tiers',
    async (scope) => {
      const f = await fixture();
      const before = await readFile(
        scope === '--user' ? f.userPath : f.repoPath,
        'utf8',
      );
      for (const [key, value] of [
        ['documentation.ia', JSON.stringify(ia)],
        ['documentation.navOwner', 'nav-sync'],
      ]) {
        expect(await f.command('set', key, value, scope)).toMatchObject({
          status: 'error',
        });
        expect(await f.command('unset', key, scope)).toMatchObject({
          status: 'error',
        });
      }
      expect(
        await readFile(scope === '--user' ? f.userPath : f.repoPath, 'utf8'),
      ).toBe(before);
      await writeFile(
        f.userPath,
        JSON.stringify({
          version: 1,
          documentation: {
            ia,
            navOwner: 'nav-sync',
            guidance: 'user/index.md',
          },
        }),
      );
      await writeFile(
        join(f.repo, '.oat/config.local.json'),
        JSON.stringify({
          version: 1,
          documentation: { ia, navOwner: 'nav-sync' },
        }),
      );
      expect((await readUserConfig(f.user)).documentation).toEqual({
        guidance: 'user/index.md',
      });
      expect(await f.command('get', 'documentation.ia')).toMatchObject({
        value: null,
        source: 'default',
      });
      expect(await f.command('get', 'documentation.navOwner')).toMatchObject({
        value: null,
        source: 'default',
      });
    },
  );

  it.each([
    {},
    { preset: 'x' },
    { ...ia, decision: '/tmp/decision.md' },
    { ...ia, decision: '../escape.md' },
    { ...ia, decision: 'https://example.com/decision' },
    { ...ia, verification: 'automatic' },
    { ...ia, tracks: [{ path: 'guide', principle: '' }] },
    { ...ia, extra: true },
    { ...ia, tracks: [{ path: 'guide', principle: 'task', extra: true }] },
  ])('rejects malformed IA without writing: %j', async (value) => {
    const f = await fixture();
    const before = await readFile(f.repoPath, 'utf8');
    expect(
      await f.command('set', 'documentation.ia', JSON.stringify(value)),
    ).toMatchObject({ status: 'error' });
    expect(await readFile(f.repoPath, 'utf8')).toBe(before);
  });

  it.each(['ia', 'navOwner'])(
    'treats stored null %s as undeclared without blocking unrelated reads',
    async (key) => {
      const f = await fixture();
      const raw = {
        version: 1,
        documentation: {
          root: 'docs',
          guidance: ['public/index.md'],
          ia,
          navOwner: 'hand-authored',
          [key]: null,
        },
        future: { keep: true },
      };
      await writeFile(f.repoPath, JSON.stringify(raw));
      expect(await f.command('get', 'documentation.root')).toMatchObject({
        status: 'ok',
        value: 'docs',
        source: 'shared',
      });
      expect(await f.command('get', `documentation.${key}`)).toMatchObject({
        status: 'ok',
        value: null,
        source: 'default',
      });
      const other = key === 'ia' ? 'navOwner' : 'ia';
      expect(await f.command('get', `documentation.${other}`)).toMatchObject({
        status: 'ok',
        value: key === 'ia' ? 'hand-authored' : ia,
        source: 'shared',
      });
      expect(JSON.parse(await readFile(f.repoPath, 'utf8'))).toEqual(raw);
    },
  );

  it('rejects invalid stored mirrors and permits exact-key repair without losing unrelated data', async () => {
    const f = await fixture();
    for (const [key, value] of [
      ['ia', { preset: 'broken' }],
      ['navOwner', 'automatic'],
    ]) {
      const raw = {
        version: 1,
        documentation: {
          root: 'docs',
          guidance: ['public/index.md'],
          [key]: value,
        },
        future: { keep: true },
      };
      await writeFile(f.repoPath, JSON.stringify(raw));
      await expect(readOatConfig(f.repo)).rejects.toThrow(
        `Invalid documentation.${key}`,
      );
      expect(await f.command('unset', `documentation.${key}`)).toMatchObject({
        status: 'ok',
      });
      expect(JSON.parse(await readFile(f.repoPath, 'utf8'))).toEqual({
        version: 1,
        documentation: { root: 'docs', guidance: ['public/index.md'] },
        future: { keep: true },
      });
    }
    expect(
      await f.command(
        'set',
        'documentation.ia',
        JSON.stringify({ preset: 'Flat Small', decision: 'decisions/ia.md' }),
      ),
    ).toMatchObject({ status: 'ok' });
    for (const value of ['automatic', 'true', ''])
      expect(
        await f.command('set', 'documentation.navOwner', value),
      ).toMatchObject({ status: 'error' });
  });
});
