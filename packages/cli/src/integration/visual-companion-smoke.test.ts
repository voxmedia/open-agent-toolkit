/**
 * Visual-companion server smoke test.
 *
 * Spawns the bundled `start-server.sh`, polls for `state_dir/server-info`,
 * confirms the URL responds, then stops the server cleanly via
 * `stop-server.sh`. Exercises the lifted-from-Superpowers Node server
 * + bash launcher as a single end-to-end check.
 *
 * Also covers OAT-side persistence-path resolution:
 *   - --project-dir override
 *   - walk-up detection of .oat/ in cwd ancestor chain
 *   - fallback to $HOME/.oat/brainstorm/
 */
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
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
  // Canonicalize to follow macOS /var → /private/var symlink so prefix
  // comparisons against the script's `pwd`-resolved cwd succeed.
  return realpathSync(dir);
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

interface StartOptions {
  projectDir?: string;
  cwd?: string;
  homeOverride?: string;
}

async function startServer(options: StartOptions = {}): Promise<{
  info: ServerInfo;
  rawJson: string;
}> {
  return await new Promise((resolve, reject) => {
    let stdout = '';
    const args = [join(SCRIPTS_DIR, 'start-server.sh')];
    if (options.projectDir) {
      args.push('--project-dir', options.projectDir);
    }
    // Scrub CODEX_CI from the spawned child env: start-server.sh auto-sets
    // FOREGROUND=true when CODEX_CI is present (intentional behavior for
    // real Codex usage), but the smoke harness resolves on the child's
    // `close` event — a foreground server never closes, so all 5 smoke
    // tests would time out under Codex CI. Removing CODEX_CI here keeps
    // the script's runtime behavior intact while letting the test harness
    // observe the normal background-launcher path.
    const { CODEX_CI: _codexCi, ...envWithoutCodexCi } = process.env;
    const env: NodeJS.ProcessEnv = { ...envWithoutCodexCi };
    if (options.homeOverride) {
      env.HOME = options.homeOverride;
    }
    const child = spawn('bash', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: options.cwd,
      env,
    });

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
            new Error(`start-server.sh did not report server-started: ${line}`),
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

interface StopServerResult {
  status: string;
  error?: string;
}

// Like stopServer(), but captures and parses stop-server.sh's JSON stdout so
// tests can assert on the reported status (e.g. "stale_pid") instead of only
// observing side effects.
async function runStopServer(sessionDir: string): Promise<StopServerResult> {
  return await new Promise((resolve, reject) => {
    let stdout = '';
    const child = spawn(
      'bash',
      [join(SCRIPTS_DIR, 'stop-server.sh'), sessionDir],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', () => {
      try {
        resolve(JSON.parse(stdout.trim()) as StopServerResult);
      } catch (err) {
        reject(
          new Error(
            `stop-server.sh output not JSON-parsable: ${stdout} (${(err as Error).message})`,
          ),
        );
      }
    });
  });
}

interface RawHttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

// Issues a GET with an explicit request-target (pathOverride), bypassing the
// WHATWG URL parser's dot-segment normalization that `fetch()`/`new URL()`
// would otherwise apply. This lets tests send a literal `/files/../x` or
// dotfile path to exercise server.cjs's own sandboxing logic rather than
// having the client silently rewrite the path before it is sent.
async function rawHttpGet(
  baseUrl: string,
  pathOverride: string,
): Promise<RawHttpResponse> {
  const target = new URL(baseUrl);
  return await new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: target.hostname,
        port: target.port,
        path: pathOverride,
        method: 'GET',
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8');
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body,
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function keyFromServerUrl(url: string): string {
  const key = new URL(url).searchParams.get('key');
  if (!key) {
    throw new Error(
      `expected server-started URL to include ?key=, got: ${url}`,
    );
  }
  return key;
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

    const { info } = await startServer({ projectDir });

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

    const { info } = await startServer({ projectDir });

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

describe('start-server.sh persistence-path resolution', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('respects --project-dir override (paths land under <project-dir>/.oat/brainstorm/)', async () => {
    const projectDir = await makeTempProjectDir();

    const { info } = await startServer({ projectDir });

    try {
      const expectedPrefix = join(projectDir, '.oat', 'brainstorm');
      expect(info.state_dir.startsWith(expectedPrefix)).toBe(true);
      expect(info.screen_dir.startsWith(expectedPrefix)).toBe(true);
    } finally {
      const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }
  }, 30_000);

  it('resolves to <repo-root>/.oat/brainstorm/ when invoked inside an OAT-initialized repo', async () => {
    // Build a repo-like directory: <root>/.oat exists. Run start-server from
    // a nested subdirectory and assert the script walks up to <root>.
    const repoRoot = await makeTempProjectDir();
    mkdirSync(join(repoRoot, '.oat'), { recursive: true });
    const nestedCwd = join(repoRoot, 'nested', 'work');
    mkdirSync(nestedCwd, { recursive: true });

    // Override HOME so the fallback path can be unambiguously distinguished
    // if the walk-up detection were to fail.
    const homeOverride = await makeTempProjectDir();

    const { info } = await startServer({
      cwd: nestedCwd,
      homeOverride,
    });

    try {
      const expectedPrefix = join(repoRoot, '.oat', 'brainstorm');
      expect(
        info.state_dir.startsWith(expectedPrefix),
        `expected ${info.state_dir} to start with ${expectedPrefix}`,
      ).toBe(true);
      expect(info.screen_dir.startsWith(expectedPrefix)).toBe(true);
      // Confirm the fallback was *not* chosen.
      expect(info.state_dir.startsWith(homeOverride)).toBe(false);
    } finally {
      const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }
  }, 30_000);

  it('falls back to $HOME/.oat/brainstorm/ when invoked outside an OAT repo', async () => {
    // Use a tmp directory with NO .oat/ ancestor. Override HOME so the
    // assertion is independent of the test runner's actual home.
    const isolatedCwd = await makeTempProjectDir();
    const homeOverride = await makeTempProjectDir();

    const { info } = await startServer({
      cwd: isolatedCwd,
      homeOverride,
    });

    try {
      const expectedPrefix = join(homeOverride, '.oat', 'brainstorm');
      expect(info.state_dir.startsWith(expectedPrefix)).toBe(true);
      expect(info.screen_dir.startsWith(expectedPrefix)).toBe(true);
    } finally {
      const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }
  }, 30_000);
});

describe('visual-companion server v6 security hardening', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('issues a session-keyed server-started URL and enforces auth + security headers on /', async () => {
    const projectDir = await makeTempProjectDir();
    const { info } = await startServer({ projectDir });
    const key = keyFromServerUrl(info.url);

    try {
      // server-started JSON must carry the session key on the URL so the
      // agent can hand a working link straight to the user.
      expect(new URL(info.url).searchParams.get('key')).toBe(key);

      // Unauthenticated root request: the shipped server rejects with 403
      // (not 401 — there is no WWW-Authenticate challenge, just a gate).
      const unauth = await rawHttpGet(info.url, '/');
      expect(unauth.status).toBe(403);
      expect(unauth.headers['cache-control']).toBe('no-store');
      expect(unauth.headers['x-frame-options']).toBe('DENY');

      // Authenticated request succeeds and still carries the same security
      // headers (they're applied uniformly via securityHeaders()).
      const auth = await rawHttpGet(info.url, `/?key=${key}`);
      expect(auth.status).toBe(200);
      expect(auth.headers['cache-control']).toBe('no-store');
      expect(auth.headers['x-frame-options']).toBe('DENY');
    } finally {
      const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }
  }, 30_000);

  it('sandboxes /files/ against path traversal and dotfile access', async () => {
    const projectDir = await makeTempProjectDir();
    const { info } = await startServer({ projectDir });
    const key = keyFromServerUrl(info.url);

    try {
      // http.request with an explicit `path` preserves the literal ".." —
      // unlike fetch()/new URL(), it does not collapse dot-segments before
      // the request is sent — so this exercises server.cjs's own
      // path.basename()-based sandboxing of /files/ rather than relying on
      // client-side URL normalization to do the job.
      const traversal = await rawHttpGet(
        info.url,
        `/files/../server.cjs?key=${key}`,
      );
      expect(traversal.status).toBeGreaterThanOrEqual(400);
      expect(traversal.status).toBeLessThan(500);

      const dotfile = await rawHttpGet(info.url, `/files/.hidden?key=${key}`);
      expect(dotfile.status).toBeGreaterThanOrEqual(400);
      expect(dotfile.status).toBeLessThan(500);
    } finally {
      const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }
  }, 30_000);

  it('sandboxes /files/ against symlink escape out of the content dir', async () => {
    const projectDir = await makeTempProjectDir();
    const { info } = await startServer({ projectDir });
    const key = keyFromServerUrl(info.url);

    // Fixture living outside the served content dir (screen_dir).
    const secretPath = join(projectDir, 'secret-outside-content-dir.txt');
    writeFileSync(secretPath, 'outside-content-dir\n');
    const symlinkPath = join(info.screen_dir, 'escape-link.html');

    try {
      // Real symlink-escape fixture: a symlink living *inside* the served
      // content dir that resolves to a file *outside* it. server.cjs's
      // isRegularFileInsideContentDir() rejects any lstat().isSymbolicLink()
      // before ever resolving the real path, so this is a genuine assertion
      // of the sandbox rejecting the escape (not merely a 404 for a missing
      // file) on the platform this suite runs on (macOS/Linux). If symlink
      // creation itself is unsupported in a given CI sandbox (e.g. Windows
      // without developer mode), fs.symlinkSync throws before the HTTP
      // assertion runs, which fails the test loudly rather than silently
      // skipping the security assertion.
      symlinkSync(secretPath, symlinkPath);

      const response = await rawHttpGet(
        info.url,
        `/files/escape-link.html?key=${key}`,
      );
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(response.body).not.toContain('outside-content-dir');
    } finally {
      const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }
  }, 30_000);
});

describe('visual-companion server v6 lifecycle', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('reuses the recorded port on restart with the same --project-dir (reads .last-port)', async () => {
    const projectDir = await makeTempProjectDir();
    const lastPortFile = join(projectDir, '.oat', 'brainstorm', '.last-port');

    const first = await startServer({ projectDir });
    try {
      expect(existsSync(lastPortFile)).toBe(true);
      expect(readFileSync(lastPortFile, 'utf8').trim()).toBe(
        String(first.info.port),
      );
    } finally {
      const sessionDir = first.info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }

    // Give the OS a moment to free the bound port before restarting, so the
    // second server actually reclaims it instead of falling back.
    await sleep(500);

    const second = await startServer({ projectDir });
    try {
      expect(second.info.port).toBe(first.info.port);
      expect(readFileSync(lastPortFile, 'utf8').trim()).toBe(
        String(second.info.port),
      );
    } finally {
      const sessionDir = second.info.state_dir.replace(/\/state\/?$/, '');
      await stopServer(sessionDir);
    }
  }, 30_000);

  it('stop-server.sh refuses to signal a process whose recorded server-instance-id no longer matches (fails closed)', async () => {
    const projectDir = await makeTempProjectDir();
    const { info } = await startServer({ projectDir });
    const sessionDir = info.state_dir.replace(/\/state\/?$/, '');
    const pidFile = join(info.state_dir, 'server.pid');
    const serverIdFile = join(info.state_dir, 'server-instance-id');
    const realPid = readFileSync(pidFile, 'utf8').trim();

    try {
      // Corrupt the recorded instance id so it no longer matches the running
      // process's --brainstorm-server-id argv. stop-server.sh must fail
      // closed rather than trust the pid file alone (guards against a stale
      // pid file pointing at an unrelated process after reuse/wraparound).
      writeFileSync(serverIdFile, '0'.repeat(40));

      const result = await runStopServer(sessionDir);
      expect(result.status).toBe('stale_pid');

      // The real server process must still be alive and serving — the guard
      // refused to signal it rather than killing an unverified pid.
      const stillUp = await rawHttpGet(
        info.url,
        `/?key=${keyFromServerUrl(info.url)}`,
      );
      expect(stillUp.status).toBe(200);
    } finally {
      // The guard intentionally left the real process running (and removed
      // the pid file), so stop-server.sh can no longer prove ownership after
      // the tampering above. Clean up the still-running process directly.
      try {
        process.kill(Number(realPid), 'SIGTERM');
      } catch {
        /* already gone */
      }
    }
  }, 30_000);
});
