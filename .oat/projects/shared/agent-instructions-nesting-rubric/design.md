---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-18
oat_generated: false
oat_template: false
---

# Design: agent-instructions-nesting-rubric

## Overview

This project revises the directory-assessment rubric used by
`oat-agent-instructions-analyze` so it stops gating nested instruction-file
recommendations behind a parent source-file count. The change is guidance-only:
it edits the rubric reference doc (`references/directory-assessment-criteria.md`)
and the Step 4 framing in that skill's `SKILL.md`. No analysis-engine, helper
script, or apply-skill logic changes.

The core move is to **separate two questions the current rubric conflates**:
(a) "is this area large enough / heterogeneous enough that one broad
recommendation would be too vague — decompose it" and (b) "does this
subdirectory merit its own instruction file." The "Large Directory
Decomposition" section answers (a) with a 50-source-file figure, but that figure
is currently wired as the gate for (b) as well. The revision separates them:
(a) is re-triggered on **heterogeneity** (distinct sub-areas), with the
file-count number removed entirely; (b) is answered by a per-directory,
every-depth evaluation driven by a positive qualitative trigger — distinct,
non-obvious domain conventions an agent would otherwise miss.

To prevent over-correction into instruction-file sprawl, the rubric gains an
explicit progressive-disclosure model (nested files inherit parent context, stay
short, capture only the domain delta — cross-referenced to the skill's bundled
`agent-instruction.md` §13) and an explicit anti-sprawl guard (a directory that
merely mirrors its parent is not a candidate, regardless of size). Closing
bookkeeping: bump the skill's `version:`, bump the five lockstep public
packages, and pass `pnpm release:validate`.

## Architecture

### System Context

`oat-agent-instructions-analyze` Step 4 ("Assess Coverage Gaps") walks the repo
directory tree and evaluates each directory against
`references/directory-assessment-criteria.md`. The output is a coverage-gaps
list written into the analysis artifact and companion bundle, later consumed by
`oat-agent-instructions-apply`. The rubric doc _is_ the decision logic for
"which directories need an instruction file." This project changes that logic;
the surrounding walk, artifact, and bundle plumbing are unchanged.

**Key Components (all documentation):**

- **`directory-assessment-criteria.md`** — the rubric. Primary edit.
- **`SKILL.md` Step 4 framing** — light wording so the directory walk explicitly
  descends to every depth and applies the rubric per-directory.
- **`SKILL.md` frontmatter `version:`** — bump 1.9.0 → 1.10.0 (behavior change).
- **Lockstep `package.json` versions** — `packages/cli`, `packages/control-plane`,
  `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`
  bumped together per the repo release policy for `.agents/skills` changes.

### Data Flow (unchanged by this project)

```
directory tree walk
  → per-directory rubric evaluation   ← only this step's CONCLUSION changes
  → coverage-gaps list
  → analysis artifact + companion bundle
  → oat-agent-instructions-apply
```

The bundled copy under `packages/cli/assets/skills/` is gitignored — a build
artifact regenerated from the canonical `.agents/skills` copy. Editing the
canonical copy is sufficient; no manual sync of the bundled copy.

## Component Design

### Component 1: Primary Indicator 4 — Distinct Domain Boundary

**Purpose:** Make domain specificity the primary trigger for nested files.

**Changes:**

- Re-scope the indicator text so it reads as depth-agnostic — it applies to
  `packages/<pkg>/src/<domain>/` exactly as it applies to a top-level package.
- Add a nested example alongside the existing top-level examples.
- Strengthen from "Moderate — depends on complexity": a bounded domain with its
  own models / terminology / invariants and non-obvious conventions warrants a
  file **at any depth, regardless of parent size**.

### Component 2: Primary Indicator 5 — Significant Codebase

**Purpose:** Keep file count as a supporting signal only, never a gate.

**Changes:**

- Soften the hard ">10 source files" so it does not read as a precise
  threshold — phrase as "a substantial body of code (loosely, 10+ files)".
- State explicitly that file count is never sufficient alone: many files that
  all mirror the parent's conventions is not a trigger.

### Component 3: "Large Directory Decomposition" → "Decomposing Broad Recommendations"

**Purpose:** Decompose a broad recommendation into granular sub-area guidance —
without using file count as the trigger.

**Changes:**

- Remove the "more than 50 source files" figure entirely. No file-count number
  remains as a trigger anywhere in the rubric.
- Trigger decomposition on **heterogeneity**: when an area you would recommend a
  file for spans distinct sub-areas (different tech stack/runtime, different
  dominant file-type patterns, separate build/tooling config, or a separate
  domain boundary), assess and recommend per sub-area instead of writing one
  broad file.
- Keep the genuine guidance: enumerate the distinct sub-areas and their
  conventions rather than reporting a total file count.

### Component 4: New Section — "Nested Instruction Files (Progressive Specificity)"

**Purpose:** Document the model that makes nested files cheap and valuable.

**Content:**

- Instruction files form a hierarchy; deeper = more specific.
- A child file **inherits** everything from its ancestors and contains **only**
  the domain-specific delta — it must not repeat the parent.
- Because a nested file is small and additive, the cost of adding one is low.
  The bar is whether an agent working only from the nearest existing
  (ancestor) instruction file would **get something wrong or miss something**
  in that domain.
- Cross-reference the skill's bundled `references/docs/agent-instruction.md`
  §13 ("Scoped Files — When and How").
- Include a worked example of the bigquery-sync-style case: a moderately sized
  domain subdirectory inside a sub-50-file package that still warrants its own
  file because its conventions diverge.

### Component 5: Exclusions — Reframed

**Purpose:** Exclude on "nothing distinct to capture", not on raw smallness.

**Changes:**

- Replace "Directories with <5 source files and no build config — too small to
  warrant overhead" with a conventions-based test: a directory is excluded when
  it merely follows its parent's conventions with nothing distinct to capture —
  regardless of size.
- Add an explicit anti-sprawl line: do not recommend a file for a directory
  just because it has many files, if those files all follow the parent's
  conventions.
- Keep generated/external exclusions (`node_modules`, `dist`, `build`, `.git`)
  and the parent-scoped-rule coverage exclusion unchanged.

### Component 6: `SKILL.md` Step 4 Framing

**Purpose:** Make the directory walk explicitly per-directory at every depth.

**Changes:**

- Adjust the Step 4 wording ("Walk the directory tree and evaluate each
  directory…") so it explicitly states the walk descends into subdirectories at
  every depth and applies the rubric per-directory — not just to top-level
  apps/packages. Keep delta-mode and full-mode scoping behavior unchanged.

### Component 7: Bookkeeping

- Bump `SKILL.md` frontmatter `version:` 1.9.0 → 1.10.0.
- Bump the five lockstep public-package `package.json` versions together.
- Confirm the artifact template's directory-coverage section needs no change
  (it is expected to be generic; verify during implementation).

## Testing Strategy

No automated unit tests apply — this is rubric prose. Verification is
scenario-based reasoning plus repo tooling.

### Scenario Walkthroughs (manual reasoning against the revised rubric)

- **Positive:** A `packages/<pkg>/src/<domain>/` directory with ~10–20 files and
  distinct domain conventions is surfaced as a coverage-gap candidate — even
  when its parent package is well under 50 files. The old "nothing over 50 → no
  nested files" conclusion is no longer reachable from the rubric text.
- **Anti-sprawl:** A directory with many files that all mirror the parent's
  conventions is not recommended a file — the conventions-based exclusion
  catches it.
- **Decomposition:** A heterogeneous area (mixed tech stack / file-type
  patterns) yields per-sub-area recommendations; a homogeneous large area
  yields one.

### Consistency Checks

- No dangling "50" / "more than 50 source files" references remain.
- `SKILL.md` Step 4 wording and `directory-assessment-criteria.md` agree.
- The skill's References section still resolves.

### Repo Tooling (operative gates)

- `pnpm lint` and `pnpm format` clean on changed files.
- `pnpm release:validate` passes (publishable-package definition of done).
- Skill `version:` bumped and the five lockstep public-package versions bumped
  together — verified in the final diff.

## Open Questions

Resolved during design:

- **Soft threshold:** Resolved — drop the file-count number entirely; trigger
  decomposition on heterogeneity. No number is retained, even as a non-gating
  prompt.
- **Indicator 5 number:** Resolved — keep file count as a supporting signal but
  soften ">10" to "a substantial body of code (loosely, 10+ files)".

## References

- Discovery: `discovery.md`
- Rubric under revision: `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md`
- Skill: `.agents/skills/oat-agent-instructions-analyze/SKILL.md`
- Bundled best-practice doc: `.agents/skills/oat-agent-instructions-analyze/references/docs/agent-instruction.md` (§13)
