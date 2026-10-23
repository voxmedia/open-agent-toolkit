import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { createExclusionMatcher } from '@commands/docs/shared/exclusions';
import YAML from 'yaml';

import type { Report } from './check.types';
import { inside, posix, present, type CheckTarget } from './files';
import type { ParsedPage } from './markdown';

interface Package {
  root: string;
  name?: string;
  scripts?: Record<string, string>;
}
const BUILTINS = new Set([
  'add',
  'install',
  'i',
  'exec',
  'dlx',
  'remove',
  'rm',
  'uninstall',
  'update',
  'up',
  'outdated',
  'list',
  'ls',
  'why',
  'link',
  'unlink',
  'import',
  'rebuild',
  'prune',
  'fetch',
  'store',
  'config',
  'setup',
  'env',
  'help',
  'init',
  'create',
  'publish',
  'pack',
  'audit',
  'licenses',
  'patch',
  'patch-commit',
  'patch-remove',
  'deploy',
  'dedupe',
  'approve-builds',
  'ignored-builds',
  'server',
  'self-update',
  'root',
  'bin',
  'version',
]);
const illustrative = (value: string): boolean => /[<$`{}]|\.\.\./.test(value);
function tokens(source: string): string[] {
  return (source.match(/"(?:\\.|[^"\\])*"|'[^']*'|[^\s]+/g) ?? []).map((t) =>
    /^['"]/.test(t) ? t.slice(1, -1) : t,
  );
}
async function packages(target: CheckTarget): Promise<Package[]> {
  let patterns: string[] = [];
  if (await present(join(target.repoRoot, 'pnpm-workspace.yaml'))) {
    const config = YAML.parse(
      await readFile(join(target.repoRoot, 'pnpm-workspace.yaml'), 'utf8'),
    ) as { packages?: string[] };
    patterns = config.packages?.filter((p) => !p.startsWith('!')) ?? [];
  }
  const match = createExclusionMatcher(patterns);
  // A proper pattern prefix can still contain a member below it. A globstar
  // prefix remains open at every depth. Reuse the membership matcher.
  const descend = createExclusionMatcher(
    patterns.flatMap((pattern) => {
      const parts = pattern.trim().replace(/\/+$/, '').split('/');
      return parts.flatMap((part, index) =>
        index < parts.length - 1 || part === '**'
          ? [parts.slice(0, index + 1).join('/')]
          : [],
      );
    }),
  );
  const excluded = createExclusionMatcher(
    (await present(join(target.repoRoot, 'pnpm-workspace.yaml')))
      ? (
          (
            YAML.parse(
              await readFile(
                join(target.repoRoot, 'pnpm-workspace.yaml'),
                'utf8',
              ),
            ) as { packages?: string[] }
          ).packages ?? []
        )
          .filter((p) => p.startsWith('!'))
          .map((p) => p.slice(1))
      : [],
  );
  const result: Package[] = [];
  const add = async (root: string): Promise<void> => {
    if (!(await present(join(root, 'package.json')))) return;
    const p = JSON.parse(
      await readFile(join(root, 'package.json'), 'utf8'),
    ) as Omit<Package, 'root'>;
    result.push({ root, name: p.name, scripts: p.scripts });
  };
  await add(target.repoRoot);
  if (target.appRoot !== target.repoRoot) await add(target.appRoot);
  if (patterns.length) {
    const walk = async (root: string): Promise<void> => {
      for (const e of await readdir(root, { withFileTypes: true })) {
        if (
          !e.isDirectory() ||
          e.name.startsWith('.') ||
          e.name === 'node_modules'
        )
          continue;
        const dir = join(root, e.name);
        const rel = posix(relative(target.repoRoot, dir));
        if (excluded.excludesDirectory(rel)) continue;
        if (match.excludesDirectory(rel)) {
          if (!result.some((p) => p.root === dir)) await add(dir);
        }
        // Package patterns, rather than arbitrary repo fixtures, define scope.
        if (descend.excludesDirectory(rel)) await walk(dir);
      }
    };
    await walk(target.repoRoot);
  }
  return result;
}
export async function checkCommands(
  target: CheckTarget,
  pages: ParsedPage[],
  report: Report,
): Promise<void> {
  const docs = pages.filter((p) =>
    /(?:^|\/)contributing(?:\.mdx?$|\/)/.test(p.path),
  );
  if (!docs.length) return;
  const manifests = await packages(target);
  for (const p of docs)
    for (const node of p.nodes) {
      if (node.type !== 'code' && node.type !== 'inlineCode') continue;
      if (
        node.type === 'code' &&
        node.lang &&
        !['sh', 'shell', 'bash', 'zsh', 'console', 'powershell'].includes(
          node.lang,
        )
      )
        continue;
      let cwd: string | undefined = target.repoRoot;
      const start = node.position?.start;
      const openingLine =
        p.source.split(/\r?\n/).at((start?.line ?? 1) - 1) ?? '';
      const fenced =
        node.type === 'code' &&
        /^(?:`{3,}|~{3,})/.test(openingLine.slice((start?.column ?? 1) - 1));
      for (const [lineIndex, original] of (node.value ?? '')
        .split('\n')
        .entries()) {
        const line =
          (node.position?.start.line ?? 1) + lineIndex + (fenced ? 1 : 0);
        // Split shell command boundaries while retaining quoted arguments. No
        // subprocess is executed, and placeholders are never guessed.
        const segments =
          original.match(/(?:"(?:\\.|[^"\\])*"|'[^']*'|[^;&\n])+/g) ?? [];
        for (let segment of segments) {
          segment = segment.replace(/^\s*\$\s+/, '').trim();
          if (!segment || segment.startsWith('#')) continue;
          const words = tokens(segment);
          if (words[0] === 'cd') {
            cwd =
              words[1] && !illustrative(words[1]) && cwd
                ? resolve(cwd, words[1])
                : undefined;
            continue;
          }
          const manager = words.findIndex((w) => w === 'pnpm' || w === 'npm');
          if (manager < 0) continue;
          const kind = words[manager]!;
          let root = cwd;
          let filter: string | undefined;
          let index = manager + 1;
          while (words[index]?.startsWith('-')) {
            const option = words[index++]!;
            if (['-w', '--workspace-root'].includes(option))
              root = target.repoRoot;
            else if (option === '--filter' || option === '-F')
              filter = words[index++];
            else if (option.startsWith('--filter=')) filter = option.slice(9);
            else if (['--dir', '-C', '--prefix'].includes(option)) {
              const dir = words[index++];
              root =
                root && dir && !illustrative(dir)
                  ? resolve(root, dir)
                  : undefined;
            } else if (['-r', '--recursive', '--workspace'].includes(option))
              root = undefined;
          }
          let script = words[index];
          if (!script) continue;
          if (
            kind === 'npm' &&
            script !== 'run' &&
            script !== 'run-script' &&
            script !== 'test' &&
            script !== 'start'
          )
            continue;
          const explicitRun = script === 'run' || script === 'run-script';
          if (explicitRun) {
            index++;
            while (words[index]?.startsWith('-')) index++;
            script = words[index];
          } else if (BUILTINS.has(script)) continue;
          if (
            !script ||
            illustrative(script) ||
            (filter && illustrative(filter))
          )
            continue;
          let pkg: Package | undefined;
          if (filter) {
            const selected = manifests.filter(
              (item) =>
                item.name === filter ||
                (filter.startsWith('./') &&
                  posix(relative(target.repoRoot, item.root)) ===
                    filter.slice(2)),
            );
            if (selected.length === 1) pkg = selected[0];
          } else if (
            root &&
            inside(target.repoRoot, root) &&
            (await present(root))
          ) {
            let current = root;
            while (inside(target.repoRoot, current)) {
              pkg = manifests.find((item) => item.root === current);
              if (pkg || current === target.repoRoot) break;
              current = dirname(current);
            }
          }
          if (!pkg)
            report(
              'commands',
              'error',
              p.path,
              `Cannot resolve package context for ${kind} ${script}${filter ? ` (--filter ${filter})` : ''}; use literal cd, -w or --filter.`,
              line,
            );
          else if (!Object.hasOwn(pkg.scripts ?? {}, script)) {
            // pnpm shorthand can invoke an installed local binary. Explicit run
            // remains script-only; never execute a binary or search system PATH.
            const installedBinary =
              kind === 'pnpm' &&
              !explicitRun &&
              !/[\\/]/.test(script) &&
              script !== '.' &&
              script !== '..' &&
              (
                await Promise.all(
                  [pkg.root, target.repoRoot].map((binRoot) =>
                    present(join(binRoot, 'node_modules/.bin', script)),
                  ),
                )
              ).some(Boolean);
            if (!installedBinary)
              report(
                'commands',
                'error',
                p.path,
                `Script "${script}" does not exist in ${posix(relative(target.repoRoot, join(pkg.root, 'package.json'))) || 'package.json'}.`,
                line,
              );
          } else if (/^\s*echo(?:\s|$)/.test(pkg.scripts![script]!))
            report(
              'commands',
              'warn',
              p.path,
              `Script "${script}" is an echo stub in ${posix(relative(target.repoRoot, join(pkg.root, 'package.json')))}.`,
              line,
            );
        }
      }
    }
}
