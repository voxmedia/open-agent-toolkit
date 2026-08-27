---
oat_generated: true
oat_generated_at: 2026-08-27T00:49:18Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/synced-project-scope
---

# Artifact Review: design

**Reviewed:** 2026-08-27T00:49:18Z
**Scope:** `design.md` completeness, clarity, implementation readiness, and alignment with confirmed `spec.md`
**Files reviewed:** 5
**Commits:** Not applicable (artifact review)

## Summary

The design is unusually concrete and covers nearly the entire confirmed requirement set, but it is not ready for planning yet. Two P0 paths are internally incomplete: the push sequence cannot reconcile a remote advance while pending artifact edits are present, and completion/prune mutate the tracked discovery record without defining how that branch-side change becomes durable. Completion cleanup, migration, lifecycle dependency, local-scope compatibility, safety-guard, and verification details also need tightening before implementation tasks can be derived safely.

Findings: 2 critical, 4 important, 2 medium, 1 minor

## Findings

### Critical

- **C1: The push sequence rebases before recording pending edits, so its required reconciliation path cannot run** (`design.md:215`)
  - Issue: The confirmed push requirement says the command must reconcile with the remote and commit all pending artifact changes (`spec.md:79-88`). The design orders `fetch` and conditional `rebase` before `add -A` and `commit` (`design.md:74-75`, `design.md:212-217`). When the remote ref advanced and the artifact worktree contains the pending edits that caused the push, Git refuses to start the rebase because the worktree is dirty. The ordinary no-remote-change path can work because the rebase is skipped, but the concurrency path central to FR3 cannot.
  - Fix: Specify one executable ordering and its conflict/resume semantics. The simplest contract is to guard the nested worktree, stage and commit pending artifacts locally, fetch the remote ref, rebase those local commits onto it, then push and advance the mirror ref. If the design instead uses stash/autostash, define how apply conflicts, `--continue`, `--abort`, commit messages, and no-op pushes behave. Add the dirty-local-plus-remote-ahead case to the FR3 integration scenarios.
  - Requirement: FR3 (P0), NFR5

- **C2: Discovery-record completion and prune mutations have no durable parent-branch commit path** (`design.md:248`)
  - Issue: FR5 requires the tracked record to be updated at completion and removed by prune (`spec.md:103-110`); FR8 requires the completed status (`spec.md:135-143`). The design says completion writes the record and prune deletes it (`design.md:218-220`, `design.md:248`, `design.md:300-302`), but the synced lifecycle branch replaces bookkeeping commits with `oat project push` (`design.md:324-335`). That push operates only inside the ignored nested worktree and cannot commit the sibling tracked JSON. Scaffold and migration explicitly define a parent-branch commit (`design.md:320`, `design.md:438`); completion and prune do not. As written, completion/prune leave a dirty parent checkout and the branch-visible record remains stale on the next machine.
  - Fix: Define a scoped parent-branch record transaction for completion and prune, including the exact staged paths, commit message, failure behavior, and interaction with any tracked summary export. Require tests to inspect the parent branch's committed tree, not only the working filesystem, after completion and prune. Keep artifact-ref pushes and parent-branch record commits as distinct, explicitly ordered operations.
  - Requirement: FR5 (P0), FR8 (P0), FR11

### Important

- **I1: Completion does not define the final push/link/archive/removal order and can discard unpushed ref state** (`design.md:302`)
  - Issue: FR7 requires `summary.md` to be linked when present and the durable summary path to be appended without replacing the ref link (`spec.md:123-132`); FR8 requires completion parity and retained ref validity (`spec.md:135-143`). The completion flow jumps from archive/export to worktree removal and record update (`design.md:80-81`, `design.md:300-302`) while PR refresh normally derives links from checkout HEAD after push (`design.md:294`). The only cleanup sequence uses `worktree remove --force` (`design.md:218`) without a stated clean/pushed precondition, despite the design claiming that parent removal needed no force (`design.md:24`) and its NFR4 test intent banning `--force` in runner arguments (`design.md:544`, `design.md:552`). This leaves no authoritative guarantee that final `summary.md`, final lifecycle state, and the durable-summary link reach the retained ref/PR before the checkout disappears.
  - Fix: Define completion as an explicit ordered state machine: finalize summary/state; push the final artifact commit; export/copy/archive; refresh the PR block with both retained-ref links and the durable path; commit the branch record/summary changes; verify the nested worktree clean; remove it without force; retain the ref. State which completed steps are safe to retry after each failure. If force removal remains necessary, narrow it to a documented, verified-safe condition and reconcile the contradictory test/claim.
  - Requirement: FR7 (P0), FR8 (P0), NFR4

- **I2: The migration sequence does not produce a clean, unambiguous destination checkout** (`design.md:220`)
  - Issue: FR12 requires a history-free ref commit, a new synced checkout, and one branch commit that removes the tracked shared artifacts and adds the record (`spec.md:173-180`). The design creates a temporary checkout and copies/pushes content, then runs `git rm -r --cached` on the shared directory and says to “move directory to `synced/` (or remove and re-add worktree)” (`design.md:220`). `--cached` leaves the shared files in the filesystem as untracked content, while the temporary registered worktree already owns the destination content. The alternative wording does not identify which directory moves, how the registered worktree path is updated, or when the now-untracked source is safely removed. The API summary repeats the single-commit claim without resolving this sequence (`design.md:436-438`).
  - Fix: Choose one exact migration algorithm. Define the source, temporary checkout, final checkout, index deletion, filesystem deletion, worktree registration move/recreate, and rollback boundaries step by step. End-state verification must assert: source absent, destination registered and clean, parent branch clean after exactly one migration commit, record committed, ref published, and `activeProject` retargeted.
  - Requirement: FR12

- **I3: The lifecycle integration introduces an undeclared `jq` dependency at every push/pull gate** (`design.md:327`)
  - Issue: The shared skill snippet parses `oat project scope --json` with `jq` (`design.md:324-335`), but the design's external dependencies list only Git and optional `gh` (`design.md:665-670`). FR6 is P0 and promises lifecycle-wide transparent integration (`spec.md:113-120`); on a host without `jq`, every affected skill fails before it can push or pull. This also makes scope routing depend on an external parser even though the CLI owns the scope contract.
  - Fix: Provide a dependency-free machine interface for shell skills, such as `oat project scope --shell SCOPE=scope`, a plain `--field scope`/`--format value`, or a status contract that needs no JSON parser. If `jq` is intentionally required, add it as a verified runtime dependency with preflight and installation guidance, then update the dependency and failure contracts.
  - Requirement: FR6 (P0), NFR1

- **I4: `oat project list` omits the existing `local` scope from its enumeration contract** (`design.md:442`)
  - Issue: NFR1 requires existing `local` projects to remain listed and resumed without behavior change (`spec.md:213-220`). The design says the list command enumerates only `shared` and `synced` siblings (`design.md:318-320`, `design.md:440-442`) and its backward-compatibility scenarios mention only the shared flow (`design.md:541`, `design.md:562-563`). It neither includes `local` nor explains a separate preserved enumeration path, so the declared API is incomplete against the confirmed compatibility requirement.
  - Fix: Define how `local` projects continue to be discovered and represented in unfiltered and `--scope local` results. Add explicit local-scope list/resume regression scenarios and clarify whether all three roots are sibling-derived or whether current local configuration is consulted separately.
  - Requirement: NFR1 (P0), FR2

### Medium

- **M1: The global mutation guard is impossible for create and underspecified for parent-repository operations** (`design.md:226`)
  - Issue: The design says `git rev-parse --show-toplevel` must equal `projectPath` before “any mutating command” (`design.md:226`, `design.md:470-474`). Creation must write commits/refs and register the worktree before `projectPath` exists (`design.md:70-72`, `design.md:214`); completion, migration, and prune also intentionally mutate the common Git directory and the parent branch. Implementing the guard literally blocks valid operations, while weakening it ad hoc risks losing the NFR4 safety boundary.
  - Fix: Replace the global statement with operation-specific invariants: nested-worktree mutations require top-level equality and explicit artifact pathspecs; parent/common-dir mutations use a narrow allowlist of ref/worktree commands; tracked branch mutations permit only the record, managed ignore/attributes, migration deletion, and configured summary export. Define guard failures before planning tasks.
  - Requirement: NFR4

- **M2: The requirement-to-test map does not exercise the design's riskiest acceptance boundaries** (`design.md:528`)
  - Issue: The mapping is complete by requirement ID, but its scenarios do not cover the dirty-local-plus-remote-ahead push path from C1 (`design.md:528`), durable-summary append/ref-link retention or malformed marker handling for FR7 (`design.md:532`, `design.md:475`), or committed parent-branch record state after completion/prune from C2 (`design.md:533`, `design.md:536`). The local compatibility omission in I4 is likewise absent from NFR1 coverage (`design.md:541`). These are concrete behavioral boundaries, not implementation details, and leaving them implicit weakens design-to-plan traceability.
  - Fix: Extend the mapping with those scenarios and name the authoritative assertion for each (artifact checkout HEAD/ref, parent branch committed tree, PR body block, or list JSON). Carry the same scenarios into integration tasks when `plan.md` is authored.
  - Requirement: FR3, FR5, FR7, FR8, FR11, NFR1

### Minor

- **m1: The design calls root commits identical even though their messages contain different slugs** (`design.md:385`)
  - Issue: Creation uses `commit-tree` with `chore(oat): init synced project <slug>` (`design.md:214`), so different project slugs necessarily produce different commit objects even when they share the empty-tree hash. Saying every ref starts from an identical init commit is inaccurate and can confuse fixture expectations.
  - Suggestion: Say that every project starts from the same empty tree but a distinct root commit, or use a truly identical message/metadata if shared root commit identity is intended.

## Requirements/Design Alignment

**Evidence sources used:** `spec.md` (confirmed requirements), `design.md` (review target), `discovery.md` (validated direction and constraints), `plan.md` and `implementation.md` (both present but still template-only; used only to confirm lifecycle stage, not as design authority).

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                                          |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| FR1         | covered | Standard path, custom ref, ignored nested worktree, and scope resolution are defined.                                          |
| FR2         | covered | Three values, configurable default, scaffold behavior, and config surface are defined.                                         |
| FR3         | partial | Push API exists, but the rebase-before-commit order fails with pending edits when remote advanced (C1).                        |
| FR4         | covered | Materialization, dirty refusal, rebase, conflict, continue, abort, and no-op semantics are defined.                            |
| FR5         | partial | Record schema/lifecycle is defined, but completion/prune persistence on the parent branch is missing (C2).                     |
| FR6         | partial | Sites are inventoried, but the common routing snippet adds undeclared `jq` (I3).                                               |
| FR7         | partial | Link allowlist, rendering, refresh, and durable path data exist; completion ordering and verification are incomplete (I1, M2). |
| FR8         | partial | Archive/ref-retention shape exists; final push/removal and record commit ordering are incomplete (C2, I1).                     |
| FR9         | covered | Directory-only ignore rule, self-heal, managed updates, and tests are specified.                                               |
| FR10        | covered | Detached checkout per parent worktree and round-trip verification are specified.                                               |
| FR11        | partial | Guard/warning and ref/checkout deletion exist; durable record deletion is missing (C2).                                        |
| FR12        | partial | Intended end state is clear, but the migration filesystem/worktree sequence is not executable as written (I2).                 |
| FR13        | covered | Required health conditions and fix hints are mapped.                                                                           |
| FR14        | covered | Required docs surfaces and build verification are assigned to Phase 4.                                                         |
| FR15        | covered | Managed gitattributes entry and idempotence tests are defined.                                                                 |
| NFR1        | partial | Shared preservation is explicit; local listing/resume coverage is incomplete (I4).                                             |
| NFR2        | covered | Custom-ref choice and an explicit GitHub spike gate cover the host-footprint assumption.                                       |
| NFR3        | covered | Git credential chain and graceful optional-`gh` behavior are explicit.                                                         |
| NFR4        | partial | Nested-worktree isolation is strong, but force removal and the global guard need correction (I1, M1).                          |
| NFR5        | partial | Pull continue/abort is defined; push reconciliation with pending edits is not (C1).                                            |
| NFR6        | covered | Skill/package bumps and full Definition-of-Done gates are assigned to release phase.                                           |

### Extra Work (not in declared requirements)

None. The concrete modules, commands, and operational detail are reasonable design realizations of the confirmed requirements.

## Verification Commands

After revising the design, run:

```bash
pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/design.md
git diff --check -- .oat/projects/shared/synced-project-scope/design.md
rg -n 'rebase|add -A|worktree remove|writeSyncedRecord|jq -r|project list|Requirement-to-Test Mapping|identical' .oat/projects/shared/synced-project-scope/design.md
```

Then manually trace FR3, FR5, FR7, FR8, FR11, FR12, NFR1, NFR4, and NFR5 from `spec.md` into the revised command sequences and test mapping before moving to planning.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into design-alignment tasks.
