import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  decodeMarkdownFragment,
  markdownAnchors,
} from '@oat-repo/nav-markdown';

export const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = resolve(appRoot, '..', '..');

export function runNavigation(
  app: string,
  mode: '--validate-only' | '--check' | null = '--validate-only',
): void {
  const args = [
    '--import',
    'tsx',
    '--',
    join(repoRoot, 'packages/cli/src/index.ts'),
    'docs',
    'nav',
    'sync',
    '--framework',
    'fumadocs',
    '--target-dir',
    app,
  ];
  if (mode) args.push(mode);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      TSX_TSCONFIG_PATH: join(repoRoot, 'packages/cli/tsconfig.json'),
      OAT_AUTONOMOUS: '1',
      OAT_NON_INTERACTIVE: '1',
      NO_UPDATE_NOTIFIER: '1',
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      result.stderr || result.stdout || 'Navigation compiler failed',
    );
}

function sourceText(markdown: string): string {
  let fence = '';
  let fenceLength = 0;
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
    .split(/\r?\n/)
    .map((line) => {
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (
          marker?.[1]?.startsWith(fence) &&
          marker[1].length >= fenceLength &&
          !marker[2]?.trim()
        )
          fence = '';
        return '';
      }
      if (marker) {
        fence = marker[1]![0]!;
        fenceLength = marker[1]!.length;
        return '';
      }
      return line;
    })
    .join('\n');
}

export async function validateSourceRoutes(docsRoot: string): Promise<void> {
  const pages: string[] = [];
  async function scan(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await scan(path);
      else if (entry.name.endsWith('.md')) pages.push(path);
    }
  }
  await scan(docsRoot);
  const errors: string[] = [];
  for (const page of pages) {
    const markdown = await readFile(page, 'utf8');
    for (const match of sourceText(markdown)
      .replace(/(`+)[\s\S]*?\1/g, '')
      .matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1]!;
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
      const [path = '', fragment] = href.split('#');
      if (path.includes('?')) continue;
      let target = path.startsWith('/')
        ? resolve(docsRoot, `.${path}`)
        : resolve(dirname(page), path || '.');
      if (!path) target = page;
      else if (!extname(target)) target = join(target, 'index.md');
      if (!(await stat(target).catch(() => undefined))?.isFile()) {
        errors.push(`${page}: unresolved source link ${href}`);
        continue;
      }
      if (
        fragment &&
        target.endsWith('.md') &&
        !markdownAnchors(await readFile(target, 'utf8')).has(
          decodeMarkdownFragment(fragment, href, page),
        )
      )
        errors.push(`${page}: unresolved source fragment ${href}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runNavigation(appRoot);
  await validateSourceRoutes(join(appRoot, 'docs'));
  process.stdout.write(
    'Source navigation, routes and anchors validated (no generated output required).\n',
  );
}
