---
name: compare
version: 0.1.0
description: Domain-aware comparative analysis with clear recommendations. Compares options across auto-detected or user-specified dimensions and produces a qualitative assessment with a clear winner.
argument-hint: 'item1 item2 [item3...] [--save] [--context path] [--dimensions "dim1, dim2, ..."]'
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Agent, mcp__*
---

# /compare

Domain-aware comparative analysis that evaluates two or more options across auto-detected or user-specified dimensions and produces a qualitative assessment with a clear winner.

## When to Use

Use when:

- Comparing npm packages, libraries, frameworks, or tools
- Evaluating architectural approaches or design patterns
- Comparing business strategies, vendors, or options
- Any side-by-side evaluation where a recommendation is needed

## When NOT to Use

Don't use when:

- Single-item analysis (use /analyze instead)
- Deep research on a single topic (use /deep-research instead)
- Adversarial claim verification (use /skeptic instead)

## Arguments

Parse from `$ARGUMENTS`:

- **items**: 2 or more items to compare (required)
- **--save**: Write artifact instead of inline output (optional)
- **--context path**: Path to file or directory of supplementary context (optional)
- **--dimensions "dim1, dim2, ..."**: User-specified evaluation dimensions (optional, overrides auto-detection)

## Progress Indicators (User-Facing)

Print this banner once at start:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/compare
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then print step indicators before beginning work:

- `[1/5] Parsing arguments…`
- `[2/5] Classifying domain…`
- `[3/5] Researching options…`
- `[4/5] Scoring and ranking…`
- `[5/5] Producing output…`

For long-running operations (web fetches, registry lookups), print a start line and a completion line:

```
  → Researching {item}…
  → Complete.
```

Keep it concise; don't print a line for every shell command.

## Workflow

### Step 1: Parse arguments

`[1/5] Parsing arguments…`

Parse from `$ARGUMENTS`:

- **items**: Extract 2 or more items to compare. Items may be bare words or quoted strings.
- **--save**: If present, output will be written as an artifact file.
- **--context path**: If present, read supplementary context from the specified path.
- **--dimensions "dim1, dim2, ..."**: If present, use these dimensions instead of auto-detecting.

If fewer than 2 items are provided, ask the user for clarification:

- **Claude Code**: use `AskUserQuestion`
- **Codex**: use structured user-input tooling when available
- **Fallback**: ask in plain text

The prompt should ask: _"Please provide at least 2 items to compare."_

---

### Step 2: Read context (if provided)

If `--context` is specified:

- If path is a **file**: read and incorporate as supplementary evaluation criteria
- If path is a **directory**: read all `.md` files and incorporate
- If path is **not found**: warn and proceed without context

Context shapes dimension selection and evaluation focus but does not replace the skill's methodology.

If `--context` is not specified, skip this step.

---

### Step 3: Domain classification and dimension selection

`[2/5] Classifying domain…`

Classify the comparison domain based on the items provided to determine default evaluation dimensions:

| Domain                   | Default Dimensions                                                               |
| ------------------------ | -------------------------------------------------------------------------------- |
| npm packages             | bundle size, API ergonomics, maintenance health, TypeScript support, performance |
| architectural approaches | tradeoffs, constraints, operational complexity, team fit                         |
| business strategies      | cost, risk, reach, timing                                                        |
| tools/apps               | feature set, pricing, integration ecosystem, UX                                  |
| general                  | auto-detected from item characteristics                                          |

Dimension override rules:

- If user provided `--dimensions`, use those instead of defaults.
- If `--context` was provided, let context criteria influence dimension selection (add or reweight dimensions as appropriate).

---

### Step 4: Research each option

`[3/5] Researching options…`

For each item, research against each dimension using available sources:

- **npm packages** → npm registry, package repos, bundlephobia, documentation
- **architectural** → web search, authoritative sources, prior art
- **tools/apps** → web search, official docs, community reviews
- **general** → web search, available documentation

Print progress for each item:

```
  → Researching {item}…
  → Complete.
```

---

### Step 5: Score and recommend

`[4/5] Scoring and ranking…`

- **Qualitative scoring by default** — assess each option per dimension using descriptive language (e.g., strong, adequate, weak).
- Produce a **clear winner declaration** with rationale. Avoid ties; if options are genuinely close, pick the one with the strongest overall fit and explain the close call.
- For **N-way comparisons** (3+ items), produce a ranked recommendation.
- Only use numeric scoring if the user explicitly requests a matrix.

---

### Step 6: Output

`[5/5] Producing output…`

**Inline output (default):**

Condensed comparison with:

- Brief dimension-by-dimension comparison
- Clear recommendation with rationale
- Key caveats

**Artifact output (`--save` flag):**

Write artifact using the `comparative` extended schema from `.agents/skills/deep-research/references/schema-comparative.md`:

- Include artifact frontmatter contract:

  ```yaml
  ---
  skill: compare
  schema: comparative
  topic: '{item1} vs {item2} [vs ...]'
  model: { self-detected model identifier }
  generated_at: { today's date }
  ---
  ```

- Model-tagged filename: `{topic}-{model-id}.md` (e.g., `express-vs-koa-opus-4-6.md`)

**Output destination resolution** (only when `--save` is specified):

If an explicit output path was provided in `$ARGUMENTS`, use it directly — no prompt.

Otherwise, determine a default suggestion using OAT-aware detection:

1. Check for `.oat/` at repo root (project-level OAT) → suggest `.oat/repo/analysis/`
2. Check for `~/.oat/` (user-level OAT) → suggest `~/.oat/analysis/`
3. Fall back to current directory

Then ask the user via `AskUserQuestion` (Claude Code), structured user-input tooling (Codex), or equivalent:

> "Where would you like to write the comparison? (default: {suggested path})"

- If the user confirms (empty response or "yes"), use the suggested path.
- If the user provides a different path, use that instead.
- Create the target directory if it does not exist.

---

## Sub-Agent Invocation Contract

When `/compare` is dispatched as a sub-agent from `/deep-research` or `/analyze`:

- Uses the `comparative` schema FORMAT but returns output **INLINE** to the orchestrator (no file write, no model-tagged filename)
- The orchestrator embeds the comparison as a supplementary section within its own artifact
- Step logging adapts: lighter logging when running as sub-agent
- The `--save` flag is **NOT** used in sub-agent mode

---

## Examples

### Basic two-way comparison

```
/compare react vue
```

### Three-way comparison with artifact output

```
/compare express koa fastify --save
```

### Comparison with context

```
/compare "event sourcing" "CQRS" "traditional CRUD" --context requirements.md
```

### Custom dimensions

```
/compare zustand jotai valtio --dimensions "bundle size, learning curve, devtools"
```

## Troubleshooting

**Only one item provided:**

- Ask user for at least one more item to compare using `AskUserQuestion` (Claude Code), structured user-input tooling (Codex), or plain text (fallback)
- Do not proceed until at least 2 items are provided

**Domain unclear:**

- Default to "general" and auto-detect dimensions from item characteristics
- Note the classification in output so the user can correct if needed

**`--context` file not found:**

- Warn and proceed without context
- Note in output that context was requested but not found

**Web search unavailable:**

- Use only locally available sources (filesystem, codebase, conversation context)
- Note limitations in output so the user knows the comparison may be incomplete

## Success Criteria

- Banner printed at start
- At least 2 items parsed from arguments
- Domain correctly classified
- Dimensions appropriate for domain (or user-specified)
- Each option researched against each dimension
- Clear qualitative recommendation produced (not just a tie)
- Inline output is concise; artifact output uses comparative schema
- `--save` produces model-tagged filename with artifact frontmatter
- `--context` correctly incorporated when provided
- Sub-agent invocation contract respected when dispatched from orchestrators
