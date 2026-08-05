---
oat_status: complete
oat_ready_for: oat-project-quick-start
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

### Question 5: Filing-skill shape and destination configuration

**Q:** One filing skill or two verbs? And should filing destinations be
configured, prompted, or both?
**A:** One companion filing skill with per-lane routing (repo lane vs upstream
lane), a per-destination capability preflight, and an item approval step. A
`workflow.retro` config namespace sets the **default** filing destination per
repo (e.g. OAT itself → backlog items; another repo → GitHub issues).
Interactive runs confirm the configured destination ("configured as backlog
items — file that way?") with a per-run override; autonomous/non-interactive
runs use the config as-is without stopping to ask.
**Decision:** Config-as-default + interactive confirmation, mirroring the
`workflow.designMode` idiom (config consulted before prompting; non-interactive
uses explicit signals). Explicit filing config counts as consent for
non-interactive filing; with no config, non-interactive runs file nothing and
leave proposals in the artifact. Sanitization always applies when the
destination repo is public and the source repo is private.

### Question 6: Promotion posture (durable repo promotions)

**Q:** When the retro identifies durable repo promotions (docs, AGENTS, rules
edits, decision records), should the skill propose only, or also apply?
**A:** Both, mode-dependent. Manually triggered: generate the retro, then ask
at the end whether to apply the promotions. Autonomously triggered: governed
by a `workflow.retro.apply` setting (`auto | ask`, default `ask`; `ask`
means propose-only in non-interactive runs). Additionally, the skill supports
a standalone **apply mode** — invoked via an apply flag or natural language
("apply the retro findings") — which skips generation, locates the existing
retro artifact in the active project, and applies its promotion register.
**Decision:** One skill, two entry modes (generate, apply). The skill package
carries the apply procedure as a progressive-disclosure reference file, so
apply guidance ships with the skill rather than being re-derived per run.
Promotions in the artifact form a checkable register so apply runs are
idempotent and partial applies resume cleanly.

### Question 7: Validation strategy

**Q:** How do we prove the skill works before shipping — dogfood run, shape
check against the reference retro, or both?
**A:** Dogfood on a real completed project in this repo. The WordPress
reference retro (`references/project-retro.example.md`) serves as **guiding
principles** — a quality exemplar and starting point for the retro
contents/template discussion — not a rigid conformance target.
**Decision:** Acceptance gate is a live retro run against a completed OAT
project in this repo. The retro template/contents are derived from the
reference retro's structure, adapted to the register/filing machinery decided
above (template discussion captured separately).

### Question 8: Retro template contents

**Q:** Which sections are required core vs conditional, using the reference
retro's 16-section structure as the starting point?
**A:** User approved the proposed core/conditional split.
**Decision:** Required core (every retro): Executive Summary; Evidence and
Review Method (honesty contract — unavailable sources stated explicitly);
Outcome Snapshot; What Went Well; Challenges and Struggles; Where We Changed
Course; Repo Improvements as a **promotion register** with per-item status
(`proposed / approved / applied / rejected`) plus filing candidates; OAT
Upstream Feedback as a first-class lane (required even when empty; items are
sanitized ready-to-file drafts with filing status); Reflections (run-specific).
Conditional (when evidence warrants): Decision Register + Rejected/Superseded
Alternatives (feeds `oat decision new`); New Architecture Patterns; Domain
Learnings; Gotchas for Humans / for Autonomous Agents; Remaining Boundaries
and Follow-Ups. Structural changes vs the reference: the upstream lane is
explicit rather than folded into Challenges/Remaining Boundaries prose, and
both registers use machine-scannable item structure with status fields. The
artifact carries frontmatter (source project, generation date, evidence
sources used, register rollup status) so the completion offer, apply mode,
and filing skill can cheaply detect retro state. A `project-retro.md`
template lives in `.oat/templates/` alongside other lifecycle templates.

### Question 9: Docs surface

**Q:** Full docs in v1, or skill + AGENTS mention only?
**A:** Full docs.
**Decision:** v1 ships oat-docs updates alongside the code: lifecycle page
(new post-approval `retro` step), CLI config reference (`workflow.retro.*`
keys and the sequence step), a workflows entry for the retro skill, and
AGENTS/skill-index mentions. The five-package lockstep bump already applies,
so documentation lands in the same release.

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
8. **Autonomy split:** Artifact generation may auto-run when configured.
   Filing/promotions require consent — a live human approval in interactive
   runs, or explicit `workflow.retro` filing config in non-interactive runs.
   With no filing config, autonomous runs leave proposals in the artifact and
   file nothing.
9. **Upstream filing:** No auto issue creation from the retro skill itself.
   One companion filing skill with per-lane routing (repo lane → host repo
   issues or backlog items; upstream lane → OAT issues, collapsing into the
   repo lane when the host repo is OAT), per-destination capability preflight,
   artifact-driven item extraction, and an approval step. Lanes with no
   available destination are reported loudly, never dropped silently.
10. **Filing configuration:** `workflow.retro` config sets per-repo default
    filing destinations. Interactive runs confirm with per-run override;
    non-interactive runs use config as-is.
11. **Promotion apply modes:** Interactive generate runs end with an
    apply-now offer. `workflow.retro.apply` (`auto | ask`, default `ask`)
    governs autonomous runs. A standalone apply mode consumes an existing
    retro artifact's promotion register without regenerating the retro; the
    apply procedure ships inside the skill as a progressive-disclosure
    reference. Applying promotions (repo-local edits) is distinct from filing
    (issues/backlog items), which stays with the companion filing skill.

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
  environment-aware session review, no unsolicited auto-invocation.
- Retro is configurable as a post-approval sequence step; completion path
  offers it as a safety net; apply and filing dispositions work as decided.
- Full docs ship in v1 (lifecycle, config reference, workflows entry).
- Acceptance: a live dogfood retro run against a completed OAT project in
  this repo produces a useful artifact.
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
- Per-item destination retargeting during the filing approval step (v1 routes
  per lane; item-level overrides only if the need shows up in practice).
- Thin verb-alias wrappers (`file-issues` / `file-backlog-items`) that preset
  the routing answer — only if muscle-memory demand appears.

## Open Questions

- None remaining — all discovery questions resolved (see Clarifying
  Questions 1–9).

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
