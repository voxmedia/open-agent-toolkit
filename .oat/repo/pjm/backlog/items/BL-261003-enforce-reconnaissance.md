---
id: BL-261003-enforce-reconnaissance
title: Enforce reconnaissance evidence and reconcile original-run review receipts
status: open
priority: medium
scope: bug
scope_estimate: M
labels: []
assignee: null
created: 2026-10-03T19:13:37.369Z
updated: 2026-10-03T19:13:37.369Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/341
external_plans: []
---

## Description

Source: [GitHub #341](https://github.com/voxmedia/open-agent-toolkit/issues/341).

**Confirmed but narrower than reported.** Review-provide requires exactly one attempted/not-attempted recon signal, but gate result payload and machine validation omit it. Existing correlated-gate integration accepts a fake-runtime artifact and receiveEligible=true without a recon signal. Actual private callback incident was not reproduced.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Enforce the existing optional-delegation contract: exactly one attempted/not-attempted signal and complete orchestration evidence when attempted; no new mandatory skip reason or mandatory delegation.
- Reject absent or contradictory evidence.
- Permit idempotent reconciliation under the original run ID only from evidence already recorded by that run, preserving timing and attempt history and run/project/target correlation.
- Missing original evidence remains blocked; do not invent retrospective evidence or a reviewer pass.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

.agents/skills/oat-project-review-provide/SKILL.md:1092; packages/cli/src/commands/gate/index.ts:2611; packages/cli/src/commands/gate/**fixtures**/fake-runtime.mjs:57; configured-gate.integration.test.ts:225. Focused existing integration: 1 passed, 2 skipped.

The producer must persist its explicit reconnaissance signal durably. Absence of an orchestration section is never evidence of `not-attempted`; validate real producer output against the real consumer.

Related owner: [BL-260820-emit-source-qualified — Emit source-qualified provenance envelopes for review and gate receipts](../items/BL-260820-emit-source-qualified.md). Preserve its existing scope and acceptance criteria.

Related owner: [BL-260927-give-gate-receipts-portable — Give gate receipts portable ownership, path-neutral identities, and a](../items/BL-260927-give-gate-receipts-portable.md). Preserve its existing scope and acceptance criteria.
