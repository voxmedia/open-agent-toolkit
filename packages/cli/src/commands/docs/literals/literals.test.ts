// Public synthetic acceptance controls authored for P24; no captured/private data.
// The real CLI process owns parsing, config/target resolution, readers and filesystem traversal.
import { execFile } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const cliRoot = resolve(import.meta.dirname, '../../../../');
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture(framework = 'markdown') {
  const root = await mkdtemp(join(tmpdir(), 'oat-literals-synthetic-'));
  roots.push(root);
  const content = framework === 'markdown' ? 'manual' : 'manual/docs';
  const put = async (path: string, value: string | Buffer) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), value);
  };
  await exec('git', ['init', '-q', root]);
  await put(
    `${content}/experience/save.md`,
    '---\ntitle: Save\n---\n\n# Save\n\n`Save & close` `Save &amp; close` `Save &#38; close` `Save &#x26; close`\n\n`Save &amp;amp; close` `save & close` `Archive now` `Save` `Comment only`\n\n`Line break` `Hello, Taylor` `two\nlines` `one  space`\n\n```text\n`Fenced decoy`\n```\n',
  );
  await put(
    `${content}/verify/save.md`,
    '`save-action` `Numeric & only` `Named "only"` `Once & only`\n',
  );
  await put(`${content}/contributing/templates/example.md`, '`Archive now`\n');
  await put(
    'src/a.ts',
    '\nconst label = "Save &amp; close";\nconst locator = "save-action";\n// Comment only\nconst escaped = "Line\\u0020break";\nconst interpolated = `Hello, ${name}`;\ntwo\nlines\none space\n',
  );
  await put(
    'src/z.ts',
    'Save & close\nNumeric &#38; only\nNamed &quot;only&quot;\nOnce &amp;amp; only\n',
  );
  await put('src/generated/decoy.ts', 'Archive now\nFenced decoy\n');
  await put('src/binary', Buffer.from([0, 65]));
  await put('src/nonutf8', Buffer.from([0xff, 0x41]));
  await symlink(join(root, 'src/a.ts'), join(root, 'src/alias.ts'));
  await symlink(join(root, 'src'), join(root, 'src/nested-alias'));
  await put('dist/decoy.js', 'Archive now\n');
  await put('other/page.md', '`Archive now`\n');
  const config = async (
    verification: string | undefined = 'triad',
    extra = {},
  ) =>
    put(
      '.oat/config.json',
      JSON.stringify({
        version: 1,
        documentation: {
          root: 'manual',
          tooling: framework,
          nonReaderPaths: ['contributing/templates/**'],
          ...(verification === undefined
            ? {}
            : {
                ia: {
                  preset: 'Product/Engineering/QA',
                  decision: 'decisions/ia.md',
                  tracks: [
                    { path: 'experience', principle: 'Product journeys' },
                    {
                      path: 'build',
                      principle: 'Engineering domains and features',
                    },
                    { path: 'verify', principle: 'QA scenarios' },
                  ],
                  verification,
                },
              }),
          ...extra,
        },
      }),
    );
  await config();
  const args = [
    '--page',
    'verify/save.md',
    '--page',
    'experience/save.md',
    '--source-root',
    'src',
    '--source-root',
    'src/generated',
    '--source-exclude',
    'src/generated/',
  ];
  const run = async (options = args, globalsFirst = true) => {
    const globals = ['--json', '--cwd', root];
    try {
      const output = await exec(
        process.execPath,
        [
          '--import',
          'tsx',
          join(cliRoot, 'src/index.ts'),
          ...(globalsFirst ? globals : []),
          'docs',
          'literals',
          ...options,
          ...(globalsFirst ? [] : globals),
        ],
        {
          cwd: cliRoot,
          env: {
            ...process.env,
            TSX_TSCONFIG_PATH: join(cliRoot, 'tsconfig.json'),
            NO_UPDATE_NOTIFIER: '1',
            HOME: root,
          },
          maxBuffer: 2 * 1024 * 1024,
        },
      );
      return { code: 0, ...output };
    } catch (error) {
      const e = error as { code: number; stdout: string; stderr: string };
      return { code: e.code, stdout: e.stdout, stderr: e.stderr };
    }
  };
  return { root, content, put, config, args, run };
}

describe('docs literals actual CLI acceptance boundary', () => {
  it('reports only AST inline-code occurrences, once-decoded entities and physical lines with deterministic scope', async () => {
    const f = await fixture();
    const output = await f.run();
    expect(output.code, output.stderr).toBe(0);
    const result = JSON.parse(output.stdout);
    expect(result.status).toBe('ok');
    expect(result.scope).toEqual({
      contentRoot: 'manual',
      pages: ['experience/save.md', 'verify/save.md'],
      sourceRoots: ['src', 'src/generated'],
      sourceExcludes: ['src/generated/'],
    });
    expect(result.searched).toEqual(['src/a.ts', 'src/z.ts']);
    expect(result.skipped).toEqual([
      { path: 'src/alias.ts', reason: 'symlink' },
      { path: 'src/binary', reason: 'binary' },
      { path: 'src/nested-alias', reason: 'symlink' },
      { path: 'src/nonutf8', reason: 'non-utf8' },
    ]);
    expect(result.literals.map((c: { status: string }) => c.status)).toEqual([
      'found',
      'found',
      'found',
      'found',
      'not-found',
      'not-found',
      'not-found',
      'found',
      'found',
      'not-found',
      'not-found',
      'not-found',
      'not-found',
      'found',
      'found',
      'found',
      'not-found',
    ]);
    expect(result.literals[0]).toEqual({
      path: 'experience/save.md',
      line: 7,
      literal: 'Save & close',
      normalized: 'Save & close',
      status: 'found',
      source: { path: 'src/a.ts', line: 2 },
    });
    expect(result.literals[4].normalized).toBe('Save &amp; close');
    expect(result.literals[11]).toMatchObject({
      literal: 'two\nlines',
      status: 'not-found',
      line: 11,
    });
    expect(result.literals[13]).toMatchObject({
      path: 'verify/save.md',
      source: { path: 'src/a.ts', line: 3 },
    });
    expect(output.stdout).not.toContain(f.root);
    expect(
      result.literals.some(
        (c: { literal: string }) => c.literal === 'Fenced decoy',
      ),
    ).toBe(false);
    const repeated = await f.run(
      [...f.args, '--page', 'verify/save.md', '--source-root', 'src'],
      false,
    );
    expect(repeated.code).toBe(0);
    expect(JSON.parse(repeated.stdout)).toEqual(result);
  }, 20_000);

  it.each(['agent-only', 'none', 'absent', 'unrelated'])(
    'gates %s before selected page/source reads',
    async (overlay) => {
      const f = await fixture();
      // All selected paths are deliberately invalid. A post-extraction gate would fail.
      await f.config(
        overlay === 'absent'
          ? undefined
          : overlay === 'unrelated'
            ? 'triad'
            : overlay,
      );
      if (overlay === 'absent') await f.config('triad', { ia: undefined });
      const output = await f.run([
        '--page',
        '../missing.md',
        '--source-root',
        '/outside',
        ...(overlay === 'unrelated' ? ['--target-dir', 'other'] : []),
      ]);
      expect(output.code, output.stderr).toBe(0);
      expect(JSON.parse(output.stdout)).toMatchObject({
        status: 'not-applicable',
        reason: expect.any(String),
        literals: [],
        searched: [],
        skipped: [],
      });
    },
    15_000,
  );

  it.each(['fumadocs', 'mkdocs'])(
    'uses matching %s app and content root isolation with renamed pages',
    async (framework) => {
      const f = await fixture(framework);
      if (framework === 'fumadocs')
        await f.put('manual/source.config.ts', '// marker only\n');
      else await f.put('manual/mkdocs.yml', 'site_name: Synthetic\n');
      for (const target of ['manual', 'manual/docs']) {
        const output = await f.run([...f.args, '--target-dir', target]);
        expect(output.code, output.stderr).toBe(0);
        expect(JSON.parse(output.stdout)).toMatchObject({
          status: 'ok',
          scope: { contentRoot: 'manual/docs' },
        });
      }
    },
    20_000,
  );

  it('rejects invalid selected inputs and accepts contained controls through the same command', async () => {
    const f = await fixture();
    const outside = await mkdtemp(join(tmpdir(), 'oat-literals-outside-'));
    roots.push(outside);
    await writeFile(join(outside, 'external.md'), '`Archive now`\n');
    await symlink(outside, join(f.root, 'external-src'));
    await symlink(
      join(outside, 'external.md'),
      join(f.root, f.content, 'external.md'),
    );
    await symlink(join(f.root, 'src'), join(f.root, 'internal-src'));
    const badCases = [
      ['--page', '../other/page.md', '--source-root', 'src'],
      ['--page', 'external.md', '--source-root', 'src'],
      ['--page', 'contributing/templates/example.md', '--source-root', 'src'],
      ['--page', 'missing.md', '--source-root', 'src'],
      ['--page', 'experience/save.md', '--source-root', '.'],
      ['--page', 'experience/save.md', '--source-root', outside],
      ['--page', 'experience/save.md', '--source-root', '../external'],
      ['--page', 'experience/save.md', '--source-root', 'external-src'],
      ['--page', 'experience/save.md', '--source-root', 'src/a.ts'],
      ['--page', 'experience/save.md', '--source-root', 'missing'],
      [
        '--page',
        'experience/save.md',
        '--source-root',
        'src',
        '--source-exclude',
        '../src/',
      ],
      [
        '--page',
        'experience/save.md',
        '--source-root',
        'src',
        '--source-exclude',
        '/src/',
      ],
      [
        '--page',
        'experience/save.md',
        '--source-root',
        'src',
        '--source-exclude',
        'src\\bad',
      ],
      [
        '--page',
        'experience/save.md',
        '--source-root',
        'src',
        '--source-exclude',
        'src/',
      ],
      ['--page', 'experience/save.md', '--source-root', 'internal-src'],
    ];
    for (const args of badCases) {
      const output = await f.run(args);
      expect(
        output.code,
        `${args.join(' ')}: ${output.stdout} ${output.stderr}`,
      ).toBe(1);
      expect(JSON.parse(output.stdout)).toMatchObject({
        status: 'error',
        message: expect.any(String),
      });
      expect(output.stdout).not.toContain(outside);
    }
    // Invalid config cannot turn into not-applicable success.
    await f.put('.oat/config.json', '{bad');
    expect((await f.run()).code).toBe(1);
    await f.config();
    const valid = await f.run();
    expect(valid.code, valid.stderr).toBe(0);
    expect(JSON.parse(valid.stdout).status).toBe('ok');
  }, 60_000);

  it('fails unreadable traversal instead of reporting absence, and keeps valid inventory usable', async () => {
    const f = await fixture();
    await f.put('src/private/file.ts', 'hidden\n');
    await chmod(join(f.root, 'src/private'), 0o000);
    try {
      const output = await f.run();
      expect(output.code, output.stderr).toBe(1);
      expect(JSON.parse(output.stdout).message).toContain(
        'source directory src/private',
      );
    } finally {
      await chmod(join(f.root, 'src/private'), 0o755);
    }
    expect((await f.run()).code).toBe(0);
    await chmod(join(f.root, f.content, 'experience/save.md'), 0o000);
    try {
      const output = await f.run();
      expect(output.code, output.stderr).toBe(1);
      expect(JSON.parse(output.stdout).message).toContain(
        'page experience/save.md',
      );
    } finally {
      await chmod(join(f.root, f.content, 'experience/save.md'), 0o644);
    }
  }, 15_000);

  it('uses exit 2 for an unexpected source read failure and accepts a readable control', async () => {
    const f = await fixture();
    // Synthetic sparse file: readFile's documented 2 GiB limit fails before
    // allocating/reading the contents. This exercises the real runtime error path.
    await f.put('large/source.ts', '');
    await truncate(join(f.root, 'large/source.ts'), 2 ** 31);
    const output = await f.run([
      '--page',
      'experience/save.md',
      '--source-root',
      'large',
    ]);
    expect(output.code, output.stderr).toBe(2);
    expect(JSON.parse(output.stdout).status).toBe('error');
    await truncate(join(f.root, 'large/source.ts'), 0);
    expect(
      (await f.run(['--page', 'experience/save.md', '--source-root', 'large']))
        .code,
    ).toBe(0);
  }, 15_000);

  it('retains argument/help transport and empty extraction as ordinary completion', async () => {
    const f = await fixture();
    const missing = await f.run(['--page', 'experience/save.md']);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('--source-root');
    const bare = await f.run(['--page']);
    expect(bare.code).toBe(1);
    expect(bare.stderr).toContain('argument missing');
    const excess = await f.run([...f.args, 'extra-page.md']);
    expect(excess.code).toBe(1);
    expect(excess.stderr).toContain('too many arguments');
    await f.config('none');
    expect((await f.run([])).code).toBe(1);
    await f.config();
    const help = await f.run(['--help']);
    expect(help.code).toBe(0);
    for (const flag of [
      '--page <path>',
      '--source-root <dir>',
      '--source-exclude <pattern>',
      '--json',
      '--cwd',
    ])
      expect(help.stdout).toContain(flag);
    await f.put(
      `${f.content}/experience/save.md`,
      '# A prose concept\n\nA persistent workspace.\n',
    );
    const empty = await f.run([
      '--page',
      'experience/save.md',
      '--source-root',
      'src',
    ]);
    expect(empty.code, empty.stderr).toBe(0);
    expect(JSON.parse(empty.stdout).literals).toEqual([]);
  }, 20_000);
});
