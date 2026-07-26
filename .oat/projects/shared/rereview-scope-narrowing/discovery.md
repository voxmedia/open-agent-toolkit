---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-26
oat_generated: false
---

# Discovery: rereview-scope-narrowing

## Initial Request

Make re-review scope narrowing the default behavior, and allow it to be turned
off as an explicit override rather than opted into.

Today `workflow.autoNarrowReReviewScope` is three-valued: `true` narrows
silently, `false` always uses full scope, and unset — the shipped default —
prompts the user on every re-review. The request inverts that so the common
case costs nothing and only the exception needs configuring.

The request arrived out of a review of upstream feedback on slow OAT final
reviews (`slow-review-feedback.md`), which measured two same-scope final
reviews of an unchanged code base costing roughly 20 minutes each and
producing identical findings. Re-reviewing already-reviewed code is the cost
this change attacks.

## Clarifying Questions

### Question 1: Prompt retention

**Q:** If unset comes to mean "narrow", should there still be any way to reach
the interactive confirm prompt?
**A:** Drop the prompt entirely — unset and `true` narrow; `false` uses full
scope.
**Decision:** The preference stays a real boolean instead of growing into an
enum. The confirm prompt is removed from the re-review path rather than being
relocated behind another setting. Pre-existing per-invocation flags on the
remote rail are unaffected.

### Question 2: Handling the unsound narrowing path

**Q:** The local project rail narrows by grepping commit messages for fix-task
IDs over a fixed lookback window, with no staleness guard. How should that be
handled relative to the default flip?
**A:** Fix it to guarded `prior_reviewed_sha..HEAD` semantics as part of this
change.
**Decision:** Sound narrowing semantics are treated as a precondition of the
default flip, not as follow-up work. The flip and the semantics fix ship
together.

### Question 3: Workflow

**Q:** How should this be executed given it touches CLI config, skill
contracts, and docs?
**A:** Quick workflow.
**Decision:** Discovery straight to plan, no formal spec.

## Solution Space

The request looked like a one-line default change. Inspecting the
implementation showed it is not, because narrowing is implemented twice with
materially different safety properties, and the weaker of the two is the one
the default flip would silently activate.

**Remote rail** (`oat-project-review-provide-remote`, `oat-review-provide-remote`)
narrows to the range between the prior review's recorded head commit and the
current head, restricted to a prior review of the same project and scope. It
runs a two-step staleness guard — the prior commit must exist locally and be
an ancestor of the current head — and falls back to full scope when the guard
fails. The narrowing is complete: every commit since the last review is
reviewed, so nothing escapes across the union of passes.

**Local rail** (`oat-project-review-provide`) narrows to only those commits
whose messages match completed review-fix task IDs, searched over a fixed
recent-commit window, with no staleness guard. Any commit made since the prior
review that is not tagged as a review fix — an untagged correction, a merge
from the trunk, a rebase that rewrote messages — is excluded. The fixed
lookback window is also a hard ceiling: work older than the window is invisible
to it. Today a human confirms that subset at a prompt.

Both rails read the same preference key.

### Approach 1: Align the local rail to the remote rail's semantics, then flip _(Recommended)_

**Description:** Give the local rail the same prior-reviewed-commit range and
the same staleness guard the remote rail already uses, then change the
preference default so unset narrows and remove the prompts.
**When this is the right choice:** When silent narrowing is about to become the
default and the narrowing must therefore be trustworthy without human review.
**Tradeoffs:** Larger than a default flip. Requires the local rail to record
the reviewed commit, which it does not do today, so it also touches the review
artifact contract.

### Approach 2: Flip the default only, accept the local rail as-is

**Description:** Change the default and delete the prompts; leave the
commit-message matching in place.
**When this is the right choice:** When the narrowing is already trustworthy
and only the prompt is the friction.
**Tradeoffs:** Converts a human-confirmed partial review into a silent partial
review with known coverage gaps. The prompt is currently the only thing
standing between the weak matching logic and unreviewed code. Rejected.

### Approach 3: Flip the default only on the remote rail

**Description:** Narrow by default where the semantics are sound; leave the
local rail prompting.
**When this is the right choice:** When the two rails are expected to diverge
permanently.
**Tradeoffs:** One preference key would produce two different behaviors, which
is harder to explain than either behavior alone. The local rail is also the
one that runs during ordinary project work, so most of the benefit would be
missed. Rejected.

### Chosen Direction

**Approach:** Approach 1 — align the local rail's semantics, then flip the
default and drop the prompts.
**Rationale:** A silent default is only acceptable when the thing being
silently applied is correct. Aligning the rails also collapses a documented
divergence rather than deepening it.
**User validated:** Yes — explicitly chosen at the clarifying-questions gate.

## Options Considered

### Option A: Source the prior reviewed commit from the review artifact

**Description:** Record the reviewed head commit in each local review artifact
as it is written, and read the most recent same-scope artifact when narrowing.

**Pros:**

- Mirrors how the remote rail already works, so the rails converge.
- The reviewed commit lives with the review that made the claim.
- Artifacts written before this change simply lack the field, which falls back
  to full scope — the safe direction.

**Cons:**

- Touches the review artifact contract, so the reviewer must be changed too.
- No narrowing benefit until at least one review has been written under the
  new contract.
- **Does not survive receive.** Consumed review artifacts are archived into an
  untracked location, so the artifact holding the reviewed commit disappears
  from version control once a review has been received. On another machine, in
  a fresh worktree, or after cleanup, the provenance is simply gone and every
  re-review falls back to full scope. Safe, but the benefit evaporates in
  precisely the multi-machine and worktree flows the toolkit encourages.

### Option A′: Artifact field plus a durable tracked record _(chosen refinement)_

**Description:** Record the reviewed head commit on the review artifact as the
primary source, and additionally persist it on the tracked plan review row,
which already carries scope, type, status, date, and artifact path and is
protected by an existing preservation rule.

**Pros:**

- Provenance travels with the branch, so it survives receive, archival,
  cleanup, fresh clones, and worktree hand-offs.
- The plan review row is already the durable ledger of what was reviewed, so
  the reviewed commit belongs there on its own merits.
- Degrades cleanly: artifact when present, tracked row otherwise, full scope
  when neither.

**Cons:**

- Two writers must stay consistent, and a disagreement between them needs a
  defined resolution.
- Widens the change to the plan review-row shape.

**Chosen:** A′

### Option B: Source it from the implementation exit-gate state

**Description:** Reuse the reviewed-head and freshness checkpoint fields the
exit-gate machinery already maintains in project state.

**Pros:**

- The data already exists and is already maintained.
- No review artifact contract change.

**Cons:**

- Those fields describe the configured exit gate, not the ordinary lifecycle
  review, so they are absent or wrong for manual and auto reviews.
- Couples the ordinary re-review path to gate-specific bookkeeping.

**Chosen:** Neither as originally framed — superseded by A′ above.

**Summary:** Record the reviewed head commit on the review artifact, matching
the remote rail, and mirror it onto the tracked plan review row so the
provenance survives artifact archival. Fall back to full scope whenever neither
source yields a usable commit. Option B was rejected on evidence: during the
incident that motivated this work, the exit-gate state fields described a
blocked gate run and would have been useless provenance for the manual final
review that actually happened.

## Key Decisions

1. **Default inversion:** Unset narrows. `false` is the explicit opt-out.
   `true` stays accepted and behaves as before, so existing configuration keeps
   working.
2. **Prompt removal:** The interactive confirm disappears from both rails
   rather than moving behind another setting. The preference remains a boolean.
   One-off full-scope review does not depend on the prompt: the local rail's
   scope resolution already gives explicit user input priority, so passing a
   base commit or an explicit range remains a per-invocation escape hatch, and
   the remote rail keeps its existing narrowing flags. No capability is lost
   with the prompt.
3. **Semantics alignment:** The local rail adopts prior-reviewed-commit-to-head
   ranges with an existence-and-ancestry guard, replacing commit-message
   matching and the fixed lookback window.
4. **Reviewed commit provenance is dual and durable:** The review artifact
   records the head commit it reviewed, and the tracked plan review row mirrors
   it. The artifact is the primary source; the tracked row is what makes the
   provenance survive receive, archival, and machine or worktree boundaries.
   Consumed artifacts are archived into an untracked location, so an
   artifact-only design would lose the provenance exactly when a project moves
   between machines.
5. **Fail open to full scope:** Any unresolvable condition — no prior review,
   missing reviewed commit, failed guard, or disagreement between the two
   provenance sources — falls back to reviewing everything. Narrowing is never
   inferred from ambiguous state.
6. **Freshness reuse is mostly mitigated, not absorbed:** Correct range
   semantics remove most of the redundant-review cost, but not by producing an
   empty range. In the incident that motivated this work, roughly twenty
   bookkeeping commits landed after the passed final review, so the narrowed
   range would have been non-empty while containing no reviewable code. The
   review would still have dispatched, and the reviewer would still have paid
   full lifecycle artifact intake, which narrowing does not reduce at all. The
   improvement is real and large — minutes rather than twenty — but the
   fingerprint-based short-circuit is being declined on cost/benefit grounds,
   not because narrowing makes it unnecessary.
7. **Narrowed reviews must be honest about coverage:** A narrowed re-review
   inspected only part of its nominal scope and cannot regenerate a full
   requirements-coverage claim from its own evidence. Its artifact must name
   the prior artifact and reviewed commit it builds on, so coverage across the
   union of passes is auditable rather than implied.
8. **Narrowing is expected to be intermittent:** The ancestry guard means
   rebases, integration merges, and worktree consolidation frequently
   invalidate a prior reviewed commit. Narrowing pays off on linear stretches
   and fails open elsewhere. This is accepted behavior, not a defect to design
   around.

## Constraints

- Changes under the canonical agents and skills directories count as shipped
  CLI functionality, so the repository's lockstep public package version bump
  applies and `pnpm release:validate` must pass before this is done.
- Every canonical skill changed needs its frontmatter version incremented once
  in the final PR diff.
- The tested narrowing helper module is a reference implementation that does
  not execute at runtime; the skills mirror its logic inline. Any behavior
  change must be applied to both, or CI will keep passing while runtime
  behavior drifts.
- Provider-linked skill views are generated, so canonical sources are edited
  and views refreshed through sync tooling rather than edited directly.
- Narrowing must stay inert for initial reviews, which have nothing to narrow
  against.

## Success Criteria

- A re-review with no preference configured narrows automatically, with no
  prompt and a printed line stating the resolved range and why.
- Setting the preference to `false` produces a full-scope review with no
  prompt.
- The local rail narrows to the range since the prior same-scope review's
  recorded head commit, not to commit-message matches, and applies the same
  existence-and-ancestry guard the remote rail uses.
- A prior reviewed commit that is missing, unreachable, or not an ancestor of
  the current head results in a full-scope review and a stated reason.
- Local review artifacts record the head commit they reviewed, and the tracked
  plan review row carries the same value.
- Narrowing provenance survives a received-and-archived prior review: a
  re-review run from a fresh clone or a different worktree, where the prior
  artifact is no longer present, still narrows from the tracked row.
- A narrowed re-review artifact names the prior artifact and reviewed commit it
  builds on, so the coverage chain across successive passes is auditable.
- Review artifacts written before this change do not narrow anything.
- An initial review is unaffected regardless of the preference.
- Documentation describing the preference matches the new default everywhere it
  appears, and sets the expectation that narrowing applies opportunistically
  rather than on every re-review.

## Out of Scope

- The broader reviewer redesign proposed in the upstream feedback: the
  artifact-first review plan boundary, metadata-only change mapping, delegation
  eligibility rules, and the narrowed re-verification boundary.
- Gate timeout calibration and scope-sized budgets.
- Incremental review artifact writing and the in-progress status guard.
- Wiring the skills to call the tested helper modules at runtime, which is
  already tracked separately as a backlog item.
- Any change to review rigor, severity thresholds, or what a review checks
  within its resolved scope.

## Deferred Ideas

- Making the tested helper modules the runtime for both rails — tracked
  separately; doing it here would swallow this change.
- Skipping a re-review entirely when the resolved range contains no reviewable
  work. This is the case that actually occurs: a literally empty range is rare,
  while a range of bookkeeping-only commits is common after closeout. The
  repository already defines the needed classifier as closeout-only
  descendants, and that definition deliberately refuses to treat a path
  category as sufficient on its own — it requires a corresponding persisted
  gate or sequence transition to own the boundary, and treats unknown or mixed
  work as substantive. So this is a corroboration check rather than a one-line
  path filter, and it changes what a review event means. Deferred on both
  counts, but it is the highest-value follow-on.
- Relaxing the ancestry guard with tree or patch-equivalence comparison so
  narrowing survives rebases and integration merges. Would materially raise how
  often narrowing applies, but needs its own correctness argument.
- Reducing lifecycle artifact intake cost, which narrowing does not touch. This
  is the larger half of the measured review cost and belongs to the
  artifact-first review-plan work in the upstream feedback.

## Open Questions

- **Gate invocations:** Should narrowing apply when a review is invoked by a
  configured independent gate? A configured cross-family exit gate exists to
  produce an independent opinion, and handing it a pre-narrowed range
  partially defeats that purpose — silently, and by default. The same
  distinction was already drawn upstream for freshness reuse, where configured
  independent gates were excluded. Unresolved; it changes default behavior and
  should be settled before planning.

The prior-reviewed-commit provenance question was resolved during discovery,
first to Option A and then to the durable A′ refinement.

## Assumptions

- Local review artifacts are written to a per-project reviews directory with
  parseable frontmatter, and the most recent same-scope artifact can be
  identified from it **while it remains unconsumed**. Once received, it is
  archived out of version control, which is why the tracked row exists.
- Existing consumers of the review artifact tolerate an added frontmatter
  field, and the plan review row can gain a column without breaking the
  preservation rule that forbids deleting existing rows.
- Users who set the preference to `true` today intend narrowing and are
  unaffected by the default change.

## Risks

- **Silent under-review during the transition:** Narrowing becomes automatic
  while some review artifacts still lack a reviewed commit.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Absence of the field falls back to full scope, so the
    transition errs toward reviewing more rather than less. State the resolved
    range and its reason on every re-review so the decision is visible.

- **Module and skill drift:** The behavior change lands in the tested module
  but not the inline skill logic, or the reverse, and no test catches it.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Treat the paired update as a single unit of work and
    verify both surfaces describe the same guard and the same range.

- **Removing the prompt removes a safety net users relied on:** Someone was
  using the prompt as a per-review decision point.
  - **Likelihood:** Low
  - **Impact:** Low
  - **Mitigation Ideas:** The explicit opt-out remains, explicit scope tokens
    still force a one-off full-scope review, the remote rail keeps its
    per-invocation flags, and the resolved range is printed every time.

- **Provenance sources disagree:** The artifact and the tracked row carry
  different reviewed commits, for example after a manual artifact edit or a
  partially applied receive.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Treat disagreement as unresolvable and fall back to
    full scope with a stated reason rather than preferring one source silently.

- **Narrowed reviews accumulate into an unaudited coverage claim:** Successive
  narrowed passes each verify a slice while the review ledger reads as though
  full scope was verified each time.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Require the narrowed artifact to name the prior
    artifact and reviewed commit it builds on, so the chain is explicit and a
    break in it is visible.

- **Benefit is smaller than expected:** Narrowing reduces diff traversal but
  not lifecycle artifact intake, and the ancestry guard fails open often in
  rebase-heavy history.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Set the expectation in documentation rather than
    over-promising. The remaining cost is a known, separately scoped problem.

## Next Steps

Proceed to plan generation (quick mode, straight to plan).
