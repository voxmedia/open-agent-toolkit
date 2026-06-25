import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = join(
  import.meta.dirname,
  '../../../../../../../.oat/scripts/resolve-tracking.sh',
);

const tempDirs: string[] = [];

function git(root: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function runTracking(root: string, args: string[]): string {
  return execFileSync('bash', [SCRIPT_PATH, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function createGitRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'oat-tracking-script-'));
  tempDirs.push(root);
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'oat@example.test']);
  git(root, ['config', 'user.name', 'OAT Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'README.md'), '# test\n', 'utf8');
  git(root, ['add', 'README.md']);
  git(root, ['commit', '-m', 'initial', '--quiet']);
  return root;
}

function trackingPath(root: string): string {
  return join(root, '.oat', 'tracking.json');
}

function readTracking(root: string): Record<string, unknown> {
  return JSON.parse(readFileSync(trackingPath(root), 'utf8')) as Record<
    string,
    unknown
  >;
}

function writeTracking(root: string, value: Record<string, unknown>): void {
  mkdirSync(join(root, '.oat'), { recursive: true });
  writeFileSync(trackingPath(root), `${JSON.stringify(value, null, 2)}\n`);
}

function rootTarget(root: string): { hash: string; branch: string } {
  return {
    hash: git(root, ['rev-parse', 'HEAD']),
    branch: git(root, ['branch', '--show-current']),
  };
}

describe('resolve-tracking.sh', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each(['agentInstructions', 'agentInstructionsApply'] as const)(
    'repairs stale %s entries that point at missing analysis artifacts',
    (operation) => {
      const root = createGitRepo();
      writeTracking(root, {
        version: 1,
        [operation]: {
          lastRunAt: '2026-06-24T20:00:00Z',
          commitHash: 'abc123',
          baseBranch: 'main',
          mode: 'full',
          formats: ['agents_md'],
          artifactPath:
            '.oat/repo/analysis/agent-instructions-2026-04-28-0407.md',
        },
      });

      const output = runTracking(root, ['read', operation]);

      expect(output.trim()).toBe('{}');
      expect(readTracking(root)).not.toHaveProperty(operation);
    },
  );

  it('does not write agentInstructions when the analysis artifact is present but untracked', () => {
    const root = createGitRepo();
    const { hash, branch } = rootTarget(root);
    const artifactPath =
      '.oat/repo/analysis/agent-instructions-2026-04-28-0407.md';
    mkdirSync(join(root, '.oat', 'repo', 'analysis'), { recursive: true });
    writeFileSync(join(root, artifactPath), '# analysis\n', 'utf8');
    writeTracking(root, {
      version: 1,
      agentInstructions: {
        lastRunAt: '2026-06-24T20:00:00Z',
        commitHash: hash,
        baseBranch: branch,
        mode: 'full',
        formats: ['agents_md'],
        artifactPath,
      },
    });

    runTracking(root, [
      'write',
      'agentInstructions',
      hash,
      branch,
      'full',
      '--artifact-path',
      artifactPath,
      'agents_md',
    ]);

    expect(readTracking(root)).not.toHaveProperty('agentInstructions');
  });

  it('writes agentInstructions when the analysis artifact is tracked', () => {
    const root = createGitRepo();
    const artifactPath =
      '.oat/repo/analysis/agent-instructions-2026-04-28-0407.md';
    mkdirSync(join(root, '.oat', 'repo', 'analysis'), { recursive: true });
    writeFileSync(join(root, artifactPath), '# analysis\n', 'utf8');
    git(root, ['add', artifactPath]);
    git(root, ['commit', '-m', 'add analysis artifact', '--quiet']);
    const { hash, branch } = rootTarget(root);

    runTracking(root, [
      'write',
      'agentInstructions',
      hash,
      branch,
      'full',
      '--artifact-path',
      artifactPath,
      'agents_md',
    ]);

    expect(readTracking(root)).toMatchObject({
      agentInstructions: {
        commitHash: hash,
        baseBranch: branch,
        mode: 'full',
        formats: ['agents_md'],
        artifactPath,
      },
    });
  });
});
