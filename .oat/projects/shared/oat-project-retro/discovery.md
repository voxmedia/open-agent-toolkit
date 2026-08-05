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

**Chosen:** Pending Question 2

### Option B: Offer on completion/closeout path only

**Description:** Offer retro before archive/complete.

**Pros:**

- Catches projects that skip summary
- Last chance before artifacts freeze

**Cons:**

- Complete flow is already dense; another offer may be easy to dismiss

**Chosen:** Pending Question 2

### Option C: Offer at both summary and completion path

**Description:** Both skills can offer; second offer skipped if retro already exists.

**Pros:**

- Best discoverability
- Idempotent if gated on missing `references/project-retro.md`

**Cons:**

- Touches more lifecycle surface area

**Chosen:** Pending Question 2

## Key Decisions

1. **Workflow:** Use quick-start (`oat-project-quick-start`) for this project.
2. **Outcome shape:** Deliverable is a retro skill + generated retro artifact
   focused on continuous improvement feedback (host repo + upstream OAT).
3. **Grounding source:** Use the wp-platform handoff and reference retro as
   primary design input rather than re-deriving the method.
4. **Invocation policy:** Explicit user request or confirmation only — never
   auto-run merely because implementation/summary completed.
5. **Output location (from handoff, provisional):**
   `{PROJECT_PATH}/references/project-retro.md` with dual feedback lanes.
6. **Delivery scope:** Approach 2 — ship the skill and wire optional offer
   points into adjacent lifecycle skills. Offers only; no auto-run.

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

- Auto-running retro on project completion.
- Replacing `oat-project-summary` or `oat-wrap-up`.
- Building a general multi-project weekly retro product.
- Broad CLI/package work unless later explicitly expanded (Approach 3).

## Deferred Ideas

- Optional `references/oat-upstream-feedback.md` split when upstream items are
  numerous — handoff already marks this optional.
- Evidence-audit automation skill — handoff lists as future-only.
- CLI evidence helpers — deferred unless inventory pain appears during
  implementation.

## Open Questions

- **Offer points:** Which lifecycle skills should offer retro — summary only,
  complete/closeout only, or both (skip second offer if retro already exists)?
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
