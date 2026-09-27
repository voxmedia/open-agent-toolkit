---
oat_generated: false
---

# Execution Learnings: triage-correctness-wave

Append-only log of reusable observations from this autonomous run.

## 2026-09-27T04:05:00Z - gotcha - Scaffold commit leaves state.md hook-reformatted but uncommitted

**Observation:** `oat project new --mode quick` committed the scaffold, then the lint-staged pre-commit hook re-quoted two timestamps in `state.md`, leaving the file `MM` (staged and unstaged) after a successful commit.
**Impact:** The worktree was dirty immediately after scaffolding; this is the hook-modified exact-path commit gap tracked in `BL-260927-share-one-hook-safe-exact-path` (GitHub #306).
**Recommendation:** Restore the committed CLI output (`git restore --staged --worktree`) and verify a clean tree after every CLI-owned commit until the shared commit primitive lands.

## 2026-09-27T04:05:00Z - decision - Wave setup choices

**Observation:** The operator approved the tackle-backlog wave (nine items plus reconciling `BL-260908-restore-recon-s-cheap-fan-out`), Claude phase implementers, the `codex-6-sol-xhigh` independent reviewer, phase gates on all phases, and project dispatch policy `managed/high`. Gate routing needed no config change: targets are tried in descending priority with same-family avoidance, so `claude-opus-5-5-high` (180) is skipped and `codex-6-sol-xhigh` (170) is selected ahead of both Cursor targets.
**Impact:** Plan, phase, and final gates are cross-family without an execution-time `--target`.
**Recommendation:** Re-verify the selected gate target in each gate result's structured output.

## 2026-09-27T04:05:00Z - environment-limited - External-integration research

**Observation:** Every wave item is internal to this repository (CLI source, bundled skills, tests); no external service, protocol, or adjacent repository is implicated.
**Impact:** Step 3 research is limited to checked-out sources and the verified triage record `.oat/repo/pjm/triage/2026-09-26-untriaged-issues.md`.
**Recommendation:** None.
