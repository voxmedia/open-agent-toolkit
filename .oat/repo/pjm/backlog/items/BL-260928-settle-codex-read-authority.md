---
id: BL-260928-settle-codex-read-authority
title: Confirm /recon launches Codex worker lanes as contract-enforced on the released CLI
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - recon
  - codex
  - dispatch
assignee: null
created: 2026-09-28T10:16:23.474Z
updated: 2026-09-28T15:43:07.000Z
associated_issues: []
external_plans: []
---

## Description

Follow-up from backlog-wave-2. p04 shipped a recon assignment validator whose read-only tool allowlist rejected Codex, which reads files only through its command-execution tool (p04 review M2, reviews/archived/p04-review-2026-09-28T025845Z.md). Revision p-rev1 withdrew that validator and took `recon-worker` out of `oat-reviewer`, so the recon skill is again exactly as on `main`. There, the Codex `recon-worker` view runs with `sandbox_mode = "workspace-write"` and no provider-enforced read restriction, so the recon `SKILL.md` authority rules classify its lanes as `contract-enforced`: permitted in the default mode under the audited leaf-worker contract, and a stop under `--strict`. That reading comes from the contract text only. Confirm it with a live run on the released CLI.

## Acceptance Criteria

- A live `/recon` run on the released CLI with Codex-hosted `recon-worker` lanes records `contract-enforced` authority in the approved manifest and packet, and its lanes launch and complete without falling back to inline coverage.
- The same run under `--strict` stops before launch because the Codex lanes are not provider-enforced.
- The outcome (confirmed, or the observed divergence with a follow-up item) is recorded on this item before it is closed.
