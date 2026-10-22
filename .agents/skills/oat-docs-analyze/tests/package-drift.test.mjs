import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Protect the actual offline skill-helper boundary: installed bytes can disagree
// with the dependency range; missing installations must never look current.
test('offline drift uses installed docs packages and bundled versions, with exact scoped commands', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-drift-'));
  try {
    const app = join(root, 'docs app');
    await mkdir(app);
    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@open-agent-toolkit/docs-config': '^0.3.24',
          next: '16',
        },
        devDependencies: { '@open-agent-toolkit/docs-theme': '^0.3.24' },
        optionalDependencies: {
          '@open-agent-toolkit/docs-transforms': '^0.3.24',
        },
      }),
    );
    for (const [name, version] of [
      ['docs-config', '0.3.20'],
      ['docs-theme', '0.3.25'],
    ]) {
      const dir = join(app, 'node_modules/@open-agent-toolkit', name);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'package.json'), JSON.stringify({ version }));
    }
    const versions = join(root, 'public-package-versions.json');
    await writeFile(
      versions,
      JSON.stringify({
        'docs-config': '0.3.25',
        'docs-theme': '0.3.25',
        'docs-transforms': '0.3.25',
      }),
    );
    const run = () =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [
            new URL('../scripts/package-drift.mjs', import.meta.url).pathname,
            '--app',
            app,
            '--versions',
            versions,
          ],
          { encoding: 'utf8' },
        ),
      );
    const result = run();
    assert.deepEqual(
      result.packages.map(({ name, installed, status }) => ({
        name,
        installed,
        status,
      })),
      [
        {
          name: '@open-agent-toolkit/docs-config',
          installed: '0.3.20',
          status: 'drift',
        },
        {
          name: '@open-agent-toolkit/docs-theme',
          installed: '0.3.25',
          status: 'current',
        },
        {
          name: '@open-agent-toolkit/docs-transforms',
          installed: null,
          status: 'unverified',
        },
      ],
    );
    assert.equal(
      result.packages[0].upgradeCommand,
      `pnpm --dir '${app}' add @open-agent-toolkit/docs-config@0.3.25`,
    );
    assert.equal(
      result.packages[1].upgradeCommand,
      `pnpm --dir '${app}' add --save-dev @open-agent-toolkit/docs-theme@0.3.25`,
    );
    await writeFile(
      join(app, 'node_modules/@open-agent-toolkit/docs-config/package.json'),
      JSON.stringify({ version: '0.3.25' }),
    );
    assert.equal(run().packages[0].status, 'current');
    // Literal order/status oracles protect against stale CLIs proposing downgrades.
    for (const [version, status, command] of [
      ['0.3.26', 'ahead', null],
      [
        '0.3.9',
        'drift',
        `pnpm --dir '${app}' add @open-agent-toolkit/docs-config@0.3.25`,
      ],
      ['0.10.0', 'ahead', null],
      ['0.3.25-rc.1', 'unverified', null],
      ['workspace:*', 'unverified', null],
    ]) {
      await writeFile(
        join(app, 'node_modules/@open-agent-toolkit/docs-config/package.json'),
        JSON.stringify({ version }),
      );
      const actual = run().packages[0];
      assert.equal(actual.status, status, version);
      assert.equal(actual.upgradeCommand, command, version);
    }
    await writeFile(
      versions,
      JSON.stringify({
        'docs-config': '0.4.0-rc.1',
        'docs-theme': '0.3.25',
        'docs-transforms': '0.3.25',
      }),
    );
    assert.equal(result.packages[2].upgradeCommand, null);
    const prereleaseTarget = run().packages[0];
    assert.equal(prereleaseTarget.status, 'unverified');
    assert.equal(prereleaseTarget.upgradeCommand, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
