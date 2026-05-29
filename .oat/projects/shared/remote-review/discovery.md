---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-05-29
oat_generated: false
---

# Discovery: remote-review

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

OAT's review skill set covers four of six expected positions in a 2x3 matrix
(local/remote × provide/receive/respond):

| Rail    | Local provide                | Local receive                | Remote receive                      | Remote provide |
| ------- | ---------------------------- | ---------------------------- | ----------------------------------- | -------------- |
| Ad-hoc  | `oat-review-provide`         | `oat-review-receive`         | `oat-review-receive-remote`         | **missing**    |
| Project | `oat-project-review-provide` | `oat-project-review-receive` | `oat-project-review-receive-remote` | **missing**    |

When agent A finishes a project and opens a PR, the user wants agent B (on a
different machine) to provide a remote review on that PR. Today the only
workable path is running `oat-review-provide` and manually layering on the
GitHub-posting shape from `receive-remote`, which is fragile and undocumented.

This project closes that gap by adding `oat-review-provide-remote` (ad-hoc
rail) and `oat-project-review-provide-remote` (project rail) so the agent on
machine B has a first-class skill.

Backlog reference: `bl-9fb8` (`pr-review-skill-set.md`) proposes the broader
six-skill remote set (provide-remote, respond-remote, summarize-remote on
both rails). This project ships only the two provide-remote skills; the
remaining two pairs stay on the backlog.

While touching the receive skills' files, this project also revises the
default disposition for **minor findings** across all four receive skills
(manual receive currently defers minors by default; auto-spawned reviews
already convert them — the friction the user is fixing is manual being out of
step with auto).

## Solution Space

The brainstorm explored the design end-to-end. Each major design choice had
2-3 distinct approaches considered; the chosen direction for each is
recorded under **Key Decisions** with rationale. The headline shape:

### Approach 1: GitHub-as-source-of-truth, project-aware but read-only on machine B _(Recommended — chosen)_

**Description:** Provide-remote checks out the PR (hybrid: `gh pr checkout`
primary, `gh pr diff` fallback for thin envs), runs the review, posts a
single GitHub PR review with inline comments via `gh api` (or `agent-reviews`
if it exposes a posting flow). No local artifact, no `plan.md` updates, no
bookkeeping commits on machine B. Project-rail variant locates the project
in the PR's checkout (diff scan for `.oat/projects/*/*/state.md` mods, with
`--project <path>` override) and uses its artifacts to drive mode-aware
review quality — but doesn't mutate them. Machine A's existing
`receive-remote` already owns `plan.md` updates and turns the posted review
into fix tasks.

**When this is the right choice:** When the remote review is symmetric with
`receive-remote` and machine B is ephemeral. Avoids concurrent-write risk
on the PR branch from two machines.

**Tradeoffs:** Two sources of truth visually (PR review + receive-remote's
plan.md update later), but only one writer for each. No double-record audit
artifact on machine B.

### Approach 2: Full bookkeeping mirror

**Description:** Project-rail provide-remote updates `plan.md` Reviews row
on machine B's PR checkout and commits/pushes that bookkeeping back.

**When this is the right choice:** Single-machine workflows where both
provide and receive happen on the same checkout.

**Tradeoffs:** Concurrent-write risk on the PR branch (machine A may have
moved on), push conflicts, second source of truth for the same plan.md row.
Rejected.

### Approach 3: No project rail; ad-hoc only

**Description:** Ship one skill (`oat-review-provide-remote`) with optional
`--project <path>` flag.

**When this is the right choice:** Minimal surface area is the priority.

**Tradeoffs:** Loses skill discrimination (matching the receive-remote pair
shape), weaker mode-aware UX, no scope tokens. Rejected.

### Chosen Direction

**Approach:** GitHub-as-source-of-truth, project-aware but read-only on
machine B (Approach 1).
**Rationale:** Symmetric with `receive-remote` (one rail in, one rail out),
keeps the closed-loop workflow clean, avoids concurrent-write risk, and
preserves mode-aware review quality.
**User validated:** Yes (explicit confirmation during brainstorm Steps 1-10).

## Options Considered

### Option A: Read strategy — Hybrid (`gh pr checkout` primary, `gh pr diff` fallback)

**Description:** Try to check out the PR into an ephemeral worktree for
rich-context review. Fall back to diff-only with a degraded-context warning
if checkout fails or `--no-checkout` is passed.

**Pros:**

- Default path gets full-tree context (cross-file regressions, dead code, design drift visible).
- Thin-env fallback exists; skill doesn't hard-fail when checkout isn't viable.

**Cons:**

- Diff-only fallback produces lower-quality reviews; user needs to know.

**Chosen:** Yes.

### Option B: Posting mechanism — Single PR review via `gh api`

**Description:** One `POST /repos/:owner/:repo/pulls/:N/reviews` call with
`event: REQUEST_CHANGES` (if any Critical/Important findings) or
`event: COMMENT` (otherwise), plus a `comments[]` array of inline
file:line annotations. Top-level body carries the summary + severity counts

- minor-fix nudge. Capability-probe `agent-reviews` for an equivalent
  posting flow first; prefer that for tooling symmetry if available.

**Pros:**

- One review = one notification = one well-formed unit for `receive-remote` to fetch back.
- Verdict mapping (`REQUEST_CHANGES` for C/I) is unambiguous.
- Matches how human reviewers leave reviews.

**Cons:**

- Slightly more complex than per-finding standalone comments.

**Chosen:** Yes.

### Option C: Local artifact — GitHub-only

**Description:** No local `.md` artifact written. The posted PR review is
the durable record.

**Pros:**

- Solves "where do we write on a thin machine without checkout" entirely.
- Matches `receive-remote` symmetry (it also has no local artifact).
- Single source of truth for the remote-rail flow.

**Cons:**

- No commitable on-disk audit trail on machine B.

**Chosen:** Yes.

### Option D: Project resolution on machine B — Diff scan + `--project` override

**Description:** Locate the project by scanning the PR diff for
`.oat/projects/*/*/state.md` modifications (high signal — the project flow
commits state.md on the PR branch). Fall back to explicit `--project <path>`
arg when the scan is ambiguous or absent.

**Pros:**

- High-signal automatic resolution in the common case.
- Explicit override for edge cases (multiple projects in one PR, etc.).

**Cons:**

- Requires the project flow to commit `state.md` — confirmed true via existing
  `oat-project-implement` and `oat-project-document` bookkeeping commits.

**Chosen:** Yes.

### Option E: Re-review narrowing — Detect via PR conversation history

**Description:** Query the PR for prior reviews containing the
`oat_provide_remote: true` marker. If one exists, narrow scope to
`<last_review_head_sha>..<current PR HEAD>`. Default to confirm-prompt;
honors existing `workflow.autoNarrowReReviewScope` config to skip the
prompt (same key the local skill already reads).

**Pros:**

- Matches the local skill's re-review narrowing pattern (same config key).
- Cycles get cheaper as the PR progresses.
- Posted review body is the durable handoff marker — symmetric with the
  rest of the design.

**Cons:**

- Marker discipline required; if a manual review interleaves without the
  marker, narrowing may overcount the scope.

**Chosen:** Yes.

### Option F: Disposition default for minor findings — Flip to `convert`; defer at any severity requires rationale

**Description:** Currently all four receive skills default minor → `defer`.
This project flips that to `convert` (fix inline) and extends the existing
rationale-required gate (already in place for medium defer) to defer at any
severity. Brings manual receive in line with auto-receive behavior
(`oat_review_invocation: auto` already auto-converts minors).

**Pros:**

- Matches what the user would do by hand 95% of the time.
- Single mental model across auto and manual paths.
- Rationale gate keeps the defer escape hatch honest.
- Mechanically tiny: one default per severity bucket per skill, plus
  rationale rule extension.

**Cons:**

- Behavioral change for existing users muscle-memoried to the current default.

**Chosen:** Yes.

### Option G: Summary nudge — Embed minor-fix recommendation in posted GitHub body

**Description:** The top-level review body explicitly recommends inline
fixes for minors over backlog tracking. Reinforces the new disposition
policy at the point of human consumption.

**Pros:**

- Free; the summary body is already prose.
- Visible to humans reading the PR review, not just to the receive skill.

**Cons:**

- None significant.

**Chosen:** Yes.

### Option H: Verdict when no findings — Post `COMMENT` with all-clear summary

**Description:** Even on a clean review, post a `COMMENT` review with an
all-clear summary. Carries the `oat_provide_remote` + `oat_review_head_sha`
markers so re-review narrowing on the next cycle still has an anchor. Do
not auto-`APPROVE`.

**Pros:**

- Preserves the re-review anchor.
- Avoids the social/governance weight of automated APPROVE.

**Cons:**

- One more notification per clean cycle.

**Chosen:** Yes.

### Option I: Tier model — Project rail uses Tier 1/2/3; ad-hoc rail inline-only

**Description:** Project-rail provide-remote spawns `oat-reviewer` as a
subagent (Tier 1), falls back to fresh session recommendation (Tier 2), then
inline (Tier 3) — same shape as the local project skill. Ad-hoc rail runs
inline only (matches its local counterpart, which has no tier model).
Subagent contract is extended slightly: instead of "write artifact to path
X", it's "return findings as structured output for the caller to post."

**Pros:**

- Review quality wins from fresh context apply identically on the remote rail.
- Per-rail symmetry with the local skills.

**Cons:**

- Modest extension to the `oat-reviewer` subagent prompt contract (sibling
  mode for "return findings, don't write artifact").

**Chosen:** Yes.

## Key Decisions

1. **Scope:** Ship `oat-review-provide-remote` and
   `oat-project-review-provide-remote` only. `respond-remote` and
   `summarize-remote` (both rails) stay on `bl-9fb8`. Update `bl-9fb8` to
   record the split.
2. **Read strategy:** Hybrid — `gh pr checkout` into ephemeral worktree
   when possible, `gh pr diff` fallback with clear "limited context" warning
   when not. `--no-checkout` flag forces diff-only.
3. **Posting mechanism:** Single PR review via `gh api`
   (`POST /repos/:owner/:repo/pulls/:N/reviews`). Capability-probe
   `agent-reviews` for an equivalent flow first; prefer it for tooling
   symmetry when available, else direct `gh api`.
4. **Verdict mapping:** `REQUEST_CHANGES` when any Critical or Important
   findings are present. `COMMENT` otherwise (including clean reviews).
   Never auto-`APPROVE`.
5. **Local artifact:** None. GitHub-only. The posted review is the durable
   record. No `.md` written on machine B; no bookkeeping commit; no push.
6. **Project rail boundary:** Read-only on machine B. Project-rail
   provide-remote reads `spec.md` / `design.md` / `plan.md` /
   `implementation.md` / `state.md` from the PR's checkout to drive
   mode-aware review, but does not mutate them. Machine A's
   `receive-remote` owns `plan.md` updates when it processes the posted
   review.
7. **Project resolution:** Scan the PR diff for `.oat/projects/*/*/state.md`
   mods; that's the project. Explicit `--project <path>` arg overrides
   when ambiguous or missing.
8. **Review-body markers:** Posted review body frontmatter / preamble
   carries `oat_provide_remote: true`, `oat_review_head_sha: <sha>`,
   `oat_project: <path>` (project rail), and `oat_review_scope: <scope>`
   (project rail). These let `receive-remote` route correctly and let
   subsequent provide-remote passes find the prior review for re-review
   narrowing.
9. **Re-review narrowing:** Detect prior `oat_provide_remote` markers in
   PR review history. Narrow scope to `<last_review_head_sha>..<HEAD>`.
   Confirm prompt by default; skip when
   `workflow.autoNarrowReReviewScope == true` (same config key as local
   skill).
10. **Disposition default flip:** All four receive skills change minor
    default from `defer` to `convert`. Defer at any severity requires
    rationale (extension of existing medium-defer rationale gate).
11. **Summary nudge:** Posted GitHub review body explicitly recommends
    inline fixes for minors over backlog tracking.
12. **Tier model:** Project rail uses Tier 1/2/3 dispatch matching the
    local project-review-provide skill. Ad-hoc rail is inline-only.

## Constraints

- `gh` CLI must be authenticated on machine B (same prereq as
  `receive-remote`).
- `agent-reviews` is the optional posting backend if it exposes a
  capability; otherwise `gh api` direct.
- Project-rail resolution depends on `state.md` mods being present in the
  PR diff — true today because both `oat-project-implement` and
  `oat-project-document` commit them, but worth confirming during plan
  authoring.
- `oat-reviewer` subagent definition must support a "return findings,
  don't write artifact" mode for Tier 1 dispatch on the remote rail.
- Lockstep public package version bump applies if any change ships under
  `packages/cli`, `packages/control-plane`, `packages/docs-config`,
  `packages/docs-theme`, `packages/docs-transforms`, or under the bundled
  asset directories (`.agents/skills`, `.agents/agents`, `.oat/templates`,
  `.oat/scripts`, `apps/oat-docs/docs`). Skills changes here trigger this.
- Each skill SKILL.md edited on this branch must bump its `version:`
  per the per-shipped-stage rule.

## Success Criteria

- `oat-review-provide-remote` exists, validates, and posts a single PR
  review to GitHub with the documented verdict mapping.
- `oat-project-review-provide-remote` exists, validates, resolves the
  project from the PR diff, drives mode-aware review using project
  artifacts in the checkout, and posts.
- Both skills honor the hybrid read strategy with a working
  diff-only fallback.
- Re-review narrowing fires on second-and-later passes when prior
  `oat_provide_remote` markers are present in the PR.
- All four receive skills' minor-default flip is in place and consistent
  with the auto-review behavior.
- Posted review body includes the minor-fix nudge and the necessary
  metadata markers for round-tripping with `receive-remote`.
- Backlog item `bl-9fb8` is updated to record what shipped vs what
  remains.
- `pnpm release:validate` passes if shipped functionality affects
  publishable packages.

## Out of Scope

- `oat-review-respond-remote` and `oat-project-review-respond-remote`
  (reply-to-thread-after-fix skills). Remain on `bl-9fb8`.
- `oat-review-summarize-remote` and `oat-project-review-summarize-remote`
  (PR summary comment skills). Remain on `bl-9fb8`.
- Changes to the existing local-rail provide skills beyond the receive-side
  default flip.
- Changes to `agent-reviews` itself (we adapt to its existing capability
  surface, do not extend it in this project).

## Deferred Ideas

- Auto-`APPROVE` flag (`--approve-if-clean`) for trusted internal
  workflows — deferred until there's a clear governance request for it.
- Local-artifact mirror flag (`--local-artifact`) — deferred unless an
  audit-trail need surfaces.

## Open Questions

- **`agent-reviews` posting capability:** Does `npx agent-reviews` expose
  a "post review" command (or analogous), or is it fetch-and-reply only?
  Capability probe lives in the plan; affects whether we route through it
  for posting symmetry or go direct to `gh api`.
- **`oat-reviewer` subagent mode:** Is the "return findings, don't write
  artifact" mode best added as a prompt-level flag in the existing
  `oat-reviewer` agent file, or as a sibling agent definition? Decide
  during plan authoring after reading the agent file.
- **Worktree handling:** Should provide-remote use OAT's existing
  worktree-bootstrap path (`oat-worktree-bootstrap-auto`) for the
  `gh pr checkout` step, or do its own ephemeral worktree management?
  Reuse is preferred if the bootstrap can accept "check out PR #N";
  worth a closer look during plan authoring.

## Assumptions

- Machine B has working `gh` auth with read+write access to the PR
  repository.
- The project-flow commit discipline (state.md, plan.md, etc. committed
  on the PR branch) is reliable enough to support diff-scan project
  resolution. If we find counter-examples, we add `--project` as a
  fallback hint in the user-facing skill prompt.

## Risks

- **`agent-reviews` lacks a posting capability:**
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation:** Fall back to direct `gh api` calls. Already planned.

- **Diff scan misidentifies project in multi-project PR:**
  - **Likelihood:** Low
  - **Impact:** Low
  - **Mitigation:** Explicit `--project <path>` override + clear error
    when scan returns >1 candidate.

- **Concurrent agent posts collide on the same PR:**
  - **Likelihood:** Low
  - **Impact:** Low
  - **Mitigation:** GitHub's review API is naturally serializing; the
    second review just creates a new review entry. Acceptable.

- **User on machine A pushes new commits between provide-remote runs
  without going through receive-remote:**
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation:** Re-review narrowing still works on `<last_review_head_sha>..<HEAD>`;
    findings might overlap with what the user already addressed by hand,
    but no broken state.

## Next Steps

Quick mode — given the brainstorm produced a concrete skill structure,
posting protocol, project-resolution algorithm, verdict mapping, and tier
model, **lightweight design is recommended** before plan generation. The
design should fix the skill file structures (sections, mode assertions,
process steps), the `oat-reviewer` subagent contract extension, and the
posted-review-body schema. Plan then turns those into tasks per skill.
