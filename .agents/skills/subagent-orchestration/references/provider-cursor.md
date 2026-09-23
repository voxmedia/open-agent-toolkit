---
guidance_version: 2026-09-23
last_verified: 2026-09-22
review_after: 2026-12-22
catalog_basis:
  `agent models` reports Opus 5.5 effort IDs but the native pin selector is
  unverified; GPT-6 Sol/Luna are absent from the Cursor catalog
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
in one opaque alias, and apply the multi-measure speed contract from
`model-selection-principles.md`. A lower active runtime or higher output rate
does not by itself prove lower user-observed elapsed time.

## Dated Task-Class Matrix

Use currently approved exact aliases from the Cursor catalogue. The new
`claude-opus-5-5-*` IDs appear in `agent models`, but a native `subagentStart`
hook probe was unavailable in the unauthenticated Cursor GUI on 2026-09-22.
No 5.5 bracket selector is approved yet. GPT-6 Sol/Luna were absent from that
catalogue, so their Codex availability does not authorize Cursor routes.

| Task class               | Default                                                             | Economy                                            | Escalation                                                  | Floor notes                                                                                                      |
| ------------------------ | ------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | `composer-2.5`                                                      | Same with mechanical verification                  | `gpt-5.6-luna-high`                                         | Fast aliases select service tier, not capability.                                                                |
| `intelligent-recon`      | `cursor-grok-4.5-medium` or `gpt-5.6-sol-medium`                    | `gpt-5.6-terra-high`                               | `gpt-5.6-sol-high`                                          | Verify silent-miss-prone conclusions.                                                                            |
| `default-implementation` | `gpt-5.6-sol-medium`                                                | `composer-2.5` for bounded, testable changes       | `gpt-5.6-sol-high`                                          | `cursor-grok-4.5-medium` remains an available judgment-heavy alternative.                                        |
| `hard-reasoning`         | `gpt-5.6-sol-high`                                                  | `cursor-grok-4.5-high` with corroborating evidence | `gpt-5.6-sol-xhigh`                                         | The old Opus 5 pin has been retired; do not substitute an unprobed 5.5 pin.                                      |
| `consequential`          | An eligible high-effort author with independent cross-family review | No routine economy route                           | Sol xhigh for a depth bottleneck; max only after evaluation | If independent review cannot be met among approved Cursor mappings, use a separately qualified provider or stop. |

## Historical Opus Cursor Probe Evidence (Retired)

The following observations document Cursor 3.12.30 behavior on 2026-07-25.
They no longer qualify those generations for current recommendations or the
active approved mapping catalogue. A new family needs its own live probe.

Five Opus 5 effort rungs plus an Opus 4.8 rung were
probe-verified on 2026-07-25 against Cursor 3.12.30, using `subagentStart`
lifecycle hooks to read the resolved model that Cursor itself reports:

| Selector                        | Resolves to                      |
| ------------------------------- | -------------------------------- |
| `claude-opus-5[effort=low]`     | `claude-opus-5-thinking-low`     |
| `claude-opus-5[effort=medium]`  | `claude-opus-5-thinking-medium`  |
| `claude-opus-5[effort=high]`    | `claude-opus-5-thinking-high`    |
| `claude-opus-5[effort=xhigh]`   | `claude-opus-5-thinking-xhigh`   |
| `claude-opus-5[effort=max]`     | `claude-opus-5-thinking-max`     |
| `claude-opus-4-8[effort=xhigh]` | `claude-opus-4-8-thinking-xhigh` |

Every rung resolves to the thinking variant. This is a verified fact, not an
inference: the catalog carries distinct non-thinking IDs at low, medium, and
high, and none were selected.

That historical result cannot validate an Opus 5.5 selector, even when the
requested effort has the same spelling. Preserve probe records as evidence of
past behavior, but use only the current approved catalogue for dispatch.

### Unresolvable selectors fall back to a default, silently

The historical probe showed that Cursor did not reject a malformed pin. It substitutes a
default for whichever component it cannot resolve, with no error or warning:

- An unknown family falls back to the default model. `claude-opus-9[effort=high]`
  resolved to `cursor-grok-4.5-high-fast`.
- An unknown effort falls back to the family's default rung.
  `claude-opus-5[effort=ultra]` resolved to `claude-opus-5-thinking-high`.

The default rung is family-specific, not a fixed value. In that catalog snapshot
exactly one rung per family carries an unqualified display label, and that marks
the default: `claude-opus-5-high` shows as `Opus 5 1M` while
`claude-opus-5-medium` shows as `Opus 5 1M Medium`. The default is not always
high — `claude-opus-4-7-xhigh` shows as `Opus 4.7 1M` while
`claude-opus-4-7-high` is explicitly labeled `Opus 4.7 1M High`.

This makes a typo in a pinned selector more dangerous than a plain downgrade.
The pin silently tracks whatever Cursor currently designates as that family's
default, so a vendor-side change to the default rung alters capability with no
corresponding change in the repository.

Two consequences for pinning. A selector must be probe-verified per mapping
before it ships. And a probe whose requested rung happens to equal the family
default cannot, on its own, distinguish an honored effort parameter from an
ignored one; verify at least one non-default rung in the same family.

Neither an agent self-report nor a subagent card label is admissible evidence.
The card label drops the thinking qualifier and cannot distinguish the thinking
and non-thinking variants.

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
