import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProjectLaneCommand } from '@commands/project/lane/index';
import { LANE_STATES, WAITING_ON_KINDS } from '@commands/project/lane/ledger';
import { scaffoldProject } from '@commands/project/new/scaffold';
import { runTemplateResolve } from '@commands/template/resolve';
import { CliError } from '@errors/cli-error';
import { resolveAssetsRoot } from '@fs/assets';
import { afterEach, describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../../../../..');
const TEMPLATES_DIR = join(REPO_ROOT, '.oat', 'templates');
const SKILL_DIR = join(REPO_ROOT, '.agents', 'skills', 'oat-project-freestyle');

/**
 * The project `AGENTS.md` sections OAT owns. Later milestones add sections
 * keyed on these headings, so renaming one is a contract change.
 */
const AGENTS_HEADINGS = [
  'Project files',
  'Single writer',
  'Where records live',
  'Decisions and memories',
  'Orchestrator branch',
  'Linked projects',
  'Dispatch',
  'Lane reports',
  'Lane placement',
  'Records commands',
  'Shaping and reshaping',
] as const;

/** The lane self-test, verbatim from the brief's Orchestrator branch decision. */
const LANE_SELF_TEST =
  "You are a lane if your brief says so, wherever you run. If `oat_orchestrator_branch` is empty or absent, the project is unclaimed: the session designated as its orchestrator runs `oat project orchestrator set` before shaping or writing records. Once it is claimed, if your branch isn't `oat_orchestrator_branch`, you are a lane even with no brief. Lanes don't write project records.";

/** The shaping topics, in order, then the two fixed `shape.md` sections. */
const SHAPING_TOPICS = [
  'Goal',
  'Brainstorm or discovery',
  'Documents',
  'Execution',
  'Reviews',
  'Commits, PRs and merges',
  'User involvement',
  'Reshape checkpoints',
] as const;
const SHAPE_HEADINGS = [...SHAPING_TOPICS, 'Project log', 'Undecided'];

/** The sections of the scaffolded decisions.md and memories.md, in order. */
const DECISIONS_HEADINGS = ['Live', 'Superseded'] as const;
const MEMORIES_HEADINGS = ['User preferences', 'Gotchas', 'Context'] as const;

/** The project AGENTS.md first line: the resume order. */
const AGENTS_FIRST_LINE =
  'Read `shape.md`, then the `## Live` section of `decisions.md`, then `memories.md` in this folder before acting: they hold how this project runs, what it has decided and what to keep in mind.';

/** The templates the kickoff reference offers as document starting points. */
const KICKOFF_TEMPLATES = [
  'plan-brief',
  'plan-lite',
  'discovery',
  'spec',
  'design',
  'plan',
  'implementation',
  'implementation-brief',
] as const;

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function h2Headings(content: string): string[] {
  return [...content.matchAll(/^## (.+?)\s*$/gm)].map(
    (match) => match[1] as string,
  );
}

function skillFiles(): Record<string, string> {
  return {
    'SKILL.md': read(join(SKILL_DIR, 'SKILL.md')),
    'references/kickoff.md': read(join(SKILL_DIR, 'references', 'kickoff.md')),
    'references/reshape.md': read(join(SKILL_DIR, 'references', 'reshape.md')),
  };
}

function documentStartingPoints(kickoff: string): string[] {
  const start = kickoff.indexOf('#### Document Starting Points');
  expect(start, 'kickoff has a Document Starting Points table').toBeGreaterThan(
    0,
  );
  const end = kickoff.indexOf('\n#', start + 1);
  return kickoff
    .slice(start, end)
    .split('\n')
    .map((line) => /^\|\s*`([^`]+)`\s*\|/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined);
}

describe('freestyle project AGENTS.md and shape.md contract', () => {
  const agents = read(join(TEMPLATES_DIR, 'project-agents.md'));
  const shape = read(join(TEMPLATES_DIR, 'shape.md'));

  it('pins the project AGENTS.md headings and its resume-order first line', () => {
    expect(h2Headings(agents)).toEqual([...AGENTS_HEADINGS]);
    const body = agents.replace(/^---\n[\s\S]*?\n---\n+/, '');
    expect(body.split('\n')[0]).toBe(AGENTS_FIRST_LINE);
    expect(body).toMatch(/^# Freestyle project: \{Project Name\}$/m);
  });

  it('pins the shape.md headings: every shaping topic in order, then Project log and Undecided', () => {
    expect(h2Headings(shape)).toEqual(SHAPE_HEADINGS);
    expect(shape).toMatch(/^\*\*Last shaped:\*\* not yet shaped$/m);
  });

  it('walks the shaping topics in the same order as the shape.md template', () => {
    const kickoff = skillFiles()['references/kickoff.md'];
    const sections = [...kickoff.matchAll(/^Section: `## (.+?)`\./gm)].map(
      (match) => match[1],
    );
    expect(sections).toEqual([...SHAPING_TOPICS]);
  });

  it('names only headings the scaffolded files or the starting-point templates carry', () => {
    // The adaptation rules name lifecycle sections of the starting-point
    // templates (for example `## Parallelism`) to strip from a copy.
    const known = new Set([
      ...h2Headings(agents),
      ...h2Headings(shape),
      ...DECISIONS_HEADINGS,
      ...MEMORIES_HEADINGS,
      ...KICKOFF_TEMPLATES.flatMap((name) =>
        h2Headings(read(join(TEMPLATES_DIR, `${name}.md`))),
      ),
    ]);
    for (const [file, content] of Object.entries(skillFiles())) {
      for (const match of content.matchAll(/`## ([^`]+)`/g)) {
        expect(
          known.has(match[1] as string),
          `${file} names ## ${match[1]}`,
        ).toBe(true);
      }
    }
  });

  it('shares the scaffold markers between the templates and the skill', () => {
    const { 'SKILL.md': skill, 'references/kickoff.md': kickoff } =
      skillFiles();
    for (const marker of ['_Not yet shaped._', '**Last shaped:**']) {
      expect(shape, `shape.md carries ${marker}`).toContain(marker);
      expect(skill, `SKILL.md names ${marker}`).toContain(marker);
      expect(kickoff, `kickoff names ${marker}`).toContain(marker);
    }
  });

  it('points AGENTS.md and the skill at references that exist', () => {
    expect(agents).toContain('`oat-project-freestyle`');
    expect(agents).toContain('`references/reshape.md`');
    const skill = skillFiles()['SKILL.md'];
    for (const reference of [
      'references/kickoff.md',
      'references/reshape.md',
    ]) {
      expect(skill).toContain(`\`${reference}\``);
      expect(existsSync(join(SKILL_DIR, reference)), reference).toBe(true);
    }
  });
});

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function h2Section(content: string, heading: string): string {
  const start = content.indexOf(`\n## ${heading}\n`);
  expect(start, `section ## ${heading}`).toBeGreaterThanOrEqual(0);
  const next = content.indexOf('\n## ', start + heading.length + 4);
  return content.slice(start, next === -1 ? undefined : next);
}

describe('freestyle orchestrator branch and linked projects guidance (p05)', () => {
  const agents = read(join(TEMPLATES_DIR, 'project-agents.md'));

  it('carries the lane self-test verbatim in the Orchestrator branch section', () => {
    const section = oneLine(h2Section(agents, 'Orchestrator branch'));
    expect(section).toContain(LANE_SELF_TEST);
    for (const command of [
      '`oat project orchestrator set`',
      '`--replace`',
      '`oat project new --link-to`',
      '`oat project linked add`',
      '`oat project linked ack`',
    ]) {
      expect(section, command).toContain(command);
    }
  });

  it('tells the parent to create, save and acknowledge links, and the child never to write the parent', () => {
    const section = oneLine(h2Section(agents, 'Linked projects'));
    expect(section).toContain(
      '`oat project new <child> --mode freestyle --link-to <parent> --purpose "<one line>"`',
    );
    expect(section).toContain('`oat project linked add <child>');
    expect(section).toContain('After every merge and on resume');
    expect(section).toContain('`oat project linked ack <child>`');
    expect(section).toContain("The child never writes the parent's records.");
    expect(section).toContain(
      'claims the child with `oat project orchestrator set`',
    );
    const writer = oneLine(h2Section(agents, 'Single writer'));
    expect(writer).toContain('`linked-projects.md`');
    expect(writer).toContain("a linked project never writes another project's");
  });

  it('claims before shaping and opens a linked child with adopt-or-new in the kickoff reference', () => {
    const { 'SKILL.md': skill, 'references/kickoff.md': kickoff } =
      skillFiles();
    const before = oneLine(between(kickoff, '## Before Shaping', '## Topics'));
    expect(before).toContain(
      '`oat project orchestrator set --project "{project-path}"`',
    );
    expect(before).toContain('this session is a lane. Stop');
    expect(before).toContain(
      "the first question is whether to adopt the parent's shape or define a new one",
    );
    expect(before).toContain('run `oat project pull <parent>` first');
    expect(before).toContain('reset `## Goal` to `_Not yet shaped._`');
    expect(before).toContain("never the parent's files");
    expect(before).toContain(
      "`**Adopted from:** <parent>, last shaped <the parent's Last shaped: date>; adopted sections not yet confirmed.`",
    );
    expect(before).toContain(
      'ask once whether any adopted section should differ',
    );
    // The claim precedes every write in SKILL.md Step 2, the refresh included.
    const step2 = between(skill, '### Step 2', '### Step 3');
    expect(step2.indexOf('**Claim first.**')).toBeGreaterThan(-1);
    expect(step2.indexOf('**Claim first.**')).toBeLessThan(
      step2.indexOf('**Refresh an older `AGENTS.md`.**'),
    );
  });

  describe("refreshes an older project's AGENTS.md from the current template", () => {
    function refreshBlock(): string {
      const section = between(
        skillFiles()['SKILL.md'],
        '**Refresh an older `AGENTS.md`.**',
        'Then determine:',
      );
      const body = /```bash\n([\s\S]*?)```/.exec(section)?.[1];
      expect(body, 'the refresh step has a bash block').toBeDefined();
      return body as string;
    }

    async function scaffolded(root: string): Promise<string> {
      // The real consumer: what `oat project new` writes from the repository
      // template tier.
      mkdirSync(join(root, '.oat', 'templates'), { recursive: true });
      for (const name of [
        'state-freestyle.md',
        'project-agents.md',
        'shape.md',
        'decisions.md',
        'memories.md',
      ]) {
        writeFileSync(
          join(root, '.oat', 'templates', name),
          read(join(TEMPLATES_DIR, name)),
        );
      }
      const result = await scaffoldProject(
        {
          repoRoot: root,
          projectName: 'older',
          mode: 'freestyle',
          scope: 'shared',
          home: join(root, 'home'),
          refreshDashboard: false,
          setActive: false,
        },
        { resolveDefaultScope: async () => 'shared' },
      );
      return join(root, result.projectPath);
    }

    function run(
      root: string,
      projectPath: string,
      resolveExit = 0,
    ): { status: number | null; stdout: string; stderr: string } {
      const bin = join(root, 'bin');
      mkdirSync(bin, { recursive: true });
      // `oat template resolve <name> --output <path>` copies the template raw.
      writeFileSync(
        join(bin, 'oat'),
        [
          '#!/bin/bash',
          `[ "$1 $2" = "template resolve" ] || exit 9`,
          `[ "${resolveExit}" = 0 ] || exit ${resolveExit}`,
          `cp "${join(TEMPLATES_DIR, 'project-agents.md')}" "$5"`,
          '',
        ].join('\n'),
      );
      chmodSync(join(bin, 'oat'), 0o755);
      const result = spawnSync(
        '/bin/bash',
        ['-c', `PROJECT_PATH="${projectPath}"\n${refreshBlock()}`],
        {
          cwd: root,
          encoding: 'utf8',
          env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        },
      );
      return {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    const roots: string[] = [];
    afterEach(() => {
      for (const root of roots) rmSync(root, { recursive: true, force: true });
      roots.length = 0;
    });

    function tempRoot(): string {
      const root = mkdtempSync(join(tmpdir(), 'oat-freestyle-refresh-'));
      roots.push(root);
      return root;
    }

    it('replaces an AGENTS.md that lacks the m02 sections with exactly what the scaffold writes', async () => {
      const root = tempRoot();
      const project = await scaffolded(root);
      const current = readFileSync(join(project, 'AGENTS.md'), 'utf8');
      // An m01-era file: the same OAT text without the two m02 sections.
      const older =
        current.slice(0, current.indexOf('\n## Orchestrator branch\n')) +
        current.slice(current.indexOf('\n## Records commands\n'));
      expect(older).not.toContain('## Linked projects');
      writeFileSync(join(project, 'AGENTS.md'), older);

      const result = run(root, project);
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('## Orchestrator branch');
      expect(result.stdout).toContain('## Linked projects');
      expect(readFileSync(join(project, 'AGENTS.md'), 'utf8')).toBe(current);
    });

    it('leaves a current AGENTS.md untouched and silent', async () => {
      const root = tempRoot();
      const project = await scaffolded(root);
      const current = readFileSync(join(project, 'AGENTS.md'), 'utf8');
      const result = run(root, project);
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
      expect(readFileSync(join(project, 'AGENTS.md'), 'utf8')).toBe(current);
    });

    it('stops and leaves the file when the template does not resolve', async () => {
      const root = tempRoot();
      const project = await scaffolded(root);
      writeFileSync(join(project, 'AGENTS.md'), 'older\n');
      const result = run(root, project, 3);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'could not resolve the project-agents template',
      );
      expect(readFileSync(join(project, 'AGENTS.md'), 'utf8')).toBe('older\n');
    });
  });
});

function between(content: string, start: string, end: string): string {
  const from = content.indexOf(start);
  expect(from, `finds ${start}`).toBeGreaterThanOrEqual(0);
  const to = content.indexOf(end, from + start.length);
  expect(to, `finds ${end} after ${start}`).toBeGreaterThan(from);
  return content.slice(from, to);
}

describe('freestyle resume and review rules', () => {
  const agents = read(join(TEMPLATES_DIR, 'project-agents.md'));
  const shape = read(join(TEMPLATES_DIR, 'shape.md'));

  it('makes a resumed project the active project before shaping or a brainstorm detour', () => {
    const { 'SKILL.md': skill, 'references/kickoff.md': kickoff } =
      skillFiles();
    const resume = between(skill, '**Resume.**', '**Another mode.**');
    const lines = [
      'PROJECT_PATH="{project-path}"',
      'oat config set activeProject "$PROJECT_PATH" || {',
      'ACTIVE_PATH=$(oat config get activeProject 2>/dev/null || true)',
    ];
    const offsets = lines.map((line) => resume.indexOf(line));
    expect(
      offsets.every((offset) => offset >= 0),
      'resume sets PROJECT_PATH',
    ).toBe(true);
    expect([...offsets].sort((x, y) => x - y)).toEqual(offsets);
    expect(resume).toContain('`oat-brainstorm`');
    expect(skill.indexOf('**Resume.**')).toBeLessThan(
      skill.indexOf('### Step 2'),
    );
    const detour = between(
      kickoff,
      '**Brainstorm with `oat-brainstorm`.** Before handing off:',
      'Record in this section:',
    );
    expect(detour).toContain('`oat config get activeProject`');
  });

  describe('stops when the active-project pointer does not name the project (m01 H4)', () => {
    // Runs Step 1's resume and create blocks against a stub `oat`, so a
    // failed pointer write, a failed scaffold, or a stale pointer is seen to
    // stop the run instead of shaping against the previous project.
    function block(start: string, end: string): string {
      const section = between(skillFiles()['SKILL.md'], start, end);
      const body = /```bash\n([\s\S]*?)```/.exec(section)?.[1];
      expect(body, `${start} has a bash block`).toBeDefined();
      return body as string;
    }

    function run(
      script: string,
      env: Record<string, string>,
      subdir = '',
    ): { status: number | null; stdout: string; stderr: string } {
      const root = mkdtempSync(join(tmpdir(), 'oat-freestyle-pointer-'));
      try {
        for (const name of ['new-one', 'old-one', 'quo"te']) {
          mkdirSync(join(root, '.oat/projects/shared', name), {
            recursive: true,
          });
          writeFileSync(
            join(root, '.oat/projects/shared', name, 'state.md'),
            '---\noat_workflow_mode: freestyle\n---\n',
          );
        }
        const bin = join(root, 'bin');
        mkdirSync(bin);
        writeFileSync(
          join(bin, 'oat'),
          [
            '#!/bin/bash',
            'case "$1 $2" in',
            '  "config set") exit "${STUB_SET_EXIT:-0}" ;;',
            '  "config get") printf \'%s\\n\' "$STUB_GET" ;;',
            '  "project new") printf \'%s\\n\' "$STUB_NEW_JSON"; exit "${STUB_NEW_EXIT:-0}" ;;',
            'esac',
            '',
          ].join('\n'),
        );
        chmodSync(join(bin, 'oat'), 0o755);
        mkdirSync(join(root, subdir), { recursive: true });
        const result = spawnSync(
          '/bin/bash',
          ['-c', `${script}\nprintf 'reached=%s\\n' "$PROJECT_PATH"`],
          {
            cwd: join(root, subdir),
            encoding: 'utf8',
            env: { ...process.env, ...env, PATH: `${bin}:${process.env.PATH}` },
          },
        );
        return {
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }

    const NEW = '.oat/projects/shared/new-one';
    const OLD = '.oat/projects/shared/old-one';

    it('resume stops on a failed pointer write or a pointer naming another project', () => {
      const resume = block('**Resume.**', '**Another mode.**').replaceAll(
        '{project-path}',
        NEW,
      );
      // A failed write stops even when the pointer happens to name the
      // project already, so only the write's own exit code can stop it.
      const failedWrite = run(resume, { STUB_SET_EXIT: '1', STUB_GET: NEW });
      expect(failedWrite.stderr).toContain('could not make');
      expect(failedWrite.status).toBe(1);
      expect(failedWrite.stdout).not.toContain('reached=');
      const stale = run(resume, { STUB_GET: OLD });
      expect(stale.stderr).toContain(`the active project is '${OLD}'`);
      expect(stale.status).toBe(1);
      expect(stale.stdout).not.toContain('reached=');
      const ok = run(resume, { STUB_GET: NEW });
      expect(ok.status).toBe(0);
      expect(ok.stdout).toContain(`reached=${NEW}`);
    });

    it('resume stops when neither directory resolves, and still passes at the repository root (m01 I-2)', () => {
      const resume = block('**Resume.**', '**Another mode.**').replaceAll(
        '{project-path}',
        NEW,
      );
      // From a subdirectory the repo-relative paths resolve nowhere; two
      // failed lookups must not compare equal.
      const fromSubdir = run(resume, { STUB_GET: NEW }, 'src');
      expect(fromSubdir.stderr, 'subdirectory: stop message').toContain(
        `the active project is '${NEW}'`,
      );
      expect(fromSubdir.status, 'subdirectory: stops').toBe(1);
      expect(fromSubdir.stdout).not.toContain('reached=');
      const MISSING = '.oat/projects/shared/missing';
      const missing = run(resume.replaceAll(NEW, MISSING), {
        STUB_GET: MISSING,
      });
      expect(missing.status, 'missing on both sides: stops').toBe(1);
      expect(missing.stdout).not.toContain('reached=');
      const atRoot = run(resume, { STUB_GET: NEW });
      expect(atRoot.status, 'repository root: continues').toBe(0);
      expect(atRoot.stdout).toContain(`reached=${NEW}`);
    });

    it('create stops on a failed scaffold and uses the path the scaffold reports', () => {
      const create = block('**Create.**', '### Step 2')
        .replaceAll('{project-name}', 'new-one')
        .replaceAll('{scope}', 'shared');
      const reported = `{\n  "status": "ok",\n  "projectPath": "${NEW}"\n}`;
      // A failed scaffold stops even when its output names a usable path and
      // the pointer, so only the scaffold's own exit code can stop it.
      const failed = run(create, {
        STUB_NEW_EXIT: '1',
        STUB_NEW_JSON: reported,
        STUB_GET: NEW,
      });
      expect(failed.stderr).toContain('oat project new failed');
      expect(failed.status).toBe(1);
      expect(failed.stdout).not.toContain('reached=');
      // The pointer was not repointed: re-reading it would name old-one.
      const stale = run(create, { STUB_NEW_JSON: reported, STUB_GET: OLD });
      expect(stale.stderr).toContain(`the active project is '${OLD}'`);
      expect(stale.status).toBe(1);
      expect(stale.stdout).not.toContain('reached=');
      const ok = run(create, { STUB_NEW_JSON: reported, STUB_GET: NEW });
      expect(ok.status).toBe(0);
      expect(ok.stdout).toContain(`reached=${NEW}`);
      // The reported path is decoded as JSON, so a `"` in it survives.
      const QUOTED = '.oat/projects/shared/quo"te';
      const quoted = run(create, {
        STUB_NEW_JSON: JSON.stringify({ status: 'ok', projectPath: QUOTED }),
        STUB_GET: QUOTED,
      });
      expect(quoted.stderr).toBe('');
      expect(quoted.status).toBe(0);
      expect(quoted.stdout).toContain(`reached=${QUOTED}`);
    });
  });

  it('checks the same reshape triggers on every resume in SKILL.md and reshape.md', () => {
    const { 'SKILL.md': skill, 'references/reshape.md': reshape } =
      skillFiles();
    const step2 = between(skill, '### Step 2', '### Step 3');
    for (const text of [step2, reshape].map((part) =>
      part.replace(/\s+/g, ' '),
    )) {
      const rule = text.slice(
        text.indexOf('triggers to check on every resume'),
      );
      expect(rule.length, 'names the resume trigger check').toBeGreaterThan(
        'triggers to check on every resume'.length,
      );
      const sentence = rule.slice(0, rule.indexOf('.') + 1);
      expect(sentence).toMatch(/checkpoints/);
      expect(sentence).toMatch(/Undecided/);
      expect(sentence).toMatch(/stopped working/);
    }
  });

  it('gives each reshape decision its own log idempotency identity', () => {
    const { 'references/reshape.md': reshape } = skillFiles();
    const blocks = [...reshape.matchAll(/```bash\n([\s\S]*?)```/g)].map(
      (match) => match[1] as string,
    );
    const mint = blocks.find((body) => body.includes('RESHAPE_ID='));
    const append = blocks.find((body) =>
      body.includes('oat project log append'),
    );
    expect(mint, 'a mint block').toBeDefined();
    expect(append, 'an append block').toBeDefined();
    // A retry re-runs the append block alone, so the append never re-mints.
    expect(append).not.toContain('RESHAPE_ID=');
    expect(append).toContain('--idempotency-key "$RESHAPE_ID"');
    const rule = reshape.replace(/\s+/g, ' ');
    expect(rule).toContain('Mint `RESHAPE_ID` once for this reshape decision');
    expect(rule).toContain(
      "reuse that same value only to retry this decision's append",
    );

    // Two decisions on the same topic within the same second still get two
    // identities: `date` is pinned, so only the minted suffix can differ.
    const root = mkdtempSync(join(tmpdir(), 'oat-freestyle-reshape-'));
    try {
      const bin = join(root, 'bin');
      mkdirSync(bin);
      writeFileSync(join(bin, 'date'), '#!/bin/bash\necho 20261122T010203Z\n');
      chmodSync(join(bin, 'date'), 0o755);
      const mintOnce = (): string => {
        const result = spawnSync(
          '/bin/bash',
          ['-c', (mint as string).replaceAll('{topic-slug}', 'review')],
          {
            encoding: 'utf8',
            env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
          },
        );
        expect(result.status).toBe(0);
        return result.stdout.trim();
      };
      const first = mintOnce();
      const second = mintOnce();
      expect(first).toMatch(/^reshape-20261122T010203Z-review-[0-9a-f]{8}$/);
      expect(second).toMatch(/^reshape-20261122T010203Z-review-[0-9a-f]{8}$/);
      expect(second).not.toBe(first);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('tells a resuming session what to do with a pending brainstorm result', () => {
    const { 'SKILL.md': skill, 'references/kickoff.md': kickoff } =
      skillFiles();
    const step2 = between(skill, '### Step 2', '### Step 3');
    const guard = between(kickoff, '## Shaping Guard', '## Topics');
    for (const text of [step2, guard]) {
      expect(text).toContain('`result: pending`');
      expect(text).toContain('`brainstorming/`');
      expect(text).toContain('resume the brainstorm');
    }
  });

  it('carries the review-mechanism re-check into the files read at review time', () => {
    const reviewsPrompt = between(
      shape,
      '## Reviews',
      '## Commits, PRs and merges',
    );
    expect(reviewsPrompt).toContain('re-check its mechanism');
    expect(reviewsPrompt).toContain('keep the intent');
    const shaping = agents.slice(agents.indexOf('## Shaping and reshaping'));
    expect(shaping).toContain('re-check its mechanism');
    expect(shaping).toContain("keep the review's intent");
  });

  it("names the skill's own reshape reference, not the project's references folder", () => {
    const shaping = agents.slice(agents.indexOf('## Shaping and reshaping'));
    expect(shaping).toContain(
      "the `oat-project-freestyle` skill's own `references/reshape.md`",
    );
    expect(shaping).toContain("not this project's `references/`");
  });
});

describe('freestyle kickoff document starting points', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('lists the agreed starting points', () => {
    expect(
      documentStartingPoints(skillFiles()['references/kickoff.md']),
    ).toEqual([...KICKOFF_TEMPLATES]);
  });

  it('flags the lifecycle convention lines of the starting points with its leftover check', () => {
    const kickoff = skillFiles()['references/kickoff.md'];
    const pattern =
      /grep -nE '([^']+)' "\{project-path\}\/\{document\}\.md"/.exec(
        kickoff,
      )?.[1];
    expect(pattern, 'kickoff carries the leftover grep').toBeDefined();
    const leftover = new RegExp(pattern as string);
    const conventionLines = KICKOFF_TEMPLATES.flatMap((name) =>
      read(join(TEMPLATES_DIR, `${name}.md`))
        .split('\n')
        .filter((line) =>
          /^\*\*(Commit Convention|Phase block grammar)/.test(line),
        )
        .map((line) => `${name}: ${line}`),
    );
    // plan-brief carries both lines and plan carries the commit convention.
    expect(conventionLines.length).toBeGreaterThanOrEqual(3);
    for (const line of conventionLines) {
      expect(leftover.test(line.slice(line.indexOf(': ') + 2)), line).toBe(
        true,
      );
    }
  });

  it.each(KICKOFF_TEMPLATES)(
    'resolves %s from the bundle with no repository or user tier',
    async (name) => {
      const cwd = await mkdtemp(join(tmpdir(), 'oat-freestyle-kickoff-'));
      const home = await mkdtemp(join(tmpdir(), 'oat-freestyle-kickoff-home-'));
      tempDirs.push(cwd, home);

      const result = await runTemplateResolve({
        name,
        cwd,
        home,
        resolveProjectRoot: async () => {
          throw new CliError('not a repository', 1);
        },
        resolveAssetsRoot,
      });

      expect(result).toMatchObject({ found: true, tier: 'bundle' });
    },
  );
});

describe('freestyle dispatch, lane reports and lane placement guidance (p07)', () => {
  const agents = read(join(TEMPLATES_DIR, 'project-agents.md'));
  const dispatch = oneLine(h2Section(agents, 'Dispatch'));
  const reports = oneLine(h2Section(agents, 'Lane reports'));
  const placement = oneLine(h2Section(agents, 'Lane placement'));

  it('names every lane state and waiting-on kind lane set accepts', () => {
    for (const state of LANE_STATES) {
      expect(dispatch, state).toContain(`\`${state}\``);
    }
    expect(dispatch).toContain(`--waiting-on ${WAITING_ON_KINDS.join('|')}`);
  });

  it('names only lane set options the command has', () => {
    const set = createProjectLaneCommand().commands.find(
      (command) => command.name() === 'set',
    );
    const flags = new Set(set?.options.map((option) => option.long));
    const named = new Set(
      [dispatch, reports, placement]
        .join(' ')
        .match(/--[a-z][a-z-]+/g)
        ?.filter(
          (flag) =>
            flag !== '--project-path' &&
            flag !== '--output' &&
            flag !== '--ref',
        ),
    );
    expect(named.size).toBeGreaterThan(10);
    for (const flag of named) {
      expect(flags.has(flag), flag).toBe(true);
    }
  });

  it('defines a dispatch, the steer and no-report cases, the brief contents and the resume reconcile', () => {
    expect(dispatch).toContain(
      'A dispatch is one request to a lane that ends in one report',
    );
    expect(dispatch).toContain('`--steer "<one line>"`');
    expect(dispatch).toContain('Wakes are notifications, not dispatches.');
    expect(dispatch).toContain(
      'An interrupted turn closes its dispatch with `--no-report`.',
    );
    expect(dispatch).toContain(
      '`oat template resolve lane-report --output <path>` and embed it whole',
    );
    expect(dispatch).toContain('that the lane writes no project records');
    expect(dispatch).toContain(
      'record what you find with `lane set` before any redispatch',
    );
  });

  it('files a report verbatim before acting, never edits it, and keys log entries by dispatch ID', () => {
    expect(reports).toContain('File it before acting on it');
    expect(reports).toContain(
      '`oat project lane set <lane> --report <file> --head <delivered head>`',
    );
    expect(reports).toContain('A filed report is never edited.');
    expect(reports).toContain('keyed by the dispatch ID');
    expect(reports).toContain(
      'whose `--ref` is the update ID that `lane set` printed for the update recording the event; other ledger updates get no log entry',
    );
    expect(reports).toContain('Do not merge unreported commits unreviewed');
  });

  it('supports both placements and prescribes neither', () => {
    expect(placement).toContain('OAT supports both and prescribes neither');
    expect(placement).toContain('`shared-worktree`');
    expect(placement).toContain('`own-worktree`');
    expect(placement).toContain('the head-ahead check does not apply');
    expect(placement).toContain('(`oat internal commit-paths`)');
  });

  it('lists the ledger and reports as orchestrator-only records and lane set as guarded', () => {
    const writer = oneLine(h2Section(agents, 'Single writer'));
    expect(writer).toContain('`lanes.md`');
    expect(writer).toContain('`lane-reports/`');
    expect(writer).toContain("a lane's final message is its report");
    expect(oneLine(h2Section(agents, 'Orchestrator branch'))).toContain(
      '`oat project lane set`) refuse to run off the recorded branch',
    );
    const files = oneLine(h2Section(agents, 'Project files'));
    expect(files).toContain('`lanes.md`');
    expect(files).toContain('`lane-reports/`');
  });
});

/**
 * Runs a first-use block (`for NAME in decisions memories ...`) against a stub
 * `oat template resolve` that copies the repository template raw, as the real
 * resolver does.
 */
function runFirstUse(
  root: string,
  block: string,
  env: Record<string, string>,
  resolveExit = 0,
): { status: number | null; stdout: string; stderr: string } {
  const bin = join(root, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, 'oat'),
    [
      '#!/bin/bash',
      `[ "$1 $2" = "template resolve" ] || exit 9`,
      `[ "$4" = "--output" ] || exit 8`,
      `[ "${resolveExit}" = 0 ] || exit ${resolveExit}`,
      `cp "${TEMPLATES_DIR}/$3.md" "$5"`,
      '',
    ].join('\n'),
  );
  chmodSync(join(bin, 'oat'), 0o755);
  const result = spawnSync('/bin/bash', ['-c', block], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env, PATH: `${bin}:${process.env.PATH}` },
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe('freestyle decisions and memories (p10)', () => {
  const agents = read(join(TEMPLATES_DIR, 'project-agents.md'));
  const decisions = read(join(TEMPLATES_DIR, 'decisions.md'));
  const memories = read(join(TEMPLATES_DIR, 'memories.md'));
  const section = oneLine(h2Section(agents, 'Decisions and memories'));
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  it('pins the decisions.md and memories.md sections, with no template frontmatter', () => {
    expect(h2Headings(decisions)).toEqual([...DECISIONS_HEADINGS]);
    expect(h2Headings(memories)).toEqual([...MEMORIES_HEADINGS]);
    // `oat template resolve --output` copies raw, so first use writes exactly
    // what the scaffold writes only when there is nothing to render.
    for (const content of [decisions, memories]) {
      expect(content).not.toMatch(/^---$/m);
      expect(content).not.toMatch(/\{[A-Za-z ]+\}|YYYY-MM-DD/);
    }
    expect(decisions.startsWith('# Decisions\n')).toBe(true);
    expect(memories.startsWith('# Memories\n')).toBe(true);
    const form = oneLine(decisions);
    expect(form).toContain('a `### drNN · <decision statement>` heading');
    expect(form).toContain('`Supersedes: drNN`');
    expect(form).toContain('`Superseded by drNN, <date>`');
  });

  it('names both files in the AGENTS.md project files, single-writer list and resume line', () => {
    const files = oneLine(h2Section(agents, 'Project files'));
    expect(files).toContain('- `decisions.md`:');
    expect(files).toContain('- `memories.md`:');
    const writer = oneLine(h2Section(agents, 'Single writer'));
    expect(writer).toContain(
      "the project records: `shape.md`, `decisions.md`, `memories.md`, the project's documents,",
    );
    const first = agents.replace(/^---\n[\s\S]*?\n---\n+/, '').split('\n')[0];
    expect(first).toBe(AGENTS_FIRST_LINE);
    const order = [
      '`shape.md`',
      '`## Live`',
      '`decisions.md`',
      '`memories.md`',
    ];
    const offsets = order.map((name) => first?.indexOf(name) ?? -1);
    expect(offsets.every((offset) => offset >= 0)).toBe(true);
    expect([...offsets].sort((x, y) => x - y)).toEqual(offsets);
  });

  it('states the authority rule, the supersession steps and first-use creation', () => {
    expect(section).toContain(
      '`shape.md` how this project works, `decisions.md` what it chose about the work and why, `memories.md` what a returning agent should keep in mind, and `project-log.md` what happened and when',
    );
    expect(section).toContain(
      'A change to how the project works is a reshape: it stays in `shape.md`, with its `decision` entry in the project log.',
    );
    expect(section).toContain(
      'A decision about the work lives only in `decisions.md`',
    );
    expect(section).toContain(
      'points to `decisions.md` instead of repeating it',
    );
    expect(section).toContain('What is still true goes in `memories.md`');
    expect(section).toContain('by hand, with no command');
    expect(section).toContain(
      'add the new entry under `## Live` with `Supersedes: drNN`, then move the replaced entry intact to `## Superseded` and add `Superseded by drNN, <date>` to it',
    );
    expect(section).toContain('Create each one only when it is absent');
    expect(section).toContain(
      'A linked project starts with its own empty files',
    );
    // The shape.md Project log paragraph defers to decisions.md.
    const log = oneLine(
      h2Section(read(join(TEMPLATES_DIR, 'shape.md')), 'Project log'),
    );
    expect(log).toContain(
      'Decisions about the work live only in `decisions.md`',
    );
    expect(log).toContain('a `decision` entry may cite one by its `drNN`');
    expect(log).toContain('what is still true goes in `memories.md`');
  });

  it('creates each missing file with the AGENTS.md first-use block and never touches an existing one', () => {
    const root = mkdtempSync(join(tmpdir(), 'oat-freestyle-first-use-'));
    roots.push(root);
    const project = join(root, 'project');
    mkdirSync(project);
    const block = /```bash\n([\s\S]*?)```/
      .exec(h2Section(agents, 'Decisions and memories'))?.[1]
      ?.replace(/^ {2}/gm, '')
      .replaceAll('<project-path>', project);
    expect(block, 'the first-use step has a bash block').toBeDefined();

    // An older project with a memories.md already written by hand.
    writeFileSync(join(project, 'memories.md'), '# Memories\n\n- kept\n');
    const first = runFirstUse(root, block as string, {});
    expect(first.stderr).toBe('');
    expect(first.status).toBe(0);
    expect(read(join(project, 'decisions.md'))).toBe(decisions);
    expect(read(join(project, 'memories.md'))).toBe('# Memories\n\n- kept\n');

    // Both present: a resolver that would fail is never called.
    writeFileSync(join(project, 'decisions.md'), '# Decisions\n\n- kept\n');
    const again = runFirstUse(root, block as string, {}, 3);
    expect(again.status).toBe(0);
    expect(read(join(project, 'decisions.md'))).toBe('# Decisions\n\n- kept\n');
  });

  describe("creates a missing file in the skill's resume step (SKILL.md Step 2)", () => {
    function step2(): string {
      return between(skillFiles()['SKILL.md'], '### Step 2', '### Step 3');
    }

    function block(): string {
      const body = /```bash\n([\s\S]*?)```/.exec(
        between(
          step2(),
          '**Create a missing `decisions.md` or `memories.md`.**',
          'Then determine:',
        ),
      )?.[1];
      expect(body, 'the first-use step has a bash block').toBeDefined();
      return body as string;
    }

    function project(): { root: string; project: string } {
      const root = mkdtempSync(join(tmpdir(), 'oat-freestyle-resume-'));
      roots.push(root);
      const path = join(root, 'project');
      mkdirSync(path);
      return { root, project: path };
    }

    it('runs after the claim and the AGENTS.md refresh, then reads Live and memories', () => {
      const text = step2();
      const claim = text.indexOf('**Claim first.**');
      const refresh = text.indexOf('**Refresh an older `AGENTS.md`.**');
      const create = text.indexOf(
        '**Create a missing `decisions.md` or `memories.md`.**',
      );
      expect(claim).toBeGreaterThan(-1);
      expect(claim).toBeLessThan(refresh);
      expect(refresh).toBeLessThan(create);
      expect(create).toBeLessThan(text.indexOf('Then determine:'));
      expect(oneLine(text)).toContain(
        'Then read all of the `## Live` section of `decisions.md`, and `memories.md`',
      );
      expect(oneLine(text)).toContain(
        'An entry under `## Superseded` is history; never act on it.',
      );
    });

    it('creates each absent file from the template and leaves an existing one byte-identical', () => {
      const { root, project: path } = project();
      writeFileSync(join(path, 'decisions.md'), '# Decisions\n\n- kept\n');
      const result = runFirstUse(root, block(), { PROJECT_PATH: path });
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(result.stdout).toBe(
        `freestyle: created ${join(path, 'memories.md')}\n`,
      );
      expect(read(join(path, 'memories.md'))).toBe(memories);
      expect(read(join(path, 'decisions.md'))).toBe('# Decisions\n\n- kept\n');

      const again = runFirstUse(root, block(), { PROJECT_PATH: path }, 3);
      expect(again.status).toBe(0);
      expect(again.stdout).toBe('');
    });

    it('stops when the template does not resolve', () => {
      const { root, project: path } = project();
      const result = runFirstUse(root, block(), { PROJECT_PATH: path }, 3);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'could not create decisions.md from the decisions template; stopping',
      );
      expect(existsSync(join(path, 'memories.md'))).toBe(false);
    });
  });

  it("keeps the parent's decisions and memories out of an adopted shape, and points a document's decisions at decisions.md", () => {
    const kickoff = skillFiles()['references/kickoff.md'];
    const before = oneLine(between(kickoff, '## Before Shaping', '## Topics'));
    expect(before).toContain(
      'Copy only `shape.md`: this project keeps its own empty `decisions.md` and `memories.md`.',
    );
    const adapting = oneLine(
      between(kickoff, '#### Adapting a Copied Template', '### 4. Execution'),
    );
    expect(adapting).toContain(
      'Point a decisions section at `decisions.md`: decisions about the work live only there.',
    );
    expect(adapting).toContain(
      'replace the body of its `## Decisions` section with a line such as',
    );
    expect(h2Headings(read(join(TEMPLATES_DIR, 'plan-brief.md')))).toContain(
      'Decisions',
    );
  });

  it('names the lane notes path as authorized scratch in the dispatch section, and promotion after filing', () => {
    const dispatch = oneLine(h2Section(agents, 'Dispatch'));
    expect(dispatch).toContain('its lane notes path; and the report shape');
    expect(dispatch).toContain(
      'to an uncommitted notes file in its own checkout, `.oat/analysis/lane-notes/<lane>-<dispatch>.md`',
    );
    expect(dispatch).toContain(
      "builds its report's Decisions and Learnings from it",
    );
    expect(dispatch).toContain(
      "names that path as authorized scratch, outside a same-checkout lane's `paths:`",
    );
    expect(dispatch).toContain('`.oat/**/analysis`');
    expect(dispatch).toContain('the brief names a path outside the checkout');
    expect(dispatch).toContain(
      'A read-only delegate keeps no notes: its brief tells it to return its decisions and learnings in its final message.',
    );
    const reports = oneLine(h2Section(agents, 'Lane reports'));
    expect(reports).toContain(
      '4. Promote what you accept from its Decisions and Learnings: a decision as a `decisions.md` entry, and a gotcha, user preference or still-true context as a `memories.md` bullet, each citing the dispatch ID',
    );
    expect(reports.indexOf('3. Append')).toBeLessThan(
      reports.indexOf('4. Promote'),
    );
  });

  it('tells the lane to keep its notes file and build its Decisions and Learnings from it', () => {
    const report = oneLine(read(join(TEMPLATES_DIR, 'lane-report.md')));
    expect(report).toContain(
      'While you work, write each decision you make and each gotcha you hit to the lane notes file your brief names, as it happens, so they survive your own compaction; never commit it. Build the Decisions and Learnings sections below from it.',
    );
    expect(report).toContain(
      'A read-only lane keeps no notes file and writes its decisions and learnings straight into this report.',
    );
    expect(report).toContain(
      "do not write project records (the ledger, the project log, `shape.md`, `decisions.md`, `memories.md` or the project's documents)",
    );
  });
});

/** The lane report's sections, from the brief's Lane reports decision. */
const LANE_REPORT_SECTIONS = [
  'Summary',
  'Delivered',
  'Verification',
  'Decisions',
  'Deviations',
  'Steering received',
  'Review findings',
  'Learnings',
  'Open items',
  'Proposed log entries',
] as const;

function h3Headings(content: string): string[] {
  return [...content.matchAll(/^### (.+?)\s*$/gm)].map(
    (match) => match[1] as string,
  );
}

describe('freestyle lane report shape (p07)', () => {
  const template = read(join(TEMPLATES_DIR, 'lane-report.md'));
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('pins the report sections in order, Summary split into this round and the lane so far', () => {
    expect(h2Headings(template)).toEqual([...LANE_REPORT_SECTIONS]);
    expect(h3Headings(template)).toEqual(['This round', 'Lane so far']);
    expect(oneLine(template)).toContain(
      '**Tested SHA:** {full SHA; it must equal the delivered head}',
    );
    expect(oneLine(template)).toContain(
      'as your final message for this dispatch, with nothing after it',
    );
    // Embedded whole in a brief, so it carries no template frontmatter.
    expect(template.startsWith('# Lane report: {lane}-{dispatch}\n')).toBe(
      true,
    );
  });

  it('builds a dispatch brief that carries the report shape from the bundle alone (isolated HOME, no repository tier)', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'oat-lane-report-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-lane-report-home-'));
    tempDirs.push(cwd, home);
    const output = join(cwd, 'lane-report.md');

    const result = await runTemplateResolve({
      name: 'lane-report',
      cwd,
      home,
      output,
      resolveProjectRoot: async () => {
        throw new CliError('not a repository', 1);
      },
      resolveAssetsRoot,
    });
    expect(result).toMatchObject({
      found: true,
      tier: 'bundle',
      path: null,
      output,
    });
    const shape = read(output);
    expect(shape).toBe(template);

    // The brief embeds the resolved shape whole, after the dispatch facts.
    const brief = [
      'You are lane l01 of project demo, dispatch d02.',
      'Rules: .oat/projects/shared/demo/AGENTS.md',
      'Shape: .oat/projects/shared/demo/shape.md',
      'Return this report as your final message:',
      '',
      shape,
    ].join('\n');
    expect(h2Headings(brief)).toEqual([...LANE_REPORT_SECTIONS]);
    expect(h3Headings(brief)).toEqual(['This round', 'Lane so far']);
    expect(brief).toContain(shape);
  });

  it('lets a user-tier lane-report.md override the bundled shape', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'oat-lane-report-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-lane-report-home-'));
    tempDirs.push(cwd, home);
    mkdirSync(join(home, '.oat', 'templates'), { recursive: true });
    writeFileSync(
      join(home, '.oat', 'templates', 'lane-report.md'),
      '# Our report\n',
    );
    const output = join(cwd, 'lane-report.md');
    const result = await runTemplateResolve({
      name: 'lane-report',
      cwd,
      home,
      output,
      resolveProjectRoot: async () => {
        throw new CliError('not a repository', 1);
      },
      resolveAssetsRoot,
    });
    expect(result).toMatchObject({ found: true, tier: 'user' });
    expect(read(output)).toBe('# Our report\n');
  });
});

describe('oat-brainstorm freestyle route', () => {
  const brainstorm = read(
    join(REPO_ROOT, '.agents', 'skills', 'oat-brainstorm', 'SKILL.md'),
  );
  const branch9j = brainstorm.slice(
    brainstorm.indexOf('#### 9j'),
    brainstorm.indexOf('#### 9k'),
  );

  it('routes a related freestyle brainstorm to the reference file, never fold-back', () => {
    const router = brainstorm.slice(
      brainstorm.indexOf('#### 9h'),
      brainstorm.indexOf('#### 9i'),
    );
    expect(router).toContain(
      'For a freestyle project (`ACTIVE_PROJECT_MODE == "freestyle"`) there is no fold-back: proceed to branch 9j instead.',
    );
  });

  it("decides persistence from shape.md's commit agreement before the persistence block", () => {
    const decision = branch9j.indexOf('**Freestyle projects.**');
    const persistence = branch9j.indexOf(
      'PROJECT_SCOPE=$(oat project scope "$ACTIVE_PROJECT" --format value)',
    );
    expect(decision).toBeGreaterThan(0);
    expect(persistence).toBeGreaterThan(decision);
    const rule = branch9j.slice(decision, persistence);
    expect(rule).toContain('`## Commits, PRs and merges`');
    expect(rule).toContain('`_Not yet shaped._`');
    expect(rule).toContain('`Deferred:`');
    expect(rule).toContain(
      'skip the persistence block below: commit and push nothing',
    );
  });

  it('publishes a synced reference only when the agreement publishes now (m01 I-1, R7-1)', () => {
    // Run the published 9j persistence block, with the receipt parser the
    // skill defines, against a real synced project and a scratch origin.
    const persistence = /```bash\n([\s\S]*?)```/.exec(
      branch9j.slice(branch9j.indexOf('**Freestyle projects.**')),
    )?.[1];
    expect(persistence, '9j persistence block').toContain(
      'oat project push "$ACTIVE_PROJECT"',
    );
    const parserStart = brainstorm.indexOf('parse_synced_push_receipt() {');
    const parser = brainstorm
      .slice(parserStart, brainstorm.indexOf('\n   }\n', parserStart) + 5)
      .replace(/^ {3}/gm, '');
    expect(parser).toContain('process.stdout.write(value.sha)');
    const script = `${parser}\n${(persistence as string).replaceAll('<project-name>', 'demo')}\nprintf 'sha=%s\\n' "$REFERENCE_COMMIT_SHA"\n`;

    const root = mkdtempSync(join(tmpdir(), 'oat-brainstorm-publish-'));
    try {
      const cli = join(REPO_ROOT, 'packages', 'cli', 'dist', 'index.js');
      const bin = join(root, 'bin');
      const repo = join(root, 'repo');
      const origin = join(root, 'origin.git');
      mkdirSync(bin);
      writeFileSync(join(bin, 'oat'), `#!/bin/bash\nexec node "${cli}" "$@"\n`);
      chmodSync(join(bin, 'oat'), 0o755);
      const env = {
        ...process.env,
        HOME: join(root, 'home'),
        PATH: `${bin}:${process.env.PATH}`,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
        OAT_PROJECTS_DEFAULT_SCOPE: '',
        OAT_PROJECTS_ROOT: '',
      };
      const sh = (command: string, cwd = repo) => {
        const result = spawnSync('/bin/bash', ['-c', command], {
          cwd,
          encoding: 'utf8',
          env,
        });
        expect(result.status, `${command}\n${result.stderr}`).toBe(0);
        return result.stdout.trim();
      };
      sh(`git init -q --bare "${origin}" && git init -q "${repo}"`, root);
      sh(
        `git remote add origin "${origin}" && git commit -q --allow-empty -m init`,
      );
      sh(
        'oat --json project new demo --mode freestyle --scope synced --no-dashboard >/dev/null',
      );
      sh(
        'oat --json project new quickie --mode quick --scope synced --no-dashboard >/dev/null',
      );
      const project = '.oat/projects/synced/demo';
      const quickProject = '.oat/projects/synced/quickie';
      const remoteRef = (slug = 'demo') =>
        sh(`git ls-remote origin refs/oat/projects/${slug}`).split(/\s/)[0];
      const parentHead = sh('git rev-parse HEAD');

      const persist = (
        file: string,
        publish?: string,
        target = { path: project, mode: 'freestyle' },
      ) => {
        mkdirSync(join(repo, target.path, 'brainstorming'), {
          recursive: true,
        });
        writeFileSync(
          join(repo, target.path, 'brainstorming', file),
          `# ${file}\n`,
        );
        const result = spawnSync('/bin/bash', ['-c', script], {
          cwd: repo,
          encoding: 'utf8',
          env: {
            ...env,
            ACTIVE_PROJECT: target.path,
            ACTIVE_PROJECT_MODE: target.mode,
            REFERENCE_PATH: `${target.path}/brainstorming/${file}`,
            COMMIT_IDENTITY: `test-${file}`,
            ...(publish === undefined ? {} : { REFERENCE_PUBLISH: publish }),
          },
        });
        expect(result.status, result.stderr).toBe(0);
        return /sha=([0-9a-f]{40})/.exec(result.stdout)?.[1];
      };

      // Commit-only: committed in the project checkout, origin unchanged.
      const published = remoteRef();
      const commitOnly = persist('2026-11-22-commit-only.md', 'no');
      expect(commitOnly).toBe(sh(`git -C ${project} rev-parse HEAD`));
      expect(sh(`git -C ${project} status --porcelain`)).toBe('');
      expect(remoteRef(), 'commit-only agreement: origin ref unchanged').toBe(
        published,
      );
      // A push agreement (REFERENCE_PUBLISH unset) advances the origin ref.
      const pushed = persist('2026-11-22-pushed.md');
      expect(pushed).not.toBe(commitOnly);
      expect(remoteRef(), 'push agreement: origin ref advanced').toBe(pushed);
      // A REFERENCE_PUBLISH=no left in the shell by a freestyle run never
      // stops another mode's push (m01 R7-1).
      const quickBefore = remoteRef('quickie');
      const quickPushed = persist('2026-11-22-quick.md', 'no', {
        path: quickProject,
        mode: 'quick',
      });
      expect(quickPushed).not.toBe(quickBefore);
      expect(
        remoteRef('quickie'),
        'synced quick with a stale REFERENCE_PUBLISH=no: origin ref advanced',
      ).toBe(quickPushed);
      expect(sh('git rev-parse HEAD'), 'no parent branch commit').toBe(
        parentHead,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);

  it('hands back to oat-project-freestyle at the topic shape.md records', () => {
    const handBack = branch9j.slice(
      branch9j.indexOf('**Freestyle hand-back.**'),
    );
    expect(handBack).toContain('Return to `oat-project-freestyle`');
    expect(handBack).toContain('`**Shaping resumes at:**`');
    // The kickoff reference writes the line the brainstorm reads back.
    expect(skillFiles()['references/kickoff.md']).toContain(
      '`**Shaping resumes at:** <next topic not yet shaped>',
    );
  });

  it('carries the freestyle exceptions into the destinations catalog', () => {
    const destinations = read(
      join(
        REPO_ROOT,
        '.agents',
        'skills',
        'oat-brainstorm',
        'references',
        'destinations.md',
      ),
    );
    const entry = (title: string) => {
      const start = destinations.indexOf(`### Destination: ${title}`);
      expect(start, title).toBeGreaterThan(0);
      const end = destinations.indexOf('\n### ', start + 1);
      return destinations.slice(start, end === -1 ? undefined : end);
    };
    expect(entry('Active project — fold-back to upstream artifact')).toContain(
      '**Freestyle projects:** not offered.',
    );
    const reference = entry('Active project — brainstorming reference file');
    const exception = reference.slice(
      reference.indexOf(
        'A freestyle project is the exception (SKILL.md branch 9j)',
      ),
    );
    expect(exception).toContain('`## Commits, PRs and merges`');
    expect(exception).toContain('commit and push nothing');
    expect(exception).toContain('`oat-project-freestyle`');
  });

  it('names only shape.md headings in its freestyle rules', () => {
    const shapeHeadings = new Set(
      h2Headings(read(join(TEMPLATES_DIR, 'shape.md'))),
    );
    for (const match of branch9j.matchAll(/`## ([^`]+)`/g)) {
      expect(shapeHeadings.has(match[1] as string), match[1]).toBe(true);
    }
  });
});

/** Every Markdown file under `dir`, recursively. */
function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => join(dir, entry));
}

describe('documented journal check commands', () => {
  it('give every documented `oat project journal check` invocation a valid --at', () => {
    // `journal check` rejects a missing `--at` before it reads the project,
    // so a documented command without one always fails, freestyle included.
    const files = [
      join(TEMPLATES_DIR, 'project-agents.md'),
      join(REPO_ROOT, 'README.md'),
      join(REPO_ROOT, 'AGENTS.md'),
      join(REPO_ROOT, 'packages', 'cli', 'README.md'),
      ...markdownFiles(join(REPO_ROOT, '.agents', 'skills')),
      ...markdownFiles(join(REPO_ROOT, 'apps', 'oat-docs', 'docs')),
    ];
    const invocations: string[] = [];
    const missing: string[] = [];
    for (const file of files) {
      for (const match of read(file).matchAll(
        /oat project journal check[ \t]+--[^`\n]*/g,
      )) {
        invocations.push(match[0]);
        if (
          !/--at[ \t]+(?:implement-preflight|review|completion|<)/.test(
            match[0],
          )
        ) {
          missing.push(`${file.slice(REPO_ROOT.length + 1)}: ${match[0]}`);
        }
      }
    }

    expect(
      invocations.some((line) => line.includes('--project <project-path>')),
      'finds the project AGENTS.md template command',
    ).toBe(true);
    expect(invocations.length).toBeGreaterThanOrEqual(10);
    expect(missing).toEqual([]);
  });
});
