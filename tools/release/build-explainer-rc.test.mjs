import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const BUILDER = resolve(import.meta.dirname, 'build-explainer-rc.mjs');
const PACKAGE_NAMES = [
  '@open-agent-toolkit/cli',
  '@open-agent-toolkit/control-plane',
  '@open-agent-toolkit/docs-config',
  '@open-agent-toolkit/docs-theme',
  '@open-agent-toolkit/docs-transforms',
];
const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('builds retained tarballs and a stable timestamp-free RC identity', async () => {
  const fixture = await createFixture();
  const first = await runBuilder(fixture, 'first');
  const second = await runBuilder(fixture, 'second');

  assert.equal(first.recordText, second.recordText);
  assert.deepEqual(first.record.changedCandidates, []);
  assert.match(first.record.commit, /^[a-f0-9]{40}$/);
  assert.match(first.record.rcId, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(
    first.record.packages.map(({ name }) => name),
    [...PACKAGE_NAMES].sort(),
  );
  assert.deepEqual(
    first.record.packages.map(({ version }) => version),
    Array(5).fill('1.2.3'),
  );
  assert.deepEqual(
    first.record.skills.map(({ name, version }) => ({ name, version })),
    [
      { name: 'explainer-kit', version: '1.0.0' },
      { name: 'oat-explainer-kit', version: '1.0.0' },
    ],
  );
  assert.deepEqual(
    first.record.schemas.map(({ id }) => id),
    ['explainer-kit.manifest/v1', 'explainer-kit.run-request/v1'],
  );
  assert.deepEqual(
    first.record.recipes.map(({ id, version }) => ({ id, version })),
    [
      { id: 'project-explainer', version: '1' },
      { id: 'project-recap', version: '1' },
    ],
  );
  assert.ok(
    first.record.packages.every(
      ({ artifact, sha256 }) =>
        artifact.endsWith('.tgz') && /^sha256:[a-f0-9]{64}$/.test(sha256),
    ),
  );
  assert.ok(
    first.record.skills.every(({ sha256 }) =>
      /^sha256:[a-f0-9]{64}$/.test(sha256),
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(first.record),
    /createdAt|generatedAt|timestamp|builtAt/i,
  );

  const retained = (await readdir(first.output)).sort();
  assert.deepEqual(
    retained,
    first.record.packages.map(({ artifact }) => artifact).sort(),
  );
  assert.match(await readFile(fixture.commandLog, 'utf8'), /^build$/m);
  assert.doesNotMatch(await readFile(fixture.commandLog, 'utf8'), /publish/i);
  const { stdout: assetStatus } = await execFileAsync(
    'git',
    ['status', '--short', '--', 'packages/cli/assets'],
    { cwd: fixture.root },
  );
  assert.equal(assetStatus, '');
});

test('rejects tracked or untracked changes to release candidate inputs', async () => {
  const fixture = await createFixture();
  await writeFile(
    join(fixture.root, '.agents/skills/explainer-kit/UNTRACKED.md'),
    'changed candidate\n',
  );

  const failure = await runBuilderFailure(fixture);

  assert.equal(failure.code, 'E_CHANGED_CANDIDATES');
  assert.deepEqual(failure.changedCandidates, [
    '.agents/skills/explainer-kit/UNTRACKED.md',
  ]);
});

test('rejects candidate hashes that change during the build', async () => {
  const fixture = await createFixture();

  const failure = await runBuilderFailure(fixture, {
    MUTATE_CANDIDATE: '1',
  });

  assert.equal(failure.code, 'E_CANDIDATE_HASH_CHANGED');
  assert.deepEqual(failure.changedCandidates, [
    '.agents/skills/explainer-kit/schemas/manifest.schema.json',
  ]);
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'explainer-rc-'));
  tempRoots.push(root);
  const bin = join(root, 'bin');
  const commandLog = join(root, 'commands.log');

  await Promise.all([
    ...PACKAGE_NAMES.map((name) =>
      writeJson(
        join(root, 'packages', packageDirectory(name), 'package.json'),
        { name, version: '1.2.3' },
      ),
    ),
    writeText(
      join(root, '.agents/skills/explainer-kit/SKILL.md'),
      skill('explainer-kit'),
    ),
    writeText(
      join(root, '.agents/skills/oat-explainer-kit/SKILL.md'),
      skill('oat-explainer-kit'),
    ),
    writeJson(
      join(
        root,
        '.agents/skills/explainer-kit/schemas/run-request.schema.json',
      ),
      { $id: 'explainer-kit.run-request/v1' },
    ),
    writeJson(
      join(root, '.agents/skills/explainer-kit/schemas/manifest.schema.json'),
      { $id: 'explainer-kit.manifest/v1' },
    ),
    writeJson(
      join(root, '.agents/skills/explainer-kit/recipes/project-recap.json'),
      {
        schemaVersion: 'explainer-kit.recipe/v1',
        id: 'project-recap',
        version: '1',
      },
    ),
    writeJson(
      join(root, '.agents/skills/explainer-kit/recipes/project-explainer.json'),
      {
        schemaVersion: 'explainer-kit.recipe/v1',
        id: 'project-explainer',
        version: '1',
      },
    ),
  ]);
  await mkdir(bin, { recursive: true });
  await writeFile(
    join(bin, 'pnpm'),
    `#!/usr/bin/env node
import { appendFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
await appendFile(process.env.COMMAND_LOG, \`\${args.join(' ')}\\n\`);
if (args[0] === 'build') {
  const assets = join(process.cwd(), 'packages/cli/assets/skills');
  await mkdir(assets, { recursive: true });
  for (const skill of ['explainer-kit', 'oat-explainer-kit']) {
    await cp(
      join(process.cwd(), '.agents/skills', skill),
      join(assets, skill),
      { recursive: true },
    );
  }
  if (process.env.MUTATE_CANDIDATE === '1') {
    await writeFile(
      join(process.cwd(), '.agents/skills/explainer-kit/schemas/manifest.schema.json'),
      '{"$id":"explainer-kit.manifest/v2"}\\n',
    );
  }
  process.exit(0);
}
const filter = args[args.indexOf('--filter') + 1];
const destination = args[args.indexOf('--pack-destination') + 1];
if (!filter || !destination || !args.includes('pack')) process.exit(2);
const directory = filter.split('/').at(-1);
const pkg = JSON.parse(
  await readFile(join(process.cwd(), 'packages', directory, 'package.json'), 'utf8'),
);
const filename = \`\${filter.replace('@', '').replaceAll('/', '-')}-\${pkg.version}.tgz\`;
await mkdir(destination, { recursive: true });
await writeFile(
  join(destination, filename),
  JSON.stringify({ name: filter, version: pkg.version }),
);
`,
  );
  await chmod(join(bin, 'pnpm'), 0o755);
  await execFileAsync('git', ['init', '-q'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'rc@example.com'], {
    cwd: root,
  });
  await execFileAsync('git', ['config', 'user.name', 'RC Test'], { cwd: root });
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['commit', '-qm', 'fixture'], { cwd: root });

  return {
    root,
    commandLog,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      COMMAND_LOG: commandLog,
    },
  };
}

async function runBuilder(fixture, label) {
  const output = join(fixture.root, `out-${label}`);
  const recordPath = join(fixture.root, `record-${label}.json`);
  await execFileAsync(
    process.execPath,
    [BUILDER, '--output', output, '--record', recordPath],
    { cwd: fixture.root, env: fixture.env },
  );
  const recordText = await readFile(recordPath, 'utf8');
  return {
    output,
    recordText,
    record: JSON.parse(recordText),
  };
}

async function runBuilderFailure(fixture, extraEnv = {}) {
  try {
    await execFileAsync(
      process.execPath,
      [
        BUILDER,
        '--output',
        join(fixture.root, 'out'),
        '--record',
        join(fixture.root, 'record.json'),
      ],
      { cwd: fixture.root, env: { ...fixture.env, ...extraEnv } },
    );
    assert.fail('Expected RC builder to fail.');
  } catch (error) {
    assert.equal(error.code, 1);
    return JSON.parse(error.stderr);
  }
}

function packageDirectory(name) {
  return name.split('/').at(-1);
}

function skill(name) {
  return `---
name: ${name}
version: 1.0.0
---
`;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value);
}
