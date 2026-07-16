import type { Dirent } from 'node:fs';
import { readdir, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_TRAVERSAL_DEPTH = 2;

export interface GateActivityEvidence {
  source: 'transcript-dir';
  runtime: string;
  scope: 'project-dir' | 'ambient-runtime';
  observedPath: string;
  lastChangeAt: number | null;
  totalSizeBytes: number | null;
  changedSinceBaseline: boolean;
  observedAt: number;
}

export interface GateActivityProbeStatus {
  status: 'available' | 'path-absent' | 'error';
  runtime: string;
  scope: 'project-dir' | 'ambient-runtime';
  attemptedPath: string;
  observedAt: number;
  evidence?: GateActivityEvidence;
}

interface MetadataSnapshot {
  lastChangeAt: number;
  totalSizeBytes: number;
}

export interface GateActivityProbe {
  runtime: 'claude' | 'codex' | 'cursor';
  probe(observedAt?: number): Promise<GateActivityEvidence | null>;
  observe(observedAt?: number): Promise<GateActivityProbeStatus>;
}

export interface GateActivityProbeContext {
  runtime: string;
  cwd: string;
  home: string;
  spawnedAt: number;
  realCwd?: string;
}

export function encodeClaudeProjectPath(cwd: string): string {
  return cwd.replace(/[/._]/gu, '-');
}

export function encodeCursorProjectPath(cwd: string): string {
  return cwd.split(/[/._]/u).filter(Boolean).join('-');
}

function utcDatePath(timestamp: number): string[] {
  const date = new Date(timestamp);
  return [
    String(date.getUTCFullYear()),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ];
}

export function resolveGateActivityPaths(
  context: GateActivityProbeContext,
  observedAt = context.spawnedAt,
): string[] {
  const cwdVariants = [...new Set([context.cwd, context.realCwd])].filter(
    (cwd): cwd is string => Boolean(cwd),
  );
  if (context.runtime === 'claude') {
    return cwdVariants.map((cwd) =>
      join(context.home, '.claude', 'projects', encodeClaudeProjectPath(cwd)),
    );
  }
  if (context.runtime === 'cursor') {
    return cwdVariants.map((cwd) =>
      join(
        context.home,
        '.cursor',
        'projects',
        encodeCursorProjectPath(cwd),
        'agent-transcripts',
      ),
    );
  }
  if (context.runtime === 'codex') {
    const sessionsRoot = join(context.home, '.codex', 'sessions');
    const paths = [
      join(sessionsRoot, ...utcDatePath(context.spawnedAt)),
      join(sessionsRoot, ...utcDatePath(observedAt)),
    ];
    return [...new Set(paths)];
  }
  return [];
}

async function collectMetadata(
  path: string,
  depth: number,
): Promise<MetadataSnapshot> {
  const pathStat = await stat(path);
  let lastChangeAt = pathStat.mtimeMs;
  let totalSizeBytes = pathStat.size;

  if (!pathStat.isDirectory() || depth >= MAX_TRAVERSAL_DEPTH) {
    return { lastChangeAt, totalSizeBytes };
  }

  const entries: Dirent[] = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const child = await collectMetadata(join(path, entry.name), depth + 1);
    lastChangeAt = Math.max(lastChangeAt, child.lastChangeAt);
    totalSizeBytes += child.totalSizeBytes;
  }
  return { lastChangeAt, totalSizeBytes };
}

interface MetadataSnapshotResult {
  status: 'available' | 'path-absent' | 'error';
  snapshot?: MetadataSnapshot;
}

async function snapshotPaths(paths: string[]): Promise<MetadataSnapshotResult> {
  let found = false;
  let lastChangeAt = 0;
  let totalSizeBytes = 0;

  try {
    for (const path of paths) {
      try {
        const snapshot = await collectMetadata(path, 0);
        found = true;
        lastChangeAt = Math.max(lastChangeAt, snapshot.lastChangeAt);
        totalSizeBytes += snapshot.totalSizeBytes;
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          continue;
        }
        return { status: 'error' };
      }
    }
  } catch {
    return { status: 'error' };
  }

  return found
    ? {
        status: 'available',
        snapshot: { lastChangeAt, totalSizeBytes },
      }
    : { status: 'path-absent' };
}

export async function createGateActivityProbe(
  context: GateActivityProbeContext,
): Promise<GateActivityProbe | null> {
  const resolvedContext = {
    ...context,
    realCwd: await realpath(context.cwd).catch(() => context.cwd),
  };
  const initialPaths = resolveGateActivityPaths(resolvedContext);
  if (initialPaths.length === 0) return null;

  const baseline = await snapshotPaths(initialPaths);
  const scope = context.runtime === 'codex' ? 'ambient-runtime' : 'project-dir';

  const observe = async (
    observedAt = Date.now(),
  ): Promise<GateActivityProbeStatus> => {
    const paths = resolveGateActivityPaths(resolvedContext, observedAt);
    const current = await snapshotPaths(paths);
    const attemptedPath = paths.join(',');
    if (current.status !== 'available' || !current.snapshot) {
      return {
        status: current.status,
        runtime: context.runtime,
        scope,
        attemptedPath,
        observedAt,
      };
    }
    const evidence: GateActivityEvidence = {
      source: 'transcript-dir',
      runtime: context.runtime,
      scope,
      observedPath: attemptedPath,
      lastChangeAt: current.snapshot.lastChangeAt,
      totalSizeBytes: current.snapshot.totalSizeBytes,
      changedSinceBaseline:
        baseline.status !== 'available' ||
        !baseline.snapshot ||
        current.snapshot.lastChangeAt !== baseline.snapshot.lastChangeAt ||
        current.snapshot.totalSizeBytes !== baseline.snapshot.totalSizeBytes,
      observedAt,
    };
    return {
      status: 'available',
      runtime: context.runtime,
      scope,
      attemptedPath,
      observedAt,
      evidence,
    };
  };

  return {
    runtime: context.runtime as GateActivityProbe['runtime'],
    observe,
    async probe(observedAt = Date.now()) {
      return (await observe(observedAt)).evidence ?? null;
    },
  };
}
