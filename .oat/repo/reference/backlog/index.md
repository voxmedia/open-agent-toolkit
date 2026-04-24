# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

**Review pass: 2026-04-24.** Three items closed (`bl-42f9`, `bl-fb3f`, `bl-cbdd`), two new items added (`bl-8487`, `bl-b5af`), and all remaining items carry a `priority_reviewed: '2026-04-24'` stamp in their frontmatter. Full review artifact: `.oat/repo/reviews/backlog-and-roadmap-review-2026-04-24.md`.

- **Top strategic item — `bl-281c`** (now **high** priority): migrate read-only skills to `oat project status --json` and add `npx @open-agent-toolkit/cli` fallback for cloud environments. Retires per-skill bootstrap duplication, enables cloud-env parity, and produces the measurement baseline that gates `bl-931d`.
- **Quick-win batch (now high priority):** `bl-af93` (`oat config unset`), `bl-7e68` (quick-mode routing clarity), and `bl-b5af` (configurable staleness threshold). All S-sized, independent, and addressable as a single "workflow friction polish" PR set. `bl-af93` fixes a dogfooded gap where enum workflow keys have no CLI "unset" path.
- **In-progress tail — `bl-0ace`:** completion-state CLI helper is ~95% shipped via `oat project complete-state`; remaining work is verifying skill delegation and closing out tests.
- **Instruction sync polish — `bl-28ce`, `bl-c745`:** follow-ons to the shipped instruction-sync feature. `bl-28ce` persists the default `pointer|symlink|copy` strategy; `bl-c745` adds a per-path / per-file opt-out so Claude-only `CLAUDE.md` files aren't auto-promoted. Best treated as a small bundled effort since both touch the same surface.
- **Model-selection guidance — `bl-0738`:** recast from "reasoning budget" to "per-phase model selection" to match actual harness constraints — Claude Code exposes only model choice (`haiku|sonnet|opus`), not thinking budget; Codex auto-chooses `reasoning_effort`. Scope is documentation, agent defaults, and surfaced rationale, not behavior change.
- **Reference-read wiring — `bl-e582` (needs-discussion):** surfaced by the compound-engineering-plugin research (`docs/research/compound-engineering-plugin-analysis-opus-4-7.md`). `.oat/repo/knowledge/` is wired into seven lifecycle skills; `.oat/repo/reference/` (current-state, decision-record, project-summaries) is effectively write-only. Proposes wiring reference reads into `oat-project-discover`, `oat-project-plan`, and `oat-project-review-provide` with an explicit token-budget contract. Deliberately excludes `oat-repo-maintainability-review` (which should review cold — missing reference docs should surface as a finding, not be backfilled). Optional-pjm caveat: must no-op when the reference tree isn't present.
- **Brainstorming direction — `bl-8487` (new, deferred):** elevate brainstorming to a first-class mode with three outcome paths (inline / idea / project), modeled on the Superpowers brainstorming skill. Deferred behind the collaborative design project. `bl-b3f7` (narrow idea-to-project promotion) will likely be absorbed by this.
- **Staleness work — `bl-b5af` (new, medium) + `bl-f9bd` (deferred, low):** extracted the user-configurable threshold config key as its own quick-win item; left the fuller diff-based detection + hard-blocking work deferred under `bl-f9bd`.
- **Remote PR review — `bl-9fb8`:** completes the review/PR loop story (posting findings, responding, summarizing) once the core loop priorities are clear.
- **Deferred / low priority:** `bl-3327` (dependency intelligence — no active demand, keep as directional), `bl-ff5d` (Jira refinement flow — narrow audience, keep ad hoc), `bl-71a1` (memory system — roadmap Phase 10, blocked behind Phase 8/9 proven usage), `bl-931d` (listProjects fast path — conditional on `bl-281c` producing a measurement baseline).
- **Closed this pass:** `bl-42f9` (PM workflow family — shipped via `oat-pjm-*` skills + `oat backlog/cleanup` CLI + `localPaths` config), `bl-fb3f` (lifecycle follow-through — shipped via the subagent-implement-refactor project), `bl-cbdd` (Codex prompt wrapper — won't-do because `.codex/prompts/` was deprecated).

<!-- OAT BACKLOG-INDEX -->
| ID | Title | Status | Priority | Scope | Estimate |
| --- | --- | --- | --- | --- | --- |
| bl-af93 | Add `oat config unset <key>` command for removing config values | open | high | feature | S |
| bl-7e68 | Clarify quick-mode resume routing from oat-project-plan | open | high | feature | S |
| bl-281c | Migrate skills to control-plane-backed CLI with cloud-env fallback | open | high | initiative | L |
| bl-b5af | Add configurable staleness threshold to oat config | open | medium | feature | S |
| bl-9fb8 | Add PR review follow-on skill set (provide-remote, respond-remote, summarize-remote) | open | medium | feature | L |
| bl-ff5d | Backlog Refinement Flow (Jira ticket generation) | open | medium | feature | L |
| bl-0738 | Define per-phase model selection guidance for phase-subagent dispatch | open | medium | feature | S |
| bl-0ace | Move oat-project-complete state mutations into a CLI helper | in_progress | medium | feature | M |
| bl-28ce | Persist instruction sync strategy in config and expose it in init | open | medium | feature | M |
| bl-e582 | Wire .oat/repo/reference artifacts into lifecycle skill reads | open | medium | feature | M |
| bl-3327 | Add dependency intelligence skill family | open | low | feature | L |
| bl-b3f7 | Add idea promotion and auto-discovery flow to oat-project-new | open | low | feature | L |
| bl-c745 | Add per-CLAUDE.md adoption opt-out for instruction sync | open | low | feature | M |
| bl-f9bd | Deeper staleness detection and strict-mode enforcement | open | low | feature | L |
| bl-8487 | Elevate brainstorming to a first-class mode with three outcome paths | open | low | initiative | L |
| bl-71a1 | Memory system + provider enhancements | open | low | initiative | XL |
| bl-931d | Optimize control-plane `listProjects()` summary path | open | low | task | M |
<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
