---
name: analyze
version: 0.1.0
description: Multi-angle analysis of existing artifacts, codebases, documents, or systems. Examines what you have from six analysis angles and produces structured findings with prioritized recommendations.
argument-hint: 'target [--context path]'
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Agent, mcp__*
---

# /analyze

Multi-angle analysis of existing artifacts, codebases, documents, or systems. Where /deep-research is external-facing ("go find out about X"), /analyze is internal-facing ("look deeply at this thing I have"). The input is something concrete -- a file, directory, codebase, document, presentation, or idea. Examines the target from six analysis angles and produces structured findings with prioritized recommendations.

## When to Use

Use when:

- Analyzing a codebase, module, or directory for quality and improvement opportunities
- Reviewing a document, spec, or design for completeness and clarity
- Evaluating a presentation or deck for audience effectiveness
- Examining a strategy or proposal for weaknesses and opportunities
- Getting a comprehensive multi-perspective view of anything concrete you have

## When NOT to Use

Don't use when:

- Researching a topic you don't have yet (use /deep-research)
- Comparing specific alternatives (use /compare)
- Verifying a specific factual claim (use /skeptic)
- Merging multiple existing analyses (use /synthesize)

## Arguments

Parse from `$ARGUMENTS`:

- **target**: What to analyze -- file path, directory path, or quoted text for ideas (required)
- **--context path**: File or directory providing evaluation criteria to analyze against (optional)

## Progress Indicators (User-Facing)

Print this banner once at start:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/analyze
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then print step indicators before beginning work:

- `[1/9] Parsing arguments…`
- `[2/9] Reading context…` (if applicable)
- `[3/9] Classifying input type…`
- `[4/9] Selecting analysis angles…`
- `[5/9] Checking sub-agent availability…`
- `[6/9] Executing analysis angles…`
- `[7/9] Checking for comparisons…` (if applicable)
- `[8/9] Cross-angle synthesis…`
- `[9/9] Writing artifact…`

For long-running operations, print a start line and a completion line:

```
  → Analyzing: {angle}…
  → Complete.
```

Keep it concise; don't print a line for every shell command.

## Workflow

### Step 1: Parse arguments

`[1/9] Parsing arguments…`

Parse from `$ARGUMENTS`:

- **target**: What to analyze -- file path, directory path, or quoted text for ideas (required)
- **--context path**: File or directory providing evaluation criteria to analyze against (optional)

If target is unclear, ask for clarification:

- **Claude Code**: use `AskUserQuestion`
- **Codex**: use structured user-input tooling when available in the current host/runtime
- **Fallback**: ask in plain text

The prompt should ask: _"What would you like me to analyze? Provide a file path, directory path, or describe the idea in quotes."_

---

### Step 2: Read context (if provided)

`[2/9] Reading context…`

If `--context` is specified:

- If path is a **file**: read as evaluation criteria
- If path is a **directory**: read all `.md` files as evaluation criteria
- If path is **not found**: warn and proceed without context criteria

`--context` separates "what to analyze" (target) from "what to analyze it against" (context). Example: `/analyze src/auth/ --context docs/security-policy.md` analyzes auth code against the security policy.

If `--context` is not specified, skip this step.

---

### Step 3: Input type classification

`[3/9] Classifying input type…`

Classify the target to determine analysis angle emphasis:

| Input Type                | Detection                                                      |
| ------------------------- | -------------------------------------------------------------- |
| Code / codebase           | File/directory containing `.ts`, `.js`, `.py`, etc.            |
| Architecture / design doc | Markdown files with architecture/design content                |
| Product spec / PRD        | Documents with requirements, user stories, acceptance criteria |
| Presentation / deck       | Slide-like content, structured for audience delivery           |
| Strategy / proposal       | Business-oriented documents with proposals or strategies       |
| Idea (unstructured)       | Quoted text, no file path, conceptual description              |

Log: `→ Input type: {type}`

---

### Step 4: Analysis angle selection

`[4/9] Selecting analysis angles…`

All six angles are ALWAYS run. The input type determines emphasis weighting (primary angles get deeper investigation):

| Input Type                | Primary Emphasis                  | Secondary Emphasis |
| ------------------------- | --------------------------------- | ------------------ |
| Code / codebase           | Adversarial, Gap, Structural      | Consistency        |
| Architecture / design doc | Adversarial, Gap, Structural      | Opportunity        |
| Product spec / PRD        | Gap, Opportunity, Audience        | Consistency        |
| Presentation / deck       | Audience, Structural, Consistency | Opportunity        |
| Strategy / proposal       | Adversarial, Opportunity, Gap     | Audience           |
| Idea (unstructured)       | Opportunity, Adversarial, Gap     | Audience           |

The six analysis angles:

| Angle                       | What It Asks                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Adversarial / Critical      | What could go wrong? Where are the weaknesses? What assumptions are fragile?           |
| Gap Analysis                | What's missing? What was promised but not delivered? What's implicit but unstated?     |
| Opportunity Analysis        | What could be improved? What potential is untapped? What adjacent possibilities exist? |
| Structural / Organizational | Is this well-organized? Does the structure serve its purpose? Are boundaries clean?    |
| Consistency / Coherence     | Do the parts agree with each other? Are there internal contradictions?                 |
| Audience / Clarity          | Will the intended audience understand this? Is the signal-to-noise ratio good?         |

Log the selected emphasis: `→ Primary: {angles} · Secondary: {angles}`

---

### Step 5: Sub-agent availability probe

```
[5/9] Checking sub-agent availability…
  → analysis workers: {available | not resolved} ({reason})
  → Selected: Execution Tier {1|2|3} — {description}
```

**Execution Tier 1 -- Parallel worker dispatch (preferred):**

- **Claude Code**: dispatch 6 concurrent `Agent` tool calls, each with `subagent_type: "general-purpose"` and a structured analysis prompt for one angle. Each worker receives: target content (or pointers to files), angle description, any --context criteria, and output format instructions.
- **Cursor**: multiple concurrent agent mentions with distinct angle prompts
- **Codex**: worker prompts dispatched as parallel agent tasks when `multi_agent = true`
- **Claude.ai**: no worker dispatch -> Execution Tier 2

**Execution Tier 2 -- Sequential self-execution:**

- Execute each analysis angle sequentially (all 6)
- Loses parallelism but preserves comprehensive coverage
- Log: `→ analysis workers: not resolved — falling back to Execution Tier 2 (sequential)`

**Execution Tier 3 -- Inline execution:**

- User explicitly requests, or target is small enough for single-pass analysis
- Still produces an artifact (artifact-only is an output contract, not an execution contract)

---

### Step 6: Execute analysis angles

`[6/9] Executing analysis angles…`

For each angle, the worker (sub-agent or self) receives:

- Analysis angle description and guiding questions
- Target content or file pointers
- Context criteria (if --context was provided)
- Emphasis level (primary or secondary for this input type)
- Output format: structured findings for this angle

Each worker returns structured findings inline to orchestrator.

Print progress for each angle:

```
  → Analyzing: Adversarial / Critical…
  → Complete.
  → Analyzing: Gap Analysis…
  → Complete.
```

---

### Step 7: Conditional /compare dispatch

`[7/9] Checking for comparisons…`

If any angle surfaces comparables (e.g. "this component could use library A or B"):

- Dispatch /compare as sub-agent with the options
- /compare returns inline, embedded as supplementary section
- Same contract as /deep-research uses

If no comparables surfaced, skip this step.

---

### Step 8: Cross-angle synthesis

`[8/10] Cross-angle synthesis…`

- Identify patterns that emerged across multiple angles
- Surface the most important findings regardless of which angle found them
- Reconcile any contradictions between angle findings
- Produce prioritized recommendations with effort/impact assessment

---

### Step 9: Resolve output destination

`[9/10] Resolving output destination…`

**If an explicit output path was provided in `$ARGUMENTS`**, use it directly — no prompt.

**Otherwise**, determine a default suggestion using OAT-aware detection:

1. Check for `.oat/` at repo root (project-level OAT) → suggest `.oat/repo/analysis/`
2. Check for `~/.oat/` (user-level OAT) → suggest `~/.oat/analysis/`
3. Fall back to current directory

Then ask the user via `AskUserQuestion` (Claude Code), structured user-input tooling (Codex), or equivalent:

> "Where would you like to write the analysis? (default: {suggested path})"

- If the user confirms (empty response or "yes"), use the suggested path.
- If the user provides a different path, use that instead.
- Create the target directory if it does not exist.

---

### Step 10: Write artifact

`[10/10] Writing artifact…`

Write the structured analysis artifact using:

- Base schema structure (Executive Summary, Methodology, Findings, Sources & References) from `../deep-research/references/schema-base.md`
- Analysis extended schema sections (Per-Angle Findings, Cross-Angle Synthesis, Prioritized Recommendations) from `../deep-research/references/schema-analysis.md`

Artifact frontmatter contract:

```yaml
---
skill: analyze
schema: analysis
topic: '{descriptive topic from target}'
model: { self-detected model identifier }
generated_at: { today's date }
input_type: { classified input type }
---
```

Plus optional: `context` (if --context was provided)

Model-tagged filename: `{topic-slug}-analysis-{model-id}.md`

Output is always an artifact file -- never inline-only.

---

## Examples

### Analyze a code directory

```
/analyze src/auth/
```

### Analyze code against a policy document

```
/analyze src/auth/ --context docs/security-policy.md
```

### Analyze a spec document

```
/analyze docs/spec.md
```

### Analyze an idea

```
/analyze "We should migrate from REST to GraphQL for our public API"
```

### Analyze architecture against requirements

```
/analyze docs/architecture.md --context docs/requirements.md
```

## Troubleshooting

**Target path doesn't exist:**

- Ask user to verify the path using `AskUserQuestion` (Claude Code), structured user-input tooling (Codex), or plain text (fallback)
- Do not proceed until a valid target is provided

**Target is too large:**

- For large codebases, suggest focusing on a subdirectory or specific module
- The skill should still work but will prioritize breadth over depth

**Input type unclear:**

- Default to "idea (unstructured)" for text, or infer from file extensions for paths
- Note the classification in output so the user can correct if needed

**Sub-agent dispatch fails:**

- Log: `→ analysis workers: not resolved (dispatch failed) — falling back to Execution Tier 2`
- Proceed with sequential self-execution; all 6 angles still run, only parallelism is lost

**--context file not found:**

- Warn and proceed without context criteria
- Note in output that context was requested but not found

## Success Criteria

- Banner printed at start
- Target parsed and input type classified
- All 6 analysis angles executed (emphasis weighted by input type)
- Execution tier selected and logged with reason
- --context correctly used as evaluation criteria (separate from target)
- /compare conditionally dispatched when angle surfaces comparables
- Cross-angle synthesis identifies patterns across angles
- Prioritized recommendations produced with effort/impact
- Artifact written with analysis schema, frontmatter contract, and model-tagged filename
- Output destination resolved via OAT-aware detection and user prompt (unless explicit path given)
- Output is always an artifact (never inline-only)
