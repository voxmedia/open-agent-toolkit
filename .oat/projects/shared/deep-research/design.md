---
oat_status: complete
oat_ready_for: null
oat_last_updated: 2026-03-14
oat_generated: false
oat_template: false
---

# Design: Research & Verification Skill Suite

## Overview

Five OAT-compatible skills forming a layered research, analysis, verification, and synthesis suite. Each skill is a standalone SKILL.md in `.agents/skills/`, with sub-agent definitions in `.agents/agents/` synced to provider views via OAT sync.

The skills are designed provider-agnostic from the ground up. Sub-agent dispatch follows the execution tier pattern established by `oat-project-review-provide`: probe availability, use provider-native dispatch when available, fall back gracefully. Skill bodies use portable language — provider-specific tool names appear only in detection logic blocks, never in workflow prose. Interactive input follows the `create-agnostic-skill` convention (natural language in prose, host-specific guidance in a provider split block).

The five skills have distinct output contracts: `/skeptic` is always inline (no file output), `/compare` defaults to inline with optional artifact mode, `/deep-research` and `/analyze` always produce artifacts, and `/synthesize` defaults to artifact but supports inline. `/deep-research` explores topics externally; `/analyze` examines existing artifacts/systems internally from multiple angles. When `/compare` produces an artifact, it uses the same `comparative` schema that `/deep-research` uses, so orchestrators can embed comparison results cleanly. `/synthesize` consumes artifacts from any of the above and produces a superset output that merges findings with provenance attribution.

Two cross-cutting conventions apply:

- **Model-tagged filenames:** Artifact-producing skills include the model identifier in filenames (e.g. `topic-opus-4-6.md`) so multiple agents targeting the same directory don't collide, and `/synthesize` can attribute findings by source.
- **`--context` flag:** `/compare`, `/deep-research`, and `/analyze` accept `--context path` pointing to a file or directory of supplementary context (links, constraints, evaluation criteria). The skill reads and incorporates it. Not applicable to `/skeptic` or `/synthesize`.

## Architecture

### System Context

These skills extend any OAT-compatible agent with research and verification capabilities. They don't modify or depend on the OAT project lifecycle — they're standalone utilities that happen to follow OAT skill conventions for packaging and distribution.

```
User
  │
  ├─ /skeptic ──────────────────► Inline verdict
  │       │
  │       └─ [Execution Tier 1] skeptical-evaluator sub-agent
  │
  ├─ /compare ──────────────────► Inline summary OR artifact
  │
  ├─ /deep-research ───────────► Research artifact (always)
  │       │
  │       ├─ research-angle sub-agents (parallel)
  │       └─ [conditional] /compare (as sub-agent)
  │
  ├─ /analyze ─────────────────► Analysis artifact (always)
  │       │
  │       ├─ analysis-angle sub-agents (parallel, one per angle)
  │       └─ [conditional] /compare (as sub-agent)
  │
  └─ /synthesize ──────────────► Synthesis artifact (default) or inline
          │
          └─ reads artifacts from directory or explicit paths
             (outputs from /compare, /deep-research, /analyze, reviews, etc.)
```

**Key Components:**

- **`/skeptic`** — Self-contained adversarial claim evaluator. Dispatches a `skeptical-evaluator` sub-agent for unbiased evaluation, or self-evaluates with structured adversarial protocol when sub-agent is unavailable.
- **`/compare`** — Standalone comparative analysis. Domain-aware dimension selection, inline by default. Can also be dispatched as a sub-agent from `/deep-research` or `/analyze`.
- **`/deep-research`** — Research orchestrator. Classifies topic, selects schema, dispatches parallel sub-agents, conditionally invokes `/compare`, produces structured artifact. Direction: external ("go find out about X").
- **`/analyze`** — Analysis orchestrator. Classifies input type, selects applicable analysis angles, dispatches sub-agents per angle, produces structured analysis artifact. Direction: internal ("look deeply at this thing I have").
- **`/synthesize`** — Multi-source synthesis. Reads artifacts from a directory (auto-detected via frontmatter) or explicit file paths, merges findings with provenance attribution, produces a superset output with agreement/disagreement tracking.
- **`skeptical-evaluator`** — Sub-agent definition (`.agents/agents/skeptical-evaluator.md`). Receives a context package and performs adversarial evidence gathering in isolation from the original reasoning context.

### Sub-Agent Dispatch Pattern (3 Execution Tiers)

Skills that dispatch sub-agents use the same execution tier pattern, adapted from `oat-project-review-provide`:

```
[N/M] Checking sub-agent availability…
  → {agent-name}: {available | not resolved} ({reason})
  → Selected: Execution Tier {1|2|3} — {description}
```

**Execution Tier 1 — Provider-native dispatch (preferred):**

Detection logic (provider split):

- Claude Code: `Agent` tool available → dispatch with `subagent_type: "{agent-name}"`, resolved from `.claude/agents/{agent-name}.md`
- Cursor: invoke via `/{agent-name}` or natural mention, resolved from `.cursor/agents/{agent-name}.md` (or `.claude/agents/` compatibility path)
- Codex multi-agent: verify `[features] multi_agent = true`; optionally pin role via built-in roles or custom `[agents.<n>]` declarations; Codex may also auto-spawn
- Claude.ai: no sub-agent dispatch available → always Tier 2 (self-evaluation) or Tier 3 (inline). Log: `→ {agent-name}: not resolved (Claude.ai — no sub-agent dispatch)`

**Execution Tier 1 dispatch variants:**

Tier 1 supports two dispatch variants depending on the sub-agent's nature:

| Variant                | Used by                                                                        | Mechanism                                                                                                                                                         | Agent definition                   |
| ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Named agent            | `/skeptic` → `skeptical-evaluator`                                             | Dispatch with `subagent_type: "{agent-name}"`, resolved from `.claude/agents/{agent-name}.md` (Claude Code) or equivalent                                         | Dedicated agent definition file    |
| General-purpose worker | `/deep-research` → research-angle workers, `/analyze` → analysis-angle workers | Dispatch with `subagent_type: "general-purpose"` and a structured research/analysis prompt (Claude Code). Multiple concurrent `Agent` tool calls for parallelism. | No agent definition — prompt-based |

For the general-purpose worker variant:

- Claude Code: multiple concurrent `Agent` tool calls, each with `subagent_type: "general-purpose"` and a specific angle prompt. Parallelism comes from concurrent tool invocations.
- Cursor: multiple concurrent agent mentions with distinct prompts (parallelism depends on Cursor's agent dispatch model)
- Codex: worker prompts dispatched as parallel agent tasks when `multi_agent = true`
- Claude.ai: no worker dispatch → falls through to Execution Tier 2 (sequential self-execution)

**Execution Tier 2 — Fallback (skill-specific):**

This tier varies by skill because the fallback strategy depends on the skill's context needs:

| Skill            | Execution Tier 2 behavior                            | Rationale                                                                                                                                                      |
| ---------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/skeptic`       | Self-evaluation with structured adversarial protocol | Fresh session defeats the UX — user is mid-conversation doubting a claim. Structured protocol (context package + adversarial instruction) mitigates anchoring. |
| `/compare`       | Self-evaluation                                      | Comparison doesn't require the same independence as adversarial evaluation.                                                                                    |
| `/deep-research` | Sequential self-execution                            | The orchestrator executes research angles sequentially instead of in parallel. Loses parallelism but preserves completeness.                                   |
| `/analyze`       | Sequential self-execution                            | Same pattern as /deep-research — analysis angles executed sequentially instead of in parallel. Loses parallelism but preserves completeness.                   |
| `/synthesize`    | N/A — no sub-agents                                  | Synthesis reads files and merges; no sub-agent dispatch needed.                                                                                                |

**Execution Tier 3 — Inline execution (last resort):**

User explicitly requests inline execution, or the skill determines it can execute fully within the current context.

**Important:** Execution tiers describe _execution strategy_ (who performs the work), not _output format_. Each skill's output contract is independent of the execution tier used:

- `/skeptic` Execution Tier 3 → inline execution, inline output (same as always)
- `/compare` Execution Tier 3 → inline execution, output per user choice (inline or artifact)
- `/deep-research` Execution Tier 3 → inline execution, **still produces an artifact** (the artifact-only guarantee is an output contract, not an execution contract)
- `/analyze` Execution Tier 3 → inline execution, **still produces an artifact** (same as /deep-research — artifact-only is an output contract)
- `/synthesize` → no sub-agents, so execution tiers don't apply

### Data Flow

**`/skeptic` flow:**

```
$ARGUMENTS or conversation → claim identification
  → environment scan → claim type classification
  → sub-agent probe
  → [Execution Tier 1] context package → skeptical-evaluator → findings
     [Execution Tier 2] context package → self-evaluation → findings
  → verdict synthesis → inline output (4 frames)
```

**`/compare` flow:**

```
$ARGUMENTS → parse items + dimensions
  → domain classification → dimension selection
  → research each option against dimensions
  → score/rank → recommendation
  → inline summary (default) OR artifact (--save flag)
```

**`/deep-research` flow:**

```
$ARGUMENTS (topic) + optional --context path
  → [if --context] read context file/directory → extract constraints, focus areas, prior art
  → topic classification (informed by context if present) → schema selection (base + extended)
  → research angle planning (context shapes which angles are prioritized and what to look for)
  → sub-agent probe
  → [Execution Tier 1] parallel sub-agent dispatch per angle (each worker receives context summary)
     [Execution Tier 2] sequential self-execution per angle
  → [conditional] if competing options emerge → dispatch /compare
  → aggregate findings
  → resolve output target (Obsidian → path → default)
  → write structured artifact (base + extended schema)
  → filename includes model identifier (e.g. topic-opus-4-6.md)
```

**`/analyze` flow:**

```
$ARGUMENTS (file, directory, codebase, document, idea) + optional --context path
  → input type classification (code, document, architecture, idea, mixed)
  → analysis angle selection (all 6 always applicable, emphasis varies by type)
  → sub-agent probe
  → [Execution Tier 1] parallel sub-agent dispatch (one per analysis angle)
     [Execution Tier 2] sequential self-execution per angle
  → [conditional] if angle surfaces comparables → dispatch /compare
  → cross-angle synthesis → prioritized recommendations
  → write structured artifact (base + analysis extended schema)
  → filename includes model identifier (e.g. topic-analysis-opus-4-6.md)
```

**`/synthesize` flow:**

```
$ARGUMENTS (directory or file paths)
  → [directory mode] scan directory → filter by frontmatter (structured artifacts only)
     [explicit mode] read specified file paths
  → classify input types → determine output schema (superset of inputs)
  → for each source artifact:
     → extract findings, conclusions, recommendations
     → track provenance (source file, model, date)
  → reconcile across sources:
     → identify agreements (high confidence — multiple sources converge)
     → surface contradictions (flag + lean, not decided fact)
     → deduplicate without losing unique insights
  → produce synthesis output (artifact by default, inline if simple)
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
- Execution Tier 2 is self-evaluation (not fresh session) because the skill's value is immediate, in-context verification
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
- When invoked as sub-agent from `/deep-research` or `/analyze`, uses the `comparative` schema format but returns inline to the orchestrator (no file write, no model-tagged filename) — the orchestrator embeds the comparison as a supplementary section

### /deep-research

**Purpose:** Comprehensive research orchestrator that produces structured artifacts.

**Responsibilities:**

- Read `--context` file/directory if provided, extracting constraints, focus areas, and prior art
- Classify topic and select appropriate extended schema (context informs classification)
- Plan research angles (what to investigate, from which perspectives — context shapes angle priorities and what each angle looks for)
- Dispatch parallel sub-agents for independent research angles (each worker receives a context summary alongside its angle prompt)
- Conditionally invoke /compare when competing options emerge
- Aggregate and synthesize findings from all angles
- Resolve output target and write structured artifact

**Interfaces:**

- **Input:** `$ARGUMENTS` (topic, optional `--depth`, optional `--focus`, optional `--context path`, optional output path)
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

extended schemas (one selected per output):
├── technical      → packages, repo analysis, code examples, integration notes
├── comparative    → comparison table, dimensions, scoring, recommendation (shared with /compare)
├── conceptual     → key themes, mental models, notable references, open questions
├── architectural  → tradeoffs, constraints, decision framework, risk considerations
└── analysis       → per-angle findings, cross-angle synthesis, prioritized recommendations (used by /analyze)
```

**Research-angle worker pattern:**

Research-angle sub-agents are generic — they don't have dedicated agent definitions. The orchestrator dispatches general-purpose sub-agents with specific research prompts:

- Each worker receives: a research angle description, available sources, and output format instructions
- Each worker returns: structured findings for that angle (inline to orchestrator, not written to disk)
- The orchestrator aggregates all worker findings into the final artifact

**Conditional /compare invocation contract:**

When competing options emerge during research (e.g. "which library for X?"), the orchestrator invokes `/compare` as a sub-agent rather than comparing inline:

- `/compare` is dispatched with the competing options as a sub-agent (same dispatch mechanism as research-angle workers)
- `/compare` returns its comparative output inline to the orchestrator — it does **not** write a separate intermediate file
- The orchestrator embeds the comparative output as a supplementary section within the primary research artifact
- The originally selected extended schema remains the primary structure — a "technical" research artifact may contain an embedded comparative section without switching the top-level schema
- Model-tagged filename rules do **not** apply to this intermediate output (there is no intermediate file — the final research artifact gets the model-tagged filename)
- This follows the same pattern as the `skeptical-evaluator`: sub-agent returns findings to orchestrator, orchestrator owns the final output

**Design decisions:**

- Schema selection happens at classification time, before research begins — it shapes what sub-agents get dispatched and what dimensions get explored
- `/compare` returns inline to orchestrator (no intermediate file), embeds as a section within the main artifact — no schema switch
- Research depth is interactive by default — classify upfront, present scope to user, proceed. `--depth` flag (surface/standard/exhaustive) as optional override.
- `--focus` flag narrows research to a specific angle (e.g. `--focus security`)
- `--context` provides supplementary constraints and prior art that shape topic classification, angle planning, and what each worker looks for — but context is guidance, not a script. Research still follows the skill's own methodology.

### /analyze

**Purpose:** Multi-angle analysis of existing artifacts, codebases, documents, or systems. Where `/deep-research` is external-facing ("go find out about X"), `/analyze` is internal-facing ("look deeply at this thing I have").

**Responsibilities:**

- Accept input (file, directory, codebase, document, idea) from `$ARGUMENTS`
- Classify input type to determine emphasis weighting
- Read `--context` file/directory if provided for evaluation criteria
- Dispatch analysis-angle sub-agents (parallel preferred, sequential fallback)
- Conditionally invoke `/compare` when an angle surfaces comparables
- Synthesize findings across angles into prioritized recommendations
- Write structured analysis artifact

**Interfaces:**

- **Input:** `$ARGUMENTS` (target to analyze, optional `--context path`)
- **Output:** Always an artifact. Never inline-only.

**Six analysis angles:**

All six angles are always applicable; the skill emphasizes angles most relevant to the classified input type.

| Angle                       | What it asks                                                                           | Applies especially to                          |
| --------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Adversarial / Critical      | What could go wrong? Where are the weaknesses? What assumptions are fragile?           | Code, architecture, proposals, documents       |
| Gap Analysis                | What's missing? What was promised but not delivered? What's implicit but unstated?     | Specs, PRDs, codebases, documents              |
| Opportunity Analysis        | What could be improved? What potential is untapped? What adjacent possibilities exist? | Products, architectures, strategies, documents |
| Structural / Organizational | Is this well-organized? Does the structure serve its purpose? Are boundaries clean?    | Code, documents, architectures, presentations  |
| Consistency / Coherence     | Do the parts agree with each other? Are there internal contradictions?                 | Documents, codebases, multi-file artifacts     |
| Audience / Clarity          | Will the intended audience understand this? Is the signal-to-noise ratio good?         | Documents, presentations, APIs, error messages |

**Input type → angle emphasis:**

| Input type                | Primary emphasis                  | Secondary emphasis |
| ------------------------- | --------------------------------- | ------------------ |
| Code / codebase           | Adversarial, Gap, Structural      | Consistency        |
| Architecture / design doc | Adversarial, Gap, Structural      | Opportunity        |
| Product spec / PRD        | Gap, Opportunity, Audience        | Consistency        |
| Presentation / deck       | Audience, Structural, Consistency | Opportunity        |
| Strategy / proposal       | Adversarial, Opportunity, Gap     | Audience           |
| Idea (unstructured)       | Opportunity, Adversarial, Gap     | Audience           |

**Analysis-angle worker pattern:**

Same pattern as `/deep-research` research-angle workers — generic prompt-based dispatch:

- Each worker receives: analysis angle description, target content (or pointers to it), any `--context` criteria, and output format instructions
- Each worker returns: structured findings for that angle (inline to orchestrator, not written to disk)
- The orchestrator aggregates all angle findings into cross-angle synthesis with prioritized recommendations

**Conditional /compare invocation:**

Same contract as `/deep-research` — when an analysis angle surfaces comparables (e.g. "this component could use library A or B"), the orchestrator dispatches `/compare` as a sub-agent. The comparison returns inline, embedded as a supplementary section.

**Design decisions:**

- All six angles are always run (not a user-selected subset) because the skill's value is comprehensive coverage — emphasis weighting handles prioritization
- Structural / Organizational applies to documents as well as code — structure serves purpose regardless of artifact type
- `--context` is the mechanism for providing evaluation criteria (e.g. security policy, style guide, business requirements) — the primary input is what to analyze, context is what to analyze it against
- `/compare` can be dispatched from `/analyze` (same as from `/deep-research`) but only when an angle surfaces comparables, not by default

### /synthesize

**Purpose:** Merge multiple analysis artifacts (from different agents, sessions, or skill runs) into a single coherent report with provenance tracking.

**Responsibilities:**

- Discover input artifacts from a directory (frontmatter-aware filtering) or explicit file paths
- Classify input types and determine output schema (superset of input schema)
- Extract findings, conclusions, and recommendations from each source
- Track provenance — which finding came from which source/model
- Reconcile across sources: identify agreements, surface contradictions, deduplicate
- Produce synthesis output with clear attribution

**Interfaces:**

- **Input:** `$ARGUMENTS` — directory path (primary, auto-detect) or explicit file paths. Optional `--inline` flag.
- **Output (artifact, default):** Synthesis document using superset of input schema + synthesis-specific sections
- **Output (inline):** Condensed summary for simple merges

**Auto-detection from directory:**

The primary input mode scans a directory for structured artifacts. Filtering strategy:

- Read frontmatter of each `.md` file in the directory
- Include files that have structured artifact frontmatter (e.g. from /compare, /deep-research, or review artifacts)
- Exclude files without frontmatter or with unrecognized structure
- Explicit file path arguments override auto-detection entirely

**Superset output schema:**

The synthesis output includes all fields from the input schema plus synthesis-specific additions:

| Input schema fields                                                                           | Synthesis additions                                                                         |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| All sections from input type (e.g. comparative: comparison table, dimensions, recommendation) | **Source Agreement** — findings where multiple sources converge (high confidence signal)    |
|                                                                                               | **Contradictions** — where sources disagree, with each position attributed and a noted lean |
|                                                                                               | **Provenance Table** — maps each finding to its source (file, model, date)                  |
|                                                                                               | **Unique Insights** — findings that appeared in only one source but are worth preserving    |
|                                                                                               | **Synthesis Methodology** — what was merged, how conflicts were resolved                    |

When input types are homogeneous (e.g. two comparative analyses), the output follows that type's schema extended with synthesis fields. When mixed, the output uses a generic synthesis wrapper.

**Conflict resolution:**

When sources disagree:

1. Flag the disagreement explicitly
2. Note a lean toward one position with reasoning
3. Mark it clearly as a lean, not a decided fact — e.g. "Source A and Source B disagree on X. **Lean:** Source A's position appears better supported because [reason], but this warrants further investigation."

**Design decisions:**

- No sub-agent dispatch needed — synthesis is a reading + reconciliation task, not a research task
- Frontmatter-aware filtering is the default for directory mode because the target directories will likely contain both artifact files and other files
- Artifact output by default because synthesis is inherently a document-level operation, but inline is available for simple 2-file merges
- The skill does not modify input artifacts — it only reads and produces a new output

### Model-Tagged Filenames (Cross-Cutting Convention)

When `/compare` (artifact mode), `/deep-research`, or `/analyze` write artifacts to a directory, they must include the model identifier in the filename to prevent collisions when multiple agents target the same output directory.

**Convention:** `{topic}-{model-id}.md`

**Examples:**

- `react-state-management-opus-4-6.md` (Claude Opus 4.6)
- `react-state-management-gpt-5-4.md` (Codex GPT-5.4)
- `auth-comparison-claude-sonnet-4-6.md`

**Model detection:** The agent self-identifies its model from its runtime context. Each skill includes an instruction to detect and use the model identifier when writing artifacts. If the model cannot be determined, use a fallback identifier (e.g. `unknown-model` or the provider name).

**Why this matters for /synthesize:** Model-tagged filenames enable `/synthesize` to attribute findings by source without requiring the user to manually specify provenance. The filename pattern is parsed alongside frontmatter during artifact discovery.

### `--context` Flag (Cross-Cutting Convention)

`/compare`, `/deep-research`, and `/analyze` accept `--context path` pointing to a file or directory of supplementary context. This separates what the skill operates on (its primary input) from what criteria it evaluates against.

**Applicable skills:**

| Skill            | Primary input              | `--context` provides                                                                                    |
| ---------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/compare`       | Items to compare           | Additional evaluation criteria, constraints, or background that shape dimension selection               |
| `/deep-research` | Topic to research          | Links, prior art, constraints, or focus areas that guide research angles                                |
| `/analyze`       | Artifact/system to analyze | Evaluation criteria to analyze against (e.g. security policy, style guide, business requirements, spec) |

**Not applicable:**

- `/skeptic` — the claim is the context (no separate evaluation criteria needed)
- `/synthesize` — the input artifacts are the context (synthesis doesn't evaluate against external criteria)

**Behavior:**

1. If `--context path` is a file: read and incorporate as supplementary context
2. If `--context path` is a directory: read all `.md` files in the directory and incorporate
3. If `--context` is not provided: skill operates without supplementary criteria (normal behavior)
4. Context informs the skill's analysis but does not replace its primary workflow — it's guidance, not a script

**Examples:**

```
/analyze src/auth/ --context docs/security-policy.md
  → Analyzes auth code, emphasizes gaps relative to the security policy

/deep-research "event-driven architecture" --context .oat/projects/shared/my-project/spec.md
  → Researches event-driven architecture with awareness of the project's specific constraints

/compare express koa fastify --context requirements.md
  → Compares frameworks against criteria defined in requirements.md
```

### Artifact Frontmatter Contract (Cross-Cutting Convention)

All artifact-producing skills (`/compare` with `--save`, `/deep-research`, `/analyze`) must emit a standard set of frontmatter keys. `/synthesize` reads these keys for auto-detection and provenance attribution.

**Required frontmatter keys:**

```yaml
---
oat_skill: deep-research | compare | analyze # Which skill produced this artifact
oat_schema: technical | comparative | conceptual | architectural | analysis # Extended schema used
oat_topic: 'event-driven architecture' # Human-readable topic/subject
oat_model: opus-4-6 # Model identifier (same slug used in filename)
oat_generated_at: 2026-03-14 # Date of generation
---
```

**Optional frontmatter keys:**

```yaml
oat_context: docs/security-policy.md # --context path used (if any)
oat_depth: standard # Research depth (for /deep-research)
oat_focus: security # Focus angle (for /deep-research)
oat_input_type: code # Classified input type (for /analyze)
```

**How `/synthesize` uses this:**

1. **Auto-detection:** Scans directory for `.md` files → reads frontmatter → includes files with `oat_skill` key (rejects files without it)
2. **Provenance:** Maps findings to source using `oat_model`, `oat_skill`, and `oat_generated_at`
3. **Schema resolution:** Uses `oat_schema` to determine the superset output schema
4. **Deduplication:** Same `oat_topic` + different `oat_model` signals multi-agent coverage of the same subject

**Model detection for `oat_model`:**

The agent self-identifies its model from runtime context. Each skill includes instructions to detect and use the model identifier. If model cannot be determined, use a fallback (e.g. `unknown-model` or provider name). The same slug is used in both frontmatter and the model-tagged filename.

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
├── schema-base.md           # Base template (shared by /deep-research and /analyze)
├── schema-technical.md      # Extended: technical research
├── schema-comparative.md    # Extended: comparative analysis (shared with /compare)
├── schema-conceptual.md     # Extended: conceptual/thematic research
├── schema-architectural.md  # Extended: architectural decision research
└── schema-analysis.md       # Extended: multi-angle analysis (used by /analyze)
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
| /deep-research | Artifact written to shared directory              | Filename includes model identifier                                |
| /analyze       | Analyze a codebase directory                      | All 6 angles run, emphasis weighted for code input type           |
| /analyze       | Analyze a document with --context                 | Context file read, findings evaluated against provided criteria   |
| /analyze       | Analyze an idea (unstructured text)               | Opportunity + Adversarial emphasized, artifact still produced     |
| /analyze       | Sub-agents unavailable                            | Sequential self-execution, same artifact quality                  |
| /analyze       | Angle surfaces comparables                        | /compare conditionally dispatched, embedded in artifact           |
| /analyze       | Artifact written to shared directory              | Filename includes model identifier                                |
| /synthesize    | Directory with 2 analyses from different models   | Analyses merged with per-angle provenance tracking                |
| /synthesize    | Directory with 2 artifacts from different models  | Both discovered via frontmatter, merged with provenance           |
| /synthesize    | Two comparative analyses                          | Superset output with comparative schema + synthesis fields        |
| /synthesize    | Sources that disagree                             | Contradiction flagged with lean, not stated as fact               |
| /synthesize    | Explicit file paths instead of directory          | File paths used directly, auto-detection skipped                  |
| /synthesize    | Mixed input types (research + comparison)         | Generic synthesis wrapper used                                    |
| /synthesize    | --inline flag                                     | Inline output instead of artifact                                 |
| All            | Cross-provider                                    | Skill loads, step logging works, questions asked portably         |

**Success criteria → test scenario mapping:**

| Discovery success criterion                                             | Verified by scenario(s)                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| /skeptic adversarially evaluates claims with cited evidence             | /skeptic: explicit claim, code_behavior, factual                            |
| /compare produces domain-appropriate comparisons                        | /compare: 2 npm packages, 3+ options                                        |
| /deep-research orchestrates research and produces artifacts             | /deep-research: technical topic, competing options                          |
| /synthesize merges artifacts with provenance tracking                   | /synthesize: directory with 2 artifacts, sources disagree                   |
| /analyze produces multi-angle analysis with prioritized recommendations | /analyze: codebase, document with --context, idea                           |
| /compare invokable as sub-agent from /deep-research and /analyze        | /compare: invoked from /deep-research; /analyze: angle surfaces comparables |
| /synthesize merges multiple analyses                                    | /synthesize: directory with 2 analyses                                      |
| Non-colliding filenames from multiple agents                            | /deep-research + /analyze: artifact written to shared directory             |
| Graceful degradation when sub-agents unavailable                        | /skeptic + /deep-research + /analyze: sub-agent unavailable                 |
| Cross-provider compatibility                                            | All: cross-provider                                                         |

**Verification approach:**

- Invoke each skill in Claude Code (primary test environment)
- Verify step logging output matches expected format
- Verify verdict/output format matches spec
- Test sub-agent dispatch (Execution Tier 1) and fallback (Execution Tier 2) by running with/without agent definitions present
- Cross-provider: verify skill loads and executes in Cursor (if available)
- Cross-provider: verify skill loads in Codex — confirm Execution Tier 1 worker dispatch via `multi_agent = true`, and graceful fallback to Tier 2 when multi-agent is disabled
- Cross-provider: verify skill loads in Claude.ai — confirm Execution Tier 2/3 fallback (no sub-agent dispatch), step logging renders correctly, and interactive input (questions) works via conversation flow

## Open Questions (Carried from Discovery)

- **/compare auto-artifact:** Deferred — starting with explicit `--save` flag only. Can add auto-detection later if the UX warrants it.
- **/deep-research repo cloning:** Deferred — start without repo cloning. Can add as opt-in later when docs MCP coverage is assessed.
