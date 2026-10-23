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

import { describe, expect, it } from 'vitest';

import { createSourceConfig } from './source-config.js';

describe('createSourceConfig', () => {
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
