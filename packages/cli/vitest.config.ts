import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const resolvePath = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@app': resolvePath('./src/app'),
      '@commands': resolvePath('./src/commands'),
      '@config': resolvePath('./src/config'),
      '@drift': resolvePath('./src/drift'),
      '@engine': resolvePath('./src/engine'),
      '@errors': resolvePath('./src/errors'),
      '@fs': resolvePath('./src/fs'),
      '@manifest': resolvePath('./src/manifest'),
      '@providers': resolvePath('./src/providers'),
      '@agents': resolvePath('./src/agents'),
      '@rules': resolvePath('./src/rules'),
      '@shared': resolvePath('./src/shared'),
      '@test-support': resolvePath('./src/__tests__'),
      '@ui': resolvePath('./src/ui'),
      '@validation': resolvePath('./src/validation'),
    },
  },
  test: {
    // Git-heavy integration fixtures create multiple repositories and child
    // processes per file. Cap workers to avoid host-load-dependent timeouts.
    maxWorkers: 4,
    // Vitest's 5s default is not enough headroom for these fixtures on a
    // shared CI runner. The slowest individual e2e test measures ~1.3s on a
    // developer machine but exceeded 5s in CI, where four workers contend for
    // two cores while each spawns git and CLI subprocesses. These tests are
    // slow, not hung, so the cap exists to catch a genuine hang rather than to
    // bound expected work.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
    // `resolveAssetsRoot` honours a non-empty OAT_ASSETS_DIR, so an ambient
    // value in a developer shell or CI image would silently redirect every
    // production call site the unit suite exercises. Neutralise it once here;
    // tests that need a specific root inject `env` or pass it to a child.
    env: { OAT_ASSETS_DIR: '' },
  },
});
