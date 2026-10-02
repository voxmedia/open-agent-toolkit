---
title: Improve Agent Instructions
description: Audit instruction coverage and accuracy, then apply approved recommendations without inventing repository conventions.
---

# Improve Agent Instructions

Keep analysis and application separate. The analysis report establishes what
is supported by repository evidence; apply translates selected recommendations
into canonical instructions and provider views. Canonical instructions are
the provider-neutral source files OAT treats as the source of truth, such as
`AGENTS.md` and rule files under `.agents/rules/`. Provider views are the
per-tool files, such as Cursor rule files, that `oat sync` generates from
them. Neither skill needs an active OAT project.

The analysis report is an analysis artifact: a timestamped Markdown report
that analyze writes under `.oat/repo/analysis/` and that apply later reads.

The invocations below are agent instructions, not terminal commands. Use
slash names where supported, `$name` in Codex, or ask for the skill by name.

## oat-agent-instructions-analyze

**Invocation:** `/oat-agent-instructions-analyze` in the repository you want
to evaluate. Confirm the provider scope when prompted so the audit covers
the instruction formats your team actually uses.

**Prerequisites:** A Git repository with at least one instruction file (root
`AGENTS.md` is the baseline), accessible configuration/documentation evidence,
and `jq` for the helper scripts. OAT documentation configuration is useful when present but not
required for discovering the repository's documentation surfaces. No active
project is required.

**Example scenario:** Claude, Cursor, and Codex users receive inconsistent
test instructions, and a nested package has no clear ownership guidance.
Audit the canonical instructions and relevant provider views against actual
package scripts and local documentation before copying another provider's
rules into every directory.

The audit checks quality, coverage, existing-rule accuracy, progressive
disclosure, file-type opportunities, and cross-format consistency. Full or
delta analysis follows valid tracking evidence. Claims about exhaustive
consistency need exhaustive evidence, not a convenient sample. Formatting
tools and canonical documentation are often better linked than restated as
large always-loaded instruction blocks.

Provider recommendations follow configured policy. For example, a Claude
shim (a `CLAUDE.md` file whose job is to import `AGENTS.md` with
`@AGENTS.md`) is not universally required. The setting
`instructions.claude.shims` chooses the strategy. Under the default, `none`,
Claude Code reads `AGENTS.md` itself, so analysis recommends no `CLAUDE.md`.
Under `pointer`, `symlink`, or `copy`, it checks for the matching shim next
to each `AGENTS.md`.

Some `CLAUDE.md` files hold the only copy of instructions that an
`AGENTS.md` links to. For those files, the recommended fix is to move the
content into each linking `AGENTS.md` first and only then remove the file.
A duplication finding is never permission to discard the sole copy of
useful guidance.

**Expected output:** A human-readable
`.oat/repo/analysis/agent-instructions-<timestamp>.md` report and its
companion bundle. The companion bundle is a folder next to the report
(`agent-instructions-<timestamp>.bundle/`) that holds `summary.md`,
`recommendations.yaml`, and one recommendation pack file per recommendation
under `packs/`. The bundle is what apply generates from; the Markdown report
provides review context. The default bounded artifact-review loop can
correct these outputs but cannot edit downstream instruction files. Skipped
review and residual findings remain visible in the handoff.

**What it does without asking:** It writes the report and companion bundle
under `.oat/repo/analysis/`, lets its review loop correct them, and updates
its tracking record in `.oat/tracking.json`. It does not create or modify
instruction files or repository configuration.

**Next step:** Review the recommendations and use
[oat-agent-instructions-apply](#oat-agent-instructions-apply) for approved
changes. Resolve missing evidence in analysis rather than making apply guess
which convention new files should follow.

## oat-agent-instructions-apply

**Invocation:** `/oat-agent-instructions-apply` after reviewing an analysis
artifact. Choose batch approval, recommendation-by-recommendation review,
discussion, or cancellation when the skill presents the plan.

**Prerequisites:** A Git repository, `jq`, the installed
`oat-agent-instructions-analyze` skill (apply reuses its scripts and stops if
it cannot find them), and a recent analysis artifact. Apply always reads the
newest `.oat/repo/analysis/agent-instructions-*.md` report. Each
recommendation needs evidence, confidence, a disclosure decision (whether
the item is written inline, added only as a link, omitted, or left for you
to decide), and concrete link targets for link-only recommendations. When a
companion bundle exists, it is the primary generation contract; older
Markdown-only artifacts remain supported. `gh` is needed only if you want
apply to open the pull request. No active OAT project is required.

**Example scenario:** The audit recommends fixing one inaccurate test command
and adding scoped guidance to a package. Approve those two changes, but
decline a proposed always-loaded architecture summary in favor of its
documentation link. The resulting instructions should preserve that
disclosure choice rather than copying the full summary into every provider.

Apply may reopen cited sources to verify them and generate instruction text,
but cannot add new recommendations or infer a formatting rule from tool
defaults. Missing preferred patterns, evidence, or link targets are reasons
to stop for clarification. Provider baselines must already be explicit in
the analysis, including which shim strategy applies.

**Expected output:** Approved canonical instruction and rule changes
committed on a new `oat/agent-instructions-<timestamp>` branch, with
regenerated provider views where needed. The plan and source-backed
rationale remain aligned with the analysis bundle.

**What it does without asking:** Nothing changes until you approve the plan
(choosing `cancel`, or skipping every item, exits without changes). After
approval, apply continues without asking again. It creates branch
`oat/agent-instructions-<timestamp>` and writes the approved files. Items
whose disclosure is `ask_user` are confirmed with you once more before they
are written. When it writes canonical rule files, it runs
`oat sync --scope project` to regenerate the provider views. It then commits
the generated and updated files as `chore: update agent instruction files`.
If the branch cannot be created (for example because of uncommitted
changes), it asks you to resolve that first. After committing, it asks
whether to push and open a pull request; only a yes pushes. The PR targets
`main`, and its body includes the applied plan and the full analysis
report. Finally it updates `.oat/tracking.json`.

**Next step:** Review the committed diff and provider scope before you agree
to push or open a pull request. Reanalyze when you need to evaluate new
conventions or gaps; apply is not a second independent audit.
