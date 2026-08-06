import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(
    join(import.meta.dirname, '../../../../../../../', relativePath),
    'utf8',
  );
}

const retroSkill = readRepoFile('.agents/skills/oat-project-retro/SKILL.md');
const applyProcedure = readRepoFile(
  '.agents/skills/oat-project-retro/references/apply-procedure.md',
);
const filingSkill = readRepoFile(
  '.agents/skills/oat-project-retro-file/SKILL.md',
);
const retroTemplate = readRepoFile('.oat/templates/project-retro.md');

describe('retro skill content contracts', () => {
  it('recovers interrupted decision application by exact date-independent slug', () => {
    expect(applyProcedure).toContain('date-independent exact-slug');
    expect(applyProcedure).toMatch(/DR-<6 digits>-/);
    expect(applyProcedure).toMatch(
      /verify[\s\S]*?(?:title|proposal)[\s\S]*?context[\s\S]*?decision[\s\S]*?consequences/i,
    );
    expect(applyProcedure).toMatch(
      /exact-slug record[\s\S]*?recover[\s\S]*?`Applied-ref`/i,
    );
    expect(applyProcedure).toMatch(
      /every apply type[\s\S]*?post-side-effect recovery/i,
    );
  });

  it('keeps configured non-interactive duplicate filing side-effect free', () => {
    expect(filingSkill).toMatch(
      /non-interactive duplicate[\s\S]*?separate consent/i,
    );
    expect(filingSkill).toMatch(
      /do not\s+strengthen, edit, comment on, or refile/i,
    );
    expect(filingSkill).toMatch(
      /validated\s+existing destination[\s\S]*?link/i,
    );
  });

  it('does not invent or prompt for incomplete backlog metadata', () => {
    expect(filingSkill).toMatch(
      /non-interactive[\s\S]*?required backlog metadata[\s\S]*?no external write/i,
    );
    expect(filingSkill).toMatch(/do not prompt or invent/i);
    expect(filingSkill).toMatch(
      /leave (?:the )?item unsettled[\s\S]*?report[\s\S]*?missing metadata/i,
    );
  });

  it('defines Disposition-note as the mutable rejection field', () => {
    for (const content of [retroTemplate, applyProcedure, filingSkill]) {
      expect(content).toContain('Disposition-note');
    }
    expect(retroTemplate).toMatch(
      /Consumers may mutate only[\s\S]*?Disposition-note/i,
    );
    expect(applyProcedure).toMatch(
      /proposal bod(?:y|ies)[\s\S]*?(?:stable|immutable)/i,
    );
    expect(filingSkill).toMatch(
      /proposal bod(?:y|ies)[\s\S]*?(?:stable|immutable)/i,
    );
  });

  it('defines exact promotion rollup aggregation', () => {
    for (const content of [retroTemplate, applyProcedure]) {
      expect(content).toMatch(
        /`none`[\s\S]*?no apply items[\s\S]*?`proposed`[\s\S]*?none are settled[\s\S]*?`partial`[\s\S]*?mix of settled and unsettled[\s\S]*?`complete`[\s\S]*?all apply items are settled/i,
      );
      expect(content).toMatch(
        /`proposed` and `approved` are unsettled[\s\S]*?`applied` and `rejected` are settled/i,
      );
    }
  });

  it('requires render provenance and rejects scaffold residue', () => {
    expect(retroSkill).toMatch(/non-null project slug/i);
    expect(retroSkill).toMatch(/UTC generation timestamp/i);
    expect(retroSkill).toMatch(
      /reject[\s\S]*?unreplaced[\s\S]*?scaffold item examples[\s\S]*?placeholders/i,
    );
    expect(retroSkill).toContain('`oat_retro_project`');
    expect(retroSkill).toContain('`oat_retro_generated`');
  });
});
