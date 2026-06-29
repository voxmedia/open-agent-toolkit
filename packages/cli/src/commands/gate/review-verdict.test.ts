import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseReviewGateVerdict } from './review-verdict';

describe('parseReviewGateVerdict', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function writeArtifact(content: string): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-review-verdict-'));
    tempDirs.push(root);
    const artifactPath = join(root, 'review.md');
    await writeFile(artifactPath, content, 'utf8');
    return artifactPath;
  }

  it('prefers explicit frontmatter counts and review metadata', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: artifact
oat_review_scope: plan
oat_review_invocation: gate
oat_review_critical_count: 2
oat_review_important_count: 1
oat_review_medium_count: 3
oat_review_minor_count: 4
---

# Review

## Findings

### Critical

None.
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toEqual({
      artifactPath,
      reviewType: 'artifact',
      scope: 'plan',
      invocation: 'gate',
      counts: {
        critical: 2,
        important: 1,
        medium: 3,
        minor: 4,
      },
      blocking: true,
    });
  });

  it('falls back to standard Findings severity sections', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

## Findings

### Critical

None

### Important

- Important finding

### Medium

1. First medium finding
2. Second medium finding

### Minor

- Minor finding
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      artifactPath,
      reviewType: 'code',
      scope: 'p01',
      invocation: 'manual',
      counts: {
        critical: 0,
        important: 1,
        medium: 2,
        minor: 1,
      },
      blocking: true,
    });
  });

  it('parses findings when explicit frontmatter counts are partial', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: gate
oat_review_critical_count: 0
---

# Review

## Findings

### Critical

None

### Important

- Important body finding that must not be suppressed by partial counts

### Medium

None

### Minor

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 0,
        important: 1,
        medium: 0,
        minor: 0,
      },
      blocking: true,
    });
  });

  it('counts only top-level findings in standard nested OAT sections', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: gate
---

# Review

## Findings

### Critical

None

### Important

- **Review gate accepts archived artifacts** (\`packages/cli/src/commands/gate/index.ts:1129\`)
  - Issue: The nested issue detail explains the finding.
  - Fix: The nested fix detail explains the remediation.

### Medium

1. **Fallback parser overcounts nested findings** (\`packages/cli/src/commands/gate/review-verdict.ts:113\`)
   - Issue: Nested bullets are details, not separate findings.
   - Fix: Count only the top-level numbered item.

### Minor

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 0,
        important: 1,
        medium: 1,
        minor: 0,
      },
      blocking: true,
    });
  });

  it('parses a complete Findings count line as a standalone verdict source', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: plan
oat_review_invocation: gate
---

# Review

Findings: 0 critical, 1 important, 2 medium, 3 minor
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 0,
        important: 1,
        medium: 2,
        minor: 3,
      },
      blocking: true,
    });
  });

  it('treats clean blocking sections as zero findings', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: auto
---

# Review

## Findings

### Critical

None.

### Important


### Medium

None

### Minor

${'   '}
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 0,
        important: 0,
        medium: 0,
        minor: 0,
      },
      blocking: false,
    });
  });

  it('reports one Important finding as blocking even when the child process succeeded', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p02
oat_review_invocation: gate
---

# Review

## Findings

### Critical

None

### Important

1. Important finding

### Medium

None

### Minor

None
`);

    const verdict = await parseReviewGateVerdict(artifactPath);

    expect(verdict.counts.important).toBe(1);
    expect(verdict.blocking).toBe(true);
  });

  it('returns an actionable parse error for partial Findings sections', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p02
oat_review_invocation: gate
---

# Review

## Findings

### Critical

None

### Medium

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /incomplete Findings section.*Important.*Minor/i,
    );
  });

  it('returns an actionable read error for missing artifacts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-review-verdict-missing-'));
    tempDirs.push(root);
    const artifactPath = join(root, 'missing.md');

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /Unable to read review artifact/,
    );
  });

  it('returns an actionable parse error for artifacts without recognizable findings', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
---

# Review

This artifact has no verdict fields and no findings sections.
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /recognizable review findings/,
    );
  });
});
