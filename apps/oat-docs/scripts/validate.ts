import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  decodeMarkdownFragment,
  markdownAnchors,
  markdownInlineCode,
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
  const targets: Array<{ source: string; href: string }> = [];
  for (const page of pages) {
    const markdown = await readFile(page, 'utf8');
    for (const value of markdownInlineCode(markdown)) {
      if (
        /^(?:\.\/|\.\.\/)[^\s?#]+\.md(?:#[^\s]+)?$/.test(value) &&
        !/[<{*]/.test(value)
      )
        targets.push({ source: page, href: value });
    }
    for (const match of sourceText(markdown)
      .replace(/(`+)[\s\S]*?\1/g, '')
      .matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1]!;
      targets.push({ source: page, href });
    }
  }
  await validateSourceTargets(docsRoot, targets);
}

export async function validateSourceTargets(
  docsRoot: string,
  targets: ReadonlyArray<{ source: string; href: string }>,
): Promise<void> {
  const errors: string[] = [];
  for (const { source: page, href } of targets) {
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
  if (errors.length) throw new Error(errors.join('\n'));
}

export async function validateTopicMap(
  docsRoot: string,
  skillPath: string,
): Promise<number> {
  const markdown = await readFile(skillPath, 'utf8');
  const lines = sourceText(markdown).split('\n');
  const header = lines.findIndex((line) =>
    /^\|\s*Topic Area\s*\|\s*Docs Path\s*\|/.test(line),
  );
  if (header < 0) throw new Error(`${skillPath}: missing docs topic table`);
  const targets: Array<{ source: string; href: string }> = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith('|')) break;
    const cell = line.split('|')[2] ?? '';
    const paths = [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]!);
    if (!paths.length)
      throw new Error(`${skillPath}: missing topic path in ${line}`);
    for (const path of paths) {
      if (
        path.startsWith('/') ||
        path.split('/').includes('..') ||
        !/^(?:[^?#]+\.md(?:#[^?]+)?|[^?#]+\/)$/.test(path)
      )
        throw new Error(`${skillPath}: unsupported topic path ${path}`);
      targets.push({ source: join(docsRoot, 'index.md'), href: path });
    }
  }
  if (!targets.length) throw new Error(`${skillPath}: empty docs topic table`);
  await validateSourceTargets(docsRoot, targets);
  return targets.length;
}

export async function validateHostedReadmes(
  docsRoot: string,
  readmes: readonly string[],
): Promise<Array<{ source: string; url: string; target: string }>> {
  const targets: Array<{ source: string; url: string; target: string }> = [];
  for (const source of readmes) {
    const markdown = sourceText(await readFile(source, 'utf8')).replace(
      /(`+)[\s\S]*?\1/g,
      '',
    );
    const pattern =
      /!?\[[^\]\n]*\]\((?:<([^>\n]+)>|([^\s)]+))(?:\s+"[^"]*")?\)|^\s{0,3}\[[^\]\n]+\]:\s*(?:<([^>\n]+)>|(\S+))|<(https?:\/\/[^>\n]+)>/gm;
    for (const match of markdown.matchAll(pattern)) {
      const href = match.slice(1).find((value) => value !== undefined)!;
      if (!href.startsWith('https://voxmedia.github.io/')) continue;
      const url = new URL(href);
      if (
        url.origin !== 'https://voxmedia.github.io' ||
        !/^\/open-agent-toolkit(?:\/|$)/.test(url.pathname)
      )
        continue;
      const route = decodeURIComponent(
        url.pathname.slice('/open-agent-toolkit'.length),
      ).replace(/\/$/, '');
      if (
        route.includes('\\') ||
        route.split('/').some((part) => part === '..')
      )
        throw new Error(`${source}: unsupported hosted route ${href}`);
      const candidates = route
        ? [join(docsRoot, `${route}.md`), join(docsRoot, route, 'index.md')]
        : [join(docsRoot, 'index.md')];
      const present: string[] = [];
      for (const candidate of candidates)
        if ((await stat(candidate).catch(() => undefined))?.isFile())
          present.push(candidate);
      if (present.length !== 1)
        throw new Error(
          `${source}: unresolved or ambiguous hosted route ${href}`,
        );
      await validateSourceTargets(docsRoot, [
        {
          source,
          href: `${relative(dirname(source), present[0]!)}${url.hash}`,
        },
      ]);
      targets.push({ source, url: href, target: `${present[0]}${url.hash}` });
    }
  }
  return targets;
}

export async function validateLiveConsumers(root: string): Promise<void> {
  const docsRoot = join(root, 'apps/oat-docs/docs');
  const topics = await validateTopicMap(
    docsRoot,
    join(root, '.agents/skills/oat-docs/SKILL.md'),
  );
  const hosted = await validateHostedReadmes(
    docsRoot,
    [
      'README.md',
      'packages/cli/README.md',
      'packages/docs-config/README.md',
      'packages/docs-theme/README.md',
      'packages/docs-transforms/README.md',
    ].map((path) => join(root, path)),
  );
  process.stdout.write(
    `Live docs consumers validated: ${topics} topic paths, ${hosted.length} hosted README occurrences.\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runNavigation(appRoot);
  await validateSourceRoutes(join(appRoot, 'docs'));
  await validateLiveConsumers(repoRoot);
  process.stdout.write(
    'Source navigation, routes and anchors validated (no generated output required).\n',
  );
}
