import { execFile } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { syncDocsNavigation } from '@commands/docs/nav/sync';
import { type DocumentationCheckConfig } from '@config/documentation-check';
import { afterEach, describe, expect, it } from 'vitest';

import { checkDocs } from './checker';

const exec = promisify(execFile);
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const description =
  'A complete description for readers of this documentation page.';
function page(
  body = '# Guide\n\nA useful reader page with a clear explanation of its intended purpose.\n',
  front: Record<string, unknown> = {},
): string {
  return `---\n${Object.entries({ title: 'Guide', description, ...front })
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')}\n---\n\n${body}`;
}
function index(entries = 1, grouped = false): string {
  return page(
    `# Guide\n\nA useful overview explains this section and helps its readers choose their next destination.\n\n## Contents\n\n${grouped ? '### Readers\n\n' : ''}${Array.from({ length: entries }, (_, i) => `- [Reader ${i}](guide.md) - Complete description for this reader.`).join('\n')}\n`,
  );
}
async function fixture(
  framework: 'markdown' | 'fumadocs' | 'mkdocs' = 'markdown',
) {
  const root = await mkdtemp(join(tmpdir(), 'oat-check-'));
  roots.push(root);
  const app = join(root, 'site');
  const content = framework === 'markdown' ? app : join(app, 'docs');
  const put = async (path: string, text: string): Promise<void> => {
    const file = join(root, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
  };
  await mkdir(content, { recursive: true });
  await put(
    '.oat/config.json',
    JSON.stringify({
      version: 1,
      documentation: { root: 'site', tooling: framework },
    }),
  );
  await put(
    'package.json',
    JSON.stringify({
      name: 'repo',
      scripts: {
        build: 'node build.mjs',
        test: 'vitest',
        echo: 'echo disabled',
      },
    }),
  );
  if (framework === 'fumadocs')
    await put(
      'site/source.config.ts',
      '// real marker, never executed by checker\n',
    );
  if (framework === 'mkdocs')
    await put('site/mkdocs.yml', 'site_name: Fixture\n');
  await writeFile(join(content, 'index.md'), index());
  await writeFile(join(content, 'guide.md'), page());
  // A real repository boundary, not a mocked resolver.
  await exec('git', ['init', '--quiet', root]);
  const config = async (
    check: DocumentationCheckConfig = {},
    extra: Record<string, unknown> = {},
  ) =>
    put(
      '.oat/config.json',
      JSON.stringify({
        version: 1,
        documentation: { root: 'site', tooling: framework, check, ...extra },
      }),
    );
  const write = async (path: string, source: string) => {
    await mkdir(dirname(join(content, path)), { recursive: true });
    await writeFile(join(content, path), source);
  };
  const run = async (...rules: string[]) =>
    (await checkDocs({ cwd: root, rules })).findings;
  return { root, app, content, put, write, config, run };
}
describe('calibrated reader rules through real files and config', () => {
  it.each([9, 10, 11, 13, 14, 15])('flat root threshold %i', async (count) => {
    const f = await fixture();
    await f.write('index.md', index(count));
    expect((await f.run('root-width')).map((v) => v.severity)).toEqual(
      count > 14 ? ['error'] : count > 10 ? ['warn'] : [],
    );
  });
  it.each([9, 10, 11, 14, 15, 16])(
    'Contents width threshold %i',
    async (count) => {
      const f = await fixture();
      await f.write('index.md', index(count));
      expect((await f.run('contents-width')).map((v) => v.severity)).toEqual(
        count > 15 ? ['error'] : count > 10 ? ['warn'] : [],
      );
    },
  );
  it('only real groups exempt widths; catalog exempts Contents width alone', async () => {
    const f = await fixture();
    await f.write('index.md', index(16, true));
    expect(await f.run('root-width', 'contents-width')).toEqual([]);
    await f.write(
      'index.md',
      index(16).replace('title: "Guide"', 'catalog: true\ntitle: "Guide"'),
    );
    expect(
      (await f.run('root-width', 'contents-width')).map((v) => v.ruleId),
    ).toEqual(['root-width']);
    await f.write(
      'index.md',
      `${index(16)}\n\`\`\`md\n### Fake group\n\`\`\`\n`,
    );
    expect(
      (await f.run('root-width', 'contents-width')).map((v) => v.ruleId),
    ).toEqual(['contents-width', 'root-width']);
  });
  it.each([11, 12, 13, 19, 20, 21])(
    'direct reader folder count %i includes index',
    async (count) => {
      const f = await fixture();
      for (let i = 2; i < count; i++) await f.write(`page${i}.mdx`, page());
      expect((await f.run('folder-size')).map((v) => v.severity)).toEqual(
        count > 20 ? ['error'] : count > 12 ? ['warn'] : [],
      );
      await f.write('index.md', index(1, true));
      expect(await f.run('folder-size')).toEqual([]);
    },
  );
  it.each([1, 2, 3])('leaf count %i includes index', async (count) => {
    const f = await fixture();
    if (count === 1) await rm(join(f.content, 'guide.md'));
    if (count === 3) await f.write('other.md', page());
    expect((await f.run('leaf-size')).map((v) => v.severity)).toEqual(
      count === 1 ? ['error'] : count === 2 ? ['warn'] : [],
    );
  });
  it.each([3, 4, 5, 6])('depth %i is root-relative', async (depth) => {
    const f = await fixture();
    const path = Array(depth).fill('nested').join('/');
    await f.write(`${path}/guide.md`, page());
    const atDepth = (await f.run('depth')).filter(
      (v) => v.path === `${path}/index.md`,
    );
    expect(atDepth.map((v) => v.severity)).toEqual(
      depth >= 5 ? ['error'] : depth >= 4 ? ['warn'] : [],
    );
  });
  it.each([499, 500, 501, 999, 1000, 1001])(
    'physical page lines %i and reference boundary',
    async (count) => {
      const f = await fixture();
      const source = page();
      const base = source.trimEnd().split('\n').length;
      await f.write(
        'guide.md',
        `${source.trimEnd()}\n${'\n'.repeat(count - base - 1)}`,
      );
      // Use exact physical lines including blank source lines, without inventing an AST count.
      let text = await readFile(join(f.content, 'guide.md'), 'utf8');
      const actual = text.split('\n').length - 1;
      if (actual < count) text += '\n'.repeat(count - actual);
      await f.write('guide.md', text);
      expect((await f.run('page-length')).map((v) => v.severity)).toEqual(
        count > 500 ? ['warn'] : [],
      );
      await f.write('reference/guide.md', text);
      await f.write('guide.md', page());
      expect((await f.run('page-length')).map((v) => v.severity)).toEqual(
        count > 1000 ? ['warn'] : [],
      );
    },
  );
  it.each([39, 40, 41])(
    'reference H3 count %i ignores fenced headings',
    async (count) => {
      const f = await fixture();
      await f.write(
        'reference/guide.md',
        page(
          `# Guide\n${Array.from({ length: count }, (_, i) => `\n### Heading ${i}\n`).join('')}\n\`\`\`md\n### Literal\n\`\`\`\n`,
        ),
      );
      expect((await f.run('page-length')).map((v) => v.severity)).toEqual(
        count > 40 ? ['warn'] : [],
      );
    },
  );
  // Line oracles come from the fixture construction: line N is the first
  // physical line past a limit, and page() puts H3 number k on line 8 + 2k.
  it('locates page-length findings at the first line past each limit', async () => {
    const f = await fixture();
    await f.write('guide.md', `${page().trimEnd()}\n${'x\n'.repeat(600)}`);
    expect(await f.run('page-length')).toEqual([
      expect.objectContaining({ path: 'guide.md', line: 501 }),
    ]);
    await f.write('guide.md', page());
    await f.write(
      'reference/guide.md',
      page(
        `# Guide\n${Array.from({ length: 41 }, (_, i) => `\n### Heading ${i}\n`).join('')}`,
      ),
    );
    expect(await f.run('page-length')).toEqual([
      expect.objectContaining({ path: 'reference/guide.md', line: 88 }),
    ]);
  });
  it.each([0, 39, 40, 41, 159, 160, 161])(
    'description length %i',
    async (count) => {
      const f = await fixture();
      await f.write(
        'guide.md',
        page(undefined, { description: 'x'.repeat(count) }),
      );
      expect((await f.run('description')).map((v) => v.severity)).toEqual(
        count === 0 ? ['error'] : count < 40 || count > 160 ? ['warn'] : [],
      );
    },
  );
  it.each([9, 10, 11])('overview word count %i', async (count) => {
    const f = await fixture();
    await f.write(
      'index.md',
      page(
        `# Guide\n\n${Array(count).fill('reader').join(' ')}\n\n## Contents\n\n- [Guide](guide.md) - Complete description.\n`,
      ),
    );
    expect((await f.run('overview')).map((v) => v.severity)).toEqual(
      count < 10 ? ['warn'] : [],
    );
  });
  it('enforces map grammar, ancestor indexes, H1 and truncation with physical locations', async () => {
    const f = await fixture();
    await f.write(
      'index.md',
      index().replace('Complete description for this reader.', 'Cut off...'),
    );
    expect(await f.run('contents-description')).toEqual([
      {
        ruleId: 'contents-description',
        severity: 'error',
        path: 'index.md',
        line: 12,
        message: 'Contents description is truncated; finish the sentence.',
      },
    ]);
    await f.write('nested/deeper/guide.md', page());
    expect((await f.run('directory-index')).map((v) => v.path)).toEqual([
      'nested/deeper/index.md',
      'nested/index.md',
    ]);
    await f.write(
      'index.md',
      page('# Guide\n\n## Contents\n* [Guide](guide.md)\n'),
    );
    expect((await f.run('directory-index'))[0]!.message).toContain(
      'dash (-) bullet',
    );
    await f.write('guide.md', page('# Guide\n\n```md\n# Literal\n```\n'));
    expect(await f.run('h1')).toEqual([]);
    await f.write('guide.md', page('# Guide\n\n# Duplicate\n'));
    expect((await f.run('h1'))[0]!.message).toBe(
      'Expected one real H1; found 2.',
    );
  });
  it('mixed separators warn, while fenced examples stay literal', async () => {
    const f = await fixture();
    await f.write(
      'index.md',
      index(2).replace('Reader 1](guide.md) -', 'Reader 1](guide.md) —'),
    );
    expect((await f.run('contents-separator')).map((v) => v.severity)).toEqual([
      'warn',
      'warn',
    ]);
    await f.write(
      'index.md',
      `${index()}\n\`\`\`md\n- [Fake](bad.md) — Literal\n\`\`\`\n`,
    );
    expect(await f.run('contents-separator')).toEqual([]);
  });
  it('checks references, GFM headings, explicit/static HTML IDs and nested tabs but not fenced literal links', async () => {
    const f = await fixture();
    await f.write(
      'guide.md',
      page(
        '# Guide\n\n## Stable [#explicit]\n\n<a id="html-id"></a>\n\n[Okay][ref]\n\n[ref]: #explicit\n\n[HTML](#html-id)\n\n=== "Outer"\n\n    === "Inner"\n\n        [Broken](missing.md)\n\n```md\n[Literal](literal.md)\n```\n',
      ),
    );
    expect(await f.run('links')).toEqual([
      {
        ruleId: 'links',
        severity: 'error',
        path: 'guide.md',
        line: 22,
        message: 'Unresolved in-root link "missing.md".',
      },
    ]);
    await f.write('guide.md', page('# Guide\n\n[Bad anchor](#not-present)\n'));
    expect((await f.run('links'))[0]!.message).toBe(
      'Unresolved anchor "#not-present".',
    );
  });
  it('keeps excludes manifest-only, prunes nonreaders and applies reason-bearing bounded exceptions', async () => {
    const f = await fixture();
    await f.write('draft/deeper/bad.md', '# No description\n# Second\n');
    await f.config({}, { excludes: ['draft/**'] });
    expect((await f.run('description')).map((v) => v.path)).toContain(
      'draft/deeper/bad.md',
    );
    await f.config({}, { nonReaderPaths: ['draft/'] });
    expect(await f.run('description')).toEqual([]);
    await f.write(
      'guide.md',
      page(
        '# Guide\n\n[Outside](../../secret.md) .oat/project BL-123 ~/private\n',
      ),
    );
    expect(await f.run('links')).toEqual([]);
    expect((await f.run('provenance')).length).toBeGreaterThan(0);
    await f.config({
      exceptions: [
        {
          path: 'guide.md',
          rule: 'provenance',
          reason: 'Intentional decision pointer.',
        },
      ],
    });
    expect(await f.run('provenance')).toEqual([]);
    await f.config({ rules: { description: 'off' } });
    await f.write('guide.md', '# Guide\n');
    expect(await f.run('description')).toEqual([]);
  });
  it('preserves nested Markdown targets and matching-root isolation', async () => {
    const f = await fixture();
    await f.write('docs/index.md', index());
    await f.write('docs/guide.md', page());
    await f.config({}, { nonReaderPaths: ['docs/'] });
    expect(await f.run('h1')).toEqual([]);
    expect(
      (
        await checkDocs({
          cwd: f.root,
          targetDir: 'site/docs',
          rules: ['description'],
        })
      ).summary,
    ).toEqual({ errors: 0, warnings: 0 });
    await f.put('other/index.md', index());
    await f.put('other/guide.md', '# Other\n');
    expect(
      (
        await checkDocs({
          cwd: f.root,
          targetDir: 'other',
          rules: ['description'],
        })
      ).summary.errors,
    ).toBe(1);
  });
  it.each(['markdown', 'fumadocs'] as const)(
    'preserves %s config identity across real app/content symlink aliases',
    async (framework) => {
      const f = await fixture(framework);
      await symlink('site', join(f.root, 'alias'), 'dir');
      await f.write('guide.md', '# Guide\n');
      await f.write('draft/bad.md', '# Draft\n# Duplicate\n');
      if (framework === 'markdown') {
        // An explicit Markdown root must stay literal even with framework-looking children.
        await f.put('site/source.config.ts', '// marker only');
        await f.write('docs/bad.md', '# Nested\n# Duplicate\n');
      }
      for (const root of ['site', 'alias']) {
        await f.config(
          { rules: { description: 'off' } },
          { root, navOwner: 'nav-sync', nonReaderPaths: ['draft/', 'docs/'] },
        );
        for (const targetDir of framework === 'fumadocs'
          ? [undefined, 'site', 'alias', 'site/docs', 'alias/docs']
          : [undefined, 'site', 'alias']) {
          expect(
            (
              await checkDocs({
                cwd: f.root,
                targetDir,
                rules: ['description', 'h1'],
              })
            ).findings,
          ).toEqual([]);
        }
        if (framework === 'fumadocs') {
          await syncDocsNavigation({
            appRoot: f.app,
            nonReaderPaths: ['draft/', 'docs/'],
          });
          const metaPath = join(f.content, 'meta.json');
          const meta = JSON.parse(await readFile(metaPath, 'utf8'));
          await writeFile(
            metaPath,
            JSON.stringify({ ...meta, title: 'Custom title' }),
          );
          expect(
            (
              await checkDocs({
                cwd: f.root,
                targetDir: 'alias',
                rules: ['navigation'],
              })
            ).findings,
          ).toEqual([
            {
              ruleId: 'navigation',
              severity: 'error',
              path: 'meta.json',
              message: 'Generated navigation is stale; run oat docs nav sync.',
            },
          ]);
        }
      }
      await f.put('other/index.md', '# Other\n');
      expect(
        (
          await checkDocs({
            cwd: f.root,
            targetDir: 'other',
            rules: ['description'],
          })
        ).findings,
      ).toEqual([
        {
          ruleId: 'description',
          severity: 'error',
          path: 'index.md',
          line: 1,
          message: 'Frontmatter description is required and must be nonempty.',
        },
      ]);
    },
  );
  it('validates configurable ticket/milestone expressions and numeric overrides through config', async () => {
    const f = await fixture();
    await f.config({
      thresholds: { rootWarn: 1, rootError: 2 },
      provenance: {
        ticketPatterns: ['TASK-[0-9]+'],
        milestonePatterns: ['Wave [0-9]+'],
      },
    });
    await f.write('index.md', index(2));
    expect((await f.run('root-width'))[0]!.severity).toBe('warn');
    await f.write('guide.md', page('# Guide\n\nTASK-123 and Wave 7\n'));
    expect((await f.run('provenance'))[0]!.severity).toBe('warn');
    await expect(checkDocs({ cwd: f.root, rules: ['typo'] })).rejects.toThrow(
      'Unknown docs check rule "typo"',
    );
  });
});

describe('independent syntax policy and body diagnostics', () => {
  it('retains syntax and body findings across description/accessibility exceptions', async () => {
    const f = await fixture();
    await f.write(
      'guide.md',
      '---\ndescription: An existing complete description remains valid when another YAML field is malformed.\nbroken: [\n---\n\n# First\n# Second\n\n[Broken](missing.md)\n',
    );
    await f.write(
      'diagram.md',
      page('# Diagram\n\n```mermaid\nflowchart TD\nA[invalid\n```\n'),
    );
    await f.config({
      exceptions: [
        {
          path: 'guide.md',
          rule: 'description',
          reason: 'Metadata review is tracked separately.',
        },
        {
          path: 'diagram.md',
          rule: 'diagram-accessibility',
          reason: 'Accessible names are being authored.',
        },
      ],
    });
    const findings = await f.run();
    expect(
      findings
        .filter((v) =>
          ['frontmatter', 'h1', 'links', 'mermaid'].includes(v.ruleId),
        )
        .map(({ ruleId, severity, path, line }) => ({
          ruleId,
          severity,
          path,
          line,
        })),
    ).toEqual([
      { ruleId: 'mermaid', severity: 'error', path: 'diagram.md', line: 8 },
      { ruleId: 'frontmatter', severity: 'error', path: 'guide.md', line: 1 },
      { ruleId: 'h1', severity: 'error', path: 'guide.md', line: 7 },
      { ruleId: 'links', severity: 'error', path: 'guide.md', line: 9 },
    ]);
    expect(findings.find((v) => v.ruleId === 'frontmatter')?.message).toMatch(
      /^Invalid YAML frontmatter:/,
    );
    expect(findings.find((v) => v.ruleId === 'h1')?.message).toBe(
      'Expected one real H1; found 2.',
    );
    expect(findings.find((v) => v.ruleId === 'links')?.message).toBe(
      'Unresolved in-root link "missing.md".',
    );
    await f.config({ rules: { frontmatter: 'off' } });
    expect(await f.run('frontmatter', 'description')).toEqual([]);
    expect(
      (await f.run('h1', 'links')).map(({ ruleId, line }) => [ruleId, line]),
    ).toEqual([
      ['h1', 7],
      ['links', 9],
    ]);
    await f.write('guide.md', page());
    await f.write(
      'diagram.md',
      page(
        '# Diagram\n\n```mermaid\nflowchart TD\naccTitle: Reading\naccDescr: A reader opens a guide.\nA[Start] --> B[Guide]\n```\n',
      ),
    );
    expect(
      await f.run(
        'frontmatter',
        'h1',
        'links',
        'mermaid',
        'diagram-accessibility',
      ),
    ).toEqual([]);
  });
  it('reports unreadable source independently with relative configurable diagnostics', async () => {
    const f = await fixture();
    const path = join(f.content, 'guide.md');
    await chmod(path, 0o000);
    try {
      for (const severity of ['error', 'warn', 'off'] as const) {
        await f.config({
          rules: { frontmatter: severity },
          exceptions: [
            {
              path: 'guide.md',
              rule: 'description',
              reason: 'Metadata exception cannot hide source-read failures.',
            },
          ],
        });
        expect(await f.run('frontmatter', 'description')).toEqual(
          severity === 'off'
            ? []
            : [
                {
                  ruleId: 'frontmatter',
                  severity,
                  path: 'guide.md',
                  line: 1,
                  message:
                    'Cannot read documentation source (EACCES); check file permissions and readability.',
                },
              ],
        );
        expect(await f.run('description')).toEqual([]);
      }
    } finally {
      await chmod(path, 0o644);
    }
    await f.config();
    expect(await f.run('frontmatter', 'description')).toEqual([]);
  });
  it('separates mapping errors and accessible-name warnings from Mermaid syntax', async () => {
    const f = await fixture();
    await f.write(
      'guide.md',
      '---\n- not a mapping\n---\n\n# Guide\n\n```mermaid\nflowchart TD\nA --> B\n```\n',
    );
    expect(await f.run('frontmatter')).toEqual([
      {
        ruleId: 'frontmatter',
        severity: 'error',
        path: 'guide.md',
        line: 1,
        message: 'Frontmatter must be a YAML mapping',
      },
    ]);
    expect(await f.run('mermaid')).toEqual([]);
    expect(await f.run('diagram-accessibility')).toEqual([
      {
        ruleId: 'diagram-accessibility',
        severity: 'warn',
        path: 'guide.md',
        line: 7,
        message: 'Mermaid needs accTitle and accDescr for accessibility.',
      },
    ]);
  });
  it.each(['warn', 'off'] as const)(
    'honors intentional syntax %s through rule settings, exceptions and filters',
    async (severity) => {
      const f = await fixture();
      await f.write(
        'guide.md',
        '---\n- not a mapping\n---\n\n# First\n# Second\n\n```mermaid\nflowchart TD\nA[invalid\n```\n',
      );
      for (const policy of [
        { rules: { frontmatter: severity, mermaid: severity } },
        {
          exceptions: [
            {
              path: 'guide.md',
              rule: 'frontmatter' as const,
              severity,
              reason: 'Intentional syntax policy for this page.',
            },
            {
              path: 'guide.md',
              rule: 'mermaid' as const,
              severity,
              reason: 'Intentional syntax policy for this page.',
            },
          ],
        },
      ]) {
        await f.config(policy);
        const result = await checkDocs({
          cwd: f.root,
          rules: ['frontmatter', 'mermaid'],
        });
        expect(result.summary).toEqual({
          errors: 0,
          warnings: severity === 'warn' ? 2 : 0,
        });
        expect(
          result.findings.map(({ ruleId, severity: findingSeverity }) => [
            ruleId,
            findingSeverity,
          ]),
        ).toEqual(
          severity === 'warn'
            ? [
                ['frontmatter', 'warn'],
                ['mermaid', 'warn'],
              ]
            : [],
        );
        expect(await f.run('h1')).toEqual([
          {
            ruleId: 'h1',
            severity: 'error',
            path: 'guide.md',
            line: 6,
            message: 'Expected one real H1; found 2.',
          },
        ]);
        expect((await f.run('frontmatter')).length).toBe(
          severity === 'warn' ? 1 : 0,
        );
      }
    },
  );
});

describe('real framework navigation boundaries', () => {
  it.each(['hand-authored', undefined] as const)(
    '%s skips optional Fumadocs meta and reports malformed files without hiding later drift',
    async (navOwner) => {
      const f = await fixture('fumadocs');
      await f.config({}, { navOwner });
      await f.write(
        'index.md',
        `${index()}\n- [Absent](aa/index.md)\n- [Later](zz/index.md)\n`,
      );
      for (const section of ['aa', 'zz']) {
        await f.write(`${section}/index.md`, index());
        await f.write(`${section}/guide.md`, page());
      }
      await syncDocsNavigation({ appRoot: f.app });
      expect(await f.run('navigation')).toEqual([]);
      await rm(join(f.content, 'meta.json'));
      await rm(join(f.content, 'aa/meta.json'));
      expect(await f.run('navigation')).toEqual([]);
      await f.write('meta.json', '{"title":"Own root title"}');
      await f.write('aa/meta.json', '{"title":"Own section title"}');
      expect(await f.run('navigation')).toEqual([]);
      await f.write(
        'aa/meta.json',
        '{"title":"Own section title","pages":null}',
      );
      expect(await f.run('navigation')).toEqual([
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'aa/meta.json',
          line: 1,
          message:
            'meta.json "pages" must be an array of strings; fix it or remove "pages" to use folder order.',
        },
      ]);
      await f.write('aa/meta.json', '{"title":"Own section title"}');
      await f.write('zz/meta.json', '{"pages":["index"]}');
      expect(await f.run('navigation')).toEqual([
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'zz/meta.json',
          line: 1,
          message:
            'Missing reader page: "guide" is listed in index.md Contents but no meta.json pages entry reaches it; add it to pages or remove it from Contents.',
        },
      ]);
      await f.config({}, { navOwner: 'nav-sync' });
      expect(
        (await f.run('navigation')).map(({ path, message }) => [path, message]),
      ).toEqual([
        [
          'aa/meta.json',
          'Generated navigation is stale; run oat docs nav sync.',
        ],
        ['meta.json', 'Generated navigation is stale; run oat docs nav sync.'],
        [
          'zz/meta.json',
          'Generated navigation is stale; run oat docs nav sync.',
        ],
      ]);
      await f.config({}, { navOwner });
      await f.write('aa/meta.json', '{broken');
      const drift = {
        ruleId: 'navigation',
        severity: 'error',
        path: 'zz/meta.json',
        line: 1,
        message:
          'Missing reader page: "guide" is listed in index.md Contents but no meta.json pages entry reaches it; add it to pages or remove it from Contents.',
      };
      expect(await f.run('navigation')).toEqual([
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'aa/meta.json',
          message:
            'Cannot read or parse meta.json; check file permissions and JSON syntax.',
        },
        drift,
      ]);
      await f.write('aa/meta.json', '{"pages":["guide"]}');
      expect(await f.run('navigation')).toEqual([drift]);
      await f.write('zz/meta.json', '{"pages":["guide"]}');
      expect(await f.run('navigation')).toEqual([]);
    },
  );
  it.each(['hand-authored', undefined] as const)(
    '%s skips absent optional MkDocs nav while generated ownership stays strict',
    async (navOwner) => {
      const f = await fixture('mkdocs');
      await f.config({}, { navOwner });
      expect(await f.run('navigation')).toEqual([]);
      await f.config({}, { navOwner: 'nav-sync' });
      expect(await f.run('navigation')).toEqual([
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'mkdocs.yml',
          message: 'Generated navigation is stale; run oat docs nav sync.',
        },
      ]);
    },
  );
  it.each(['fumadocs', 'mkdocs'] as const)(
    '%s checks drift read-only and preserves hand-authored labels',
    async (framework) => {
      const f = await fixture(framework);
      await f.config({}, { navOwner: 'nav-sync' });
      await syncDocsNavigation({ appRoot: f.app });
      expect(await f.run('navigation')).toEqual([]);
      const path =
        framework === 'fumadocs' ? 'site/docs/meta.json' : 'site/mkdocs.yml';
      const original = await readFile(join(f.root, path), 'utf8');
      await f.put(
        path,
        framework === 'fumadocs'
          ? original.replace('"Guide"', '"Custom title"')
          : original.replace('Reader 0:', 'My own label:'),
      );
      await f.config({}, { navOwner: 'hand-authored' });
      expect(await f.run('navigation')).toEqual([]);
      await f.put(
        path,
        framework === 'fumadocs'
          ? '{"pages":["index"]}'
          : 'site_name: Test\nnav:\n  - Home: index.md\n',
      );
      const before = await readFile(join(f.root, path), 'utf8');
      expect((await f.run('navigation'))[0]!.severity).toBe('error');
      expect(await readFile(join(f.root, path), 'utf8')).toBe(before);
    },
  );
});

describe('contributing commands resolve actual literal package contexts', () => {
  it('accepts installed pnpm shorthand binaries while explicit run remains script-only', async () => {
    const f = await fixture();
    const { packageManager } = JSON.parse(
      await readFile(
        fileURLToPath(
          new URL('../../../../../../package.json', import.meta.url),
        ),
        'utf8',
      ),
    ) as { packageManager: string };
    const manifest = JSON.parse(
      await readFile(join(f.root, 'package.json'), 'utf8'),
    ) as Record<string, unknown>;
    // Corepack would otherwise pick its own pnpm for a temp root outside the repo.
    await f.put(
      'package.json',
      JSON.stringify({ ...manifest, packageManager }),
    );
    await f.put('pnpm-workspace.yaml', 'packages:\n  - packages/*\n');
    await f.put(
      'packages/member/package.json',
      JSON.stringify({ name: 'member' }),
    );
    const binary = fileURLToPath(
      new URL('./bin/tsc', import.meta.resolve('typescript-7/package.json')),
    );
    for (const base of ['', 'packages/member/']) {
      await mkdir(join(f.root, base, 'node_modules/.bin'), { recursive: true });
      await symlink(binary, join(f.root, base, 'node_modules/.bin/tsc'));
    }
    expect(
      (await exec('pnpm', ['tsc', '--version'], { cwd: f.root })).stdout,
    ).toMatch(/^Version /);
    await f.write(
      'contributing.md',
      page(
        '# Contributing\n\n```bash\npnpm tsc --version\npnpm --filter member tsc --version\ncd packages/member\npnpm tsc --version\n```\n',
      ),
    );
    expect(await f.run('commands')).toEqual([]);
    // Workspace-root bins remain available to a member without its own bin.
    await rm(join(f.root, 'packages/member/node_modules/.bin/tsc'));
    expect(await f.run('commands')).toEqual([]);
    await f.write(
      'contributing.md',
      page(
        '# Contributing\n\n```bash\npnpm run tsc\nnpm run tsc\npnpm missing-tool\npnpm --filter member run tsc\n```\n',
      ),
    );
    expect(await f.run('commands')).toEqual([
      {
        ruleId: 'commands',
        severity: 'error',
        path: 'contributing.md',
        line: 9,
        message: 'Script "tsc" does not exist in package.json.',
      },
      {
        ruleId: 'commands',
        severity: 'error',
        path: 'contributing.md',
        line: 10,
        message: 'Script "tsc" does not exist in package.json.',
      },
      {
        ruleId: 'commands',
        severity: 'error',
        path: 'contributing.md',
        line: 11,
        message: 'Script "missing-tool" does not exist in package.json.',
      },
      {
        ruleId: 'commands',
        severity: 'error',
        path: 'contributing.md',
        line: 12,
        message: 'Script "tsc" does not exist in packages/member/package.json.',
      },
    ]);
    await f.write(
      'contributing.md',
      page(
        '# Contributing\n\n```bash\npnpm --filter member tsc --version\n```\n',
      ),
    );
    await rm(join(f.root, 'node_modules/.bin/tsc'));
    expect(await f.run('commands')).toEqual([
      {
        ruleId: 'commands',
        severity: 'error',
        path: 'contributing.md',
        line: 9,
        message: 'Script "tsc" does not exist in packages/member/package.json.',
      },
    ]);
  });
  it.each([
    ['apps/*', 'apps/manual', 'manual'],
    ['apps/*', 'apps/site', 'site'],
    ['apps/*', 'apps/out', 'out'],
    ['apps/*', 'apps/dist', 'dist'],
    ['libs/**', 'libs/group/nested', 'nested-deep'],
    ['packages/*/*', 'packages/group/nested', 'nested-pair'],
  ] as const)(
    'resolves declared %s commands with cd/filter and retains missing-script diagnostics',
    async (pattern, memberPath, member) => {
      const f = await fixture();
      await f.put('pnpm-workspace.yaml', `packages:\n  - "${pattern}"\n`);
      await f.put(
        `${memberPath}/package.json`,
        JSON.stringify({
          name: member,
          scripts: {
            preview: 'node preview.mjs',
            placeholder: 'echo not validation',
          },
        }),
      );
      await f.write(
        'contributing.md',
        page(
          '# Contributing\n\n```bash\ncd MEMBER_PATH\npnpm preview\npnpm -w build\npnpm --filter MEMBER run preview\npnpm --dir MEMBER_RETURN preview\npnpm install\npnpm exec made-up-tool\npnpm <script>\n```\n'
            .replaceAll('MEMBER_PATH', memberPath)
            .replaceAll(
              'MEMBER_RETURN',
              '../'.repeat(memberPath.split('/').length) + memberPath,
            )
            .replaceAll('MEMBER', member),
        ),
      );
      expect(await f.run('commands')).toEqual([]);
      await f.write(
        'contributing.md',
        page(
          '# Contributing\n\n```bash\ncd MEMBER_PATH\npnpm preview\npnpm missing-in-app\npnpm --filter MEMBER preview\npnpm --filter MEMBER missing-in-app\n```\n'
            .replaceAll('MEMBER_PATH', memberPath)
            .replaceAll('MEMBER', member),
        ),
      );
      expect(await f.run('commands')).toEqual([
        {
          ruleId: 'commands',
          severity: 'error',
          path: 'contributing.md',
          line: 11,
          message: `Script "missing-in-app" does not exist in ${memberPath}/package.json.`,
        },
        {
          ruleId: 'commands',
          severity: 'error',
          path: 'contributing.md',
          line: 13,
          message: `Script "missing-in-app" does not exist in ${memberPath}/package.json.`,
        },
      ]);

      await f.write(
        'contributing.md',
        page(
          '# Contributing\n\n```bash\npnpm missing\nnpm run missing\npnpm echo\ncd "$UNRESOLVED"\npnpm build\n```\n',
        ),
      );
      expect(
        (await f.run('commands')).map((v) => [v.severity, v.message]),
      ).toEqual([
        ['error', 'Script "missing" does not exist in package.json.'],
        ['error', 'Script "missing" does not exist in package.json.'],
        ['warn', 'Script "echo" is an echo stub in package.json.'],
        [
          'error',
          'Cannot resolve package context for pnpm build; use literal cd, -w or --filter.',
        ],
      ]);
    },
  );
  it('keeps workspace exclusions, hidden directories and node_modules outside command contexts', async () => {
    const f = await fixture();
    await f.put(
      'pnpm-workspace.yaml',
      'packages:\n  - apps/*\n  - "!apps/excluded"\n',
    );
    for (const member of ['excluded', '.hidden', 'node_modules'])
      await f.put(
        `apps/${member}/package.json`,
        JSON.stringify({
          name: member,
          scripts: { preview: 'node preview.mjs' },
        }),
      );
    await f.write(
      'contributing.md',
      page(
        '# Contributing\n\n```bash\npnpm --filter excluded preview\npnpm --filter .hidden preview\npnpm --filter node_modules preview\n```\n',
      ),
    );
    expect(
      (await f.run('commands')).map(({ line, message }) => [line, message]),
    ).toEqual([
      [
        9,
        'Cannot resolve package context for pnpm preview (--filter excluded); use literal cd, -w or --filter.',
      ],
      [
        10,
        'Cannot resolve package context for pnpm preview (--filter .hidden); use literal cd, -w or --filter.',
      ],
      [
        11,
        'Cannot resolve package context for pnpm preview (--filter node_modules); use literal cd, -w or --filter.',
      ],
    ]);
  });
  it('reports physical lines for labeled and language-less fences, indented and inline commands', async () => {
    const f = await fixture();
    await f.write(
      'contributing.md',
      page(
        '# Contributing\n\n```bash\npnpm missing-labeled\n```\n\n```\npnpm missing-unlabeled\n```\n\n    pnpm missing-indented\n\n`pnpm missing-inline`\n',
      ),
    );
    expect(
      (await f.run('commands')).map(({ line, message }) => [line, message]),
    ).toEqual([
      [9, 'Script "missing-labeled" does not exist in package.json.'],
      [13, 'Script "missing-unlabeled" does not exist in package.json.'],
      [16, 'Script "missing-indented" does not exist in package.json.'],
      [18, 'Script "missing-inline" does not exist in package.json.'],
    ]);
  });
});
const validMermaid =
  'flowchart TD\n  accTitle: Reader journey\n  accDescr: A reader starts and finishes the journey.\n  A[Start] --> B[Finish]';
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc"><title id="title">Reader journey</title><desc id="desc">Start connects to finish.</desc><path d="M0 0"/></svg>';
function diagram(source = validMermaid): string {
  return page(
    `# Guide\n\n## Journey\n\nThe reader follows this diagram from the first step through the final result.\n\n=== "Diagram"\n\n    ![Reader journey diagram](/diagrams/journey-light.svg)\n    ![Reader journey diagram](/diagrams/journey-dark.svg)\n\n=== "Mermaid source"\n\n    \`\`\`mermaid\n${source
      .split('\n')
      .map((l) => `    ${l}`)
      .join('\n')}\n    \`\`\`\n`,
  );
}
async function pairedFixture() {
  const f = await fixture('fumadocs');
  await f.write('guide.md', diagram());
  await f.put('site/public/diagrams/journey-light.svg', svg);
  await f.put('site/public/diagrams/journey-dark.svg', svg);
  return f;
}
describe('installed Mermaid parser, actual SVG files and Git changes', () => {
  it('parses tabbed Mermaid, rejects invalid grammar and warns for missing accessible names', async () => {
    const f = await pairedFixture();
    expect(
      await f.run(
        'mermaid',
        'diagram-pairs',
        'diagram-accessibility',
        'image-alt',
      ),
    ).toEqual([]);
    await f.write('guide.md', diagram('flowchart TD\n  A -->'));
    expect(
      (await f.run('mermaid')).some(
        (v) =>
          v.severity === 'error' && v.message.startsWith('Invalid Mermaid:'),
      ),
    ).toBe(true);
    await f.write('guide.md', diagram('flowchart TD\n A --> B'));
    expect(
      (await f.run('diagram-accessibility')).map((v) => v.severity),
    ).toEqual(['warn']);
  });
  it('validates pair membership, SVG accessibility and leaves logos alone', async () => {
    const f = await pairedFixture();
    await rm(join(f.app, 'public/diagrams/journey-dark.svg'));
    expect(
      (await f.run('diagram-pairs')).some((v) => v.message.includes('sibling')),
    ).toBe(true);
    await f.put('site/public/diagrams/journey-dark.svg', '<svg/>');
    expect(
      (await f.run('diagram-accessibility')).map((v) => v.severity),
    ).toEqual(['error']);
    await f.put('site/public/logo.svg', '<svg/>');
    expect((await f.run('diagram-accessibility')).length).toBe(1);
    await f.put('site/public/diagrams/journey-dark.svg', svg);
    await f.write('guide.md', diagram().replace(/.*journey-dark\.svg.*\n/, ''));
    expect(
      (await f.run('diagram-pairs')).some((v) =>
        v.message.includes('reference both'),
      ),
    ).toBe(true);
  });
  it.each([154, 155, 156])('alt boundary %i', async (count) => {
    const f = await pairedFixture();
    await f.write(
      'guide.md',
      page(
        `# Guide\n\n![A ${'b'.repeat(count - 2)}](/diagrams/journey-light.svg)\n`,
      ),
    );
    expect((await f.run('image-alt')).map((v) => v.severity)).toEqual(
      count > 155 ? ['warn'] : [],
    );
  });
  it('reports unavailable Git comparison and then proves committed, staged, unstaged and untracked pairs', async () => {
    const f = await pairedFixture();
    expect((await f.run('diagram-freshness'))[0]!.message).toContain(
      'unverified',
    );
    const git = async (...args: string[]) =>
      exec('git', ['-C', f.root, ...args], {
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'Fixture',
          GIT_AUTHOR_EMAIL: 'fixture@example.test',
          GIT_COMMITTER_NAME: 'Fixture',
          GIT_COMMITTER_EMAIL: 'fixture@example.test',
        },
      });
    await git('add', '.');
    await git(
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--quiet',
      '-m',
      'fixture base',
    );
    await git('branch', 'comparison-base');
    await f.config({ diagramBaseRef: 'comparison-base' });
    expect(await f.run('diagram-freshness')).toEqual([]);
    await f.write('guide.md', diagram(validMermaid.replace('Finish', 'Done')));
    expect(
      await f.run('diagram-freshness'),
      (await git('diff', '--name-only', 'HEAD')).stdout,
    ).toMatchObject([{ message: expect.stringContaining('without both') }]);
    await git('add', '.');
    await git(
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--quiet',
      '-m',
      'source changed',
    );
    expect((await f.run('diagram-freshness'))[0]!.severity).toBe('warn');
    await f.put(
      'site/public/diagrams/journey-light.svg',
      svg.replace('finish', 'done'),
    );
    await git('add', 'site/public/diagrams/journey-light.svg');
    expect((await f.run('diagram-freshness'))[0]!.severity).toBe('warn');
    await f.put(
      'site/public/diagrams/journey-dark.svg',
      svg.replace('finish', 'done'),
    );
    expect(await f.run('diagram-freshness')).toEqual([]);
    await git('add', '.');
    await git(
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--quiet',
      '-m',
      'pair caught up',
    );
    expect(await f.run('diagram-freshness')).toEqual([]);
    await f.write('new.md', diagram().replaceAll('journey-', 'fresh-'));
    await f.put('site/public/diagrams/fresh-light.svg', svg);
    await f.put('site/public/diagrams/fresh-dark.svg', svg);
    expect(await f.run('diagram-freshness')).toEqual([]);
    await rm(join(f.app, 'public/diagrams/fresh-dark.svg'));
    expect((await f.run('diagram-freshness'))[0]!.severity).toBe('warn');
  });
});

describe('parser/runtime and boundary composition', () => {
  it('accepts labeled class/sequence/HTML diagrams repeatedly, restores globals and keeps fenced examples literal', async () => {
    const f = await fixture();
    const windowBefore = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const documentBefore = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    for (const source of [
      'classDiagram\naccTitle: Animals\naccDescr: The animal hierarchy.\nAnimal <|-- Duck\nAnimal : +int age',
      'sequenceDiagram\naccTitle: Greeting\naccDescr: Alice greets Bob.\nAlice->>Bob: Hello',
      'flowchart TD\naccTitle: Guide\naccDescr: A guide.\nA["<b>Start</b>"] --> B[Finish]',
    ]) {
      await f.write(
        'guide.md',
        page(
          `# Guide\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n\`\`\`markdown\n\`\`mermaid\ninvalid literal example\n\`\`\n\`\`\`\n`,
        ),
      );
      expect(await f.run('mermaid')).toEqual([]);
    }
    expect(Object.getOwnPropertyDescriptor(globalThis, 'window')).toEqual(
      windowBefore,
    );
    expect(Object.getOwnPropertyDescriptor(globalThis, 'document')).toEqual(
      documentBefore,
    );
  });
  it('reports missing long descriptions and accepts associated visible HTML descriptions', async () => {
    const f = await pairedFixture();
    await f.write(
      'guide.md',
      page(
        '# Guide\n\n![Reader journey diagram](/diagrams/journey-light.svg)\n![Reader journey diagram](/diagrams/journey-dark.svg)\n',
      ),
    );
    expect(
      (await f.run('diagram-accessibility')).map((v) => v.severity),
    ).toEqual(['warn', 'warn']);
    await f.write(
      'guide.md',
      page(
        '# Guide\n\n<img src="/diagrams/journey-light.svg" alt="Reader journey diagram" aria-describedby="journey-desc">\n\n<p id="journey-desc">The reader starts with a guide and follows the arrow to the finished result.</p>\n',
      ),
    );
    expect(await f.run('diagram-accessibility')).toEqual([]);
  });
  it('applies exclusions to explicit matching framework content roots while preserving unrelated roots', async () => {
    const f = await fixture('fumadocs');
    await f.write('draft/bad.md', '# Draft\n');
    await f.config({}, { nonReaderPaths: ['draft/'] });
    expect(
      (
        await checkDocs({
          cwd: f.root,
          targetDir: 'site/docs',
          rules: ['description'],
        })
      ).summary.errors,
    ).toBe(0);
  });
  it.each(['hand-authored', undefined] as const)(
    '%s compares MkDocs landings by path and preserves groups and order',
    async (navOwner) => {
      const f = await fixture('mkdocs');
      await f.config({}, { navOwner });
      await f.write(
        'index.md',
        index(1, true).replace(
          '- [Reader 0](guide.md)',
          '- [Section](section/index.md)',
        ),
      );
      await f.write('section/index.md', `${index()}\n- [Second](second.md)\n`);
      await f.write('section/guide.md', page());
      await f.write('section/second.md', page());
      await syncDocsNavigation({ appRoot: f.app });
      const path = join(f.app, 'mkdocs.yml');
      const original = await readFile(path, 'utf8');
      await writeFile(
        path,
        original
          .replace('Section:', 'Custom section:')
          .replace('Reader 0:', 'Custom reader:'),
      );
      expect(await f.run('navigation')).toEqual([]);
      const labeled =
        'site_name: Fixture\nnav:\n  - Welcome: index.md\n  - Readers:\n      - Custom section:\n          - Overview: section/index.md\n          - Custom reader: section/guide.md\n          - Second: section/second.md\n';
      await writeFile(path, labeled);
      expect(await f.run('navigation')).toEqual([]);
      // Group labels and nesting are presentation; membership and order are not.
      await writeFile(path, labeled.replace('Readers:', 'Different group:'));
      expect(await f.run('navigation')).toEqual([]);
      for (const [invalid, message] of [
        [
          labeled.replace('          - Second: section/second.md\n', ''),
          'Missing reader page: "section/second.md" is listed in index.md Contents but not in mkdocs.yml nav; add it to nav or remove it from Contents.',
        ],
        [
          labeled.replace(
            '          - Custom reader: section/guide.md\n          - Second: section/second.md',
            '          - Second: section/second.md\n          - Custom reader: section/guide.md',
          ),
          'Order differs from authored Contents in section/: expected section/index.md, section/guide.md, section/second.md; found section/index.md, section/second.md, section/guide.md. Reorder nav or Contents (section labels and links are not compared).',
        ],
      ] as const) {
        await writeFile(path, invalid);
        expect(await f.run('navigation')).toEqual([
          {
            ruleId: 'navigation',
            severity: 'error',
            path: 'mkdocs.yml',
            line: 2,
            message,
          },
        ]);
      }
      await writeFile(path, labeled);
      await f.config({}, { navOwner: 'nav-sync' });
      expect(await f.run('navigation')).toEqual([
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'mkdocs.yml',
          message: 'Generated navigation is stale; run oat docs nav sync.',
        },
      ]);
    },
  );
  it('uses real groups and preserves page/folder collision identity in hand-authored Fumadocs navigation', async () => {
    const f = await fixture('fumadocs');
    await f.write(
      'index.md',
      index(1, true).replace(
        '- [Reader 0](guide.md)',
        '- [Section](guide/index.md)\n- [Page](guide.md)',
      ),
    );
    await f.write('guide/index.md', index());
    await f.write('guide/guide.md', page());
    await syncDocsNavigation({ appRoot: f.app });
    const metaPath = join(f.content, 'meta.json');
    const meta = JSON.parse(await readFile(metaPath, 'utf8'));
    meta.title = 'Custom';
    meta.pages = meta.pages.map((p: string) =>
      p.replace(/^\[[^\]]+\]/, '[Custom link]'),
    );
    await writeFile(metaPath, JSON.stringify(meta));
    expect(await f.run('navigation')).toEqual([]);
    meta.pages.reverse();
    await writeFile(metaPath, JSON.stringify(meta));
    expect((await f.run('navigation'))[0]!.severity).toBe('error');
  });
  it('does not allow another diagram tab group to satisfy changed Mermaid pairs', async () => {
    const f = await pairedFixture();
    const second = diagram(
      validMermaid.replace('A[Start] --> B[Finish]', 'X[Start] --> Y[Finish]'),
    )
      .slice(diagram().indexOf('## Journey'))
      .replace('## Journey', '## Separate diagram')
      .replaceAll('journey-', 'other-');
    await f.write('guide.md', `${diagram()}\n${second}`);
    for (const theme of ['light', 'dark'])
      await f.put(`site/public/diagrams/other-${theme}.svg`, svg);
    const git = async (...args: string[]) =>
      exec('git', ['-C', f.root, ...args], {
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'Fixture',
          GIT_AUTHOR_EMAIL: 'fixture@example.test',
          GIT_COMMITTER_NAME: 'Fixture',
          GIT_COMMITTER_EMAIL: 'fixture@example.test',
        },
      });
    await f.config({ diagramBaseRef: 'comparison-base' });
    await git('add', '.');
    await git(
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--quiet',
      '-m',
      'two complete diagram groups',
    );
    await git('branch', 'comparison-base');
    expect(await f.run('diagram-freshness')).toEqual([]);
    await f.write(
      'guide.md',
      `${diagram(validMermaid.replace('Finish', 'Done'))}\n${second}`,
    );
    for (const theme of ['light', 'dark'])
      await f.put(
        `site/public/diagrams/other-${theme}.svg`,
        svg.replace('finish', 'done'),
      );
    expect(await f.run('diagram-freshness')).toEqual([
      {
        ruleId: 'diagram-freshness',
        severity: 'warn',
        path: 'guide.md',
        line: 19,
        message:
          'Mermaid source changed without both associated SVGs in the same committed/working-tree change.',
      },
    ]);
    // Only the matching pair can satisfy A; restore unrelated B to its base bytes.
    for (const theme of ['light', 'dark']) {
      await f.put(`site/public/diagrams/other-${theme}.svg`, svg);
      await f.put(
        `site/public/diagrams/journey-${theme}.svg`,
        svg.replace('finish', 'done'),
      );
    }
    expect(await f.run('diagram-freshness')).toEqual([]);
  });
});

function contentsPage(title: string, entries: string[]): string {
  return page(
    `# ${title}\n\nA useful overview explains this section and helps its readers choose their next destination.\n\n## Contents\n\n${entries.join('\n')}\n`,
    { title },
  );
}
const pretty = (pages: string[]): string =>
  `${JSON.stringify({ pages }, null, 2)}\n`;

describe('hand-authored navigation membership, not generator equality', () => {
  it.each(['hand-authored', undefined] as const)(
    '%s Fumadocs sidebars tolerate separators, borrows, links and labels but report missing, dangling and reordered pages',
    async (navOwner) => {
      const f = await fixture('fumadocs');
      await f.config({}, { navOwner });
      await f.write(
        'index.md',
        contentsPage('Home', [
          '### Start',
          '',
          '- [Guide](guide.md) - Complete description for this reader.',
          '- [Install](install.md) - Complete description for this reader.',
          '',
          '### Sections',
          '',
          '- [Section](section/index.md) - Complete description for this reader.',
        ]),
      );
      await f.write('install.md', page());
      await f.write(
        'section/index.md',
        contentsPage('Section', [
          '- [Usage](usage.md) - Complete description for this reader.',
          '- [Extra](extra.md) - Complete description for this reader.',
        ]),
      );
      await f.write('section/usage.md', page());
      await f.write('section/extra.md', page());
      // Hand-authored shape: a link instead of "index", a separator whose label
      // and casing differ from the Contents group, an external link, and a
      // root page borrowed into another folder's sidebar.
      await f.write(
        'meta.json',
        pretty([
          '[Home](/)',
          '---START HERE---',
          'guide',
          'section',
          '[Source](https://example.com/repo)',
        ]),
      );
      await f.write(
        'section/meta.json',
        pretty(['usage', 'extra', '../install']),
      );
      expect(await f.run('navigation')).toEqual([]);

      await f.write('section/meta.json', pretty(['...']));
      expect(await f.run('navigation')).toEqual([
        // The rest entry shows extra/usage, but install is no longer borrowed.
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'meta.json',
          line: 2,
          message:
            'Missing reader page: "install" is listed in index.md Contents but no meta.json pages entry reaches it; add it to pages or remove it from Contents.',
        },
      ]);

      await f.write(
        'section/meta.json',
        pretty(['usage', 'ghost', '../install']),
      );
      expect(await f.run('navigation')).toEqual([
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'section/meta.json',
          line: 2,
          message:
            'Missing reader page: "extra" is listed in index.md Contents but no meta.json pages entry reaches it; add it to pages or remove it from Contents.',
        },
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'section/meta.json',
          line: 4,
          message:
            'Missing target: pages entry "ghost" names no page or folder; remove it or restore the page.',
        },
      ]);

      await f.write(
        'section/meta.json',
        pretty(['extra', '../install', 'usage']),
      );
      expect(await f.run('navigation')).toEqual([
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'section/meta.json',
          line: 2,
          message:
            'Order differs from authored Contents: expected usage, extra; found extra, usage. Reorder pages or Contents (separators, labels and links are not compared).',
        },
      ]);
    },
  );
  it('hand-authored MkDocs nav compares page membership, not section labels or links', async () => {
    const f = await fixture('mkdocs');
    await f.config({}, { navOwner: 'hand-authored' });
    await f.put(
      'site/mkdocs.yml',
      'site_name: Fixture\nnav:\n  - Home: index.md\n  - My own section:\n      - guide.md\n  - Source: https://example.com/repo\n',
    );
    expect(await f.run('navigation')).toEqual([]);
    await f.put(
      'site/mkdocs.yml',
      'site_name: Fixture\nnav:\n  - Home: index.md\n  - guide.md\n  - ghost.md\n',
    );
    expect(await f.run('navigation')).toEqual([
      {
        ruleId: 'navigation',
        severity: 'error',
        path: 'mkdocs.yml',
        line: 5,
        message:
          'Missing target: nav entry "ghost.md" names no page; remove it or restore the page.',
      },
    ]);
  });
});

describe('framework app contributing commands use the app package first', () => {
  it('resolves app scripts, falls back to repository-root scripts and names both manifests when missing', async () => {
    const f = await fixture('fumadocs');
    await f.put(
      'site/package.json',
      JSON.stringify({
        name: 'site',
        scripts: { dev: 'next dev', build: 'next build' },
      }),
    );
    await f.write(
      'contributing.md',
      page(
        '# Contributing\n\n```bash\npnpm dev\npnpm test\npnpm missing\ncd site\npnpm dev\n```\n',
      ),
    );
    expect(await f.run('commands')).toEqual([
      {
        ruleId: 'commands',
        severity: 'error',
        path: 'contributing.md',
        line: 11,
        message:
          'Script "missing" does not exist in site/package.json (app root) or package.json (repository root).',
      },
    ]);
  });
});

describe('explicit targets that differ from the configured documentation root', () => {
  it('never walks node_modules or hidden directories and explains the mode it used', async () => {
    const f = await fixture('fumadocs');
    for (const junk of [
      'node_modules/pkg/readme.md',
      'site/node_modules/pkg/index.md',
      '.cache/notes.md',
    ])
      await f.put(junk, '# Junk\n');
    const notices: string[] = [];
    const repoWide = await checkDocs({
      cwd: f.root,
      targetDir: '.',
      onNotice: (message) => notices.push(message),
    });
    expect(
      repoWide.findings.filter(
        (finding) =>
          /(?:^|\/)node_modules\//.test(finding.path) ||
          finding.path.startsWith('.cache/'),
      ),
    ).toEqual([]);
    expect(notices).toEqual([
      'Notice: --target-dir . is not the configured documentation.root (site); checking it as a literal Markdown root without the configured documentation policy. Omit --target-dir to check site.',
    ]);
    notices.length = 0;
    await checkDocs({
      cwd: f.root,
      targetDir: 'site/docs',
      onNotice: (message) => notices.push(message),
    });
    expect(notices).toEqual([
      'Notice: --target-dir site/docs is the content directory of the configured fumadocs app site; it is checked as Markdown, so navigation is skipped. Pass --target-dir site to include navigation.',
    ]);
    notices.length = 0;
    await checkDocs({
      cwd: f.root,
      targetDir: 'site',
      onNotice: (message) => notices.push(message),
    });
    expect(notices).toEqual([]);
  });
});
