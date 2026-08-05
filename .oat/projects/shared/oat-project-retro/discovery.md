---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-05
oat_generated: false
---

# Discovery: oat-project-retro

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Create an OAT **project retro skill** that runs at the end of an OAT project and
produces a retro artifact. The skill should review available project evidence —
session logs, project log, OAT execution log, and related project artifacts —
then synthesize room for improvement so there is a continuous feedback loop:

1. **Host repository feedback** — improvements for the repo where the project ran
2. **Upstream OAT feedback** — improvements to send back to Open Agent Toolkit
   (workflows, CLI tooling, skills, etc.) when warranted

Grounding handoff imported from
`voxmedia/wp-platform` commit `3179025e5d2dfe28cc977013f80b8528a28fbcf4`
(PR [#5333](https://github.com/voxmedia/wp-platform/pull/5333)):

- `references/oat-project-retro-skill-handoff.md` — skill authoring handoff
- `references/project-retro.example.md` — full reference retro artifact
- `references/001-long-running-verification-observability.example.md` —
  companion decision record created during that retro

## Clarifying Questions

### Question 1: Delivery scope for v1

**Q:** Whether v1 is skill-only, or also wires optional offer points into
adjacent lifecycle skills (`summary` / `complete`).
**A:** Skill + lifecycle offer wiring — adjacent skills may offer a retro
step after summary or before complete; still never auto-run.
**Decision:** Use Approach 2 for v1.

### Question 2: Offer points

**Q:** Which lifecycle skills should offer retro — summary only,
complete/closeout only, or both?
**A:** Superseded by the sequencing discussion (Question 3): retro evidence is
only complete after final approval (revise cycles, summary refreshes, operator
corrections are retro input), so a summary-time offer is premature.
**Decision:** Retro becomes an optional post-approval sequence step, plus a
safety-net offer in the completion path when no retro artifact exists. No
summary-time offer.

### Question 3: Sequencing and autonomous runs

**Q:** Where does retro fit in `workflow.postImplementSequence`
(`{ preApproval, postApproval }`), and should it auto-run in autonomous
workflows?
**A:** Retro is a `postApproval` step — the first moment the full run history
(including the approval/feedback tail) exists, and still before completion
freezes artifacts. In autonomous runs the retro **artifact generation** may
auto-run when explicitly configured; **acting** on the retro (durable repo
promotions, upstream filings) stays human-gated and is recorded as proposals
inside the artifact.
**Decision:** Add retro as an optional post-implement sequence step
(post-approval). Explicit config counts as consent, refining the handoff's
"never auto-run" rule to "never auto-run without explicit config or user
confirmation." Accepted scope consequence: CLI config surface grows
(publishable-package change, five-package lockstep version bump).

### Question 4: Upstream feedback filing

**Q:** Should the retro automatically create GitHub issues in the OAT repo for
upstream feedback?
**A:** No auto-creation from the retro skill. Instead, companion manually-run
filing skill(s) take a retro artifact as input (default: active project's
retro, optional explicit path), run a capability preflight per destination
(issues enabled? credentials sufficient?), extract feedback into proposed
issues/items, present the breakdown, and file only what the user approves.
Facts gathered: `voxmedia/open-agent-toolkit` is public with **issues
disabled** (prerequisite to enable); local `gh` auth suffices once enabled;
autonomous cross-repo filing would need a fine-grained PAT. Public-repo
content sanitization is required when the source repo is private.
**Decision:** Retro emits sanitized, ready-to-file feedback items; filing is a
separate manual skill step. Exact filing-skill shape (issues vs backlog items,
one skill vs two) under discussion.

## Solution Space

Request is **exploratory**: a successful ad-hoc retro exists and is packaged as
a handoff, but we still need to choose how much of the lifecycle surface to
touch in this project.

### Approach 1: Workflows skill only _(Recommended)_

**Description:** Author `oat-project-retro` as a first-class workflows skill
that resolves the active project, inventories evidence, optionally runs
parallel recon, writes `references/project-retro.md` with dual feedback lanes,
and optionally creates missing decision records / proposes durable promotions.
Do not auto-invoke on lifecycle completion.

**When this is the right choice:** The handoff already defines contract,
methodology, quality bar, and a proven artifact shape. Fastest path to a
reusable skill without coupling lifecycle skills yet.

**Tradeoffs:** Offer points after summary / before complete remain manual or
docs-only until a later project wires them.

### Approach 2: Skill + lifecycle offer wiring

**Description:** Build the skill and also update adjacent lifecycle skills so
they may _offer_ a retro step (still never auto-run) after summary or before
complete.

**When this is the right choice:** Discoverability is a hard requirement for
v1 and you want operators prompted at natural checkpoints immediately.

**Tradeoffs:** Broader blast radius across lifecycle skills; more review risk;
can ship after the skill proves useful.

### Approach 3: Skill + new CLI evidence helpers

**Description:** Add CLI commands to inventory/project-evidence surfaces, then
have the skill call them.

**When this is the right choice:** Evidence discovery is already painful enough
to justify tooling, or multiple skills need the same inventory.

**Tradeoffs:** Expands scope into publishable package surface and release
policy; likely overkill before the skill exists.

### Chosen Direction

**Approach:** Approach 2 — Skill + lifecycle offer wiring
**Rationale:** User selected discoverability at natural lifecycle checkpoints
for v1, while keeping the handoff's never-auto-run rule.
**User validated:** Yes

## Options Considered

### Option A: Offer after summary only

**Description:** `oat-project-summary` ends by offering an optional retro.

**Pros:**

- Natural reflective moment right after institutional memory is written
- Smaller blast radius than touching complete/closeout

**Cons:**

- Operators who skip summary never see the offer
- Premature: retro evidence completes only after final approval

**Chosen:** No

### Option B: Offer on completion/closeout path only

**Description:** Offer retro before archive/complete.

**Pros:**

- Catches projects that skip summary
- Last chance before artifacts freeze

**Cons:**

- Complete flow is already dense; another offer may be easy to dismiss

**Chosen:** Yes — as a safety-net offer when no retro artifact exists,
complementing the configured post-approval sequence step (Question 3)

### Option C: Offer at both summary and completion path

**Description:** Both skills can offer; second offer skipped if retro already exists.

**Pros:**

- Best discoverability
- Idempotent if gated on missing `references/project-retro.md`

**Cons:**

- Touches more lifecycle surface area
- Summary-time half is premature per the Question 3 sequencing insight

**Chosen:** No — superseded by post-approval sequence step + completion
safety-net offer

## Key Decisions

1. **Workflow:** Use quick-start (`oat-project-quick-start`) for this project.
2. **Outcome shape:** Deliverable is a retro skill + generated retro artifact
   focused on continuous improvement feedback (host repo + upstream OAT).
3. **Grounding source:** Use the wp-platform handoff and reference retro as
   primary design input rather than re-deriving the method.
4. **Invocation policy:** Explicit user request, confirmation, or explicit
   config opt-in — never auto-run otherwise.
5. **Output location (from handoff, provisional):**
   `{PROJECT_PATH}/references/project-retro.md` with dual feedback lanes.
6. **Delivery scope:** Approach 2 — ship the skill and wire optional offer
   points into adjacent lifecycle skills. Offers only; no unsolicited auto-run.
7. **Sequencing:** Retro is an optional `postApproval` step in
   `workflow.postImplementSequence`; runs after final HiLL approval, before
   completion. Requires CLI config expansion (lockstep package bump accepted).
8. **Autonomy split:** Artifact generation may auto-run when configured;
   promotions and upstream filings stay human-gated (proposal-only in
   autonomous runs).
9. **Upstream filing:** No auto issue creation from the retro. Companion
   manually-run filing skill(s) with per-destination capability preflight,
   artifact-driven issue extraction, and user approval before creating
   anything.

## Constraints

- Prefer evidence from real project execution surfaces (session logs, project
  log, execution learnings, lifecycle artifacts) over speculative
  recommendations.
- Separate host-repo vs upstream-OAT feedback clearly when both apply.
- Distinguish confirmed cause vs hypothesis vs inconclusive; do not invent
  session-only claims when session access is unavailable.
- Keep scope to skill authoring for continuous feedback; do not turn this into
  a rewrite of summary/wrap-up.
- Reference import note: `oat-pjm-update-repo-reference` was attached with the
  PR URL, but that skill updates `.oat/repo/pjm/` operational docs — not
  project `references/`. Files were imported into this project's
  `references/` instead.

## Success Criteria

- A runnable `oat-project-retro` skill exists in the workflows pack.
- Retro output is a durable project artifact useful for continuous improvement.
- Feedback is actionable and routed (host repo vs upstream OAT) when relevant.
- Skill contract matches the handoff quality bar: evidence-first, dual lanes,
  environment-aware session review, no auto-invocation.
- Reference handoff/example artifacts remain available under this project's
  `references/` for implementation.

## Out of Scope

- Unsolicited auto-running of retro (without config opt-in or confirmation).
- Auto-filing GitHub issues without user approval in the filing skill.
- Replacing `oat-project-summary` or `oat-wrap-up`.
- Building a general multi-project weekly retro product.
- Enabling issues on `voxmedia/open-agent-toolkit` (repo-settings prerequisite,
  handled outside this project).
- CLI evidence helpers beyond the post-implement sequence step addition.

## Deferred Ideas

- Optional `references/oat-upstream-feedback.md` split when upstream items are
  numerous — handoff already marks this optional.
- Evidence-audit automation skill — handoff lists as future-only.
- CLI evidence helpers — deferred unless inventory pain appears during
  implementation.

## Open Questions

- **Filing-skill shape:** One filing skill with per-lane destination routing,
  or two verbs (file-issues / file-backlog-items)? How does the backlog
  variant report upstream items it cannot file from a non-OAT repo?
- **Promotion posture:** Propose durable repo promotions only, or also apply
  narrowly scoped docs/instruction edits when approved in-session?
- **Validation strategy:** Dogfood against an existing OAT project in this
  repo, against the imported reference retro shape, or both?
- **Docs surface:** Does v1 include oat-docs pages / workflow index updates, or
  skill + AGENTS mention only?

## Assumptions

- The skill will primarily consume existing OAT project telemetry/logs rather
  than inventing a new logging subsystem in this project.
- Upstream feedback is optional in volume but required as an explicit lane /
  section even when empty or thin.
- Handoff methodology (orient → parallel recon → root synthesis → promotions →
  commit) is the baseline to generalize, not a one-off script to copy verbatim.

## Risks

- **Thin evidence:** Some projects may lack rich session/execution logs.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Degrade gracefully; document missing sources in the
    retro artifact instead of fabricating findings.
- **Overfitting to one reference run:** The e2e reliability retro is unusually
  deep; smaller projects need a scaled section set.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep required dual lanes + core sections; allow
    domain-learning sections to shrink or omit.
- **Lifecycle coupling creep:** Offer wiring expands review surface across
  adjacent skills.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep changes to offer/prompt language only; no
    auto-run; limit touch points to the agreed lifecycle skills.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- **Quick mode → straight to plan:** proceed directly to `plan.md` when
  scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused
  `design.md` (architecture, components, data flow, testing) before
  planning. Choose this when discovery surfaced architecture choices
  or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed
  the scope is larger or more complex than expected.
