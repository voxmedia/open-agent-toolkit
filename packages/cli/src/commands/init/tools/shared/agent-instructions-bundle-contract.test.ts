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

describe('agent instructions bundle contract', () => {
  it('requires recommendation packs to preserve behavioral and workflow guidance', () => {
    const packTemplate = readFileSync(
      repoFilePath(
        '.agents/skills/oat-agent-instructions-analyze/references/recommendation-pack-template.md',
      ),
      'utf8',
    );

    expect(packTemplate).toContain('## Evidence');
    expect(packTemplate).toContain('## Structural Conventions');
    expect(packTemplate).toContain('## Behavioral Conventions');
    expect(packTemplate).toContain('## Counter-Examples');
    expect(packTemplate).toContain('## New-File Workflow');
    expect(packTemplate).toContain('## Preferred Default for New Files');
    expect(packTemplate).toContain('## Claim Corrections');
    expect(packTemplate).toContain('## Generation Constraints');
  });

  it('requires the bundle manifest and summary templates to index recommendation packs', () => {
    const manifestTemplate = readFileSync(
      repoFilePath(
        '.agents/skills/oat-agent-instructions-analyze/references/recommendations-manifest-template.yaml',
      ),
      'utf8',
    );
    const summaryTemplate = readFileSync(
      repoFilePath(
        '.agents/skills/oat-agent-instructions-analyze/references/bundle-summary-template.md',
      ),
      'utf8',
    );

    expect(manifestTemplate).toContain('bundleVersion: 1');
    expect(manifestTemplate).toContain('id: rec-001');
    expect(manifestTemplate).toContain('pack: packs/rec-001.md');

    expect(summaryTemplate).toContain('## Recommendation Index');
    expect(summaryTemplate).toContain('Provider / Format');
    expect(summaryTemplate).toContain('`packs/rec-001.md`');
    expect(summaryTemplate).toContain(
      'Every listed pack file must exist under `packs/`.',
    );
  });

  it('requires the apply plan template to carry bundle-addressable recommendation metadata', () => {
    const applyPlanTemplate = readFileSync(
      repoFilePath(
        '.agents/skills/oat-agent-instructions-apply/references/apply-plan-template.md',
      ),
      'utf8',
    );

    expect(applyPlanTemplate).toContain('**Source Bundle:**');
    expect(applyPlanTemplate).toContain('| Recommendation ID');
    expect(applyPlanTemplate).toContain('| Bundle Pack');
  });

  it('requires apply to define bundle-first intake, planning, and generation markers', () => {
    const applySkill = readFileSync(
      repoFilePath('.agents/skills/oat-agent-instructions-apply/SKILL.md'),
      'utf8',
    );

    expect(applySkill).toContain('### Step 0: Intake — Find Analysis Artifact');
    expect(applySkill).toContain('BUNDLE_DIR="${ARTIFACT_PATH%.md}.bundle"');
    expect(applySkill).toContain(
      'MANIFEST_PATH="${BUNDLE_DIR}/recommendations.yaml"',
    );
    expect(applySkill).toContain('**Bundle-first behavior:**');
    expect(applySkill).toContain('### Step 2: Build Recommendation Plan');
    expect(applySkill).toContain(
      '### Step 5: Generate/Update Instruction Files',
    );
    expect(applySkill).toContain('matching pack');
  });
});
