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
          ['node_modules', 'dist', 'out', 'site'].includes(e.name)
        )
          continue;
        const dir = join(root, e.name);
        const rel = posix(relative(target.repoRoot, dir));
        if (excluded.excludesDirectory(rel)) continue;
        if (match.excludesDirectory(rel)) {
          if (!result.some((p) => p.root === dir)) await add(dir);
        }
        // Package patterns, rather than arbitrary repo fixtures, define scope.
        if (patterns.some((p) => p.startsWith(`${rel}/`) || p.startsWith('**')))
          await walk(dir);
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
      for (const [lineIndex, original] of (node.value ?? '')
        .split('\n')
        .entries()) {
        const line =
          (node.position?.start.line ?? 1) +
          lineIndex +
          (node.type === 'code' && node.lang ? 1 : 0);
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
          if (script === 'run' || script === 'run-script') {
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
          else if (!Object.hasOwn(pkg.scripts ?? {}, script))
            report(
              'commands',
              'error',
              p.path,
              `Script "${script}" does not exist in ${posix(relative(target.repoRoot, join(pkg.root, 'package.json'))) || 'package.json'}.`,
              line,
            );
          else if (/^\s*echo(?:\s|$)/.test(pkg.scripts![script]!))
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
