<!--
Provenance: /Users/tstang/.t3/worktrees/open-agent-toolkit/t3-e32280d5/.oat/projects/archived/backlog-wave-5/analysis/implementation-exit-gate-r1.err
Captured output: backlog-wave-5 implementation exit gate r1, run 618a7f2c-8019-454f-84c1-8f737d6450f6, reviewer target claude-opus-5-5-high
Extraction: JSONL gate-event lines were stripped; the remaining reviewer-returned message is reproduced below.
Artifact status: this is not a review artifact; the gate parsed the separate real artifact as 0 Critical / 1 High / 0 Medium / 2 Low.
Expected categorical parser outcome fixed before the grammar change: structured refusal because this returned-message wrapper has neither canonical Findings severity sections nor a canonical count line. The expected outcome is not selected to match the separately parsed artifact counts.
-->

**Blocking finding: 1 High.** The final review is written and committed; the tree is clean.

Gate route: inline (runtime=claude, cliRoot=/Users/tstang/Library/pnpm/store/v11/links/@open-agent-toolkit/cli/0.3.16/46bd66559498f650c247003368a29b4f66a2dd8372c03ea57f30511451d562f3/node_modules)

**Reconnaissance:** not-attempted

Review complete for backlog-wave-5.

- **Scope:** final, full range `6ec5313b9..a8b3e9f43` (no prior final review in this gate lineage, so nothing was narrowed)
- **Files reviewed:** 339 changed; the 84 shipped source, skill, template and tool files were read as diffs
- **Findings by severity:** 0 critical, 1 high, 0 medium, 2 low
- **Review artifact:** `.oat/projects/shared/backlog-wave-5/reviews/final-review-2026-10-05T015008Z.md`
- **Bookkeeping commit:** `dd65ba2bf`

## Blocking

**H1 — a `~`-prefixed `core.hooksPath` silently disables hooks on every exact-path commit** (`packages/cli/src/commands/shared/exact-path-commit.ts:534-544`).

- **Cause:** the primitive reads the setting with `git config --get`, which does not expand `~`, so `~/hooks` resolves to `<repo>/~/hooks` and no hook is found. The commit succeeds with exit 0 and no warning.
- **Impact:** the ticket requires lifecycle commits "with hooks enabled". Project-log, promote, prune, migrate and scaffold commits used plain `git commit` before this wave and now skip machine-wide hooks installed the usual way (`git config --global core.hooksPath ~/.githooks`), including secret scanners.
- **Reproduction:** in a scratch repo with a rejecting `pre-commit` hook, `oat internal commit-paths` committed under `~/hooks`. Plain `git commit` rejected it, and the primitive correctly rejected it under absolute and repo-relative hook paths.
- **Coverage gap:** `exact-path-commit.test.ts` has no case that sets `core.hooksPath`.
- **Fix:** resolve the directory the way Git does (`git rev-parse --git-path hooks` or `git config --type=path --get core.hooksPath`) and add a real-Git test for the `~` form.

## Non-blocking

- **L1:** the promotion commit identity is fixed per project path, so promoting a second Lite project at a reused slug in the same clone fails with "use a new identity", and the printed recovery command repeats that identity. I reproduced the mechanism through `commit-paths`, not through `oat project promote` itself.
- **L2:** the scaffold failure message refers to "the reported recovery command", but non-resumable failures print no command.
- **Deferred Medium (stored receipt after a history rewrite):** still acceptable to defer. It fails closed and preserves state, and is tracked in `BL-261005-distinguish-stored-receipt`.
- **Ten-ticket archival and the PR:** not started. The plan schedules them after final review.

## Verification

`check:skill-bumps`, `release:check-versions`, `docs:validate` and 82 targeted tests across four files all exited 0 on the reviewed head. I did not rerun the full eight-gate sequence; the only non-project changes since the root's recorded full run are two new backlog items and the regenerated backlog index.

Next: run the `oat-project-review-receive` skill to convert findings into plan tasks.
