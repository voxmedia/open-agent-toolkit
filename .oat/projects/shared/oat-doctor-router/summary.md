---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-15
oat_generated: true
oat_template: false
oat_summary_last_task: p02-t04
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: oat-doctor-router

## Overview

`BL-260911-make-oat-doctor` asked for one place where a person learns what is wrong with their OAT setup: PJM that was never initialized or has drifted, root agent instructions missing the OAT sections, undeclared docs, legacy config values, and outdated tools. The old `oat-doctor` only printed a dashboard. It also carried an eleven-key fallback description list and a hand-maintained pack manifest, and both drifted from the CLI.

## What Was Implemented

- **`oat-doctor` 2.0.0 is a sweep, report, and dive router.** One read-only sweep runs seven CLI commands with projected fields, plus four file checks. It produces a single report grouped into five areas: config, PJM, agent instructions, docs, and tools. Each finding carries a severity, evidence, and an exact fix. The person then picks an area to dive into. Dives teach from the bundled docs and `oat config describe`, and each ends with an offered fix. `--summary` keeps the old dashboard.
- **Read-only with one carve-out.** After explicit approval, the doctor may run exactly one named fix. The allowed commands are `oat config set|unset|adopt`, `oat pjm init`, `oat instructions sync`, and `oat tools update|install`. Under `OAT_NON_INTERACTIVE=1` the report is the whole output.
- **`oat config describe` reports deprecations as data.** Five deprecated keys carry a `deprecated` object with `supersededBy`, an optional `note`, and optional `legacyValues`. Plain output prints `Deprecated: prefer …`. A test ties the field to the catalog's deprecation wording, so a newly worded deprecation cannot slip past it.
- **Contract test for the skill.** It checks that every sweep command and carve-out command exists in the built CLI, and that every projected field exists in real output. It derives the `pjm:*` check ids from the CLI source and checks that each docs citation resolves. It also runs the prescribed pointer repairs in a scratch repository, with a negative control on the refused form.
- **Docs.** The configuration guide, the CLI Utilities landing page, the tool-packs page, and two reference pages now describe the router and the deprecation line.

## Key Decisions

- **One doctor router instead of a family of doctor skills.** The operator chose one `oat-doctor` whose areas are dives. A family makes people guess which doctor to run and loses the cross-area view. A dive that needs its own apply machinery routes to the skill that owns it; for example, docs goes to `oat-docs-bootstrap`.
- **The doctor reads CLI signals and does not restate them.** Config knowledge comes from `oat config describe`, and health comes from `oat doctor`, `oat pjm doctor`, and `oat instructions validate`. The skill's own key list and pack manifest were removed. Legacy detection uses a structured `deprecated` field instead of matching description prose, so a new deprecation reaches the doctor with no skill edit.
- **Read-only with a single approved-command carve-out.** The sweep and dives never edit files. A dive may run the one command it named, once, after the person approves it. This keeps unattended runs safe while still letting interactive runs finish a fix.

## Design Deltas

- The CLI's PJM adoption states are `declared`, `inferred-legacy`, `partial-initialization`, and `none`, not the `absent`/`partial` the design assumed; the skill and design use the CLI literals.
- `workflow.dispatchCeiling.preset` supersedes to `workflow.dispatchPolicy.policy`. The design's target was not a catalog key. The first successor named only the Codex provider, and the Bugbot review of PR #300 corrected it.
- The plan exit gate was not run; the operator declined it after implementation finished, and the implementation exit gate ran instead.

## Notable Challenges

- **The exit gate took four attempts.** The routed reviewer was `cursor-gpt-5-6-sol-xhigh`. The recurring miss was the stale-pointer repair: the CLI refuses `oat config unset activeProject`. The rule, then the report example, then the design example each still carried that form. The fix was `oat config set activeProject ''`, plus a test that extracts the prescribed commands from the skill and runs them.
- **Both doctors exit 1 on a healthy repository with warnings.** The sweep counts a command as failed only when its stdout is not JSON.
- **Commander prints parent usage and exits 0 for an unknown subcommand.** The command probe asserts the `Usage: oat <path>` line instead of the exit code.
- **Bugbot threads marked resolved were still unfixed on the branch.** Three of five were in that state: duplicate dispatch-matrix and PJM-adoption findings, and a projection parser that dropped sibling fields. All were verified against the code and fixed.

## Tradeoffs Made

- The skill grew in prose and depends on CLI JSON shapes, and contract tests pin those shapes. An aggregate `oat doctor --deep` CLI command was rejected because the teaching half cannot live in the CLI.
- `oat doctor --json` is about 410 KB and `oat tools list --json` about 626 KB, so every sweep call projects named fields instead of reading raw output.

## Integration Notes

- A new deprecation in the config catalog should set `deprecated.supersededBy` to a real catalog key; the describe test enforces this and the doctor surfaces it automatically.
- Adding a `pjm:*` check needs no skill edit for detection, but the contract test requires the PJM dive to mention the new id.

## Follow-up Items

- `BL-260911-make-docs-bootstrap-a-front` (high): the doctor's docs area routes here for repositories with an undeclared docs surface.
- `BL-260911-support-per-tool-scope` (medium): the tools area reports scope duplication that this item would let people resolve per tool.
- `BL-260915-re-author-the-explainer-kit`: pre-existing fixture drift found at the phase gates, closed by PR #301.

## Explainer Outcome

- **project-recap:** skipped — declined at completion (interactive)

## Associated Issues

- `BL-260911-make-oat-doctor` — delivered by PR #300 and archived.

## Workflow Observations

### 2026-09-15 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:2,minor:2 exit=1 status=blocked artifact=.oat/projects/shared/oat-doctor-router/reviews/final-review-2026-09-15T041753Z.md run=b253d1f4-7b56-4fbf-9a72-0abda2d3bfa1

### 2026-09-15 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/oat-doctor-router/reviews/final-review-2026-09-15T043126Z.md run=7f9a1399-668a-4f2c-8e50-762dd0c7a378

### 2026-09-15 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-doctor-router/reviews/final-review-2026-09-15T044211Z.md run=094ad1f2-c9c7-4cfe-9d5a-943788b855df

### 2026-09-15 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/oat-doctor-router/reviews/final-review-2026-09-15T044732Z.md run=09a41332-a64f-45ca-b795-2ec419eaee0c
