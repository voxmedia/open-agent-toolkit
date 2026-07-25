---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-25
oat_generated: false
---

# Discovery: opus-5-model-guidance

## Initial Request

Refresh the canonical subagent-orchestration guidance after Opus 5 had enough
post-release benchmark coverage for a fuller qualification. Integrate the
accepted cross-model synthesis without turning benchmark snapshots into durable
policy or publishing controls that the live harness has not verified.

The accepted evidence packet lives in the shared vault at:

`04 - Resources/AI/Agent Orchestration/Model Selection/Opus 5 Post Release Analysis/`

Its controlling synthesis is `Cross-Model Review/Cross-Model Synthesis.md`, as
amended by Claude's follow-up review and the human-approved update plan.

## Workflow Decision

Resume the existing quick-mode project and replace its pre-synthesis execution
plan. The old discovery and plan are preserved under `references/` for
provenance. Their task IDs `p01-*` through `p03-*` are retired without
implementation and will not be reused.

The user's instruction to proceed with integration is the requirements gate.

## Accepted Findings

1. **Task class and effort are separate axes.** Consequence primarily adds
   independent review and root-owned authorization; it does not automatically
   force maximum effort.
2. **Claude defaults:** Opus 5 medium is the normal substantive route; high is
   the hard-reasoning start; xhigh is selective for reasoning-depth or
   evaluated long-horizon bottlenecks; max is exceptional and must earn its
   cost. Compare same-labelled rungs first, but never claim cross-provider
   effort equivalence.
3. **Sonnet remains conditional, not obsolete.** Use it when measured
   time-to-first-token, throughput, access, or workload economics win for the
   actual harness. Do not preserve it merely as a generic workhorse.
4. **Fable remains a specialist.** The durable rule is to choose reviewers by
   the failure mode expected. Fable's current long-horizon, missing-domain-
   concept, or broad-world-knowledge instantiation is provisional and
   ineligible where ZDR or other controls exclude it.
5. **Codex defaults remain work-shape based.** Sol is the code-first,
   trajectory-efficient route. Record the >272K long-context price step and
   distinguish token price from total trajectory cost.
6. **Speed is multi-measure.** Evaluate TTFT, active runtime, elapsed/wall-clock
   time, output tokens, steps/tool calls, completion rate, and variance. A
   fast or priority tier is a latency purchase, not a capability rung.
7. **Top effort is selective.** The AA Coding Agent Index and Frontier-Bench
   have non-monotonic top-end Opus results. CursorBench is monotonic from xhigh
   to max but shows sharply worse marginal economics above high.
8. **Mechanical recon is harness-specific.** Current defaults are Luna high in
   Codex, Haiku 4.5 in Claude, and Composer 2.5 in Cursor. Mini/nano are direct
   API options only for strict extraction or classification.
9. **Exact Cursor aliases remain provisional.** Do not add Opus 5 pin mappings
   or recommendation entries until the live Cursor catalog and thinking/effort
   behavior are probed. Provider evidence may nominate a candidate but cannot
   prove a Cursor route.

## Scope

### In scope

- Refresh the durable selection principles.
- Refresh Claude, Codex, and Cursor provider references.
- Expand evidence and refresh guidance, especially speed and parity checks.
- Bump the canonical skill version and lockstep public package versions as
  required by repository policy.
- Validate the skill and release package.
- Record the accepted evidence and the deferred Cursor probe boundary.

### Out of scope

- Adding unverified Cursor model aliases, pin mappings, role files, or dispatch
  recommendation entries.
- Treating same-labelled provider efforts as equivalent.
- Promoting provisional Fable or exact cross-provider routes into durable
  policy.
- Editing historical evidence packets.
- Updating external downstream installations; that is a separate vault
  integration phase after the canonical repository passes validation.

## Success Criteria

- The canonical references express all accepted findings without contradicting
  one another.
- The Claude matrix starts Opus 5 at medium/high by task shape and treats
  consequence as a review requirement rather than an effort synonym.
- Sonnet and Fable retain conditional/specialist cases with eligibility gates.
- The Codex reference records long-context pricing and trajectory economics.
- The Cursor reference contains only selectors supported by the current
  catalog snapshot and explicitly defers unverified Opus 5 pins.
- The refresh protocol requires multi-measure wall-clock evidence and
  downstream parity verification.
- Skill validation and release validation pass.
