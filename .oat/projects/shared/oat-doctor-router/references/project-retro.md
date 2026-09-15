---
oat_retro_project: oat-doctor-router
oat_retro_generated: 2026-09-15T12:54:03Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: session-transcript
    status: used
oat_retro_promotions: none
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: oat-doctor-router

## Executive Summary

The project rewrote `oat-doctor` as one sweep, report, and dive router and added a structured `deprecated` field to `oat config describe`. It shipped in PR #300 with CI, the release dry run, and Bugbot green. Implementation was fast. Closeout was slow: the implementation exit gate needed four attempts, all on one example that was never swept, and Bugbot then found five real defects. Future work should sweep every copy of a corrected prescription at the moment of the fix, and should verify anchor-based artifact edits by checking section headings afterward.

## Evidence and Review Method

- **Used:** `project-log.md` holds four structural gate receipts. The lifecycle artifacts read were `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, and `summary.md`. The six archived review artifacts under `reviews/archived/` were read. The local Claude Code session transcript for this run was used for operator corrections and the edit-script incident.
- **Unavailable:** `oat-execution-learnings.md` does not exist because this was not an autonomous run.
- Claims below are **confirmed** against committed artifacts or reproduced commands unless labelled otherwise.

## Outcome Snapshot

| Area         | Result                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| Scope        | 6 of 6 plan tasks across two phases                                                          |
| Skill        | `oat-doctor` 1.2.4 to 2.0.0, with a new contract test                                        |
| CLI          | `deprecated` on five catalog entries; lockstep 0.2.76                                        |
| Reviews      | 3 structured plan rounds; final code review; exit gate passed on attempt 4; 6 Bugbot threads |
| Verification | Live sweeps on this repo, `~/code/vox/pntr`, and a scratch repo                              |
| Lifecycle    | Docs synced; completed with archive while PR #300 open                                       |

## Current State

- **Promotions:** `none`. No apply items exist.
- **Filing:** `proposed`. RP-01, UP-01, and UP-02 are proposed.
- **Unsettled items:** RP-01, UP-01, and UP-02. Next action: file them with `oat-project-retro-file`.

## What Went Well

- **Sourcing from the CLI removed a drift class.** The doctor derives `pjm:*` ids from CLI source and projected fields from real output. The contract test caught a dropped id and a misspelled command when those were seeded.
- **Live verification corrected the design.** Running the sweep on three real repositories exposed the wrong adoption-state literals (`absent`/`partial`) before review did. Commit: `8d14eed63`.
- **Cross-family gating found real defects.** Every blocking finding from `cursor-gpt-5-6-sol-xhigh` was a genuine error, not noise.

## Challenges and Struggles

- **One refused command survived three gate attempts.** The CLI refuses `oat config unset activeProject`. Attempt 1 fixed the finding rule. Attempt 2 found the same form in the skill's report example. Attempt 3 found it in the design's canonical example. Each fix touched only the cited location. The response was a test that extracts the prescribed repairs from the skill and runs them in a scratch repository, plus a sweep of every project artifact. Attempt 4 passed. Evidence: `reviews/archived/final-review-2026-09-15T041753Z.md` through `…044732Z.md`.
- **Bugbot threads marked resolved were not fixed.** Three of five live defects sat in threads marked resolved. They were duplicate dispatch-matrix findings, duplicate PJM-adoption findings with disagreeing severity, and a projection parser that silently dropped sibling fields. That parser meant two sweep rows asserted only one field each. All were verified against code and fixed in `abb0887a7`.
- **An edit script silently erased implementation records.** While receiving the final code review, a Python script replaced scaffold sections by string index. Its last replacement searched for `## Final Summary (for PR/docs)`. The first match was inside the template's preamble blockquote, so the script replaced everything from the preamble to `## References`. That removed the progress table, task records, deviations, and test results it had just written. No test or review noticed, because the final summary text survived. The loss was found at completion when `implementation.md` read as truncated. It was rebuilt from the script body in the transcript, with rebased commit hashes, in `e4e275287`.
- **Cross-PR CI coupling.** PR #300 and PR #301 each failed CI on the other's pre-existing breakage. The fix was cherry-picking the test repin into #301, then rebasing #300 to 0.2.76 after #301 merged.

## Where We Changed Course

- **Plan exit gate.** Trigger: implementation finished before the plan gate ran. Direction: the operator skipped it and ran only the implementation exit gate. Outcome: gate passed on attempt 4.
- **Preset successor.** Trigger: Bugbot noted `providers.codex` covered one provider. Direction: supersede to `workflow.dispatchPolicy.policy`. Outcome: provider-neutral successor.
- **Explainer-kit test.** Trigger: a live-material fixture test kept `test:skills` red on main. Direction: the operator chose to remove the test in a separate worktree. Outcome: PR #301.

## Domain Learnings

- A CLI doctor that exits non-zero on warnings is still a successful probe. Parseable JSON on stdout is the success signal.
- Commander exits 0 for an unknown subcommand with `--help`. Probe command existence by the `Usage: oat <path>` line.
- A prescription repeated in a rule, a report example, and a design example is three copies. A fix to one is not a fix.

## Gotchas for Autonomous Agents

- After any scripted multi-section edit of a lifecycle artifact, list its `## ` headings and compare with the expected set before committing.
- Never anchor on a heading string without `^` and a line boundary. OAT templates quote their own headings in preamble prose.
- When a reviewer cites one location of a wrong command, grep every artifact for that command before replying.
- Treat a resolved review thread as a claim. Re-check the cited code.

## Repo Improvements (Promotion Register)

### RP-01: Stop the implementation template preamble from quoting a section heading

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

`.oat/templates/implementation.md` line 25 quotes `## Final Summary (for PR/docs)` inside its conventions blockquote. Any substring search for that heading hits the preamble first, which is exactly how this project lost four sections. Suggested direction: reword the preamble to "the Final Summary section", and add a template test asserting that no heading literal appears outside a heading line.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Skill scripts silently no-op when run through a symlinked skill directory

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Skill scripts guard `main()` with `import.meta.url === pathToFileURL(process.argv[1]).href`. Node resolves the symlink for `import.meta.url` but not for `argv[1]`. A script launched through `~/.claude/skills/<skill>`, a symlink into `~/.agents/skills`, exits 0 and prints nothing. Reproduced during this completion with `oat-project-complete/scripts/recover-completion-receipts.mjs --archive-preference true`. The symlinked path printed nothing and exited 0, while the resolved path printed the decision. Twelve `.agents/skills/*/scripts/*.mjs` files use the guard. The skills tell agents to set `SKILL_DIR` to the loaded directory, which is the symlinked one, so downstream parsers fail with confusing errors. Suggested direction: compare against `realpathSync(process.argv[1])`, and add a symlink invocation test.

### UP-02: Lightweight design section approvals are hard to read in structured prompts

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

During collaborative lightweight design, full section drafts were packed into structured-question prompts. The operator asked why the content was presented that way, whether the skill prose needed updating, and said the prompt was jumbled. The workaround was to present each section in chat and keep the structured question to one line. Suggested direction: the quick-start and lite design guidance should say to render section content as chat text and use the structured prompt only for the approve or revise choice.

## Reflections

The design was right and the implementation was small. Most of the effort went to making every copy of a fact agree: the rule and its examples, the design and the CLI's literals, a thread's resolved status and the code. The checks that finally held were executable. Tests ran the prescribed repairs, parsed the skill's own sweep table, and compared projections with real output. Artifact integrity had no such check, and a silent truncation went unnoticed through four gate attempts and the Bugbot review. Next time, verify heading structure after scripted artifact edits.
