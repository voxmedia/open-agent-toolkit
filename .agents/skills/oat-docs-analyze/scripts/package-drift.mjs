#!/usr/bin/env node
// Read-only, offline comparison used by oat-docs-analyze. It reads installed
// package manifests the way Node resolves packages (the app's node_modules,
// then each ancestor's) and never installs, fetches or executes anything.
import { access, open, readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const shellQuote = (value) =>
  `'${value.replaceAll("'", String.fromCharCode(39, 92, 39, 39))}'`;

// Walk up from a real file to the installed CLI package root.
async function cliPackageFor(file) {
  let directory = dirname(file);
  for (;;) {
    try {
      const pkg = JSON.parse(
        await readFile(join(directory, 'package.json'), 'utf8'),
      );
      if (pkg.name === '@open-agent-toolkit/cli')
        return join(directory, 'assets/public-package-versions.json');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

// Package-manager shims (pnpm, cmd-shim) are POSIX shell scripts. Parse them as
// text and never execute them: the `# cmd-shim-target=` comment names the
// absolute entry; `exec` lines name it relative to the shim's real directory.
async function shimTargets(file) {
  const handle = await open(file, 'r');
  let text;
  try {
    const { size } = await handle.stat();
    if (size > 65536) return [];
    text = await handle.readFile('utf8');
  } finally {
    await handle.close();
  }
  const [shebang = ''] = text.split(/\r?\n/, 1);
  if (!/^#!.*\b(?:sh|bash|dash|ksh|zsh)\b/.test(shebang)) return [];
  const base = dirname(file);
  const targets = [];
  for (const match of text.matchAll(/^#\s*cmd-shim-target=(.+?)\s*$/gm))
    targets.push(isAbsolute(match[1]) ? match[1] : resolve(base, match[1]));
  for (const match of text.matchAll(/"\$basedir\/([^"$`\\]+\.(?:c|m)?js)"/g))
    targets.push(resolve(base, match[1]));
  return [...new Set(targets)];
}

async function versionsForCli(executable) {
  if (!executable)
    throw new Error(
      'Provide --cli with the installed oat executable or --versions with its bundled public-package-versions.json.',
    );
  const file = await realpath(executable);
  const targets = await shimTargets(file);
  // Direct installs resolve to the bundle entry itself; shims are never walked
  // from their own location, which can sit above an unrelated package.
  for (const target of targets.length > 0 ? targets : [file]) {
    let entry;
    try {
      entry = await realpath(target);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue;
      throw error;
    }
    const found = await cliPackageFor(entry);
    if (found) return found;
  }
  throw new Error(
    'Cannot locate the running CLI bundle through this wrapper; supply --versions from that installed CLI.',
  );
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function ancestors(directory) {
  const list = [];
  for (let current = directory; ; current = dirname(current)) {
    list.push(current);
    if (dirname(current) === current) return list;
  }
}

// Node package lookup: <dir>/node_modules/<name> from the app upward, so
// hoisted installs (pnpm node-linker=hoisted, npm/yarn workspaces) resolve.
async function installedManifest(appPath, name) {
  for (const directory of ancestors(appPath)) {
    const path = join(directory, 'node_modules', name, 'package.json');
    const manifest = await readJson(path);
    if (manifest !== null) return { path, manifest };
  }
  return null;
}

// The app's own packageManager wins, then the nearest ancestor's.
async function packageManagerFor(appPath) {
  for (const directory of ancestors(appPath)) {
    const manifest = await readJson(join(directory, 'package.json'));
    if (typeof manifest?.packageManager === 'string')
      return manifest.packageManager.trim();
  }
  return null;
}

// A nested app with its own lockfile and no workspace file of its own, below
// an ancestor pnpm workspace, must not be installed through that workspace.
async function isStandaloneNestedApp(appPath) {
  if (!(await exists(join(appPath, 'pnpm-lock.yaml')))) return false;
  if (await exists(join(appPath, 'pnpm-workspace.yaml'))) return false;
  for (const directory of ancestors(dirname(appPath)))
    if (await exists(join(directory, 'pnpm-workspace.yaml'))) return true;
  return false;
}

try {
  const { values } = parseArgs({
    options: {
      app: { type: 'string' },
      versions: { type: 'string' },
      cli: { type: 'string' },
    },
  });
  if (!values.app) throw new Error('Required: --app <docs-app-directory>.');
  const appPath = resolve(values.app);
  const manifest = await readJson(join(appPath, 'package.json'));
  if (manifest === null) {
    process.stdout.write(
      `${JSON.stringify(
        {
          versionsPath: null,
          appPath,
          applicable: false,
          reason:
            'No package.json in the docs directory: Markdown docs have no app-package drift check.',
          packages: [],
        },
        null,
        2,
      )}\n`,
    );
    process.exit(0);
  }
  const versionsPath = resolve(
    values.versions ?? (await versionsForCli(values.cli)),
  );
  const versions = JSON.parse(await readFile(versionsPath, 'utf8'));
  const packageManager = await packageManagerFor(appPath);
  const pinned = packageManager?.match(
    /^pnpm@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:\+.*)?$/,
  );
  // Run the repository's pinned pnpm rather than whatever global pnpm is on
  // PATH: a different major can rewrite workspace settings or reject the store.
  // npx ships with npm on every Node line; Corepack is absent from Node 25+.
  const pnpm = pinned ? `npx --yes pnpm@${pinned[1]}` : 'pnpm';
  const otherManager =
    packageManager && !packageManager.startsWith('pnpm@')
      ? packageManager
      : null;
  const ignoreWorkspace = (await isStandaloneNestedApp(appPath))
    ? ' --ignore-workspace'
    : '';
  const packages = [];
  for (const section of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
  ]) {
    for (const [name, declared] of Object.entries(manifest[section] ?? {})) {
      if (
        ![
          // The app-local CLI runs generate-index in predev/prebuild.
          '@open-agent-toolkit/cli',
          '@open-agent-toolkit/docs-config',
          '@open-agent-toolkit/docs-theme',
          '@open-agent-toolkit/docs-transforms',
        ].includes(name)
      )
        continue;
      const bundled = versions[name.slice('@open-agent-toolkit/'.length)];
      if (
        typeof bundled !== 'string' ||
        !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(bundled)
      )
        throw new Error(`Missing/invalid bundled version for ${name}.`);
      // Report installed package bytes when available, not just a declared range.
      const found = await installedManifest(appPath, name);
      if (found !== null && typeof found.manifest.version !== 'string')
        throw new Error(`Invalid installed version for ${name}.`);
      const installed = found?.manifest.version ?? null;
      // Only stable numeric releases are orderable here; prereleases and other
      // package-manager version forms need manual verification, never an upgrade.
      const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
      let status = 'unverified';
      let reason = null;
      if (installed === null)
        reason = `not installed: no node_modules/${name} found from the app or its ancestors; run the app install first`;
      else if (!stable.test(installed))
        reason = `installed version ${installed} is not a stable release; verify it manually`;
      else if (!stable.test(bundled))
        reason = `bundled version ${bundled} is a prerelease; verify it manually`;
      else {
        const left = installed.split('.').map(BigInt);
        const right = bundled.split('.').map(BigInt);
        const differing = left.findIndex(
          (part, index) => part !== right[index],
        );
        status =
          differing === -1
            ? 'current'
            : left[differing] < right[differing]
              ? 'drift'
              : 'ahead';
      }
      let upgradeCommand = null;
      if (status === 'drift' && otherManager)
        reason = `packageManager is ${otherManager}; translate the upgrade to its add command, preserving the dependency section and exact version`;
      else if (status === 'drift')
        upgradeCommand = `${pnpm} --dir ${shellQuote(appPath)} add${ignoreWorkspace}${section === 'devDependencies' ? ' --save-dev' : section === 'optionalDependencies' ? ' --save-optional' : ''} ${name}@${bundled}`;
      packages.push({
        name,
        section,
        declared,
        installed,
        installedPath: found?.path ?? null,
        bundled,
        status,
        reason,
        upgradeCommand,
      });
    }
  }
  process.stdout.write(
    `${JSON.stringify({ versionsPath, appPath, applicable: true, packageManager, packages }, null, 2)}\n`,
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
