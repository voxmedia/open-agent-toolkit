---
name: oat-project-review-provide-remote
version: 1.0.2
description: Use when reviewing a GitHub PR opened on another machine for an active OAT project and posting findings back as a single PR review. Resolves the project from the PR diff, reads project artifacts for mode-aware review, and posts via gh api.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion
---

# Remote Review Provide (Project-Scoped GitHub PR)

Review a GitHub PR opened by an agent on another machine for an active OAT project, and post the findings back as a single GitHub PR review. The project is located from the PR diff (or an explicit `--project <path>` override), its artifacts are read for mode-aware review quality, and the posted review carries project metadata markers so `oat-project-review-receive-remote` can round-trip the findings into plan tasks on the originating machine.

GitHub is the source of truth on this rail: no local artifact is written, no `plan.md` / `state.md` / `implementation.md` bookkeeping happens here, and no commits or pushes are made from this machine. The receive-remote skill on machine A owns every project-state mutation.

This is the project-scoped sibling of `oat-review-provide-remote` (ad-hoc rail). It adds project resolution, mode-aware review context, and a Tier 1/2/3 dispatch model that matches `oat-project-review-provide`.

## Prerequisites

- `gh` CLI is installed and authenticated (`gh auth status`).
- The PR to review exists on GitHub and is reachable from the current repo's remote.
- The PR diff includes `state.md` for exactly one OAT project (project-flow commit discipline), OR you pass `--project <path>` to disambiguate.
- Optionally `npx agent-reviews` for posting symmetry (capability-probed at startup; `gh api` is the fallback).

## Mode Assertion

**OAT MODE: Project Remote Review Provide**

**Purpose:** Fetch a GitHub PR, locate the OAT project it belongs to, run a mode-aware review against the project artifacts + review checklist + severity model, and post a single PR review (summary + severity counts + inline comments + project metadata markers) back to GitHub.

**BLOCKED Activities:**

- No `plan.md`, `state.md`, or `implementation.md` lifecycle mutations on this machine (machine A's `oat-project-review-receive-remote` owns those).
- No local review artifact written on this machine (GitHub is the source of truth; the Tier 1 reviewer runs in structured-output mode and writes NO artifact).
- No commits and no pushes from this machine.
- No mutation of the caller's working tree — all checkout happens in an ephemeral worktree.
- No implementing fixes (this skill reviews; it does not fix).
- No posting a review to GitHub without explicit user confirmation.

**ALLOWED Activities:**

- Resolve the PR number and the target OAT project (diff scan + `--project` override).
- Acquire PR content via ephemeral worktree + `gh pr checkout` (or `gh pr diff` fallback).
- Read project artifacts (`state.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `discovery.md`) from the checkout — read-only.
- Detect prior provide-remote reviews and narrow re-review scope (with the stale-SHA guard), filtered to this `(project, scope)`.
- Run the review via Tier 1 (`oat-reviewer` structured-output) / Tier 2 (fresh session) / Tier 3 (inline).
- Build the posted-review body with project markers + inline-comment array.
- Post a single PR review via `agent-reviews` (if probed supported) else `gh api` (with user confirmation).

**Self-Correction Protocol:**
If you catch yourself:

- Running `gh pr checkout` in the caller's working tree instead of an ephemeral worktree -> STOP, acquire the worktree first, and check out inside it.
- Writing a review artifact file on this machine (including the Tier 1 reviewer writing under `reviews/`) -> STOP; the posted PR review is the only output. The reviewer MUST run in structured-output mode.
- Editing or committing project lifecycle artifacts (`plan.md`, `state.md`, `implementation.md`) -> STOP and revert to review-and-post only.
- Pushing or committing anything from this machine -> STOP; machine A's receive-remote owns all project-state mutations.
- Posting the review to GitHub without explicit user confirmation -> STOP and present the body + verdict for approval first.
- Narrowing against a prior review SHA without running the existence + ancestry guard -> STOP and run the guard first.
- Narrowing against a prior review for a different project or a different scope -> STOP; only the same `(project, scope)` prior review narrows this one.
- Forgetting to remove the ephemeral worktree after posting (or on failure) -> STOP and release it in a `finally`.

## Progress Indicators (User-Facing)

Print this banner once at start:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ PROJECT REMOTE REVIEW PROVIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use step indicators:

- `[1/8] Resolving PR...`
- `[2/8] Checking out PR (ephemeral worktree)...`
- `[3/8] Resolving OAT project + reading artifacts...`
- `[4/8] Detecting prior reviews + narrowing scope...`
- `[5/8] Running review (Tier 1/2/3)...`
- `[6/8] Mapping inline comments to the diff...`
- `[7/8] Building review body + verdict...`
- `[8/8] Posting review + cleanup...`

## Arguments

```
oat-project-review-provide-remote [code <scope>|artifact <scope>]
                                  [--pr <N>] [--project <path>]
                                  [--no-checkout] [--narrow|--no-narrow]
```

- `code <scope>` / `artifact <scope>`: review type and scope token. Scope tokens: `pNN`, `pNN-tNN`, `pNN-pMM`, `final`, or `artifact <name>`. When omitted, infer from PR state (default `code` with the phase scope; `final` when the implementation is complete).
- `--pr <N>`: target PR number. When omitted, auto-detect from the current branch.
- `--project <path>`: explicit OAT project directory. Takes precedence over the diff scan. Required when the diff touches zero or multiple projects' `state.md`.
- `--no-checkout`: skip the ephemeral worktree and review from `gh pr diff` only (degraded context; project artifacts read from `gh` blob fetches instead of the checkout).
- `--narrow` / `--no-narrow`: force or forbid re-review narrowing against a prior provide-remote review for this `(project, scope)`. When neither is passed, honor `workflow.autoNarrowReReviewScope` (no prompt when `true`; confirm prompt otherwise).

Inputs are CLI-style args parsed from `$ARGUMENTS`. No file inputs. No file outputs on this machine.

## Findings Model

Normalize every finding to this shape (matches the `oat-reviewer` `StructuredFindings` schema and the `oat-project-review-receive-remote` model):

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

`file` and `line` are both set (inline finding) or both `null` (reviewer-level finding that lands in the top-level body). Checklist + severity model + the `StructuredFindings` schema source of truth: `.agents/agents/oat-reviewer.md` and `design.md` → Data Models → StructuredFindings.

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

In diff-only mode the project artifacts are read by fetching individual blobs from the PR HEAD (`gh api /repos/{owner}/{repo}/contents/<path>?ref=$PR_HEAD_SHA`) rather than from a checkout.

### Step 3: Resolve the OAT Project + Read Artifacts

Determine the changed-file list for the PR, then resolve the target project. This mirrors the tested helper at `packages/cli/src/review-remote/project-resolver.ts` (`resolveProject`):

```bash
# Changed files for the PR (rich-context: from the checkout; diff-only: from gh).
CHANGED_FILES=$(gh api "/repos/{owner}/{repo}/pulls/$PR/files" --jq '.[].filename')
```

Resolution rules:

1. **`--project <path>` override wins.** Validate that the path resolves to a directory containing `state.md`; if not, surface a clear error and stop (do not post).
2. Otherwise, scan `CHANGED_FILES` for two-level `.oat/projects/<scope>/<project>/state.md` paths.
   - Exactly one match -> use it.
   - Multiple matches -> error out with the candidate list and require `--project <path>`.
   - Zero matches -> require `--project <path>`.

Once resolved to `PROJECT_PATH`, read the project artifacts read-only for mode-aware review context (from the checkout in rich-context mode, or via blob fetch in diff-only mode):

- `state.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `discovery.md` (whichever exist for the project's workflow mode).

Resolve the workflow mode and the scope token:

- Read `state.md` frontmatter for the workflow mode and current phase/status.
- Parse the scope token from `$ARGUMENTS` (`code <scope>` / `artifact <scope>`), or infer it from PR state (default `code` with the current phase; `final` when the implementation is complete). For `final` scope, also gather the deferred-findings ledger from `implementation.md`.

NEVER mutate, commit, or push any project artifact. This is a read-only project context on machine B.

### Step 4: Detect Prior Reviews + Narrow Scope

List prior PR reviews and parse each body's marker block. Filter to reviews where `oat_provide_remote: true` AND `oat_project == "$PROJECT_PATH"` AND `oat_review_scope == "<current-scope-token>"`. Different-project or different-scope prior reviews do NOT narrow this one (mirrors the tested helper at `packages/cli/src/review-remote/narrowing.ts`, `pickNarrowingTarget` with `rail: "project"`).

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
- No matching prior review (for this `(project, scope)`) -> use full PR diff.

### Step 5: Run the Review (Tier 1/2/3 Dispatch)

Mode-aware review against the project artifacts + the `oat-reviewer` checklist + severity model. Scope to the narrowing range when one was chosen; otherwise the full PR diff. Assign finding IDs per severity bucket (`C1`, `I1`, `M1`, `m1`), stable within the dispatch.

**Step 5a: Probe subagent availability** (mirrors `oat-project-review-provide` Step 6a):

```
[5/8] Checking subagent availability…
  → oat-reviewer: {available | authorization required | not resolved} ({reason})
  → Selected: Tier {1|2|3} — {Subagent (structured output) | Fresh session (recommended) | Inline review}
```

Detection:

- Claude Code: Task-style subagent dispatch with `subagent_type: "oat-reviewer"` (resolves from `.claude/agents/oat-reviewer.md`).
- Cursor: explicit invocation `/oat-reviewer` (or natural mention), resolved from `.cursor/agents/oat-reviewer.md` or the `.claude/agents/oat-reviewer.md` compatibility path.
- Codex multi-agent: verify `[features] multi_agent = true`; if the host requires explicit authorization before `spawn_agent`, announce `authorization required` and ask one concise confirmation before selecting a lower tier. If authorized -> Tier 1; if declined -> Tier 2/3 fallback.
- If the runtime can dispatch reviewer work -> Tier 1. If subagent dispatch is unavailable -> Tier 2. If the user requests inline / confirms a fresh session -> Tier 3.

**Step 5b: Tier 1 — `oat-reviewer` in structured-output mode (preferred).**

Build the dispatch payload and spawn the reviewer in structured-output mode. This mirrors the tested wrapper at `packages/cli/src/review-remote/reviewer-dispatch.ts` (`buildDispatchPayload` / `dispatchStructuredReview`):

- Set `oat_output_mode: structured` in the dispatch payload (the flag `.agents/agents/oat-reviewer.md` recognizes). In this mode the reviewer returns a `StructuredFindings` object in-memory and writes NO artifact under `reviews/`.
- Include the project context (`oat_project`, `oat_review_scope`, `oat_review_head_sha`), the Review Scope metadata block, a pointer to the posted-review-body schema (`design.md` → Data Models → Posted-review-body), and the resolved narrowing range (`<prior_sha>..<HEAD>` or none).
- If a worktree was resolved in Step 2, include its path so the reviewer reads from the checkout.
- The reviewer returns `StructuredFindings` (summary + findings array + `verification_commands`). On a dispatcher error, do NOT retry at Tier 1 — fall through to Tier 2/3. On malformed structured output, surface the validation error and fall through to Tier 2/3.

**Step 5c: Tier 2 — Fresh session (recommended fallback).** If subagent dispatch is unavailable and the user is not already in a fresh session, provide fresh-session instructions and exit. (If Codex reported `authorization required` and the user later authorizes, return to Tier 1.)

**Step 5d: Tier 3 — Inline review (fallback).** If the user insists on inline review in the current session, run the reset protocol: re-read the required project artifacts, read all files in the review scope, apply the `oat-reviewer` checklist inline, and produce the findings set in the same `StructuredFindings` shape. Write NO artifact.

### Step 6: Map Inline Comments to the Diff

For each finding with non-null `file` + `line`, classify it against the PR diff BEFORE adding it to the inline `comments[]` payload (design.md → Error Handling → Inline-comment line mapping; mirrors `packages/cli/src/review-remote/line-mapper.ts`):

- Rich-context mode: parse hunk ranges from `gh api /repos/{owner}/{repo}/pulls/$PR/files` (per-file `patch` field).
- Diff-only mode: parse hunk headers (`@@ -a,b +c,d @@`) from the `gh pr diff` output.
- `side: RIGHT` for additions/context; `side: LEFT` only when the finding is explicitly about removed code.
- **Renamed files:** a `gh api .../files` entry carries the pre-rename path in a sibling `previous_filename` field (not in `patch`). When a finding references the pre-rename path, remap it to the entry's post-rename `filename` before classifying, or it will be treated as out-of-diff.
- If `line` falls outside the diff: downgrade the finding to a top-level "Findings outside the PR diff" subsection with its `file:line` reference. NEVER silently drop it and NEVER shift the line to the nearest in-diff line.

> **Reference implementation:** the canonical, tested logic for this step lives in `packages/cli/src/review-remote/line-mapper.ts` (`parsePullFilesPatch` / `parseUnifiedDiff` / `classifyFinding`). The bash/`jq` flow here mirrors it — keep the two in sync. See `packages/cli/src/review-remote/README.md`; `bl-a7cd` tracks wiring this skill to call the helpers directly. The same applies to the marker block (`marker-parser.ts`), body/verdict (`body-builder.ts`), re-review narrowing (`narrowing.ts`), project resolution (`project-resolver.ts`), and the `oat-reviewer` dispatch (`reviewer-dispatch.ts`) used elsewhere in this skill.

### Step 7: Build the Review Body + Verdict

Build the posted-review body with project markers (design.md → Data Models → Posted-review-body; mirrors `packages/cli/src/review-remote/body-builder.ts`): a leading HTML-comment marker block, then summary, severity counts, the minor-fix "Notes" nudge (only when minor findings are present), and the verification commands.

Markers (project rail — both `oat_project` and `oat_review_scope` present):

```
<!-- oat-review-metadata
oat_provide_remote: true
oat_review_head_sha: <PR_HEAD_SHA>
oat_review_scope: <scope token, e.g. p02 | final>
oat_project: <PROJECT_PATH>
oat_review_invocation: manual
-->
```

`oat_project` carries the resolved project path so machine A's `oat-project-review-receive-remote` routes findings into the right project's plan tasks. Verdict: `REQUEST_CHANGES` when any critical or important finding exists; `COMMENT` otherwise (including a clean, zero-findings review — never auto-`APPROVE`).

### Step 8: Post the Review + Clean Up

Probe `agent-reviews` for a posting flow with a non-mutating check (`npx agent-reviews --help`), cached for the run:

- If a posting flow is supported -> prefer `agent-reviews` for tooling symmetry.
- Otherwise (or if the probe is inconclusive) -> post via `gh api`. As of the current `agent-reviews` release there is no review-posting flow, so `gh api` is the expected path.

Present the body + verdict + inline-comment count to the user and get explicit confirmation, then post a single review.

`gh api --field`/`-f`/`-F` only set top-level scalar values; they CANNOT build the nested `comments[]` array of objects the reviews endpoint requires for inline comments. Construct the complete review payload as JSON and pipe it through `--input -` instead. Each in-diff finding (from Step 6) becomes one `comments[]` entry `{ path, line, side, body }`; out-of-diff findings are NOT added here — they were already downgraded into `$REVIEW_BODY` in Step 6. `event` is the Step 7 verdict. A body-only review (zero in-diff findings) uses an empty `comments` array:

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
#     { "path": ".oat/projects/foo/bar/plan.md", "line": 42, "side": "RIGHT", "body": "..." },
#     { "path": "src/bar.ts", "line": 17, "side": "LEFT",  "body": "..." }
#   ]
# `side` is RIGHT for additions/context, LEFT only for explicit removed-code
# findings (Step 6). Use `[]` when there are no in-diff findings.
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
- Project not resolved (zero or multiple `state.md` mods in the diff): pass explicit `--project <path>`.
- `--project` path invalid (no `state.md`): the skill stops without posting; pass a directory containing `state.md`.
- Checkout fails: the skill auto-falls back to diff-only mode with a degraded-context warning; pass `--no-checkout` to force it.
- Prior-review SHA unreachable: re-invoke without `--narrow` to review full scope.
- Inline comment rejected at a file:line: the finding is downgraded to the top-level body, not dropped.
- Subagent unavailable: the skill falls through Tier 2 (fresh session) / Tier 3 (inline).
- Network / rate-limit errors: retry after backoff; report blocked state if persistent.

## Output Contract

At completion, report:

- PR number and HEAD SHA reviewed.
- Resolved project path and how it was resolved (diff scan vs `--project` override).
- Review type and scope token.
- Read mode (worktree checkout vs diff-only).
- Dispatch tier used (Tier 1 structured-output / Tier 2 fresh session / Tier 3 inline).
- Narrowing decision (full scope vs `<prior_sha>..<HEAD>`, and why).
- Severity counts and total findings.
- Inline-comment count posted vs findings downgraded to the body (out-of-diff).
- Verdict (`REQUEST_CHANGES` or `COMMENT`).
- Posting mechanism (`agent-reviews` or `gh api`) and whether the review was posted.
- Confirmation that the ephemeral worktree was removed.
- Confirmation that NO project artifact was mutated, committed, or pushed on this machine.

## Success Criteria

- PR scope resolved and confirmed.
- OAT project resolved from the diff (or `--project` override) and validated; project artifacts read read-only for mode-aware context.
- PR content acquired via ephemeral worktree (or diff-only fallback) without mutating the caller's working tree.
- Prior provide-remote reviews detected and filtered to this `(project, scope)`; re-review narrowing applied only after the stale-SHA guard passes.
- Review executed via Tier 1 (`oat-reviewer` structured-output, NO artifact) / Tier 2 (fresh session) / Tier 3 (inline), with graceful fallthrough.
- Findings produced with consistent 4-tier severities and file:line references.
- Inline comments mapped to in-diff positions; out-of-diff findings downgraded to the body, never dropped.
- Posted-review body carries the marker block first (with `oat_project` + `oat_review_scope`), correct severity counts, and the minor-fix nudge when minors are present.
- Verdict matches the C/I rule (`REQUEST_CHANGES` vs `COMMENT`; never auto-`APPROVE`).
- Single PR review posted (with user confirmation) via `agent-reviews` if supported, else `gh api`.
- Ephemeral worktree removed on success and on failure.
- No local artifact, no `plan.md` / `state.md` / `implementation.md` updates, no commits, no pushes on this machine.
