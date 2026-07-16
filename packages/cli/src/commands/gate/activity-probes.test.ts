import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  truncate,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createGateActivityProbe,
  encodeClaudeProjectPath,
  encodeCursorProjectPath,
  resolveGateActivityPaths,
} from './activity-probes';

const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-gate-probe-'));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe('activity probe path derivation', () => {
  it('ports Claude and Cursor cwd encoding including special characters', () => {
    expect(encodeClaudeProjectPath('/Users/thomas.stang/.oat kit')).toBe(
      '-Users-thomas-stang--oat kit',
    );
    expect(encodeCursorProjectPath('/Users/thomas.stang/.oat kit')).toBe(
      'Users-thomas-stang-oat kit',
    );
  });

  it('resolves project-scoped Claude and Cursor transcript directories', () => {
    const context = {
      cwd: '/repo/.fixture',
      home: '/home/test',
      spawnedAt: Date.UTC(2026, 6, 15, 23, 59),
    };
    expect(resolveGateActivityPaths({ ...context, runtime: 'claude' })).toEqual(
      ['/home/test/.claude/projects/-repo--fixture'],
    );
    expect(resolveGateActivityPaths({ ...context, runtime: 'cursor' })).toEqual(
      ['/home/test/.cursor/projects/repo-fixture/agent-transcripts'],
    );
  });

  it('probes both Codex spawn and current UTC date across midnight', () => {
    const context = {
      runtime: 'codex',
      cwd: '/repo',
      home: '/home/test',
      spawnedAt: Date.UTC(2026, 6, 15, 23, 59),
    };
    expect(
      resolveGateActivityPaths(context, Date.UTC(2026, 6, 16, 0, 1)),
    ).toEqual([
      '/home/test/.codex/sessions/2026/07/15',
      '/home/test/.codex/sessions/2026/07/16',
    ]);
  });

  it('returns no paths or probe for an unknown runtime', async () => {
    const context = {
      runtime: 'other',
      cwd: '/repo',
      home: '/home/test',
      spawnedAt: 0,
    };
    expect(resolveGateActivityPaths(context)).toEqual([]);
    await expect(createGateActivityProbe(context)).resolves.toBeNull();
  });
});

describe('activity probe metadata snapshots', () => {
  async function fixture(runtime: 'claude' | 'codex' | 'cursor') {
    const home = await tempRoot();
    const context = {
      runtime,
      cwd: '/repo/project',
      home,
      spawnedAt: Date.UTC(2026, 6, 15, 12),
    };
    const [observedPath] = resolveGateActivityPaths(context);
    await mkdir(observedPath!, { recursive: true });
    const transcript =
      runtime === 'cursor'
        ? join(observedPath!, 'session-id', 'session-id.jsonl')
        : join(observedPath!, 'session-id.jsonl');
    await mkdir(join(transcript, '..'), { recursive: true });
    await writeFile(transcript, 'seed');
    return { context, observedPath: observedPath!, transcript };
  }

  it.each([
    ['claude', 'project-dir'],
    ['cursor', 'project-dir'],
    ['codex', 'ambient-runtime'],
  ] as const)('labels %s evidence with %s scope', async (runtime, scope) => {
    const { context } = await fixture(runtime);
    const probe = await createGateActivityProbe(context);
    const evidence = await probe?.probe(context.spawnedAt + 1);
    expect(evidence).toMatchObject({
      runtime,
      scope,
      source: 'transcript-dir',
      changedSinceBaseline: false,
    });
    expect(evidence?.totalSizeBytes).toEqual(expect.any(Number));
  });

  it('detects mtime-only advancement', async () => {
    const { context, transcript } = await fixture('claude');
    const probe = await createGateActivityProbe(context);
    const nextMtime = new Date(Date.now() + 10_000);
    await utimes(transcript, nextMtime, nextMtime);
    const evidence = await probe?.probe(nextMtime.getTime());
    expect(evidence?.changedSinceBaseline).toBe(true);
    expect(evidence?.lastChangeAt).toBeCloseTo(nextMtime.getTime(), 0);
  });

  it('detects same-second size growth and truncation', async () => {
    const first = await fixture('claude');
    const growthProbe = await createGateActivityProbe(first.context);
    await writeFile(first.transcript, 'seed plus more');
    await expect(growthProbe?.probe()).resolves.toMatchObject({
      changedSinceBaseline: true,
    });

    const second = await fixture('claude');
    const truncationProbe = await createGateActivityProbe(second.context);
    await truncate(second.transcript, 1);
    await expect(truncationProbe?.probe()).resolves.toMatchObject({
      changedSinceBaseline: true,
    });
  });

  it('detects an append in Cursor nested layout without a parent-dir change', async () => {
    const { context, observedPath, transcript } = await fixture('cursor');
    const probe = await createGateActivityProbe(context);
    const parentTime = new Date(context.spawnedAt);
    await utimes(observedPath, parentTime, parentTime);
    await writeFile(transcript, 'seed plus nested append');
    await utimes(observedPath, parentTime, parentTime);
    await expect(probe?.probe()).resolves.toMatchObject({
      changedSinceBaseline: true,
      scope: 'project-dir',
    });
  });

  it('returns false for unchanged metadata', async () => {
    const { context } = await fixture('cursor');
    const probe = await createGateActivityProbe(context);
    await expect(probe?.probe()).resolves.toMatchObject({
      changedSinceBaseline: false,
    });
  });

  it('returns null for an absent directory and recovers if it later appears', async () => {
    const home = await tempRoot();
    const context = {
      runtime: 'claude',
      cwd: '/repo',
      home,
      spawnedAt: Date.now(),
    };
    const probe = await createGateActivityProbe(context);
    await expect(probe?.probe()).resolves.toBeNull();
    const [observedPath] = resolveGateActivityPaths(context);
    await mkdir(observedPath!, { recursive: true });
    await writeFile(join(observedPath!, 'session.jsonl'), 'new');
    await expect(probe?.probe()).resolves.toMatchObject({
      changedSinceBaseline: true,
    });
  });

  it('fails soft on bounded traversal errors', async () => {
    const { context, observedPath } = await fixture('claude');
    const inaccessible = join(observedPath, 'inaccessible');
    await mkdir(inaccessible);
    const probe = await createGateActivityProbe(context);
    await chmod(inaccessible, 0);
    try {
      const evidence = await probe?.probe();
      if (process.getuid?.() === 0) {
        expect(evidence).not.toBeUndefined();
      } else {
        expect(evidence).toBeNull();
      }
    } finally {
      await chmod(inaccessible, 0o700);
    }
  });

  it('uses metadata only and succeeds for an unreadable transcript file', async () => {
    const { context, transcript } = await fixture('claude');
    await chmod(transcript, 0);
    try {
      const probe = await createGateActivityProbe(context);
      await expect(probe?.probe()).resolves.toMatchObject({
        changedSinceBaseline: false,
      });
    } finally {
      await chmod(transcript, 0o600);
    }
  });
});
