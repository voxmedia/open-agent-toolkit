---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-09
oat_generated: true
oat_summary_last_task: p04-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: codex-family-subagents

## Overview

This project replaced OAT's hard-coded Codex effort-pinned subagent variants
with a generic materialization path that can pin any canonical agent to a
specific model and reasoning effort. It was driven by the GPT-5.6 Sol, Terra,
and Luna preview, where OAT needs to handle both model-family and effort
selection without relying on unproven Codex parent-session inheritance.

The work also aligned Cursor and Claude dispatch behavior with the newer
multi-family dispatch model: policy and matrix configuration choose targets,
while each provider adapter compiles that choice into the reliable native
mechanism for that host.

## What Was Implemented

- Added a Codex materialization codec that takes a canonical agent document,
  model, and effort, then emits a deterministic managed Codex role with
  `model` and `model_reasoning_effort` set in TOML.
- Added `oat providers codex materialize`, including dry-run, JSON output,
  named canonical-agent lookup, `--agent-path`, `--scope project|user`,
  write-mode role creation, and `.codex/config.toml` merge behavior.
- Replaced the hard-coded effort-only Codex pin path with matrix-driven
  materialized roles for configured Codex model+effort targets. Project sync
  now removes stale managed effort-only pins and materializes only targets that
  are present in effective config or project state.
- Updated dispatch resolution so Codex matrix targets compile to
  `dispatchArgs.variant`, with model and effort axes reported from resolver
  output. Managed uncapped implementer/fix dispatch now maps preferred effort
  values such as `xhigh` through the highest matching managed tier, `frontier`,
  before resolving a matrix target.
- Kept Cursor on generic `.cursor/agents` files plus Task-level model dispatch,
  backed by validation against subagent-eligible model probes instead of broad
  catalog presence alone.
- Centralized dispatch policy choice text and hardened workflow skill prompts
  so options such as `frontier`, `uncapped`, `inherit`, and
  `leave-unresolved` come from canonical data rather than hand-typed lists.
- Updated provider sync, configuration, dispatch, and implementation docs;
  bumped the five public packages to `0.1.46`; and ran release validation.

## Key Decisions

- **Codex targets are materialized from canonical agents.** Codex dispatch
  remains deterministic by generating concrete role files from canonical
  `.agents/agents/*.md` definitions when OAT is given an explicit model and
  reasoning effort.
- **Dispatch matrix remains source of provider targets.** Policy rungs stay
  abstract; concrete model-family choices such as GPT-5.6 Sol, Terra, and Luna
  come from matrix cells rather than hard-coded policy mappings.
- **Cursor uses generic agents with Task-level model arguments.** Cursor does
  not need materialized model-specific `.cursor/agents` files for OAT-controlled
  dispatch, because Task-level `model` arguments can select non-inherited
  models when they are subagent-eligible.
- **Managed uncapped is explicit.** `uncapped` still means OAT manages preferred
  dispatch selection, but without a stored maximum cap; it is distinct from
  inheriting host defaults.
- **Provider verification happens.** GPT-5.6 recommendation defaults and Cursor
  subagent slugs remain deferred until the provider-visible model catalogs and
  entitlement behavior can be verified live.

## Notable Challenges

- The first materialized Codex path fixed the old pin model but exposed several
  contract mismatches: resolver axes could report selected effort without a
  materialized variant, sync initially missed resolver-visible matrix sources,
  and doctor/adoption validation split Codex route targets into invalid
  model-only checks. Phase 2 and Phase 3 review fixes aligned those paths around
  complete model+effort targets.
- Managed uncapped needed two passes. The first fix attached preferred matrix
  targets for uncapped implementer/fix dispatch, then final re-review found
  that `--preferred xhigh` still had to map from provider effort back to the
  highest matching OAT tier before lookup.
- The final docs pass found managed provider-view drift: project sync had not
  been run after replacing old pins. Running `oat sync --scope project` removed
  the obsolete effort-only Codex role files and refreshed `.codex/config.toml`
  and the sync manifest.

## Tradeoffs Made

- OAT now materializes only explicit CLI requests and matrix-referenced Codex
  targets, not every possible model/effort combination. This preserves
  deterministic Codex behavior without exploding provider views.
- The project did not ship a default GPT-5.6 policy mapping. That avoids baking
  in Sol/Terra/Luna assumptions before live provider availability and Cursor
  subagent eligibility can be verified.
- User-scope Codex materialization is available as a direct CLI operation, while
  automatic user-scope sync of matrix-driven materialized roles remains
  deferred. This keeps repo/project sync semantics clear.

## Integration Notes

- `oat sync --scope project` is the managed source of truth for repo-local
  Codex role files. If no effective Codex matrix targets exist, project sync
  should leave only base Codex roles and remove stale generated variants.
- Codex materialized role names normalize model IDs, so
  `gpt-5.6-sol` becomes role suffix `gpt-5-6-sol`.
- Dispatch prompts should use resolver-returned `dispatchArgs`, `modelAxis`,
  `effortAxis`, and selection context. Base `oat-reviewer` or
  `oat-phase-implementer` fallback means no materialized variant matched; it
  must not be described as managed uncapped selection.
- Review artifacts for this project were archived under
  `reviews/archived/`, which is local-only in this repository. Plan and
  implementation references point to those archived locations.

## Follow-up Items

- `BL-260708-verify-cursor-gpt-5-6-subagent`: verify Cursor GPT-5.6 subagent
  model slugs once Cursor exposes the models.
- `BL-260708-enable-oat-reviewer-subagent`: explore allowing reviewers to
  orchestrate cheaper/faster exploratory subagents while keeping final judgment
  in the main reviewer.
- `BL-260709-add-dispatch-machine-schema`: extract the human-facing dispatch
  display work into a reusable machine schema/formatter.
- Revisit `max` reasoning effort and `ultra` mode only after Codex exposes the
  corresponding provider controls in a verifiable local surface.
