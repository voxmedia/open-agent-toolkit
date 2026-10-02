---
title: Improve Agent Instructions
description: Audit instruction coverage and accuracy, then apply approved recommendations without inventing repository conventions.
---

Keep analysis and application separate. The analysis report establishes what
is supported by repository evidence; apply translates selected recommendations
into canonical instructions and provider views. Neither skill requires an
active OAT lifecycle project.

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
shim is not universally required: the default no-shim strategy and an
explicit pointer/symlink/copy strategy have different requirements. A
proposed removal must preserve instructions that only exist behind a link;
do not interpret duplication findings as permission to discard the sole
copy of useful guidance.

**Expected output:** A human-readable
`.oat/repo/analysis/agent-instructions-<timestamp>.md` report and its companion
bundle containing `recommendations.yaml` and recommendation packs. The bundle
is the apply-generation contract; the Markdown report provides review
context. The default bounded artifact-review loop can correct these outputs
but cannot edit downstream instruction files. Skipped review and residual
findings remain visible in the handoff.

**Next step:** Review the recommendations and use
[oat-agent-instructions-apply](#oat-agent-instructions-apply) for approved
changes. Resolve missing evidence in analysis rather than making apply guess
which convention new files should follow.

## oat-agent-instructions-apply

**Invocation:** `/oat-agent-instructions-apply` after reviewing an analysis
artifact. Choose batch approval, recommendation-by-recommendation review,
discussion, or cancellation when the skill presents the plan.

**Prerequisites:** A Git repository and a recent analysis artifact with
evidence, confidence, disclosure decisions, and concrete link targets for
link-only recommendations. When a companion bundle exists, it is the primary
generation contract; older Markdown-only artifacts remain supported. No
active lifecycle project is required.

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

**Expected output:** Approved canonical instruction/rule changes on the
workflow's branch and project-scoped provider synchronization where needed.
The plan and source-backed rationale remain aligned with the analysis
bundle. Commit and optional PR steps report the applied plan and include
the analysis for reviewers; remote publication requires confirmation.

**Next step:** Review the generated diff and provider scope before approving
publication. Reanalyze when you need to evaluate new conventions or gaps;
apply is not a second independent audit.
