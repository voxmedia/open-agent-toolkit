---
id: BL-260928-settle-codex-read-authority
title: Settle Codex read authority and remaining recon assignment validator gaps
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - recon
  - validation
  - codex
  - dispatch
assignee: null
created: 2026-09-28T10:16:23.474Z
updated: 2026-09-28T10:16:23.474Z
associated_issues: []
external_plans: []
---

## Description

Follow-up from backlog-wave-2 p04 (reviews/archived/p04-review-2026-09-28T025845Z.md, deferred by the operator). M2: Codex workers read files only through their command-execution tool, which the READ_ONLY_TOOLS allowlist in .agents/skills/recon/scripts/validate-assignment.mjs rejects, so Codex-hosted recon lanes fail validation and fall back to inline coverage; the allowlist comment also claims Codex coverage it does not have. Decide how a shell-only provider fits read-only authority (for example allowing Codex exec only with a declared, validated command restriction) and record it. Also: L1 writePath form checks weaker than read sources (~/x.json, file:x.json, whitespace); L2 WebFetch/WebSearch allowed for lanes with no URL sources; L3 worker mode not checked against artifact kind.

## Acceptance Criteria

- A recorded decision states how a shell-only provider (Codex) satisfies read-only recon authority, and the validator and its allowlist comment match it.
- Codex-hosted recon lanes either validate under that rule or fail with an explicit, documented reason; a test covers both a valid Codex lane and a rejected unrestricted shell.
- `writePath` rejects `~`, `file:`, and whitespace-padded forms; web tools are rejected for lanes without URL sources; worker mode is checked against artifact kind.
