---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-07
oat_generated: true
oat_summary_last_task: prev2-t08
oat_summary_revision_count: 2
oat_summary_includes_revisions: [p-rev1, p-rev2]
---

# Summary: independent-brainstorming

## Overview

OAT had two ends of the creative-work spectrum — `oat-idea-*` for lightweight idea ideation (requires an active idea) and `oat-project-*` for execution-oriented projects (requires an active project) — but no first-class entry point for project-independent brainstorming conversations that may or may not become a project. This project shipped that missing middle: a new always-on `oat-brainstorm` skill that fires on exploratory phrasing, runs a structured design conversation without requiring an idea or project artifact up front, and ends in a pack-aware terminal-state picker that hands off to the appropriate downstream OAT skill (or to `inline` / `doc-to-path` outcomes that work in any repo).

## What Was Implemented

- **New `oat-brainstorm` skill** in a new dedicated `brainstorm` tool pack. User-eligible, default user scope, default-on in `oat init` guided setup. Activation Contract with three tiers: **Hard Activation** for explicit `brainstorm` verb (`/oat-brainstorm`, "let's brainstorm", "can we brainstorm X", "help me brainstorm X") prints the banner and runs the full Process; **Soft Exploratory Path** for ambiguous phrasing ("help me think through", "I've been thinking", "what if we") answers conversationally with brainstorm-quality structure but no banner, and offers structured mode only after ≥2 sustained exploratory turns; **No Activation** for advisory/review/debug/PR/status/active-workflow questions ("thoughts?", "what's your take?", "please review") gets a direct response with no banner and no offer. Activation is its own message; the visual companion is offered only when the topic is visual-likely and is deferred silently for text-likely brainstorms.
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
- **Revision p-rev1 added** from post-PR dogfood feedback. It tightened skill-routing boundaries so blank-slate brainstorms go to `oat-brainstorm`, tracked idea continuation stays in `oat-idea-ideate`, and visual companion startup is conditional on visual need rather than offered immediately whenever Node is available. The revision also bumped changed skill versions and lockstep public packages to `0.0.60`.

## Notable Challenges

- The first final review (v1 from 2026-05-02) was the first comprehensive look at the merged whole and surfaced 9 cross-cutting issues that the four per-phase Tier 1 reviews each missed. Each phase looked internally consistent; the gaps only showed at integration: `tools.brainstorm` config key wasn't registered in normalization/defaults/catalog despite the type union including it; the per-pack install helper bypassed standard lifecycle semantics; SKILL.md hard-coded project-scope paths under user-scope-default install. The fact that this review caught them — and that the user explicitly opted to bring that level of scrutiny via a fresh-context final review — is the structural lesson: the per-phase Tier 1 reviewer protocol is excellent at within-phase quality but insufficient for cross-phase integration verification.
- The bookkeeping / state-refresh churn after the initial final pass was non-trivial. Two follow-on cycles (v3 → cycle-override applied inline) were needed to get the dashboard, project state body, plan summary, and review-table rows fully consistent with the actual lifecycle state. Lesson: state.md / .oat/state.md regeneration should be a hardened part of the final-pass commit, not a manual follow-up.
- The verbatim MIT-port files (visual companion) tripped both `pnpm format --check` (oxfmt) and lint-staged warnings during the first format-check pass. Resolution was to add narrow `.oxfmtrc.jsonc` ignore patterns rather than reformat the upstream files; preserving byte-for-byte parity matters for future upstream-merge ergonomics.

## Tradeoffs Made

- **Dogfood walkthroughs vs live runs.** Walkthroughs documented in `dogfood-results.md`; live runs (especially fold-back commit safety) captured as backlog item `bl-7d5b` for follow-up. The walkthroughs are runnable plans with verifiable signals from skill content, but they don't exercise the actual brainstorming flow against a real terminal. Acceptable trade because (a) the user will manually dogfood before merging using the vault-copied reference, and (b) live brainstorming dogfood requires an interactive agent context that's not always available during implementation.
- **Cycle-override on the v3 final review.** The 4th `final` review cycle exceeded the bounded-loop limit of 3. The v3 reviewer's own assessment was that no implementation-code changes were needed — all 3 findings were post-final-pass bookkeeping drift. User chose to apply fixes inline in a single bookkeeping commit and skip another formal review. Trade-off: cleaner audit trail vs. faster path to PR. Documented in implementation.md under the v3 review entry so the override is explicit, not implicit.
- **Generalized metadata vs special-case for default scope.** Larger diff for the metadata mechanism (~5 files vs ~2 for special-case) but reusable for future user-default-scope packs. Documented as ADR-017.

## Revision History

### Revision 1 (`p-rev1`) — 2026-05-03

Post-PR dogfood feedback. Three tasks (`prev1-t01`, `prev1-t02`, `prev1-t03`):

- **Skill-routing disambiguation** — narrowed `oat-idea-ideate` to existing tracked ideas / explicit scratchpad seeds, with a negative rule routing blank-slate brainstorms back to `oat-brainstorm`. The `oat-idea-ideate` description ("Use when continuing brainstorming for an existing idea or starting from a scratchpad entry") had been winning routing battles over `oat-brainstorm` for the literal verb "brainstorm".
- **Conditional visual-companion offer** — moved from "always offer when Node is available" to "offer only when topic is visual-likely". Text-likely brainstorms now set `VISUAL_COMPANION = "deferred"` and continue without an immediate offer; the offer resurfaces later only if the conversation turns visual.
- **Fixed progress counters dropped** — replaced rigid `[1/9]..[9/9]` with flexible phase labels so the user-facing progress model doesn't imply a visual-companion offer is always required.
- Lockstep public packages bumped to `0.0.60`.

### Revision 2 (`p-rev2`) — 2026-05-04

Activation contract tightening from inline dogfood feedback. Three original tasks (`prev2-t01..t03`) plus 5 review-fix tasks (`prev2-t04..t08`):

- **`prev2-t01..t03` (activation contract):** introduced the three-tier Activation Contract above; moved it to its own section before Mode Assertion in `SKILL.md`; collapsed two redundant visual-companion BLOCKED rules; added 12 walkthrough rows to `dogfood-results.md` Activation Anti-Cases table for live-dogfood verification; absorbed three non-blocking minors from `prev1-review-2026-05-03.md`. Lockstep `0.0.61`.
- **`prev2-t04` (I1 fix):** removed `"thoughts?"` from Soft Exploratory examples in frontmatter description and `tool-packs.md` — it now appears only in No Activation contexts. Internal contradiction would have preserved the trigger-happy failure mode prev2 was meant to remove.
- **`prev2-t05` (I2 fix):** scrubbed `CODEX_CI` from the visual-companion smoke-test child env. `start-server.sh` auto-sets `FOREGROUND=true` under `CODEX_CI=1` (intentional for real Codex usage), but the smoke harness resolved on the child `close` event — a foreground server never closes. Tests now pass under Codex CI without manually unsetting the env var.
- **`prev2-t06` (I3 fix):** rebased branch onto `origin/main` and resolved lockstep version conflicts. `0.0.62 → 0.0.63` to absorb concurrent main bumps and pick up new shipped content.
- **`prev2-t07` (m1 fix):** refreshed OAT bookkeeping (`state.md`, `plan.md ## Implementation Complete` totals) post-rebase.
- **`prev2-t08` (m2 fix):** fixed inline-code spacing in the new `bl-f19a` backlog item. The literal "add 3 spaces" approach was undone by `oxfmt`; resolution restructured the offending sentence into a fenced YAML block that survives the formatter.

### Skill-validator follow-up — 2026-05-04

Out-of-scope cleanup that piggy-backed on the same PR (5 skills + 1 description-lead-word fix; lockstep `0.0.62 → 0.0.63`):

- Restored `disable-model-invocation: false` on `oat-pjm-add-backlog-item`, `oat-project-document`, `oat-project-pr-final`, `oat-project-summary`, `oat-pjm-update-repo-reference`. PR #71 (already in main) had removed the key entirely when making four end-of-lifecycle skills model-invokable, but the validator (`packages/cli/src/validation/skills.ts:351-364`) still required the key as mandatory frontmatter. `pnpm oat:validate-skills` had been failing on those skills; now passes 48/48.
- Rewrote `oat-project-spec` description to start with "Use when discovery is complete..." (lead-word constraint).
- All affected skills bumped per AGENTS.md PR-scoping.

### Strict-YAML validation backlog item

`bl-f19a` (Strict-YAML validation in `oat:validate-skills`) — captures the validator gap surfaced when prev2's first activation-contract description shipped a bare colon mid-scalar (`brainstorm verb:`) that broke YAML parsing in downstream consumers but passed the validator. Validator currently checks length and lead-word but doesn't actually parse the YAML. Out of scope for this PR; tracked for follow-up.

### Skill version bump for dogfooding — 2026-05-06

Bumped `oat-brainstorm/SKILL.md` `version: 1.0.1 → 1.0.2` and lockstep `0.0.63 → 0.0.64` so the user's dogfooding update flow (`oat tools update --pack brainstorm` against linked CLI builds) actually picks up the staged content from prev2 and prev2-fixes. The strict AGENTS.md "one bump per PR per skill" rule was being applied too rigidly for a long-running PR with multiple shipped content stages — the fix is to bump per shipped content release, not per PR. Captured as auto-memory feedback rule.

## Follow-up Items

- **`bl-7d5b`** — Live dogfood for `oat-brainstorm` (fold-back commit safety + 9 destination families). Backlog item with embedded copy of `dogfood-results.md` walkthrough plans plus framing of what's still required. User noted they'll do _some_ manual dogfooding via the vault-copied reference before merging.
- **`core` consolidation candidate** — ADR-017 notes that `core`'s always-user-scope special-case is a candidate for folding into `PACK_METADATA` in a follow-up project. Out of scope for bl-53f0.
- **`bl-f19a`** — Strict-YAML validation in `oat:validate-skills`. The validator currently checks length and lead-word but doesn't parse the YAML; a bare colon mid-scalar (encountered in prev2's first activation-contract description) shipped despite breaking downstream consumers. Captured during this PR for follow-up.
- **Pre-existing skill validator failures resolved opportunistically.** The 6 historically-failing skills (`oat-pjm-add-backlog-item`, `oat-pjm-update-repo-reference`, `oat-project-document`, `oat-project-pr-final`, `oat-project-spec`, `oat-project-summary`) were fixed in this PR's skill-validator follow-up commit — `pnpm oat:validate-skills` now passes 48/48.

## Integration Notes

- **Always-on description means the skill fires automatically on destinationless exploratory phrasing** — agents working in OAT-installed repos will see `oat-brainstorm` activate when users say things like "let's brainstorm", "brainstorm this", "I've been thinking about", "what if we did", or "how should we approach" without naming a destination skill. The skill's first action is its mode assertion plus visual-need assessment; the visual companion is offered only for visual-likely topics and deferred for text-likely topics. If the trigger is firing too aggressively in a particular context, the description string in `.agents/skills/oat-brainstorm/SKILL.md` is the place to tighten language.
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
