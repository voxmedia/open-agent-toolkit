---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-25
oat_generated: true
oat_summary_last_task: p04-t04
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: dispatch-ceiling

## Overview

This project fixes the remaining Codex dispatch semantics gap from the first subagent model-selection work. Dogfooding showed that Codex base/unpinned roles do not reliably inherit the live parent reasoning effort, so OAT now treats dispatch ceiling as an explicit provider-aware OAT decision rather than an implicit property of the parent session.

## What Was Implemented

The configuration model now supports `workflow.dispatchCeiling.codex` and `workflow.dispatchCeiling.claude` across the shared, local, and user config surfaces. Codex ceilings use effort values (`low`, `medium`, `high`, `xhigh`), while Claude ceilings use model-tier values (`haiku`, `sonnet`, `opus`). Project state can also persist a selected ceiling in `oat_dispatch_ceiling` frontmatter so planning/preflight answers carry into implementation without mid-run prompts.

Codex deterministic dispatch now has generated pinned variants for implementer and reviewer roles. The generated Codex surface includes `oat-phase-implementer-{low,medium,high,xhigh}` and `oat-reviewer-{low,medium,high,xhigh}`; generated-role handling and stray detection were updated so these variants are managed role files rather than adoptable custom agents.

The project lifecycle skills were updated around the new contract. Planning guidance captures an unresolved ceiling before implementation readiness when interactive. Implementation preflight resolves and prints the ceiling, source, and Codex provider default effort before work starts. Runtime dispatch selection caps preferred Codex effort by the resolved ceiling, uses pinned variants for deterministic normal dispatch, and describes base/unpinned Codex roles as provider-default fallback behavior rather than parent-ceiling inheritance.

The CLI now exposes `oat project dispatch-ceiling resolve`, a compiled project-aware resolver that checks effective config first, then project state. It reports source-backed JSON, Codex provider default effort, and non-interactive blocking status. The final review fix separated JSON output from non-interactive block intent: unresolved `--preflight --json` can return `status: "unresolved"` for an interactive-capable orchestrator, while explicit `--non-interactive` or `OAT_NON_INTERACTIVE=1` still blocks before implementation work starts.

Documentation and repo reference surfaces were updated to describe the authoritative OAT ceiling model, Codex provider-default visibility, non-interactive behavior, and deterministic pinned variants. Lockstep public package versions were bumped to `0.1.8`.

## Key Decisions

- OAT dispatch ceiling is user-declared and authoritative; Codex provider default effort is informational only.
- Normal Codex implementer/reviewer dispatch should use pinned effort variants capped by the resolved OAT ceiling.
- Base/unpinned Codex roles remain available only as provider-default fallbacks and must not be logged as inheriting the parent session ceiling.
- Non-interactive implementation must fail before work starts when the ceiling is unresolved.
- Claude keeps provider-aware model-axis semantics and `effort_axis=not-applicable`; Codex effort terminology is not forced onto Claude.

## Design Deltas

The original plan expected the implementation skill to own the dispatch-ceiling preflight entirely through prompt text. Review surfaced that orchestrators need a compiled resolver surface to avoid duplicating resolution rules. The project added `oat project dispatch-ceiling resolve` as a review-fix task and updated the skill/docs guidance to call that helper.

The final review also found that JSON output had been treated as non-interactive in the resolver, which made the documented `--preflight --json` path block before an interactive prompt could run. The fix made blocking depend on explicit non-interactive intent instead of JSON output alone.

## Verification

- `pnpm check`
- `pnpm test`
- `pnpm build:docs`
- `pnpm release:validate`
- Focused CLI config, dispatch-ceiling, Codex sync, stray/init, and skill validation test suites
- `pnpm run cli -- sync --scope project`
- `pnpm run cli -- sync --scope project --dry-run`
- `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main`
- Final review passed on 2026-05-24 after the p04-t04 JSON preflight fix.

## Follow-up Items

- Continue moving prompt-only dispatch contracts into compiled CLI surfaces where doing so reduces orchestrator duplication.
- Watch dogfood for whether Codex spawn metadata exposes generated reviewer variants consistently; base reviewer remains only a provider-default fallback.
