/*
 * The mdxcn MIT notice must survive compilation into every vendored figure
 * module, because docs-theme redistributes the code and NOTICES.md ships only
 * with the CLI. `tsc` drops a `/*!` header when it is attached to a statement
 * it elides, such as a leading `import type`, so this test reads the built
 * output rather than the source.
 *
 * It reads `dist/`, which `pnpm --filter @open-agent-toolkit/docs-theme build`
 * writes and which `turbo run test` builds first. A bare `vitest run` needs a
 * build beforehand.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const figuresDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(figuresDir, '..', '..', 'dist', 'figures');

/** OAT-authored figure modules, which carry no mdxcn notice. */
const OAT_AUTHORED = new Set(['cn']);

/** Upstream mdxcn LICENSE (https://github.com/shadcn-labs/mdxcn, main 884eba5). */
const MDXCN_NOTICE = `Copyright (c) 2026 Keshav Bagaade

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const vendored = readdirSync(figuresDir)
  .filter((file) => /\.tsx?$/.test(file) && !file.endsWith('.test.ts'))
  .map((file) => file.replace(/\.tsx?$/, ''))
  .filter((name) => !OAT_AUTHORED.has(name))
  .sort();

describe('mdxcn MIT notice in dist', () => {
  it('covers the vendored figure modules', () => {
    expect(vendored).toEqual(
      expect.arrayContaining([
        'annotate',
        'check',
        'compare',
        'decision',
        'graph-frame',
        'graph-markdown',
        'index',
        'steps',
        'terminal',
        'timeline',
        'tree',
      ]),
    );
  });

  it.each(vendored)('dist/figures/%s.js carries the full notice', (name) => {
    const built = join(distDir, `${name}.js`);
    expect(
      existsSync(built),
      `${built} is missing; run pnpm --filter @open-agent-toolkit/docs-theme build`,
    ).toBe(true);

    const output = readFileSync(built, 'utf8');
    expect(output).toMatch(/^(?:import [^\n]*\n)*\/\*!\n/);
    expect(output.includes(MDXCN_NOTICE), `${name}.js lost the notice`).toBe(
      true,
    );
  });
});
