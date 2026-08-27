---
oat_generated: true
oat_generated_at: 2026-08-27T03:11:06Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/synced-project-scope
oat_gate_headless: true
oat_gate_run_id: 5469446e-e9b4-4cf4-8d37-99bf65d164f3
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T03:11:06Z
**Scope:** Current spec-driven implementation plan, aligned against `spec.md` and `design.md`
**Files reviewed:** 4 (`plan.md`, `spec.md`, `design.md`, `implementation.md`)
**Commits:** Not applicable (artifact review)

## Summary

The plan has strong requirement traceability and detailed verification, but it is not ready to implement. Two P0 workflow paths are sequenced incorrectly, and four additional contradictions leave coordination adoption, remote listing, and release-gate execution underspecified or deterministically broken.

Findings: 2 critical, 4 important, 1 medium, 0 minor

## Findings

### Critical

- **The default-scope flip breaks project splitting and leaves synced coordination refs stale** (`.oat/projects/shared/synced-project-scope/plan.md:659`)
  - Issue: p02-t02 changes only `seed-children.ts` and `write-parent.ts` for scope inheritance. The existing `finalizeSplit` still builds parent/child paths from the configured `projectsRoot` (the shared root), so a default-`synced` split will finalize/read the wrong path and set `activeProject` to `shared/<child>`. In addition, `scaffoldProject` publishes each synced ref before `writeCoordinationParent` and `seedChildren` apply their real state/discovery changes, and the plan adds no post-mutation push. The remote parent therefore lacks `oat_children`, making FR17 impossible even if pull is correct.
  - Fix: Include `packages/cli/src/projects/split/finalize.ts` and `packages/cli/src/commands/project/split/run.ts`; carry the resolved parent scope/root through write, seed, and finalize; push each finalized parent/child checkout after all post-scaffold mutations. Add an end-to-end synced split test asserting the active path and the content of every remote ref, especially the parent's `oat_children`.
  - Requirement: FR2, FR6, FR17

- **Required arrival pulls run after the skills have already rejected the absent checkout** (`.oat/projects/shared/synced-project-scope/plan.md:1499`)
  - Issue: p04-t02 puts the implement-resume pull in `references/plan-and-resume.md`, but `oat-project-implement/SKILL.md` validates `activeProject` in Step 0 before that reference is loaded and falls back to `${PROJECTS_ROOT}/<name>` when the synced checkout is absent. The same ordering bug exists in the proposed review change: p04-t02 adds an absent-checkout pull in review-provide Step 1.6, after Step 0 has already required the directory and `state.md` to exist. Fresh-worktree resume and review therefore cannot reach their planned pull.
  - Fix: Modify the top-level Step 0 resolution in both skills. When the configured path is under the synced root and a record/ref exists, pull before directory/`state.md` validation; only then apply the existing invalid-project route. Add contract fixtures for an absent synced checkout with a valid record to both implement-resume and review-provide.
  - Requirement: FR6

### Important

- **The planned coordination parser cannot read `oat_children`** (`.oat/projects/shared/synced-project-scope/plan.md:998`)
  - Issue: p02-t10 explicitly uses `parseFrontmatterField` for `oat_children`. That helper is a line-oriented scalar reader, while `writeCoordinationParent` serializes child arrays through `YAML.stringify` as a YAML sequence. It returns an empty/raw scalar rather than `string[]`, so child pulls will be skipped or malformed.
  - Fix: Reuse a YAML object/array parser (or add a typed shared frontmatter-array helper), validate that every child is a valid slug, and test the exact block-sequence output produced by `writeCoordinationParent`.
  - Requirement: FR17

- **Adoption record commits have two incompatible owners** (`.oat/projects/shared/synced-project-scope/plan.md:988`)
  - Issue: The task says `pullSynced` writes and commits a record whenever `adopt` is set, then says `pullChildren` loops over `pullSynced`, while also requiring all parent/child record writes from one invocation to land in one `commitRecordChange`. Those behaviors cannot all hold: committing inside each pull produces multiple commits and prevents `--no-commit` from being applied transactionally.
  - Fix: Make the low-level pull return pending record mutations without committing. Let the command-level parent/child orchestrator collect successful adoptions and call `commitRecordChange` once, or not at all under `--no-commit`. Specify and test partial-child-failure behavior.
  - Requirement: FR16, FR17, NFR4

- **Absent and remote project rows have no defined output schema** (`.oat/projects/shared/synced-project-scope/plan.md:865`)
  - Issue: p02-t07/p02-t09 require rows for records or remote refs with no checkout, but the only public type change is optional `ProjectSummary.scope`. `ProjectSummary` still requires phase, workflow mode, progress, and recommendation, none of which exist in the record or `ls-remote` result; the planned `checkout`, `origin`, and `hint` fields are also not modeled. Implementers would have to invent lifecycle values or silently change JSON shape.
  - Fix: Define a discriminated list-row contract for materialized, recorded-but-absent, and remote-only projects, with explicit nullable/unavailable lifecycle fields and stable human-table placeholders. Update the control-plane/CLI boundary, README, JSON tests, and offline behavior to that contract.
  - Requirement: FR5, FR16, NFR1

- **Gate commands create untracked logs and then require a clean worktree** (`.oat/projects/shared/synced-project-scope/plan.md:1720`)
  - Issue: p04-t08 writes `gate.log` and `gate2.log`; p04-t09 and p04-t10 write additional `gate-*.log` files. These paths are not ignored or removed, yet the tasks later require `git status --porcelain` to contain only `implementation.md` or be empty. The release-evidence tasks cannot complete as written.
  - Fix: Redirect gate output to a `mktemp -d` location (with cleanup) or an explicitly ignored evidence directory, while copying only the final exit summary into `implementation.md`. Add the clean-status assertion after cleanup.
  - Requirement: NFR6

### Medium

- **The Reviews ledger contains duplicate and stale review events** (`.oat/projects/shared/synced-project-scope/plan.md:1830`)
  - Issue: The `013313Z` artifact row appears twice, and the `025742Z` row remains `received` at an active path even though `implementation.md` says all findings were applied and the active artifact no longer exists. This weakens canonical event provenance and can confuse later receive/latest routing.
  - Fix: Reconcile the ledger through the review-receive bookkeeping contract: preserve event history, remove or explicitly supersede the accidental duplicate as allowed by that contract, and mark the applied review with its archived path and completed disposition.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `spec.md`, `design.md`, `implementation.md`, current split/frontmatter/list implementation contracts, and repository CLI instructions. The optional `## Dispatch Profile` section is absent; that omission is valid and was not treated as a finding.

### Requirements Coverage

| Requirement group | Status  | Notes                                                                                          |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------- |
| FR1-FR4           | covered | Core scope/ref, creation, push, and pull tasks are detailed and test-first.                    |
| FR5               | partial | Record storage is covered; absent-record list projection lacks a stable row contract.          |
| FR6               | partial | Broad skill inventory exists, but implement/review arrival sequencing is too late.             |
| FR7-FR15          | covered | Links, archive, hygiene, migration, doctor, docs, and compatibility have mapped tasks.         |
| FR16              | partial | Remote enumeration/adoption is planned, but row and commit-ownership contracts are incomplete. |
| FR17              | missing | Split persistence and child-array parsing prevent coordination pull from satisfying the spec.  |
| FR18              | covered | Archive filtering and integration assertions are present.                                      |
| NFR1-NFR5         | partial | Safety coverage is strong; split and adoption gaps affect compatibility/resumability.          |
| NFR6              | partial | Gates are enumerated, but their log paths violate the task's clean-worktree requirement.       |

### Extra Work (not in declared requirements)

Listing `local` projects is an explicitly approved additive exception recorded in `spec.md`; it is not scope creep.

## Verification Commands

```bash
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/synced-project-scope
pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking findings into plan tasks, then rerun the plan gate.
