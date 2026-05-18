---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-18
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p01'] # pause after the substantive rubric rewrite for review
oat_plan_parallel_groups: [] # fully sequential — see Parallelism
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: agent-instructions-nesting-rubric

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Revise the `oat-agent-instructions-analyze` directory-assessment rubric so it
recommends nested instruction files based on distinct, non-obvious domain conventions —
at every directory depth — instead of gating nested recommendations behind a parent
source-file count.

**Architecture:** Guidance-only change. Edits the rubric reference doc
(`references/directory-assessment-criteria.md`) and the Step 4 framing in the skill's
`SKILL.md`. The analysis-engine walk, artifact, and bundle plumbing are unchanged — only
the per-directory rubric _conclusion_ changes.

**Tech Stack:** Markdown documentation; pnpm/Turborepo monorepo release tooling
(`release:check-versions`, `release:validate`).

**Commit Convention:** `{type}({scope}): {description}` — `fix(skills): …` for rubric/skill
content, `chore(release): …` for version bookkeeping.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (quick mode; one checkpoint after Phase 1)
- [x] Set `oat_plan_hill_phases` in frontmatter (`['p01']`)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter (`[]` — sequential)

---

## Parallelism

The plan is fully sequential (`oat_plan_parallel_groups: []`).

- **Phase 1 → Phase 2 dependency:** Phase 2 bumps the lockstep public-package versions
  and runs `release:validate` / `release:check-versions`. Those checks must observe the
  final content state from Phase 1, and the version bump _represents_ the Phase 1 skill
  change. Phase 2 cannot meaningfully run before Phase 1 completes.
- **Within Phase 1:** `p01-t01` (rubric doc) and `p01-t02` (SKILL.md framing + version
  bump) both modify files inside the same skill and must stay mutually consistent; the
  version bump in `p01-t02` reflects all skill content changes. Sequential.
- No worktree parallelism: a 3-task documentation change has no independent write-set
  large enough to justify the overhead.

---

## Phase 1: Revise the Rubric and Skill Framing

### Task p01-t01: Rewrite `directory-assessment-criteria.md`

**Files:**

- Modify: `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md`

**Changes** (design Components 1–5 — all in this one file, edited together to avoid an
intermediate inconsistent state):

1. **Primary Indicator 4 — Distinct Domain Boundary.** Re-scope as depth-agnostic: it
   applies to `packages/<pkg>/src/<domain>/` exactly as to a top-level package. Add a
   nested example alongside the existing top-level ones. Strengthen from "Moderate —
   depends on complexity": a bounded domain with its own models/terminology/invariants
   and non-obvious conventions warrants a file **at any depth, regardless of parent
   size**. Make this the primary trigger for nested files.
2. **Primary Indicator 5 — Significant Codebase.** Soften the hard ">10 source files" to
   "a substantial body of code (loosely, 10+ files)" — not a precise threshold. State
   explicitly that file count is never sufficient alone: many files that all mirror the
   parent's conventions is not a trigger.
3. **"Large Directory Decomposition" → "Decomposing Broad Recommendations."** Remove the
   "more than 50 source files" figure entirely — no file-count number remains anywhere
   as a trigger. Trigger decomposition on **heterogeneity**: when an area you would
   recommend a file for spans distinct sub-areas (different tech stack/runtime, different
   dominant file-type patterns, separate build/tooling config, or a separate domain
   boundary), assess and recommend per sub-area instead of one broad file. Keep the
   genuine guidance: enumerate distinct sub-areas and their conventions.
4. **New section — "Nested Instruction Files (Progressive Specificity)."** Document the
   model: instruction files form a hierarchy, deeper = more specific; a child file
   _inherits_ everything from its ancestors and contains _only_ the domain-specific
   delta — it must not repeat the parent. Because a nested file is small and additive,
   the cost of adding one is low; the bar is whether an agent working only from the
   nearest existing (ancestor) instruction file would get something wrong or miss
   something in that domain. Cross-reference `references/docs/agent-instruction.md` §13
   ("Scoped Files — When and How"). Include a worked example of the bigquery-sync-style
   case: a moderately sized domain subdirectory inside a sub-50-file package that still
   warrants its own file because its conventions diverge.
5. **Exclusions — reframed.** Replace "Directories with <5 source files and no build
   config — too small to warrant overhead" with a conventions-based test: a directory is
   excluded when it merely follows its parent's conventions with nothing distinct to
   capture — regardless of size. Add an explicit anti-sprawl line: do not recommend a
   file for a directory just because it has many files, if those files all follow the
   parent's conventions. Keep the generated/external exclusions (`node_modules`, `dist`,
   `build`, `.git`) and the parent-scoped-rule coverage exclusion unchanged.

Keep the doc's existing structure, severity-mapping table, and Assessment Output table
intact except where the changes above require edits.

**Verification:**

- Run: `grep -n '50' .agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md`
  Expected: no occurrence of "50" as a source-file-count trigger (the "more than 50
  source files" gate is gone).
- Scenario walkthrough — reason against the rewritten text and confirm:
  - _Positive:_ a `packages/<pkg>/src/<domain>/` directory with ~10–20 files and distinct
    domain conventions is surfaced as a coverage-gap candidate even when its parent
    package is well under 50 files; the "nothing over 50 → no nested files" conclusion is
    no longer reachable.
  - _Anti-sprawl:_ a directory whose many files all mirror the parent's conventions is
    not recommended a file.
  - _Decomposition:_ a heterogeneous area yields per-sub-area recommendations; a
    homogeneous large area yields one.
- Confirm the artifact template needs no change: inspect the directory-coverage section
  of `.agents/skills/oat-agent-instructions-analyze/references/analysis-artifact-template.md`.
  Its directory-coverage table is generic; expected outcome is no edit. If it encodes an
  app/package-only assumption, make the minimal matching edit here and note it in the
  commit body.
- Run: `pnpm exec oxfmt --check .agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md`
  Expected: formatting clean (or run `oxfmt --write` then re-check).

**Commit:**

```bash
git add .agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md
git commit -m "fix(skills): drive nested instruction-file recommendations by domain conventions, not file count"
```

---

### Task p01-t02: Update `SKILL.md` Step 4 Framing and Bump Skill Version

**Files:**

- Modify: `.agents/skills/oat-agent-instructions-analyze/SKILL.md`

**Changes** (design Components 6 and 7a):

1. **Step 4 framing.** Adjust the Step 4 ("Assess Coverage Gaps") wording so it
   explicitly states the directory walk descends into subdirectories at **every depth**
   and applies the rubric **per-directory** — not just to top-level apps/packages.
   Reinforce that nested-domain subdirectories are in scope. Keep the delta-mode and
   full-mode scoping behavior, provider-baseline checks, and chained-recommendation
   guidance unchanged.
2. **Version bump.** Bump the frontmatter `version:` from `1.9.0` to `1.10.0` (a rubric
   behavior change shipped on this branch — one bump covers all skill content changes in
   the final PR diff).

**Verification:**

- Run: `grep -n '^version:' .agents/skills/oat-agent-instructions-analyze/SKILL.md`
  Expected: `version: 1.10.0`.
- Confirm Step 4 wording is consistent with `directory-assessment-criteria.md` (both
  describe per-directory assessment at every depth) and that the skill's References
  section still resolves — the criteria doc filename is unchanged, so existing links
  remain valid.
- Run: `pnpm exec oxfmt --check .agents/skills/oat-agent-instructions-analyze/SKILL.md`
  Expected: formatting clean.

**Commit:**

```bash
git add .agents/skills/oat-agent-instructions-analyze/SKILL.md
git commit -m "fix(skills): frame coverage-gap walk as per-directory at every depth"
```

---

## Phase 2: Release Bookkeeping

### Task p02-t01: Bump Lockstep Public-Package Versions and Validate

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Changes:**

- Bump the `version` field of all five lockstep public packages together by one patch
  release: `0.1.0` → `0.1.1`. The `.agents/skills` change counts as shipped CLI
  functionality per the repo release policy, so all five must move in lockstep. If any
  package is no longer at `0.1.0` at implementation time, read the current versions
  first and apply matching patch increments so all five land on the same version.
- Make no other edits to these `package.json` files.

**Verification:**

- Run: `for p in cli control-plane docs-config docs-theme docs-transforms; do node -e "console.log(require('./packages/'+process.argv[1]+'/package.json').version)" $p; done`
  Expected: all five print the same bumped version (`0.1.1`).
- Run: `pnpm release:check-versions`
  Expected: lockstep version-bump check passes (no lockstep errors).
- Run: `pnpm release:validate`
  Expected: public-package validation passes.
- Run: `pnpm lint`
  Expected: no errors.

**Commit:**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(release): bump lockstep public package versions for analyze rubric change"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status   | Date       | Artifact                                     |
| ------ | -------- | -------- | ---------- | -------------------------------------------- |
| p01    | code     | pending  | -          | -                                            |
| p02    | code     | pending  | -          | -                                            |
| final  | code     | pending  | -          | -                                            |
| design | artifact | received | 2026-05-18 | reviews/artifact-design-review-2026-05-18.md |
| plan   | artifact | received | 2026-05-18 | reviews/artifact-plan-review-2026-05-18.md   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — Rewrite the directory-assessment rubric and reframe the skill's
  Step 4 directory walk; bump the skill version.
- Phase 2: 1 task — Bump the five lockstep public-package versions and validate release
  readiness.

**Total: 3 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Rubric under revision: `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md`
- Skill: `.agents/skills/oat-agent-instructions-analyze/SKILL.md`
- Bundled best-practice doc: `.agents/skills/oat-agent-instructions-analyze/references/docs/agent-instruction.md` (§13)
