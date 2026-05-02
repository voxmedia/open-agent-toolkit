/**
 * Visual-companion server smoke test.
 *
 * Spawns the bundled `start-server.sh`, polls for `state_dir/server-info`,
 * confirms the URL responds, then stops the server cleanly via
 * `stop-server.sh`. Exercises the lifted-from-Superpowers Node server
 * + bash launcher as a single end-to-end check.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const SCRIPTS_DIR = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  '.agents',
  'skills',
  'oat-brainstorm',
  'scripts',
);

const tempDirs: string[] = [];

async function makeTempProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-brainstorm-smoke-'));
  tempDirs.push(dir);
  return dir;
}

interface ServerInfo {
  type: string;
  url: string;
  port: number;
  screen_dir: string;
  state_dir: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer(projectDir: string): Promise<{
  info: ServerInfo;
  rawJson: string;
}> {
  return await new Promise((resolve, reject) => {
    let stdout = '';
    const child = spawn(
      'bash',
      [join(SCRIPTS_DIR, 'start-server.sh'), '--project-dir', projectDir],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', () => {
      const line = stdout.trim().split('\n').filter(Boolean).pop();
      if (!line) {
        reject(new Error(`start-server.sh produced no output: ${stdout}`));
        return;
      }
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        if (parsed.type !== 'server-started') {
          reject(
            new Error(
              `start-server.sh did not report server-started: ${line}`,
            ),
          );
          return;
        }
        resolve({ info: parsed as unknown as ServerInfo, rawJson: line });
      } catch (err) {
        reject(
          new Error(
            `start-server.sh output not JSON-parsable: ${line} (${(err as Error).message})`,
          ),
        );
      }
    });
  });
}

async function stopServer(sessionDir: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'bash',
      [join(SCRIPTS_DIR, 'stop-server.sh'), sessionDir],
      { stdio: 'ignore' },
    );
    child.on('error', reject);
    child.on('close', () => resolve());
  });
}

describe('visual-companion server smoke test', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('starts the visual-companion server, serves the root URL, and stops cleanly', async () => {
    const projectDir = await makeTempProjectDir();

    const { info } = await startServer(projectDir);

    try {
      expect(info.url).toMatch(/^http:\/\//);
      expect(info.state_dir).toContain('brainstorm');
      expect(existsSync(join(info.state_dir, 'server-info'))).toBe(true);

      // Hit the root URL and confirm the server responds.
      const response = await fetch(info.url);
      expect(response.status).toBe(200);
      const body = await response.text();
      // The frame template wraps content with the visual-companion CSS theme.
      // An empty session shows a placeholder until content is pushed; just
      // assert the response includes recognizable HTML.
      expect(body.toLowerCase()).toMatch(/<html|<!doctype/);
    } finally {
      // Session dir is two levels above state_dir (state_dir = $SESSION/state).
      const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }

    // Give the server a moment to actually shut down. We don't strictly
    // require the server-stopped marker (server.cjs writes it on graceful
    // SIGTERM, but stop-server.sh may escalate to SIGKILL), so instead
    // assert the URL no longer responds.
    await sleep(500);
    let urlStillResponds = true;
    try {
      const followUp = await fetch(info.url, {
        signal: AbortSignal.timeout(1000),
      });
      // A live response means server didn't stop.
      urlStillResponds = followUp.status > 0;
    } catch {
      urlStillResponds = false;
    }
    expect(urlStillResponds).toBe(false);
  }, 30_000);

  it('writes server-info JSON containing state_dir and screen_dir', async () => {
    const projectDir = await makeTempProjectDir();

    const { info } = await startServer(projectDir);

    try {
      const serverInfoPath = join(info.state_dir, 'server-info');
      const parsed = JSON.parse(readFileSync(serverInfoPath, 'utf8')) as {
        screen_dir: string;
        state_dir: string;
      };
      expect(parsed.screen_dir).toBe(info.screen_dir);
      expect(parsed.state_dir).toBe(info.state_dir);
    } finally {
      const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }
  }, 30_000);
});
