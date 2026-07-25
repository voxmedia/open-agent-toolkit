---
guidance_version: 2026-07-22
last_verified: 2026-07-22
review_after: 2026-09-04
catalog_basis: user-supplied Cursor snapshot plus current Cursor documentation
---

# Cursor Model Selection

Load this reference when the active harness is Cursor (IDE, CLI, or SDK).
Current user and repository instructions override the dated model examples
below. Treat every observed catalog as a volatile snapshot, never a durable
inventory. Launch mechanics for OAT dispatch live in
`oat-dispatch-subagents/references/provider-cursor.md`.

## Harness Rule

Cursor wraps model providers with its own prompts, tools, context management,
agent loop, aliases, and service tiers. Direct-provider evidence informs a
candidate, but Cursor-native evidence should decide a Cursor route when the two
conflict.

The Cursor SDK exposes the Cursor runtime, harness, and models. It is not a
transparent raw OpenAI or Anthropic API call.

Every exact route below is dated and provisional. Verify the live root or
nested catalog, resolved identity, reasoning controls, and fallback behavior
before launch.

## Service-Tier Rule

Treat every alias ending in `-fast` as a service-tier selection, not a higher
capability class, unless current Cursor documentation explicitly says
otherwise. Composer 2.5 fast is documented as the same intelligence at a higher
price. Use standard aliases for background work and fast aliases only when
multi-measure latency evidence justifies the premium.

Record the model and the service tier separately even when Cursor encodes both
in one opaque alias. Measure time to first token or first useful action, active
runtime, total elapsed time, tokens, steps or tool calls, completion rate, and
variance. A lower active runtime or higher output rate does not by itself prove
lower user-observed elapsed time.

## Dated Task-Class Matrix

Use exact aliases from the live catalog. The examples below were present in the
user's 2026-07-21 snapshot.

| Task class               | Default                                                  | Economy                                                                              | Escalation                                                             | Floor notes                                                                                                                               |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | `composer-2.5`                                           | `composer-2.5`                                                                       | `gpt-5.6-luna-high`                                                    | Use `composer-2.5-fast` or Luna fast only for latency, not capability.                                                                    |
| `intelligent-recon`      | `cursor-grok-4.5-medium` or `gpt-5.6-sol-medium`         | `gpt-5.6-terra-high`                                                                 | `gpt-5.6-sol-high`                                                     | Grok medium is a primary route; Sol medium is the conservative silent-miss alternative; Terra high is the cost-saving route.              |
| `default-implementation` | `gpt-5.6-sol-medium`                                     | `composer-2.5` for bounded, testable changes                                         | `gpt-5.6-sol-high`                                                     | Sol is the conservative incumbent; `cursor-grok-4.5-medium` is a primary alternative for general implementation.                          |
| `hard-reasoning`         | `gpt-5.6-sol-high`                                       | `cursor-grok-4.5-high` for architecture, ambiguous debugging, and incident diagnosis | `gpt-5.6-sol-xhigh`                                                    | Narrow the task before downgrading. Do not infer cross-provider effort equivalence.                                                       |
| `consequential`          | `gpt-5.6-sol-high` plus an eligible independent reviewer | No routine economy route                                                             | Sol xhigh when deeper reasoning is required; max only after evaluation | Consequence adds review and root authorization, not automatic top effort. For cyber-sensitive review, do not rely on Fable or Grok alone. |

## Deferred Opus 5 Candidate

Direct-provider evidence nominates Opus 5 as a candidate for Cursor
interpretation-heavy implementation, hard reasoning, and independent review.
That evidence does not prove a Cursor route. Do not add a selector, pin,
generated role, or recommendation until a live Cursor probe verifies:

- accepted alias syntax and resolved model identity;
- thinking-enabled versus non-thinking behavior;
- the effort rung represented by the selector;
- absence of silent fallback.

Until those checks pass, retain only selectors present in the current live
catalog snapshot. Do not infer an Opus 5 alias from direct Anthropic names,
another Cursor surface, or an agent self-report.

## Broader Cursor Routes

- `cursor-grok-4.5-medium`: primary alternative for intelligent recon and
  general implementation; strong for code exploration, brainstorming, research
  synthesis, debugging, broad knowledge work, and judgment-heavy tool
  workflows.
- `cursor-grok-4.5-high`: economy route for hard reasoning, architecture,
  ambiguous debugging, and incident diagnosis.
- `cursor-grok-4.5-low`: simpler tool workflows; prefer `composer-2.5` for
  highly mechanical work on cost.
- Grok is never the sole final authority for a consequential factual, security,
  incident, or architectural conclusion. Require tool evidence, citations,
  logs, query results, or file references for load-bearing Grok claims, or
  pair it with an eligible independent cross-family reviewer.
- CursorBench caveat: Cursor disclosed that Cursor repository data entered
  Grok 4.5's training mixture. Treat its ranking as evidence of
  competitiveness, not proof of superiority over nearby frontier models.
- `claude-sonnet-5-thinking-high`: strong provider-diversity alternative for
  normal implementation and agentic work when available.
- `gpt-5.4-mini-medium`: economical general tool and coding worker.
- `gpt-5.4-nano-medium`: strict extraction, classification, ranking, and simple
  read-only tool calls. Not a semantic repository worker.
- Gemini, Kimi, GLM, GPT-5.5/5.4/5.3 Codex/5.2, and older Claude aliases:
  compatibility, availability, or task-specific alternatives. Do not make them
  defaults without current relevant evidence.

`auto` is allowed for interactive convenience only. It is prohibited for
class-constrained dispatch, repeatable evaluations, auditable automation, and
consequential work because the exact model is not a stable input.
