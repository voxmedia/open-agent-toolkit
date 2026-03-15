---
name: synthesize
version: 0.1.0
description: Merge multiple analysis artifacts into a single coherent report with provenance tracking. Reads existing artifacts from /deep-research, /analyze, and /compare.
argument-hint: '[directory | file1 file2 ...] [--inline]'
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, AskUserQuestion
---

# /synthesize

Merges multiple analysis artifacts (from /deep-research, /analyze, and /compare) into a single coherent report with provenance tracking. Sits at the end of the pipeline -- consuming outputs from these artifact-producing skills. Reads existing artifacts only; does not perform new research or dispatch sub-agents.

## When to Use

Use when:

- Combining findings from multiple /deep-research, /analyze, or /compare runs
- Producing a single unified report from a directory of research artifacts
- Identifying agreements and contradictions across independent analyses
- Building a provenance-tracked synthesis for decision-making

## When NOT to Use

Don't use when:

- Researching a new topic (use /deep-research)
- Analyzing a single artifact or codebase (use /analyze)
- Comparing specific alternatives (use /compare)
- Verifying a specific claim (use /skeptic)
- No existing artifacts to synthesize

## Arguments

Parse from `$ARGUMENTS`:

- **directory**: Path to a directory containing artifacts to synthesize (primary mode)
- **file1 file2 ...**: Explicit file paths to synthesize (alternative mode)
- **--inline**: Produce condensed inline summary instead of writing an artifact file (optional)

At least one directory or file path is required.

## Progress Indicators (User-Facing)

Print this banner once at start:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/synthesize
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then print step indicators before beginning work:

- `[1/6] Parsing arguments...`
- `[2/6] Discovering artifacts...`
- `[3/6] Classifying inputs and selecting output schema...`
- `[4/6] Extracting findings and provenance...`
- `[5/6] Reconciling across sources...`
- `[6/6] Producing output...`

For long-running operations (reading many artifacts), print a start line and a completion line:

```
  → Reading: {filename}...
  → Complete.
```

Keep it concise; don't print a line for every shell command.

## Workflow

### Step 1: Parse arguments

`[1/6] Parsing arguments...`

Parse from `$ARGUMENTS`:

- **directory**: If a single path ending in `/` or pointing to a directory, use directory mode.
- **file paths**: If multiple paths or paths pointing to files, use explicit mode.
- **--inline**: If present, produce condensed inline output instead of an artifact file.

If no paths are provided, ask the user for clarification:

- **Claude Code**: use `AskUserQuestion`
- **Codex**: use structured user-input tooling when available in the current host/runtime
- **Fallback**: ask in plain text

The prompt should ask: _"Please provide a directory path or file paths to the artifacts you want to synthesize."_

---

### Step 2: Discover artifacts

`[2/6] Discovering artifacts...`

**Directory mode:**

Scan the directory for `.md` files. For each file, read its YAML frontmatter and filter by the presence of all five required artifact keys (`skill`, `schema`, `topic`, `model`, `generated_at`). Only files with the complete artifact frontmatter contract are included.

Artifact frontmatter contract keys used for auto-detection:

| Key            | Purpose                                      |
| -------------- | -------------------------------------------- |
| `skill`        | Which skill produced the artifact (required) |
| `schema`       | Schema type used (required)                  |
| `topic`        | Human-readable topic (required)              |
| `model`        | Model identifier slug (required)             |
| `generated_at` | ISO date of generation (required)            |

Report discovered artifacts:

```
  → Found N artifacts:
    - {filename} (skill: {skill}, schema: {schema}, topic: {topic})
    - ...
```

If no artifacts are found, inform the user and stop:

```
  → No artifacts with valid artifact frontmatter found in {directory}. Nothing to synthesize.
```

**Explicit mode:**

Read specified file paths directly. Validate that each file exists and contains artifact frontmatter. Warn and **skip** files that lack any of the required artifact frontmatter keys (`skill`, `schema`, `topic`, `model`, `generated_at`) — all five are required for both discovery modes.

If fewer than 2 valid artifacts are found, ask the user to confirm they want to proceed (synthesis of a single artifact produces limited value).

---

### Step 3: Classify inputs and select output schema

`[3/6] Classifying inputs and selecting output schema...`

Examine the `schema` values across all discovered artifacts:

| Input Mix   | Output Schema                   | Behavior                                                                       |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------ |
| Homogeneous | Input schema + synthesis fields | All artifacts share the same schema; output extends it with synthesis sections |
| Mixed       | `synthesis` (generic wrapper)   | Artifacts use different schemas; output uses a generic synthesis structure     |

Log the classification:

```
  → Input schemas: {list of unique schema values}
  → Output schema: {selected schema}
```

**Superset output schema fields:**

The output artifact includes all fields from the input schema (for homogeneous inputs) plus these synthesis-specific additions:

| Section               | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| Source Agreement      | Findings where multiple sources converge (high confidence) |
| Contradictions        | Points where sources disagree, with lean and rationale     |
| Unique Insights       | Findings that appear in only one source                    |
| Provenance Table      | Source tracking: file, skill, model, date for each input   |
| Synthesis Methodology | How reconciliation was performed, what was prioritized     |

---

### Step 4: Extract findings and provenance

`[4/6] Extracting findings and provenance...`

For each source artifact:

1. **Extract findings**: Read the Findings section (or equivalent per schema type). Capture conclusions, recommendations, key data points, and any verdict or scoring.
2. **Track provenance**: Record the source file path, `skill`, `model`, `generated_at`, and `schema` for attribution.

Print progress per artifact:

```
  → Reading: {filename}...
  → Complete.
```

Build an internal working set of:

- All findings, tagged by source
- All recommendations, tagged by source
- All conclusions or verdicts, tagged by source
- Provenance metadata for each source

---

### Step 5: Reconcile across sources

`[5/6] Reconciling across sources...`

Apply the following reconciliation protocol:

**Agreements:**

- Identify findings or conclusions where 2+ sources converge on the same point.
- Mark these as high-confidence items in Source Agreement section.
- Note which sources agree and any nuance differences.

**Contradictions:**

- Identify points where sources directly disagree.
- For each contradiction:
  1. **Flag** the disagreement explicitly.
  2. **Lean** toward the position with stronger evidence, more recent data, or broader source support.
  3. **Mark as lean, not decided fact** -- the synthesis flags the conflict and states which direction the evidence leans, but does not resolve it as ground truth.
- Present contradictions with both positions and the lean rationale.

**Deduplication:**

- Merge duplicate findings that appear across multiple sources.
- Preserve unique insights that appear in only one source -- do not discard them.
- Attribute deduplicated items to all contributing sources.

---

### Step 6: Produce output

`[6/6] Producing output...`

**Artifact output (default):**

Write synthesis document with the following structure:

1. **Frontmatter:**

   ```yaml
   ---
   skill: synthesize
   schema: synthesis
   topic: '{descriptive topic derived from input artifacts}'
   model: { self-detected model identifier }
   generated_at: { today's date }
   source_count: { number of input artifacts }
   ---
   ```

2. **Document structure:**
   - **Executive Summary**: Unified overview of synthesized findings. Lead with the strongest conclusions (those with multi-source agreement).
   - **Synthesis Methodology**: How many artifacts were consumed, what schemas were represented, reconciliation approach used.
   - **Source Agreement**: Findings where multiple sources converge. Group by theme. Cite contributing sources.
   - **Contradictions**: Points of disagreement. For each: both positions, evidence for each, lean direction, and explicit note that the lean is not decided fact.
   - **Unique Insights**: Findings from individual sources not corroborated elsewhere. Attribute to source.
   - **Consolidated Recommendations**: Merged recommendations across all sources, deduplicated and prioritized.
   - **Provenance Table**: Tabular record of all input artifacts.

     | Source File | Skill   | Schema   | Model   | Generated At |
     | ----------- | ------- | -------- | ------- | ------------ |
     | {path}      | {skill} | {schema} | {model} | {date}       |

   - **Sources & References**: Any references cited by the input artifacts, consolidated.

3. **Model-tagged filename:** `{topic-slug}-synthesis-{model-id}.md` (e.g., `event-driven-architecture-synthesis-opus-4-6.md`)

4. **Output destination resolution:**

   If an explicit output path was provided in `$ARGUMENTS`, use it directly — no prompt.

   Otherwise, determine a default suggestion:
   - If all input artifacts came from the same directory, suggest that directory.
   - Otherwise, use OAT-aware detection:
     1. Check for `.oat/` at repo root (project-level OAT) → suggest `.oat/repo/analysis/`
     2. Check for `~/.oat/` (user-level OAT) → suggest `~/.oat/analysis/`
     3. Fall back to current directory

   Then ask the user via `AskUserQuestion` (Claude Code), structured user-input tooling (Codex), or equivalent:

   > "Where would you like to write the synthesis? (default: {suggested path})"
   - If the user confirms (empty response or "yes"), use the suggested path.
   - If the user provides a different path, use that instead.
   - Create the target directory if it does not exist.

**Inline output (`--inline` flag):**

Produce a condensed summary directly in the conversation:

- 2-3 paragraph executive summary
- Key agreements (bulleted)
- Key contradictions with leans (bulleted)
- Source count and provenance summary (one line)

Do not write a file when `--inline` is specified.

---

## Constraints

- **Read-only**: Does not modify input artifacts.
- **No sub-agent dispatch**: No execution tiers. All work is performed sequentially by the invoking agent.
- **No web search or fetch**: Synthesis operates only on existing local artifacts. Does not perform new research.
- **Lean, not decide**: Contradictions are flagged with a lean direction, never presented as resolved fact.

## Examples

### Basic Usage

```
/synthesize research-output/
```

### Explicit file paths

```
/synthesize event-driven-opus-4-6.md event-driven-analysis-sonnet-4.md
```

### Inline summary

```
/synthesize research-output/ --inline
```

### Conversational

```
Synthesize all the research artifacts in the research/ directory into a single report.
```

```
Merge the deep-research and analyze outputs I just generated.
```

## Troubleshooting

**No artifacts found in directory:**

- Verify the directory contains `.md` files with `skill` frontmatter.
- Files without artifact frontmatter are not auto-detected in directory mode.
- Try explicit file paths instead.

**Only one artifact found:**

- Ask the user to confirm they want to proceed. Synthesis of a single artifact produces limited value.
- Suggest running additional skills (/deep-research, /analyze, /compare) first.

**Mixed schemas produce generic output:**

- This is expected. When input artifacts use different schemas, the output uses a generic `synthesis` wrapper.
- For more structured output, synthesize homogeneous artifacts (same schema type).

**Contradictions cannot be resolved:**

- This is by design. The skill flags contradictions and leans but does not decide.
- The user should review contradictions and make final determinations.

## Success Criteria

- Banner printed at start
- Arguments parsed: directory or explicit file paths identified, `--inline` flag detected
- Artifacts discovered via frontmatter auto-detection (directory mode) or read directly (explicit mode)
- Input schemas classified and output schema selected (homogeneous vs. mixed)
- Findings, recommendations, and provenance extracted from each source
- Agreements identified across multiple sources
- Contradictions flagged with lean direction and marked as lean not fact
- Unique insights preserved and attributed
- Artifact written with synthesis schema, frontmatter contract, provenance table, and model-tagged filename (default mode)
- Output destination resolved via input-directory heuristic, OAT-aware detection, and user prompt (unless explicit path given)
- Inline summary produced when `--inline` is specified (no file written)
- Input artifacts not modified
