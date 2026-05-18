---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-18
oat_generated: true
oat_summary_last_task: p02-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: agent-instructions-nesting-rubric

## Overview

`oat-agent-instructions-analyze` repeatedly failed to recommend nested `AGENTS.md`
files for domain-specific subdirectories — e.g. a `packages/<pkg>/src/<domain>/`
directory with 10–20 files and conventions that apply only to that domain. A
representative miss concluded "no app/package exceeds 50 source files, so no
nested second-level AGENTS.md is warranted." Investigation confirmed this was the
rubric working as written, not an agent misread: the directory-assessment rubric
gated all nested-instruction-file consideration behind a parent source-file
count. This project revised that rubric so granularity is driven by distinct
domain conventions at every directory depth, not by file count.

## What Was Implemented

A guidance-only change to the `oat-agent-instructions-analyze` skill — no
analysis-engine, helper-script, or apply-skill logic changed.

- **`references/directory-assessment-criteria.md`** rewritten: the "more than 50
  source files" gate is removed entirely and no file-count number remains as a
  trigger anywhere in the rubric. "Distinct Domain Boundary" (Indicator 4) is
  reframed as the depth-agnostic primary trigger for nested files (strengthened
  from Moderate to Strong, with a nested `packages/<pkg>/src/<domain>/` example).
  Indicator 5's file count is softened to a non-threshold illustration and noted
  as never sufficient alone. The old "Large Directory Decomposition" section
  becomes "Decomposing Broad Recommendations", triggered by heterogeneity
  (distinct sub-areas) rather than size. A new "Nested Instruction Files
  (Progressive Specificity)" section documents the inherit-and-delta model with a
  worked bigquery-sync-style example. Exclusions are reframed around "nothing
  distinct to capture" plus an explicit anti-sprawl line.
- **`SKILL.md`** Step 4 ("Assess Coverage Gaps") reframed so the directory walk
  is explicitly per-directory at every depth; skill `version:` bumped 1.9.0 →
  1.10.0.
- **Release bookkeeping:** the five lockstep public packages (`cli`,
  `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`) bumped
  together 0.1.0 → 0.1.1, as required for `.agents/skills` changes.

Net effect: a moderately sized, domain-specific subdirectory now surfaces as a
coverage-gap candidate regardless of how small its parent package is; the
"nothing over 50 files → no nested files" conclusion is no longer reachable from
the rubric.

## Key Decisions

- **Granularity is driven by distinct conventions, not file count.** The trigger
  for a nested instruction file is non-obvious, domain-specific conventions an
  agent would otherwise miss — file count is at most a supporting signal, never a
  gate.
- **Per-directory evaluation at every depth.** The rubric and `SKILL.md` Step 4
  both state coverage-gap assessment applies to every directory recursively, not
  just top-level apps/packages.
- **No numeric threshold retained — not even as a soft prompt.** When asked
  whether to keep a number for the decomposition trigger, the decision was to
  drop it entirely and trigger decomposition on heterogeneity. A number anywhere
  invites the same count-and-dismiss failure mode.
- **Anti-sprawl is a mandatory positive criterion, not just threshold removal.**
  The rubric must say what _does_ warrant a nested file (distinct conventions) so
  it does not over-recommend files for large-but-homogeneous directories that
  merely mirror their parent.

## Tradeoffs Made

- Dropping every file-count number makes the rubric fully qualitative. This
  trades the false comfort of a measurable threshold for judgment-based
  assessment — accepted deliberately, because the threshold was the defect and a
  qualitative positive trigger plus an explicit anti-sprawl guard contain the
  opposite failure (instruction-file sprawl).

## Follow-up Items

- **Deferred (Minor, non-blocking):** residual "starting at depth 1–2" phrasing
  in the "Decomposing Broad Recommendations" section of
  `directory-assessment-criteria.md`. Re-evaluated in both the p01 phase review
  and the final review as sweep-start guidance (coherent with the every-depth
  model), not a leftover gate — optional polish with no defect to fix.
