---
oat_status: in_progress
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
   current working tree is never mutated. The mechanics:
   1. Create the worktree via `git worktree add --detach <ephemeral-path>`
      from a temporary directory (preferred: reuse
      `oat-worktree-bootstrap-auto` if its API can accept a PR target —
      noted as Open Question).
   2. From inside the ephemeral worktree, run `gh pr checkout <N>` so the
      PR branch lands there, not in the caller's worktree.
   3. After review and posting, remove the worktree via
      `git worktree remove --force <ephemeral-path>` and clean up the
      temporary directory.

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

The roundtrip back via `*-receive-remote` on machine A is unchanged — that
skill already fetches reviews from GitHub by PR number; the only addition
is that it learns to recognize the `oat_provide_remote` markers and (for
the project rail) the `oat_project` + `oat_review_scope` markers when
routing findings into plan tasks.

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
  `oat_review_scope == "ad-hoc"`. Take the most recent matching review;
  narrow to `<that_review.oat_review_head_sha>..<HEAD>`. Honors
  `workflow.autoNarrowReReviewScope` (no prompt when `true`; confirm
  prompt otherwise). If no matching prior review exists, use full PR
  diff. Project-rail markers (`oat_project`, scope tokens like `pNN`) are
  ignored by this filter — only ad-hoc reviews narrow against each other.
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
  matching review and narrow accordingly. Different-scope or
  different-project prior reviews do not narrow the current one.
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
