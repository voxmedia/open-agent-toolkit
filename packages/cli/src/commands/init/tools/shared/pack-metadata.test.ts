import { describe, expect, it } from 'vitest';

import { PACK_MANIFEST } from '../../../tools/shared/pack-manifest';
import {
  BRAINSTORM_SKILLS,
  CORE_SKILLS,
  DOCS_SKILLS,
  IDEA_SKILLS,
  PACK_METADATA,
  PROJECT_MANAGEMENT_SKILLS,
  RESEARCH_SKILLS,
  resolvePackDefaultScope,
  UTILITY_SKILLS,
  WORKFLOW_SKILLS,
} from './skill-manifest';

describe('resolvePackDefaultScope', () => {
  it('derives user defaults for every canonical pack', () => {
    for (const pack of PACK_MANIFEST) {
      expect(resolvePackDefaultScope(pack.name)).toBe('user');
    }
  });
});

describe('legacy manifest compatibility views', () => {
  it('derives metadata from the canonical manifest', () => {
    expect(Object.keys(PACK_METADATA).sort()).toEqual(
      PACK_MANIFEST.map(({ name }) => name).sort(),
    );
  });

  it('derives every legacy skill list from manifest assets', () => {
    const views = {
      core: CORE_SKILLS,
      ideas: IDEA_SKILLS,
      docs: DOCS_SKILLS,
      workflows: WORKFLOW_SKILLS,
      utility: UTILITY_SKILLS,
      'project-management': PROJECT_MANAGEMENT_SKILLS,
      research: RESEARCH_SKILLS,
      brainstorm: BRAINSTORM_SKILLS,
    };

    for (const pack of PACK_MANIFEST) {
      expect(views[pack.name]).toEqual(
        pack.assets
          .filter(({ kind }) => kind === 'skill')
          .map(({ source }) => source!.replace('skills/', '')),
      );
    }
    expect(RESEARCH_SKILLS).toContain('recon');
  });
});
