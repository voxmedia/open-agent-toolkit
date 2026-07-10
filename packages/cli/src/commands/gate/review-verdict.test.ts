import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
oat_project: .oat/projects/shared/demo
oat_gate_run_id: 11111111-1111-4111-8111-111111111111
oat_gate_target: codex-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: max
oat_invocation_source: exec-target-config
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
      project: '.oat/projects/shared/demo',
      gateInvocation: {
        runId: '11111111-1111-4111-8111-111111111111',
        targetId: 'codex-sol-max',
        runtime: 'codex',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'max',
        source: 'exec-target-config',
      },
      counts: {
        critical: 2,
        important: 1,
        medium: 3,
        minor: 4,
      },
      blocking: true,
    });
  });

  it('keeps manual artifacts compatible when gate-only fields are absent', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

Findings: 0 critical, 0 important, 0 medium, 0 minor
`);

    const verdict = await parseReviewGateVerdict(artifactPath);

    expect(verdict.invocation).toBe('manual');
    expect(verdict.project).toBeNull();
    expect(verdict).not.toHaveProperty('gateInvocation');
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

  it('ignores markdown headings inside fenced code blocks while finding severity sections', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: gate
---

# Review

## Findings

### Critical

- Critical finding with a fenced reproduction.
  ~~~bash
  # reproduce the issue
  ## this is not a markdown section
  ~~~

### Important

- Important finding

### Medium

None

### Minor

- Minor finding

## Verification Commands

~~~bash
# still not part of Findings
~~~
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 1,
        important: 1,
        medium: 0,
        minor: 1,
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

  it('normalizes a missing zero-count severity heading when explicit counts are available', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: gate
oat_review_critical_count: 0
oat_review_important_count: 0
oat_review_medium_count: 0
oat_review_minor_count: 0
---

# Review

## Findings

### Critical

None

### Important

None

### Minor

None
`);

    const verdict = await parseReviewGateVerdict(artifactPath, {
      normalizeMissingEmptySeveritySections: true,
    });

    expect(verdict).toMatchObject({
      counts: {
        critical: 0,
        important: 0,
        medium: 0,
        minor: 0,
      },
      blocking: false,
      normalization: {
        insertedSeverities: ['medium'],
      },
    });
    const normalizedContent = await readFile(artifactPath, 'utf8');
    expect(normalizedContent).toMatch(
      /### Important[\s\S]*None[\s\S]*### Medium\s+None[\s\S]*### Minor/i,
    );
  });

  it('does not insert duplicate severity headings when fenced code contains markdown headings', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: gate
oat_review_critical_count: 1
oat_review_important_count: 0
oat_review_medium_count: 0
oat_review_minor_count: 0
---

# Review

## Findings

### Critical

- Critical finding with a fenced reproduction.
  ~~~bash
  # reproduce the issue
  ## this is not a markdown section
  ~~~

### Important

None

### Medium

None

### Minor

None
`);
    const before = await readFile(artifactPath, 'utf8');

    const verdict = await parseReviewGateVerdict(artifactPath, {
      normalizeMissingEmptySeveritySections: true,
    });

    expect(verdict.normalization).toBeUndefined();
    await expect(readFile(artifactPath, 'utf8')).resolves.toBe(before);
  });

  it('refuses to normalize missing severity headings without a Findings section', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: gate
oat_review_critical_count: 0
oat_review_important_count: 0
oat_review_medium_count: 0
oat_review_minor_count: 0
---

# Review

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Summary

The review completed but did not render canonical Findings sections.
`);

    await expect(
      parseReviewGateVerdict(artifactPath, {
        normalizeMissingEmptySeveritySections: true,
      }),
    ).rejects.toThrow(/does not contain a ## Findings section/i);
  });

  it('does not normalize a missing severity heading when explicit counts report findings', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: gate
oat_review_critical_count: 0
oat_review_important_count: 0
oat_review_medium_count: 1
oat_review_minor_count: 0
---

# Review

## Findings

### Critical

None

### Important

None

### Minor

None
`);

    await expect(
      parseReviewGateVerdict(artifactPath, {
        normalizeMissingEmptySeveritySections: true,
      }),
    ).rejects.toThrow(/cannot be safely normalized/i);
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

  it('does not mutate malformed YAML when normalization is requested', async () => {
    const content = `---
oat_review_type: code
oat_review_scope: p02
oat_review_invocation: gate
oat_gate_run_id: 11111111-1111-4111-8111-111111111111
broken: [
---

# Review

## Findings

### Critical

None
`;
    const artifactPath = await writeArtifact(content);

    await expect(
      parseReviewGateVerdict(artifactPath, {
        normalizeMissingEmptySeveritySections: true,
      }),
    ).rejects.toThrow(/YAML|flow sequence/i);
    await expect(readFile(artifactPath, 'utf8')).resolves.toBe(content);
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
