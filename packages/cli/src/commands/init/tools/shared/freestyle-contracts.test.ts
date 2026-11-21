import { existsSync, readFileSync } from 'node:fs';
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
