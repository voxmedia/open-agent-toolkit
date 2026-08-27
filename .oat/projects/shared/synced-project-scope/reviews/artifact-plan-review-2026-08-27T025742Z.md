---
oat_generated: true
oat_generated_at: 2026-08-27T02:57:42Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/synced-project-scope
oat_gate_run_id: 6c8e444d-2347-4486-9840-6873d14adf83
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T02:57:42Z
**Scope:** Readiness and upstream alignment of the spec-driven implementation plan
**Files reviewed:** 3 scoped artifacts (`plan.md`, `spec.md`, `design.md`)
**Commits:** N/A (artifact review)
**Dispatch audit:** Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high
**Gate route:** inline (`runtime=cursor`, `cliRoot=/Users/tstang/Code/open-agent-toolkit`)

## Summary

The plan is structurally complete, has stable task IDs, and maps every declared requirement to concrete work. It is not ready to implement: the canonical bookkeeping snippet fails open to `shared`, the archive task describes a destructive removal helper as a preflight check, and the mandatory GitHub spike never exercises the blob URL that the PR-links feature depends on. These Important findings are blocking.

Findings: 0 critical, 3 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

- **The canonical scope guard fails open to branch bookkeeping** (`.oat/projects/shared/synced-project-scope/plan.md:1359`)
  - Issue: The snippet that p04-t01 through p04-t03 are told to paste verbatim converts every `oat project scope` failure into `shared`. That contradicts the design's fail-closed command substitution at `design.md:369` and can route a `synced` project into the existing `git add`/`git commit` branch after a missing checkout, CLI failure, or malformed project state. The validator planned in p04-t06 checks that a guard exists, but does not reject this fallback, so the unsafe path can pass verification while violating FR6 and NFR4.
  - Fix: Remove `|| echo shared` from the canonical bookkeeping snippet and make scope-resolution failure stop before either durability branch. Preserve legacy behavior only after a successful result of `shared` or `local`. Add a validator fixture or skill-contract assertion that rejects fail-open scope fallbacks around project-artifact commits.
  - Requirement: FR6, NFR4

- **Archive preflight calls the checkout-removal operation before copying** (`.oat/projects/shared/synced-project-scope/plan.md:1090`)
  - Issue: p03-t04 says to perform a "`removeSyncedCheckout` dry-check" before copying the archive, but p01-t09 defines no dry-run option and explicitly specifies that a clean, pushed checkout is removed (`plan.md:480-504`). The design likewise reserves `removeSyncedCheckout` for state-machine step 6, after the archive copy and record commit (`design.md:334-342`). Following the plan literally removes the source during step 3, so step 4 has nothing to copy.
  - Fix: Add a non-mutating preflight helper or explicit status/HEAD-vs-ref checks and use that before the copy. Invoke `removeSyncedCheckout` exactly once, only after the archive snapshot and branch-side record update succeed. Name the new preflight contract in p01-t09 or p03-t04 and test that the source remains present through the copy.
  - Requirement: FR8

- **The GitHub spike verifies a commit page, not the required blob link** (`.oat/projects/shared/synced-project-scope/plan.md:556`)
  - Issue: p01-t10 creates an empty-tree commit, checks the commits API, and opens `/commit/<sha>`. FR7 and the design's open question depend specifically on rendered `blob/<sha>/<artifact>.md` URLs for commits reachable only from `refs/oat/*`. Because the spike contains no file and never requests a blob URL, it can pass while the load-bearing reviewer links remain unverified; the task then incorrectly treats the result as the FR7 assumption.
  - Fix: Put a known Markdown file in the custom-ref commit and request its exact GitHub `blob/<sha>/<file>` URL, verifying that it renders the expected content while the commit remains unreachable from branches/tags. Retain the existing no-workflow-run and branch-list checks.
  - Requirement: FR7

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `spec.md`, and `design.md` as the scoped artifact set; `implementation.md` and `state.md` as lifecycle context.

### Requirements Coverage

| Requirement | Plan status | Notes                                                                                                        |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| FR1-FR5     | Covered     | Scope, ref-sync, push/pull, and discovery-record work has concrete unit and real-git integration coverage.   |
| FR6         | Partial     | The skill inventory is broad, but its canonical bookkeeping guard fails open to branch commits.              |
| FR7         | Partial     | Link rendering and refresh are planned, but the mandatory host spike does not test a pinned blob URL.        |
| FR8         | Partial     | Completion parity is mapped, but archive preflight/removal ordering is internally contradictory.             |
| FR9-FR15    | Covered     | Gitignore, worktrees, prune, migration, doctor, docs, and gitattributes map to explicit tasks.               |
| NFR1-NFR3   | Covered     | Compatibility, host-footprint, and credential constraints have explicit checks.                              |
| NFR4        | Partial     | Git mutation invariants are strong, but the fail-open skill snippet can bypass the intended durability path. |
| NFR5-NFR6   | Covered     | Rebase resumability and release hygiene have concrete tasks and gates.                                       |

### Extra Work (not in declared requirements)

None. Listing `local` projects is an explicit accepted addition in the current specification.

## Verification Commands

Run these after revising the plan:

```bash
pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/plan.md
rg -n "PROJECT_SCOPE=|removeSyncedCheckout|blob/<sha>|blob/\\$C" .oat/projects/shared/synced-project-scope/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
