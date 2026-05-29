# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

**Review pass: 2026-04-24 (updated 2026-05-21).** Four items closed during the pass (`bl-42f9`, `bl-fb3f`, `bl-cbdd`, `bl-0738`). Three new items were added during the pass: `bl-b5af` (configurable staleness threshold), `bl-53f0` (project-independent brainstorming mode, imported from the `collaborative-design-workflow` project with auto-triggering note synthesized in), and `bl-3a4a` (sub-project split escape hatch, imported from the `collaborative-design-workflow` project). `bl-53f0` and `bl-3a4a` have since shipped. All remaining items carry a `priority_reviewed` stamp. Full review artifact: `.oat/repo/reviews/backlog-and-roadmap-review-2026-04-24.md`.

- **Control-plane state-read migration — `bl-281c`** (now **medium** priority): the high-leverage `state.md` slice shipped for seven lifecycle skills via concise `oat project status --field`, `--shell`, and `--project-path` reads, with a documented `npx @open-agent-toolkit/cli` shim contract for CI/cloud environments. Remaining scope is incremental: plan.md / implementation.md read surfaces, named candidate skills outside the initial grep scan, and optional consistency polish.
- **Quick-win batch (now high priority):** `bl-af93` (`oat config unset`), `bl-7e68` (quick-mode routing clarity), and `bl-b5af` (configurable staleness threshold). All S-sized, independent, and addressable as a single "workflow friction polish" PR set. `bl-af93` fixes a dogfooded gap where enum workflow keys have no CLI "unset" path.
- **Generated dashboard conflict polish — `bl-86e9` (new, medium):** follow-up to untracking the generated root `.oat/state.md`. Adds an explicit `oat state resolve --refresh` style helper for branches or downstream repos that still hit dashboard conflicts while replaying older tracked state commits, while refusing to discard project-level `.oat/projects/**/state.md` semantics.
- **In-progress tail — `bl-0ace`:** completion-state CLI helper is ~95% shipped via `oat project complete-state`; remaining work is verifying skill delegation and closing out tests.
- **Instruction sync polish — `bl-28ce`, `bl-c745`:** follow-ons to the shipped instruction-sync feature. `bl-28ce` persists the default `pointer|symlink|copy` strategy; `bl-c745` adds a per-path / per-file opt-out so Claude-only `CLAUDE.md` files aren't auto-promoted. Best treated as a small bundled effort since both touch the same surface.
- **Reference-read wiring — `bl-e582` (needs-discussion):** surfaced by the compound-engineering-plugin research (`docs/research/compound-engineering-plugin-analysis-opus-4-7.md`). `.oat/repo/knowledge/` is wired into seven lifecycle skills; `.oat/repo/reference/` (current-state, decision-record, project-summaries) is effectively write-only. Proposes wiring reference reads into `oat-project-discover`, `oat-project-plan`, and `oat-project-review-provide` with an explicit token-budget contract. Deliberately excludes `oat-repo-maintainability-review` (which should review cold — missing reference docs should surface as a finding, not be backfilled). Optional-pjm caveat: must no-op when the reference tree isn't present.
- **Project-independent brainstorming mode — `bl-53f0` (new, medium):** a Superpowers-style exploratory conversation that auto-triggers from conversational cues, supports five terminal states (ephemeral, scratchpad, idea capture, summarized idea, or project promotion), and starts without requiring project scaffolding. `bl-b3f7` (narrow idea-to-project promotion) will likely be absorbed by this.
- **Sub-project split escape hatch — `bl-3a4a` (closed, medium):** shipped as a standalone `oat-project-split` skill with discover and brainstorm integration hooks. The parent is coordination-only, marked complete by decomposition in place, and never archived as part of the split; children are flat sibling execution projects with distilled discovery seeds and revalidation requirements.
- **Staleness work — `bl-b5af` (new, medium) + `bl-f9bd` (deferred, low):** extracted the user-configurable threshold config key as its own quick-win item; left the fuller diff-based detection + hard-blocking work deferred under `bl-f9bd`.
- **Remote PR review — `bl-9fb8`:** completes the review/PR loop story (posting findings, responding, summarizing) once the core loop priorities are clear.
- **Deferred / low priority:** `bl-3327` (dependency intelligence — no active demand, keep as directional), `bl-ff5d` (Jira refinement flow — narrow audience, keep ad hoc), `bl-71a1` (memory system — roadmap Phase 10, blocked behind Phase 8/9 proven usage), `bl-931d` (listProjects fast path — conditional on `bl-281c` producing a measurement baseline).
- **Closed this pass:** `bl-42f9` (PM workflow family — shipped via `oat-pjm-*` skills + `oat backlog/cleanup` CLI + `localPaths` config), `bl-fb3f` (lifecycle follow-through — shipped via the subagent-implement-refactor project), `bl-cbdd` (Codex prompt wrapper — won't-do because `.codex/prompts/` was deprecated), and `bl-0738` (runtime dispatch selection and Dispatch Profile override guidance).

<!-- OAT BACKLOG-INDEX -->

| ID      | Title                                                                                | Status      | Priority | Scope      | Estimate |
| ------- | ------------------------------------------------------------------------------------ | ----------- | -------- | ---------- | -------- |
| bl-af93 | Add `oat config unset <key>` command for removing config values                      | open        | high     | feature    | S        |
| bl-7e68 | Clarify quick-mode resume routing from oat-project-plan                              | open        | high     | feature    | S        |
| bl-074b | Live dogfood for `oat-project-split` declared and detected entry paths               | open        | high     | task       | S        |
| bl-b5af | Add configurable staleness threshold to oat config                                   | open        | medium   | feature    | S        |
| bl-86e9 | Add oat state conflict resolver command                                              | open        | medium   | task       | S        |
| bl-9fb8 | Add PR review follow-on skill set (provide-remote, respond-remote, summarize-remote) | open        | medium   | feature    | L        |
| bl-ff5d | Backlog Refinement Flow (Jira ticket generation)                                     | open        | medium   | feature    | L        |
| bl-3a4a | Codified sub-project split escape hatch                                              | closed      | medium   | feature    | L        |
| bl-7d5b | Live dogfood for `oat-brainstorm` (fold-back commit safety + 9 destination families) | open        | medium   | task       | M        |
| bl-281c | Migrate skills to control-plane-backed CLI with cloud-env fallback                   | open        | medium   | initiative | M        |
| bl-0ace | Move oat-project-complete state mutations into a CLI helper                          | in_progress | medium   | feature    | M        |
| bl-28ce | Persist instruction sync strategy in config and expose it in init                    | open        | medium   | feature    | M        |
| bl-53f0 | Project-independent brainstorming mode                                               | closed      | medium   | feature    | L        |
| bl-f19a | Strict-YAML validation in `oat:validate-skills`                                      | open        | medium   | task       | S        |
| bl-e582 | Wire .oat/repo/reference artifacts into lifecycle skill reads                        | open        | medium   | feature    | M        |
| bl-3327 | Add dependency intelligence skill family                                             | open        | low      | feature    | L        |
| bl-b3f7 | Add idea promotion and auto-discovery flow to oat-project-new                        | open        | low      | feature    | L        |
| bl-c745 | Add per-CLAUDE.md adoption opt-out for instruction sync                              | open        | low      | feature    | M        |
| bl-f9bd | Deeper staleness detection and strict-mode enforcement                               | open        | low      | feature    | L        |
| bl-71a1 | Memory system + provider enhancements                                                | open        | low      | initiative | XL       |
| bl-931d | Optimize control-plane `listProjects()` summary path                                 | open        | low      | task       | M        |
| bl-c3d8 | Third-provider dispatch-ceiling adapter (e.g. Cursor)                                | open        | low      | feature    | M        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
