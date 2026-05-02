---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-02
oat_generated: true
oat_summary_last_task: p05-t08
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: independent-brainstorming

## Overview

OAT had two ends of the creative-work spectrum — `oat-idea-*` for lightweight idea ideation (requires an active idea) and `oat-project-*` for execution-oriented projects (requires an active project) — but no first-class entry point for project-independent brainstorming conversations that may or may not become a project. This project shipped that missing middle: a new always-on `oat-brainstorm` skill that fires on exploratory phrasing, runs a structured design conversation without requiring an idea or project artifact up front, and ends in a pack-aware terminal-state picker that hands off to the appropriate downstream OAT skill (or to `inline` / `doc-to-path` outcomes that work in any repo).

## What Was Implemented

- **New `oat-brainstorm` skill** in a new dedicated `brainstorm` tool pack. User-eligible, default user scope, default-on in `oat init` guided setup. Always-on description (`disable-model-invocation: false`) tuned to fire on exploratory phrasing without competing with destination skills the user invokes directly. Activation is its own message; visual companion is offered up front.
- **Pack-aware terminal-state picker** (9 destination families): `inline`, `doc-to-path` (in-repo or off-repo), `capture-as-new-idea` (ideas pack), `extend-existing-idea` (ideas pack), `summarize-idea-directly` (ideas pack fast path), `scoped-backlog-item` (project-management pack), `promote-to-new-OAT-project` (workflows pack), and active-project routing with three sub-options (related → fold-back, independent → other terminal states, supplementary → reference file).
- **Active-project fold-back commit safety contract.** Preflight `git status --porcelain -- "$ARTIFACT_PATH"`, scoped staging via `git add -- "$ARTIFACT_PATH"` (never `-A`, never globs), three-option dirty-tree picker (commit-prior-first / mix / abort-to-reference-file), and a conditional handoff prompt that only prints after the scoped commit succeeds. Word-for-word aligned between design.md and SKILL.md.
- **Generalized `PackMetadata` mechanism** (`PACK_METADATA[name]?.defaultScope`) that drives both the interactive picker and the non-interactive scope resolver. `brainstorm` is the first user-default-scope pack; existing-install detection short-circuits before metadata lookup so users with prior project-scope installs don't get unexpected migrations. Captured as ADR-017.
- **Visual companion bundle** ported from MIT-licensed `superpowers:brainstorming@5.0.7`: `server.cjs`, `stop-server.sh`, `frame-template.html`, `helper.js` byte-for-byte verbatim; `start-server.sh` patched only for OAT-managed persistence-path resolution (`.oat/brainstorm/<session-id>/` repo-scope, `~/.oat/brainstorm/<session-id>/` user-scope, `<project-dir>/.oat/brainstorm/<session-id>/` when `--project-dir` is passed). Repo-scoped sessions added to managed gitignore via `localPaths`. Attribution captured in `NOTICES.md`.
- **Per-pack install helper** at `packages/cli/src/commands/init/tools/brainstorm/` mirroring the existing `ideas/` and `docs/` patterns. Routes through the same standard install lifecycle as the main `oat init tools` flow (existing-install scan, scope precedence, config write, affected-scope tracking).
- **Config schema integration** — `tools.brainstorm` registered end-to-end across `validPacks`, effective defaults, and the config command catalog. `pnpm cli config get tools.brainstorm` returns a value (was previously `Unknown config key`).
- **Destinations playbook** (`references/destinations.md`) with one stanza per terminal state covering trigger phrases, required template fields, confirmation pattern, handoff target, and "keep brainstorming" rule.
- **Doc-to-path output template** (`templates/brainstorm-doc.md`) for the always-available, off-repo-friendly destination.
- **Documentation** in `apps/oat-docs/`: new "Brainstorm pack" section in `cli-utilities/tool-packs.md`; brainstorm entries in `workflows/skills/index.md` "Key Skills by Use Case" + Full Catalog; cross-references added to `workflows/ideas/index.md`, `workflows/ideas/lifecycle.md`, and `workflows/projects/lifecycle.md` (including a "Brainstorming integration with the project lifecycle" section covering both new-project seeding and active-project fold-back).
- **Repo reference docs:** `current-state.md` updated with new "Brainstorming (always-on)" subsection, ADR-017 added, `bl-53f0` closed, `backlog/completed.md` entry added, live-dogfood follow-up captured as `bl-7d5b`.

## Key Decisions

- **Ask-at-end destination identification** with opportunistic trigger surfacing, not ask-up-front. The skill exists to serve users who don't yet know where the work is headed; users with a confident destination would invoke the destination skill directly. Trigger phrases ("track this as a backlog item", "let's make this a project", etc.) catalogued in the destinations playbook so the skill can surface a matched destination mid-conversation without forcing the question early.
- **Generalized `PACK_METADATA[name]?.defaultScope` mechanism** rather than hardcoding `'brainstorm'` in installer scope-resolution paths (ADR-017). Smaller diff would have been the special-case approach; the metadata mechanism generalizes for any future user-default-scope pack and is shaped to fold `core`'s always-user-scope special-case in a follow-up consolidation.
- **Project promotion writes `discovery.md` only**, never partial `design.md`. Architectural intent surfaced during brainstorming lands in discovery's Solution Space / Chosen Direction / Key Decisions — exactly where the design phase reads it during approach reaffirmation. Avoids putting the user in a half-populated `design.md` that constrains the design phase before the user has deliberately chosen its shape.
- **Inline-execute downstream skills** rather than rely on a skill-invocation primitive. Downstream skills carry `disable-model-invocation: true`, so the dispatcher reads the target SKILL.md and follows its process inline within the current conversation — matching how `oat-idea-new` already chains into `oat-idea-ideate`.
- **Active-project reference files are durable-tracked**, not local scratch. The skill commits the reference file via scoped `git add -- <path>` and emits a confirmation note — same discipline as the active-project fold-back.
- **Visual companion is ported, not reimplemented.** Superpowers is MIT and the implementation is solid; OAT-side modifications limited to persistence-path resolution. Four of five script files are byte-for-byte verbatim; only `start-server.sh` is patched.

## Design Deltas

- **Path (b) chosen for dogfood scenarios** rather than path (a). The plan said "Run all 10 dogfood scenarios end-to-end" and the implementer documented walkthrough plans instead. Both the plan text and the dogfood-results artifact were revised to honestly reflect walkthroughs; live dogfood (especially the fold-back commit safety contract against a real dirty tree) was captured as backlog item `bl-7d5b` with a copy of the walkthrough plans in its body. The user requested a copy of `dogfood-results.md` to their iCloud Obsidian vault for reference while doing some manual dogfooding before merging.
- **Phase 2 scope expanded** to cascade `'brainstorm'` through several exhaustive switches (`BUNDLED_PACK_MEMBERS`, `BUNDLED_PACK_ASSETS`, `install-sync-context`, `scan-tools`, `VALID_PACKS`, `PACK_DESCRIPTIONS`) once the `PackName` union was extended. Reviewer confirmed this as necessary type-completeness work, not scope drift.
- **Phase 4 added p04-t05** during execution to address a Phase 3-flagged Medium prerequisite (`pnpm format --check` failing on bundled MIT-port files). Added narrow `.oxfmtrc.jsonc` `ignorePatterns` for `packages/cli/assets/skills/**/scripts/**` and `packages/cli/assets/docs/**`.
- **Phase 5 added** during the post-implementation final review when 6 Important + 2 Medium + 1 Minor findings surfaced cross-cutting bugs the per-phase reviews didn't catch (config-schema gap, install-lifecycle bypass, hard-coded skill paths, gitignore claim mismatch, stale state artifacts, dogfood claim/artifact disagreement, ambiguous active-project-reference semantics, broken docs path refs, stale pack list). All 9 converted to fix tasks p05-t01 through p05-t08; all closed in the v2 final re-review.

## Notable Challenges

- The first final review (v1 from 2026-05-02) was the first comprehensive look at the merged whole and surfaced 9 cross-cutting issues that the four per-phase Tier 1 reviews each missed. Each phase looked internally consistent; the gaps only showed at integration: `tools.brainstorm` config key wasn't registered in normalization/defaults/catalog despite the type union including it; the per-pack install helper bypassed standard lifecycle semantics; SKILL.md hard-coded project-scope paths under user-scope-default install. The fact that this review caught them — and that the user explicitly opted to bring that level of scrutiny via a fresh-context final review — is the structural lesson: the per-phase Tier 1 reviewer protocol is excellent at within-phase quality but insufficient for cross-phase integration verification.
- The bookkeeping / state-refresh churn after the initial final pass was non-trivial. Two follow-on cycles (v3 → cycle-override applied inline) were needed to get the dashboard, project state body, plan summary, and review-table rows fully consistent with the actual lifecycle state. Lesson: state.md / .oat/state.md regeneration should be a hardened part of the final-pass commit, not a manual follow-up.
- The verbatim MIT-port files (visual companion) tripped both `pnpm format --check` (oxfmt) and lint-staged warnings during the first format-check pass. Resolution was to add narrow `.oxfmtrc.jsonc` ignore patterns rather than reformat the upstream files; preserving byte-for-byte parity matters for future upstream-merge ergonomics.

## Tradeoffs Made

- **Dogfood walkthroughs vs live runs.** Walkthroughs documented in `dogfood-results.md`; live runs (especially fold-back commit safety) captured as backlog item `bl-7d5b` for follow-up. The walkthroughs are runnable plans with verifiable signals from skill content, but they don't exercise the actual brainstorming flow against a real terminal. Acceptable trade because (a) the user will manually dogfood before merging using the vault-copied reference, and (b) live brainstorming dogfood requires an interactive agent context that's not always available during implementation.
- **Cycle-override on the v3 final review.** The 4th `final` review cycle exceeded the bounded-loop limit of 3. The v3 reviewer's own assessment was that no implementation-code changes were needed — all 3 findings were post-final-pass bookkeeping drift. User chose to apply fixes inline in a single bookkeeping commit and skip another formal review. Trade-off: cleaner audit trail vs. faster path to PR. Documented in implementation.md under the v3 review entry so the override is explicit, not implicit.
- **Generalized metadata vs special-case for default scope.** Larger diff for the metadata mechanism (~5 files vs ~2 for special-case) but reusable for future user-default-scope packs. Documented as ADR-017.

## Follow-up Items

- **`bl-7d5b`** — Live dogfood for `oat-brainstorm` (fold-back commit safety + 9 destination families). Backlog item with embedded copy of `dogfood-results.md` walkthrough plans plus framing of what's still required. User noted they'll do _some_ manual dogfooding via the vault-copied reference before merging.
- **`core` consolidation candidate** — ADR-017 notes that `core`'s always-user-scope special-case is a candidate for folding into `PACK_METADATA` in a follow-up project. Out of scope for bl-53f0.
- **Pre-existing skill validation failures** on `oat-pjm-update-repo-reference` (missing `disable-model-invocation`) and `oat-project-spec` (description prefix) — confirmed unrelated to this work via stash test, but visible during `pnpm oat:validate-skills`. Worth a separate cleanup item.

## Integration Notes

- **Always-on description means the skill fires automatically on exploratory phrasing** — agents working in OAT-installed repos will see `oat-brainstorm` activate when users say things like "I've been thinking about", "what if we did", or "how should we approach". The skill's first action is its mode assertion + visual-companion offer, so there's no risk of silent state mutation. If the always-on trigger is firing too aggressively in a particular context, the description string in `.agents/skills/oat-brainstorm/SKILL.md` is the place to tighten language.
- **Pack detection uses `oat config get tools.<pack>`** — same pattern `oat-project-document` already uses. Other skills that need to gate behavior on installed packs should use this signal, not directory heuristics.
- **`PackMetadata` is the canonical place to register user-default-scope behavior** — adding a new user-default-scope pack is a single entry in `PACK_METADATA[name] = { defaultScope: 'user' }` plus the existing `BRAINSTORM_SKILLS`-style manifest constant.
- **Active-project brainstorming** has explicit hooks: `<project>/brainstorming/<topic>.md` for reference files (durable-tracked) and the fold-back commit safety contract for direct discovery/design integration. Both paths emit explicit confirmation notes after committing — the skill never leaves the working tree dirty.

## References

- Backlog item: `.oat/repo/reference/backlog/items/project-independent-brainstorming-mode.md` (`bl-53f0`)
- Live dogfood follow-up: `.oat/repo/reference/backlog/items/live-dogfood-oat-brainstorm.md` (`bl-7d5b`)
- ADR: `.oat/repo/reference/decision-record.md` ADR-017 (Generalize pack default-scope via PACK_METADATA)
- Discovery: `discovery.md`
- Design: `design.md`
- Plan: `plan.md`
- Implementation: `implementation.md`
- Skill: `.agents/skills/oat-brainstorm/SKILL.md`
- Visual companion bundle: `.agents/skills/oat-brainstorm/scripts/`, `.agents/skills/oat-brainstorm/references/visual-companion.md`
- Destinations playbook: `.agents/skills/oat-brainstorm/references/destinations.md`
- Vault reference (user-scope, outside repo): `/Users/thomas.stang/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault/02 - Projects/Open Agent Toolkit/References/dogfood-results.md`
