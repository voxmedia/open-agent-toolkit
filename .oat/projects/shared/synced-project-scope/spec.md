---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-26
oat_generated: false
oat_template: false
---

# Specification: synced-project-scope

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not design/implementation details.

- Avoid concrete deliverables (specific scripts, file paths, function names).
- Keep the "High-Level Design" section to architecture shape and component boundaries only.
- If a design detail comes up, record it under **Open Questions** for `oat-project-design`.

## Problem Statement

OAT projects keep their lifecycle artifacts (discovery, spec, design, plan, implementation, state, reviews, summary) under the repository so that agents can stay on track across sessions, worktrees, and machines. Today the only scope that travels between machines is `shared`, which commits those artifacts on the work branch. Every PR therefore carries agent-facing prose — plan tables, task checkboxes, state frontmatter — that human reviewers find distracting and that automated review bots read and comment on. Artifacts also accumulate on `main` where contributors who never use OAT encounter them.

The maintainer's current workaround is to complete and archive a project before asking for review, which strips the noise. That fails whenever a project spans multiple PRs: reviewers of the early PRs see what looks like garbage, and the incentive to "complete early" distorts what completion means.

The artifacts have two audiences with opposite needs. Agents need them versioned, pushed, and reachable from any checkout using nothing more than git access. Reviewers and bots need them absent from the diff and from `main`, while still being able to read the design, discovery, and summary on demand. This project separates the two channels: in-flight artifacts move to a per-project git ref outside the branch namespace, the work branch carries only a tiny discovery record, and PR bodies link to pinned, rendered copies of the reviewer-facing artifacts.

Existing behaviors — `shared` and `local` scopes, local archive, dated S3 snapshots, and the dated tracked summary export — must be preserved unchanged.

## Goals

### Primary Goals

- Introduce a `synced` project scope whose artifacts are absent from PR diffs, from `main`, and from review-bot input, yet fully versioned and reachable from any worktree or machine with git access to `origin`.
- Make `synced` the default for new projects while keeping `shared` and `local` available and unchanged.
- Integrate the new scope into every lifecycle skill and agent that commits or resumes project artifacts, so agents experience no workflow change beyond push/pull at existing bookkeeping points.
- Give reviewers pinned, rendered links to `discovery.md`, `design.md`, and `summary.md` from the PR body, kept current while the PR is open and valid after the project completes.
- Preserve completion behavior: local archive, S3 snapshot, dated summary export.

### Secondary Goals

- Provide migration for in-flight `shared` projects.
- Provide doctor diagnostics for the new scope's failure modes.
- Provide a courtesy rendering hint for `shared` artifacts in GitHub's diff view.

## Non-Goals

- Rendering-only mitigations for `shared` scope beyond a single `linguist-generated` attribute.
- S3 or any non-git service as a live (mid-project) artifact transport.
- A configuration that publishes design docs into the repository as durable documentation.
- A single shared (non-detached) artifact checkout across multiple worktrees on one machine.
- A live, browsable "latest" URL for artifacts on the git host (that would require a real branch and reintroduce CI/branch-list noise).
- Changing how `shared` or `local` projects are stored, committed, listed, or archived.
- Reducing artifact commit churn (moot once artifacts leave the branch).

## Requirements

### Functional Requirements

**FR1: `synced` project scope**

- **Description:** A new project scope whose artifacts live at the standard per-scope project path, are ignored by the work branch, and are versioned as their own commit history on a per-project git ref in a namespace outside `refs/heads/` and `refs/tags/`.
- **Acceptance Criteria:**
  - A `synced` project's artifact directory is reported as ignored by the work branch and never appears in `git status` of the parent checkout.
  - The artifact directory has its own commit history whose tree root is the project directory (no code, no relation to branch commits).
  - The ref name is deterministic from the project slug.
  - Existing skills that read artifacts from the active project path work without modification.
- **Priority:** P0

**FR2: Default scope and explicit selection**

- **Description:** Project creation defaults to `synced`; an explicit scope option selects `shared`, `local`, or `synced`.
- **Acceptance Criteria:**
  - Creating a project with no scope option produces a `synced` project.
  - Each explicit scope value produces a project in the corresponding scope directory with that scope's storage semantics.
  - The default is configurable so a repository can keep `shared` as its default.
- **Priority:** P0

**FR3: Push**

- **Description:** A push command records pending artifact changes as a commit on the project ref and publishes the ref to `origin`, reconciling with remote changes first.
- **Acceptance Criteria:**
  - Fetches the remote ref and rebases local artifact commits onto it before pushing.
  - Commits all pending changes within the artifact directory with a conventional message; accepts an optional message override.
  - Publishes the ref to `origin` so a fresh clone can retrieve it.
  - Never stages, commits, or otherwise modifies the parent worktree's index or files outside the artifact directory.
  - A push with no pending changes and nothing to publish exits successfully without creating a commit.
  - Reports remote-rejected pushes with a retry instruction rather than forcing.
- **Priority:** P0

**FR4: Pull**

- **Description:** A pull command materializes or updates the artifact checkout from the project ref.
- **Acceptance Criteria:**
  - When the artifact directory is absent (fresh clone, new worktree, new machine), fetches the ref and creates the checkout at the standard path.
  - When present, fetches and rebases local commits onto the remote ref.
  - On conflict, stops, lists conflicted files, and prints resolution instructions; a continue option resumes after the agent resolves.
  - Refuses to discard uncommitted artifact changes; instructs the agent to push or stash first.
  - Safe to run repeatedly; a no-op pull exits successfully.
  - Works from any git worktree of the repository, producing an independent checkout per worktree.
- **Priority:** P0

**FR5: Discovery record**

- **Description:** A small tracked file on the work branch records that a `synced` project exists so an agent arriving on a branch can find and pull it.
- **Acceptance Criteria:**
  - One record per project, containing at least slug, scope, ref name, and lifecycle status.
  - Concurrent PRs that each add a different project do not conflict on the record.
  - Contains no artifact prose; small enough that review bots and humans can ignore it.
  - Created with the project, updated at completion, removed by prune.
- **Priority:** P0

**FR6: Lifecycle integration**

- **Description:** Every skill and agent that today commits project artifacts on the branch uses push when the active project is `synced`; every arrival path pulls before reading artifacts. `shared` and `local` keep their current behavior.
- **Acceptance Criteria:**
  - Bookkeeping points in implementation, review-receive (local and remote), revise, reconcile, summary, document, retro, discover, spec, design, plan, quick-start, import-plan, complete, and brainstorm fold-back/reference-file paths push for `synced` projects.
  - Arrival paths (progress, worktree bootstrap interactive and auto, cloud dispatch orientation, implement resume) pull for `synced` projects.
  - Scope is detected from the active project, not from user input, at every site.
  - No skill ever stages the `synced` artifact directory into the parent branch.
- **Priority:** P0

**FR7: PR review links**

- **Description:** PR descriptions carry a delimited block of pinned links to reviewer-facing artifacts, kept current while the PR is open.
- **Acceptance Criteria:**
  - The block links `discovery.md`, `design.md`, and `summary.md`, each only when present on the ref at the pinned commit.
  - `plan.md`, `state.md`, `implementation.md`, and review artifacts are never linked.
  - Links resolve to rendered content on the git host at the pinned commit and remain valid after the project completes (ref retained per FR8).
  - The block is delimited so that refreshing replaces it idempotently without touching the rest of the PR body.
  - The block is refreshed on push while the project's PR is open; refresh failure (no CLI, no auth) warns and does not fail the push.
  - After the summary is exported to its durable dated location, the durable path is appended to the block; the ref link is never removed or replaced.
- **Priority:** P0

**FR8: Completion parity and ref retention**

- **Description:** Completing a `synced` project behaves as completing a `shared` project today, and the project ref is retained.
- **Acceptance Criteria:**
  - Local archive snapshot, dated S3 snapshot, and dated tracked summary export happen exactly as for `shared`.
  - The archived snapshot contains no git worktree metadata.
  - The artifact checkout is removed cleanly (no stale worktree registration).
  - The ref is retained on `origin` after completion.
  - The discovery record reflects completion.
- **Priority:** P0

**FR9: Gitignore management**

- **Description:** The managed OAT gitignore block ignores `synced` artifact directories while leaving discovery records tracked.
- **Acceptance Criteria:**
  - Applying the block on a repository that already has it upgrades it idempotently.
  - `synced` artifact directories are ignored; the per-project discovery records are not.
  - Project creation in `synced` scope verifies the ignore rule is present and applies the block if missing, including the change in the scaffold commit.
- **Priority:** P0

**FR10: Multi-worktree independence**

- **Description:** Each git worktree of a repository holds its own artifact checkout for a `synced` project; checkouts reconcile through the remote ref.
- **Acceptance Criteria:**
  - Two worktrees can each pull the same project without interfering.
  - A push from one worktree followed by a pull in the other yields identical artifact content.
  - Removing a parent worktree does not break pull in the remaining worktrees.
- **Priority:** P0

**FR11: Prune**

- **Description:** An explicit command removes a `synced` project's ref, local ref, checkout, and discovery record.
- **Acceptance Criteria:**
  - Refuses without a force flag when the project's PR is still open.
  - Warns that pinned PR links will stop resolving.
  - Removes remote ref, local ref, checkout registration, and discovery record.
- **Priority:** P1

**FR12: Migration from `shared`**

- **Description:** A migration command converts an in-flight `shared` project to `synced`.
- **Acceptance Criteria:**
  - Moves artifact content with history-free initial commit onto a new ref and creates the checkout.
  - Removes the tracked artifact files from the branch and adds the discovery record in a single commit.
  - Updates the active project pointer if it referenced the migrated project.
  - Refuses on a dirty artifact directory.
- **Priority:** P1

**FR13: Doctor checks**

- **Description:** Doctor reports `synced`-scope health.
- **Acceptance Criteria:**
  - Warns when a discovery record exists but the checkout is absent (with the pull command as the fix).
  - Warns when the local ref is behind or ahead of the remote ref.
  - Warns on uncommitted artifact changes.
  - Fails when `synced` artifact files are tracked on the branch.
  - Hints when editor nested-repository detection settings would improve the experience.
- **Priority:** P1

**FR14: Documentation**

- **Description:** Bundled docs describe the three-scope model and the reviewer experience.
- **Acceptance Criteria:**
  - File-locations, directory-structure, project-workflow, and worktree docs cover `synced`.
  - A reviewer-facing page explains the discovery record and pinned links.
  - Docs build passes.
- **Priority:** P0

**FR15: `shared` rendering courtesy**

- **Description:** A managed git attributes entry marks `shared` artifacts as generated for the git host's diff view.
- **Acceptance Criteria:**
  - Applied idempotently alongside the gitignore block.
  - Does not affect `synced` or `local`.
- **Priority:** P2

### Non-Functional Requirements

**NFR1: Backward compatibility**

- **Description:** `shared` and `local` projects behave exactly as today.
- **Acceptance Criteria:**
  - Existing `shared` projects are listed, resumed, committed, and archived without behavior change.
  - Repositories that have not upgraded their gitignore block continue to work for `shared` and `local`.
  - Existing test suites for project creation, archive, and gitignore pass unchanged except for additive cases.
- **Priority:** P0

**NFR2: Zero host-side footprint**

- **Description:** Artifact pushes have no visible effect on the git host beyond the ref itself.
- **Acceptance Criteria:**
  - No CI workflow triggers on artifact pushes without any per-repo configuration.
  - The ref does not appear in branch lists or match branch-protection patterns.
- **Priority:** P0

**NFR3: No new credentials**

- **Description:** Full continuity requires only git access to `origin`.
- **Acceptance Criteria:**
  - Pull and push succeed with git credentials alone; no cloud credentials are consulted.
- **Priority:** P0

**NFR4: Safety of sync operations**

- **Description:** Sync commands cannot damage the parent checkout.
- **Acceptance Criteria:**
  - No sync command runs unscoped staging in the parent worktree.
  - No sync command modifies files outside the project's artifact directory (other than the discovery record and gitignore block at creation/migration).
  - No sync command force-pushes.
- **Priority:** P0

**NFR5: Idempotence and resumability**

- **Description:** Push and pull are safe to repeat and to resume after interruption.
- **Acceptance Criteria:**
  - Running pull twice in a row is a no-op the second time.
  - An interrupted rebase can be resumed or aborted with a documented command.
- **Priority:** P1

**NFR6: Release hygiene**

- **Description:** Shipped changes follow repository release policy.
- **Acceptance Criteria:**
  - Every touched skill has its version bumped in the same PR.
  - The five public packages bump in lockstep.
  - All Definition-of-Done gates pass.
- **Priority:** P0

## Constraints

- Git is the sole transport for in-flight artifacts; the design must not introduce cloud or service dependencies for continuity.
- Artifact directories must remain inside the repository root: OAT's active-project validation rejects paths outside it.
- Project scope is a directory convention today, not a typed value; the design must not break sibling-scope derivation used by archive.
- Archive copies and then deletes the project directory; the design must ensure worktree metadata is neither copied nor left registered.
- Skills resolve projects through `activeProject` and a `PROJECTS_ROOT` fallback; the design must work with that resolution idiom rather than replace it across 26 skills.
- Only one git host (GitHub) is guaranteed to render commit-pinned blob links; other hosts must degrade gracefully.
- The custom ref namespace must not be `refs/heads/*`, `refs/tags/*`, or `refs/remotes/*`.
- Skill edits require version bumps; `.agents/skills`, `.oat/templates`, and docs count as shipped functionality for lockstep package bumps.

## Dependencies

- Git worktree and ref plumbing (detached worktrees, custom refspecs, rebase).
- The `gh` CLI for PR-body refresh (optional at runtime; absence degrades to a warning).
- Existing OAT components: project scaffold, managed gitignore block, archive-on-completion routine, config catalog, doctor check aggregator, control-plane project state parsing.
- Existing lifecycle skills and agents enumerated under FR6.
- Existing `oat-project-pr-final`, `oat-project-pr-progress`, and `oat-project-complete` PR-body handling.

## High-Level Design (Proposed)

A `synced` project keeps its artifacts at the standard per-scope path, but that directory is a detached git worktree checked out from a per-project ref in a custom namespace. The parent branch ignores the directory; the nested worktree tracks it. Agents and skills read and write files exactly as they do today. Two new commands — push and pull — move artifact history between the local checkout and `origin`, replacing the bookkeeping commits skills make on the branch today. A per-project discovery record on the branch tells arriving agents that a project exists and how to pull it.

A links component produces a delimited PR-body block of commit-pinned links to reviewer-facing artifacts, derived from the ref's current commit and the origin URL. PR-creating skills embed the block; push refreshes it while a PR is open. Completion reuses the existing archive routine with two adjustments: exclude worktree metadata from the snapshot and unregister the checkout instead of deleting a plain directory. The ref is retained so links persist.

**Key Components:**

- Scope resolution — derives a project's scope from its path and detects `synced` checkouts; supplies the default scope for creation.
- Ref sync engine — fetch, rebase, commit, push, conflict reporting, worktree creation and removal for the project ref.
- Discovery record — tracked per-project file; created, updated, and removed by lifecycle commands.
- Gitignore/gitattributes management — extends the managed block for the new scope and the `shared` courtesy attribute.
- PR links — computes the pinned-link block and refreshes an open PR's body.
- Archive integration — worktree-aware snapshot and cleanup at completion.
- Doctor checks — health diagnostics for the new scope.
- Skill integration — scope-aware push/pull at bookkeeping and arrival sites; scope-aware PR-body assembly.

**Alternatives Considered:**

- Collapse artifacts in the diff view (`linguist-generated`) — rendering-only; artifacts still reach `main` and bots. Retained only as a courtesy for `shared`.
- S3 as the live transport for `local` scope — adds credentials to every session, loses history and explicit conflict resolution.
- A real branch instead of a custom ref — browsable, but triggers CI and clutters branch lists in every repository that adopts OAT.
- Single shared checkout across worktrees — fewer moving parts but two agents editing the same files live with no conflict markers.

_Design-related open questions are tracked in the [Open Questions](#open-questions) section below._

## Success Metrics

- Artifact files in PR diffs for `synced` projects: zero (only the discovery record may appear).
- Resume time on a fresh worktree: one pull command, no manual steps.
- Reviewer link validity after completion: 100% of pinned links resolve.
- Regression: all existing project, archive, gitignore, and skill-validation tests pass.
- Adoption: `synced` is the default for new projects in a freshly initialized repository.

## Requirement Index

| ID   | Description                                                    | Priority | Verification                                         | Planned Tasks     |
| ---- | -------------------------------------------------------------- | -------- | ---------------------------------------------------- | ----------------- |
| FR1  | `synced` scope: ignored on branch, versioned on custom ref     | P0       | integration: scaffold + check-ignore + ref history   | TBD - see plan.md |
| FR2  | Default scope `synced`, explicit `--scope` selection           | P0       | unit: scope option + default config                  | TBD - see plan.md |
| FR3  | Push: fetch, rebase, commit, publish; parent index untouched   | P0       | integration: push against bare origin                | TBD - see plan.md |
| FR4  | Pull: create or rebase checkout; conflict reporting; continue  | P0       | integration: fresh-clone pull, conflict flow         | TBD - see plan.md |
| FR5  | Tracked per-project discovery record                           | P0       | unit: record schema; integration: concurrent add     | TBD - see plan.md |
| FR6  | Lifecycle skills push/pull for `synced`                        | P0       | manual: skill walkthrough; unit: skill validation    | TBD - see plan.md |
| FR7  | PR links block: pinned, delimited, refreshed, summary appended | P0       | unit: block rendering; integration: gh edit (mocked) | TBD - see plan.md |
| FR8  | Completion parity, clean worktree removal, ref retained        | P0       | integration: archive of synced project               | TBD - see plan.md |
| FR9  | Gitignore block ignores dirs, tracks records                   | P0       | unit: block generation; integration: check-ignore    | TBD - see plan.md |
| FR10 | Independent checkout per worktree                              | P0       | integration: two-worktree push/pull round trip       | TBD - see plan.md |
| FR11 | Prune with open-PR guard                                       | P1       | integration: prune flows                             | TBD - see plan.md |
| FR12 | Migrate `shared` → `synced`                                    | P1       | integration: migrate fixture project                 | TBD - see plan.md |
| FR13 | Doctor checks                                                  | P1       | unit: doctor check module                            | TBD - see plan.md |
| FR14 | Documentation                                                  | P0       | manual: docs build + review                          | TBD - see plan.md |
| FR15 | `shared` linguist-generated attribute                          | P2       | unit: gitattributes block                            | TBD - see plan.md |
| NFR1 | `shared`/`local` unchanged                                     | P0       | unit + integration: existing suites pass             | TBD - see plan.md |
| NFR2 | No CI / branch-list footprint                                  | P0       | manual: push to test repo with a workflow            | TBD - see plan.md |
| NFR3 | Git credentials only                                           | P0       | integration: no cloud env consulted                  | TBD - see plan.md |
| NFR4 | Sync never touches parent index; never force-pushes            | P0       | integration: parent status unchanged after push/pull | TBD - see plan.md |
| NFR5 | Idempotent, resumable                                          | P1       | integration: double pull; interrupted rebase         | TBD - see plan.md |
| NFR6 | Release hygiene                                                | P0       | manual: DoD gates                                    | TBD - see plan.md |

**Notes:**

- ID: Unique requirement identifier (FR# for functional, NFR# for non-functional)
- Description: Brief 1-sentence summary of the requirement
- Priority: P0 (must have) / P1 (should have) / P2 (nice to have)
- Verification: How this will be verified — format is `method: pointer`
- Planned Tasks: Filled in during planning phase to ensure traceability

## Open Questions

- **Discovery record location:** Inside the `synced` scope directory as a sibling of the ignored artifact directories, or in a separate index directory? The former keeps everything scope-local; the ignore rule must then distinguish directories from files.
- **Project enumeration:** Skills and `oat project list` enumerate `PROJECTS_ROOT`; how do `synced` projects appear in listings when `projects.root` still points at `shared`?
- **Default-scope configuration:** New config key versus reinterpreting `projects.root`.
- **Detached HEAD bookkeeping:** How the local ref is advanced after each commit in a detached checkout, and how concurrent worktrees share it.
- **Initial ref creation:** Empty-tree root commit versus first scaffold commit.
- **Non-GitHub hosts:** What the links block contains when the origin is not GitHub.
- **PR refresh ownership:** CLI push refreshes automatically when a PR is recorded in state, versus skills calling an explicit command.
- **Nested worktree and parent operations:** Behavior of `git worktree remove` on a parent that contains a nested (ignored) worktree; behavior of `git clean -x`.
- **Local-path sync:** Ensure worktree bootstrap's local-path copying never copies a nested worktree.

## Assumptions

- The git host renders blob URLs for any commit object it holds, including commits reachable only from custom refs, while those objects are retained.
- Custom ref namespaces are not matched by CI push triggers, branch protection, or branch listings on GitHub.
- Git allows multiple detached worktrees at the same commit within one repository.
- Gitignore resolution stops at a worktree's top level.
- Editors register a nested repository when a file inside it is opened.

## Risks

- **Nested worktree confuses tooling:** Formatters, linters, or parent git operations stumble on the nested checkout.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation:** Managed ignore rule; doctor check; fallback placement outside the tree with a symlink if a concrete tool breaks.
- **Skill sweep misses a commit site:** A skill still commits artifacts on the branch for a `synced` project.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Inventory-driven sweep (recon identified ~20 sites); doctor check for tracked files under the synced directory; skill validation test.
- **Archive copies worktree metadata or leaves a stale registration:**
  - **Likelihood:** High if unaddressed
  - **Impact:** Medium
  - **Mitigation:** Explicit exclusion and worktree-aware removal in the archive routine; integration test.
- **Stale pinned links:** Refresh skipped; reviewers read an older design.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Refresh on push while a PR is open; show the pinned commit short SHA and date in the block.
- **Concurrent push race:** Two worktrees push simultaneously; one is rejected.
  - **Likelihood:** Low
  - **Impact:** Low
  - **Mitigation:** Push reports rejection with "pull then push again"; never forces.

## References

- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
