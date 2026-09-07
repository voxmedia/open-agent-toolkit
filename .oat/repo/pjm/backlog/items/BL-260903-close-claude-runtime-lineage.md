---
id: BL-260903-close-claude-runtime-lineage
title: Close Claude runtime lineage depth and unverified provider shapes
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - subagents
  - dispatch
  - provenance
  - claude
  - residue
assignee: null
created: 2026-09-03T00:55:45.819Z
updated: 2026-09-03T00:55:45.819Z
associated_issues: []
external_plans: []
---

## Description

Residue from BL-260826, closed by the tool-pack-scope-provider-truthfulness project. Runtime observation ships and works against real artifacts for both providers, verified by full-corpus sweeps (Codex 1,596 rollouts and Claude 2,740 transcripts, 0 refused). Two gaps remain, both narrow.

Claude lineage depth is not derivable. Codex declares `source.subagent.thread_spawn.depth` outright, so Codex reports `root`, `depth-1`, `depth-2` correctly. Claude declares no equivalent. A walk of every parent chain across all 2,725 local transcripts found `parentUuid` never crosses an `agentId` boundary (zero occurrences in 251,913 chains), so it chains messages within one agent and cannot express agent-to-agent lineage. Claude therefore reports a binary from `isSidechain` and nothing more. Building a depth taxonomy on that evidence would be an invention of exactly the kind this project was created to eliminate.

The Claude stream-json shape is unverified. The parser retains a secondary path for the `system`/`init` and `result` records emitted by `claude -p --output-format stream-json`, but `"subtype":"init"` appears in 0 of 2,725 local transcripts and no captured artifact of that format exists. The path is explicitly labelled UNVERIFIED in code rather than presented as grounded. Four Codex field paths are labelled the same way: `turn_context.service_tier`, `turn_context.serviceTier`, `turn_context.reasoning_effort`, and `session_meta.request_id`, each 0 occurrences across 1,596 rollouts.

Also unresolved from p07 review rounds 3 and 4, all wording or coverage rather than behavior: FR9 names `missing` but omits `not-comparable`; corpus statistics in code comments carry no capture-environment provenance and go stale as the corpora grow; and one `record.ts` docstring still says "sanitized" where the projection is now the guarantee.

Reopen only if this becomes a recurring problem in practice. Claude's on-disk transcript already yields model, effort, service tier and role, which is the substance of runtime observation. Depth matters mainly for Codex, where dispatch depth caps are enforced and where it already works.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
