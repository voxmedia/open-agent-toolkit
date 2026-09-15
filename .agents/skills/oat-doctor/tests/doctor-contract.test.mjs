import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SKILL_DIR, '../../..');
const CLI = join(REPO_ROOT, 'packages/cli/dist/index.js');
const skill = await readFile(join(SKILL_DIR, 'SKILL.md'), 'utf8');

const SWEEP_COMMANDS = [
  'oat doctor --json --scope all',
  'oat pjm doctor --json',
  'oat config dump --json',
  'oat config describe --json',
  'oat instructions validate --json',
  'oat tools list --json --scope all',
  'oat tools outdated --json --scope all',
];
const CARVE_OUT_STEMS = [
  'config set',
  'config unset',
  'config adopt',
  'pjm init',
  'instructions sync',
  'tools update',
  'tools install',
];

function section(heading) {
  const start = skill.indexOf(`\n${heading}\n`);
  assert.notEqual(start, -1, `${heading} section missing`);
  const rest = skill.slice(start + heading.length + 2);
  const level = heading.match(/^#+/)[0];
  const next = rest.search(new RegExp(`\\n#{1,${level.length}} `));
  return next === -1 ? rest : rest.slice(0, next);
}

async function usageLine(commandPath, flags) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [CLI, ...commandPath.split(' '), '--help'],
    { cwd: REPO_ROOT },
  );
  const first = stdout.split('\n')[0];
  assert.ok(
    first.startsWith(`Usage: oat ${commandPath} [options]`),
    `${commandPath}: unexpected usage line "${first}"`,
  );
  for (const flag of flags) {
    assert.ok(
      stdout.includes(flag),
      `${commandPath}: help does not list ${flag}`,
    );
  }
}

test('every sweep command is named and resolves against the built CLI', async () => {
  for (const command of SWEEP_COMMANDS) {
    assert.ok(
      skill.includes(`\`${command}\``),
      `sweep command not named: ${command}`,
    );
    const [, ...rest] = command.split(' ');
    const flags = rest.filter((part) => part.startsWith('--'));
    const path = rest
      .filter((part) => !part.startsWith('--') && part !== 'all')
      .join(' ');
    await usageLine(path, flags);
  }
});

test('the Mode Assertion carve-out names exactly the allowed fix commands, and each resolves', async () => {
  const assertion = section('## Mode Assertion');
  const stems = new Set(
    [...assertion.matchAll(/`oat ([a-z-]+ [a-z-]+)`/g)].map(
      (match) => match[1],
    ),
  );
  assert.deepEqual([...stems].sort(), [...CARVE_OUT_STEMS].sort());
  for (const stem of CARVE_OUT_STEMS) {
    await usageLine(stem, []);
  }
});

test('the report-only and missing-docs rules are stated', () => {
  assert.match(skill, /OAT_NON_INTERACTIVE=1/);
  assert.match(
    skill,
    /~\/\.oat\/docs\/[^\n]*absent[^\n]*oat tools install core/,
  );
});

test('the old hard-coded key descriptions and pack manifest are gone', () => {
  assert.doesNotMatch(
    skill,
    /\*\*activeProject:\*\* Path to the currently active OAT project/,
  );
  assert.doesNotMatch(skill, /oat-project-capture, oat-project-clear-active/);
  assert.doesNotMatch(skill, /### Config Key Explanations/);
});

test('every pjm:* check the CLI defines has a place in the PJM dive', async () => {
  const sources = [
    'packages/cli/src/commands/pjm/doctor.ts',
    'packages/cli/src/commands/pjm/remote/doctor.ts',
  ];
  const ids = new Set();
  for (const source of sources) {
    const text = await readFile(join(REPO_ROOT, source), 'utf8');
    for (const match of text.matchAll(/(pjm:[a-z_]+)/g)) ids.add(match[1]);
  }
  assert.ok(ids.size >= 21, `expected at least 21 pjm ids, found ${ids.size}`);
  const dive = section('#### PJM dive');
  for (const id of ids) {
    assert.ok(dive.includes(`\`${id}\``), `PJM dive does not cover ${id}`);
  }
});

test('every cited docs section is a prefix of a real heading', async () => {
  const citations = [
    ...skill.matchAll(
      /`cli-utilities\/([a-z-]+)\.md` § ([^|\n;)]+?)(?= for | and |\)|\||;|\n)/g,
    ),
  ];
  assert.ok(
    citations.length >= 8,
    `expected docs citations, found ${citations.length}`,
  );
  const cache = new Map();
  for (const [, page, headingText] of citations) {
    if (!cache.has(page)) {
      cache.set(
        page,
        await readFile(
          join(REPO_ROOT, 'apps/oat-docs/docs/cli-utilities', `${page}.md`),
          'utf8',
        ),
      );
    }
    const headings = [...cache.get(page).matchAll(/^## (.+)$/gm)].map(
      (match) => match[1],
    );
    const cited = headingText.trim();
    assert.ok(
      headings.some((heading) => heading.startsWith(cited)),
      `${page}.md has no heading starting with "${cited}"`,
    );
  }
});

const PROJECTIONS = [
  {
    command: ['config', 'describe', '--json'],
    fields: [
      'entries[].key',
      'entries[].group',
      'entries[].file',
      'entries[].scope',
      'entries[].defaultValue',
      'entries[].owningCommand',
      'entries[].deprecated',
    ],
  },
  {
    command: ['pjm', 'doctor', '--json'],
    fields: [
      'adoption.state',
      'checks[].name',
      'checks[].status',
      'checks[].message',
    ],
  },
  {
    command: ['config', 'dump', '--json'],
    fields: ['shared', 'local', 'user'],
  },
  {
    command: ['instructions', 'validate', '--json'],
    fields: [
      'summary.contentMismatch',
      'entries[].agentsPath',
      'entries[].status',
      'entries[].detail',
    ],
  },
  {
    command: ['tools', 'list', '--json', '--scope', 'all'],
    fields: ['tools[].name', 'tools[].pack', 'tools[].scope', 'tools[].status'],
  },
  {
    command: ['tools', 'outdated', '--json', '--scope', 'all'],
    fields: [
      'tools[].name',
      'tools[].version',
      'tools[].bundledVersion',
      'tools[].scope',
    ],
  },
  {
    command: ['doctor', '--json', '--scope', 'all'],
    fields: ['checks[].name', 'checks[].status', 'checks[].message'],
  },
];

function hasPath(value, path) {
  const [head, ...rest] = path.split('.');
  const key = head.replace('[]', '');
  if (value === null || typeof value !== 'object' || !(key in value))
    return false;
  const next = value[key];
  if (head.endsWith('[]')) {
    if (!Array.isArray(next)) return false;
    // `deprecated` is optional per entry: at least one entry must carry it.
    return (
      rest.length === 0 || next.some((item) => hasPath(item, rest.join('.')))
    );
  }
  return rest.length === 0 || hasPath(next, rest.join('.'));
}

test('every field the sweep projects exists in the built CLI output', async () => {
  for (const { command, fields } of PROJECTIONS) {
    const { stdout } = await execFileAsync(
      process.execPath,
      [CLI, ...command],
      {
        cwd: REPO_ROOT,
        maxBuffer: 64 * 1024 * 1024,
      },
    ).catch((error) =>
      error.stdout ? { stdout: error.stdout } : Promise.reject(error),
    );
    const payload = JSON.parse(stdout);
    for (const field of fields) {
      assert.ok(
        hasPath(payload, field),
        `oat ${command.join(' ')}: missing ${field}`,
      );
    }
  }
});
