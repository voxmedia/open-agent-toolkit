import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// Explicit ownership only. Branding, content, configuration and scripts differ intentionally.
const runtimeFiles = [
  'app/[[...slug]]/page.tsx',
  'app/api/search/route.ts',
  'components/search.tsx',
  'app/globals.css',
  'lib/source.ts',
  'app/llms.txt/route.ts',
  'app/llms-full.txt/route.ts',
  'app/llms/[...slug]/route.ts',
];

for (const file of runtimeFiles) {
  test(`canonical scaffold runtime parity: ${file}`, async () => {
    const [template, flagship] = await Promise.all([
      readFile(
        new URL(
          `../../../.oat/templates/docs-app-fuma/${file}`,
          import.meta.url,
        ),
        'utf8',
      ),
      readFile(new URL(`../${file}`, import.meta.url), 'utf8'),
    ]);
    // No substitutions are needed for the currently owned runtime files.
    assert.equal(
      flagship,
      template,
      `Runtime drift in ${file}; update canonical template and flagship together.`,
    );
  });
}
