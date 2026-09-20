import { createHash } from 'node:crypto';
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
oat_review_high_count: 1
oat_review_medium_count: 3
oat_review_low_count: 4
---

# Review

## Findings

### Critical

- Critical one
- Critical two

### High

- High one

### Medium

- Medium one
- Medium two
- Medium three

### Low

- Low one
- Low two
- Low three
- Low four
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
        high: 1,
        medium: 3,
        low: 4,
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

Findings by severity: 0 critical, 0 high, 0 medium, 0 low
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

### High

- High finding

### Medium

1. First medium finding
2. Second medium finding

### Low

- Low finding
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      artifactPath,
      reviewType: 'code',
      scope: 'p01',
      invocation: 'manual',
      counts: {
        critical: 0,
        high: 1,
        medium: 2,
        low: 1,
      },
      blocking: true,
    });
  });

  it('reports retired tiers by name instead of an opaque parse failure', async () => {
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

- Legacy high finding

### Medium

None

### Minor

- Legacy low finding
`);

    // Retired tiers are not read. The failure must name the rename and the
    // refresh remedy rather than reporting an unrecognizable artifact.
    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /retired severity tiers[\s\S]*### Important[\s\S]*### Minor[\s\S]*oat tools update/i,
    );
  });

  it('names retired count lines and count keys in the failure', async () => {
    const countLineArtifact = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

Findings: 0 critical, 2 important, 0 medium, 1 minor
`);

    await expect(parseReviewGateVerdict(countLineArtifact)).rejects.toThrow(
      /retired severity tiers[\s\S]*legacy `Findings:` count line/i,
    );

    const frontmatterArtifact = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
oat_review_critical_count: 0
oat_review_important_count: 1
oat_review_medium_count: 0
oat_review_minor_count: 3
---

# Review

The review completed but rendered no canonical severity sections.
`);

    await expect(parseReviewGateVerdict(frontmatterArtifact)).rejects.toThrow(
      /retired severity tiers[\s\S]*oat_review_important_count[\s\S]*oat_review_minor_count/i,
    );
  });

  it('rejects retired count keys even when the canonical sections parse', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
oat_review_critical_count: 0
oat_review_important_count: 1
oat_review_medium_count: 0
oat_review_minor_count: 3
---

# Review

## Findings

### Critical

None

### High

- High finding

### Medium

None

### Low

- Low one
- Low two
- Low three
`);

    // Retired keys are not tolerated merely because the sections happen to
    // parse: ignoring them would silently pick one source of truth over the
    // other.
    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /retired severity tiers[\s\S]*oat_review_important_count[\s\S]*oat_review_minor_count/i,
    );
  });

  it('rejects an artifact that mixes retired and canonical headings', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

## Findings

### Critical

None

### High

- High finding

### Medium

None

### Low

None

### Important

- Retired-tier finding
`);

    // A retired heading that parsed would have its findings attributed to the
    // canonical section above it, so it must fail rather than be ignored.
    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /retired severity tiers[\s\S]*### Important/i,
    );
  });

  it('treats partial frontmatter counts with empty sections as zero', async () => {
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

### High

None

### Medium

None

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: { critical: 0, high: 0, medium: 0, low: 0 },
      blocking: false,
    });
  });

  it('rejects a partial blocking frontmatter count contradicted by empty sections', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: gate
oat_review_high_count: 1
---

# Review

## Findings

### Critical

None

### High

None

### Medium

None

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /contradicts itself about finding counts \(high\)[\s\S]*frontmatter count fields[\s\S]*Findings sections/i,
    );
  });

  it('rejects invalid values in partial frontmatter counts', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: gate
oat_review_high_count: many
---

# Review

## Findings

### Critical

None

### High

None

### Medium

None

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /invalid high count[\s\S]*non-negative integers/i,
    );
  });

  it('does not treat inherited object keys as severity aliases', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

## Findings

### Critical

None

#### constructor

- A subheading named after an Object.prototype key.

### High

- Real high finding

### Medium

None

### Low

None
`);

    // `constructor` must not resolve to an inherited property and become a
    // severity boundary. Its bullet therefore stays attributed to the
    // enclosing `### Critical` section, and the high finding still blocks.
    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: { critical: 1, high: 1, medium: 0, low: 0 },
      blocking: true,
    });
  });

  it('accumulates findings across a repeated heading for one tier', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

## Findings

### Critical

None

### High

- First high finding

### High

- Second high finding

### Medium

None

### Low

None
`);

    // A repeated heading must not erase findings counted under the first one.
    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: { critical: 0, high: 2, medium: 0, low: 0 },
      blocking: true,
    });
  });

  it('fails closed on a conflict inside a partial frontmatter block', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
oat_review_high_count: 0
high: 1
---

# Review

Findings by severity: 0 critical, 0 high, 0 medium, 0 low
`);

    // The block is incomplete, so the parser falls back to the summary line.
    // It must still reject the contradictory high keys rather than let the
    // all-zero summary report no findings.
    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /conflicting high counts/i,
    );
  });

  it('allows retired-tier words as headings outside the Findings section', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

## Findings

### Critical

None

### High

None

### Medium

None

### Low

None

## Requirements

### Important

This prose heading describes requirement priority, not review severity.

### Minor

This prose heading describes a secondary requirement.
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: { critical: 0, high: 0, medium: 0, low: 0 },
      blocking: false,
    });
  });

  it('fails closed on conflicting frontmatter count keys', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
oat_review_high_count: 0
high: 1
oat_review_critical_count: 0
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

## Findings

### Critical

None

### High

- High finding

### Medium

None

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /conflicting high counts/i,
    );
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

### High

- High body finding that must not be suppressed by partial counts

### Medium

None

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
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

### High

- **Review gate accepts archived artifacts** (\`packages/cli/src/commands/gate/index.ts:1129\`)
  - Issue: The nested issue detail explains the finding.
  - Fix: The nested fix detail explains the remediation.

### Medium

1. **Fallback parser overcounts nested findings** (\`packages/cli/src/commands/gate/review-verdict.ts:113\`)
   - Issue: Nested bullets are details, not separate findings.
   - Fix: Count only the top-level numbered item.

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 0,
        high: 1,
        medium: 1,
        low: 0,
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

### High

- High finding

### Medium

None

### Low

- Low finding

## Verification Commands

~~~bash
# still not part of Findings
~~~
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 1,
        high: 1,
        medium: 0,
        low: 1,
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

Findings by severity: 0 critical, 1 high, 2 medium, 3 low
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      },
      blocking: true,
    });
  });

  it('ignores a count line quoted inside a fenced example', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

## Summary

The template emits a line like this:

\`\`\`markdown
Findings by severity: 0 critical, 0 high, 0 medium, 0 low
\`\`\`

## Findings

### Critical

None

### High

- Real high finding

### Medium

None

### Low

None
`);

    // The fenced example must not be read as the artifact's own counts.
    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: { critical: 0, high: 1, medium: 0, low: 0 },
      blocking: true,
    });
  });

  it('keeps a fence open when a marker line carries trailing text', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

## Findings

### Critical

None

### High

- Real high finding

### Medium

None

### Low

None

\`\`\`markdown
\`\`\`not-a-closer
Findings by severity: 0 critical, 0 high, 0 medium, 0 low
\`\`\`
`);

    // Only a marker run followed by whitespace closes a fence. Treating the
    // inner line as a closer would expose the quoted zero-count line and let a
    // review with a real High finding read as clean.
    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: { critical: 0, high: 1, medium: 0, low: 0 },
      blocking: true,
    });
  });

  it('rejects a count line that contradicts findings in the body', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

Findings by severity: 0 critical, 0 high, 0 medium, 0 low

## Findings

### Critical

None

### High

- Real high finding

### Medium

None

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /contradicts itself about finding counts \(high\)[\s\S]*count line[\s\S]*Findings sections/i,
    );
  });

  it('rejects frontmatter counts that contradict findings in the body', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
oat_review_critical_count: 0
oat_review_high_count: 0
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

## Findings

### Critical

None

### High

- Real high finding

### Medium

None

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /contradicts itself about finding counts \(high\)[\s\S]*frontmatter count fields[\s\S]*Findings sections/i,
    );
  });

  it('names the list-item requirement when a section of prose findings tallies zero', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

Findings by severity: 1 critical, 0 high, 0 medium, 0 low

## Findings

### Critical

**C1 — the gate discards this review.** Issue: written as a bold paragraph.
Fix: make it a list item.

### High

None

### Medium

None

### Low

None
`);

    // A reviewer that writes findings as prose sees only "the sections say 0",
    // which reads as an arithmetic slip. Without the list-item requirement in
    // the message there is nothing to correct from, and the rerun repeats the
    // same shape and loses the whole review again.
    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /Only markdown list items count as findings[\s\S]*`- `[\s\S]*bold paragraph/i,
    );
  });

  it('omits the list-item explanation when no section tally is involved', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
oat_review_critical_count: 0
oat_review_high_count: 0
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

Findings by severity: 0 critical, 1 high, 0 medium, 0 low
`);

    // Frontmatter disagreeing with the count line has nothing to do with how a
    // section is counted, so the hint would be a misleading lead.
    const error = await parseReviewGateVerdict(artifactPath).then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(
      /contradicts itself about finding counts/i,
    );
    expect((error as Error).message).not.toMatch(/Only markdown list items/i);
  });

  it('rejects frontmatter counts that contradict the count line', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
oat_review_critical_count: 0
oat_review_high_count: 0
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

Findings by severity: 0 critical, 1 high, 0 medium, 0 low
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /contradicts itself about finding counts \(high\)[\s\S]*frontmatter count fields[\s\S]*count line/i,
    );
  });

  it('resolves counts when frontmatter, count line, and body agree', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
oat_review_critical_count: 0
oat_review_high_count: 1
oat_review_medium_count: 1
oat_review_low_count: 0
---

# Review

Findings by severity: 0 critical, 1 high, 1 medium, 0 low

## Findings

### Critical

None

### High

- High finding

### Medium

- Medium finding

### Low

None
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: { critical: 0, high: 1, medium: 1, low: 0 },
      blocking: true,
    });
  });

  it('rejects a section whose findings are prose rather than countable items', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

Findings by severity: 0 critical, 1 high, 0 medium, 0 low

## Findings

### Critical

None

### High

**High:** a finding written as prose, not as a countable bullet.

### Medium

None

### Low

None
`);

    // Prose findings are still not parsed as items. With an explicit count that
    // contradicts the (zero) countable items, the artifact now fails loudly
    // instead of silently counting zero and letting the review pass.
    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /contradicts itself about finding counts \(high\)/i,
    );
  });

  it('rejects two disagreeing count lines instead of taking the first', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: manual
---

# Review

Findings by severity: 0 critical, 0 high, 0 medium, 0 low

Findings by severity: 0 critical, 1 high, 0 medium, 0 low
`);

    await expect(parseReviewGateVerdict(artifactPath)).rejects.toThrow(
      /conflicting "Findings by severity" count lines/i,
    );
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

### High


### Medium

None

### Low

${'   '}
`);

    await expect(parseReviewGateVerdict(artifactPath)).resolves.toMatchObject({
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      blocking: false,
    });
  });

  it('reports one High finding as blocking even when the child process succeeded', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p02
oat_review_invocation: gate
---

# Review

## Findings

### Critical

None

### High

1. High finding

### Medium

None

### Low

None
`);

    const verdict = await parseReviewGateVerdict(artifactPath);

    expect(verdict.counts.high).toBe(1);
    expect(verdict.blocking).toBe(true);
  });

  it('normalizes a missing zero-count severity heading when explicit counts are available', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: gate
oat_review_critical_count: 0
oat_review_high_count: 0
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

## Findings

### Critical

None

### High

None

### Low

None
`);

    const verdict = await parseReviewGateVerdict(artifactPath, {
      normalizeMissingEmptySeveritySections: true,
    });

    expect(verdict).toMatchObject({
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      blocking: false,
      normalization: {
        insertedSeverities: ['medium'],
        persisted: true,
      },
    });
    const normalizedContent = await readFile(artifactPath, 'utf8');
    expect(normalizedContent).toMatch(
      /### High[\s\S]*None[\s\S]*### Medium\s+None[\s\S]*### Low/i,
    );
  });

  it('normalizes a current supplied snapshot in memory without rewriting it', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: gate
oat_review_critical_count: 0
oat_review_high_count: 0
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

## Findings

### Critical

None

### High

None

### Low

None
`);
    const snapshotContent = await readFile(artifactPath, 'utf8');

    const verdict = await parseReviewGateVerdict(artifactPath, {
      normalizeMissingEmptySeveritySections: true,
      artifactSnapshot: {
        content: snapshotContent,
        signature: createHash('sha256').update(snapshotContent).digest('hex'),
      },
    });

    expect(verdict).toMatchObject({
      counts: { critical: 0, high: 0, medium: 0, low: 0 },
      normalization: {
        insertedSeverities: ['medium'],
        persisted: false,
      },
    });
    await expect(readFile(artifactPath, 'utf8')).resolves.toBe(snapshotContent);
  });

  it('refuses to normalize when the supplied artifact snapshot is stale', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: p01
oat_review_invocation: gate
oat_project: .oat/projects/shared/declared
oat_gate_run_id: 11111111-1111-4111-8111-111111111111
oat_gate_target: codex-default
oat_gate_runtime: codex
oat_invocation_model: stale-model
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
oat_review_critical_count: 0
oat_review_high_count: 1
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

## Findings

### Critical

None

### High

- Blocking finding.

### Low

None
`);
    const snapshotContent = await readFile(artifactPath, 'utf8');
    const mutatedContent = snapshotContent
      .replace(
        'oat_project: .oat/projects/shared/declared',
        'oat_project: .oat/projects/shared/sibling',
      )
      .replace('oat_review_scope: p01', 'oat_review_scope: final')
      .replace(
        'oat_invocation_model: stale-model',
        'oat_invocation_model: provider-default',
      )
      .replace('oat_review_high_count: 1', 'oat_review_high_count: 0')
      .replace('- Blocking finding.', 'None.');
    await writeFile(artifactPath, mutatedContent, 'utf8');

    await expect(
      parseReviewGateVerdict(artifactPath, {
        normalizeMissingEmptySeveritySections: true,
        artifactSnapshot: {
          content: snapshotContent,
          signature: createHash('sha256').update(snapshotContent).digest('hex'),
        },
      }),
    ).rejects.toThrow(/changed after gate correlation/i);
    await expect(readFile(artifactPath, 'utf8')).resolves.toBe(mutatedContent);
  });

  it('does not insert duplicate severity headings when fenced code contains markdown headings', async () => {
    const artifactPath = await writeArtifact(`---
oat_review_type: code
oat_review_scope: final
oat_review_invocation: gate
oat_review_critical_count: 1
oat_review_high_count: 0
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

## Findings

### Critical

- Critical finding with a fenced reproduction.
  ~~~bash
  # reproduce the issue
  ## this is not a markdown section
  ~~~

### High

None

### Medium

None

### Low

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
oat_review_high_count: 0
oat_review_medium_count: 0
oat_review_low_count: 0
---

# Review

Findings by severity: 0 critical, 0 high, 0 medium, 0 low

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
oat_review_high_count: 0
oat_review_medium_count: 1
oat_review_low_count: 0
---

# Review

## Findings

### Critical

None

### High

None

### Low

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
      /incomplete Findings section.*High.*Low/i,
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
