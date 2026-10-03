---
id: BL-261003-diagnose-review-finding
title: Diagnose review finding overcounts and revalidate format-only repairs
  without relaunch
status: open
priority: medium
scope: bug
scope_estimate: M
labels: []
assignee: null
created: 2026-10-03T19:13:20.429Z
updated: 2026-10-03T19:13:20.429Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/339
external_plans: []
---

## Description

Source: [GitHub #339](https://github.com/voxmedia/open-agent-toolkit/issues/339).

**Confirmed but narrower than reported.** Baseline verdict parser counts column-zero detail bullets as findings; declared medium/low 2/3 becomes 6/6. Nested-list repair yields 2/3 and a nonblocking verdict. Existing reviewer template already shows correct nested detail examples. Public gate reruns allocate a fresh run and execute the reviewer; existing same-run recovery uses an immutable snapshot and cannot accept a post-exit rewrite.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Diagnose overcounts and permit formatting-only original-run revalidation without relaunch.
- Preserve original artifact, semantic finding identities/counts, verdict, scope and run provenance.
- A repaired parser tally may correct the erroneous tally only with unchanged independently identifiable findings and agreement across all count sources; no source wins by precedence.
- Verify equivalence, rerun the exact validator, record recovery, and stop on ambiguity or substantive change.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

packages/cli/src/commands/gate/review-verdict.ts:282,831; packages/cli/src/commands/gate/index.ts:4073,4226,4519,4774; .agents/agents/oat-reviewer.md:438. Merged PR #309 established list-item requirements but did not add post-exit revalidation.

Related owner: [BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only review findings](../items/BL-260711-skip-re-review-for-bookkeeping.md). Preserve its existing scope and acceptance criteria.
