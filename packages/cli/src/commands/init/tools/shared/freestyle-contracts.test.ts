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
  'Records commands',
  'Shaping and reshaping',
] as const;

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

  it('pins the project AGENTS.md headings and its read-shape.md first line', () => {
    expect(h2Headings(agents)).toEqual([...AGENTS_HEADINGS]);
    const body = agents.replace(/^---\n[\s\S]*?\n---\n+/, '');
    expect(body.split('\n')[0]).toBe(
      'Read `shape.md` in this folder before acting: it holds how this project runs.',
    );
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

  it('publishes a synced reference only when the agreement publishes now (m01 I-1)', () => {
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
      const project = '.oat/projects/synced/demo';
      const remoteRef = () =>
        sh('git ls-remote origin refs/oat/projects/demo').split(/\s/)[0];
      const parentHead = sh('git rev-parse HEAD');

      const persist = (file: string, publish?: string) => {
        mkdirSync(join(repo, project, 'brainstorming'), { recursive: true });
        writeFileSync(
          join(repo, project, 'brainstorming', file),
          `# ${file}\n`,
        );
        const result = spawnSync('/bin/bash', ['-c', script], {
          cwd: repo,
          encoding: 'utf8',
          env: {
            ...env,
            ACTIVE_PROJECT: project,
            REFERENCE_PATH: `${project}/brainstorming/${file}`,
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
