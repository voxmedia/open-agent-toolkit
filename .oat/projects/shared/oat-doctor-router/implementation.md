---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-14
oat_current_task_id: null
oat_generated: false
---

# Implementation: oat-doctor-router

**Started:** 2026-09-14
**Last Updated:** 2026-09-14

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)

**What shipped:**

- `oat-doctor` 2.0.0: one read-only sweep over config, PJM, agent instructions, docs, and tools from seven projected CLI commands; a report grouped by area and severity; dives that teach from the bundled docs and `oat config describe` and offer exact fixes, with a single approved-command carve-out; `--summary` kept.
- `oat config describe`: a structured `deprecated` field (`supersededBy`, `note`, `legacyValues`) on the five deprecated keys, printed in plain output, pinned to the catalog's deprecation phrasings by test.

**Behavioral changes (user-facing):**

- Running `/oat-doctor` now reports PJM adoption problems, instruction-file drift and missing OAT guidance sections, undeclared docs surfaces, deprecated config values, and tool drift in one screen, and can explain any of them.
- `oat config describe <key>` prints a `Deprecated: prefer …` line for deprecated keys.

**Key files / modules:**

- `.agents/skills/oat-doctor/SKILL.md`, `tests/doctor-contract.test.mjs`
- `packages/cli/src/commands/config/index.ts` (`ConfigCatalogEntry.deprecated`), `packages/cli/src/config/oat-config.ts` (exported legacy table)
- `apps/oat-docs/docs/cli-utilities/{config-and-local-state,tool-packs}.md`

**Verification performed:** the full gate list at both phase boundaries with captured exit codes and a forced test run (`Cached: 0`); live sweeps on this repository, `~/code/vox/pntr`, and a scratch repository; contract-test negative controls; final code review received.

**Design deltas (if any):** see § Deviations.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`

### 2026-09-14 — Plan artifact review received (round 1, structured)

- 0 critical, 4 important, 8 medium, 5 minor — CHANGES REQUESTED. All 17 applied to `plan.md` (and the design where it was the stale copy), received inline: the `pjm:*` id set is derived from the CLI source at test time (21 ids incl. the nine remote checks), not pinned; every sweep call projects to named fields (`oat doctor --json` is ~410 KB raw); a command is failed only when its stdout is not JSON (both doctors exit 1 on a healthy repo); the read-only invariant is settled as a one-fix carve-out (run exactly the named command after explicit approval) and pinned in the contract test; five deprecated entries not six; the legacy table is exported under its own name and referenced, not copied; the group walk iterates every describe group; per-area finding rules enumerated in p02-t01; Error Handling rule 4 assigned; the contract test validates sweep commands against the built CLI and drops the self-pinning assertions; live verification reads the branch skill by absolute path and never installs at user scope; grep guards and docs anchors corrected; design `:118` path and phrase list aligned.

### 2026-09-14 — Plan artifact review received (round 2, structured)

- 0 critical, 4 important, 6 medium, 6 minor — CHANGES REQUESTED; every round-1 disposition verified closed. 15 applied: the command probe asserts the `Usage: oat <path>` line and named flags (Commander exits 0 for unknown subcommands) and covers every fix command the skill may run; the instructions rule uses the entry literal `content_mismatch`; `oat doctor` checks map to config/tools with `pjm:*` suppressed against `oat pjm doctor`; design and discovery aligned to the one-fix carve-out; design `:55` to five entries and the four-phrase matcher; the self-pinning assertion removed; a fourth file check for the two sync config files; `dispatch-matrix` adoption detected via `workflow.dispatchCeiling.recommendationVersion`; `oat pjm init` (no `--guidance`); rounds recorded in `## Reviews`; the 626 KB figure, the `:125` docs bullets, the run-time tools expectation, prefix heading matching, and Error Handling rule 2 assigned and pinned. Not applied: `oat_template: true` is the quick-start's interruption-safe pre-completion state (`oat-project-quick-start/SKILL.md:619-626`) and flips at Step 3.7.

### 2026-09-14 — Plan artifact review received (round 3, structured, final)

- 0 critical, 1 important, 5 medium, 4 minor — CHANGES REQUESTED on the Important only; every round-2 disposition verified closed. All 10 applied: the `oat doctor` check mapping is a semantic map (dispatch matrix and synced checkouts → config; manifest, providers, symlinks, codex, skill versions, pack state → tools; stale invocations → docs; anything else → info) in the plan and both design table rows; the live-verification expectation names every non-passing check and its area; the design's contract-test bullet no longer asks for the area/severity assertion; the three docs citations restored; the deprecation test claim softened to the catalog's phrasings; the Mode Assertion assertion specified as an exact command-stem set; docs lines `:126-127`; prefix-only citation rule; the stale `oat --scope all sync` invocation folded into p02-t03. Retry bound exhausted; plan marked complete.

## Live verification (p02-t04)

Run 2026-09-14 by the implementing agent following `.agents/skills/oat-doctor/SKILL.md` at this branch by absolute path, with the branch-built CLI (`packages/cli/dist/index.js`, 0.2.75) and `--cwd` pointing at each repository. Nothing was installed or synced at user scope. First screens as the skill's rules produce them from the projected sweep:

**This repository** (`.oat/config.json` documentation set, PJM `declared`)

```text
OAT ▸ DOCTOR
Config (2 warnings, 5 info)
  ⚠ project:synced_gate-execution-contract-hardening_checkout: synced checkout is absent   [oat doctor]
    → oat project pull .oat/projects/synced/gate-execution-contract-hardening
  ⚠ project:dispatch_matrix: dispatch matrix recommendation not adopted                     [oat doctor]
    → oat config adopt dispatch-matrix --shared
PJM (1 warning)
  ⚠ pjm:backlog_completed_unarchived                                                      [oat pjm doctor]
    → oat backlog archive <id> for each named item, then oat backlog regenerate-index
Agent instructions (1 warning)
  ⚠ AGENTS.md has no "## Tool Packs" section although packs are installed at project scope   [AGENTS.md]
    → oat tools install <pack> --project-guidance   (this repo carries a hand-written skills block instead)
Docs (ok)
Tools (8 warnings)
  ⚠ 5 outdated at user scope (explainer-kit, oat-doctor, oat-project-complete, oat-project-review-receive, oat-reviewer)
    → oat tools update --scope user
  ⚠ project:pack_state, user:pack_state, packs:scope_duplication                            [oat doctor]
    → oat tools migrate --pack <pack> --from project --to user
Where do you want to dive? [config / pjm / instructions / tools / all / done]
```

Both `oat doctor` and `oat pjm doctor` exited 1 and were parsed as findings, as the sweep rule requires. Every `project:*` warning landed in the area the semantic map assigns; none fell into config by prefix.

**`~/code/vox/pntr`** (root `docs/`, no `documentation` config, PJM `partial-initialization`)

```text
OAT ▸ DOCTOR
Config (2 warnings, 6 info)
  ⚠ project:synced_gitignore   → see message; ⚠ project:dispatch_matrix → oat config adopt dispatch-matrix --shared
PJM (3 errors, 2 warnings)
  ✖ adoption is partial-initialization: declared but canonical files are missing   → oat pjm init
  ✖ pjm:canonical_files   → oat pjm init
  ✖ pjm:backlog_terminal_in_items   → oat backlog archive <id> for each named item
  ⚠ pjm:top_level_layout   → move the unknown top-level entries (backlog-lifecycle.md § Catching lifecycle drift)
  ⚠ pjm:backlog_completed_unarchived   → oat backlog archive <id>, then oat backlog regenerate-index
Agent instructions (2 warnings)
  ⚠ AGENTS.md has no "### Project Management" / "### Decision Records" although PJM is declared   → oat pjm init
Docs (1 warning)
  ⚠ docs/ exists but .oat/config.json has no documentation section   → run oat-docs-bootstrap; it detects the surface and offers the audit
Tools (66 warnings)
  ⚠ 62 outdated at project scope, 5 at user scope   → oat tools update --scope project
  ⚠ project:skill_versions, project:pack_state, user:pack_state, packs:scope_duplication
Where do you want to dive? [config / pjm / instructions / docs / tools / all / done]
```

Read-only: nothing in that repository was changed. The docs warning is the case `BL-260911-make-docs-bootstrap-a-front` exists for.

**Scratch repository** (`git init` under `mktemp -d`, no `.oat/`)

```text
OAT ▸ DOCTOR
Config (1 warning, 9 info)
  ⚠ project:dispatch_matrix   → oat config adopt dispatch-matrix --shared
PJM (1 error)
  ✖ adoption is none: PJM is not adopted here   → oat pjm init
Agent instructions (ok)   (no instruction files scanned; no packs at project scope, so no heading rule fires)
Docs (1 info)
  ℹ no docs surface and no documentation config   → run oat-docs-bootstrap to set one up
Tools (4 warnings)
  ⚠ project:canonical_directories, project:manifest, project:providers: no OAT project setup   → oat init, then oat tools install <pack>
  ⚠ user:pack_state; 5 outdated at user scope   → oat tools update --scope user
Where do you want to dive? [config / pjm / docs / tools / all / done]
```

Every area offers its bootstrap. With `OAT_NON_INTERACTIVE=1` the same run ends after the report line above the prompt; no `AskUserQuestion` is issued and no fix is run.

Corrections made during verification: the CLI's adoption states are `declared`, `inferred-legacy`, `partial-initialization`, `none` (`packages/cli/src/commands/pjm/adoption.ts:8`), not the `absent`/`partial` the design assumed; the PJM rule and dive now use the CLI's literals.

Pre-existing failures on `origin/main` observed at the Phase 1 gate, not caused by this project: (1) `review-skill-contracts.test.ts` pinned the old literal guard path after #299 switched `oat-project-complete` to `"$RECAP_TERMINAL_GUARD"` — repinned in this branch (`4e4a47480`) because it kept every PR's CI red; (2) `.agents/skills/explainer-kit/tests/flow.e2e.test.mjs` "real program material passes …" fails `ledgerToPage` (`cohesion-claim-unobserved` for `numericClaims.wave-1` … `wave-4`): the authored fixture page no longer observes the live program material's wave numbers — the recap project's own test drifting against real inputs; left for a follow-up item.

### 2026-09-15 — Final code review received

- `code-final-review-2026-09-15T034718Z.md` (head `6540d08f9`): 0 critical, 2 important, 3 medium, 3 minor — CHANGES REQUESTED. All 8 applied (`resolve_in_artifact` / fixed in code), received inline: the docs sentence at `config-and-local-state.md:284` keeps the stale `oat --scope all sync` example as an illustration with the `allow-stale-invocation` marker the doctor honors (the p02-t03 "fix" had made the sentence call the current form stale); `implementation.md` filled from the scaffold (progress, per-task records, deviations, test results, final summary); the design's adoption literals corrected to the CLI's four; a projection-fields contract test runs every sweep command against the built CLI and asserts each projected field exists; the `pjm:*` harvest regex widened and the docs-page existence asserted; the pack-manifest guard matches list and table tokens, not only trailing commas; the docs-surface check lists `apps/docs`, `apps/*-docs`, and `documentation/` as bootstrap's preflight does; `BL-260915-re-author-the-explainer-kit` filed for the pre-existing `explainer-kit` fixture drift that keeps `pnpm test:skills` red on `origin/main`.

### 2026-09-15 — Configured implementation exit gate, attempt 1 (cross-family, `cursor-gpt-5-6-sol-xhigh`)

- `reviews/final-review-2026-09-15T041753Z.md` (reviewed head `14e315152`): 0 critical, 3 important, 2 medium, 2 minor — blocked at threshold `important`. Received inline. All 7 applied: the stale-pointer repair is `oat config set activeProject ''` / `lastPausedProject ''` (the CLI refuses `unset` for those keys; `unset` kept for `activeIdea`) with a contract test that executes the repairs in a scratch repo and a negative control on the refused form; the projection test treats an empty array as a valid source (CI has no outdated tools) and checks per-item fields only when items exist; a docs `info` finding offers `oat-docs-bootstrap` when no surface and no config exist, so an empty repository offers every area's bootstrap (scratch transcript corrected); `state.md` body aligned with its frontmatter; discovery and design corrected to five entries, four file checks, and the CLI's adoption states; bare docs-page citations asserted to exist; `BL-260915`'s placeholder criteria replaced (closed by PR #301). The quick-start plan exit gate was not run: the operator declined it after implementation had already completed.
