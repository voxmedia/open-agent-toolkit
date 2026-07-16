import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
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

interface MetadataSnapshot {
  lastChangeAt: number;
  totalSizeBytes: number;
}

export interface GateActivityProbe {
  runtime: 'claude' | 'codex' | 'cursor';
  probe(observedAt?: number): Promise<GateActivityEvidence | null>;
}

export interface GateActivityProbeContext {
  runtime: string;
  cwd: string;
  home: string;
  spawnedAt: number;
}

export function encodeClaudeProjectPath(cwd: string): string {
  return cwd.replace(/[/.]/gu, '-');
}

export function encodeCursorProjectPath(cwd: string): string {
  return cwd.split(/[/.]/u).filter(Boolean).join('-');
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
  if (context.runtime === 'claude') {
    return [
      join(
        context.home,
        '.claude',
        'projects',
        encodeClaudeProjectPath(context.cwd),
      ),
    ];
  }
  if (context.runtime === 'cursor') {
    return [
      join(
        context.home,
        '.cursor',
        'projects',
        encodeCursorProjectPath(context.cwd),
        'agent-transcripts',
      ),
    ];
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

async function snapshotPaths(
  paths: string[],
): Promise<MetadataSnapshot | null> {
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
        return null;
      }
    }
  } catch {
    return null;
  }

  return found ? { lastChangeAt, totalSizeBytes } : null;
}

export async function createGateActivityProbe(
  context: GateActivityProbeContext,
): Promise<GateActivityProbe | null> {
  const initialPaths = resolveGateActivityPaths(context);
  if (initialPaths.length === 0) return null;

  const baseline = await snapshotPaths(initialPaths);
  const scope = context.runtime === 'codex' ? 'ambient-runtime' : 'project-dir';

  return {
    runtime: context.runtime as GateActivityProbe['runtime'],
    async probe(observedAt = Date.now()) {
      const paths = resolveGateActivityPaths(context, observedAt);
      const current = await snapshotPaths(paths);
      if (!current) return null;

      return {
        source: 'transcript-dir',
        runtime: context.runtime,
        scope,
        observedPath: paths.join(','),
        lastChangeAt: current.lastChangeAt,
        totalSizeBytes: current.totalSizeBytes,
        changedSinceBaseline:
          baseline === null ||
          current.lastChangeAt !== baseline.lastChangeAt ||
          current.totalSizeBytes !== baseline.totalSizeBytes,
        observedAt,
      };
    },
  };
}
