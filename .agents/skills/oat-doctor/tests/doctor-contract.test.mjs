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

// The expected command/projection pairs come from the skill's own sweep table,
// so removing a projection from the skill removes it from the test.
function sweepTable() {
  const rows = [
    ...skill.matchAll(/^\| \d+ +\| `(oat [^`]+)` +\| (.+?) +\| [^|]+\|$/gm),
  ];
  assert.ok(rows.length >= 7, `expected 7 sweep rows, found ${rows.length}`);
  return rows.map(([, command, projection]) => {
    const fields = [];
    // A row may name several projections joined by "and" (for example
    // `.adoption` and `.checks[] | {name, status, message}`). Parse each
    // backtick segment on its own so no sibling projection is swallowed.
    const segments = [...projection.matchAll(/`([^`]+)`/g)].map((m) =>
      m[1].replace(/\\\|/g, '|'),
    );
    assert.ok(segments.length > 0, `${command}: no projection segments`);
    for (const segment of segments) {
      const arrayed = segment.match(
        /^\.([a-zA-Z]+)\[\](?:\s*\|\s*select\([^)]*\))?\s*\|\s*\{([^}]*)\}/,
      );
      if (arrayed) {
        for (const name of arrayed[2]
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)) {
          fields.push(`${arrayed[1]}[].${name}`);
        }
        continue;
      }
      for (const m of segment.matchAll(
        /(?:^|,\s*)\.([a-zA-Z]+)(?=\s*(?:,|$))/g,
      ))
        fields.push(m[1]);
    }
    return { command: command.split(' ').slice(1), fields };
  });
}

const OPTIONAL_ITEM_FIELDS = new Set(['deprecated']);

function requireFields(payload, fields, label) {
  for (const field of fields) {
    const [head, ...rest] = field.split('.');
    const key = head.replace('[]', '');
    assert.ok(payload && key in payload, `${label}: missing ${key}`);
    if (!head.endsWith('[]')) continue;
    const items = payload[key];
    assert.ok(Array.isArray(items), `${label}: ${key} is not an array`);
    const name = rest.join('.');
    if (OPTIONAL_ITEM_FIELDS.has(name)) {
      assert.ok(
        items.length === 0 || items.some((item) => name in item),
        `${label}: no item carries ${name}`,
      );
    } else {
      for (const item of items)
        assert.ok(name in item, `${label}: an item lacks ${key}[].${name}`);
    }
  }
}

async function runJson(args, env = process.env) {
  const result = await execFileAsync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    env,
    maxBuffer: 64 * 1024 * 1024,
  }).catch((error) =>
    error.stdout ? { stdout: error.stdout } : Promise.reject(error),
  );
  return JSON.parse(result.stdout);
}

test('every field the sweep projects exists in the built CLI output, on every item', async () => {
  const { mkdtemp, mkdir, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  // A temp home with one deliberately outdated user-scope skill, so the
  // `tools outdated` projection is proven on a real item even where the
  // machine running the test has nothing outdated.
  const home = await mkdtemp(join(tmpdir(), 'oat-doctor-home-'));
  await mkdir(join(home, '.agents/skills/oat-docs'), { recursive: true });
  const docsSkill = await readFile(
    join(REPO_ROOT, '.agents/skills/oat-docs/SKILL.md'),
    'utf8',
  );
  await writeFile(
    join(home, '.agents/skills/oat-docs/SKILL.md'),
    docsSkill.replace(/^  version: .*$/m, '  version: 0.0.1'),
  );
  const parsedRows = [];
  for (const { command, fields } of sweepTable()) {
    const label = `oat ${command.join(' ')}`;
    const payload = await runJson(command);
    requireFields(payload, fields, label);
    parsedRows.push({ label, fields });
    if (command[0] === 'tools' && command[1] === 'outdated') {
      const seeded = await runJson(
        [
          ...command.filter((x) => x !== 'all' && x !== '--scope'),
          '--scope',
          'user',
          '--cwd',
          home,
        ],
        { ...process.env, HOME: home },
      );
      assert.ok(seeded.tools.length >= 1, 'seeded outdated tool not reported');
      requireFields(seeded, fields, `${label} (seeded)`);
    }
  }
  // Rows that name more than one projection must yield all of them.
  const byLabel = Object.fromEntries(
    parsedRows.map((row) => [row.label, row.fields]),
  );
  assert.ok(
    byLabel['oat pjm doctor --json'].includes('adoption'),
    'pjm doctor: adoption not parsed',
  );
  assert.ok(
    byLabel['oat pjm doctor --json'].includes('checks[].name'),
    'pjm doctor: checks[] not parsed',
  );
  assert.ok(
    byLabel['oat instructions validate --json'].includes('summary'),
    'instructions validate: summary not parsed',
  );
  assert.ok(
    byLabel['oat instructions validate --json'].includes('entries[].status'),
    'instructions validate: entries[] not parsed',
  );
});

test('every cited docs page exists, with or without a section', async () => {
  const pages = new Set(
    [...skill.matchAll(/`cli-utilities\/([a-z-]+)\.md`/g)].map((m) => m[1]),
  );
  assert.ok(pages.size >= 6, `expected cited pages, found ${pages.size}`);
  for (const page of pages) {
    await readFile(
      join(REPO_ROOT, 'apps/oat-docs/docs/cli-utilities', `${page}.md`),
      'utf8',
    ).catch(() => {
      assert.fail(`cited docs page does not exist: cli-utilities/${page}.md`);
    });
  }
});

test('the lifecycle pointer repairs the skill prescribes are accepted by the CLI', async () => {
  // The commands come from the skill's own finding rule, so the test cannot
  // pass on hard-coded forms while the skill prescribes something else.
  const rule = skill
    .split('\n')
    .find((line) =>
      line.includes('`lastPausedProject` set to a path that does not exist'),
    );
  assert.ok(rule, 'stale-pointer rule missing');
  const prescribed = [
    ...rule.matchAll(/`(oat config (?:set|unset) [^`]+)`/g),
  ].map((m) => m[1]);
  assert.deepEqual(prescribed.sort(), [
    "oat config set activeProject ''",
    "oat config set lastPausedProject ''",
    'oat config unset activeIdea --local',
  ]);
  // The form the CLI refuses must not appear anywhere in the skill, examples included.
  assert.doesNotMatch(
    skill,
    /config unset (?:activeProject|lastPausedProject)\b/,
  );

  const { mkdtemp, mkdir, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const root = await mkdtemp(join(tmpdir(), 'oat-doctor-repair-'));
  await execFileAsync('git', ['init', '-q', root]);
  await mkdir(join(root, '.oat'));
  await writeFile(join(root, '.oat/config.json'), '{\n  "version": 1\n}\n');
  await writeFile(
    join(root, '.oat/config.local.json'),
    JSON.stringify(
      {
        activeProject: '.oat/projects/shared/missing',
        lastPausedProject: '.oat/projects/shared/gone',
        activeIdea: '.oat/ideas/none',
      },
      null,
      2,
    ),
  );
  const run = (args) =>
    execFileAsync(process.execPath, [CLI, ...args, '--cwd', root], {
      cwd: root,
    });
  for (const command of prescribed) {
    const argv = command
      .replace(/''/g, '\u0000')
      .split(' ')
      .slice(1)
      .map((x) => x.replace('\u0000', ''));
    await run(argv);
  }
  const local = JSON.parse(
    await readFile(join(root, '.oat/config.local.json'), 'utf8'),
  );
  assert.ok(!local.activeProject, 'activeProject not cleared');
  assert.ok(!local.lastPausedProject, 'lastPausedProject not cleared');
  assert.equal(local.activeIdea, undefined, 'activeIdea not removed');
  await assert.rejects(
    run(['config', 'unset', 'activeProject', '--local']),
    /Cannot unset state key/,
  );
});
