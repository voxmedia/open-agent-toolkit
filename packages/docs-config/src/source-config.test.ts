import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import { createSourceConfig } from './source-config.js';

describe('createSourceConfig', () => {
  it('composes source plugins so tabbed links reach link rewriting', async () => {
    // This guards the separate source-config entry point, not parser behavior.
    const processor = unified()
      .use(remarkParse)
      .use(createSourceConfig().remarkPlugins);
    const markdown = '=== "Guide"\n\n    [Read](guide.md)';
    const tree = await processor.run(processor.parse(markdown), {
      path: '/repo/docs/index.md',
      value: markdown,
    });
    expect(tree).toMatchObject({
      children: [
        {
          name: 'Tabs',
          children: [
            {
              name: 'Tab',
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'link', url: './guide/' }],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('should include remarkTabs in remarkPlugins', () => {
    const config = createSourceConfig();

    expect(config.remarkPlugins.length).toBeGreaterThanOrEqual(1);

    // Check that remarkTabs is in the array (by function name)
    const pluginNames = config.remarkPlugins.map((p) =>
      typeof p === 'function' ? p.name : String(p),
    );
    expect(pluginNames).toContain('remarkTabs');
  });

  it('should include remarkGithubBlockquoteAlert in remarkPlugins', () => {
    const config = createSourceConfig();

    const pluginNames = config.remarkPlugins.map((p) =>
      typeof p === 'function' ? p.name : String(p),
    );
    expect(pluginNames).toContain('remarkAlert');
  });

  it('should include remarkMermaid in remarkPlugins', () => {
    const config = createSourceConfig();

    const pluginNames = config.remarkPlugins.map((p) =>
      typeof p === 'function' ? p.name : String(p),
    );
    expect(pluginNames).toContain('remarkMermaid');
  });

  it('should set content directory to ./docs', () => {
    const config = createSourceConfig();

    expect(config.contentDir).toBe('./docs');
  });

  it('should include search config from createSearchConfig', () => {
    const config = createSourceConfig();

    expect(config.search).toBeDefined();
    expect(config.search.engine).toBe('flexsearch');
    expect(config.search.type).toBe('static');
  });
});

// External boundary provenance: installed fumadocs-mdx 14.3.2 defineDocs,
// schema, Next collection emitter and its tinyglobby; fumadocs-core 16.10.2 loader.
// Expectations are literals and OAT's existing CLI matcher, not a permissive schema.
describe('pinned Fumadocs reader boundaries', () => {
  it.each(['md', 'mdx'])(
    'routes links against the live filtered collection under ancestor and content docs folders (.%s)',
    async (extension) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-reader-links-'));
      // Neither the first nor last /docs/ marker identifies this content root.
      const appRoot = join(root, 'docs', 'workspace', 'app');
      const content = join(appRoot, 'docs');
      try {
        await mkdir(join(root, '.oat'));
        const configFile = join(root, '.oat/config.json');
        await writeFile(
          configFile,
          JSON.stringify({
            documentation: {
              root: 'docs/workspace/app',
              nonReaderPaths: [`section.${extension}`, 'plus+.md', 'guide.md/'],
            },
          }),
        );
        const bodies: Record<string, string> = {
          'index.md':
            '[Guides](contributing/index.md?v=1#guides)\n\n[Section](section/index.md)\n\n[Literal](plus+/index.md)\n\n[File](guide.md)',
          'docs/guide.md': '[Guides](../contributing/index.md?v=1#guides)',
          'contributing/index.md': `[Contract](../contributing.${extension}?v=1#contract)`,
          'contributing/toolchain.md': `[Entry](../contributing.${extension})\n\n[Guides](index.md)`,
          [`section.${extension}`]: '# Excluded physical collision',
          'section/index.md': '[Toolchain](toolchain.md?v=1#tools)',
          'section/toolchain.md': '# Toolchain',
          'plus+.md': '# Excluded literal metacharacter',
          'plus+/index.md': '# Literal folder',
          'guide.md': '# A trailing-slash pattern must not exclude this file',
        };
        for (const [file, body] of Object.entries(bodies)) {
          await mkdir(dirname(join(content, file)), { recursive: true });
          await writeFile(join(content, file), body);
        }
        await writeFile(join(appRoot, `docs.${extension}`), '# Outside root');
        const source = createSourceConfig({
          oatConfigFile: configFile,
          appRoot,
        });
        const processor = unified().use(remarkParse).use(source.remarkPlugins);
        const links = async (file: string) => {
          const tree = await processor.run(processor.parse(bodies[file]!), {
            path: join(content, file),
            value: bodies[file],
          });
          return tree.children.flatMap((node) =>
            node.type === 'paragraph'
              ? node.children.flatMap((child) =>
                  child.type === 'link' ? [child.url] : [],
                )
              : [],
          );
        };
        // Ordinary no-collision control, before a reader page is created.
        expect
          .soft(await links('index.md'))
          .toEqual([
            './contributing/?v=1#guides',
            './section/',
            './plus+/',
            './guide/',
          ]);
        await writeFile(
          join(content, `contributing.${extension}`),
          '# Contract',
        );
        // Reuse the SAME processor/config: development additions must be seen.
        expect
          .soft(await links('index.md'))
          .toEqual([
            './contributing/index/?v=1#guides',
            './section/',
            './plus+/',
            './guide/',
          ]);
        expect
          .soft(await links('docs/guide.md'))
          .toEqual(['../../contributing/index/?v=1#guides']);
        expect
          .soft(await links('contributing/index.md'))
          .toEqual(['../?v=1#contract']);
        expect
          .soft(await links('contributing/toolchain.md'))
          .toEqual(['../', '../index/']);
        expect
          .soft(await links('section/index.md'))
          .toEqual(['./toolchain/?v=1#tools']);
        // Actual emitter discovery + actual pinned compiler + loader oracle.
        const require = createRequire(import.meta.url);
        const mdxRequire = createRequire(
          await realpath(require.resolve('fumadocs-mdx/package.json')),
        );
        const { glob } = mdxRequire('tinyglobby');
        const files: string[] = await glob(source.docs.files, { cwd: content });
        expect(files).not.toContain(`section.${extension}`);
        expect(files).not.toContain('plus+.md');
        expect(files).toContain('guide.md');
        const { defineDocs, defineConfig } =
          await import('fumadocs-mdx/config');
        const { dynamic } = await import('fumadocs-mdx/runtime/dynamic');
        const { loader } = await import('fumadocs-core/source');
        const collection = defineDocs({
          dir: content,
          docs: source.docs,
          meta: source.meta,
        });
        const compiler = await dynamic(
          {
            docs: collection,
            default: defineConfig({
              mdxOptions: {
                remarkPlugins: source.remarkPlugins,
                remarkImageOptions: false,
              },
            }),
          },
          {
            environment: 'runtime',
            configPath: join(appRoot, 'source.config.ts'),
            outDir: join(appRoot, '.source'),
          },
        );
        const compiled = await compiler.docs(
          'docs',
          content,
          {},
          files.map((file) => ({
            info: { path: file, fullPath: join(content, file) },
            data: { title: file },
          })),
        );
        const loaded = loader({
          baseUrl: '/',
          source: compiled.toFumadocsSource(),
        });
        expect(
          loaded.getPages().find((page) => page.path === 'section/index.md')
            ?.url,
        ).toBe('/section');
        expect(
          loaded
            .getPages()
            .find((page) => page.path === 'contributing/index.md')?.url,
        ).toBe('/contributing/index');
        const { renderToStaticMarkup } = await import('react-dom/server');
        for (const [file, hrefs] of [
          ['docs/guide.md', ['../../contributing/index/?v=1#guides']],
          ['section/index.md', ['./toolchain/?v=1#tools']],
          ['contributing/index.md', ['../?v=1#contract']],
        ] as const) {
          const entry = compiled.docs.find((page) => page.info.path === file)!;
          const { body } = await entry.load();
          const html = renderToStaticMarkup(body({}));
          for (const href of hrefs) expect(html).toContain(`href="${href}"`);
        }
        await rm(join(content, `contributing.${extension}`));
        expect
          .soft(await links('index.md'))
          .toEqual([
            './contributing/?v=1#guides',
            './section/',
            './plus+/',
            './guide/',
          ]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
  it('validates named roots through the collection schema before loading the landing page', async () => {
    const { defineDocs } = await import('fumadocs-mdx/config');
    const { metaSchema } = await import('fumadocs-core/source/schema');
    const { loader } = await import('fumadocs-core/source');
    const data = {
      root: ' Named root ',
      pages: ['index', 'leaf'],
      title: 'Section',
    };
    expect(metaSchema.safeParse(data).success).toBe(false);
    const source = createSourceConfig();
    const collection = defineDocs({ meta: source.meta, docs: source.docs });
    const parsed = await collection.meta.schema['~standard'].validate(data);
    expect(parsed.issues).toBeUndefined();
    expect(parsed.value).toMatchObject({
      root: true,
      title: 'Section',
      pages: ['index', 'leaf'],
    });
    for (const root of ['', '   ', 42, null]) {
      expect(
        (await collection.meta.schema['~standard'].validate({ root })).issues,
      ).toBeDefined();
    }
    for (const root of [true, false, undefined]) {
      const control = await collection.meta.schema['~standard'].validate({
        root,
      });
      expect(control.issues).toBeUndefined();
      expect(control.value).toMatchObject({ root });
    }
    expect(
      (
        await collection.meta.schema['~standard'].validate({
          root: true,
          pages: [42],
        })
      ).issues,
    ).toBeDefined();
    const tree = loader({
      baseUrl: '/',
      source: {
        files: [
          { type: 'meta', path: 'meta.json', data: { pages: ['section'] } },
          { type: 'meta', path: 'section/meta.json', data: parsed.value },
          {
            type: 'page',
            path: 'section/index.md',
            data: { title: 'Landing' },
          },
          { type: 'page', path: 'section/leaf.md', data: { title: 'Leaf' } },
        ],
      },
    }).pageTree;
    expect(tree.children[0]).toMatchObject({
      type: 'folder',
      children: [
        { type: 'page', url: '/section' },
        { type: 'page', url: '/section/leaf' },
      ],
    });
  });
  it.each(['bounded literals', 'guide.md/', '**/'])(
    'emits only readers with literal bounded-glob parity and an explicit matching app config (%s)',
    async (patternCase) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-collection-'));
      try {
        const appRoot = join(root, 'app');
        const content = join(appRoot, 'docs');
        await mkdir(join(root, '.oat'));
        await mkdir(content, { recursive: true });
        const configFile = join(root, '.oat/config.json');
        const patterns =
          patternCase === 'bounded literals'
            ? [
                ' /root.md ',
                'templates/',
                '**/draft.md',
                'a**b.md',
                '[literal]?.md',
                'plus+.md',
                'brace{a,b}.md',
                '(private)/',
                'deep/**/skip*.md',
              ]
            : [patternCase];
        await writeFile(
          configFile,
          JSON.stringify({
            documentation: {
              root: 'app',
              nonReaderPaths: patterns,
              excludes: ['kept.md'],
            },
          }),
        );
        const paths = [
          'index.md',
          'kept.md',
          'guide.md',
          'root.md',
          'nested/root.md',
          'templates/index.md',
          'templates/nested/leaf.md',
          'draft.md',
          'nested/draft.md',
          'nested/deeper/draft.md',
          'axb.md',
          'a/deep/b.md',
          '[literal]?.md',
          'l.md',
          'plus+.md',
          'plus.md',
          'brace{a,b}.md',
          'bracea.md',
          '(private)/index.md',
          'deep/skip.md',
          'deep/nested/skip-one.md',
          'deep/nested/keep.md',
        ];
        for (const path of paths) {
          await mkdir(dirname(join(content, path)), { recursive: true });
          await writeFile(join(content, path), '# Page');
        }
        await writeFile(join(content, 'meta.json'), '{"pages":["index"]}');
        await writeFile(
          join(content, 'templates/meta.json'),
          '{"pages":["private"]}',
        );
        const source = createSourceConfig({
          oatConfigFile: configFile,
          appRoot,
        });
        const require = createRequire(import.meta.url);
        const mdxRequire = createRequire(
          await realpath(require.resolve('fumadocs-mdx/package.json')),
        );
        const { glob } = mdxRequire('tinyglobby');
        const { createExclusionMatcher, isExcludedPath } = await import(
          new URL(
            '../../cli/src/commands/docs/shared/exclusions.ts',
            import.meta.url,
          ).href
        );
        const matcher = createExclusionMatcher(patterns);
        const kept = await glob(source.docs.files, { cwd: content });
        expect(kept.sort()).toEqual(
          patternCase === 'bounded literals'
            ? [
                'a/deep/b.md',
                'bracea.md',
                'deep/nested/keep.md',
                'guide.md',
                'index.md',
                'kept.md',
                'l.md',
                'nested/root.md',
                'plus.md',
              ]
            : patternCase === 'guide.md/'
              ? [...paths].sort()
              : [
                  '[literal]?.md',
                  'axb.md',
                  'bracea.md',
                  'brace{a,b}.md',
                  'draft.md',
                  'guide.md',
                  'index.md',
                  'kept.md',
                  'l.md',
                  'plus+.md',
                  'plus.md',
                  'root.md',
                ],
        );
        expect(kept.sort()).toEqual(
          paths.filter((path) => !isExcludedPath(matcher, path)).sort(),
        );
        expect(
          (await glob(source.meta.files, { cwd: content })).sort(),
        ).toEqual(
          patternCase === 'guide.md/'
            ? ['meta.json', 'templates/meta.json']
            : ['meta.json'],
        );
        const unrelated = createSourceConfig({
          oatConfigFile: configFile,
          appRoot: join(root, 'other'),
        });
        expect(
          (await glob(unrelated.docs.files, { cwd: content })).sort(),
        ).toEqual(paths.sort());
        // The actual Next emitter consumes these collection patterns, not a model of discovery.
        await symlink(
          fileURLToPath(new URL('../node_modules', import.meta.url)),
          join(appRoot, 'node_modules'),
        );
        const helper = fileURLToPath(
          new URL('./source-config.ts', import.meta.url),
        );
        const sourcePath = join(appRoot, 'source.config.ts');
        await writeFile(
          sourcePath,
          `import {createSourceConfig} from ${JSON.stringify(helper)};\nimport {defineDocs} from 'fumadocs-mdx/config';\nconst source=createSourceConfig({oatConfigFile:${JSON.stringify(configFile)},appRoot:${JSON.stringify(appRoot)}});\nexport const docs=defineDocs({dir:${JSON.stringify(content)},docs:source.docs,meta:source.meta});`,
        );
        const { postInstall } = await import('fumadocs-mdx/next');
        const outDir = join(appRoot, '.source');
        await postInstall({ configPath: sourcePath, outDir });
        const generated = await readFile(join(outDir, 'server.ts'), 'utf8');
        expect(generated).toContain('kept.md');
        expect(generated).toContain('guide.md');
        if (patternCase === 'guide.md/') {
          expect(generated).toContain('templates/');
        } else {
          expect(generated).not.toContain('templates/');
        }
        if (patternCase === 'bounded literals')
          expect(generated).not.toContain('draft.md');
        await writeFile(
          configFile,
          JSON.stringify({ documentation: { root: 'app', nonReaderPaths: 5 } }),
        );
        expect(() =>
          createSourceConfig({ oatConfigFile: configFile, appRoot }),
        ).toThrow('Invalid documentation.nonReaderPaths');
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});
