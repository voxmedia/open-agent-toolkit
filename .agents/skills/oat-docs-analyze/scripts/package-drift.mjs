#!/usr/bin/env node
// Read-only, offline comparison used by oat-docs-analyze. It reads installed
// package manifests the way Node resolves packages (the app's node_modules,
// then each ancestor's) and never installs, fetches or executes anything.
import { access, open, readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
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

// Remove a YAML comment: `#` at line start or after whitespace, outside quotes.
function stripYamlComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '#' && (index === 0 || /\s/.test(line[index - 1])))
      return line.slice(0, index);
  }
  return line;
}

function unquoteYaml(value) {
  const text = value.trim();
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'"))
    return text.slice(1, -1).replaceAll("''", "'");
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(1, -1);
    }
  }
  return text;
}

// Split a flow sequence body on commas outside quotes and braces.
function splitFlowItems(body) {
  const items = [];
  let quote = null;
  let depth = 0;
  let current = '';
  for (const char of body) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === ',' && depth === 0) {
      items.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  items.push(current);
  return items;
}

// The `packages` list of a pnpm-workspace.yaml: an indented or unindented
// block sequence or a flow sequence, with quotes and comments. A file
// without `packages` (settings only) declares no member packages.
function workspacePatterns(text) {
  const lines = text.split(/\r?\n/).map(stripYamlComment);
  const start = lines.findIndex((line) => /^packages\s*:/.test(line));
  if (start < 0) return [];
  const inline = lines[start].replace(/^packages\s*:/, '').trim();
  if (inline.startsWith('[')) {
    let flow = inline;
    for (
      let index = start + 1;
      !flow.includes(']') && index < lines.length;
      index += 1
    )
      flow += ` ${lines[index].trim()}`;
    return splitFlowItems(flow.slice(1, flow.lastIndexOf(']')))
      .map(unquoteYaml)
      .filter((entry) => entry.length > 0);
  }
  const patterns = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') continue;
    const item = line.match(/^\s*-\s*(.*)$/);
    if (!item) break;
    patterns.push(unquoteYaml(item[1]));
  }
  return patterns.filter((entry) => entry.length > 0);
}

// Expand `{a,b}` alternatives, innermost first.
function expandBraces(pattern) {
  const match = pattern.match(/\{([^{}]*)\}/);
  if (!match) return [pattern];
  return match[1]
    .split(',')
    .flatMap((alternative) =>
      expandBraces(
        pattern.slice(0, match.index) +
          alternative +
          pattern.slice(match.index + match[0].length),
      ),
    );
}

// Glob syntax evaluated here: `*`, `**`, `?`, braces (expanded first) and
// positive character classes. Extglobs, negated classes, escapes and
// unbalanced brackets are not, and never count as a non-match.
function unsupportedGlob(pattern) {
  return (
    /[+@!?*]\(/.test(pattern) ||
    /\[[!^]/.test(pattern) ||
    pattern.includes('\\') ||
    /\[(?![^\]]*\])/.test(pattern) ||
    /\[\]/.test(pattern)
  );
}

function globToRegExp(pattern) {
  const source = pattern
    .split(/(\*\*\/|\*\*|\*|\?|\[[^\]]+\])/)
    .map((part) =>
      part === '**/'
        ? '(?:.*/)?'
        : part === '**'
          ? '.*'
          : part === '*'
            ? '[^/]*'
            : part === '?'
              ? '[^/]'
              : part.startsWith('[') && part.endsWith(']')
                ? `(?!/)[${part.slice(1, -1).replace(/[\\\]]/g, '\\$&')}]`
                : part.replace(/[.+^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${source}$`);
}

// pnpm finds members by globbing `<pattern>/package.json`, so a trailing
// globstar also matches the directory itself; negations exclude. Returns
// true or false, or `{ unsupported: pattern }` when a pattern whose result
// matters cannot be evaluated.
function workspaceIncludes(patterns, rel) {
  const target = `${rel}/package.json`;
  const evaluate = (pattern) => {
    const expanded = expandBraces(
      pattern.replace(/^\.\//, '').replace(/\/+$/, ''),
    );
    if (expanded.some(unsupportedGlob)) return { unsupported: pattern };
    return expanded.some((glob) =>
      globToRegExp(`${glob}/package.json`).test(target),
    );
  };
  const any = (list) => {
    let unknown = null;
    for (const pattern of list) {
      const result = evaluate(pattern);
      if (result === true) return true;
      if (result !== false && unknown === null) unknown = result;
    }
    return unknown ?? false;
  };
  const included = any(patterns.filter((pattern) => !pattern.startsWith('!')));
  if (included !== true) return included;
  const excluded = any(
    patterns
      .filter((pattern) => pattern.startsWith('!'))
      .map((pattern) => pattern.slice(1)),
  );
  return excluded === true ? false : excluded === false ? true : excluded;
}

// The app's relation to the nearest pnpm workspace: its own root, a member of
// an ancestor workspace, standalone (the ancestor's `packages` globs exclude
// it, so installs need --ignore-workspace), or undetermined when a pattern
// cannot be evaluated. Lockfile presence is not evidence: a member can keep
// its own lockfile with shared-workspace-lockfile=false.
async function workspaceMembership(appPath) {
  if (await exists(join(appPath, 'pnpm-workspace.yaml')))
    return { root: appPath, membership: 'root', reason: null };
  for (const directory of ancestors(dirname(appPath))) {
    const file = join(directory, 'pnpm-workspace.yaml');
    if (!(await exists(file))) continue;
    const rel = relative(directory, appPath).split(sep).join('/');
    const included = workspaceIncludes(
      workspacePatterns(await readFile(file, 'utf8')),
      rel,
    );
    if (typeof included === 'boolean')
      return {
        root: directory,
        membership: included ? 'member' : 'standalone',
        reason: null,
      };
    return {
      root: directory,
      membership: 'undetermined',
      reason: `pnpm-workspace.yaml pattern "${included.unsupported}" uses glob syntax this helper does not evaluate; workspace membership is unknown, so the command omits --ignore-workspace. Confirm membership with pnpm -r ls before running it.`,
    };
  }
  return { root: null, membership: null, reason: null };
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
  // A nested app the ancestor workspace does not include must be installed
  // with --ignore-workspace; an undetermined result never adds the flag.
  const workspace = await workspaceMembership(appPath);
  const ignoreWorkspace =
    workspace.membership === 'standalone' ? ' --ignore-workspace' : '';
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
    `${JSON.stringify({ versionsPath, appPath, applicable: true, packageManager, workspace, packages }, null, 2)}\n`,
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
