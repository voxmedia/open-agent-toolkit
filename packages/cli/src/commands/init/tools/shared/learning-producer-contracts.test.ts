import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

/**
 * Learning producers (artifact-cleanup p03-t01, D3 Option D and D14).
 *
 * Every learning an autonomous, cloud or goal run records is a category-bearing
 * project-log judgment entry written through one shared shell function,
 * `oat_record_learning`. This file pins that write at the producer contract and
 * then runs the extracted function against the branch-built CLI, so the test
 * fails when the documented write stops carrying the category or the
 * per-observation source rather than when a restated copy drifts.
 */

function repoFilePath(relativePath: string): string {
  return join(import.meta.dirname, '../../../../../../../', relativePath);
}

function readRepoFile(relativePath: string): string {
  return readFileSync(repoFilePath(relativePath), 'utf8');
}

const PRODUCERS = [
  {
    origin: 'oat-project-autonomous',
    path: '.agents/skills/oat-project-autonomous/SKILL.md',
  },
  {
    origin: 'oat-cursor-cloud-projects',
    path: '.agents/skills/oat-cursor-cloud-projects/references/cursor-cloud-mechanics.md',
  },
  {
    origin: 'oat-project-goal',
    path: '.agents/skills/oat-project-goal/SKILL.md',
  },
] as const;

/** The fenced bash block that defines `oat_record_learning`. */
function learningWriteBlock(content: string): string {
  const block = [...content.matchAll(/^```bash\n([\s\S]*?)\n```$/gm)]
    .map((match) => match[1]!)
    .find((candidate) => candidate.includes('oat_record_learning() {'));
  if (block === undefined) {
    throw new Error('learning write: no oat_record_learning definition');
  }
  return block;
}

/**
 * The producer contract for a learning write. Throws naming the first missing
 * field, so a neutralized instruction fails for that field's reason.
 */
function assertLearningWriteContract(block: string): void {
  const call = block.match(
    /oat project log append[\s\S]*?--body "\$body"\)/,
  )?.[0];
  if (call === undefined) {
    throw new Error('learning write: no oat project log append call');
  }
  const required: ReadonlyArray<readonly [string, RegExp]> = [
    ['category', /--category "\$category"/],
    ['source', /--source "\$source"/],
    ['idempotency key', /--idempotency-key "\$source"/],
    ['origin', /--origin "\$\{LEARNING_ORIGIN:\?/],
    ['judgment type', /--type "\$type"/],
    ['project scope', /--scope project(?=\s)/],
    ['learning title area', /--area "\$title"/],
    ['json result', /--json(?=\s)/],
  ];
  for (const [field, pattern] of required) {
    if (!pattern.test(call)) {
      throw new Error(`learning write is missing the ${field} argument`);
    }
  }
  const mapping: ReadonlyArray<readonly [string, RegExp]> = [
    ['friction', /gotcha \| environment-limited\) type=friction ;;/],
    [
      'worked-well',
      /efficiency \| candidate-skill-content\) type=worked-well ;;/,
    ],
    ['feedback', /documentation-gap \| decision\) type=feedback ;;/],
  ];
  for (const [type, pattern] of mapping) {
    if (!pattern.test(block)) {
      throw new Error(`learning write is missing the ${type} category mapping`);
    }
  }
  if (
    !/"status": \*"skipped"/.test(block) ||
    !/warning: project log disabled/.test(block)
  ) {
    throw new Error('learning write is missing the disabled-log warning');
  }
}

/** Drops every line of the block that carries `flag`. */
function withoutArgument(block: string, flag: string): string {
  return block
    .split('\n')
    .filter((line) => !line.includes(flag))
    .join('\n');
}

describe('learning producers write the project log (p03-t01)', () => {
  it.each(PRODUCERS)(
    '$origin defines the categorized, source-keyed learning write',
    ({ origin, path }) => {
      const content = readRepoFile(path);
      const block = learningWriteBlock(content);
      expect(() => assertLearningWriteContract(block)).not.toThrow();
      expect(content).toContain(`LEARNING_ORIGIN=${origin}`);
    },
  );

  it('commits each autonomous learning under the source id just written', () => {
    const content = readRepoFile(PRODUCERS[0].path);
    const assign = content.indexOf('LEARNING_SOURCE="autonomous-$RUN_ID-NN"');
    const call = content.indexOf(
      'oat_record_learning <category> "$LEARNING_SOURCE" "<title>" "<body>"',
    );
    const commit = content.indexOf(
      ':oat-project-autonomous:learning:${LEARNING_SOURCE:?set to the source id just written}"',
    );
    expect(assign, 'the source id is assigned').toBeGreaterThan(-1);
    expect(call, 'the write receives the assigned id').toBeGreaterThan(assign);
    expect(commit, 'the commit identity requires that id').toBeGreaterThan(
      call,
    );
  });

  it('keeps one byte-identical learning write across the three producers', () => {
    const blocks = PRODUCERS.map(({ path }) =>
      learningWriteBlock(readRepoFile(path)),
    );
    expect(new Set(blocks).size).toBe(1);
  });

  it('fails the producer contract for a missing category or source (learning-source-identity)', () => {
    const block = learningWriteBlock(readRepoFile(PRODUCERS[0].path));
    expect(() =>
      assertLearningWriteContract(withoutArgument(block, '--category')),
    ).toThrow('learning write is missing the category argument');
    expect(() =>
      assertLearningWriteContract(withoutArgument(block, '--source')),
    ).toThrow('learning write is missing the source argument');
    // The minimally different neighbor: the intact instruction passes.
    expect(() => assertLearningWriteContract(block)).not.toThrow();
  });

  it.each([
    ...PRODUCERS.map(({ path }) => path),
    '.agents/skills/oat-cursor-cloud-projects/SKILL.md',
    '.agents/skills/oat-project-brief/references/brief-contract.md',
  ])('%s never directs a write to oat-execution-learnings.md', (path) => {
    const content = readRepoFile(path).replace(/\s+/g, ' ');
    for (const match of content.matchAll(/oat-execution-learnings\.md/g)) {
      const before = content.slice(Math.max(0, match.index - 60), match.index);
      expect(before, `${path}: …${before}`).toMatch(
        /(never create or append to|no producer creates) `$/i,
      );
    }
  });

  it('pins the D14 disabled-log rule (DR-260718) in the goal skill and brief contract', () => {
    const goal = readRepoFile('.agents/skills/oat-project-goal/SKILL.md');
    expect(goal).not.toMatch(/write the learnings file instead/);
    expect(goal.replace(/\s+/g, ' ')).toContain(
      'an existing `project-log.md` records the learning whatever the flag says, and only when the log is disabled and absent does the append skip (`status: skipped`); the write then prints one warning line, and the attempt satisfies the prerequisite.',
    );
    const contract = readRepoFile(
      '.agents/skills/oat-project-brief/references/brief-contract.md',
    ).replace(/\s+/g, ' ');
    expect(contract).toContain(
      'When the project log is disabled and absent the append skips (`status: skipped`); the producer prints one warning line and continues, and the attempt satisfies the prerequisite. An existing `project-log.md` keeps accepting the write whatever the flag says',
    );
    expect(contract).toMatch(
      /\| delivered → aligning \| `oat-project-goal` \| learnings captured \(section 12\.10: the categorized project-log write, or its warned attempt when the log is disabled and absent\)/,
    );
    // No producer may promise that a disabled flag silences an existing log.
    for (const producer of [
      '.agents/skills/oat-project-goal/SKILL.md',
      '.agents/skills/oat-project-autonomous/SKILL.md',
      '.agents/skills/oat-cursor-cloud-projects/references/cursor-cloud-mechanics.md',
      '.agents/skills/oat-project-brief/references/brief-contract.md',
    ]) {
      const text = readRepoFile(producer).replace(/\s+/g, ' ');
      expect(text, producer).not.toMatch(/append no-ops|helper no-ops/);
      expect(text, producer).toContain('DR-260718-automatic-create-on-first');
    }
  });
});

describe('learning write against the branch-built CLI', () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function builtCliEntry(): string {
    const entry = repoFilePath('packages/cli/dist/index.js');
    if (!existsSync(entry)) {
      throw new Error(
        `Missing built CLI at ${entry}; run \`pnpm --filter @open-agent-toolkit/cli build\` first.`,
      );
    }
    return entry;
  }

  const PROJECT_PATH = '.oat/projects/shared/demo';

  function scratchRepo(
    options: { projectLog?: false; existingLog?: boolean } = {},
  ): {
    repo: string;
    home: string;
  } {
    const repo = mkdtempSync(join(tmpdir(), 'oat-learning-write-'));
    const home = mkdtempSync(join(tmpdir(), 'oat-learning-home-'));
    tempDirs.push(repo, home);
    spawnSync('git', ['init', '-q'], { cwd: repo });
    mkdirSync(join(repo, PROJECT_PATH), { recursive: true });
    writeFileSync(join(repo, PROJECT_PATH, 'state.md'), '# State\n', 'utf8');
    if (options.existingLog === true) {
      writeFileSync(
        join(repo, PROJECT_PATH, 'project-log.md'),
        '# Project Log: demo\n\n## Entries\n',
        'utf8',
      );
    }
    if (options.projectLog === false) {
      writeFileSync(
        join(repo, '.oat', 'config.local.json'),
        `${JSON.stringify({ version: 1, workflow: { projectLog: false } })}\n`,
        'utf8',
      );
    }
    return { repo, home };
  }

  function runLearningWrite(
    repo: string,
    home: string,
    args: readonly string[],
    extra = '',
  ): { status: number | null; stdout: string; stderr: string } {
    const block = learningWriteBlock(readRepoFile(PRODUCERS[0].path));
    const quote = (value: string): string =>
      `'${value.replaceAll("'", "'\"'\"'")}'`;
    const script = [
      `oat() { ${quote(process.execPath)} ${quote(builtCliEntry())} "$@"; }`,
      'LEARNING_ORIGIN=oat-project-autonomous',
      block,
      `oat_record_learning ${args.map(quote).join(' ')}`,
      extra,
    ].join('\n');
    const result = spawnSync('bash', ['-c', script], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, PROJECT_PATH },
    });
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  const LEARNING = [
    'gotcha',
    'autonomous-run1-01',
    'cache misses on resume',
    'Observation: The cache missed on resume.\nImpact: One rebuild.\nRecommendation: Warm the cache.',
  ] as const;

  it('appends a categorized entry once and a replay appends nothing', () => {
    const { repo, home } = scratchRepo();
    const first = runLearningWrite(repo, home, LEARNING);
    expect(first.status, first.stderr).toBe(0);
    expect(first.stderr).toBe('');
    const logPath = join(repo, PROJECT_PATH, 'project-log.md');
    const log = readFileSync(logPath, 'utf8');
    expect(log).toMatch(
      /### \d{4}-\d{2}-\d{2} · project · friction · cache misses on resume\n\n\*\*Category:\*\* gotcha\n\*\*Source:\*\* autonomous-run1-01\n\*\*Origin:\*\* oat-project-autonomous\n\*\*Recorded:\*\* /,
    );

    const replay = runLearningWrite(repo, home, LEARNING);
    expect(replay.status, replay.stderr).toBe(0);
    expect(replay.stderr).toBe('');
    expect(readFileSync(logPath, 'utf8')).toBe(log);
    expect(
      existsSync(join(repo, PROJECT_PATH, 'oat-execution-learnings.md')),
    ).toBe(false);
  });

  it('refuses an unknown category before any write', () => {
    const { repo, home } = scratchRepo();
    const result = runLearningWrite(repo, home, [
      'bogus',
      'autonomous-run1-02',
      'title',
      'Observation: x.',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unknown learning category 'bogus'");
    expect(existsSync(join(repo, PROJECT_PATH, 'project-log.md'))).toBe(false);
  });

  it('records into an existing log without a warning while the project log is disabled (DR-260718)', () => {
    const { repo, home } = scratchRepo({
      projectLog: false,
      existingLog: true,
    });
    const result = runLearningWrite(repo, home, LEARNING, 'echo "continued"');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe('continued');
    expect(result.stderr).toBe('');
    expect(
      readFileSync(join(repo, PROJECT_PATH, 'project-log.md'), 'utf8'),
    ).toMatch(/\*\*Category:\*\* gotcha\n\*\*Source:\*\* autonomous-run1-01\n/);
  });

  it('warns once, creates no file and continues when the project log is disabled (D14)', () => {
    const { repo, home } = scratchRepo({ projectLog: false });
    const result = runLearningWrite(repo, home, LEARNING, 'echo "continued"');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe('continued');
    expect(result.stderr.trim().split('\n')).toEqual([
      'oat: warning: project log disabled (workflow.projectLog=false); learning autonomous-run1-01 not recorded',
    ]);
    expect(existsSync(join(repo, PROJECT_PATH, 'project-log.md'))).toBe(false);
    expect(
      existsSync(join(repo, PROJECT_PATH, 'oat-execution-learnings.md')),
    ).toBe(false);

    // Summary sees no learning source at all.
    const summary = readRepoFile('.agents/skills/oat-project-summary/SKILL.md');
    const fingerprint = [...summary.matchAll(/^(`{3,})bash\n([\s\S]*?)\n\1$/gm)]
      .map((match) => match[2]!)
      .find((candidate) =>
        candidate.includes('summary_learnings_fingerprint() {'),
      );
    expect(fingerprint).toBeDefined();
    const read = spawnSync(
      'bash',
      ['-c', `${fingerprint}\nsummary_learnings_fingerprint`],
      {
        encoding: 'utf8',
        env: { ...process.env, PROJECT_PATH: join(repo, PROJECT_PATH) },
      },
    );
    expect(read.status, read.stderr).toBe(0);
    expect(read.stdout.trim().split('\n').at(-1)).toBe('none');
  });
});
