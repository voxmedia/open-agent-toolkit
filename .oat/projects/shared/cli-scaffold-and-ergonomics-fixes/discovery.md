---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: false
oat_template_name: discovery
---

# Discovery: cli-scaffold-and-ergonomics-fixes

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

From a downstream operator's feedback packet (Stoa repo, full orchestrated OAT lifecycle run on oat CLI 0.1.55→0.1.59, 2026-07-13), items 5–6:

1. **(Item 5)** `oat project new --mode quick` scaffolds `state.md` with literal placeholder tokens (`oat_hill_checkpoints: { OAT_HILL_CHECKPOINTS }`, `oat_phase: { OAT_PHASE }`) that require manual substitution. Separately, the scaffolded plan.md template is strictly TDD-shaped (RED/GREEN steps) with no guidance that non-TDD plan shapes are allowed even though `oat project validate-plan` accepts them.
2. **(Item 6)** Ergonomics: `oat tools update` with no args errors instead of doing something useful; `oat backlog archive` without `--summary` writes literal `TODO: summarize outcome` ledger lines into completed.md (34 landed in one bulk pass); the 0.1.59 removal of global `--scope` flag placement (`oat --scope all sync` → `oat sync --scope all`) broke a downstream repo's worktree-bootstrap script mid-run with no deprecation window.

## Recon Findings (verified 2026-07-13 against current main)

**Placeholder bug — reproduces and is worse than reported.** Root cause is a whitespace mismatch: `.oat/templates/state.md` writes tokens with spaces inside the braces (`{ OAT_PHASE }`), while `packages/cli/src/commands/project/new/scaffold.ts` calls `replaceAll('{OAT_PHASE}', ...)` — literal matching, so substitution silently no-ops for `oat_hill_checkpoints`, `oat_phase`, and `oat_workflow_mode`. Because `{ OAT_PHASE }` is valid YAML flow-mapping syntax, the frontmatter parses as an **object** (`{ OAT_PHASE: null }`), and `assertValidProjectStateContent` (`packages/cli/src/validation/project-state.ts`) treats a non-string as "field absent" — so validation never fires and the scaffold silently succeeds with corrupted state. The bug is masked in tests: `scaffold.test.ts`'s `seedTemplates` fixture uses space-free tokens that don't match the real template. **Live confirmation:** scaffolding this very project on 2026-07-13 produced the unsubstituted tokens.

**Plan template — confirmed.** `.oat/templates/plan.md` is strictly RED/GREEN/Refactor-shaped with no language permitting other shapes; `validate-plan` checks structure (frontmatter, stable `pNN-tNN` task IDs, required sections, Reviews-table integrity) and has zero TDD-shape requirements.

**`oat tools update` — confirmed.** `packages/cli/src/commands/tools/update/index.ts`: `resolveTarget` requires exactly one of name/`--pack`/`--all`; zero specified → error "Specify a tool name, --pack <pack>, or --all." and exit 1.

**`oat backlog archive` — confirmed.** `packages/cli/src/commands/backlog/archive.ts`: `TODO_SUMMARY = 'TODO: summarize outcome'`; the default (closed) archive path always writes a completed.md entry and falls back to the literal TODO string when `--summary` is absent.

**`oat decision new` TODO sections (wave-1 follow-up item, added 2026-07-13) — confirmed.** The decision template has `{title}`/`{context}`/`{decision}`/`{consequences}` slots, but the command accepts only `--context` (verified via `--help`); `packages/cli/src/commands/decision/new.ts` hardcodes `decision: 'TODO'`, `consequences: 'TODO'`, and `context: options.context ?? 'TODO'`. The `oat-project-summary` Step 6 promotion flow calls exactly this, so every promoted decision record lands with literal `TODO` under `## Decision` and `## Consequences` — the operator's two runs produced 8 such records before anyone noticed. Same placeholder-ledger pathology as `backlog archive`.

**`--scope` global flag — confirmed, and intentional.** `createProgram()` registers only `--json`/`--verbose`/`--cwd` globally; `--scope` is deliberately per-command (`packages/cli/src/commands/shared/scope-option.ts` has an explicit design comment) with a regression test pinning the removal (`create-program.test.ts`: "does not register --scope as a global option"). No alias or deprecation shim exists anywhere in the arg pipeline.

## Requirements

- **Scaffold fix:** make substitution actually fire — align tokens and `replaceAll` targets (and/or make substitution whitespace-tolerant). Fix the test fixture to match the real template so the gap can't re-mask (or better: test against the real template file). Consider a post-scaffold validation that rejects any remaining `{ OAT_* }`/`{OAT_*}` tokens as defense in depth.
- **Plan template guidance:** add explicit language that the TDD task-body shape is a default, not a requirement — the invariants are stable task IDs, per-task verification, and atomic commits. Either a note in the template or a minimal non-TDD variant (decide at planning; a note is the smaller change and `validate-plan` already accepts non-TDD shapes).
- **`oat tools update` ergonomics:** improve the no-args path — either default to `--all` with a confirmation line, or make the error show the exact suggested command. (Operator suggested either.)
- **`oat backlog archive` summary:** stop writing TODO placeholders — either require `--summary` on the closed path, or derive a fallback summary from the item's title/description.
- **`oat backlog new` item scaffolding (wave-2 item 4, added 2026-07-13):** add `oat backlog new <title>` so agents no longer combine `generate-id`, hand-authored template files, and `regenerate-index`. Reuse deterministic ID/collision semantics, initialize the backlog scaffold, render the real backlog-item template with canonical defaults plus `--priority`, `--scope`, `--labels`, and optional `--description`, regenerate only the managed index block, and update/version-bump `oat-pjm-add-backlog-item` to use the command.
- **`oat decision new` section flags (wave-1 item):** add `--decision <text>` / `--consequences <text>` (or `--body-file <path>`) so all template slots can be filled at creation, and update `oat-project-summary`'s Step 6 promotion step to derive and pass all three sections from the Key Decision content. Operator prefers this over post-creation edits because it keeps index regeneration atomic. (Note: the promotion-step half touches a canonical skill → version bump for `oat-project-summary` in the same PR.)
- **Breaking-change hygiene (operator answer, 2026-07-13):** no shim — "shims linger." Implement (b) + (c): a prominent release-note callout convention for CLI grammar breaks, and a doctor-style check that flags known-stale invocation forms in repo scripts/docs after upgrades. The operator called the doctor check "the actually valuable half": the realistic failure mode is an agent installing `@latest` mid-run, with repo scripts written against the old grammar breaking at a distance from the upgrade — a post-upgrade grep-style check would have caught it before the first bootstrap.
- **Noninteractive gate stdin (operator-approved scope addition, 2026-07-13):** gate targets already receive their prompt through argv, so close/ignore inherited stdin while preserving piped stdout/stderr, target selection, timeout, liveness, and diagnostic behavior.

## Key Decisions

1. **Bundle by change surface:** these are all small `packages/cli` code/template fixes with tests — one project, one release train, one lockstep version bump.
2. **`--scope` removal stands:** the per-command design is documented and tested; this project addresses migration ergonomics only.

## Constraints

- Public-package changes: lockstep five-package version bump (`packages/cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`) and `pnpm release:validate` must pass.
- Template changes under `.oat/templates/` count as shipped CLI functionality for release policy.
- `oat tools update` default-to-`--all` changes behavior for scripts; if chosen, keep the change non-destructive (confirmation line, or `--yes` gate in non-TTY contexts).

## Success Criteria

- `oat project new --mode quick` produces a `state.md` with valid expected array/scalar types and values for `oat_hill_checkpoints`, `oat_phase`, and `oat_workflow_mode`; a test scaffolding from the real repo template (not a divergent fixture) pins it.
- The plan template states that non-TDD task shapes are permitted and names the actual invariants.
- `oat tools update` with no args either acts usefully or errors with a copy-pasteable suggestion.
- `oat backlog archive` never writes `TODO: summarize outcome` into completed.md.
- `oat backlog new <title>` renders a collision-safe item from the real repository template with canonical defaults/overrides and refreshes the managed index idempotently without changing Curated Overview.
- Decision records promoted via `oat-project-summary` land with real `## Decision` and `## Consequences` content, never literal `TODO`.
- A decided, implemented policy response for CLI grammar breaking changes.
- Noninteractive gate targets begin without waiting for parent stdin EOF while stdout/stderr capture and existing gate behavior remain intact.

## Out of Scope

- Reverting the `--scope` per-command design.
- Unrelated skill-prose changes (the `oat-project-summary` Step 6 and `oat-pjm-add-backlog-item` command-migration requirements above are the explicit exceptions; other skill prose is covered by sibling projects).
- The run-log feature (separate project).

## Deferred Ideas

_(none — the doctor-style stale-invocation checker was promoted into Requirements by the operator's answer; scope it minimally, e.g. a known-stale-forms list checked by `oat doctor` or a post-upgrade hint, and split it out if it grows.)_

## Open Questions

- **`tools update` default:** default-to-`--all` (with confirmation) vs. better error? Decide at planning; better error is the safer minimum.
- **Substitution robustness:** exact-token alignment vs. whitespace-tolerant token regex in `scaffold.ts`? Decide at planning.
- **Doctor-check scope:** where the stale-invocation check runs (within `oat doctor`, or a post-upgrade hint from the CLI) and where the known-stale-forms list lives. Keep minimal.

_Resolved 2026-07-13 (operator answer): no `--scope` shim; release-note prominence + doctor-style stale-invocation check (the latter prioritized)._

## Assumptions

- No other templates share the space-padded-token mismatch (verify with a repo-wide token audit during implementation — cheap to check, worth pinning).

## Risks

- **Behavior changes to scripted CLI paths** (`tools update`, `backlog archive`) could surprise existing automations.
  - **Likelihood:** Low / **Impact:** Low
  - **Mitigation Ideas:** prefer additive/error-message improvements where the operator answer allows; release notes for any behavior change.

## Next Steps

Quick mode → straight to plan; no design needed. Run `oat-project-quick-start` to continue.
