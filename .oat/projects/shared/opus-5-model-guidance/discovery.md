---
oat_status: complete
oat_ready_for: oat-project-quick-start
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
**Decision:** Opus 5 becomes the primary Cursor escalation route for
`default-implementation`, `hard-reasoning`, and the Anthropic half of the
`consequential` author/reviewer pair. Fable drops to exceptional escalation
only, consistent with canon.

**Correction applied after plan review:** an earlier draft of this decision
described Fable as "the cross-family reviewer pairing." That is wrong. The
cross-family property of the consequential pair comes from pairing OpenAI (Sol)
with Anthropic; Fable and Opus are both Anthropic, so swapping one for the other
does not affect cross-family review at all. The consequential default becomes
Sol xhigh plus Opus 5 thinking xhigh, escalating to Sol max plus Opus 5 thinking
max, with Fable reserved for exceptional escalation beyond that.

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
**A:** Initially "backlog it", then reversed at the requirements gate.
**Decision:** Drop `claude-sonnet-5-high` from the Cursor economy tier. Demote
its pin mapping to `catalogue: false` rather than deleting it, matching the
existing `claude-fable-5-xhigh` precedent, so explicit configurations keep
working. Anthropic presence moves up to Opus 5 low in `balanced`.

### Question 7: Revised economy and balanced tiers (requirements gate)

**Q:** At the requirements gate the operator redirected scope: put Opus 5 low
in `balanced`, change economy's Sonnet entry to medium, and add
`gpt-5.6-sol-low`. Two of the three are strictly dominated on CursorBench — is
that intended?
**A:** Skip `gpt-5.6-sol-low`; add Opus 5 low to `balanced`; drop Sonnet from
Cursor economy entirely.
**Decision:** Five Opus 5 rungs total (low in `balanced`; medium and high in
`high`; xhigh and max in `frontier`). `gpt-5.6-sol-low` is excluded — it is
dominated on both score and cost by `gpt-5.6-luna-high` from the same provider
family, leaving only a latency argument that no current route needs.

### Question 8: Does the economy change affect the Claude harness?

**Q:** Do the Cursor economy and balanced changes also apply to the Claude
harness?
**A:** Question raised by the operator; answered during the gate.
**Decision:** Cursor only, for three independent reasons. The `claude` provider
block accepts only the four family scalars `haiku|sonnet|opus|fable` and its
ceiling adapter declares `selectionAxis: 'tier'`, so no effort-qualified Sonnet
value can be expressed. The evidence is Cursor-harness-specific and the harness
rule forbids inferring direct-provider behavior from it. And the handoff freezes
the Sonnet and Haiku rows in `provider-claude.md`.

### Question 9: Unmaterializable cyber-sensitive route

**Q:** `provider-cursor.md` names `claude-opus-4-8-thinking-xhigh` as the
cyber-sensitive review route, but no Opus 4.8 entry exists in the Cursor pin
catalog, so the resolver cannot materialize it. This project re-affirms that
note while adding five Opus 5 pins beside it.
**A:** Add it as a catalogued target.
**Decision:** Add `claude-opus-4-8-thinking-xhigh` with `catalogue: true` so the
cyber-sensitive carve-out is actually dispatchable. It is deliberately excluded
from the bundled recommendation — it generates role files without becoming a
default policy candidate.

### Question 10: Fable's dominated frontier entries

**Q:** Both Fable entries are now strictly dominated, and Fable provides no
cross-family diversity from Opus since both are Anthropic. Remove them?
**A:** Keep this PR; backlog the question.
**Decision:** Retain both Fable candidates in the Cursor recommendation's
frontier tier, while demoting Fable in prose to exceptional escalation only
(Question 4). Canon still designates Fable the exceptional-escalation route, so
removing the candidates entirely is a policy change rather than an incumbent
refresh. CursorBench measures agentic coding, not the long-running
autonomous and frontier knowledge work Fable is reserved for, and the evidence
policy warns against treating leaderboard rank as a universal model order.
Notably `claude-fable-5-thinking-high` was already dominated by
`gpt-5.6-sol-max` (67.2%/$5.69 versus 66.5%/$8.77) before this project, so the
inversion is pre-existing rather than introduced here. The approved prose
reordering captures the practical benefit without touching policy.

## Solution Space

The approach was not in question — the handoff brief prescribed it and the
operator validated it. The genuinely open dimensions were rung selection and
tier placement, resolved in Questions 2-4 once benchmark evidence replaced the
release-notes-only basis the handoff was drafted against, and then the
economy/balanced revision in Questions 6-9 after the requirements gate
surfaced a scope change.

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
4. **Cursor rung set:** five pinned Opus 5 variants — low, medium, high, xhigh,
   and max — placed as low in `balanced`, medium and high in `high`, and xhigh
   and max in `frontier`. The medium-through-max group mirrors the existing Sol
   shape; low is the added trustworthy option in `balanced`, where Grok 4.5's
   higher score carries Cursor's training-contamination disclosure.
5. **Cursor economy tier:** `claude-sonnet-5-high` is removed. It was a $3.19
   outlier in a tier whose other members run $0.44-$1.14 and was strictly
   dominated by all of them. Its pin mapping is demoted to `catalogue: false`,
   not deleted. Economy consequently carries no Anthropic route; this is
   acceptable because consequential work, which needs cross-family reviewer
   pairing, never runs at economy.
6. **Cyber-sensitive route becomes dispatchable:**
   `claude-opus-4-8-thinking-xhigh` is added as a catalogued pin target so the
   Opus 4.8 carve-out named in `provider-cursor.md` can actually be
   materialized. It stays out of the bundled recommendation so it generates
   role files without becoming a default policy candidate.
7. **Evidence basis upgraded:** CursorBench 3.2 per-rung score and cost data is
   incorporated into the Cursor guidance and the evidence summary. Under the
   repo's own evidence-priority ordering, harness-specific benchmark data
   outranks provider release notes for a Cursor route.
8. **Managed Claude tier needs no code change:** the `providers.claude` policy
   tier `opus` compiles to `{ model: 'opus' }`, a Claude CLI alias Anthropic
   resolves to the current Opus. The tier therefore resolves to Opus 5
   automatically.
9. **Opus 4.8 is not reachable through managed Claude dispatch.** An earlier
   assumption that a `{ harness: 'claude', model: 'claude-opus-4-8' }` route
   target could serve as the carve-out escape hatch was disproved during plan
   verification. The candidate-ordering validator reads only `target.model` and
   requires one of `haiku|sonnet|opus|fable`, throwing `unsupported Claude model`
   otherwise (`packages/cli/src/commands/project/dispatch-ceiling/index.ts:864-877`);
   `target.effort` is never read for Claude, unlike the Codex branch at `:879`.
   The Claude-side carve-out is therefore an operator choice made outside
   managed dispatch, and the guidance must say so rather than implying a
   mechanism that does not exist. Only the Cursor harness gets a materializable
   Opus 4.8 pin.

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
- Five `claude-opus-5-thinking-*` pinned variants and one
  `claude-opus-4-8-thinking-xhigh` variant exist for both `oat-reviewer` and
  `oat-phase-implementer`, generated by sync — 17 catalogued targets and 34
  role files, up from 12 and 24.
- The bundled dispatch-matrix recommendation carries 16 Cursor candidates
  across the revised `economy`, `balanced`, `high`, and `frontier` tiers, and
  its version identifier reflects the change.
- Every recommendation candidate resolves to a catalogued pin mapping;
  `claude-opus-4-8-thinking-xhigh` is catalogued without being recommended.
- Existing skill-validation tests still pass unmodified, confirming the change
  is an incumbent refresh and not a policy change.
- `pnpm lint`, `pnpm format`, `pnpm type-check`, `pnpm test`, and
  `pnpm release:validate` all pass.
- A reverification record per `evidence-and-refresh.md`'s schema appears in the
  PR description.

## Out of Scope

- Any change to the five task classes, escalation boundaries, or the
  Opus-first policy.
- Sonnet and Haiku rows in `provider-claude.md`, and the `claude` provider
  block of the dispatch matrix, which cannot express effort.
- Removing either Fable candidate from the Cursor frontier tier.
- `oat-dispatch-subagents/references/provider-claude.md` — verified by grep to
  contain no versioned model names, so no edit is required.
- Downstream propagation: the internal-skills `pnpm run sync:skills` rerun and
  user-scope installs on the operator's machines happen after merge.

## Deferred Ideas

- Fable frontier-tier review — both Fable candidates are now strictly
  dominated, and Fable offers no cross-family diversity from Opus since both
  are Anthropic. `claude-fable-5-thinking-high` was already dominated by
  `gpt-5.6-sol-max` before this project. Deferred because removal would
  contradict canon's exceptional-escalation designation and is a policy
  decision, not an incumbent refresh.
- Broader Cursor economy rebalance — with Sonnet removed, the remaining
  Composer and Luna placements were not re-examined and may warrant their own
  pass.
- Pinning `gpt-5.6-sol-low` — dominated on score and cost by
  `gpt-5.6-luna-high` from the same provider family. Its only real advantage is
  latency: 19 steps and 5,104 tokens, less than half of anything else in
  economy. Revisit if a low-latency economy route is ever needed.

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
