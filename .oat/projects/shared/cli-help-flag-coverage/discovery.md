---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-06-27
oat_generated: false
---

# Discovery: cli-help-flag-coverage

## Initial Request

`oat sync --help` does not mention the `--scope` flag even though `oat sync --scope all` is a documented, supported invocation. The user asked to (a) fix that, and (b) audit help/flag coverage across all CLI commands to confirm everything is covered "across the board."

A full audit was run first (programmatic command-tree walk + three parallel subagent reviews). Findings are captured in `references/audit.md`. This project implements the **P0 + P1** subset the user selected.

## Solution Space

The reported symptom (`--scope` missing from `oat sync --help`) is one instance of a systemic issue: `--json`, `--verbose`, `--scope`, and `--cwd` are all defined as **global** options on the root program (`packages/cli/src/app/create-program.ts`). Commander hides parent options from subcommand help unless `showGlobalOptions` is enabled — and it is never enabled — so none of the four appear in any of the 107 subcommands' `--help`.

Two viable directions were weighed:

### Approach 1: Blanket `showGlobalOptions` only

Turn on `showGlobalOptions` for the whole tree and leave all four flags global.

**Tradeoff:** Simple, but dishonest for `--scope`. `--scope` is consumed by only ~1/3 of commands (the provider-sync core); the rest silently accept and ignore it. A blanket approach would advertise `--scope` on `oat config`, `oat docs`, etc. where it does nothing, and would not fix the genuinely broken `oat providers set`.

### Approach 2: Keep true globals global; demote `--scope` to per-command _(chosen)_

`--json`, `--verbose`, `--cwd` genuinely apply to every command → keep global + enable `showGlobalOptions`. `--scope` is not truly global → demote it to a per-command option (via a shared `withScopeOption()` helper) on only the commands that consume it.

**Why chosen:** Help becomes honest — `--scope` appears as a first-class local option only where it works (`oat sync --help` shows it directly), and commands that ignore scope stop advertising it. This also fixes the broken `oat providers set` default in the same stroke.

**Key enabling fact (validated):** `readGlobalOptions()` uses `command.optsWithGlobals()` (`packages/cli/src/commands/shared/shared.utils.ts`), which merges a command's own options with parent options. So a per-command `--scope` flows into `context.scope` through the existing `buildCommandContext` path with no change to the context builder. Non-consumer commands return `scope: undefined` → default `'all'`, so nothing downstream breaks; they simply no longer accept the flag.

**User validated:** Yes — agreed `--scope` should not be global, and selected the P0 + P1 scope.

## Key Decisions

1. **Global flag visibility:** Enable `showGlobalOptions` across the entire command tree. Because 89/99 commands register via `.addCommand()` (which does **not** inherit help config, verified empirically), the help configuration must be applied recursively after registration, not just on the root program.
2. **`--scope` demotion:** Remove `--scope` from the root globals; add it back via a `withScopeOption()` helper only on scope-consuming commands.
3. **Scope consumers (get `--scope`):** `sync`, `status`, `doctor`; `init` (guided) and packs `ideas`/`docs`/`workflows`/`utility`/`research`/`brainstorm`; `tools list`/`outdated`/`info`/`update`/`remove` and `tools install` (guided); `providers list`/`inspect`/`set`; `remove skill`/`skills`.
4. **Scope non-consumers / hardcoders (do NOT get `--scope`):** the `init tools core` (hardcodes user) and `init tools project-management` (hardcodes project) packs, and `instructions validate`/`sync` (project-only). This resolves the in-group FALSE-ACCEPT (P1-3).
5. **`oat providers set` (P0-1):** Currently broken on its default invocation — it requires `scope === 'project'` but global scope defaults to `all`. Fix so a bare `oat providers set --enabled X` works (operate project-scoped by default), and ensure the guidance text references the now-documented local flag.
6. **`--json` contract pass (P1-4…P1-8):** Make `--json` symmetric: emit JSON iff `--json` is set, route human output through the logger. Covers `project validate-plan`, `project split run` (never emit → fix), `project split evaluate-signals`, `project split validate-plan` (always emit → gate), and `repo pr-comments triage-collection` (no non-interactive path → add one).
7. **Regression guard:** Extend the existing help snapshot test (`packages/cli/src/commands/help-snapshots.test.ts`) so global-flag visibility and `--scope` placement cannot silently regress.

## Constraints

- CLI package conventions (`packages/cli/AGENTS.md`): `./` relative imports + TS aliases only; mutate-by-default with `--dry-run` opt-in; output via the CLI logger, not `console.*`; exit codes 0/1/2.
- Lockstep public-package version bump required (`cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`) because shipped CLI functionality changes; `pnpm release:validate` must pass before done.
- Behavior change: non-consumer commands will reject `--scope` (unknown option) instead of silently accepting it. Verified no internal callers pass `--scope` to non-consumers (all internal `--scope` usage targets `sync`/`status`/`providers set`, which remain consumers).

## Success Criteria

- `oat sync --help` lists `--scope` as a local option; `oat config --help` does not.
- Every subcommand's `--help` shows a Global Options section with `--json`, `--verbose`, `--cwd`.
- `oat providers set --enabled <x>` succeeds without an explicit `--scope` flag.
- The five `--json` contract violations behave symmetrically with `--json`.
- A regression test asserts global-flag visibility and scope-on-consumers-only.
- Lint, type-check, tests, and `pnpm release:validate` pass.

## Out of Scope (deferred to a follow-up project)

- **P2** — `--dry-run` coverage on mutating commands, `docs init` dead dry-run removal, unifying `migrate` semantics.
- **P3** — exit-code corrections (`remove skills`, `pjm doctor`), logger-bypass routing, naming/description polish, `internal validate-*` status value, redundant local `--json` on `dispatch-ceiling resolve`.

These are real but separable; tracking them in a second quick project keeps this one bounded.

## References

- `references/audit.md` — full prioritized audit (P0–P3) and per-command matrix.
