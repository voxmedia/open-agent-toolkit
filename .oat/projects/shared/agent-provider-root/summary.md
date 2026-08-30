---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: true
oat_summary_last_task: p03-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: agent-provider-root

## Overview

Canonical OAT skills could read agent role instructions through bare repository-relative paths, which failed silently when the workflows pack existed only at user scope. The existing portability contract protected cross-skill reads but not skill-to-agent reads, leaving fallback paths vulnerable to losing their intended canonical instructions after native provider role selection had already failed.

This project established a portable, provider-aware contract for direct canonical role reads while preserving provider-native model, effort, variant, and route selection.

## What Was Implemented

- Added a typed portability classifier for both `skill` and `agent` targets. It detects canonical bare agent paths, dot-relative forms, and repeated-parent hops while excluding portable bindings, provider-view examples, suffixed variants, and Codex TOML.
- Added exact-target provider-layout fixtures for the ordered `loaded -> user -> project` candidate chain. Claude and Cursor unsuffixed base symlinks are accepted only when they resolve to the same-scope canonical Markdown file; copies, variants, Codex TOML, broken links, and escaping links are candidate misses.
- Migrated seven live reviewer and implementer reads across project review, remote review, plan writing, and implementation fallback instructions. Each dependency resolves independently and reports workflows-pack install/update recovery if every candidate misses.
- Activated a zero-executable-agent ratchet across both canonical scan scopes while preserving the historical six-entry cross-skill baseline byte-for-byte.
- Documented the canonical/provider boundary and prepared the five public packages plus synchronized release metadata at lockstep version `0.2.47`. No provider view, user-owned provider directory, provider configuration, or dispatch policy was changed.
- Proved the contract with a real-tree mutation failure and byte-exact restoration, 4,525 HOME-isolated uncached CLI tests, focused skill/release suites, lint and format, and the complete eight-gate Definition of Done. The final lifecycle review and configured Fable High exit-gate review both passed with zero findings.
- Repaired the append-complete final-review ledger after two Bugbot findings: the omitted initial event was restored, then placed chronologically so last-event readers still resolve the later passing gate event. Both bounded fixes passed independent review, and PR CI, release dry-run, and Bugbot checks were green on the final head.

## Key Decisions

- **Dependency-owned provider roots.** Each consuming dependency binds and validates its own local root. `${AGENT_PROVIDER_ROOT}` is used only when one owning pack is in play; multi-pack consumers use qualified bindings so one installed dependency cannot satisfy another dependency's missing role instructions.
- **Exact canonical identity for loaded targets.** The loaded candidate must be the exact unsuffixed same-scope canonical Markdown file or a symlink resolving to it. This admits canonical Claude/Cursor base symlinks while rejecting byte-identical copies, transformed views, model/effort variants, unsafe links, and Codex TOML before continuing to user and project roots.
- **Native exact role dispatch precedes fallback.** Existing provider, model, effort, variant, and route resolution remains authoritative. Canonical files supply instructions only for direct source-of-truth reads or after a recorded pre-start native-role rejection, so portable path resolution cannot change which subagent is selected.
- **Typed portability classifier.** One parser supplies `skill` and `agent` evidence to both the manifest-derived user-default scan and the every-canonical-agent scan. Retaining both scopes avoids assuming permanent manifest equivalence while eliminating divergent matching semantics.

## Notable Challenges

- Final review found that a line-wide provider-sync example exemption could hide an executable bare read placed on the same line. Task `p03-t03` narrowed the exemption to the paired descriptive occurrence; its red/green regression and the 241-test focused suite passed, and bounded re-review reported zero findings.
- Remote review exposed a bookkeeping invariant that was not explicit in the first ledger repair: preserving every event is insufficient when consumers use the last matching event as current state. Tasks `p03-t04` and `p03-t05` restored both event completeness and chronological latest-event semantics without changing product code.
- Evidence-grade verification required distinguishing cached success from real execution. The final proof used an isolated `HOME`, forced uncached Turborepo execution, direct exit codes, and a mutation test that restored the exact original bytes before the clean rerun.

## Tradeoffs Made

- The root-binding contract is an authored skill pattern backed by contract tests, not a new runtime resolver, CLI command, environment variable, or persistent setting. This keeps provider selection and runtime surfaces unchanged at the cost of maintaining the pattern in each consumer.
- Exact filesystem identity intentionally rejects byte-identical provider copies. The stricter rule sacrifices permissive reuse to prevent transformed or stale views from becoming canonical role instructions.
- Both scan scopes remain even though they share one parser. The small verification redundancy preserves independent coverage if manifest representation changes later.

## Integration Notes

- Provider-native agent selection still owns model and effort pins. Cursor suffixed variants and Codex generated TOML remain dispatch targets, never canonical Markdown inputs to this fallback contract.
- `tool-pack-scope-provider-truthfulness` may consume this project's canonical fallback contract, but it remains responsible for provider materialization, catalog visibility, reachability diagnostics, restart guidance, and scope-selection truthfulness.
- Changes to canonical skills remain shipped CLI functionality: each changed skill received one PR-scoped version bump, and all five public packages were advanced together.

## Follow-up Items

- Continue discovery for `tool-pack-scope-provider-truthfulness` using this project as the canonical role-file resolution dependency. Do not move its provider materialization or scope-selection responsibilities into this contract.
- The full configured exit gate was not rerun after the two bookkeeping-only Bugbot fixes by explicit operator choice. Their bounded reviews and final PR checks passed, while the preserved gate freshness record remained stale at completion.

## Associated Issues

- Backlog item `BL-260829-unified-agent-provider-root` is the requirements authority addressed by this implementation.
- Related project `tool-pack-scope-provider-truthfulness` owns the adjacent provider reachability and scope-selection work.

## Workflow Observations

### 2026-08-30 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:2 exit=0 status=ok artifact=.oat/projects/shared/agent-provider-root/reviews/artifact-plan-review-2026-08-30T160834Z.md

### 2026-08-30 · structural · oat-project-implement · p01

Phase p01 passed after two verified task commits and independent review; review artifact: reviews/archived/p01-review-2026-08-30T164420Z.md; fix loops: 0.

### 2026-08-30 · structural · oat-project-implement · p02

Phase p02 passed after four verified task commits and independent review; review artifact: reviews/archived/p02-review-2026-08-30T170942Z.md; findings: 0 Critical, 0 Important, 1 Medium, 0 Minor; fix loops: 0.

### 2026-08-30 · structural · oat-project-implement · p03

Phase p03 passed after one source commit plus one planned evidence-only task and independent review; review artifact: reviews/archived/p03-review-2026-08-30T173812Z.md; all Definition-of-Done gates passed; fix loops: 0.

### 2026-08-30 · structural · oat gate review · final

target=cursor-fable-5-high threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/agent-provider-root/reviews/final-review-2026-08-30T182542Z.md

### 2026-08-30 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/agent-provider-root/references/project-retro.md evidence_used=archived-review-markdown,gate-receipts,git-history,github-pr-checks,lifecycle-artifacts,project-log evidence_unavailable=oat-execution-learnings,session-transcript promotions=0 upstream=0 apply=skipped filing=skipped
