---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-06-22
oat_generated: false
---

# Discovery: oat-init-scope-selection

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Implementation details captured here are root-cause pointers for the plan phase.

## Initial Request

`oat init` guided setup (`oat init --setup`) does not surface the per-pack scope
selector added in PR #113 (additive `oat tools install`). The interactive
per-pack "Where should {pack} install?" radio (`project / user / both`) appears
for `oat tools install` but not during first-run guided setup, so users can't
choose where each user-eligible pack installs during onboarding.

## Root Cause

- `packages/cli/src/commands/init/index.ts:629` — guided setup builds
  `guidedContext = { ...context, scope: 'project' }` and passes it to the tool
  pack installer.
- `resolvePackScopes` (`commands/init/tools/index.ts:528-540`) short-circuits on
  an explicit concrete `scope` (`project`/`user`) via the additive `--scope`
  union path and returns before the interactive per-pack selector loop
  (`~lines 567-583`). So forcing `scope: 'project'` bypasses the radio entirely.

## Chosen Direction

**Opt-in customization (user-validated).** Keep first-run onboarding lean rather
than adding N per-pack prompts by default:

1. Guided setup selects packs, then presents a single gate:
   **"Customize per-pack scope? (y/N)"**.
2. **No (default):** apply sensible per-pack defaults without prompting — each
   user-eligible pack resolves to its default placement (`resolvePackDefaultScope`
   / preserve current placement), additively. Not a blanket force to `project`.
3. **Yes:** run the existing per-pack `Where should {pack} install?` radio for
   each eligible pack (same selector as `oat tools install`).

Rejected alternative: always prompt per-pack in guided setup — full control but
adds onboarding friction the user wants to avoid.

## Key Decisions

1. **Opt-in gate, not always-prompt.** A single y/N gate gates the per-pack
   radios; default path stays prompt-free.
2. **Default path uses sensible per-pack defaults, additively** — not a forced
   `scope: 'project'` for all eligible packs. This also keeps guided setup
   consistent with the additive (never-remove) guarantee from #113.
3. **Reuse the existing selector.** The "yes" path reuses
   `buildPackEndStateChoices` / the per-pack `selectWithAbort` loop already in
   `resolvePackScopes`; no new prompt UI.
4. **Per-pack radio shape is final** — user confirmed the radio
   (`project / user / both`) is the desired interaction; this project only wires
   it into guided setup, it does not change the selector itself.

## Constraints

- Guided setup must remain non-interactive-safe (CI / `OAT_NON_INTERACTIVE`):
  when non-interactive, skip the gate and apply defaults (no prompts).
- Preserve the additive guarantee — guided setup must never remove a pack from a
  scope it already occupies.
- Keep the command handler thin per `packages/cli/AGENTS.md`.

## Success Criteria

- `oat init --setup` (interactive) presents a "Customize per-pack scope?" gate
  after pack selection.
- Choosing "no" applies per-pack default placement additively (no per-pack
  prompts, no forced project-only, no removals).
- Choosing "yes" runs the per-pack `Where should X install?` radio for each
  eligible pack, identical to `oat tools install`.
- Non-interactive guided setup applies defaults with no prompts.
- Tests cover: gate-yes → per-pack selector invoked; gate-no → defaults applied,
  selector not invoked; non-interactive → no gate, defaults applied; additive
  behavior preserved (no removal).

## Out of Scope

- Changing the per-pack selector shape (radio stays; no checkbox/matrix rework).
- Changes to `oat tools install` scope behavior (already shipped in #113).

## Open Questions

- Exact wording/placement of the "Customize per-pack scope?" gate within the
  guided flow (resolve during plan/implementation).
- Whether the "no" default should preserve current placement for already-installed
  packs or strictly use `resolvePackDefaultScope` (lean: preserve current,
  additive — consistent with #113).

## Next Steps

- **Quick mode → straight to plan:** proceed to `oat-project-quick-start` to
  produce `plan.md`. Scope is clear; the design decision (opt-in gate) is
  resolved.
