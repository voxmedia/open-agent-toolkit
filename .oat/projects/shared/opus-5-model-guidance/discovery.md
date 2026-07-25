---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-25
oat_generated: false
---

# Discovery: opus-5-model-guidance

## Initial Request

Qualify and adopt Anthropic's `claude-opus-5` (released 2026-07-24) in the
repository's canonical model-selection guidance, refreshing the dated examples
shipped in PR #172. The task-class ladder and the Opus-first routing policy do
not change; only the Opus incumbent and its supporting metadata change.

The request arrived as a handoff brief from a prior session, carrying
qualification evidence, an operator-validated decision, and a numbered change
list covering three guidance references, pinned Cursor dispatch variants, a
mechanics-reference verification, a reverification record, and the repo's
version-bump/sync/lockstep contract.

## Clarifying Questions

### Question 1: Workflow mode

**Q:** The handoff left mode to the operator — quick project, direct change
with review, or import of the handoff as an external plan. Which?
**A:** Quick workflow.
**Decision:** Scaffold a quick-mode OAT project. The handoff brief is treated
as session context feeding this discovery rather than as an imported plan
artifact.

### Question 2: Which Opus 5 rungs to pin as Cursor role variants

**Q:** The handoff specified `claude-opus-5-thinking-xhigh` at minimum, with an
optional mid rung. Which rungs should be materialized?
**A:** Initially "probably medium as well", then — after CursorBench evidence
was retrieved — "make high opus medium and high, and frontier opus xhigh and
max, mirror sol".
**Decision:** Materialize four rungs (`medium`, `high`, `xhigh`, `max`),
mirroring the existing GPT-5.6 Sol shape exactly. Sol has no pinned `low`
variant, so Opus 5 gets none either.

### Question 3: Tier placement in the bundled dispatch-matrix recommendation

**Q:** Should the new variants enter the bundled recommendation, and in which
tiers?
**A:** Yes, and mirror Sol's tier split.
**Decision:** `medium` and `high` join the `high` tier alongside Sol
medium/high; `xhigh` and `max` join the `frontier` tier alongside Sol
xhigh/max and the two Fable entries.

### Question 4: Fable's position in the Cursor task-class matrix

**Q:** CursorBench shows Opus 5 outscoring Fable 5 at both high and xhigh for
roughly half the cost. Should the Cursor matrix stop naming Fable as the
primary escalation route?
**A:** Reorder.
**Decision:** Opus 5 becomes the primary Cursor escalation route. Fable is
retained as the cross-family reviewer pairing for consequential work, not as
first choice. This follows the evidence while preserving cross-family review.

### Question 5: Unverifiable Cursor frontmatter bracket syntax

**Q:** Pinned variants use a Cursor frontmatter form (`claude-fable-5[effort=xhigh]`)
that cannot be verified for Opus 5 without a live probe, and the bracket form
does not encode whether thinking is on.
**A:** Assume thinking-on and document the assumption.
**Decision:** Derive `claude-opus-5[effort=<rung>]` from the established Claude
family pattern, record the assumption in the reverification record, and note it
at the mapping site.

### Question 6: Sonnet 5 high in the Cursor economy tier

**Q:** Opus 5 low strictly dominates `claude-sonnet-5-high` on CursorBench
(higher score, lower cost, half the tokens, a third fewer steps). Act now?
**A:** Backlog it.
**Decision:** Leave the economy tier untouched in this project. File a repo
backlog item carrying the CursorBench evidence so an economy-tier rebalance can
consider Composer and Luna at the same time.

## Solution Space

The approach was not in question — the handoff brief prescribed it and the
operator validated it. The only genuinely open dimensions were rung selection
and tier placement, resolved in Questions 2-4 above once benchmark evidence
replaced the release-notes-only basis the handoff was drafted against.

## Key Decisions

1. **Incumbent swap:** `claude-opus-5` replaces `claude-opus-4-8` in the
   general hard-reasoning and consequential slots in `provider-claude.md`.
2. **Cyber-sensitive carve-out:** Opus 4.8 remains the operational default for
   security review, vulnerability triage, auth boundaries, permissions, and
   other dual-use work. Opus 5 ships automatic fallbacks for
   safety-classifier-flagged requests, implying stricter classifiers than 4.8,
   and its refusal behavior on benign dual-use security work is unverified. The
   re-evaluation condition is stated explicitly in the guidance.
3. **Policy is unchanged:** the five task classes, the escalation boundaries,
   and the Opus-first rationale are untouched. Fable 5 remains
   exceptional-escalation only. Sonnet and Haiku rows in `provider-claude.md`
   are unchanged.
4. **Cursor rung set mirrors Sol:** four pinned variants at medium, high,
   xhigh, and max; no low rung.
5. **Evidence basis upgraded:** CursorBench 3.2 per-rung score and cost data is
   incorporated into the Cursor guidance and the evidence summary. Under the
   repo's own evidence-priority ordering, harness-specific benchmark data
   outranks provider release notes for a Cursor route.
6. **Managed Claude tier needs no code change:** the `providers.claude` policy
   tier `opus` compiles to `{ model: 'opus' }`, a Claude CLI alias Anthropic
   resolves to the current Opus. The tier therefore resolves to Opus 5
   automatically. Cyber-sensitive contexts reach 4.8 through an explicit
   dispatch-matrix route target rather than through the four-value tier ladder.

## Constraints

- Frontmatter `version:` must be bumped for every canonical skill changed under
  `.agents/skills/*/SKILL.md`, once per skill across the final PR diff.
- Bundled assets count as shipped CLI functionality, so the five public
  packages (`cli`, `control-plane`, `docs-config`, `docs-theme`,
  `docs-transforms`) must be version-bumped in lockstep.
- `pnpm release:validate` must pass before the work is considered done.
- Provider views under `.cursor/`, `.claude/`, and `.codex/` are generated;
  role files must come from `oat sync`, never hand-written.
- `packages/cli/assets/` mirrors `packages/cli/config/` and is produced by the
  bundle script; the two must stay identical.
- Named models in the guidance references are dated examples subordinate to
  live catalogs and current user instructions. Guidance must not present the
  new incumbent as durable policy.

## Success Criteria

- `provider-claude.md`, `provider-cursor.md`, and `evidence-and-refresh.md`
  carry Opus 5 as the hard-reasoning and consequential incumbent with refreshed
  freshness metadata and a stated cyber-sensitive carve-out.
- Four `claude-opus-5-thinking-*` pinned variants exist for both
  `oat-reviewer` and `oat-phase-implementer`, generated by sync.
- The bundled dispatch-matrix recommendation places the new rungs in the `high`
  and `frontier` tiers and its version identifier reflects the change.
- Existing skill-validation tests still pass unmodified, confirming the change
  is an incumbent refresh and not a policy change.
- `pnpm lint`, `pnpm format`, `pnpm type-check`, `pnpm test`, and
  `pnpm release:validate` all pass.
- A reverification record per `evidence-and-refresh.md`'s schema appears in the
  PR description.

## Out of Scope

- Any change to the five task classes, escalation boundaries, or the
  Opus-first policy.
- Sonnet and Haiku rows in `provider-claude.md`.
- The Cursor economy tier, including the dominated `claude-sonnet-5-high`
  entry.
- `oat-dispatch-subagents/references/provider-claude.md` — verified by grep to
  contain no versioned model names, so no edit is required.
- Downstream propagation: the internal-skills `pnpm run sync:skills` rerun and
  user-scope installs on the operator's machines happen after merge.

## Deferred Ideas

- Cursor economy-tier rebalance — `claude-sonnet-5-high` is strictly dominated
  by Opus 5 low on CursorBench, and at $3.19 it is already a cost outlier in a
  tier whose other members run $0.44-$1.14. Deferred to a backlog item so
  Composer and Luna placement can be reconsidered together rather than
  piecemeal.
- Pinning a `claude-opus-5-thinking-low` variant — excluded to mirror Sol,
  which has no pinned low rung. The alias remains selectable ad hoc.

## Assumptions

- The Cursor frontmatter pin for Opus 5 is `claude-opus-5[effort=<rung>]`,
  derived from the established Claude family pattern
  (`claude-fable-5[effort=xhigh]`, `claude-sonnet-5[effort=high]`). Not
  verified by live probe.
- That bracket form resolves to the thinking-enabled variant. The syntax cannot
  express the thinking axis, Anthropic defaults thinking on, and at xhigh and
  max thinking-on is the only legal reading.
- The operator's 2026-07-24 Cursor catalog snapshot (16 Opus 5 aliases) is
  accurate. Partially corroborated: `claude-opus-5-thinking-high-fast` appears
  in this session's own Cursor subagent roster, and CursorBench publishes
  results for Opus 5 at low, medium, high, extra high, and max.

## Risks

- **Silent thinking-mode mismatch:** if `claude-opus-5[effort=medium]` resolves
  to the non-thinking variant, the medium and high pinned roles would quietly
  run at lower capability with no error surfaced.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Document the assumption at the mapping site and in
    the reverification record; spot-check one materialized variant in Cursor
    post-merge.
- **Opus 5 classifier behavior on dual-use security work is unverified:**
  the automatic-fallbacks feature implies stricter classifiers than 4.8.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** This is precisely why the cyber-sensitive carve-out
    retains 4.8; the guidance states the re-evaluation condition explicitly.
- **Benchmark cost figures may not generalize:** CursorBench $/task derives
  from token usage against published per-token pricing on one task
  distribution, which may not match real repository work or Cursor's actual
  billing.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Present the numbers as dated benchmark evidence with
    their source and date, consistent with how existing entries are framed.

## Next Steps

Quick mode, straight to plan — scope is clear, all decisions are resolved, and
no architecture questions remain.
