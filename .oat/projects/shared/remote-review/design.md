---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-29
oat_generated: false
---

# Design: remote-review

## Overview

This project adds two skills — `oat-review-provide-remote` (ad-hoc) and
`oat-project-review-provide-remote` (project-scoped) — that let an agent on
machine B fetch a GitHub PR opened by an agent on machine A, review it, and
post findings back as a single GitHub PR review. They mirror the existing
`*-receive-remote` pair, closing the symmetry gap in the
local-vs-remote × provide-vs-receive matrix. GitHub is treated as the source
of truth for the remote rail: no local artifact is written, no `plan.md`
bookkeeping happens on machine B, and the posted PR review carries enough
metadata (`oat_provide_remote`, `oat_review_head_sha`, `oat_project`,
`oat_review_scope`) for `receive-remote` on machine A to round-trip cleanly
into plan tasks.

The reading strategy is hybrid: `gh pr checkout` into an ephemeral worktree
is the default for rich-context review; a `gh pr diff` fallback (or explicit
`--no-checkout`) keeps the skill working on thin machines where checkout
fails. Posting is a single `POST /repos/:owner/:repo/pulls/:N/reviews` call
via `gh api` — `REQUEST_CHANGES` when any Critical/Important findings exist,
`COMMENT` otherwise (including clean reviews; no auto-`APPROVE`). The
project-rail variant locates the project on machine B by scanning the PR
diff for `.oat/projects/*/*/state.md` mods (with `--project <path>` override),
reads project artifacts from the checkout to drive mode-aware review, but
never mutates them — `receive-remote` on machine A owns `plan.md` updates.

Alongside the two new skills, all four existing receive skills
(`oat-review-receive`, `oat-review-receive-remote`,
`oat-project-review-receive`, `oat-project-review-receive-remote`) get a
small behavioral correction: the default disposition for **minor** findings
flips from `defer` to `convert`, and the existing rationale-required gate on
`defer` extends to minors. This brings manual receive into line with what
auto-spawned reviews (`oat_review_invocation: auto`) already do, eliminating
the friction where small findings get queued as backlog items instead of
just fixed inline.

## Architecture

### System Context

Two new skills slot into the existing OAT review skill family alongside the
four existing receive skills they pair with. The remote rail spans two
machines: machine A runs the project flow and `*-receive-remote` after a
review lands; machine B runs the new `*-provide-remote` skills against the
same PR. GitHub is the single source of truth between them — no shared
filesystem state. Within OAT's local installation surface, the new skills
live under `.agents/skills/` and follow the same SKILL.md / version-bump /
pack-discovery conventions as the rest of the review family.

**Key Components:**

- **`oat-review-provide-remote`** (new): Ad-hoc remote review skill. No
  project context. Hybrid read strategy. Posts to GitHub. Inline-only
  execution (no tier model).
- **`oat-project-review-provide-remote`** (new): Project-aware remote
  review skill. Locates project from PR diff (with `--project` override).
  Reads project artifacts for mode-aware review quality. Posts to GitHub
  with project metadata in the review body. Tier 1/2/3 dispatch
  (`oat-reviewer` subagent → fresh session → inline).
- **Posted-review-body schema** (new spec): The canonical layout for the
  top-level body of a posted GitHub PR review — markers
  (`oat_provide_remote`, `oat_review_head_sha`, `oat_project`,
  `oat_review_scope`), summary, severity counts, minor-fix nudge. Consumed
  by `*-receive-remote` for round-tripping.
- **`oat-reviewer` subagent contract extension** (modified): The existing
  reviewer agent gains a "return findings as structured output, do not
  write artifact" mode used by the project-rail Tier 1 dispatch. Triggered
  by a prompt-level flag in the dispatch payload.
- **Receive-skill minor-default flip** (modified): All four receive skills
  (`oat-review-receive`, `oat-review-receive-remote`,
  `oat-project-review-receive`, `oat-project-review-receive-remote`) get
  their per-severity disposition default changed for minor
  (`defer` → `convert`) and the rationale-required gate extended to defer
  at any severity.
- **`bl-9fb8` backlog item update** (admin): Update the existing backlog
  item to record provide-remote as shipped and respond-remote /
  summarize-remote pairs as still open.

### Component Diagram

```
                          ┌──────────────────────┐
                          │       GitHub PR      │
                          │     (source of truth)│
                          └──────────┬───────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐          ┌───────────────────┐          ┌───────────────┐
│   Machine A   │          │      Machine B    │          │   Machine A   │
│ (project flow)│          │  (remote review)  │          │ (receive loop)│
├───────────────┤          ├───────────────────┤          ├───────────────┤
│ open PR via   │          │ oat-(project-)    │          │ oat-(project-)│
│ oat-project-  │  ──PR──▶ │ review-provide-   │ ──post──▶│ review-receive│
│ pr-final      │          │ remote (machine B)│          │ -remote       │
└───────────────┘          │                   │          │               │
                           │  ┌─────────────┐  │          │  - fetch posted│
                           │  │ gh pr       │  │          │    review     │
                           │  │ checkout    │  │          │  - triage     │
                           │  │ (or gh pr   │  │          │  - create     │
                           │  │  diff)      │  │          │    plan tasks │
                           │  └──────┬──────┘  │          │  - commit     │
                           │         │         │          │    bookkeeping│
                           │         ▼         │          └───────────────┘
                           │  ┌─────────────┐  │
                           │  │ oat-reviewer│  │
                           │  │ (project    │  │
                           │  │  rail Tier1)│  │
                           │  └──────┬──────┘  │
                           │         │         │
                           │         ▼         │
                           │  ┌─────────────┐  │
                           │  │ gh api      │  │
                           │  │ POST review │  │
                           │  └─────────────┘  │
                           └───────────────────┘
```

### Data Flow

The cross-machine flow runs in three phases:

1. **PR resolution + project resolution** (machine B): Resolve PR number
   (`--pr <N>` or `gh` auto-detect from the current branch when relevant).
   For project rail, scan PR diff for `.oat/projects/*/*/state.md` mods or
   use `--project <path>` override to identify the target OAT project.
2. **Check out + review** (machine B): Acquire an ephemeral worktree
   first, then run `gh pr checkout` _inside_ that worktree so the user's
   current working tree is never mutated. The mechanics use repo-scoped
   git commands explicitly so they remain runnable regardless of the
   caller's working directory:
   1. Resolve `repo_root` from the caller's working directory:
      `repo_root=$(git rev-parse --show-toplevel)`. Choose
      `ephemeral_path` under a system temp directory (e.g.,
      `mktemp -d`-derived path) — placed _outside_ `repo_root` to
      avoid path collisions and accidental nested-worktree issues.
   2. Create the worktree with the repository context explicit:
      `git -C "$repo_root" worktree add --detach "$ephemeral_path" HEAD`.
      The `-C "$repo_root"` flag is load-bearing — without it the
      command fails when the caller's CWD is not inside the repository
      (e.g., a thin remote-review machine invoking the skill from a
      home directory). `HEAD` is a placeholder ref overwritten by the
      `gh pr checkout` in the next step.
   3. From inside the ephemeral worktree, run
      `gh pr checkout <N>` (i.e., `cd "$ephemeral_path" && gh pr checkout <N>`)
      so the PR branch lands there, not in the caller's worktree.
   4. After review and posting, remove the worktree via
      `git -C "$repo_root" worktree remove --force "$ephemeral_path"`
      and clean up the temp directory.

   If `oat-worktree-bootstrap-auto` reuse is chosen (still an Open
   Question), the plan must verify its invocation contract supports
   "check out PR N into an ephemeral worktree" with the same
   caller-tree safety guarantees (repo-scoped git invocation,
   ephemeral path outside the repo root, force-removal teardown).
   Otherwise we hand-roll the mechanics above.

   If checkout succeeds, the reviewer has full-tree context (project rail
   also reads `state.md` / `spec.md` / `design.md` / `plan.md` /
   `implementation.md` from the checkout). If worktree creation or
   `gh pr checkout` fails, or if `--no-checkout` is set, fall back to
   diff-only mode: fetch the PR diff via `gh pr diff <N>` and the PR
   metadata via `gh pr view <N> --json …`. Warn the user that context is
   degraded. Run the review through the appropriate dispatch (inline for
   ad-hoc; Tier 1/2/3 for project rail).

3. **Post review** (machine B → GitHub): Build the review body (summary +
   severity counts + minor-fix nudge + metadata markers) and the inline
   comments array (one entry per finding with file/line/body). Single
   `POST /repos/:owner/:repo/pulls/:N/reviews` with
   `event: REQUEST_CHANGES` (if any C/I findings) or `event: COMMENT`
   (otherwise). Capability-probe `agent-reviews` for an equivalent posting
   flow first; use it for tooling symmetry when available.

The roundtrip back via `*-receive-remote` on machine A works through that
skill's existing flow unchanged — it already fetches unresolved PR review
comments from GitHub by PR number and triages them into tasks. The marker
block (`oat_provide_remote`, `oat_review_head_sha`, and on the project rail
`oat_project` + `oat_review_scope`) is embedded in the posted review body
as forward-compatible routing metadata: it enables subsequent
provide-remote passes to find the prior review (re-review narrowing) and is
available for a future `*-receive-remote` enhancement to auto-route by
project/scope. Teaching `receive-remote` to parse those markers is **out of
scope** for this project (it is not modified here beyond the minor-default
flip); the markers render as nothing in GitHub's UI and do not disrupt the
current receive flow.

## Component Design

### `oat-review-provide-remote`

**Purpose:** Ad-hoc remote PR review. No project context required.

**Responsibilities:**

- Resolve PR number (`--pr <N>` arg or `gh` auto-detect from current
  branch when relevant).
- Acquire PR content via hybrid read strategy (ephemeral worktree +
  `gh pr checkout` primary, `gh pr diff` fallback, `--no-checkout` flag
  forces diff-only). Worktree mechanics per **Data Flow** above.
- Detect prior provide-remote runs on the PR: list PR reviews via
  `gh api /repos/.../pulls/<N>/reviews`, parse each body's marker block,
  filter to reviews where `oat_provide_remote: true` AND
  `oat_review_scope == "ad-hoc"`. Take the most recent matching review
  and validate its SHA before narrowing — see **Error Handling →
  Stale prior-review SHA** below for the exact guard. If the guard
  passes, narrow to `<prior_sha>..<HEAD>`. If the guard fails (rebase,
  force-push, shallow clone, or diff-only mode where the prior SHA
  isn't fetched), fall back to full PR scope and warn the user that
  the prior review SHA is no longer reachable. Honors
  `workflow.autoNarrowReReviewScope` (no prompt when `true`; confirm
  prompt otherwise). If no matching prior review exists, use full PR
  diff. Project-rail markers (`oat_project`, scope tokens like `pNN`)
  are ignored by this filter — only ad-hoc reviews narrow against
  each other.
- Run the review inline (no tier model) using the existing ad-hoc review
  checklist + severity model.
- Build the posted-review-body payload (summary, severity counts,
  minor-fix nudge, markers).
- POST the review via `gh api` (or `agent-reviews` posting flow if probed
  as available).

**Interfaces:**

```
oat-review-provide-remote [--pr <N>] [--no-checkout] [--narrow|--no-narrow]
```

Inputs are CLI-style args parsed from `$ARGUMENTS`. No file inputs. No
file outputs on machine B.

**Dependencies:**

- `gh` CLI (authenticated; `gh auth status`).
- Optionally `npx agent-reviews` for posting symmetry.
- Existing ad-hoc review checklist source
  (`.agents/skills/oat-review-provide/references/review-artifact-template.md`)
  for finding shape consistency.

**Design Decisions:**

- Inline-only (no Tier 1/2/3) matches the local `oat-review-provide`
  shape; the local skill has no tier model, and adding one only on the
  remote rail would create asymmetry without a clear quality win for
  ad-hoc reviews.
- `--no-checkout` is opt-in (not the default) so the common case gets
  full-context review.

### `oat-project-review-provide-remote`

**Purpose:** Project-aware remote PR review with mode-aware quality checks.

**Responsibilities:**

- Resolve PR number (same as ad-hoc).
- Acquire PR content via hybrid read strategy (same as ad-hoc, including
  worktree mechanics).
- Locate the OAT project on the PR's checkout: scan PR diff for paths
  matching `.oat/projects/*/*/state.md` (two levels: scope/project). If
  exactly one project's `state.md` is touched, use it. If multiple, error
  out with the candidate list and require `--project <path>`. If zero,
  require `--project <path>`.
- Read project artifacts from the resolved project path within the
  checkout (`state.md`, `spec.md`, `design.md`, `plan.md`,
  `implementation.md`, `discovery.md`) for mode-aware review context.
  Read-only — never mutate, never commit.
- Read scope token (`pNN`, `pNN-tNN`, `pNN-pMM`, `final`,
  `artifact <name>`) from `$ARGUMENTS` or infer from PR state. For
  `final`, also gather deferred-findings ledger from `implementation.md`.
- Detect prior provide-remote runs: same lookup as ad-hoc, but filter to
  reviews where `oat_provide_remote: true` AND
  `oat_project == <resolved-project-path>` AND
  `oat_review_scope == <current-scope-token>`. Take the most recent
  matching review and validate its SHA before narrowing per the
  guard in **Error Handling → Stale prior-review SHA**. If the guard
  passes, narrow accordingly; otherwise fall back to full PR scope
  with a warning. Different-scope or different-project prior reviews
  do not narrow the current one.
- Dispatch via Tier 1/2/3:
  - **Tier 1:** spawn `oat-reviewer` subagent with the project context +
    posted-review-body schema + structured-output flag in the prompt,
    requesting findings as structured output (no artifact write).
  - **Tier 2:** recommend fresh session.
  - **Tier 3:** inline review fallback.
- Build the posted-review-body payload with project markers
  (`oat_project`, `oat_review_scope`) + standard markers + summary +
  minor-fix nudge.
- POST the review via `gh api` (or `agent-reviews` if probed available).

**Interfaces:**

```
oat-project-review-provide-remote [code <scope>|artifact <scope>]
                                  [--pr <N>] [--project <path>]
                                  [--no-checkout] [--narrow|--no-narrow]
```

**Dependencies:**

- All of `oat-review-provide-remote`'s dependencies.
- `oat-reviewer` subagent (with the new "return findings, no artifact"
  mode).
- Project-flow commit discipline (`state.md` present in PR diff) for
  diff-scan project resolution. Documented as an assumption in
  `discovery.md`.

**Design Decisions:**

- Read-only on machine B (no `plan.md` updates, no commits, no pushes) —
  `receive-remote` on machine A owns those mutations.
- Diff-scan project resolution > requiring `--project` always: the
  project flow already commits `state.md` per existing bookkeeping rules,
  so the high-signal scan works in the common case. Explicit `--project`
  is the disambiguator, not the primary mechanism.
- Re-review narrowing scoped by `(oat_project, oat_review_scope)` tuple,
  not just by `oat_provide_remote: true`. Prevents a `p02` re-review from
  narrowing against the prior `final` review's SHA (which would skip a
  lot of code) and prevents cross-project marker collision when multiple
  OAT projects share a PR.

### Posted-review-body schema

**Purpose:** Canonical layout for the top-level body of a GitHub PR
review posted by either provide-remote skill. Defines what
`receive-remote` will see.

**Responsibilities:**

- Carry routing metadata (markers) for `receive-remote` and subsequent
  provide-remote passes.
- Carry the human-readable summary + severity counts + minor-fix nudge.

**Interfaces:** see **Data Models → Posted-review-body** below.

**Dependencies:** None at the schema level. Consumers are the two
provide-remote skills (writers) and the four receive skills (readers).

**Design Decisions:**

- HTML-comment marker block instead of YAML frontmatter: GitHub renders
  markdown in review bodies but strips YAML frontmatter; HTML comments
  render as nothing and survive round-tripping.
- `oat_review_invocation` already exists in the local review artifact
  frontmatter; reuse the same key for symmetry.

### `oat-reviewer` subagent contract extension

**Purpose:** Add a "return findings as structured output, do not write
artifact" mode to the existing `oat-reviewer` agent.

**Responsibilities:**

- Detect the structured-output mode flag in the dispatch payload.
- Run the existing review checklist (no change to the review logic).
- Return findings as structured output (typed object with
  severity-bucketed arrays) instead of writing a review artifact file.

**Interfaces:** see **Data Models → StructuredFindings** below.

**Dependencies:** None new. The agent already has the review checklist.

**Design Decisions:**

- Prompt-level flag (not a sibling agent definition) because the review
  logic is identical; only the output sink changes.

### Receive-skill minor-default flip

**Purpose:** Bring manual receive disposition defaults into line with
auto-receive.

**Responsibilities:**

- Change the default disposition for minor findings from `defer` to
  `convert` in all four receive skills.
- Extend the existing "defer requires rationale" rule (currently applied
  to medium and below) to apply at all severities including minor.

**Interfaces:** N/A — internal skill behavior change.

**Dependencies:** N/A.

**Design Decisions:**

- One default per severity bucket per skill file; the change touches only
  the disposition default and rationale-gate language. Auto-spawned
  review behavior is unchanged (it already converts minors).

### `bl-9fb8` backlog item update

**Purpose:** Record the scope split in the existing PR review skill set
backlog item.

**Responsibilities:**

- Update `bl-9fb8` description to note that provide-remote (both rails)
  shipped under this project, with respond-remote and summarize-remote
  pairs still open.
- Adjust acceptance criteria if needed.
- Update `priority_reviewed` and `updated` dates.

**Interfaces:** N/A — admin task using `oat-pjm-update-repo-reference`
or equivalent backlog tool.

**Dependencies:** N/A.

**Design Decisions:** Keep as a single backlog item rather than
splitting into two (one shipped, one open) — the remaining work is still
coherent (two pairs of remote skills with a shared posting mechanism).

## Data Models

### Posted-review-body

**Purpose:** The body of a GitHub PR review posted by provide-remote.
Embedded markers in an HTML-comment block let consumers (re-review
narrowing, `*-receive-remote`) parse routing metadata; the rest of the
body is human-readable prose.

**Schema:**

```markdown
<!-- oat-review-metadata
oat_provide_remote: true
oat_review_head_sha: <40-char SHA>
oat_review_scope: <scope token | "ad-hoc">
oat_project: <project path, project rail only — key omitted on ad-hoc rail>
oat_review_invocation: manual | auto
-->

## Summary

<2-3 sentence overview of the review>

## Severity Counts

- Critical: N
- Important: N
- Medium: N
- Minor: N

## Notes

Minor findings are included inline. We recommend fixing minors during this
cycle rather than tracking them as backlog items — they're usually faster
to just resolve than to manage.

## Verification

<commands to verify any proposed fixes; omitted when zero findings>
```

**Validation Rules:**

- The marker block is the first content in the body (before any prose
  headings).
- All marker values are simple YAML scalars on a single line; no nested
  structures.
- `oat_review_head_sha` MUST be a full 40-character SHA, not a short SHA
  (re-review narrowing must work even after the PR HEAD advances).
- `oat_project` is omitted entirely on the ad-hoc rail (not set to
  `null`) so the parser's "project rail or not" check is a key-existence
  test.
- `oat_review_scope: "ad-hoc"` on the ad-hoc rail is a sentinel value —
  prevents accidental cross-rail narrowing.

**Storage:**

- **Location:** GitHub — body of a `POST /repos/.../pulls/<N>/reviews`
  call. Durable as long as the PR exists.
- **Persistence:** Immutable post-creation under normal API use; GitHub
  does not edit review bodies once posted (a new review can supersede
  but does not overwrite).

### StructuredFindings (oat-reviewer return shape)

**Purpose:** Typed return shape from `oat-reviewer` when invoked in
structured-output mode by project-rail Tier 1 dispatch.

**Schema:**

```typescript
interface StructuredFindings {
  summary: string; // 2-3 sentence review summary
  findings: Array<{
    id: string; // C1, I1, M1, m1 — stable per dispatch
    severity: 'critical' | 'important' | 'medium' | 'minor';
    title: string;
    file: string | null; // repo-relative path
    line: number | null; // 1-based line in the post-image (new file)
    body: string; // finding description and rationale
    fix_guidance: string | null; // suggested fix (may be null)
  }>;
  verification_commands: string[]; // commands the user can run to verify fixes
}
```

**Validation Rules:**

- `severity` MUST be one of the four enum values.
- `file` and `line` MUST both be set or both be `null`; an inline finding
  requires both. Reviewer-level findings without a specific location set
  both to `null` and land in the top-level summary, not as inline
  comments.
- ID prefixes match the existing convention (`C`/`I`/`M`/`m`) and are
  stable within a single dispatch — no renumbering across dispatches.

**Storage:** None. Pure return value, consumed in-memory by the caller.

## Error Handling

### Inline-comment line mapping

GitHub's `POST /repos/:owner/:repo/pulls/:N/reviews` rejects inline
comments at file:line positions not present in the PR diff. This is the
single biggest source of posting failures and must be handled explicitly.

For each finding with non-null `file` + `line`, before adding it to the
`comments[]` payload:

1. **In rich-context mode** (`gh pr checkout` succeeded): parse the PR's
   patch via `gh api /repos/.../pulls/<N>/files` to get per-file hunk
   ranges (using the `patch` field per file). Validate that the
   finding's `line` falls within an additions / context hunk for the
   `RIGHT` side. Set `side: "RIGHT"` for additions/context;
   `side: "LEFT"` only when the finding is explicitly about removed code.
2. **In diff-only fallback mode** (`gh pr diff`): the unified diff IS the
   source of hunk ranges. Parse hunk headers (`@@ -<a>,<b> +<c>,<d> @@`)
   to derive the same mapping. Same `RIGHT`/`LEFT` rules.
3. **If `line` falls outside the diff:**
   - Downgrade the finding to the top-level review body (append a
     "Findings outside the PR diff" subsection with `file:line` reference
     and finding body).
   - Do NOT silently drop the finding.
   - Do NOT shift `line` to the nearest in-diff line — the location
     matters semantically; shifting hides the cross-cut concern.

### Checkout failures

`gh pr checkout` can fail for several reasons (auth, network, branch
state conflicts, fork PR push-access issues). Detection:

- Capture `gh` exit code and stderr.
- Distinguish auth failures (re-routing via `gh auth status`) from
  network failures (retry once with backoff) from branch-state failures
  (fall back to diff-only with clear message).

On any failure: clean up the partially-created worktree
(`git worktree remove --force` is safe even if the worktree never
populated), then enter diff-only fallback with a one-line warning that
context quality is degraded.

### Posting failures

The single `POST .../reviews` call can fail for:

- **Authentication failure:** surface `gh auth status` output and stop.
  Findings are kept in memory in case the user fixes auth and retries.
- **PR closed or merged mid-review:** surface a clear "PR <state>; cannot
  post review" message. Findings are presented inline as a fallback so
  the work isn't lost.
- **Inline-comment validation rejection** (despite line-mapping
  validation above — e.g., file path changed during review): retry once
  after re-mapping with the most current PR file list. If still
  rejected, downgrade the offending finding(s) per the line-mapping
  rules above and retry.
- **Rate limit:** surface the limit window and resume time. Stop and
  ask the user to retry.

No findings are silently dropped on posting failure.

### Capability probe (`agent-reviews` posting flow)

Probe at startup with a non-mutating capability check (exact flag TBD
during plan authoring — likely `npx agent-reviews --help` parse).
Cache the result for the duration of the run. If `agent-reviews`
supports posting, prefer it (tooling symmetry). If it does not, fall
through to `gh api`. Never fail the skill because the probe is
inconclusive — `gh api` is the safe path.

### Stale prior-review SHA (re-review narrowing guard)

When a matching prior provide-remote review is found, validate its
`oat_review_head_sha` before using it for narrowing. PR force-pushes,
rebases, and shallow clones can render a previously-recorded SHA
unreachable from the current PR HEAD. Narrowing against an unreachable
SHA either errors out at `git rev-list` time or — worse — produces a
misleading partial range.

The guard is two checks against the ephemeral worktree (rich-context
mode) or against `git ls-remote`/`git fetch` results plus diff metadata
(diff-only mode):

1. **Existence check** — `git -C "$ephemeral_path" cat-file -e <prior_sha>`.
   Confirms the object exists locally. In diff-only mode, fetch the
   single ref `git fetch origin <prior_sha>:refs/oat-prior-review`
   first and re-check; skip the second check if that fetch fails.
2. **Ancestry check** — `git -C "$ephemeral_path" merge-base --is-ancestor <prior_sha> <pr_head_sha>`.
   Confirms `<prior_sha>` is reachable from current PR HEAD (i.e., not
   orphaned by a force-push).

If both checks pass: narrow to `<prior_sha>..<pr_head_sha>` as
designed.

If either check fails: fall back to the full PR scope (merge-base
between PR base and HEAD). Emit a warning the user can see:

> "Prior provide-remote review for this scope referenced SHA
> `<prior_sha>`, but it's no longer reachable from PR HEAD (likely
> rebase or force-push). Reviewing the full PR diff instead."

Override behavior:

- If the user passed `--narrow` explicitly, the guard failure becomes
  a hard error (the user asked for narrowing; refusing to narrow
  silently would violate that intent). Surface the unreachability and
  stop; the user can re-invoke without `--narrow` to proceed with
  full-scope review.
- If `workflow.autoNarrowReReviewScope == true`, the guard failure
  still falls back to full scope automatically and the warning is
  surfaced as the auto-fallback notice. Auto-narrow is opportunistic,
  not a hard constraint.

## Testing Strategy

Quick mode — key test levels and scenarios per component. No requirement-to-test mapping (lightweight design doesn't carry a `spec.md` Requirement Index).

### Unit Tests

Scope: pure-logic components shipped under `packages/cli` (or equivalent) that back the new skills' decision points. These are language-level tests with no GitHub or git side effects.

- **Marker block parser**
  - Parses a well-formed HTML-comment marker block into a typed object.
  - Returns `null` when the marker block is absent (not present on non-OAT reviews).
  - Tolerates extra whitespace, mixed casing in marker keys, and unknown extra keys (forward-compat).
  - Rejects markers where `oat_review_head_sha` is not a 40-char hex SHA.
  - Treats `oat_project: <value>` and key-omitted differently (project rail vs ad-hoc rail discrimination).

- **Inline-comment line-mapping validator**
  - Given hunk ranges + a finding's `file` + `line`, classifies as in-diff or out-of-diff with the correct side (`RIGHT` for additions/context, `LEFT` for explicit removed-code findings).
  - Returns out-of-diff status without mutating the finding.
  - Handles renamed files (path before vs after rename) per `gh api /pulls/<N>/files`.
  - Handles binary files (no inline comments possible — always out-of-diff).

- **Re-review narrowing filter**
  - Given a list of reviews + `(rail, project, scope)` tuple, returns the most recent matching review or `null`.
  - `(ad-hoc, null, "ad-hoc")` matches only reviews with `oat_review_scope == "ad-hoc"` AND no `oat_project` key.
  - `(project, "<path>", "p02")` matches only reviews with matching project AND scope; rejects same project / different scope; rejects same scope / different project.
  - Sort order is by review submitted timestamp, descending — newest matching review wins.
  - When `workflow.autoNarrowReReviewScope == true`, no prompt; otherwise prompt-confirm.

- **Project resolution (project rail)**
  - Given a list of changed files from a PR diff, finds `.oat/projects/*/*/state.md` entries.
  - Returns single project path when exactly one matches.
  - Returns error with candidate list when multiple match.
  - Returns error when zero match.
  - `--project <path>` override takes precedence over diff scan.

- **Posted-review-body builder**
  - Produces a body matching the schema for ad-hoc (no `oat_project` key) and project rail (with `oat_project`, `oat_review_scope` keys).
  - Severity counts match the input findings.
  - Minor-fix nudge is included when minor findings are present; the "Notes" section is omitted when severity counts are all zero.
  - Marker block is the first element of the body.
  - Verdict mapping: `event: REQUEST_CHANGES` when any C or I finding is present; `event: COMMENT` otherwise (including zero findings).

### Integration Tests

Scope: components that touch git, GitHub (via stub/fixture), or the local filesystem.

- **Worktree lifecycle**
  - `git worktree add --detach` + `gh pr checkout <N>` (stubbed) + `git worktree remove --force` against a test repository.
  - Cleanup runs even when review-phase fails (try/finally semantic).
  - Verify caller's working tree is unchanged before and after.

- **`gh api` capability probe + fallback flow**
  - With `agent-reviews` posting capability stub returning "supported": skill prefers `agent-reviews`.
  - With stub returning "not supported": skill falls through to `gh api`.
  - With stub erroring on probe: skill falls through to `gh api` (no failure).

- **`gh pr diff` fallback parsing**
  - Synthetic diff with multiple files, multi-hunk files, rename, binary file — line mapping returns expected classifications.

- **Round-trip marker fidelity**
  - Build posted-review-body for a known finding set; pass the produced body string back through the marker parser; verify the parsed object equals the input markers.

- **Receive-skill minor-default flip**
  - Synthetic review with minor findings; run each receive skill's triage flow with no user input; verify default disposition is `convert`, not `defer`.
  - Verify a user-supplied `defer` choice at minor severity triggers the rationale-required gate.

### End-to-End / Manual Verification

A real `gh`-against-GitHub run is the only way to verify the full posted-review shape and `gh api`'s rejection behavior on out-of-diff inline comments. CI does not exercise GitHub interaction in this project. Manual verification per shipped skill:

- **`oat-review-provide-remote`**
  - On a test PR with known content, invoke the skill (default flags).
  - Confirm: ephemeral worktree was created and removed; PR review posted with expected severity counts; inline comments appear at the right file/line; marker block is present in the body and renders as nothing in GitHub's UI; verdict matches the C/I rule.

- **`oat-project-review-provide-remote`**
  - On a test PR that includes `state.md` mods for a known project, run with no `--project` arg.
  - Confirm project was auto-resolved; review body includes `oat_project` + `oat_review_scope` markers; mode-aware review (e.g., flagged spec-design drift) is visible in findings.
  - Re-run with `--project <valid-but-different-project-path>` (a
    project other than the diff-scanned default) to verify the
    override takes precedence over diff-scan resolution.
  - Re-run with `--project <wrong-path>` (a non-existent or
    non-OAT-project path) to verify the validation error is clear and
    the skill stops without posting.

- **Re-review narrowing**
  - Run provide-remote, push a fix commit, re-run; confirm the second run prompts (or auto-narrows under config) to the `<first_review_head_sha>..<HEAD>` range and that the findings are scoped accordingly.

- **Receive-side default flip**
  - After provide-remote posts findings (mixed severities), run the corresponding `*-receive-remote` skill on machine A.
  - Confirm minor findings default to `convert` and trigger the rationale prompt on explicit `defer`.

### Test Locations

- Unit tests: alongside the implementation under `packages/cli/src/.../*.test.ts` (or equivalent), following existing project conventions.
- Integration tests: under the same package but in a separate `__integration__/` directory or marked with the existing project's integration-test flag.
- Manual verification: documented in the project's `implementation.md` "Manual Verification" section per task that ships behavior visible at the GitHub API boundary.

## Open Questions

- **`agent-reviews` posting capability surface:** Does the bundled `npx agent-reviews` expose a "post review" command (or analogous), and if so what flags? Resolve via empirical probe at the top of plan authoring; if absent, plan goes straight to `gh api` and the capability-probe step still ships (forward-compat for when `agent-reviews` gains the capability).
- **`oat-reviewer` subagent prompt-flag name and dispatch payload shape:** What exact key signals structured-output mode (`oat_output_mode`, `output: structured`, or a sibling agent definition)? Decide during plan authoring after reading the existing `oat-reviewer` agent file.
- **`oat-worktree-bootstrap-auto` reuse:** Can the existing bootstrap accept a "check out PR N" target, or do we hand-roll the ephemeral worktree flow inside the new skills? Read its surface during plan authoring.
- **Multi-line review comments:** GitHub's `POST .../reviews` `comments[]` supports `start_line` + `line` for multi-line ranges. Do we use that for findings spanning multiple lines (e.g., "this whole function is suspicious")? Default for v1: single-line only, with multi-line as a follow-up. Captured as a deferred idea, not a v1 blocker.
- **Marker block on supersedes:** If a human reviewer (not the skill) posts a review on the same PR between two provide-remote runs, the most-recent matching review query still narrows correctly (it only filters in OAT-marker reviews). But if the human edits or dismisses a prior OAT review, do we want to detect that and refuse to narrow? Default for v1: trust the markers; the dismiss/edit case is rare. Document as a known sharp edge.

## Implementation Phases

Phase ordering is provisional — final task structure lives in `plan.md`. Phases reflect dependency ordering so each phase can verify cleanly before the next builds on it.

### Phase 1: Shared infrastructure

**Goal:** Land the pure-logic primitives both new skills depend on, with full unit-test coverage.

**Tasks (provisional):**

- Marker block parser + Posted-review-body builder under `packages/cli` (or equivalent shared location).
- Inline-comment line-mapping validator (works against both `gh api files` JSON and parsed `gh pr diff` output).
- Re-review narrowing filter.
- Project resolution helper (diff-list → project path).

**Verification:** Unit test suite for the four components above passes; lint/format/type-check green.

### Phase 2: `oat-review-provide-remote` (ad-hoc rail)

**Goal:** Ship the ad-hoc skill end-to-end, callable via `npx`/skill invocation.

**Tasks (provisional):**

- Author `SKILL.md` (mode assertion, process steps, success criteria, frontmatter with `version: 1.0.0` and allowed-tools).
- Wire skill process: PR resolution → hybrid read → re-review narrowing prompt → inline review → posted-body build → `gh api` POST (with `agent-reviews` capability-probe).
- Integration tests: worktree lifecycle, capability probe, round-trip marker fidelity.
- Manual verification against a test PR.

**Verification:** Skill validates under `pnpm oat:validate-skills`; integration suite green; manual verification recorded in `implementation.md`.

### Phase 3: `oat-reviewer` subagent contract extension

**Goal:** Add structured-output mode so project-rail Tier 1 can dispatch the reviewer without an artifact write.

**Tasks (provisional):**

- Read existing `oat-reviewer` agent file; decide flag name + dispatch payload shape.
- Add structured-output mode (prompt-level flag); return `StructuredFindings`.
- Bump agent file `version:` per the per-shipped-content rule.

**Verification:** Tier 1 dispatch in the next phase exercises the structured-output path; manual verification confirms findings come back as the expected shape.

### Phase 4: `oat-project-review-provide-remote` (project rail)

**Goal:** Ship the project-aware skill.

**Tasks (provisional):**

- Author `SKILL.md` (mirroring `oat-project-review-provide` structure, adapted for remote rail + read-only project context).
- Wire skill process: PR resolution → project resolution → hybrid read → re-review narrowing (project + scope filter) → Tier 1/2/3 dispatch → posted-body build with project markers → `gh api` POST.
- Integration tests for project-resolution + project-scoped re-review narrowing.
- Manual verification against a test PR with a known project's `state.md` mods.

**Verification:** Skill validates; integration green; manual verification recorded.

### Phase 5: Receive-skill minor-default flip

**Goal:** Apply the disposition default change across all four receive skills.

**Tasks (provisional):**

- Edit `oat-review-receive` SKILL.md disposition defaults + rationale-gate language.
- Edit `oat-review-receive-remote` similarly.
- Edit `oat-project-review-receive` similarly.
- Edit `oat-project-review-receive-remote` similarly.
- Bump each SKILL.md `version:` per the per-shipped-content rule.
- Update receive-skill integration tests to cover the new default + rationale gate.

**Verification:** `pnpm oat:validate-skills` green; integration tests for default flip pass; sample run on a synthetic minor-finding set yields `convert` default.

### Phase 6: Backlog item + release prep

**Goal:** Record the scope split in `bl-9fb8` and verify the lockstep release contract is satisfied.

**Tasks (provisional):**

- Update `bl-9fb8` (description, acceptance criteria, dates).
- Bump lockstep public package versions across the five publishable packages.
- Run `pnpm release:validate` and resolve any blockers.

**Verification:** `pnpm release:validate` exits clean; lockstep versions match across the five packages; backlog index regenerated if applicable.

### Parallelism

Phase 1 must complete before Phases 2 and 4 (both depend on the shared primitives). Phase 3 (subagent contract) must complete before Phase 4 (project rail Tier 1 dispatch needs it). Phase 5 (receive-skill flip) is independent of Phases 2-4 and could run concurrently in a separate worktree — its write set (`.agents/skills/oat-(project-)review-receive(-remote)/SKILL.md`) does not overlap with Phases 2-4's writes (new skills + agent file). Phase 6 must come last (it ships the lockstep version bump and runs `release:validate` against the full diff).

Provisional `oat_plan_parallel_groups`:

- Sequential: `[1]`
- Parallel candidate: `[2, 3, 4]` chain on one side, `[5]` on the other side, joining at `[6]`.

Final declaration lives in `plan.md` after dependency + write-set re-validation during plan generation.
