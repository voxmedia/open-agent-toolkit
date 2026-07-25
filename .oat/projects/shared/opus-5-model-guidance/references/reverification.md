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
provider: [claude, codex, cursor]
reason: >-
  Newer-family trigger. Claude Opus 5 released 2026-07-24, followed by a
  two-lane independent research effort, reciprocal review, cross-model
  synthesis, and human acceptance on 2026-07-25. Not a scheduled review.

harness_context:
  claude: >-
    Claude Code and direct Anthropic API workers dispatched through OAT
    subagent-orchestration guidance.
  codex: Codex CLI and direct OpenAI API workers.
  cursor: Cursor IDE and CLI subagent dispatch.

catalog_source:
  claude: API catalog and official provider documentation
  codex: official provider documentation
  cursor: UI snapshot 2026-07-24, NOT re-verified in this refresh

models_considered:
  claude:
    - claude-opus-5 (low, medium, high, xhigh, max)
    - claude-opus-4-8
    - claude-sonnet-5
    - claude-fable-5
    - claude-haiku-4-5
    - claude-mythos-5 (invitation-only; not a routing candidate)
  codex:
    - gpt-5.6-sol (medium, high, xhigh, max)
    - gpt-5.6-luna (high, xhigh)
    - gpt-5.6-terra
    - mini and nano direct-API routes for strict extraction
  cursor: existing live-catalog entries only; no new selector verified

controls_verified:
  claude:
    - effort rungs low through max
    - adaptive thinking on by default; disabling rejected at xhigh and max
    - prompt-cache invalidation on effort or speed change
    - fast mode as a gated latency purchase, not a capability rung
    - service tier recorded independently of effort
  codex:
    - reasoning-effort rungs
    - trajectory economics distinguished from list price
  cursor: none newly verified this cycle

eligibility_verified:
  claude:
    - Fable 5 requires 30-day retention and is unavailable under ZDR
    - Priority Tier unsupported for Opus 5 and Sonnet 5; commitments closed
      to new buyers
    - Claude 4.6+ families use 1M context at standard rates
    - Claude Code minimum version gating applies per family
  codex:
    - Sol direct-API requests above 272K input tokens carry a 2x input and
      1.5x output price step
    - Luna disqualified for some very large-context work despite nominal
      window acceptance
  cursor: >-
    not re-verified; provider-cursor.md carries an earlier 2026-09-04 review
    date to reflect this

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
  Every quantitative claim in the updated guidance traces to the dated vault
  evidence packet, which holds the row-level locators, selectors, effort,
  harness, benchmark version, metric definitions, exclusions, extraction
  methods, absolute inputs, and derived arithmetic. The guidance references
  deliberately carry conclusions and rule-driving values only; the packet is
  the locator. Retrieval date for all public evidence is 2026-07-25.

independent_author: >-
  Two isolated lanes. Codex GPT-5 produced the Codex research packet and the
  cross-model synthesis; Claude Opus produced an independent research packet,
  a source ledger, and proposed updates.

independent_reviewer: >-
  Reciprocal cross-review between the same two lanes, followed by two rounds
  of Claude Opus review of the synthesis. Verdict: Aligned with Revisions,
  20 accept / 6 revise / 4 keep provisional / 0 reject, with one retraction.
  Human acceptance recorded 2026-07-25 in Accepted Update Plan.md.
  Repository-side takeover review and the final gate review were both run
  cross-family on gpt-5.6-sol-max against the accepted packet.

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
  removals:
    - consequence automatically implying xhigh or max effort
    - Opus 4.8 as the universal cyber primary
    - Sonnet as the default substantive Claude route
  none_shipped:
    - Cursor Opus 5 pin mappings, catalog entries, generated role variants,
      and dispatch-recommendation entries

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
  - Cursor Opus 5 selector syntax, resolved identity, thinking behavior,
    effort rung, and absence of silent fallback remain unverified. The G01
    probe is still the gate. Six probe definitions are staged at
    .cursor/agents/zz-pin-probe-*.md with a results template at
    references/g01-probe-results.md.
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
