---
oat_status: complete
oat_ready_for: plan
oat_blockers: []
oat_last_updated: 2026-03-10
oat_generated: false
---

# Discovery: guided-oat-init

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Onboarding a new repo to OAT requires running multiple CLI commands in sequence (`oat init`, `oat init tools`, `oat sync --scope project`, `oat local add ...`, `oat local apply`). The user has to know the right order, the right local paths, and remember each step. The experience should be a single guided flow that asks questions and executes CLI commands — a one-stop initialization.

## Key Decisions

1. **Enhance existing `oat init` rather than a new command:** Keep `oat init` as the single entry point. After the existing init work completes (providers, strays, hook, gitignore), continue with guided setup steps if the user opts in.
2. **Auto-trigger on fresh repos:** When `.oat/` doesn't exist (first-time init), ask if the user wants guided setup. This is the natural moment to configure everything.
3. **Force flag for existing repos:** Support `--setup` to re-run guided setup even when `.oat/` already exists — useful when OAT adds new setup steps in a later release.
4. **Multi-select for local paths:** Use existing `selectManyWithAbort()` to present local path choices (PR files, reviews, analysis, ideas) with sensible defaults pre-checked. Custom paths are deferred to `oat local add <path>` (noted in guided setup output).
5. **Sequential step flow with opt-in per step:** Each guided step asks before running. The user can skip any step. At the end, show a summary of what was configured.

## Constraints

- Must use existing prompt infrastructure (`@inquirer/prompts` via `shared.prompts.ts`)
- Must not break non-interactive mode — guided setup only runs when `context.interactive` is true
- Each step executes real CLI logic (same as running the commands manually), not duplicated implementations
- Must respect the existing `InitDependencies` injection pattern for testability

## Success Criteria

- A user running `oat init` on a fresh repo gets prompted for guided setup and can configure everything in one interactive session
- A user running `oat init --setup` on an existing repo can re-run guided configuration
- Local paths are presented as a multi-select with sensible defaults
- Each guided step is skippable
- Non-interactive mode is unaffected
- The flow ends with a summary of what was configured and suggested next steps

## Out of Scope

- Changing the behavior of `oat init tools` itself — just calling it from the guided flow
- Auto-detecting which local paths a repo "should" have based on content analysis
- Guided setup for user-scope (only project scope)

## Deferred Ideas

- Custom freeform path option in local paths multi-select — users can already run `oat local add <path>` for custom paths; adding inline freeform input adds complexity without clear v1 value
- Exposing a reusable `runSyncCommand` helper from the sync command — v1 shells out via `child_process`; extract when more callers need programmatic sync
- Guided re-configuration wizard (`oat config wizard`) for modifying existing settings interactively — could reuse the same multi-select patterns but is a separate feature
- Template-based init profiles (e.g., "monorepo", "single-package") that pre-select options

## Assumptions

- `oat init tools` can be called programmatically (not just as a CLI subcommand)
- `oat local add` and `oat local apply` logic is accessible from the init command's context
- The existing `oat init` flow's provider selection, stray adoption, and hook steps remain unchanged

## Next Steps

Straight to plan — scope is clear, no architecture decisions remain.
