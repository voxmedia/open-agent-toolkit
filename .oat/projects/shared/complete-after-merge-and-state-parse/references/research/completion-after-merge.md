# p02 completion branch evidence

The executable probes are in
`.agents/skills/oat-project-complete/tests/prepare-completion-branch.test.mjs`.
Run with Node 22 from the repository root, after building the CLI:

```bash
node --test .agents/skills/oat-project-complete/tests/prepare-completion-branch.test.mjs
```

The tests create real disposable Git repositories under `/private/tmp`, a bare
origin, a `release` base, a squash-merged delivery, and an additional upstream
commit. They substitute only `gh` at the executable boundary. The test header
records the field schema captured from real merged PR #419; identifiers in the
probe responses are synthetic. Logs and raw schema capture are local under
`.oat/analysis/complete-after-merge-p02/`.

- **Before:** the Step 2 shell decision from phase base
  `515f630e64becdbc87a6d2cd49b46026590bee32` trusts stored `open`, selects open
  body sync, and commits on the old feature branch. The test proves that commit
  does not descend from the updated base. It preserves that bad commit on its
  own branch and demonstrates the new helper refuses its extra unmerged work.
- **After:** from the exact merged head, live `MERGED` selects `merged` and
  `wasOpen=false`; the prepared branch starts at the fetched `release` SHA,
  includes the new upstream file, and its completion commit changes exactly
  `state.md` and `summary.md`. The actual built p01 `check-state` accepts that
  state. Original URL and empty delivery registration remain unchanged.
- **Accepted controls:** live open retains the existing branch and open-sync
  decision. No tracked URL calls no GitHub observer and returns neither an
  observed status nor timestamp. Missing explicit authority refuses; explicit existing brief authority succeeds
  for the same goal-state input, with no new per-run request. The goal
  `PR_ON_COMPLETE` exclusion is owned by the skill instruction and pinned in
  the CLI review-skill contract test, not evaluated by the helper.
- **Refusals:** failed observation, dirty parent/retained synced inputs,
  unmerged commits and shared inputs missing from base leave input bytes and
  the current branch intact. The helper preserves ignored local artifacts and
  a clean synced worktree whose HEAD equals `refs/oat/projects/probe`.
- **Resume and publication:** the same deterministic prepared branch is reused;
  a recognized open follow-up is reused; an archive resume can resolve that
  branch without the retired active directory. A merged follow-up refuses
  duplication. The test executes the shipped Step 11 shell block and Step 11.5
  target-selection block: one create occurs, retry creates none, and the only
  body edit targets the follow-up URL. The original PR body receives no edit.

The local preparation binding lives in branch-local Git configuration and
contains only original URL, project-relative path, scope, base branch and base
SHA. It does not grant publication or merge authority. A missing/contradictory
binding, a missing local branch for an existing remote follow-up, or a
closed/merged follow-up requires explicit recovery rather than duplicate work.
The helper does not commit, push, mutate project state, or perform archive
transactions. Existing exact producer lists and receipt validators remain the
owners of those effects. The skill requires inspection of resumed branch
changes and reconciliation to the retained exact completion output list before
continuing or publishing; a deterministic name alone does not prove ownership.

Shared archive resumes still only validate their terminal receipt and clear
the pointer. Synced archive resumes retain their prepared parent branch and
live-observe the archived original before later writes, preserving their
recordless receipt route. Synced non-archive pin/final-artifact recovery stays
with its existing router. These preserved archive transactions also run in the
existing root skill/CLI suites; the new probe does not claim to reconstruct
S3 or GitHub operations.

No product state schema, delivery registry, workflow mode, general state
editor, transaction protocol or concurrency protocol was added. All five
public package versions are already 0.3.50 versus fetched main's 0.3.49;
completion and the shared autonomy-contract consumers were already bumped by
p01, so no second PR-scoped bump is needed. The only shared-contract change is
mechanical prompt-site inventory maintenance. Prose checks verify instructional
contracts; executable Git and shell probes establish their tested seams, not
an agent's future obedience.

## p02 review corrections

The status-shell regression executes both shipped Step 1.75 blocks against the
real built status command, rather than passing an invented empty URL. Literal
`null` now makes no GitHub call and yields no observation/status timestamp;
an actual tracked OPEN response still succeeds. Pre-fix: the no-PR block
failed after treating null as a tracked identity. The synced fixture now uses
the repository's `synced/*/` ignore rule and a parent-tracked discovery record
matching the schema in `commands/project/sync/record.ts`. Missing or changed
base records refuse before switching and preserve the current record bytes;
pre-fix both probes incorrectly switched branches.

The publication test executes Step 11.5's eligibility block before target
selection. A reused open follow-up receives the final body; an open original
remains eligible, while a merged original alone and a newly created follow-up
do not. Neutralizing follow-up eligibility makes the test fail because the
expected follow-up edit is absent. Removing the goal exclusion sentence makes
its instruction-contract test fail. Both guards were restored; local receipts
are in `.oat/analysis/complete-after-merge-p02/review-fixes/`. These are tested
shell/CLI and instruction contracts, not proof that an agent obeys the prose.

## H1 automatic companion composition

The p02 review's H1 is resolved by the companion's executable PR/authority
preflight and its current Step 5 handoff, not by granting new standing rights.
`COMPLETION_FOLLOWUP_AUTHORITIES_JSON` is execution-local evidence supplied by
the caller after verifying existing task authority. Each entry binds one
requested project path and original PR URL to its source; the caller must
verify that source covers both follow-up preparation and publication. It is
neither a config setting nor permission minted by the resolver. No entry means
refusal before completion writes. Autonomous opt-in and create-PR preferences
cannot populate it. Open/before-merge and absent-PR controls retain their
existing no-create and preflight:4 routes. Missing merged authority uses
preflight:8, propagated to wave-execute's existing hard-stop list so its parent
cannot substitute lifecycle writes after this refusal.

Protects against: the automatic consumer forcing publication false or omitting
explicit scoped authority even though its completion producer requires both;
not already caught because helper-only Git tests never executed that consumer;
covered by the four `complete-auto` cases in the existing Git probe file.
The obsolete force-no-create simulator is replaced by actual consumer/core
shell composition; its unconditional merged-no-create expectation is retired
by the accepted H1/reuse-authority contract. The independent interactive
create-preference instruction is retained in its existing CLI contract suite.

These probes execute the companion's shipped PR preflight, the real built
`project status --shell`, and completion's shipped branch-preparation and
publication blocks. Other lifecycle preflight/coverage/archive guards retain
their existing suites. Quick-mode input has a real completed closeout snapshot,
so the actual closeout-check after switching also runs; no internal CLI module
is mocked. Only gh responses are substituted at their external executable
boundary, using the already recorded live response schema.

- Before control: execute the old Step 5 false/no-authority decision from
  fix base `47d83407bee1d1232f6ae724316ac887aaa3b135`; the actual completion
  helper refuses missing authority with E_FOLLOWUP_AUTHORITY.
- Ordinary merged accepted control: existing explicit authority passes,
  fresh-base ancestry and completion-only diff hold, the exact branch is
  pushed, one separate follow-up is published and an existing follow-up is
  reused. Original state/URL/body are unchanged.
- Negative controls: no authority, another project's authority, or another
  original PR's authority refuse at preflight:8 before any completion commit
  or artifact write, even with autonomous environment and create-PR preference.
- Batch control: two requested authorized members publish separate pushed
  branches/PRs; an ungranted member stays deferred. Between members the shipped
  clean/pushed-branch guard returns to the prepared base, preserving the first
  branch so the second preparation cannot mistake it for divergent work.
  Original project states and delivery registries remain byte-identical.

Can-fail proof is reproducible with
`.oat/analysis/complete-after-merge-p02/h1-fix/can-fail.py`. It independently
neutralizes the required-authority guard, project binding, original-PR binding
and merged publication decision. Each targeted test fails for its own clause
(the publication test reports missing follow-up creation); source is restored
before the green combined run. Mutation contents, expected failure reasons,
exit codes and logs are preserved in that directory's `can-fail.json`.
No production test hook or persistent authority store was added.
