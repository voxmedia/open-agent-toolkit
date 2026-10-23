import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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

describe('real framework navigation boundaries', () => {
  it.each(['hand-authored', undefined] as const)(
    '%s skips missing optional Fumadocs meta and still reports later drift',
    async (navOwner) => {
      const f = await fixture('fumadocs');
      await f.config({}, { navOwner });
      await f.write(
        'index.md',
        `${index()}\n- [Absent](absent/index.md)\n- [Later](later/index.md)\n`,
      );
      for (const section of ['absent', 'later']) {
        await f.write(`${section}/index.md`, index());
        await f.write(`${section}/guide.md`, page());
      }
      await syncDocsNavigation({ appRoot: f.app });
      expect(await f.run('navigation')).toEqual([]);
      await rm(join(f.content, 'meta.json'));
      await rm(join(f.content, 'absent/meta.json'));
      expect(await f.run('navigation')).toEqual([]);
      await f.write('later/meta.json', '{"pages":["index"]}');
      expect(await f.run('navigation')).toEqual([
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'later/meta.json',
          message:
            'Navigation membership/order differs from authored Contents; update pages or Contents.',
        },
      ]);
      await f.config({}, { navOwner: 'nav-sync' });
      expect(
        (await f.run('navigation')).map(({ path, message }) => [path, message]),
      ).toEqual([
        [
          'absent/meta.json',
          'Generated navigation is stale; run oat docs nav sync.',
        ],
        [
          'later/meta.json',
          'Generated navigation is stale; run oat docs nav sync.',
        ],
        ['meta.json', 'Generated navigation is stale; run oat docs nav sync.'],
      ]);
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
  it.each(['manual', 'site', 'out', 'dist'])(
    'resolves declared %s commands with cd/filter and retains missing-script diagnostics',
    async (member) => {
      const f = await fixture();
      await f.put('pnpm-workspace.yaml', 'packages:\n  - apps/*\n');
      await f.put(
        `apps/${member}/package.json`,
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
          '# Contributing\n\n```bash\ncd apps/MEMBER\npnpm preview\npnpm -w build\npnpm --filter MEMBER run preview\npnpm --dir ../../apps/MEMBER preview\npnpm install\npnpm exec made-up-tool\npnpm <script>\n```\n'.replaceAll(
            'MEMBER',
            member,
          ),
        ),
      );
      expect(await f.run('commands')).toEqual([]);
      await f.write(
        'contributing.md',
        page(
          '# Contributing\n\n```bash\ncd apps/MEMBER\npnpm preview\npnpm missing-in-app\npnpm --filter MEMBER preview\npnpm --filter MEMBER missing-in-app\n```\n'.replaceAll(
            'MEMBER',
            member,
          ),
        ),
      );
      expect(await f.run('commands')).toEqual([
        {
          ruleId: 'commands',
          severity: 'error',
          path: 'contributing.md',
          line: 11,
          message: `Script "missing-in-app" does not exist in apps/${member}/package.json.`,
        },
        {
          ruleId: 'commands',
          severity: 'error',
          path: 'contributing.md',
          line: 13,
          message: `Script "missing-in-app" does not exist in apps/${member}/package.json.`,
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
    expect((await f.run('mermaid')).map((v) => v.severity)).toEqual(['warn']);
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
      const drift = [
        {
          ruleId: 'navigation',
          severity: 'error',
          path: 'mkdocs.yml',
          message:
            'Navigation membership/order differs from authored Contents; update nav or Contents.',
        },
      ];
      for (const invalid of [
        labeled.replace('Readers:', 'Different group:'),
        labeled.replace('          - Second: section/second.md\n', ''),
        labeled.replace(
          '          - Custom reader: section/guide.md\n          - Second: section/second.md',
          '          - Second: section/second.md\n          - Custom reader: section/guide.md',
        ),
      ]) {
        await writeFile(path, invalid);
        expect(await f.run('navigation')).toEqual(drift);
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
    const first = diagram();
    await f.write(
      'guide.md',
      `${first}\n## Separate diagram\n\n=== "Source"\n\n    \`\`\`mermaid\n    flowchart TD\n    X --> Y\n    \`\`\`\n`,
    );
    // The separate source has no associated SVG pair and cannot make the first group stale.
    expect(
      (await f.run('diagram-freshness')).filter((v) =>
        v.message.includes('unverified'),
      ).length,
    ).toBe(1);
  });
});
