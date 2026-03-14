---
oat_status: in_progress
oat_ready_for: null
oat_last_updated: 2026-03-13
oat_generated: false
oat_template: false
---

# Design: Research & Verification Skill Suite

## Overview

Three OAT-compatible skills forming a layered research and verification suite. Each skill is a standalone SKILL.md in `.agents/skills/`, with sub-agent definitions in `.agents/agents/` synced to provider views via OAT sync.

The skills are designed provider-agnostic from the ground up. Sub-agent dispatch follows the 3-tier pattern established by `oat-project-review-provide`: probe availability, use provider-native dispatch when available, fall back gracefully. Skill bodies use portable language — provider-specific tool names appear only in detection logic blocks, never in workflow prose. Interactive input follows the `create-agnostic-skill` convention (natural language in prose, host-specific guidance in a provider split block).

The three skills have distinct output contracts: `/skeptic` is always inline (no file output), `/compare` defaults to inline with optional artifact mode, and `/deep-research` always produces an artifact. When `/compare` produces an artifact, it uses the same `comparative` schema that `/deep-research` uses, so the orchestrator can embed comparison results cleanly.

## Architecture

### System Context

These skills extend any OAT-compatible agent with research and verification capabilities. They don't modify or depend on the OAT project lifecycle — they're standalone utilities that happen to follow OAT skill conventions for packaging and distribution.

```
User
  │
  ├─ /skeptic ──────────────────► Inline verdict
  │       │
  │       └─ [Tier 1] skeptical-evaluator sub-agent
  │
  ├─ /compare ──────────────────► Inline summary OR artifact
  │
  └─ /deep-research ───────────► Research artifact (always)
          │
          ├─ research-angle sub-agents (parallel)
          └─ [conditional] /compare (as sub-agent)
```

**Key Components:**

- **`/skeptic`** — Self-contained adversarial claim evaluator. Dispatches a `skeptical-evaluator` sub-agent for unbiased evaluation, or self-evaluates with structured adversarial protocol when sub-agent is unavailable.
- **`/compare`** — Standalone comparative analysis. Domain-aware dimension selection, inline by default. Can also be dispatched as a sub-agent from `/deep-research`.
- **`/deep-research`** — Orchestrator for comprehensive research. Classifies topic, selects schema, dispatches parallel sub-agents, conditionally invokes `/compare`, produces structured artifact.
- **`skeptical-evaluator`** — Sub-agent definition (`.agents/agents/skeptical-evaluator.md`). Receives a context package and performs adversarial evidence gathering in isolation from the original reasoning context.

### Sub-Agent Dispatch Pattern (3-Tier)

All three skills use the same dispatch pattern, adapted from `oat-project-review-provide`:

```
[N/M] Checking sub-agent availability…
  → {agent-name}: {available | not resolved} ({reason})
  → Selected: Tier {1|2|3} — {description}
```

**Tier 1 — Provider-native dispatch (preferred):**

Detection logic (provider split):

- Claude Code: `Agent` tool available → dispatch with `subagent_type: "{agent-name}"`, resolved from `.claude/agents/{agent-name}.md`
- Cursor: invoke via `/{agent-name}` or natural mention, resolved from `.cursor/agents/{agent-name}.md` (or `.claude/agents/` compatibility path)
- Codex multi-agent: verify `[features] multi_agent = true`; optionally pin role via built-in roles or custom `[agents.<n>]` declarations; Codex may also auto-spawn

**Tier 2 — Fallback (skill-specific):**

This tier varies by skill because the fallback strategy depends on the skill's context needs:

| Skill            | Tier 2 behavior                                      | Rationale                                                                                                                                                      |
| ---------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/skeptic`       | Self-evaluation with structured adversarial protocol | Fresh session defeats the UX — user is mid-conversation doubting a claim. Structured protocol (context package + adversarial instruction) mitigates anchoring. |
| `/compare`       | Self-evaluation                                      | Comparison doesn't require the same independence as adversarial evaluation.                                                                                    |
| `/deep-research` | Sequential self-execution                            | The orchestrator executes research angles sequentially instead of in parallel. Loses parallelism but preserves completeness.                                   |

**Tier 3 — Inline (last resort):**

User explicitly requests inline execution, or the skill determines it can execute fully within the current context. Same output format as Tier 1.

### Data Flow

**`/skeptic` flow:**

```
$ARGUMENTS or conversation → claim identification
  → environment scan → claim type classification
  → sub-agent probe
  → [Tier 1] context package → skeptical-evaluator → findings
     [Tier 2] context package → self-evaluation → findings
  → verdict synthesis → inline output (4 frames)
```

**`/compare` flow:**

```
$ARGUMENTS → parse items + dimensions
  → domain classification → dimension selection
  → research each option against dimensions
  → score/rank → recommendation
  → inline summary (default) OR artifact (--save or complexity trigger)
```

**`/deep-research` flow:**

```
$ARGUMENTS → topic classification → schema selection (base + extended)
  → research angle planning
  → sub-agent probe
  → [Tier 1] parallel sub-agent dispatch per angle
     [Tier 2] sequential self-execution per angle
  → [conditional] if competing options emerge → dispatch /compare
  → aggregate findings
  → resolve output target (Obsidian → path → default)
  → write structured artifact (base + extended schema)
```

## Component Design

### /skeptic

**Purpose:** Adversarial claim evaluator — when the user doubts an agent assertion, gather evidence to verify or refute it.

**Responsibilities:**

- Parse claim from `$ARGUMENTS` or infer from conversation context
- Scan environment for available evidence sources
- Classify claim type (code_behavior, library_specific, documentation, factual, architectural)
- Dispatch skeptical-evaluator sub-agent or self-evaluate
- Synthesize verdict with confidence score and citations

**Interfaces:**

- **Input:** `$ARGUMENTS` (optional claim text)
- **Output:** Always inline. One of four verdict frames:
  - ✅ Holds up (confidence: X%)
  - ❌ You were right to be skeptical (confidence: X%)
  - ⚠️ Nuanced (confidence: X%)
  - ❓ Genuinely inconclusive (confidence: X%)

**Sub-agent:** `skeptical-evaluator` — receives a structured context package:

```
CLAIM: [exact claim]
BASIS: [original reasoning/sources/assumptions]
CLAIM_TYPE: [classification]
AVAILABLE_SOURCES: [what's accessible]
INSTRUCTION: Adversarial. Disprove first, then note supporting evidence.
```

**Design decisions:**

- Adversarial-first posture is the default because the user's intent (invoking /skeptic) signals doubt
- Tier 2 is self-evaluation (not fresh session) because the skill's value is immediate, in-context verification
- Confidence scores are subjective estimates, not computed — they communicate the evaluator's certainty about the evidence quality

### /compare

**Purpose:** Domain-aware comparative analysis with clear recommendations.

**Responsibilities:**

- Parse items to compare and any user-specified dimensions from `$ARGUMENTS`
- Classify domain to determine evaluation dimensions
- Research each option against dimensions using available sources
- Produce recommendation with rationale
- Output inline (default) or write artifact (`--save` flag)

**Interfaces:**

- **Input:** `$ARGUMENTS` (items to compare, optional `--save`, optional dimensions)
- **Output (inline):** Condensed comparison with clear recommendation
- **Output (artifact):** Full breakdown using `comparative` extended schema

**Domain → dimension mapping:**

| Domain                   | Dimensions                                                                |
| ------------------------ | ------------------------------------------------------------------------- |
| npm packages             | bundle size, API ergonomics, maintenance, TypeScript support, performance |
| architectural approaches | tradeoffs, constraints, operational complexity, team fit                  |
| business strategies      | cost, risk, reach, timing                                                 |
| tools/apps               | feature set, pricing, integration, UX                                     |
| general                  | auto-detected from items                                                  |

**Design decisions:**

- Qualitative scoring by default (clear winner declaration), not numeric — unless user explicitly requests a matrix
- N-way comparisons supported (not just 2-way) with ranked recommendation
- `--save` flag for artifact mode; no auto-detection for now (simpler, user controls output)
- When invoked as sub-agent from /deep-research, always uses artifact mode with the `comparative` schema

### /deep-research

**Purpose:** Comprehensive research orchestrator that produces structured artifacts.

**Responsibilities:**

- Classify topic and select appropriate extended schema
- Plan research angles (what to investigate, from which perspectives)
- Dispatch parallel sub-agents for independent research angles
- Conditionally invoke /compare when competing options emerge
- Aggregate and synthesize findings from all angles
- Resolve output target and write structured artifact

**Interfaces:**

- **Input:** `$ARGUMENTS` (topic, optional `--depth`, optional `--focus`, optional output path)
- **Output:** Always an artifact. Never inline-only.

**Output target resolution (priority order):**

1. Obsidian vault (if configured via MCP)
2. Target path specified in `$ARGUMENTS`
3. Default artifact/download location

**Schema hierarchy:**

```
base (all research)
├── executive summary
├── research methodology
├── findings (structure varies by extended schema)
└── sources & references

extended schemas (one selected per research):
├── technical      → packages, repo analysis, code examples, integration notes
├── comparative    → comparison table, dimensions, scoring, recommendation (shared with /compare)
├── conceptual     → key themes, mental models, notable references, open questions
└── architectural  → tradeoffs, constraints, decision framework, risk considerations
```

**Design decisions:**

- Schema selection happens at classification time, before research begins — it shapes what sub-agents get dispatched and what dimensions get explored
- `/compare` is dispatched as a sub-agent (not inlined) when competing options emerge — separation of concerns, reuse of comparative schema
- Research depth is interactive by default — classify upfront, present scope to user, proceed. `--depth` flag (surface/standard/exhaustive) as optional override.
- `--focus` flag narrows research to a specific angle (e.g. `--focus security`)

### skeptical-evaluator (sub-agent)

**Purpose:** Adversarial evidence gatherer operating in a separate context from the original reasoning.

**Definition file:** `.agents/agents/skeptical-evaluator.md`

**Frontmatter:**

```yaml
name: skeptical-evaluator
version: 1.0.0
description: Adversarial claim evaluator — receives a context package and gathers evidence to disprove then support a claim. Returns structured findings with citations.
tools: Read, Bash, Grep, Glob, WebSearch, WebFetch
color: red
```

**Contract:**

- Receives: context package (claim, basis, type, available sources, adversarial instruction)
- Returns: inline findings to orchestrator (not written to disk — unlike oat-reviewer, skeptic output is always inline through the orchestrator)
- Must: attempt to disprove first, cite specifically, never hallucinate sources

**Why this differs from oat-reviewer's artifact-to-disk pattern:** The skeptical-evaluator returns findings to the orchestrator (not disk) because /skeptic's output is always inline — there's no artifact to write. The orchestrator synthesizes the verdict from the evaluator's findings.

### Shared Schemas

Schemas live in `.agents/skills/deep-research/references/` as Markdown templates. The `comparative` schema is shared between `/compare` (artifact mode) and `/deep-research` (when extended schema is comparative).

**Location:**

```
.agents/skills/deep-research/references/
├── schema-base.md           # Base research template
├── schema-technical.md      # Extended: technical research
├── schema-comparative.md    # Extended: comparative analysis (shared with /compare)
├── schema-conceptual.md     # Extended: conceptual/thematic research
└── schema-architectural.md  # Extended: architectural decision research
```

`/compare` references the comparative schema via relative path: `../../deep-research/references/schema-comparative.md`

## Testing Strategy

These are skill files (Markdown instructions), not executable code. Testing is manual invocation with verification against success criteria.

**Key test scenarios per skill:**

| Skill          | Scenario                                          | What to verify                                                    |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| /skeptic       | Invoke with explicit claim argument               | Claim correctly identified, evidence gathered, verdict returned   |
| /skeptic       | Invoke without argument (infer from conversation) | Most recent assertion identified                                  |
| /skeptic       | Invoke on code_behavior claim in a repo           | Local files/tests used as evidence sources                        |
| /skeptic       | Invoke on factual claim                           | Web search used as evidence source                                |
| /skeptic       | Sub-agent unavailable                             | Tier 2 self-evaluation works, same output format                  |
| /compare       | Compare 2 npm packages                            | Domain classified, relevant dimensions selected                   |
| /compare       | Compare 3+ options                                | N-way comparison with ranked recommendation                       |
| /compare       | Use --save flag                                   | Artifact written using comparative schema                         |
| /compare       | Invoked from /deep-research                       | Uses artifact mode, comparative schema output                     |
| /deep-research | Technical topic                                   | Extended technical schema selected, appropriate angles researched |
| /deep-research | Topic with competing options                      | /compare conditionally dispatched                                 |
| /deep-research | Sub-agents unavailable                            | Sequential self-execution, same artifact quality                  |
| /deep-research | --depth flag                                      | Scope adjusts to requested depth                                  |
| All            | Cross-provider                                    | Skill loads, step logging works, questions asked portably         |

**Verification approach:**

- Invoke each skill in Claude Code (primary test environment)
- Verify step logging output matches expected format
- Verify verdict/output format matches spec
- Test sub-agent dispatch (Tier 1) and fallback (Tier 2) by running with/without agent definitions present
- Cross-provider: verify skill loads and executes in Cursor (if available)

## Open Questions (Carried from Discovery)

- **/compare auto-artifact:** Deferred — starting with explicit `--save` flag only. Can add auto-detection later if the UX warrants it.
- **/deep-research repo cloning:** Deferred — start without repo cloning. Can add as opt-in later when docs MCP coverage is assessed.
