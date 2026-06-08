import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: import.meta.dirname,
  encoding: 'utf8',
}).trim();

function repoFilePath(relativePath: string): string {
  return join(REPO_ROOT, relativePath);
}

const SKILL_DIR = '.agents/skills/create-agnostic-skill';

describe('create-agnostic-skill bundle contract', () => {
  it('vendors skills-guide.md into the skill so it travels when distributed', () => {
    // readFileSync follows the symlink; a broken/missing link throws and fails here.
    const vendored = readFileSync(
      repoFilePath(`${SKILL_DIR}/references/docs/skills-guide.md`),
      'utf8',
    );

    expect(vendored).toContain('# Skills Research Reference');
  });

  it('references the bundled doc path, not the repo-root .agents/docs/ path', () => {
    const skill = readFileSync(repoFilePath(`${SKILL_DIR}/SKILL.md`), 'utf8');
    const template = readFileSync(
      repoFilePath(`${SKILL_DIR}/references/skill-template.md`),
      'utf8',
    );

    // Bundled pointer must be present in both surfaces.
    expect(skill).toContain('references/docs/skills-guide.md');
    expect(template).toContain('references/docs/skills-guide.md');

    // The dangling repo-root pointer must not return: it does not resolve once
    // the skill is installed into a consumer repo (.agents/docs/ does not ship
    // with the skill bundle).
    expect(skill).not.toContain('.agents/docs/skills-guide.md');
    expect(template).not.toContain('.agents/docs/skills-guide.md');
  });
});
