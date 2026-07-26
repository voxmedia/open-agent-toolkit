---
oat_generated: false
oat_status: complete
---

# Reverification Record — Opus 5 Post-Release Integration

Conforms to the Reverification Record schema in
`.agents/skills/subagent-orchestration/references/evidence-and-refresh.md`.
Copy this record into the PR description; `oat-project-pr-final` does not lift
it automatically.

```yaml
verified_at: 2026-07-25T21:01:09Z
reason: >-
  Newer-family trigger. Claude Opus 5 released 2026-07-24, followed by a
  two-lane independent research effort, reciprocal review, cross-model
  synthesis, and human acceptance on 2026-07-25. Not a scheduled review.

records:
  - provider: claude
    harness_context: >-
      Claude Code and direct Anthropic API workers dispatched through OAT
      subagent-orchestration guidance.
    catalog_source: API catalog and official provider documentation
    models_considered:
      - claude-opus-5 (low, medium, high, xhigh, max)
      - claude-opus-4-8
      - claude-sonnet-5
      - claude-fable-5
      - claude-haiku-4-5
      - claude-mythos-5 (invitation-only; not a routing candidate)
    controls_verified:
      - effort rungs low through max
      - adaptive thinking on by default; disabling rejected at xhigh and max
      - prompt-cache invalidation on effort or speed change
      - fast mode as a gated latency purchase, not a capability rung
      - service tier recorded independently of effort
    eligibility_verified:
      - Fable 5 requires 30-day retention and is unavailable under ZDR
      - Priority Tier unsupported for Opus 5 and Sonnet 5; commitments closed
        to new buyers
      - Claude 4.6+ families use 1M context at standard rates
      - Claude Code minimum version gating applies per family

  - provider: codex
    harness_context: Codex CLI and direct OpenAI API workers.
    catalog_source: official provider documentation
    models_considered:
      - gpt-5.6-sol (medium, high, xhigh, max)
      - gpt-5.6-luna (high, xhigh)
      - gpt-5.6-terra
      - mini and nano direct-API routes for strict extraction
    controls_verified:
      - reasoning-effort rungs
      - trajectory economics distinguished from list price
    eligibility_verified:
      - Sol direct-API requests above 272K input tokens carry a 2x input and
        1.5x output price step
      - Luna disqualified for some very large-context work despite nominal
        window acceptance

  - provider: cursor
    harness_context: >-
      Cursor desktop Agent Chat, Task-tool subagents, Cursor 3.12.30. Probe
      identity read from subagentStart lifecycle hooks, corroborated by
      preToolUse. The cursor-agent CLI runtime emits no agent hooks and cannot
      serve as a verification channel.
    catalog_source: >-
      live `cursor-agent models` catalog plus CursorBench 3.2, with selectors
      probe-verified 2026-07-25
    models_considered:
      - claude-opus-5 (low, medium, high, xhigh, max)
      - claude-opus-4-8 xhigh
      - claude-sonnet-5 high (positive control; retained but demoted from the
        economy tier as strictly dominated)
      - claude-fable-5 xhigh
    controls_verified:
      - all five Opus 5 rungs and Opus 4.8 xhigh resolve to their thinking
        variants; non-thinking twins exist at low, medium, and high and were not
        selected
      - effort parameter proven honored by four non-default rungs; the high row
        alone is confounded because high is the Opus 5 default
      - unknown family falls back silently to the default model
        (claude-opus-9 resolved to cursor-grok-4.5-high-fast)
      - unknown effort falls back silently to the family default rung
        (effort=ultra resolved to claude-opus-5-thinking-high)
      - default rung is family-specific, marked by the unqualified catalog
        label; Opus 4.7 defaults to xhigh while Opus 5 defaults to high
    eligibility_verified: >-
      Fable resolved normally for this account despite its NO ZDR catalog tag,
      contradicting the pre-probe assumption that it was entitlement-blocked. An
      earlier Fable fallback observed on the opus-5-sa-test branch is
      unexplained and was not reproduced.

sources:
  - https://platform.claude.com/docs/en/about-claude/models/overview
  - https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
  - https://www.anthropic.com/news/claude-opus-5
  - https://platform.claude.com/docs/en/api/service-tiers
  - https://platform.claude.com/docs/en/about-claude/pricing
  - https://developers.openai.com/api/docs/models/gpt-5.6-sol
  - https://artificialanalysis.ai/agents/coding-agents/comparisons/claude-code-vs-codex
  - https://artificialanalysis.ai/articles/claude-opus-5-leader-agentic-knowledge-work
  - https://cursor.com/cursorbench
  - https://deepswe.datacurve.ai/
  - vault packet, Opus 5 Post Release Analysis/Cross-Model Review/

claim_provenance: >-
  Every quantitative claim in the updated guidance is sourced to a publicly
  resolvable benchmark named in the guidance itself — Artificial Analysis
  Coding Agent Index, Frontier-Bench, and CursorBench 3.2 — each carrying its
  version and a 2026-07-25 retrieval date. Those public sources are the
  locators. A dated internal research packet holds the supporting working
  detail (row-level selectors, effort, harness, metric definitions,
  exclusions, extraction methods, absolute inputs, derived arithmetic) as this
  repository's own audit trail. It is deliberately not cited as provenance in
  the shipped skill, because the skill is published and an internal artifact is
  unresolvable for any external consumer.

independent_author: >-
  Two isolated lanes. Codex GPT-5 produced the Codex research packet and the
  cross-model synthesis; Claude Opus produced an independent research packet,
  a source ledger, and proposed updates.

independent_reviewer: >-
  Reciprocal cross-review between the same two lanes, followed by two rounds
  of Claude Opus review of the synthesis. Verdict: Aligned with Revisions,
  20 accept / 6 revise / 4 keep provisional / 0 reject, with one retraction.
  Human acceptance recorded 2026-07-25 in Accepted Update Plan.md.
  Repository-side takeover review and four final gate reviews were run
  cross-family against the accepted packet. The first three (through
  2026-07-25T21:23Z) ran on gpt-5.6-sol-max; the fourth
  (2026-07-25T21:47Z) ran on gpt-5.6-sol-xhigh because the
  cursor-gpt-5-6-sol-max exec target was removed from user-scope config
  mid-cycle. Both are frontier-tier Sol rungs, so cross-family
  independence held, but the reviews were not run on a uniform target.

incumbent_changes:
  replacements:
    - hard-reasoning Claude default: Opus xhigh -> Opus 5 high
    - normal substantive Claude route: Sonnet 5 -> Opus 5 medium
    - cyber-sensitive primary: Opus 4.8 -> Opus 5 with documented fallback
  additions:
    - multi-measure speed contract (TTFT, active runtime, elapsed time,
      tokens, steps, retries, completion rate, variance, cost per completed
      task)
    - reviewer selection by anticipated failure mode as a durable principle
    - retention, service tier, context pricing, and availability as
      eligibility gates evaluated before capability
    - explicit prohibition on cross-provider effort normalization
    - Sol long-context pricing threshold and trajectory-vs-list-price
      distinction
    - probe-verified Cursor pin mappings for five Opus 5 effort rungs and
      Opus 4.8 xhigh, with generated reviewer and phase-implementer roles
    - Cursor recommendation tiers rebalanced; Opus 5 low to balanced, medium
      and high to high, xhigh and max to frontier
    - Cursor silent default-fallback behavior documented as a pinning hazard
  removals:
    - consequence automatically implying xhigh or max effort
    - Opus 4.8 as the universal cyber primary
    - Sonnet as the default substantive Claude route
    - claude-sonnet-5-high from the Cursor economy tier, strictly dominated by
      claude-opus-5-thinking-low on score, cost, tokens, and steps; the mapping
      remains catalogued and dispatchable
  none_shipped:
    - Cursor pin work was deferred through Phase 6 and admitted in Phase 7 only
      after the G01 probe supplied native-launch evidence. Nothing in this
      refresh remains unshipped on that basis.

downstream_consumers:
  - canonical .agents/skills/subagent-orchestration (updated, authoritative)
  - packages/cli bundled skill assets (regenerated)
  - .claude generated provider view (project scope, byte-identical)
  - internal-skills repository (NOT synchronized)
  - user-scope ~/.agents/skills on Mac mini and laptop (NOT synchronized)
  - vault Model Selection package (NOT updated)
  - application-specific guidance such as the Gizmo/Slack agent (NOT audited)

downstream_parity: >-
  Project scope only. `oat sync --scope project` reports no changes required
  and generated version artifacts reproduce byte-identically from
  bundle-assets.sh. User-scope, internal-skills, vault, and
  application-specific consumers were deliberately NOT synchronized: the
  takeover brief withholds authorization for downstream updates. The Accepted
  Update Plan's Phase 3 downstream parity gate therefore remains OPEN and
  must not be recorded as satisfied.

unresolved_items:
  - Cursor pin selectors are RESOLVED. Syntax, resolved identity, thinking
    behavior, and effort rung were probe-verified 2026-07-25 for five Opus 5
    rungs and Opus 4.8 xhigh; see references/g01-probe-results.md and the raw
    payloads at references/g01-probe-hooks.jsonl. Absence of silent fallback is
    verified for these mappings specifically, but Cursor was shown to fall back
    silently for unresolvable selectors, so this does not generalize to any
    unprobed selector.
  - Cursor effort-rung defaults are vendor-controlled and family-specific, so a
    pinned selector could change capability without a repository change. Tracked
    as BL-260726-validate-cursor-pin-effort.
  - The Fable fallback observed earlier on the opus-5-sa-test branch is
    unexplained and was not reproduced.
  - AA-Briefcase time/task definition remains unverified and must not be
    compared with the Coding Agent Index active-runtime measure.
  - Benign dual-use classifier behavior for Opus 5 is unvalidated locally.
  - Exact Opus-versus-Sol task-shape routing remains provisional.
  - Sonnet latency and throughput thresholds are unmeasured locally.
  - Fable's long-horizon advantage and its named reviewer instantiation
    remain provisional.
  - Practical cross-provider effort substitutions remain provisional.
  - Max-effort exceptions require a workload-specific sweep.
  - Cost-per-completion figures derived from public pass rates are a
    secondary diagnostic, not a leaderboard.
  - DeepSWE cost and caching methodology is an unresolved source gap.
  - Live consumers derived from Evidence/integration-snippets-2026-07-21.md
    have not been inventoried.
  - Frontier-Bench remains vendor-operated with one self-reported row.
```
