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
      '@ui': resolvePath('./src/ui'),
      '@validation': resolvePath('./src/validation'),
    },
  },
  test: {
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
  },
});
