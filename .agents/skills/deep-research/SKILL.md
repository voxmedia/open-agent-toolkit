---
name: deep-research
version: 0.1.0
description: Comprehensive research orchestrator that classifies topics, dispatches parallel research-angle workers, and produces structured artifacts using domain-specific schemas.
argument-hint: 'topic [--depth surface|standard|exhaustive] [--focus angle] [--context path] [output-path]'
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Agent, mcp__*
---

# /deep-research

Comprehensive research orchestrator that classifies a topic, selects a domain-specific schema, plans independent research angles, dispatches parallel workers (or executes sequentially), and produces a structured artifact. Output is always a written artifact -- never inline-only.

## When to Use

Use when:

- Deep dive into a technology, pattern, or concept
- Exploring options before making a decision
- Building comprehensive knowledge on a topic
- Producing a shareable research document

## When NOT to Use

Don't use when:

- Quick comparison of 2-3 items (use /compare)
- Analyzing something you already have (use /analyze)
- Verifying a specific claim (use /skeptic)
- Merging existing research (use /synthesize)

## Arguments

Parse from `$ARGUMENTS`:

- **topic**: The research subject (required)
- **--depth**: `surface` | `standard` (default) | `exhaustive` (optional)
- **--focus**: Narrow to a specific angle, e.g. `--focus security` (optional)
- **--context path**: File or directory of supplementary context (optional)
- **output-path**: Where to write the artifact (optional)

## Progress Indicators (User-Facing)

Print this banner once at start:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/deep-research
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then print step indicators before beginning work:

- `[1/10] Parsing arguments…`
- `[2/10] Reading context…` (if applicable)
- `[3/10] Classifying topic…`
- `[4/10] Planning research angles…`
- `[5/10] Checking sub-agent availability…`
- `[6/10] Executing research angles…`
- `[7/10] Checking for comparisons…` (if applicable)
- `[8/10] Synthesizing findings…`
- `[9/10] Resolving output target…`
- `[10/10] Writing artifact…`

For long-running operations (web fetches, multi-angle research), print a start line and a completion line:

```
  → Researching: {angle}…
  → Complete.
```

Keep it concise; don't print a line for every shell command.

## Workflow

### Step 1: Parse arguments

`[1/10] Parsing arguments…`

Parse from `$ARGUMENTS`:

- **topic**: Extract the research subject. May be a bare word, quoted string, or multi-word phrase.
- **--depth**: `surface` | `standard` (default) | `exhaustive`. Controls breadth and depth of research.
- **--focus**: Narrow research to a specific angle (e.g. `--focus security`).
- **--context path**: Path to a file or directory of supplementary context.
- **output-path**: A trailing path argument specifying where to write the artifact.

If the topic is unclear, ask the user for clarification:

- **Claude Code**: use `AskUserQuestion`
- **Codex**: use structured user-input tooling when available in the current host/runtime
- **Fallback**: ask in plain text

The prompt should ask: _"What topic would you like me to research?"_

---

### Step 2: Read context (if provided)

`[2/10] Reading context…`

If `--context` is specified:

- If path is a **file**: read and extract constraints, focus areas, prior art
- If path is a **directory**: read all `.md` files and incorporate
- If path is **not found**: warn and proceed without context

Context informs topic classification and angle planning but does not replace the skill's methodology.

If `--context` is not specified, skip this step.

---

### Step 3: Topic classification and schema selection

`[3/10] Classifying topic…`

Classify the topic to select the appropriate extended schema:

| Classification | Extended Schema         | Typical Topics                                     |
| -------------- | ----------------------- | -------------------------------------------------- |
| Technical      | schema-technical.md     | packages, libraries, frameworks, tools, languages  |
| Comparative    | schema-comparative.md   | "X vs Y", choosing between options                 |
| Conceptual     | schema-conceptual.md    | design patterns, methodologies, concepts, theories |
| Architectural  | schema-architectural.md | system design, infrastructure, deployment patterns |

Context (if provided) informs classification -- e.g., context with performance constraints might push a general topic toward technical.

Present classification to user briefly: `→ Classified as: {type} → using {schema} template`

---

### Step 4: Research angle planning

`[4/10] Planning research angles…`

Based on the topic and classification, plan 3-6 research angles. Each angle is an independent research question or perspective that can be explored in isolation.

Example angles for "event-driven architecture":

- Core patterns and primitives
- Framework/tool landscape
- Operational concerns (monitoring, debugging, testing)
- Migration patterns from request-response
- When NOT to use event-driven

Angle planning rules:

- If `--focus` is specified, prioritize that angle and reduce others.
- If `--context` is provided, let context shape which angles are prioritized and what each angle looks for.
- If `--depth surface`, use 2-3 angles with lighter research per angle.
- If `--depth exhaustive`, use 5-6 angles with thorough research per angle.

---

### Step 5: Sub-agent availability probe

```
[5/10] Checking sub-agent availability…
  → research workers: {available | not resolved} ({reason})
  → Selected: Execution Tier {1|2|3} — {description}
```

**Execution Tier 1 -- Parallel worker dispatch (preferred):**

Detection logic (provider split):

- **Claude Code**: `Agent` tool available -- dispatch multiple concurrent `Agent` tool calls, each with `subagent_type: "general-purpose"` and a structured research prompt. Parallelism comes from concurrent tool invocations.
- **Cursor**: multiple concurrent agent mentions with distinct prompts
- **Codex**: worker prompts dispatched as parallel agent tasks when `multi_agent = true`
- **Claude.ai**: no worker dispatch -- falls through to Execution Tier 2

**Execution Tier 2 -- Sequential self-execution:**

- Execute each research angle sequentially
- Loses parallelism but preserves completeness
- Log: `→ research workers: not resolved — falling back to Execution Tier 2 (sequential)`

**Execution Tier 3 -- Inline execution:**

- User explicitly requests inline, or single-angle focus
- Still produces an artifact (artifact-only is an output contract, not an execution contract)

---

### Step 6: Execute research angles

`[6/10] Executing research angles…`

For each angle, the worker (sub-agent or self) receives:

- Research angle description
- Available sources list
- Context summary (if `--context` was provided)
- Output format instructions (structured findings for this angle)

Each worker returns structured findings inline to the orchestrator (not written to disk).

Print progress per angle:

```
  → Researching: {angle}…
  → Complete.
```

---

### Step 7: Conditional /compare dispatch

`[7/10] Checking for comparisons…`

If competing options emerge during research (e.g. "which library for X?"):

- Dispatch `/compare` as a sub-agent with the competing options
- `/compare` returns its output inline to the orchestrator (no intermediate file, no model-tagged filename)
- The orchestrator embeds the comparison as a supplementary section within the main artifact
- The original extended schema remains the primary structure

If no competing options emerged, skip this step.

---

### Step 8: Aggregate and synthesize

`[8/10] Synthesizing findings…`

- Merge findings from all research angles
- Identify cross-cutting themes
- Resolve any contradictions between angle findings
- Produce executive summary

---

### Step 9: Resolve output target

`[9/10] Resolving output target…`

**If an explicit output path was provided in `$ARGUMENTS`**, use it directly — no prompt.

**Otherwise**, determine a default suggestion using OAT-aware detection:

1. Check for `.oat/` at repo root (project-level OAT) → suggest `.oat/repo/research/`
2. Check for `~/.oat/` (user-level OAT) → suggest `~/.oat/research/`
3. Fall back to current directory

Then ask the user via `AskUserQuestion` (Claude Code), structured user-input tooling (Codex), or equivalent:

> "Where would you like to write the artifact? (default: {suggested path})"

- If the user confirms (empty response or "yes"), use the suggested path.
- If the user provides a different path, use that instead.
- Create the target directory if it does not exist.

---

### Step 10: Write artifact

`[10/10] Writing artifact…`

Write the structured research artifact using:

- Base schema structure from `references/schema-base.md` (Executive Summary, Methodology, Findings, Sources & References)
- Extended schema sections based on classification from `references/schema-{type}.md`
- Artifact frontmatter contract:

  ```yaml
  ---
  skill: deep-research
  schema: { selected schema type }
  topic: '{topic}'
  model: { self-detected model identifier }
  generated_at: { today's date }
  ---
  ```

  Plus optional keys when applicable: `context`, `depth`, `focus`

- Model-tagged filename: `{topic-slug}-{model-id}.md` (e.g., `event-driven-architecture-opus-4-6.md`)

Reference schemas live in: `references/schema-base.md` and `references/schema-{type}.md`

---

## Examples

### Basic usage

```
/deep-research "event-driven architecture"
```

### Exhaustive research with focus

```
/deep-research "React state management in 2026" --depth exhaustive --focus performance
```

### Research with context

```
/deep-research "authentication patterns for microservices" --context docs/security-requirements.md
```

### Research with output path

```
/deep-research "Rust vs Go for CLI tools" ~/research/
```

## Troubleshooting

**Topic too broad:**

- Suggest narrowing with `--focus` or ask user to scope down
- Do not proceed with an unmanageably broad topic

**No web search available:**

- Research from local sources and conversation context only
- Note limitations in the Methodology section of the artifact

**Schema classification unclear:**

- Default to conceptual (most general)
- Note: if topic is "X vs Y", auto-select comparative

**Sub-agent dispatch fails:**

- Fall back to Execution Tier 2 (sequential)
- Output quality is preserved; only parallelism is lost
- Log: `→ research workers: not resolved (dispatch failed) — falling back to Execution Tier 2`

**Output path not writable:**

- Fall back to current directory; warn user
- Note the fallback in output so the user knows where the artifact landed

## Success Criteria

- Banner printed at start
- Topic parsed and classified into one of 4 schema types
- Research angles planned (3-6 angles)
- Execution tier selected and logged with reason
- Each angle researched with findings returned
- /compare conditionally dispatched when competing options emerge
- Findings aggregated into coherent artifact
- Artifact written with correct schema, frontmatter contract, and model-tagged filename
- Output destination resolved via OAT-aware detection and user prompt (unless explicit path given)
- `--depth`, `--focus`, and `--context` correctly influence research scope and priorities
- Output is always an artifact (never inline-only)
