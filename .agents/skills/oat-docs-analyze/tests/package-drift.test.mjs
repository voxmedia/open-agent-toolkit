import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  chmod,
  mkdtemp,
  mkdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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
    // Only drift proposes an upgrade; a current package needs none.
    assert.equal(result.packages[1].upgradeCommand, null);
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

// Shim fixture derived from a captured pnpm 12.11 global install (global/v11
// layout): the POSIX `sh` wrapper body, its `exec` lines and trailing
// `# cmd-shim-target=` comment are verbatim apart from the store hash and the
// absolute install prefix. The package directory is a symlink into the store,
// as in the real install.
const STORE_HASH = 'c7e802ae';
function pnpmShim(prefix, { targetComment }) {
  const rel = `../global/v11/${STORE_HASH}/node_modules/@open-agent-toolkit/cli/dist/index.js`;
  const lines = [
    '#!/bin/sh',
    "# Resolve $0 through symlinks so basedir is the shim's real directory.",
    'link="$0"',
    'hops=0',
    'while [ -L "$link" ] && [ "$hops" -lt 40 ]; do',
    '  hops=$((hops+1))',
    '  target=$(readlink "$link")',
    '  case "$target" in',
    '    /*) link="$target" ;;',
    '    *)  link="$(dirname "$link")/$target" ;;',
    '  esac',
    'done',
    'basedir=$(dirname "$(echo "$link" | sed -e \'s,\\\\,/,g\')")',
    'basedir_win="$basedir"',
    ': > "$basedir/EXECUTED"',
    'exe=""',
    'if [ -n "$exe" ] && [ -x "$basedir/node.exe" ]; then',
    `  exec "$basedir/node.exe"  "$basedir_win/${rel}" "$@"`,
    'elif [ -x "$basedir/node" ]; then',
    `  exec "$basedir/node"  "$basedir/${rel}" "$@"`,
    'else',
    `  exec node  "$basedir/${rel}" "$@"`,
    'fi',
  ];
  if (targetComment)
    lines.push(
      `# cmd-shim-target=${prefix}/global/v11/${STORE_HASH}/node_modules/@open-agent-toolkit/cli/dist/index.js`,
    );
  return `${lines.join('\n')}\n`;
}

async function pnpmGlobalInstall(root, { targetComment }) {
  const prefix = join(root, 'pnpm home');
  const store = join(
    prefix,
    'store/v11/links/@open-agent-toolkit/cli/0.3.31/abc/node_modules/@open-agent-toolkit/cli',
  );
  await mkdir(join(store, 'dist'), { recursive: true });
  await mkdir(join(store, 'assets'), { recursive: true });
  await writeFile(
    join(store, 'package.json'),
    JSON.stringify({ name: '@open-agent-toolkit/cli', version: '0.3.31' }),
  );
  await writeFile(join(store, 'dist/index.js'), '#!/usr/bin/env node\n');
  await writeFile(
    join(store, 'assets/public-package-versions.json'),
    JSON.stringify({ 'docs-config': '0.3.31' }),
  );
  const scope = join(
    prefix,
    `global/v11/${STORE_HASH}/node_modules/@open-agent-toolkit`,
  );
  await mkdir(scope, { recursive: true });
  await symlink(store, join(scope, 'cli'));
  // With the absolute target comment, place the shim where its relative exec
  // lines cannot resolve, so only the comment can locate the bundle.
  const bin = targetComment ? join(root, 'relocated bin') : join(prefix, 'bin');
  await mkdir(bin, { recursive: true });
  const shim = join(bin, 'oat');
  await writeFile(shim, pnpmShim(prefix, { targetComment }));
  await chmod(shim, 0o755);
  return { shim, store };
}

test('--cli follows a pnpm global shell shim to the installed CLI bundle without executing it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-drift-shim-'));
  try {
    const app = join(root, 'app');
    await mkdir(app);
    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({
        dependencies: { '@open-agent-toolkit/docs-config': '^0.3.30' },
      }),
    );
    for (const targetComment of [true, false]) {
      const base = join(root, targetComment ? 'with-comment' : 'exec-only');
      await mkdir(base);
      const { shim, store } = await pnpmGlobalInstall(base, { targetComment });
      const result = JSON.parse(
        execFileSync(
          process.execPath,
          [
            new URL('../scripts/package-drift.mjs', import.meta.url).pathname,
            '--app',
            app,
            '--cli',
            shim,
          ],
          { encoding: 'utf8' },
        ),
      );
      assert.equal(
        result.versionsPath,
        join(await realpath(store), 'assets/public-package-versions.json'),
        `targetComment=${targetComment}`,
      );
      assert.equal(result.packages[0].bundled, '0.3.31');
      // The fixture shim leaves a marker if any line of it ever runs.
      assert.equal(existsSync(join(dirname(shim), 'EXECUTED')), false);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('--cli keeps resolving a direct install whose executable is the bundle entry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-drift-direct-'));
  try {
    const { store } = await pnpmGlobalInstall(root, { targetComment: true });
    const bin = join(root, 'npm-bin-oat');
    await symlink(join(store, 'dist/index.js'), bin);
    const app = join(root, 'app');
    await mkdir(app);
    await writeFile(join(app, 'package.json'), JSON.stringify({}));
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [
          new URL('../scripts/package-drift.mjs', import.meta.url).pathname,
          '--app',
          app,
          '--cli',
          bin,
        ],
        { encoding: 'utf8' },
      ),
    );
    assert.equal(
      result.versionsPath,
      join(await realpath(store), 'assets/public-package-versions.json'),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// The app-local CLI regenerates index.md in predev/prebuild, so a stale local
// CLI silently diverges from the running one; it needs the same drift oracle.
test('drift covers an app-declared @open-agent-toolkit/cli in its own dependency section', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-drift-cli-'));
  try {
    const versions = join(root, 'public-package-versions.json');
    await writeFile(
      versions,
      JSON.stringify({ cli: '0.3.31', 'docs-config': '0.3.31' }),
    );
    const run = (app) =>
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
      ).packages.map(
        ({ name, section, installed, status, upgradeCommand }) => ({
          name,
          section,
          installed,
          status,
          upgradeCommand,
        }),
      );
    for (const [section, flag, installed, status] of [
      ['devDependencies', ' --save-dev', '0.3.25', 'drift'],
      ['dependencies', null, '0.3.31', 'current'],
      ['devDependencies', null, '0.3.32', 'ahead'],
    ]) {
      const app = join(root, `${section}-${installed}`);
      const dir = join(app, 'node_modules/@open-agent-toolkit/cli');
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(app, 'package.json'),
        JSON.stringify({
          [section]: { '@open-agent-toolkit/cli': '^0.3.25' },
        }),
      );
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ version: installed }),
      );
      assert.deepEqual(run(app), [
        {
          name: '@open-agent-toolkit/cli',
          section,
          installed,
          status,
          upgradeCommand:
            flag === null
              ? null
              : `pnpm --dir '${app}' add${flag} @open-agent-toolkit/cli@0.3.31`,
        },
      ]);
    }
    // An app that does not declare the CLI gets no CLI row.
    const bare = join(root, 'bare');
    await mkdir(bare);
    await writeFile(join(bare, 'package.json'), JSON.stringify({}));
    assert.deepEqual(run(bare), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// Layouts captured from consumer repositories: a pnpm node-linker=hoisted
// workspace (packages only in the root node_modules), a standalone nested app
// with its own lockfile below a root workspace, and a Markdown docs directory
// with no package.json.
test('drift resolves hoisted installs, pins the declared package manager and explains unverified results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-drift-layout-'));
  const script = new URL('../scripts/package-drift.mjs', import.meta.url)
    .pathname;
  try {
    const versions = join(root, 'public-package-versions.json');
    await writeFile(
      versions,
      JSON.stringify({ cli: '0.3.32', 'docs-config': '0.3.32' }),
    );
    const run = (app) =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [script, '--app', app, '--versions', versions],
          { encoding: 'utf8' },
        ),
      );
    const workspace = join(root, 'repo');
    await mkdir(join(workspace, 'apps/docs'), { recursive: true });
    await writeFile(
      join(workspace, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@10.13.1+sha512.0123abcd' }),
    );
    await writeFile(
      join(workspace, 'pnpm-workspace.yaml'),
      'packages:\n  - apps/*\n',
    );
    const hoisted = join(workspace, 'apps/docs');
    await writeFile(
      join(hoisted, 'package.json'),
      JSON.stringify({
        dependencies: { '@open-agent-toolkit/docs-config': '^0.1.1' },
        devDependencies: { '@open-agent-toolkit/cli': '^0.3.26' },
      }),
    );
    const hoistedPackage = join(
      workspace,
      'node_modules/@open-agent-toolkit/docs-config',
    );
    await mkdir(hoistedPackage, { recursive: true });
    await writeFile(
      join(hoistedPackage, 'package.json'),
      JSON.stringify({ version: '0.1.1' }),
    );
    assert.deepEqual(
      run(hoisted).packages.map(
        ({
          name,
          installed,
          installedPath,
          status,
          reason,
          upgradeCommand,
        }) => ({
          name,
          installed,
          installedPath,
          status,
          reason,
          upgradeCommand,
        }),
      ),
      [
        {
          name: '@open-agent-toolkit/docs-config',
          installed: '0.1.1',
          installedPath: join(hoistedPackage, 'package.json'),
          status: 'drift',
          reason: null,
          upgradeCommand: `npx --yes pnpm@10.13.1 --dir '${hoisted}' add @open-agent-toolkit/docs-config@0.3.32`,
        },
        {
          name: '@open-agent-toolkit/cli',
          installed: null,
          installedPath: null,
          status: 'unverified',
          reason:
            'not installed: no node_modules/@open-agent-toolkit/cli found from the app or its ancestors; run the app install first',
          upgradeCommand: null,
        },
      ],
    );

    // A workspace member keeps the workspace even with its own lockfile
    // (shared-workspace-lockfile=false), so workspace:* deps still resolve.
    await writeFile(
      join(hoisted, 'pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\n",
    );
    assert.equal(
      run(hoisted).packages[0].upgradeCommand,
      `npx --yes pnpm@10.13.1 --dir '${hoisted}' add @open-agent-toolkit/docs-config@0.3.32`,
    );

    // A nested app outside the root workspace's packages patterns is standalone.
    const standalone = join(workspace, 'site');
    const local = join(standalone, 'node_modules/@open-agent-toolkit/cli');
    await mkdir(local, { recursive: true });
    await writeFile(
      join(standalone, 'pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\n",
    );
    await writeFile(
      join(standalone, 'package.json'),
      JSON.stringify({
        devDependencies: { '@open-agent-toolkit/cli': '^0.3.26' },
      }),
    );
    await writeFile(
      join(local, 'package.json'),
      JSON.stringify({ version: '0.3.26' }),
    );
    assert.equal(
      run(standalone).packages[0].upgradeCommand,
      `npx --yes pnpm@10.13.1 --dir '${standalone}' add --ignore-workspace --save-dev @open-agent-toolkit/cli@0.3.32`,
    );

    // Another package manager gets no pnpm command, only a reason.
    await writeFile(
      join(standalone, 'package.json'),
      JSON.stringify({
        packageManager: 'npm@10.9.0',
        devDependencies: { '@open-agent-toolkit/cli': '^0.3.26' },
      }),
    );
    const npmRow = run(standalone).packages[0];
    assert.equal(npmRow.status, 'drift');
    assert.equal(npmRow.upgradeCommand, null);
    assert.equal(
      npmRow.reason,
      'packageManager is npm@10.9.0; translate the upgrade to its add command, preserving the dependency section and exact version',
    );

    // A Markdown docs directory has no app package to compare.
    const markdown = join(root, 'markdown-docs');
    await mkdir(markdown);
    assert.deepEqual(run(markdown), {
      versionsPath: null,
      appPath: markdown,
      applicable: false,
      reason:
        'No package.json in the docs directory: Markdown docs have no app-package drift check.',
      packages: [],
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
