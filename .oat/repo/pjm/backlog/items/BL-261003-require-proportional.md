---
id: BL-261003-require-proportional
title: Require proportional adversarial probes at changed review boundaries
status: open
priority: medium
scope: task
scope_estimate: M
labels: []
assignee: null
created: 2026-10-03T19:13:38.027Z
updated: 2026-10-03T19:13:38.027Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/346
external_plans: []
---

## Description

Source: [GitHub #346](https://github.com/voxmedia/open-agent-toolkit/issues/346).

**Enhancement or UX improvement; partial policy coverage.** Repository instructions already require negative controls for assurance contracts, and reviewers verify claims against code. Generic reviewer/gate guidance does not require enumeration and adversarial probing of each changed trust/size boundary. Private defect counts and method-versus-model hypothesis remain unverified.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Require focused applicable probes for changed trust and input-limit boundaries with credible failure modes.
- Record results or concrete execution limitations.
- Missing evidence for a consequential guarantee blocks acceptance; keep scope proportional and preserve containment and independent review.
- No broad testing campaign, new harness, or model-efficacy claim.
- Independently verified implementer probe evidence, including the recorded failure and accepted controls, may satisfy the obligation when the reviewer cannot execute the probe.
- Unsupported assertions remain insufficient; use the existing blocking-finding model for an unresolved consequential guarantee.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

AGENTS.md Definition of Done assurance negative-control paragraph; .agents/agents/oat-reviewer.md:19,568; .agents/skills/oat-project-review-provide/SKILL.md review brief and review dispatch contract.
