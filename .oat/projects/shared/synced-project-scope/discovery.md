---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-26
oat_generated: false
---

# Discovery: synced-project-scope

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Reviewers and people looking at OAT-driven PRs see a pile of project artifacts (discovery, design, plan, implementation, state) as walls of text in the diff. That is distracting and unhelpful, and the maintainer agrees. At the same time those artifacts are what keep agents on track when a project spans multiple PRs, sessions, worktrees, or machines. Completed projects are archived to S3 so they can always be pulled up for reference. Normally a project is completed before review specifically to strip that noise, but when a project spans several PRs, reviewers see what looks like garbage mid-flight.

Additional constraints surfaced during brainstorming:

- Automated code-review bots should not read the artifacts either — they waste tokens and produce off-target comments on agent-facing prose.
- Artifacts that are irrelevant to other contributors should not accumulate on `main`.
- Reviewers should still be able to _read_ the design, discovery, and summary from the PR when they want to.
- The existing completion behavior — local archive, dated S3 snapshot, dated tracked summary export — must be preserved.

## Clarifying Questions

### Question 1: Where does the friction bite?

**Q:** Is it the PR Files-changed tab, artifacts landing on `main`, or both?
**A:** Files-changed is the biggest, but artifacts sitting in the repo that are irrelevant to others is also not great. Bots reading them is a further concern.
**Decision:** A rendering-only fix (collapsing files in the diff view) is insufficient. Artifacts must be absent from the PR diff and from `main` entirely.

### Question 2: What carries artifacts between machines and worktrees today?

**Q:** Git branch push/pull, S3, or shared filesystem?
**A:** Git push/pull of the branch is the whole mechanism; S3 is completion-only (though `oat repo archive sync` can pull archived projects for reference).
**Decision:** The replacement transport must preserve "git is all an agent needs" for in-flight projects. S3 stays the completion archive.

### Question 3: Why do projects end up in `shared` scope rather than `local`?

**Q:** Cross-machine sync, cross-worktree visibility, discoverability, or just the default?
**A:** Mainly cross-machine, and it is just the default.
**Decision:** The new scope must sync across machines and become the default; `local` keeps its current "never leaves this box" meaning.

### Question 4: Where do agents run?

**Q:** Only maintainer-controlled machines with S3 creds, hosted/cloud agents, or contributors' machines?
**A:** Mainly maintainer-controlled machines with S3 credentials.
**Decision:** S3 live sync would be viable, but git-based transport was preferred because it adds no credential dependency and preserves history and conflict visibility.

### Question 5: Reviewer access after completion

**Q:** Prune the ref on completion (links die), retain the ref (links live), or also publish design docs into the repo?
**A:** Retain the ref by default; link design/discovery by pinned SHA; prune on demand.
**Decision:** Ref retention is the default. A `publish`-style config for landing design docs as repo documentation is deferred.

### Question 6: Summary link behavior

**Q:** When the summary is exported to its durable dated location at completion, should the PR link swap from the ref copy to the durable copy?
**A:** Open to either; leaning "leave it as the ref, it's the same file."
**Decision:** Keep the ref link as canonical and _append_ the durable path when it exists; never replace. Link the summary whenever it exists on the ref.

### Question 7: Editor diff experience

**Q:** Will in-editor diffs for plan/design still be visible?
**A:** Wants to confirm the tradeoff.
**Decision:** Acceptable. The artifact directory becomes its own repository from the editor's point of view: gutter diffs and history still work, shown as a second Source Control entry. The single unified code+artifact diff goes away, which mirrors exactly the separation reviewers asked for.

## Solution Space

### Approach 1: Side ref — artifacts versioned on a per-project git ref _(Recommended)_

**Description:** In-flight artifacts live in a directory that is gitignored from the work branch's perspective but is itself a git worktree checked out from a dedicated per-project ref outside `refs/heads/` (e.g. `refs/oat/projects/<slug>`). Agents push/pull that ref through `oat`; PRs, `main`, CI, branch lists, and review bots never see the artifacts. Reviewers read them via SHA-pinned links in the PR body.
**When this is the right choice:** Git is already the trusted transport; no new credential dependency is wanted; artifact history and explicit conflict resolution are valued.
**Tradeoffs:** New sync commands and a conflict story; a nested `.git` file inside the main worktree; no "latest" URL on GitHub (custom refs are not browsable by name), so PR links are pinned snapshots that need refreshing on push.

### Approach 2: Collapse in review — keep artifacts on the branch, hide them

**Description:** Mark the tracked artifact directory `linguist-generated` so GitHub collapses it in Files-changed, and add a PR-body convention telling reviewers to skip it.
**When this is the right choice:** Only the diff-view noise matters; contributors do not mind artifacts on `main`; bots are configured per-repo to ignore the path.
**Tradeoffs:** Rendering-only. Artifacts still land on `main`, still count in file totals, and each review bot needs its own exclude config — some read everything regardless. Demoted to a courtesy for the explicit `shared` scope.

### Approach 3: S3 as the live transport for `local` scope

**Description:** Keep artifacts gitignored and sync them continuously to the existing S3 archive layout instead of only at completion; add a same-machine cross-worktree fix.
**When this is the right choice:** Every agent environment already has bucket credentials and offline/fresh-clone use does not matter.
**Tradeoffs:** Credentials in every agent session; no artifact history unless snapshots are versioned; last-writer-wins conflicts; cross-worktree on one machine needs a separate fix; largest shift from "artifacts are versioned with the code."

### Approach 4: Real branch instead of custom ref

**Description:** Same mechanics as Approach 1 but on a normal branch (`oat/projects/<slug>`), giving a live browsable URL on GitHub.
**When this is the right choice:** A live "browse the project" URL is more important than avoiding noise.
**Tradeoffs:** Every artifact push fires `on: push` CI unless every workflow filters the branch pattern (a setup step OAT cannot enforce in users' repos); branch-list clutter, "compare & pull request" banners, stale-branch bots. Relocates the original complaint.

### Chosen Direction

**Approach:** Approach 1 — side ref in a custom namespace, retained after completion, with SHA-pinned links in the PR body.
**Rationale:** It changes _where in git_ artifacts live, not _how_ agents get them. No new credentials, history for free, conflicts surface as ordinary git conflicts, and a custom ref namespace is invisible to GitHub UI, CI triggers, and branch protection while still fully shared through `origin`. Pinned snapshots are arguably the better review semantics anyway — plans and designs should barely change after a PR opens. Retaining the ref keeps links valid forever at zero cost and removes the incentive to "complete early" just to strip PR noise.
**User validated:** Yes

## Options Considered

### Option A: Scope model — three scopes

**Description:** `shared` (tracked on the branch, explicit opt-in, gets `linguist-generated` as a courtesy), `synced` (new; gitignored on the branch, versioned on the per-project ref, new default), `local` (gitignored, no ref, never leaves the machine — unchanged).

**Pros:**

- `local` keeps its promise; users who chose it for privacy are not surprised.
- Each scope is one sentence; `shared` stays exactly as today so nobody is forced to migrate.
- Feature is purely configuration — opt-out to `shared` remains available.

**Cons:**

- One more scope to document and reason about in every skill that resolves project paths.

**Chosen:** A

**Summary:** Add a `synced` scope as the default rather than growing `local` a remote.

### Option B: Worktree placement — in place vs. outside + symlink vs. config-resolved

**Description:** The ref checkout can sit directly at the existing artifact path (nested worktree with a `.git` file), live in the git common dir or a user home with a symlink at the existing path, or live outside with skills resolving the path via `oat`.

**Pros (in place):**

- Zero path changes for skills and agents.
- Editors detect the nested repository directly; symlinked repos are flakier for editor detection.

**Cons (in place):**

- A foreign `.git` file inside the main worktree; some tooling may notice.
- Editor auto-scan is shallow by default; a settings hint may be needed for the panel to show the artifact repo before a file is opened.

**Chosen:** In place for the first cut; revisit common-dir + symlink if the nested `.git` file bites tooling.

**Summary:** Keep the path everyone already knows; the parent gitignore rule is what makes the nested checkout invisible to the branch.

### Option C: Same-machine multi-worktree — detached checkout per worktree vs. one shared checkout

**Description:** Each worktree of the repo holds its own detached checkout of the ref and syncs through the remote, or all worktrees share a single checkout in the git common dir.

**Pros (per-worktree):**

- Two agents never edit the same files live; collisions surface as conflict markers, not silent corruption.
- Mechanically identical to two clones on one branch.

**Cons (per-worktree):**

- Requires the pull-before-push discipline to keep conflict windows short.

**Chosen:** Detached checkout per worktree; shared checkout may become an opt-in later.

**Summary:** Isolation by default, sync via the remote ref.

## Key Decisions

1. **Transport:** In-flight artifacts are versioned on a dedicated per-project git ref outside `refs/heads/`, pushed and pulled by `oat`. Git remains the only thing an agent needs.
2. **Default scope:** New projects default to `synced`. `shared` is explicit opt-in and unchanged; `local` is unchanged.
3. **Branch hygiene:** The artifact directory stays gitignored on the work branch. The only artifact-related tracked file is a small manifest that tells the next agent a project exists and how to pull it.
4. **Bookkeeping:** Wherever lifecycle skills commit `state.md` / `plan.md` / `implementation.md` today, they push the ref instead. Wherever they resume a project (progress, worktree bootstrap, cloud dispatch), they pull first.
5. **Conflict policy:** Rebase on pull; agents are expected to resolve conflicts in place and continue. Pull immediately before each bookkeeping push, push immediately after.
6. **Reviewer access:** The PR body carries SHA-pinned links to `discovery.md`, `design.md`, and `summary.md` (whenever each exists on the ref), refreshed on each push. `plan.md`, `state.md`, and `implementation.md` are never linked — they are for the machine.
7. **Ref retention:** Refs are retained after completion by default so links never rot; pruning is an explicit on-demand action.
8. **Summary export:** Completion continues to export `summary.md` to the configured dated tracked location. The PR link to the ref copy is canonical; the durable path is appended when it exists, never swapped in.
9. **Completion semantics:** Because PRs no longer carry artifact noise, "complete" can mean "actually done" and happen after merge rather than before review.

## Constraints

- `shared` scope behavior must be byte-for-byte unchanged for users who keep it.
- Completion archive behavior (local `archived/`, dated S3 snapshot, `oat repo archive sync`, dated summary export) must be preserved.
- Artifact pushes must not trigger CI, appear in branch lists, or be subject to branch protection in users' repos.
- No new credential requirement for agents beyond git access to `origin`.
- Skills that touch project bookkeeping require version bumps; the public package set requires a lockstep bump.

## Success Criteria

- A multi-PR project run in `synced` scope produces PRs whose diffs contain code plus at most the small manifest — no discovery/design/plan/state/implementation files.
- A fresh worktree or machine can resume a `synced` project from the branch alone, with no S3 credentials, and see current artifacts.
- Review bots see no artifact prose in the diff.
- A reviewer can open rendered `design.md`, `discovery.md`, and `summary.md` from links in the PR body, and those links still resolve after the project completes.
- Two worktrees updating the same project surface conflicts as ordinary git conflicts an agent can resolve.
- In-editor gutter diffs and history for artifact files continue to work.
- Existing `shared` and `local` projects behave exactly as before.

## Out of Scope

- Rendering-only mitigations for `shared` scope beyond a `linguist-generated` courtesy attribute.
- S3 as a live (mid-project) transport.
- A `publish` config that lands design docs in the repo as durable documentation.
- A shared (non-detached) single checkout across worktrees on one machine.
- A GitHub-browsable "latest" URL for artifacts (would require a real branch).

## Deferred Ideas

- **Reduce bookkeeping churn** (squash artifact commits per PR) — moot once artifacts leave the branch; revisit only if ref history becomes noisy.
- **Human-facing `STATUS.md` digest** at the project root — pinned links to design/discovery/summary cover the reviewer need for now.
- **S3 live sync as a second transport** — all agent hosts have creds today, so it is viable later; not needed for v1.
- **`publish` list for design docs as repo documentation** — a separate "the design is a doc" decision.
- **Shared checkout in the git common dir** — possible opt-in if per-worktree isolation proves annoying.

## Open Questions

- **Manifest shape:** What minimum fields let an agent discover and pull a project from a branch (slug, scope, ref name, phase, last pushed commit?), and how is it kept from becoming a merge-conflict magnet across PRs?
- **Conflict UX:** What does the pull command report on conflict, and how does a skill hand the resolution to the agent and resume?
- **Migration:** How do in-flight `shared` projects move to `synced` (one visible deletion commit on the branch), and is `local` → `synced` supported?
- **Editor detection:** Default nested-repo scanning is shallow; should docs, `oat doctor`, or init emit a settings hint so the artifact repo appears in the Source Control panel before a file is opened?
- **PR-body refresh:** Which skills own writing and refreshing the pinned links (final PR, mid-project PR), and how is the block delimited so refreshes are idempotent?
- **Ref namespace naming:** Exact namespace and whether the slug alone is unique enough across scopes.
- **Prune command semantics:** Does prune delete the remote ref, local ref, and worktree together, and what protects against pruning a project whose PR is still open?
- **Nested worktree lifecycle:** What happens on `git worktree remove` of the parent, on clone, and when the artifact directory is missing but the manifest says the project exists?
- **Brainstorm fold-back:** The brainstorm skill's fold-back and reference-file commits assume branch commits; they need the same push path when the active project is `synced`.

## Assumptions

- GitHub renders `blob/<sha>/<path>` for any commit object present in the repository, including commits reachable only from refs outside `refs/heads/`, for as long as the object is retained. Retaining the ref guarantees retention.
- Custom ref namespaces are not matched by GitHub Actions `on: push` triggers, branch protection rules, or branch listings.
- Git permits multiple detached worktree checkouts of the same ref within one repository.
- Gitignore lookup stops at a worktree's top level, so the parent's ignore rules do not apply inside the nested worktree.
- VS Code / Cursor register a nested repository when a file inside it is opened, even if the automatic subfolder scan does not reach it.

## Risks

- **Nested `.git` file confuses tooling:** Linters, formatters, or `git add -A` in the parent could stumble on the nested checkout.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Parent gitignore rule; `oat doctor` check; fall back to common-dir placement with a symlink if a concrete tool breaks.
- **Skipped pull leads to a conflicting push:** An agent that edits artifacts without pulling first will hit a rejected push.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Push command always fetches and rebases first; skill guidance; short bookkeeping windows.
- **Stale pinned links in the PR body:** If the refresh step is skipped, reviewers read an older design than the PR implements.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Refresh links as part of the push path when a PR is open; show the pinned commit date next to the links.
- **Skill sweep misses a bookkeeping commit site:** A skill that still commits artifacts on the branch would leak them into a PR.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Inventory every skill and agent that commits project artifacts before implementation; a doctor check that flags tracked files under the synced directory.
- **GitHub garbage-collects unreachable commits:** Only relevant if a ref is pruned; retained refs are safe.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Retain by default; warn on prune when a PR referencing the ref is open.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
