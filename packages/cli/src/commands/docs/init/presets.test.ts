import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLoggerCapture } from '@commands/__tests__/helpers';
import { checkDocs } from '@commands/docs/check/checker';
import { createDocsGenerateIndexCommand } from '@commands/docs/index-generate';
import { createDocsNavSyncCommand } from '@commands/docs/nav/sync';
import { Command } from 'commander';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDocsInitCommand } from './index';

const repo = join(dirname(fileURLToPath(import.meta.url)), '../../../../../..');
let assets: string;
const roots: string[] = [];
async function root() {
  const path = await mkdtemp(join(tmpdir(), 'oat-preset-'));
  roots.push(path);
  execFileSync('git', ['init', '-q', path]);
  return path;
}
async function snapshot(path: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      for (const [name, value] of Object.entries(await snapshot(child)))
        result[`${entry.name}/${name}`] = value;
    } else result[entry.name] = (await readFile(child)).toString('base64');
  }
  return result;
}
function context(
  cwd: string,
  capture: ReturnType<typeof createLoggerCapture>,
  dryRun = false,
) {
  return {
    cwd,
    home: cwd,
    scope: 'project' as const,
    interactive: false,
    dryRun,
    json: true,
    verbose: false,
    logger: capture.logger,
  };
}
async function init(cwd: string, args: string[], dryRun = false) {
  const capture = createLoggerCapture();
  const command = new Command().addCommand(
    createDocsInitCommand({
      buildCommandContext: () => context(cwd, capture, dryRun),
      resolveAssetsRoot: async () => assets,
    }),
  );
  const prior = process.exitCode;
  try {
    process.exitCode = undefined;
    await command.parseAsync(
      [
        'init',
        '--target-dir',
        'handbook',
        '--site-name',
        'Example handbook',
        '--yes',
        '--no-root-patch',
        '--lint',
        'none',
        '--format',
        'none',
        ...args,
      ],
      { from: 'user' },
    );
    return { exit: process.exitCode ?? 0, payload: capture.jsonPayloads[0] };
  } finally {
    process.exitCode = prior;
  }
}
async function nav(cwd: string) {
  const capture = createLoggerCapture();
  const prior = process.exitCode;
  try {
    process.exitCode = undefined;
    await new Command()
      .addCommand(
        createDocsNavSyncCommand({
          buildCommandContext: () => context(cwd, capture),
        }),
      )
      .parseAsync(['sync', '--target-dir', 'handbook', '--check'], {
        from: 'user',
      });
    expect(process.exitCode ?? 0, JSON.stringify(capture)).toBe(0);
  } finally {
    process.exitCode = prior;
  }
}
async function manifest(cwd: string, markdown: boolean) {
  const capture = createLoggerCapture();
  const prior = process.exitCode;
  try {
    process.exitCode = undefined;
    await new Command()
      .addCommand(
        createDocsGenerateIndexCommand({
          buildCommandContext: () => context(cwd, capture),
        }),
      )
      .parseAsync(
        [
          'generate-index',
          '--docs-dir',
          markdown ? 'handbook' : 'handbook/docs',
          '--output',
          'inventory.md',
        ],
        { from: 'user' },
      );
    expect(process.exitCode ?? 0, JSON.stringify(capture)).toBe(0);
    return readFile(join(cwd, 'inventory.md'), 'utf8');
  } finally {
    process.exitCode = prior;
  }
}
const support = [
  'alert-runbook',
  'solution-record',
  'command-reference',
  'skill-command-guide',
  'decisions-pointer',
  'per-area-agents',
];
// Expected paths and subsets come from the approved public p07 contract, not the planner.
const fixtures = [
  {
    preset: 'product-engineering-qa',
    framework: 'fumadocs',
    paths: ['product', 'engineering', 'qa'],
    templates: [
      'product-feature',
      'engineering-feature',
      'qa-validation',
      'screen-spec',
      ...support,
    ],
  },
  {
    preset: 'consumer-maintainer',
    framework: 'mkdocs',
    paths: ['consumer', 'maintainer'],
    templates: support,
  },
  {
    preset: 'domain-engineering',
    framework: 'markdown',
    paths: ['engineering'],
    templates: ['engineering-feature', ...support],
  },
  {
    preset: 'task-type',
    framework: 'fumadocs',
    paths: ['tutorials', 'how-to', 'reference', 'explanation'],
    templates: support,
  },
  {
    preset: 'toolkit-cli',
    framework: 'mkdocs',
    paths: ['tools', 'workflows'],
    templates: support,
  },
  {
    preset: 'flat-small',
    framework: 'markdown',
    paths: [],
    templates: support,
  },
];
describe('approved preset materialization at real init/reader/config boundaries', () => {
  beforeAll(async () => {
    assets = await mkdtemp(join(tmpdir(), 'oat-preset-assets-'));
    execFileSync('bash', ['packages/cli/scripts/bundle-assets.sh'], {
      cwd: repo,
      env: { ...process.env, OAT_ASSETS_DIR: assets },
    });
  }, 60_000);
  afterAll(async () => {
    await Promise.all(
      [...roots, assets].map((path) =>
        rm(path, { recursive: true, force: true }),
      ),
    );
  });
  it.each(fixtures)(
    '$preset produces supported readers, templates and exclusions in $framework',
    async (f) => {
      const cwd = await root();
      await mkdir(join(cwd, '.oat'));
      await writeFile(
        join(cwd, '.oat/config.json'),
        JSON.stringify({
          version: 1,
          documentation: {
            guidance: 'local-guidance.md',
            customSibling: 'preserve',
            nonReaderPaths: ['drafts/**'],
            excludes: ['archive/**'],
          },
        }),
      );
      const result = await init(cwd, [
        '--framework',
        f.framework,
        '--ia-preset',
        f.preset,
        '--planned-pages',
        '15',
      ]);
      expect(result.exit, JSON.stringify(result)).toBe(0);
      const markdown = f.framework === 'markdown';
      const content = join(cwd, 'handbook', markdown ? '' : 'docs');
      const config = JSON.parse(
        await readFile(join(cwd, '.oat/config.json'), 'utf8'),
      ).documentation;
      expect(config).toMatchObject({
        root: 'handbook',
        tooling: f.framework,
        guidance: 'local-guidance.md',
        customSibling: 'preserve',
        nonReaderPaths: ['drafts/**', 'contributing/templates/**'],
        excludes: ['archive/**'],
      });
      expect(config.ia).toBeUndefined();
      const index = await readFile(join(content, 'index.md'), 'utf8');
      for (const path of f.paths) {
        expect(index).toContain(`](${path}/index.md)`);
        const entry = await readFile(join(content, path, 'index.md'), 'utf8');
        expect(entry).toContain('Entry principle:');
        expect(entry).toContain('](start-here.md)');
        expect(
          await readFile(join(content, path, 'start-here.md'), 'utf8'),
        ).toContain('## Verify the result');
      }
      const guidance = await readFile(
        join(cwd, 'handbook', markdown ? 'contributing.md' : 'AGENTS.md'),
        'utf8',
      );
      expect(guidance).toContain(
        '| Location | Reader track | Entry principle |',
      );
      expect(guidance).toContain(f.preset);
      expect(guidance).toContain('not a persisted IA decision');
      if (f.preset === 'product-engineering-qa')
        expect(guidance).toContain('Engineering is hybrid');
      if (markdown) {
        for (const name of [
          'AGENTS.md',
          'package.json',
          'meta.json',
          'mkdocs.yml',
          'index.md',
        ]) {
          if (name === 'index.md') continue;
          await expect(readFile(join(content, name))).rejects.toThrow();
        }
        expect(config.navOwner).toBeUndefined();
        expect(config.index).toBe('handbook/index.md');
      }
      if (!markdown) {
        const toolchain = await readFile(
          join(content, 'contributing/docs-toolchain.md'),
          'utf8',
        );
        expect(toolchain).toContain('[the documentation home](../index.md)');
        expect(toolchain).not.toContain('[Getting Started]');
      }
      if (f.preset === 'flat-small') {
        expect(index).toContain('### Start here');
        expect(index).toContain('](start-here.md)');
        expect(
          (await readdir(content, { withFileTypes: true }))
            .filter((e) => e.isDirectory())
            .map((e) => e.name),
        ).toEqual(['contributing']);
      }
      const templates = join(content, 'contributing/templates');
      expect((await readdir(templates)).sort()).toEqual(
        f.templates.map((s) => `${s}.md`).sort(),
      );
      for (const name of f.templates)
        expect(await readFile(join(templates, `${name}.md`), 'utf8')).toBe(
          await readFile(
            join(
              repo,
              '.agents/skills/authoring-docs/references/page-templates',
              `${name}.md`,
            ),
            'utf8',
          ),
        );
      // An invalid draft must be invisible through the config handoff to all real consumers.
      await writeFile(
        join(templates, 'invalid.md'),
        '---\ntitle: [broken\n---\n\n[Missing](missing.md)\n',
      );
      const checked = await checkDocs({ cwd });
      expect(
        checked.findings.filter((finding) => finding.severity === 'error'),
      ).toEqual([]);
      expect(
        checked.findings.some((finding) => finding.path.includes('templates')),
      ).toBe(false);
      if (!markdown) await nav(cwd);
      const inventory = await manifest(cwd, markdown);
      expect(inventory).not.toContain('templates/');
      expect(inventory).not.toContain('invalid.md');
      expect(inventory).toContain(
        f.paths.length ? `${f.paths[0]}/start-here.md` : 'start-here.md',
      );
      // Valid reader control is counted; the same malformed draft becomes an error as a reader.
      await writeFile(
        join(content, 'bad-reader.md'),
        '---\ntitle: [broken\n---\n',
      );
      expect((await checkDocs({ cwd })).findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'bad-reader.md', severity: 'error' }),
        ]),
      );
      await rm(join(content, 'bad-reader.md'));
      expect((await checkDocs({ cwd })).summary.errors).toBe(0);
      if (f.framework === 'mkdocs')
        expect(
          await readFile(join(cwd, 'handbook/mkdocs.yml'), 'utf8'),
        ).toContain('use_directory_urls: false');
    },
    60_000,
  );
  it.each(['fumadocs', 'mkdocs', 'markdown'])(
    'collapses the triad at 14 in %s and retains all templates',
    async (framework) => {
      const cwd = await root();
      const args = [
        '--framework',
        framework,
        '--ia-preset',
        'product-engineering-qa',
        '--planned-pages',
        '14',
      ];
      if (framework === 'markdown') {
        const before = await snapshot(cwd);
        expect((await init(cwd, args, true)).exit).toBe(0);
        expect(await snapshot(cwd)).toEqual(before);
      }
      expect((await init(cwd, args)).exit).toBe(0);
      const content = join(
        cwd,
        'handbook',
        framework === 'markdown' ? '' : 'docs',
      );
      const index = await readFile(join(content, 'index.md'), 'utf8');
      for (const [name, title] of [
        ['product', 'Product'],
        ['engineering', 'Engineering'],
        ['qa', 'QA'],
      ]) {
        expect(index).toContain(`### ${title}`);
        expect(index).toContain(`](${name}.md)`);
        await expect(
          readFile(join(content, name!, 'index.md')),
        ).rejects.toThrow();
      }
      expect(
        await readdir(join(content, 'contributing/templates')),
      ).toHaveLength(10);
      expect((await checkDocs({ cwd })).summary.errors).toBe(0);
      if (framework !== 'markdown') await nav(cwd);
    },
    60_000,
  );
  it.each([
    ['--ia-preset', 'task-type'],
    ['--planned-pages', '15'],
    ['--ia-preset', 'unknown', '--planned-pages', '15'],
    ...['0', '-1', '1.5', 'NaN', '1e2', '9007199254740992'].map((count) => [
      '--ia-preset',
      'task-type',
      '--planned-pages',
      count,
    ]),
  ])('rejects invalid pair %j before filesystem writes', async (...args) => {
    const cwd = await root();
    const before = await snapshot(cwd);
    expect((await init(cwd, ['--framework', 'markdown', ...args])).exit).toBe(
      1,
    );
    expect(await snapshot(cwd)).toEqual(before);
  });
  it.each(['fumadocs', 'mkdocs', 'markdown'])(
    'refuses existing authored/configured %s surfaces even with yes/adopt',
    async (framework) => {
      const cwd = await root();
      await mkdir(join(cwd, 'handbook'));
      await writeFile(
        join(cwd, 'handbook/index.md'),
        '# Preserve authored bytes\n',
      );
      let before = await snapshot(cwd);
      const args = [
        '--framework',
        framework,
        '--ia-preset',
        'task-type',
        '--planned-pages',
        '15',
        ...(framework === 'markdown' ? ['--adopt'] : []),
      ];
      expect((await init(cwd, args)).exit).toBe(1);
      expect(await snapshot(cwd)).toEqual(before);
      await rm(join(cwd, 'handbook'), { recursive: true });
      await mkdir(join(cwd, '.oat'));
      await writeFile(
        join(cwd, '.oat/config.json'),
        '{"version":1,"documentation":{"root":"old","navOwner":"hand-authored"}}',
      );
      before = await snapshot(cwd);
      expect((await init(cwd, args)).exit).toBe(1);
      expect(await snapshot(cwd)).toEqual(before);
    },
  );
});
