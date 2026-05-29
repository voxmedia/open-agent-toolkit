---
name: oat-review-provide-remote
version: 1.0.3
description: Use when reviewing a GitHub PR opened on another machine and posting findings back as a single PR review, outside any OAT project context. Fetches the PR via gh, reviews it, and posts via gh api.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Remote Review Provide (Ad-hoc GitHub PR)

Review a GitHub PR opened by an agent on another machine and post the findings back as a single GitHub PR review — without requiring an active OAT project. GitHub is the source of truth: no local artifact is written and no lifecycle bookkeeping happens here. The posted review carries metadata markers so `oat-review-receive-remote` can round-trip the findings into tasks on the originating machine.

## Prerequisites

- `gh` CLI is installed and authenticated (`gh auth status`).
- The PR to review exists on GitHub and is reachable from the current repo's remote.
- Optionally `npx agent-reviews` for posting symmetry (capability-probed at startup; `gh api` is the fallback).
- User wants an ad-hoc remote review outside the OAT project lifecycle.

## Mode Assertion

**OAT MODE: Remote Review Provide**

**Purpose:** Fetch a GitHub PR, review it inline against the ad-hoc review checklist + severity model, and post a single PR review (summary + severity counts + inline comments + metadata markers) back to GitHub.

**BLOCKED Activities:**

- No `plan.md`, `state.md`, or `implementation.md` lifecycle mutations.
- No local review artifact written on this machine (GitHub is the source of truth).
- No mutation of the caller's working tree — all checkout happens in an ephemeral worktree.
- No implementing fixes, commits, or pushes (this skill reviews; it does not fix).
- No posting a review to GitHub without explicit user confirmation.

**ALLOWED Activities:**

- Resolve the PR number.
- Acquire PR content via ephemeral worktree + `gh pr checkout` (or `gh pr diff` fallback).
- Detect prior provide-remote reviews and narrow re-review scope (with the stale-SHA guard).
- Run the ad-hoc review inline (no tier model).
- Build the posted-review body + inline-comment array.
- Post a single PR review via `agent-reviews` (if probed supported) else `gh api` (with user confirmation).

**Self-Correction Protocol:**
If you catch yourself:

- Running `gh pr checkout` in the caller's working tree instead of an ephemeral worktree -> STOP, acquire the worktree first, and check out inside it.
- Writing a review artifact file on this machine -> STOP; the posted PR review is the only output.
- Editing project lifecycle artifacts (`plan.md`, `state.md`, `implementation.md`) -> STOP and revert to review-and-post only.
- Posting the review to GitHub without explicit user confirmation -> STOP and present the body + verdict for approval first.
- Narrowing against a prior review SHA without running the existence + ancestry guard -> STOP and run the guard first.
- Forgetting to remove the ephemeral worktree after posting (or on failure) -> STOP and release it in a `finally`.

## Progress Indicators (User-Facing)

Print this banner once at start:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ REMOTE REVIEW PROVIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use step indicators:

- `[1/7] Resolving PR...`
- `[2/7] Checking out PR (ephemeral worktree)...`
- `[3/7] Detecting prior reviews + narrowing scope...`
- `[4/7] Running review...`
- `[5/7] Mapping inline comments to the diff...`
- `[6/7] Building review body + verdict...`
- `[7/7] Posting review + cleanup...`

## Arguments

```
oat-review-provide-remote [--pr <N>] [--no-checkout] [--narrow|--no-narrow]
```

- `--pr <N>`: target PR number. When omitted, auto-detect from the current branch.
- `--no-checkout`: skip the ephemeral worktree and review from `gh pr diff` only (degraded context).
- `--narrow` / `--no-narrow`: force or forbid re-review narrowing against a prior provide-remote review. When neither is passed, honor `workflow.autoNarrowReReviewScope` (no prompt when `true`; confirm prompt otherwise).

Inputs are CLI-style args parsed from `$ARGUMENTS`. No file inputs. No file outputs on this machine.

## Findings Model

Normalize every finding to this shape (matches the ad-hoc review checklist and the `oat-review-receive-remote` model):

```yaml
finding:
  id: "C1" | "I1" | "M1" | "m1"
  severity: critical | important | medium | minor
  title: string
  file: string | null
  line: number | null
  body: string
  fix_guidance: string | null
```

Severity conventions:

- `critical`: Broken behavior, security risk, or missing P0 requirement.
- `important`: Missing P1 requirement, major robustness issue.
- `medium`: Meaningful but non-blocking quality/maintainability issue.
- `minor`: Cosmetic/style/documentation issue.

Checklist + severity model source of truth: `.agents/skills/oat-review-provide/references/review-artifact-template.md`.

## Process

### Step 1: Resolve PR Number

PR resolution order:

1. `--pr <N>` from `$ARGUMENTS`.
2. Auto-detect from the current branch: `gh pr view --json number -q .number`.

Confirm `gh auth status` succeeds. Ask the user to confirm the resolved PR number before checkout. Capture the PR HEAD SHA (full 40-char) for the marker block and the narrowing guard:

```bash
PR_HEAD_SHA=$(gh pr view "$PR" --json headRefOid -q .headRefOid)
```

### Step 2: Check Out the PR (Hybrid Read)

Acquire an ephemeral worktree FIRST, then run `gh pr checkout` inside it so the caller's working tree is never mutated. Use repo-scoped git commands so the skill works regardless of the caller's CWD (design.md → Data Flow step 2). This shell flow parallels the tested TypeScript helper at `packages/cli/src/review-remote/worktree.ts` (`acquireWorktree` / `runInWorktree` / `releaseWorktree`) — keep the two in sync if you change either:

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
EPHEMERAL_PATH=$(mktemp -d)
rmdir "$EPHEMERAL_PATH"   # git worktree add requires a non-existent target
git -C "$REPO_ROOT" worktree add --detach "$EPHEMERAL_PATH" HEAD
( cd "$EPHEMERAL_PATH" && gh pr checkout "$PR" )
```

The `-C "$REPO_ROOT"` flag is load-bearing — it lets the command run even when the caller's CWD is not inside the repository.

Fallback to diff-only mode when `--no-checkout` is set, or when worktree creation / `gh pr checkout` fails (capture exit code + stderr; distinguish auth from network from branch-state failures). On checkout failure, clean up the partial worktree (`git -C "$REPO_ROOT" worktree remove --force "$EPHEMERAL_PATH"`), then warn the user that context is degraded and continue with:

```bash
gh pr diff "$PR" > "$DIFF_FILE"
gh pr view "$PR" --json title,body,headRefOid,baseRefName,state
```

### Step 3: Detect Prior Reviews + Narrow Scope

List prior PR reviews and parse each body's marker block. Filter to reviews where `oat_provide_remote: true` AND `oat_review_scope == "ad-hoc"` AND no `oat_project` key — project-rail markers are ignored by the ad-hoc filter.

```bash
gh api "/repos/{owner}/{repo}/pulls/$PR/reviews"
```

Take the most recent matching review (by submitted timestamp). Before narrowing to `<prior_sha>..<HEAD>`, run the stale-SHA guard (design.md → Error Handling → Stale prior-review SHA):

Run the guard in the available git context `$GIT_CTX` — `$EPHEMERAL_PATH` in rich-context (checkout) mode, or `$REPO_ROOT` in diff-only mode (where no worktree exists):

1. **Existence:** `git -C "$GIT_CTX" cat-file -e <prior_sha>` (diff-only mode: `git -C "$REPO_ROOT" fetch origin <prior_sha>:refs/oat-prior-review` first, then re-check; if that fetch fails, fall back to full PR scope).
2. **Ancestry:** `git -C "$GIT_CTX" merge-base --is-ancestor <prior_sha> "$PR_HEAD_SHA"`.

Guard outcomes:

- Both pass -> narrow to `<prior_sha>..<HEAD>`.
- Either fails -> fall back to full PR scope and warn that the prior SHA is unreachable (likely rebase/force-push).
- `--narrow` set AND guard fails -> hard error; surface unreachability and stop.
- `workflow.autoNarrowReReviewScope == true` -> never prompt; guard failure auto-falls back to full scope with the warning as the auto-fallback notice.
- No matching prior review -> use full PR diff.

### Step 4: Run the Review (Inline)

Review inline (no tier model — matches local `oat-review-provide`) using the ad-hoc review checklist + severity model. Scope to the narrowing range when one was chosen; otherwise the full PR diff. Assign finding IDs per severity bucket (`C1`, `I1`, `M1`, `m1`).

### Step 5: Map Inline Comments to the Diff

For each finding with non-null `file` + `line`, classify it against the PR diff BEFORE adding it to the inline `comments[]` payload (design.md → Error Handling → Inline-comment line mapping):

- Rich-context mode: parse hunk ranges from `gh api /repos/{owner}/{repo}/pulls/$PR/files` (per-file `patch` field).
- Diff-only mode: parse hunk headers (`@@ -a,b +c,d @@`) from the `gh pr diff` output.
- `side: RIGHT` for additions/context; `side: LEFT` only when the finding is explicitly about removed code.
- **Renamed files:** a `gh api .../files` entry carries the pre-rename path in a sibling `previous_filename` field (not in `patch`). When a finding references the pre-rename path, remap it to the entry's post-rename `filename` before classifying, or it will be treated as out-of-diff.
- If `line` falls outside the diff: downgrade the finding to a top-level "Findings outside the PR diff" subsection with its `file:line` reference. NEVER silently drop it and NEVER shift the line to the nearest in-diff line.

> **Reference implementation:** the canonical, tested logic for this step lives in `packages/cli/src/review-remote/line-mapper.ts` (`parsePullFilesPatch` / `parseUnifiedDiff` / `classifyFinding`). The bash/`jq` flow here mirrors it — keep the two in sync. See `packages/cli/src/review-remote/README.md`; `bl-a7cd` tracks wiring this skill to call the helpers directly. The same applies to the marker block (`marker-parser.ts`), body/verdict (`body-builder.ts`), and re-review narrowing (`narrowing.ts`) used in the steps below.

### Step 6: Build the Review Body + Verdict

Build the posted-review body (design.md → Data Models → Posted-review-body): a leading HTML-comment marker block, then summary, severity counts, the minor-fix "Notes" nudge (only when minor findings are present), and optional verification commands.

Markers (ad-hoc rail):

```
<!-- oat-review-metadata
oat_provide_remote: true
oat_review_head_sha: <PR_HEAD_SHA>
oat_review_scope: ad-hoc
oat_review_invocation: manual
-->
```

`oat_project` is omitted entirely on the ad-hoc rail. Verdict: `REQUEST_CHANGES` when any critical or important finding exists; `COMMENT` otherwise (including a clean, zero-findings review — never auto-`APPROVE`).

### Step 7: Post the Review + Clean Up

Probe `agent-reviews` for a posting flow with a non-mutating check (`npx agent-reviews --help`), cached for the run:

- If a posting flow is supported -> prefer `agent-reviews` for tooling symmetry.
- Otherwise (or if the probe is inconclusive) -> post via `gh api`. As of the current `agent-reviews` release there is no review-posting flow, so `gh api` is the expected path.

Present the body + verdict + inline-comment count to the user and get explicit confirmation, then post a single review.

`gh api --field`/`-f`/`-F` only set top-level scalar values; they CANNOT build the nested `comments[]` array of objects the reviews endpoint requires for inline comments. Construct the complete review payload as JSON and pipe it through `--input -` instead (a heredoc or a temp JSON file both work). Each in-diff finding (from Step 5) becomes one `comments[]` entry `{ path, line, side, body }`; out-of-diff findings are NOT added here — they were already downgraded into `$REVIEW_BODY` in Step 5. `event` is the Step 6 verdict (`REQUEST_CHANGES` when any critical/important finding exists, else `COMMENT`). A body-only review (zero in-diff findings) uses an empty `comments` array or omits the key:

```bash
# Build the payload as JSON. `comments` is the in-diff findings array; jq
# assembles it safely (escaping body text, numbers as numbers). For a
# body-only review, COMMENTS_JSON is `[]`.
jq -n \
  --arg event "$VERDICT" \
  --arg body "$REVIEW_BODY" \
  --argjson comments "$COMMENTS_JSON" \
  '{event: $event, body: $body, comments: $comments}' \
| gh api --method POST "/repos/{owner}/{repo}/pulls/$PR/reviews" --input -

# COMMENTS_JSON is a JSON array, one object per in-diff finding, e.g.:
#   [
#     { "path": "src/foo.ts", "line": 42, "side": "RIGHT", "body": "..." },
#     { "path": "src/bar.ts", "line": 17, "side": "LEFT",  "body": "..." }
#   ]
# `side` is RIGHT for additions/context, LEFT only for explicit removed-code
# findings (Step 5). Use `[]` when there are no in-diff findings.
```

Posting failure handling (design.md → Error Handling → Posting failures): on auth failure, surface `gh auth status` and stop (findings kept in memory). On PR closed/merged, surface a clear message and present findings inline. On inline-comment rejection, re-map against the current file list and retry once; if still rejected, downgrade the offending finding(s) and retry. On rate limit, surface the window and stop. NEVER silently drop a finding.

Always release the ephemeral worktree in a `finally`, even when review or posting fails:

```bash
git -C "$REPO_ROOT" worktree remove --force "$EPHEMERAL_PATH" || git -C "$REPO_ROOT" worktree prune
rm -rf "$EPHEMERAL_PATH"
```

## Troubleshooting

- Auth failure: run `gh auth status`; re-authenticate, then retry.
- No PR detected: pass explicit `--pr <N>`.
- Checkout fails: the skill auto-falls back to diff-only mode with a degraded-context warning; pass `--no-checkout` to force it.
- Prior-review SHA unreachable: re-invoke without `--narrow` to review full scope.
- Inline comment rejected at a file:line: the finding is downgraded to the top-level body, not dropped.
- Network / rate-limit errors: retry after backoff; report blocked state if persistent.

## Output Contract

At completion, report:

- PR number and HEAD SHA reviewed.
- Read mode (worktree checkout vs diff-only).
- Narrowing decision (full scope vs `<prior_sha>..<HEAD>`, and why).
- Severity counts and total findings.
- Inline-comment count posted vs findings downgraded to the body (out-of-diff).
- Verdict (`REQUEST_CHANGES` or `COMMENT`).
- Posting mechanism (`agent-reviews` or `gh api`) and whether the review was posted.
- Confirmation that the ephemeral worktree was removed.

## Success Criteria

- PR scope resolved and confirmed.
- PR content acquired via ephemeral worktree (or diff-only fallback) without mutating the caller's working tree.
- Prior provide-remote reviews detected; re-review narrowing applied only after the stale-SHA guard passes.
- Findings produced with consistent 4-tier severities and file:line references.
- Inline comments mapped to in-diff positions; out-of-diff findings downgraded to the body, never dropped.
- Posted-review body carries the marker block first, correct severity counts, and the minor-fix nudge when minors are present.
- Verdict matches the C/I rule (`REQUEST_CHANGES` vs `COMMENT`; never auto-`APPROVE`).
- Single PR review posted (with user confirmation) via `agent-reviews` if supported, else `gh api`.
- Ephemeral worktree removed on success and on failure.
- No local artifact, no lifecycle bookkeeping, no fixes/commits/pushes on this machine.
