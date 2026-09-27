---
id: BL-260927-validate-recon-worker
title: Validate recon-worker assignment envelopes deterministically before launch
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - recon
  - reviews
  - dispatch
assignee: null
created: 2026-09-27T03:35:37.678Z
updated: 2026-09-27T03:35:37.678Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/295
external_plans: []
---

## Description

A final review launched two recon children with incomplete envelopes; both were accepted and then rejected before repository access, so the reviewer repeated both lanes inline. PR #285 later added a prose pre-launch check to `.agents/agents/oat-reviewer.md`, but no script validates an assignment envelope before launch, and `recon-worker` rejects only after acceptance. Replacing an accepted child is intentionally forbidden; continuing the accepted handle is allowed. Terminal results for accepted children are tracked by `BL-260906-harden-dispatch-launch` (GitHub issue #266). Source: GitHub issue #295.

## Acceptance Criteria

- A deterministic validator checks a recon assignment against the selected role envelope before launch and reports every missing or invalid field.
- Reviewer guidance runs it before launch and uses it to correct an accepted handle's envelope instead of relaunching.
- Valid and invalid fixtures cover the mechanical and intelligent recon lanes used by project review.
