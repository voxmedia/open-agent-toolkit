---
oat_wrap_up: true
oat_generated: true
window_since: 2026-05-01
window_until: 2026-05-27
window_label: custom
generated_at: 2026-05-27T22:17:32Z
---

# Wrap-up: 2026-05-01 to 2026-05-27

## TL;DR

May was a heavy month for OAT's dispatch and orchestration story: two consecutive projects ([subagent-model-selection](#shipped-via-oat-projects) and [dispatch-ceiling](#shipped-via-oat-projects)) reshaped how phase subagents pick model and effort across Claude and Codex, ending in a provider-aware ceiling resolved by a new CLI surface. Workflow surface grew too — a new always-on `oat-brainstorm` skill plus brainstorm pack, a codified [oat-project-split](#shipped-via-oat-projects) escape hatch for oversized discoveries, and a per-directory `AGENTS.md` nesting rubric. Skill state reads migrated off `grep | awk` onto the `oat project status` JSON contract, and a focused fix project closed the lingering issue of sync-generated provider state leaking into unrelated commits.

## Features Introduced

- **Project-independent brainstorming.** New `oat-brainstorm` skill ships in a dedicated `brainstorm` tool pack (user-default-scope). Activates on explicit brainstorm phrasing, runs a structured design conversation without requiring an idea or active project, and ends in a pack-aware terminal-state picker with 9 destination families — inline, doc-to-path, ideas-pack capture/extend/summarize, scoped backlog item, promote-to-new-project, and active-project fold-back with commit safety. Includes a ported MIT-licensed visual companion (`scripts/server.cjs`, frame template, helper). PRs [#70](https://github.com/voxmedia/open-agent-toolkit/pull/70), [#71](https://github.com/voxmedia/open-agent-toolkit/pull/71).
- **Runtime dispatch selection contract.** `oat-project-implement` now records per-phase `model_axis` and `effort_axis` state (`selected:<value>` / `inherited` / `not-applicable` / `host-auto`) with a `Rationale` field, replacing the precomputed-caps approach that depended on a value the orchestrator can't authoritatively read. Claude Code dispatch selects model and marks effort `not-applicable`; Codex dispatch uses effort-pinned implementer role variants. PR [#79](https://github.com/voxmedia/open-agent-toolkit/pull/79).
- **Provider-aware dispatch ceilings.** Configuration gained `workflow.dispatchCeiling.codex` (`low|medium|high|xhigh`) and `workflow.dispatchCeiling.claude` (`haiku|sonnet|opus`) across shared/local/user surfaces, plus `oat_dispatch_ceiling` frontmatter on project state. Generated Codex now ships pinned variants — `oat-phase-implementer-{low,medium,high,xhigh}` and `oat-reviewer-{low,medium,high,xhigh}` — handled as managed roles, not adoptable strays. PR [#89](https://github.com/voxmedia/open-agent-toolkit/pull/89).
- **Project-splitting workflow.** New `oat-project-split` workflow turns oversized discoveries or brainstorms into a coordination parent with focused child projects. Parents carry `oat_kind: coordination` with no executable artifacts; children are flat siblings with inherited-context revalidation requirements. Detection hooks added to `oat-project-discover` and `oat-brainstorm` for declared, mid-stream, and convergence-time splits. PR [#88](https://github.com/voxmedia/open-agent-toolkit/pull/88).
- **End-of-lifecycle skills made model-invokable.** `oat-project-document`, `oat-project-pr-final`, `oat-project-summary`, `oat-pjm-add-backlog-item`, and `oat-pjm-update-repo-reference` now activate without requiring explicit user invocation, with guardrails preventing auto-trigger on phase completion. PR [#71](https://github.com/voxmedia/open-agent-toolkit/pull/71).

## Bug Fixes

- **Sync-generated state stops leaking into unrelated commits.** `oat-worktree-bootstrap-auto` now checks inherited cleanliness before its all-scope sync sweep, computes the concrete staged file list from sync-managed paths (`.oat/sync/manifest.json`, `.claude`, `.cursor`, `.codex`), and commits only those — preserving unrelated already-staged work. `oat-project-new`, `oat-project-quick-start`, and `oat-project-import-plan` gained inherited-git-state preflight with a Commit-now / Proceed-anyway / Abort prompt. PR [#81](https://github.com/voxmedia/open-agent-toolkit/pull/81).
- **AGENTS.md nesting recommendations no longer gated on file count.** The `oat-agent-instructions-analyze` directory-assessment rubric was rewritten to drop the "50 source files" gate entirely: nested instruction-file candidates are now driven by distinct domain conventions at every directory depth, with an explicit anti-sprawl guard for large-but-homogeneous directories. PR [#86](https://github.com/voxmedia/open-agent-toolkit/pull/86).
- **S3 archive repo slug resolves correctly on worktrees.** Archive sync inside a git worktree previously misderived the repo slug; now uses git common-dir to find the canonical origin. PR [#69](https://github.com/voxmedia/open-agent-toolkit/pull/69).
- **`archive.awsProfile` config takes precedence over shell `AWS_PROFILE`.** Config-declared profile is now authoritative for archive sync and project-complete uploads — matching the documented contract. PRs [#72](https://github.com/voxmedia/open-agent-toolkit/pull/72), [#75](https://github.com/voxmedia/open-agent-toolkit/pull/75).
- **`oat sync` emits single-quoted YAML frontmatter.** Frontmatter values no longer ambiguously parse as numbers/booleans/dates downstream. PR [#84](https://github.com/voxmedia/open-agent-toolkit/pull/84).
- **Provider stray detection respects gitignored entries.** Stray scans no longer flag files that are correctly gitignored by the provider — eliminates false-positive cleanup prompts. PR [#91](https://github.com/voxmedia/open-agent-toolkit/pull/91).
- **Generated OAT dashboard untracked.** The auto-regenerated dashboard markdown was being committed accidentally; it's now ignored and recomputed on demand. PR [#92](https://github.com/voxmedia/open-agent-toolkit/pull/92).
- **Autonomous worktree bootstrap invocation allowed.** `oat-worktree-bootstrap-auto` was blocked from model invocation despite being designed for it. PR [#85](https://github.com/voxmedia/open-agent-toolkit/pull/85).

## New User-Facing Capabilities

- **`/oat-brainstorm` (or "let's brainstorm X")** — Always-on brainstorm skill in the new `brainstorm` pack. Install via `oat init tools` (default-on in guided setup) or `oat init tools --pack brainstorm`. Configure via `tools.brainstorm` in `.oat/config.json`. The skill ends in a destination picker — pick `inline`, `doc-to-path`, `capture-as-new-idea`, `extend-existing-idea`, `summarize-idea-directly`, `scoped-backlog-item`, `promote-to-new-OAT-project`, or `active-project` fold-back. Visual companion auto-starts only for visual-likely topics. (PRs #70, #71)
- **`oat project split` subcommands** — `evaluate-signals`, `validate-plan`, and `run` operate on `references/split-plan.json` to turn a parent project into a coordination decomposition. Default `oat project list` hides completed coordination parents; pass `--include-coordination` to see them. Internal phase name `decomposition`, user-facing language `split`. (PR #88)
- **`oat project dispatch-ceiling resolve`** — Compiled resolver that reports the active dispatch ceiling, source (config / project state / unset), Codex provider-default effort, and non-interactive blocking status. Pass `--preflight --json` for an interactive-capable orchestrator (returns `status: "unresolved"`); pass `--non-interactive` or set `OAT_NON_INTERACTIVE=1` to fail before implementation work starts when ceiling is unresolved. (PR #89)
- **`oat project status --field <name>` / `--shell` / `--project-path <path>`** — Canonical project-state read pattern for skills. `--field` returns one scalar; `--shell` emits `KEY=value` lines (shell-safe quoting); `--project-path` accepts absolute paths without requiring a git checkout. The `--field` + `--shell` combination is now explicitly rejected with a clear error. (PR #65, available since the skill-cli-migration ship)
- **`workflow.dispatchCeiling.{codex,claude}` config keys** — Set via `oat config set workflow.dispatchCeiling.codex high` (or per-project via `oat_dispatch_ceiling: high` in project state frontmatter). Caps preferred Codex effort and Claude model-tier for OAT subagent dispatch. (PR #89)

## Shipped via OAT Projects

| Project                           | Window date | PR(s)                                                                                                                        | Outcome                                                                                                                                                    |
| --------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| skill-cli-migration               | 2026-05-01  | [#65](https://github.com/voxmedia/open-agent-toolkit/pull/65)                                                                | Skills migrated off `grep                                                                                                                                  | awk`state reads onto`oat project status --field/--shell/--project-path` JSON contract |
| independent-brainstorming         | 2026-05-07  | [#70](https://github.com/voxmedia/open-agent-toolkit/pull/70), [#71](https://github.com/voxmedia/open-agent-toolkit/pull/71) | New `oat-brainstorm` skill + brainstorm tool pack + 9-destination terminal picker + ported visual companion                                                |
| oat-sync-manifest-commit          | 2026-05-17  | [#81](https://github.com/voxmedia/open-agent-toolkit/pull/81)                                                                | Sync-generated provider state contained at bootstrap; project-entry preflight added                                                                        |
| subagent-model-selection          | 2026-05-18  | [#79](https://github.com/voxmedia/open-agent-toolkit/pull/79)                                                                | Two-axis (`model_axis`, `effort_axis`) runtime dispatch contract with structured `OAT Dispatch` log blocks; 8 revisions tightening the Codex effort wiring |
| agent-instructions-nesting-rubric | 2026-05-18  | [#86](https://github.com/voxmedia/open-agent-toolkit/pull/86)                                                                | Nesting rubric for AGENTS.md driven by distinct conventions, not file count                                                                                |
| oat-project-split                 | 2026-05-22  | [#88](https://github.com/voxmedia/open-agent-toolkit/pull/88)                                                                | Codified split workflow: coordination parent + flat-sibling children + resume via `references/split-plan.json`                                             |
| dispatch-ceiling                  | 2026-05-25  | [#89](https://github.com/voxmedia/open-agent-toolkit/pull/89)                                                                | Provider-aware OAT-authoritative ceiling; pinned Codex implementer/reviewer effort variants; new `oat project dispatch-ceiling resolve` CLI                |

## Other Merged PRs

| #                                                             | Date       | Author  | Title                                                                                        |
| ------------------------------------------------------------- | ---------- | ------- | -------------------------------------------------------------------------------------------- |
| [#69](https://github.com/voxmedia/open-agent-toolkit/pull/69) | 2026-05-02 | tkstang | fix: correctly resolve S3 archive repo slug on worktrees                                     |
| [#72](https://github.com/voxmedia/open-agent-toolkit/pull/72) | 2026-05-04 | tkstang | fix: prefer archive.awsProfile config over shell AWS_PROFILE                                 |
| [#73](https://github.com/voxmedia/open-agent-toolkit/pull/73) | 2026-05-04 | tkstang | fix: rules fix for Copilot always-on rule activation                                         |
| [#74](https://github.com/voxmedia/open-agent-toolkit/pull/74) | 2026-05-07 | tkstang | docs(skills): require ID + title in backlog-review output                                    |
| [#75](https://github.com/voxmedia/open-agent-toolkit/pull/75) | 2026-05-08 | tkstang | fix(skills): honor archive.awsProfile/awsRegion in oat-project-complete                      |
| [#76](https://github.com/voxmedia/open-agent-toolkit/pull/76) | 2026-05-08 | tkstang | fix(skills): refresh repo dashboard during implement bookkeeping                             |
| [#77](https://github.com/voxmedia/open-agent-toolkit/pull/77) | 2026-05-11 | tkstang | fix(skills): rewrite open-PR description after archive + stop defaulting to oat-project-spec |
| [#78](https://github.com/voxmedia/open-agent-toolkit/pull/78) | 2026-05-13 | tkstang | Add subagent capability guidance to skill creators                                           |
| [#80](https://github.com/voxmedia/open-agent-toolkit/pull/80) | 2026-05-14 | tkstang | feat(cli): backfill OAT state gitignore                                                      |
| [#82](https://github.com/voxmedia/open-agent-toolkit/pull/82) | 2026-05-18 | tkstang | docs: regenerate repo knowledge base                                                         |
| [#83](https://github.com/voxmedia/open-agent-toolkit/pull/83) | 2026-05-18 | tkstang | chore: update agent instruction files                                                        |
| [#84](https://github.com/voxmedia/open-agent-toolkit/pull/84) | 2026-05-18 | tkstang | fix(cli): emit single-quoted YAML frontmatter from oat sync                                  |
| [#85](https://github.com/voxmedia/open-agent-toolkit/pull/85) | 2026-05-18 | tkstang | fix(skills): allow autonomous worktree bootstrap invocation                                  |
| [#87](https://github.com/voxmedia/open-agent-toolkit/pull/87) | 2026-05-21 | tkstang | fix: update codex inherited effort ceiling dispatch                                          |
| [#90](https://github.com/voxmedia/open-agent-toolkit/pull/90) | 2026-05-25 | tkstang | feat: capture accepted design drift in OAT lifecycle artifacts                               |
| [#91](https://github.com/voxmedia/open-agent-toolkit/pull/91) | 2026-05-25 | tkstang | fix: handle gitignored provider stray status                                                 |
| [#92](https://github.com/voxmedia/open-agent-toolkit/pull/92) | 2026-05-25 | tkstang | refactor: untrack generated OAT dashboard                                                    |

## Open Follow-ups

- **`bl-7d5b`** — Live dogfood for `oat-brainstorm` (fold-back commit safety + 9 destination families). Walkthrough plans embedded; user planned manual dogfood via vault-copied reference before merging.
- **`bl-f19a`** — Strict-YAML validation in `oat:validate-skills`. Validator currently checks length and lead-word but doesn't parse YAML; a bare colon mid-scalar shipped despite breaking downstream consumers.
- **`PACK_METADATA` consolidation** — ADR-017 notes `core`'s always-user-scope special-case is a candidate for folding into the new generalized metadata mechanism. Out of scope for `bl-53f0`.
- **`oat project split validate-plan` resume mode** — Currently rejects persisted split plans after parent/children already exist; needs a `--for-resume` or `--allow-existing` flag for resume ergonomics.
- **Active detected-parent split conversion logging** — Works correctly but doesn't log the conversion intent clearly before running the existing-parent path.
- **Compile more prompt-only dispatch contracts** — Continue moving dispatch rules from skill prompt text into compiled CLI surfaces where it reduces orchestrator duplication.
- **Codex reviewer variant spawn metadata** — Watch dogfood for whether Codex consistently exposes generated reviewer variants; base reviewer remains a provider-default fallback only.
- **Plan-artifact polish for `skill-cli-migration` p04-t02** — Stale PATH-trim example deferred; implementation evidence records the corrected fallback run.
- **Tracked-but-ignored asset hygiene** — `packages/cli/assets/` contains tracked files under an ignored path; deferred as a separate asset-tracking decision.
- **`oat-agent-instructions-analyze` rubric polish** — Residual "starting at depth 1–2" phrasing in `directory-assessment-criteria.md`; assessed as coherent with the every-depth model, optional polish.

## Included Summaries (Provenance)

- `.oat/repo/reference/project-summaries/20260501-skill-cli-migration.md`
- `.oat/projects/archived/independent-brainstorming/summary.md`
- `.oat/projects/archived/oat-sync-manifest-commit/summary.md`
- `.oat/projects/archived/agent-instructions-nesting-rubric/summary.md`
- `.oat/projects/archived/subagent-model-selection/summary.md`
- `.oat/projects/archived/oat-project-split/summary.md`
- `.oat/projects/archived/dispatch-ceiling/summary.md`
