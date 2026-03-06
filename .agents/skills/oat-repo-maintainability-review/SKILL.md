---
name: oat-repo-maintainability-review
version: 1.2.0
description: Use when you need a structured maintainability analysis for a repository or directory target with actionable findings.
argument-hint: "[--scope repo|directory] [--target <path>] [--mode auto|tracked|local|inline] [--output <path>] [--focus <areas>] [--analysis-mode full] [--fan-out]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Repo Maintainability Review

Analyze repository maintainability and developer experience using a deterministic rubric and output contract.

## Prerequisites

- Active git repository with readable source files.
- Scope resolved as `repo` or `directory`.
- When using `directory`, target path must be inside repository root.

## Mode Assertion

**OAT MODE: Repo Maintainability Review**

**Purpose:** Produce evidence-backed maintainability findings and a prioritized execution plan.

**BLOCKED Activities:**
- No code modification tasks.
- No issue/ticket automation.

**ALLOWED Activities:**
- Repository evidence collection.
- Structured scoring and synthesis.
- Artifact generation in tracked/local/inline modes.

## Progress Indicators (User-Facing)

- Print a phase banner once at start:
  - `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  - ` OAT ▸ REPO MAINTAINABILITY REVIEW`
  - `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
- Print step indicators before major work:
  - `[1/5] Resolving scope, arguments, and output policy...`
  - `[2/5] Collecting repository evidence...`
  - `[3/5] Running dimension analysis (single-agent or multi-agent)...`
  - `[4/5] Synthesizing findings and scoring...`
  - `[5/5] Rendering artifact and summary...`
- For long-running fan-out or large scans, print start + completion lines.
- Print a resolved run-options summary before evidence collection begins.

## Process

1. Resolve invocation args and validate scope/target.
2. Resolve missing/ambiguous required args using provider-aware clarification.
3. Resolve output policy.
4. Gather evidence across required dimensions.
5. Synthesize findings into prioritized recommendations.
6. Render artifact or return inline output.

### Output Policy Resolution

Use the helper script to resolve destination policy:

```bash
bash .agents/skills/oat-repo-maintainability-review/scripts/resolve-analysis-output.sh --mode auto
```

Rules:
- `--output` takes precedence over mode-derived destination.
- `inline` emits no file artifact.
- Tracked naming contract: `.oat/repo/analysis/<YYYY-MM-DD>-repo-review-analysis.md`.
- If the same-day filename already exists, append `-2`, `-3`, etc.

### Required Analysis Dimensions

Every run must cover all required dimensions:

- `Architecture` - module boundaries, coupling, and system organization.
- `Conventions` - coding patterns, consistency, and repository standards.
- `Documentation` - onboarding quality, runbooks, and operational docs.
- `DX` - developer workflows, tooling friction, and feedback loops.
- `Testing` - test strategy depth, reliability signals, and failure clarity.
- `Maintainability` - ownership clarity, change safety, and delivery risk.

### Evidence and Confidence Rules

- Every finding must include at least one concrete evidence bullet.
- Evidence should reference specific files, commands, or repository structures.
- Confidence must align with evidence depth:
  - `High` when multiple strong signals agree.
  - `Medium` when evidence is sufficient but incomplete.
  - `Low` when evidence is directional and requires validation.
- If no issue is found for a dimension, provide a concise "no critical issues observed" note with supporting context.

### Synthesis and Dedupe Rules

- Dedupe overlap key:
  - same `category`
  - same normalized path token (file path, package, or module)
  - semantically equivalent finding title
- Concern precedence during merge:
  - `Critical > High > Medium > Low`
  - merged finding keeps the strongest Concern
- Material disagreement threshold:
  - Concern differs by 2+ levels, or
  - Value differs by 2+ levels
- When material disagreement is detected, add a `merge note` evidence bullet explaining the reconciliation decision.

### Prioritization Output Requirements

- Split findings into:
  - `Quick Wins (XS/S)`
  - `Strategic Initiatives (M/L/XL)`
- Build an execution sequence using `Now / Next / Later`.
- Ensure prioritization appears in both artifact sections and final summary guidance.

### Automatic Delegation (When Supported)

- If runtime supports subagents or multi-agent execution, delegate automatically.
- Delegation is orchestrator-selected behavior, not a user-selected execution mode.
- Do not require a custom subagent role; use generic spawned workers with explicit prompts.
- Spawn one worker per analysis track:
  - `Architecture`
  - `Conventions`
  - `Documentation`
  - `DX`
  - `Testing`
  - `Maintainability`
- Worker prompt must include:
  - scope and target path
  - required finding schema
  - evidence and confidence requirements
- Wait for all workers to complete, then synthesize using dedupe/merge rules.
- Summarize one result block per analysis track before final merged summary.
- Enforce schema parity between delegated outputs and single-agent baseline outputs.
- If delegation is unavailable, run the same tracks sequentially without behavior loss.

Provider notes:
- Claude Code: use Task/subagent dispatch when available.
- Codex: spawn a worker per track (generic multi-agent worker), wait for all, then merge.
- Cursor: invoke available subagent capability (`/name` or natural mention) per track when supported.

### Required-Argument Clarification

- Required arguments must be resolved before analysis starts.
- Clarification channel priority:
  1. Use `AskUserQuestion` when running in Claude with tool availability.
  2. Use Codex structured user-input tooling when available in the current Codex host/runtime.
  3. Fall back to direct plain-language prompts when structured tools are unavailable.
- Clarification remains blocking in all modes: do not continue until answers are explicit.
- After clarification, print run options:
  - `scope`
  - `target`
  - `mode`
  - `analysis-mode`
  - delegation state (`multi-agent` or `single-agent`)
  - `focus` selection (or `none`)
- Clarification channel details are for internal logging only; do not expose channel identifiers in the end-user summary.

### Invalid Target Handling

- If target path is invalid, stop execution and return actionable guidance.
- Invalid target conditions:
  - target does not exist
  - target resolves outside the repository root
  - target type is incompatible with requested scope
- Error output must include:
  - resolved target path
  - why it is invalid
  - valid target examples
- Do not continue analysis until a corrected target is provided.

### Completion Summary Contract

Final user-facing summary must include:

- Findings by Concern
  - `Critical`
  - `High`
  - `Medium`
  - `Low`
- Findings by Value
  - `High`
  - `Medium`
  - `Low`
- Artifact path (`inline-only` when no file is emitted)
- Execution mode (`single-agent` or `multi-agent`)

## Success Criteria

- Output includes required sections and metadata.
- Findings include scoring fields and evidence.
- Result includes now/next/later execution guidance.
- Required arguments are explicitly resolved before analysis execution.
