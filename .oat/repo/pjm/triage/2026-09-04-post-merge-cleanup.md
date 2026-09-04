---
oat_triage_record: true
schema_version: 1
status: pr_open
scope: post-merge cleanup of labeled issues overtaken by merged PRs (#211, #197, #203) plus triage-record hygiene
baseline_sha: 83d8c9f2e1c317870040148212db40d40007f7af
triage_pr: 259
created: 2026-09-04
updated: 2026-09-04
---

# Post-merge cleanup: labeled issues overtaken by merged work

## Scope and exclusions

- In scope: every open issue carrying a disposition label whose backlog item
  was archived, or whose reported behavior was materially changed, by PRs
  #246, #249, #255, #256, #248, #253, or #257. The audit found three: #211,
  #197, #203.
- Also in scope: repository-only hygiene of the two older triage records
  (`2026-08-29-untriaged-oat-issues.md` still says `verifying`;
  `2026-09-04-issue-258-skill-versioning.md` still says `pr_open` although
  its resume ran).
- Excluded: the other 23 labeled open issues; each still maps to an active
  backlog item and needs no action. No open issue lacks a disposition label.

## Evidence baseline

- `origin/main` at `83d8c9f2e1c317870040148212db40d40007f7af` (PR #257 merged), fetched 2026-09-04.
- Every labeled open issue was mapped to its backlog items across `items/`
  and `archived/`; only #211 maps to an archived item. Delivered contracts
  read live: `packages/cli/src/commands/status/index.ts:602-626,793-824`
  (per-scope missing and outdated assets with a recovery command) and the
  provider drift section; `DR-260831-cause-specific-fail-closed` and the
  archived `BL-260826-gate-targets-must-not-yield` for PR #246.

## Disposition ledger

### GH-211 — Populate native subagent runtime identity from provider transcript metadata

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/211
- Claim: production dispatch paths leave runtime identity `not-reported`.
- Verification: Already fixed.
- Confidence: 96%.
- Evidence: `BL-260826-populate-native-subagent` archived by PR #255
  (`a06e9713a`, CLI 0.2.52); runtime observation ships for Codex and Claude
  with real-artifact parsers (`packages/cli/src/providers/identity/*-runtime-observation.ts`).
  Residue (Claude lineage depth, unverified stream-json shape) is
  `BL-260903-close-claude-runtime-lineage`.
- Existing coverage: archived item plus the residue item.
- Proposed GitHub action: Comment linking PR #255, the archived item, and the
  residue item; close.
- Backlog action: None.
- Priority and size rationale: Not applicable.
- Approval: Approved by the operator in session on 2026-09-04 as one consolidated set.
- Post-merge result: Pending.

### GH-197 — `oat gate review` can terminate with no envelope, no artifact, and no cause

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/197
- Claim: abnormal termination is indistinguishable from a legitimate failure;
  a target can become unavailable after selection with no envelope.
- Verification: Confirmed but narrower than reported.
- Confidence: 90%.
- Evidence: PR #246 (`511ffff38`) delivered `artifact_missing` and
  `review_completed_artifact_missing` envelopes for a child that completes
  without an artifact and forbids headless yielding
  (`DR-260831-cause-specific-fail-closed`); PR #232's post-selection recovery
  is planned as `BL-260902-recover-committed-review`. Remaining: activity-aware
  timeouts (`BL-260711-add-activity-aware-gate`, active) and the
  provider-availability preflight the issue's second comment asks for, which
  no item names explicitly.
- Existing coverage: `BL-260711-add-activity-aware-gate` (linked),
  `BL-260902-recover-committed-review`.
- Proposed GitHub action: Keep open; comment crediting PR #246 for the
  cause-specific envelopes and naming the two remaining items. No label change.
- Backlog action: Appended the provider-availability preflight and the
  `blocked`-before-artifact envelope as acceptance criteria on
  `BL-260711-add-activity-aware-gate` and linked #197 there.
- Priority and size rationale: Inherits the item (high / feature / M).
- Approval: Approved by the operator in session on 2026-09-04 as one consolidated set.
- Post-merge result: Pending.

### GH-203 — Detect stale provider skill views and offer safe sync

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/203
- Claim: a canonical skill missing from a generated provider view is not
  diagnosed by name with a safe sync suggestion.
- Verification: Confirmed but narrower than reported; partially delivered.
- Confidence: 88%.
- Evidence: `oat status` now reports per-scope missing and outdated pack
  assets by path with a recovery command
  (`status/index.ts:602-626,793-824`, PR #249) and provider drift with
  refresh advice (PR #255, `providerRefreshAdvice`). Not delivered: a
  resolution-time diagnostic that distinguishes "missing from this provider
  view" from "unknown skill" and names the narrowest `oat sync --scope`.
- Existing coverage: none; the issue carries `needs-reproduction` from
  2026-08-19 and never received a backlog item.
- Proposed GitHub action: Replace `needs-reproduction` with
  `tracked-in-backlog`; comment crediting PR #249 and #255 for the status
  half and linking the new item.
- Backlog action: Created `BL-260904-diagnose-canonical-skills` (low / task / S) with the issue's
  remaining criteria.
- Priority and size rationale: Low because `oat status` already surfaces the
  drift and sync repairs it; S because the diagnostic reuses the existing
  drift detector and adds one message path plus tests.
- Approval: Approved by the operator in session on 2026-09-04 as one consolidated set.
- Post-merge result: Pending.

## Open concerns

- Closing #211 relies on the operator's earlier note that its item was
  archived by PR #255; the residue item is linked so nothing is lost.
- Record hygiene in this PR: `2026-08-29-untriaged-oat-issues.md` becomes
  `partial` with a superseded note; `2026-09-04-issue-258-skill-versioning.md`
  becomes `post_merge_complete`.

## Resume instructions

After PR #259 merges, invoke:

```text
/triage-oat-issues resume post-merge PR #259
```
