# OAT CLI — Help & Flag Coverage Audit

**Date:** 2026-06-27
**Scope:** All `oat` CLI commands (107 commands: 81 leaf, 26 groups), commander.js v12
**Method:** Programmatic command-tree walk (structural facts) + three parallel subagent audits (qualitative: scope consumption, `--json`/`--dry-run` contracts, naming/exit-code consistency).

---

## TL;DR

The reported bug — `oat sync --help` not mentioning `--scope` — is one symptom of a **systemic help-visibility gap**: `--json`, `--verbose`, `--scope`, and `--cwd` are all defined as _global_ options on the root program (`packages/cli/src/app/create-program.ts:14-21`), and Commander hides parent options from subcommand help because `showGlobalOptions` is never enabled. So **none of the four global flags appear in any of the 107 subcommands' `--help`.**

Beyond that, the audit surfaced a deeper design issue (`--scope` is global but consumed by only ~1/3 of commands), one **broken-by-default command**, and a cluster of `--json`/`--dry-run` contract violations.

### What is NOT a problem (verified clean)

- **Command descriptions:** 107/107 present.
- **Option descriptions:** 0 options missing description text.

So the audit is about _correctness and contract consistency of flags_, not missing help text.

---

## Findings by priority

### P0 — Broken behavior

| ID       | Command             | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P0-1** | `oat providers set` | **Broken on its default invocation.** Handler throws unless `scope === 'project'` (`providers/set/index.ts:106-108`), but the global `--scope` defaults to `all` (`command-context.ts`). So bare `oat providers set --enabled <x>` errors. The error tells users to "Re-run with `--scope project`" (`providers/set/index.ts:25-26`) — a flag that does **not** appear in `oat providers set --help`. Directly caused by the scope + help-visibility issues below. |

### P1 — Systemic / discoverability

| ID       | Area                                             | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1-1** | Help visibility                                  | No `showGlobalOptions` on the root program → `--json`, `--verbose`, `--scope`, `--cwd` are invisible in all 107 subcommands' `--help`. This is the root cause of the original `oat sync --help` report.                                                                                                                                                                                                                                                             |
| **P1-2** | `--scope` design                                 | `--scope` is global but only **consumed** by a subset of commands (the provider-sync core: `sync`, `status`, `doctor`, most `init tools`/`tools install` packs, `tools list/outdated/info/update/remove`, `providers *`, `remove skill/skills`). **~80 commands silently accept and ignore `--scope`** ("FALSE-ACCEPT"). E.g. `oat config set --scope user`, `oat project list --scope user`, `oat docs init --scope project` all accept the flag with zero effect. |
| **P1-3** | `--scope` FALSE-ACCEPT inside scope-aware groups | Even within scope-aware areas, some leaves hardcode their scope and ignore `--scope`: `init tools core` (hardcodes `user`, `core/index.ts:76`), `init tools project-management` (hardcodes `project`), `instructions validate` / `instructions sync` (project-only via `resolveProjectRoot`). Misleading because sibling packs honor `--scope`.                                                                                                                     |

### P1 — `--json` contract violations (non-interactive/JSON is a documented contract)

| ID       | Command                              | Issue                                                                                                                                                                                    |
| -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1-4** | `project validate-plan`              | Never emits JSON even with `--json` (only `logger.error/success/info`). `validate-plan/index.ts:24-61`.                                                                                  |
| **P1-5** | `project split run`                  | Mutating command; never emits JSON even with `--json`. `split/run.ts`.                                                                                                                   |
| **P1-6** | `project split evaluate-signals`     | Emits JSON **unconditionally** (ignores `--json`; `logger.json()` always writes stdout). `split/evaluate-signals.ts:62`.                                                                 |
| **P1-7** | `project split validate-plan`        | Emits JSON **unconditionally** (opposite violation from P1-4). `split/validate-plan.ts:87`.                                                                                              |
| **P1-8** | `repo pr-comments triage-collection` | Cannot be automated: throws `CliError` whenever non-interactive, and `--json` _forces_ non-interactive — so the `--json` output block is unreachable. `triage-comments.ts:51-55,95-104`. |

### P2 — `--dry-run` contract (mutate-by-default + `--dry-run` opt-in)

| ID       | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P2-1** | **Mutating commands with no dry-run path at all:** `init`, all 8 `init tools <pack>` / `tools install <pack>`, `providers set`, `docs generate-index`, `docs nav sync`, `config set`, `local sync`, `local add`, `local remove`, `repo pr-comments collect`, `index init`, `project new`, `project open`, `project pause`, `project complete-discovery`, `project complete-state`, `project split run`, `state refresh`, `pjm init`, `backlog init`, `backlog regenerate-index`, `decision init`, `decision regenerate-index`, `decision new`. (Scaffolders/regenerators are mostly idempotent skip-existing → lower risk; live-state mutators like `project open/pause/complete-*` and `state refresh` are higher risk.) |
| **P2-2** | **`docs init` has unreachable/dead dry-run logic.** `runDocsInit` threads `dryRun: context.dryRun` and renders a dry-run preview branch (`docs/.../init/index.ts:102-175`), but no `--dry-run` flag is registered (global or local), so `context.dryRun` is always `false` and `oat docs init --dry-run` errors "unknown option". Misleading on a heavily mutating command.                                                                                                                                                                                                                                                                                                                                               |
| **P2-3** | **Inverted `--dry-run` semantics across sibling `migrate` commands.** `pjm migrate` and `docs migrate` are **dry-run-by-default** with opt-in `--apply` (`pjm/index.ts:269`, `docs/.../migrate/index.ts:213`), while `decision migrate` **mutates by default** with `--dry-run` to preview (`decision/index.ts:247`). Pick one convention; the repo contract is mutate-by-default.                                                                                                                                                                                                                                                                                                                                        |

### P3 — Exit codes, logger bypass, naming polish

| ID       | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P3-1** | `remove skills` returns exit **2** (system error) for a user error — invalid `--pack` value (`remove-skills.ts:91,153`). Should be exit 1. Sibling `remove skill` does this correctly.                                                                                                                                                                                                                                                                                                                                       |
| **P3-2** | `pjm doctor` maps diagnostic `fail`→exit 2, `warn`→exit 1 (`pjm/index.ts:86-89`). A failed health check is closer to exit 1 (actionable) than 2 (system/runtime). Debatable.                                                                                                                                                                                                                                                                                                                                                 |
| **P3-3** | Logger bypass via `process.stderr.write`: `project archive sync` deprecation banner (`archive/index.ts:86-88`, also emits under `--json`) and `repo pr-comments triage-collection` summary (`triage-comments.ts:107-118`). Route through `context.logger`.                                                                                                                                                                                                                                                                   |
| **P3-4** | `internal validate-*` emit a third JSON status `'failed'` (`validate-oat-skills.ts:33`, `validate-skill-version-bumps.ts:34`) vs the `ok`/`error` convention elsewhere. Exit codes are correct.                                                                                                                                                                                                                                                                                                                              |
| **P3-5** | Naming/description mismatches: `providers` group description "Inspect provider capabilities and paths" omits the mutating `set` subcommand (`providers/index.ts:18`); `project new --force` described as "Non-destructive scaffold; create missing files only" — `--force` fights its own description (`new/index.ts:140`); `local sync --from` is a boolean toggle that reads like a value flag (`local/index.ts:155`); `docs analyze` / `docs apply` are no-op stubs described as "Run the docs … workflow" (overpromise). |
| **P3-6** | `project dispatch-ceiling resolve` declares a redundant local `--json` OR-merged with the global flag (`dispatch-ceiling/index.ts:621,626`) — the only command that locally advertises `--json`. Inconsistent; resolve once `showGlobalOptions` is on.                                                                                                                                                                                                                                                                       |
| **P3-7** | Two distinct `validate-plan` leaves with the same name and contradictory `--json` behavior: `project validate-plan` (validates `plan.md`, never JSON) vs `project split validate-plan` (validates `split-plan.json`, always JSON). Confusing for users and scripts.                                                                                                                                                                                                                                                          |

---

## Recommended remediation (design decisions)

1. **Globals that are truly global → keep + advertise.** `--json`, `--verbose`, `--cwd` apply to every command. Enable `program.configureHelp({ showGlobalOptions: true })`. **Caveat:** verified empirically that `showGlobalOptions` only auto-propagates to subcommands added via `.command()`. This codebase registers **89/99** commands via `.addCommand()`, which does **not** inherit it — so the fix must recursively apply the help config to the whole command tree (e.g. a `applyHelpConfig(program)` walk after `registerCommands`).

2. **`--scope` is NOT truly global → demote to a per-command option.** Add `--scope` only to the commands that consume it (via a shared `withScopeOption(cmd)` helper for DRY + consistent choices/default). Result: `oat sync --help` shows `--scope` as a first-class local option; commands that ignore scope stop falsely advertising it. Fixes P0-1, P1-2, P1-3 together. Then resolve P1-3 leaves explicitly (either honor `--scope` or omit it and document the fixed scope).

3. **`--json` contract pass (P1-4…P1-8).** Make every command honor `--json` symmetrically: emit JSON iff `--json`, route human output through the logger, and give `triage-collection` a real non-interactive path.

4. **`--dry-run` contract pass (P2-1…P2-3).** Add `--dry-run` to higher-risk live-state mutators first; remove the dead dry-run in `docs init`; unify `migrate` semantics on mutate-by-default.

5. **Polish (P3).** Exit-code corrections, logger routing, naming/description fixes.

6. **Regression guard.** Add a help-snapshot/coverage test (the audit script logic) so global-flag visibility and `--scope` placement can't silently regress. Existing snapshots live in `packages/cli/src/commands/help-snapshots.test.ts`.

> Suggested phasing for the follow-up quick OAT project: **Phase 1** = P0 + P1 (help visibility + scope demotion + json contract) — this resolves the original report and the broken command. **Phase 2 (optional)** = P2 + P3 (dry-run/exit-code/naming cleanup).

---

## Appendix — per-leaf-command matrix

Legend — **Scope:** CONSUMES (honors `--scope`, should advertise it) / FALSE-ACCEPT (ignores `--scope`). **JSON:** ok / never (ignores `--json`) / always (ignores mode) / rejected. **Mut:** mutating. **DR:** dry-run present/absent/n-a.

### Provider-sync core

| Command                                                       | Scope                              | JSON | Mut | DR                           |
| ------------------------------------------------------------- | ---------------------------------- | ---- | --- | ---------------------------- |
| `sync`                                                        | CONSUMES                           | ok   | yes | present (local `--dry-run`)  |
| `status`                                                      | CONSUMES                           | ok   | no  | n-a                          |
| `init`                                                        | CONSUMES                           | ok   | yes | absent                       |
| `init tools core` / `tools install core`                      | FALSE-ACCEPT (hardcoded user)      | ok   | yes | absent                       |
| `init tools project-management`                               | FALSE-ACCEPT (hardcoded project)   | ok   | yes | absent                       |
| `init tools ideas/docs/workflows/utility/research/brainstorm` | CONSUMES                           | ok   | yes | absent                       |
| `tools list`                                                  | CONSUMES                           | ok   | no  | n-a                          |
| `tools outdated`                                              | CONSUMES                           | ok   | no  | n-a                          |
| `tools info`                                                  | CONSUMES                           | ok   | no  | n-a                          |
| `tools update`                                                | CONSUMES                           | ok   | yes | present                      |
| `tools remove`                                                | CONSUMES                           | ok   | yes | present                      |
| `providers list`                                              | CONSUMES                           | ok   | no  | n-a                          |
| `providers inspect`                                           | CONSUMES                           | ok   | no  | n-a                          |
| `providers set`                                               | CONSUMES (**P0-1 broken default**) | ok   | yes | absent                       |
| `remove skill`                                                | CONSUMES                           | ok   | yes | present                      |
| `remove skills`                                               | CONSUMES                           | ok   | yes | present (**exit-code P3-1**) |
| `doctor`                                                      | CONSUMES                           | ok   | no  | n-a                          |
| `instructions validate`                                       | FALSE-ACCEPT (project-only)        | ok   | no  | n-a                          |
| `instructions sync`                                           | FALSE-ACCEPT (project-only)        | ok   | yes | present                      |

### Project / PJM lifecycle

| Command                            | Scope        | JSON                               | Mut                   | DR                                       |
| ---------------------------------- | ------------ | ---------------------------------- | --------------------- | ---------------------------------------- |
| `project archive sync`             | FALSE-ACCEPT | ok                                 | yes                   | present (logger bypass P3-3, deprecated) |
| `project complete-discovery`       | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `project complete-state`           | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `project dispatch-ceiling resolve` | FALSE-ACCEPT | ok (redundant local `--json` P3-6) | no                    | n-a                                      |
| `project list`                     | FALSE-ACCEPT | ok                                 | no                    | n-a                                      |
| `project new`                      | FALSE-ACCEPT | ok                                 | yes                   | absent (naming P3-5)                     |
| `project open`                     | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `project pause`                    | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `project set-mode`                 | FALSE-ACCEPT | ok                                 | no (deprecated no-op) | n-a                                      |
| `project split evaluate-signals`   | FALSE-ACCEPT | always (P1-6)                      | no                    | n-a                                      |
| `project split validate-plan`      | FALSE-ACCEPT | always (P1-7)                      | no                    | n-a                                      |
| `project split run`                | FALSE-ACCEPT | never (P1-5)                       | yes                   | absent                                   |
| `project status`                   | FALSE-ACCEPT | ok                                 | no                    | n-a                                      |
| `project validate-plan`            | FALSE-ACCEPT | never (P1-4)                       | no                    | n-a                                      |
| `pjm init`                         | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `pjm doctor`                       | FALSE-ACCEPT | ok                                 | no                    | n-a (exit map P3-2)                      |
| `pjm migrate`                      | FALSE-ACCEPT | ok                                 | yes (`--apply`)       | inverted (P2-3)                          |
| `backlog init`                     | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `backlog regenerate-index`         | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `backlog generate-id`              | FALSE-ACCEPT | ok                                 | no                    | n-a                                      |
| `decision init`                    | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `decision regenerate-index`        | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `decision new`                     | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `decision migrate`                 | FALSE-ACCEPT | ok                                 | yes                   | present (mutate-by-default)              |
| `state refresh`                    | FALSE-ACCEPT | ok                                 | yes                   | absent                                   |
| `review latest`                    | FALSE-ACCEPT | ok                                 | no                    | n-a                                      |
| `cleanup project`                  | FALSE-ACCEPT | ok                                 | yes                   | present                                  |
| `cleanup artifacts`                | FALSE-ACCEPT | ok                                 | yes                   | present                                  |

### Docs / config / local / repo / index / internal

| Command                                 | Scope        | JSON                      | Mut             | DR                   |
| --------------------------------------- | ------------ | ------------------------- | --------------- | -------------------- |
| `docs analyze`                          | FALSE-ACCEPT | ok                        | no (stub P3-5)  | n-a                  |
| `docs apply`                            | FALSE-ACCEPT | ok                        | no (stub P3-5)  | n-a                  |
| `docs generate-index`                   | FALSE-ACCEPT | ok                        | yes             | absent               |
| `docs init`                             | FALSE-ACCEPT | ok                        | yes             | dead code (P2-2)     |
| `docs migrate`                          | FALSE-ACCEPT | ok                        | yes (`--apply`) | inverted (P2-3)      |
| `docs nav sync`                         | FALSE-ACCEPT | ok                        | yes             | absent               |
| `config get/list/dump/describe`         | FALSE-ACCEPT | ok                        | no              | n-a                  |
| `config set`                            | FALSE-ACCEPT | ok                        | yes             | absent               |
| `local status`                          | FALSE-ACCEPT | ok                        | no              | n-a                  |
| `local apply`                           | FALSE-ACCEPT | ok                        | yes             | present              |
| `local sync`                            | FALSE-ACCEPT | ok                        | yes             | absent (naming P3-5) |
| `local add`                             | FALSE-ACCEPT | ok                        | yes             | absent               |
| `local remove`                          | FALSE-ACCEPT | ok                        | yes             | absent               |
| `repo archive sync`                     | FALSE-ACCEPT | ok                        | yes             | present              |
| `repo pr-comments collect`              | FALSE-ACCEPT | ok                        | yes             | absent               |
| `repo pr-comments triage-collection`    | FALSE-ACCEPT | rejected (P1-8)           | yes             | absent               |
| `index init`                            | FALSE-ACCEPT | ok                        | yes             | absent               |
| `internal validate-oat-skills`          | FALSE-ACCEPT | ok (`failed` status P3-4) | no              | n-a                  |
| `internal validate-skill-version-bumps` | FALSE-ACCEPT | ok (`failed` status P3-4) | no              | n-a                  |
