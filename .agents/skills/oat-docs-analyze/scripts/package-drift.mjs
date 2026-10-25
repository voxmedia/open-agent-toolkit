#!/usr/bin/env node
// Read-only, offline comparison used by oat-docs-analyze. No package resolution or install.
import { open, readFile, realpath } from 'node:fs/promises';
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

try {
  const { values } = parseArgs({
    options: {
      app: { type: 'string' },
      versions: { type: 'string' },
      cli: { type: 'string' },
    },
  });
  if (!values.app) throw new Error('Required: --app <docs-app-directory>.');
  const versionsPath = resolve(
    values.versions ?? (await versionsForCli(values.cli)),
  );
  const versions = JSON.parse(await readFile(versionsPath, 'utf8'));
  const appPath = resolve(values.app);
  const manifest = JSON.parse(
    await readFile(join(appPath, 'package.json'), 'utf8'),
  );
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
      let installed = null;
      try {
        const installedManifest = JSON.parse(
          await readFile(
            join(appPath, 'node_modules', name, 'package.json'),
            'utf8',
          ),
        );
        if (typeof installedManifest.version !== 'string')
          throw new Error(`Invalid installed version for ${name}.`);
        installed = installedManifest.version;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      // Only stable numeric releases are orderable here; prereleases and other
      // package-manager version forms need manual verification, never an upgrade.
      const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
      let status = 'unverified';
      if (
        installed !== null &&
        stable.test(installed) &&
        stable.test(bundled)
      ) {
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
      packages.push({
        name,
        section,
        declared,
        installed,
        bundled,
        status,
        upgradeCommand:
          status === 'drift' || status === 'current'
            ? `pnpm --dir ${shellQuote(appPath)} add${section === 'devDependencies' ? ' --save-dev' : section === 'optionalDependencies' ? ' --save-optional' : ''} ${name}@${bundled}`
            : null,
      });
    }
  }
  process.stdout.write(
    `${JSON.stringify({ versionsPath, appPath, packages }, null, 2)}\n`,
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
