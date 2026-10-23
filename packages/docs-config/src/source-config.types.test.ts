import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { postInstall } from 'fumadocs-mdx/next';
import { expect, it } from 'vitest';

// Provenance: fumadocs-mdx 14.3.2's actual Next emitter/server.docs conditional,
// fumadocs-core 16.10.2 metadata types, and the installed TypeScript compiler.
// Runtime schema tests cannot detect a generated export collapsing to never.
it('type-checks a generated collection consumer with the OAT metadata schema', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-collection-types-'));
  try {
    await symlink(
      fileURLToPath(new URL('../node_modules', import.meta.url)),
      join(root, 'node_modules'),
    );
    await mkdir(join(root, 'docs/section'), { recursive: true });
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    await writeFile(join(root, 'docs/meta.json'), '{"pages":["section"]}');
    await writeFile(
      join(root, 'docs/section/meta.json'),
      '{"root":" Named root ","pages":["index","leaf"]}',
    );
    await writeFile(
      join(root, 'docs/section/index.md'),
      '---\ntitle: Landing\n---\n# Landing',
    );
    await writeFile(
      join(root, 'docs/section/leaf.md'),
      '---\ntitle: Leaf\n---\n# Leaf',
    );
    const helper = fileURLToPath(
      new URL('./source-config.ts', import.meta.url),
    );
    const configPath = join(root, 'source.config.ts');
    await writeFile(
      configPath,
      `import {createSourceConfig} from ${JSON.stringify(helper)};
import {defineDocs} from 'fumadocs-mdx/config';
const source=createSourceConfig();
export const docs=defineDocs({dir:${JSON.stringify(join(root, 'docs'))},docs:source.docs,meta:source.meta});`,
    );
    await postInstall({ configPath, outDir: join(root, '.source') });
    await writeFile(
      join(root, 'consumer.ts'),
      `import {docs} from './.source/server.js';
export const source = docs.toFumadocsSource();`,
    );
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          noEmit: true,
          strict: true,
          types: ['node'],
          skipLibCheck: true,
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowImportingTsExtensions: true,
        },
        files: ['consumer.ts'],
      }),
    );
    const require = createRequire(import.meta.url);
    const result = spawnSync(
      process.execPath,
      [
        join(dirname(require.resolve('typescript-7/package.json')), 'bin/tsc'),
        '--project',
        join(root, 'tsconfig.json'),
      ],
      { encoding: 'utf8' },
    );
    expect(result.stdout + result.stderr).toBe('');
    expect(result.status).toBe(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
