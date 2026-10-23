import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { readOatConfig, writeOatConfig } from '@config/oat-config';
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
  const root = await mkdtemp(join(tmpdir(), 'oat-check-config-'));
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

const policy = {
  rules: {
    provenance: 'off',
    'root-width': 'warn',
    frontmatter: 'warn',
    mermaid: 'off',
  },
  thresholds: { rootWarn: 11, rootError: 16 },
  exceptions: [
    {
      path: 'decisions/**',
      rule: 'provenance',
      reason: 'Decision pointers intentionally name their source.',
    },
  ],
  provenance: {
    ticketPatterns: ['TASK-[0-9]+'],
    milestonePatterns: ['Milestone [0-9]+'],
  },
  diagramBaseRef: 'main',
};

describe('documentation.check through real config storage and commands', () => {
  it('round-trips the atomic policy through set/get/dump and normalized writes', async () => {
    const f = await fixture();
    expect(
      await f.command('set', 'documentation.check', JSON.stringify(policy)),
    ).toMatchObject({ status: 'ok', value: policy });
    expect(await f.command('get', 'documentation.check')).toMatchObject({
      value: policy,
      source: 'shared',
    });
    const config = await readOatConfig(f.repo);
    expect(config.documentation?.check).toEqual(policy);
    await writeOatConfig(f.repo, config);
    expect((await readOatConfig(f.repo)).documentation?.check).toEqual(policy);
    expect(
      (await resolveEffectiveConfig(f.repo, f.user, {})).resolved[
        'documentation.check'
      ],
    ).toEqual({ value: policy, source: 'shared' });
    await f.command('unset', 'documentation.check');
    expect((await readOatConfig(f.repo)).documentation?.check).toBeUndefined();
  });
  it.each([
    { unknown: true },
    { rules: { typo: 'off' } },
    { rules: { links: 'warning' } },
    { rules: { links: ['error'] } },
    {
      exceptions: [
        { path: '**', rule: 'links', reason: 'Fixture', severity: ['error'] },
      ],
    },
    { thresholds: { rootWarn: -1 } },
    { thresholds: { typo: 3 } },
    { thresholds: { rootWarn: 20 } },
    { thresholds: { pageLines: 1.5 } },
    { exceptions: [{ path: '**', rule: 'links', reason: '' }] },
    { exceptions: [{ path: '../outside', rule: 'links', reason: 'why' }] },
    { provenance: { ticketPatterns: ['['] } },
    { diagramBaseRef: '-main' },
  ])(
    'rejects malformed policy without overwriting accepted settings: %j',
    async (invalid) => {
      const f = await fixture();
      await f.command('set', 'documentation.check', JSON.stringify(policy));
      expect(
        await f.command('set', 'documentation.check', JSON.stringify(invalid)),
      ).toMatchObject({ status: 'error' });
      expect((await readOatConfig(f.repo)).documentation?.check).toEqual(
        policy,
      );
    },
  );
  it.each([
    { rules: { links: ['error'] } },
    {
      exceptions: [
        { path: '**', rule: 'links', reason: 'Fixture', severity: ['error'] },
      ],
    },
  ])(
    'rejects stored non-string severities and permits config repair: %j',
    async (invalid) => {
      const f = await fixture();
      await writeFile(
        f.repoPath,
        JSON.stringify({ version: 1, documentation: { check: invalid } }),
      );
      await expect(readOatConfig(f.repo)).rejects.toThrow(
        'severity must be error, warn or off',
      );
      expect(
        await f.command('set', 'documentation.check', JSON.stringify(policy)),
      ).toMatchObject({ status: 'ok' });
      expect((await readOatConfig(f.repo)).documentation?.check).toEqual(
        policy,
      );
    },
  );
  it('rejects stored unknown settings and supports raw set/unset repair', async () => {
    const f = await fixture();
    await writeFile(
      f.repoPath,
      JSON.stringify({
        version: 1,
        documentation: { check: { misspelled: true } },
      }),
    );
    await expect(readOatConfig(f.repo)).rejects.toThrow(
      'unknown check option "misspelled"',
    );
    expect(
      await f.command('set', 'documentation.check', JSON.stringify(policy)),
    ).toMatchObject({ status: 'ok' });
    await writeFile(
      f.repoPath,
      JSON.stringify({ version: 1, documentation: { check: null } }),
    );
    await f.command('unset', 'documentation.check');
    expect((await readOatConfig(f.repo)).documentation?.check).toBeUndefined();
  });
});
