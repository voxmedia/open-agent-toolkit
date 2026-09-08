import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { scanArtifacts } from './artifacts';

describe('scanArtifacts', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createProjectDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-control-plane-artifacts-'));
    tempDirs.push(dir);
    return dir;
  }

  it('returns artifact status for a project with all tracked artifacts', async () => {
    const projectDir = await createProjectDir();

    await Promise.all([
      writeFile(
        join(projectDir, 'discovery.md'),
        `---
oat_status: complete
oat_ready_for: oat-project-plan
oat_template: false
---
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'spec.md'),
        `---
oat_status: in_progress
oat_ready_for: null
oat_template: false
---
# Spec
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'design.md'),
        `---
oat_status: in_progress
oat_template: false
---
# Design
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'plan.md'),
        `---
oat_status: in_progress
oat_template: false
---
# Plan
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'implementation.md'),
        `---
oat_status: complete
oat_ready_for: oat-project-review-provide
oat_template: false
---
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'summary.md'),
        `---
oat_status: complete
oat_template: false
---
`,
        'utf8',
      ),
    ]);

    const artifacts = await scanArtifacts(projectDir);

    expect(artifacts).toHaveLength(6);
    expect(artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'discovery',
          exists: true,
          status: 'complete',
          readyFor: 'oat-project-plan',
          isTemplate: false,
          boundaryTier: 1,
        }),
        expect.objectContaining({
          type: 'spec',
          exists: true,
          status: 'in_progress',
          boundaryTier: 2,
        }),
        expect.objectContaining({
          type: 'implementation',
          exists: true,
          status: 'complete',
          readyFor: 'oat-project-review-provide',
          boundaryTier: 1,
        }),
      ]),
    );
  });

  it('marks missing artifacts as tier 3 and non-existent', async () => {
    const projectDir = await createProjectDir();
    await mkdir(join(projectDir, 'nested'), { recursive: true });
    await writeFile(
      join(projectDir, 'discovery.md'),
      `---
oat_status: in_progress
oat_template: false
---
# Discovery
`,
      'utf8',
    );

    const artifacts = await scanArtifacts(projectDir);
    const discovery = artifacts.find(
      (artifact) => artifact.type === 'discovery',
    );
    const spec = artifacts.find((artifact) => artifact.type === 'spec');

    expect(discovery).toMatchObject({
      exists: true,
      boundaryTier: 2,
    });
    expect(spec).toMatchObject({
      exists: false,
      status: null,
      readyFor: null,
      boundaryTier: 3,
    });
  });
  it('reports quick plan readiness for plan.md only', async () => {
    const projectDir = await createProjectDir();

    await Promise.all([
      writeFile(
        join(projectDir, 'plan.md'),
        `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_template: false
---

# Plan: demo

## Phase 1: Foundation

### Task p01-t01: Add the readiness predicate

## Reviews

| Scope | Type     | Status | Date       | Artifact |
| ----- | -------- | ------ | ---------- | -------- |
| plan  | artifact | passed | 2026-09-07 | -        |
`,
        'utf8',
      ),
      writeFile(
        join(projectDir, 'design.md'),
        `---
oat_status: complete
oat_template: false
---
# Design
`,
        'utf8',
      ),
    ]);

    const artifacts = await scanArtifacts(projectDir);
    const plan = artifacts.find((artifact) => artifact.type === 'plan');
    const design = artifacts.find((artifact) => artifact.type === 'design');
    const summary = artifacts.find((artifact) => artifact.type === 'summary');

    expect(plan?.quickPlanReadiness).toEqual({ ready: true, failure: null });
    // The predicate describes plan.md alone, so no other artifact carries a
    // verdict about a file it does not describe.
    expect(design).not.toHaveProperty('quickPlanReadiness');
    expect(summary).not.toHaveProperty('quickPlanReadiness');
  });

  it('reports the first unmet readiness clause for a plan that is not ready', async () => {
    const projectDir = await createProjectDir();

    await writeFile(
      join(projectDir, 'plan.md'),
      `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_template: false
---

# Plan: demo

## Phase 1: Foundation

### Task p01-t01: Add the readiness predicate

## Reviews

| Scope | Type     | Status  | Date | Artifact |
| ----- | -------- | ------- | ---- | -------- |
| plan  | artifact | pending | -    | -        |
`,
      'utf8',
    );

    const artifacts = await scanArtifacts(projectDir);
    const plan = artifacts.find((artifact) => artifact.type === 'plan');

    // Boundary tier stays what it was; readiness is a separate verdict.
    expect(plan).toMatchObject({ boundaryTier: 1, status: 'complete' });
    expect(plan?.quickPlanReadiness).toEqual({
      ready: false,
      failure: 'review-disposition-missing',
    });
  });

  it('reports a missing plan.md as not ready', async () => {
    const projectDir = await createProjectDir();

    const artifacts = await scanArtifacts(projectDir);
    const plan = artifacts.find((artifact) => artifact.type === 'plan');

    expect(plan).toMatchObject({ exists: false });
    expect(plan?.quickPlanReadiness).toEqual({
      ready: false,
      failure: 'plan-missing',
    });
  });
});
