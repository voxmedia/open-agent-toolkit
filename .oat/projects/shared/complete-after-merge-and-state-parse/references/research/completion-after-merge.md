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
  observed status nor timestamp. Missing authority refuses even when
  `PR_ON_COMPLETE=true`; explicit existing brief authority succeeds for the
  same goal-state input, with no new per-run request.
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
