# Agent Skills Brainstorming: /skeptic, /compare, /deep-research

> Session date: 2026-03-13
> Status: Brainstorming complete for /skeptic (SKILL.md written). /compare and /deep-research outlined, not yet specced.

---

## Overview

Three new OAT-compatible agent skills designed as a research and verification suite:

| Skill                       | Slash command    | Output             | Status           |
| --------------------------- | ---------------- | ------------------ | ---------------- |
| Adversarial claim evaluator | `/skeptic`       | Inline             | SKILL.md written |
| Comparative analysis        | `/compare`       | Inline or artifact | Outlined         |
| Deep research orchestrator  | `/deep-research` | Artifact (always)  | Outlined         |

These skills form a layered system: `/skeptic` is self-contained, `/compare` is standalone but also invokable as a sub-agent from `/deep-research`, and `/deep-research` is the orchestrator that may dispatch both.

---

## Skill 1: /skeptic

### Purpose

Invoked when the user questions or suspects an agent claim is wrong. Runs adversarial evidence gathering and returns an inline verdict with a confidence score.

### Key design decisions

**Adversarial by default.** When invoked, the evaluator's primary job is to disprove the claim first. Supporting evidence is only noted after exhausting contradicting evidence. This matches the user's intent — they're already skeptical, so the default posture should be adversarial.

**Context-aware evidence sourcing.** The skill must scan the environment before choosing evidence sources. "Going external" doesn't always mean web search — it means finding the best available evidence for the claim type in the current environment:

- In Claude Code with a repo: local files, tests, lockfiles, git history
- Library/version claims: `package.json`, lockfile, installed module source, docs MCP
- Documentation/API claims: docs MCP first, then web search
- Factual/conceptual claims: web search
- Architectural claims: web search + reasoning

**Skeptical Evaluator sub-agent.** The orchestrator prepares a context package (claim, basis, claim type, available sources) and dispatches a dedicated sub-agent whose only job is adversarial thinking. This separation ensures the evaluator isn't anchored by the original reasoning that produced the claim. When sub-agents are unavailable, the orchestrator self-evaluates with identical logic and output format.

**Four verdict frames (inline only):**

- ✅ **Holds up** — adversarial review complete, still accurate
- ❌ **You were right to be skeptical** — evidence contradicts the claim
- ⚠️ **Nuanced** — partially correct, context-dependent
- ❓ **Genuinely inconclusive** — evidence insufficient for a clear verdict

Always attempt a clear lean. Only use "inconclusive" when evidence is genuinely ambiguous after thorough search.

### Claim types

- `code_behavior`
- `library_specific`
- `documentation`
- `factual`
- `architectural`

### Sub-agent tier detection

```
[3/5] Checking sub-agent availability…
  → skeptical-evaluator: {available | not resolved} ({reason})
  → Selected: Tier {1|2|3} — {Sub-agent | Self-evaluation (recommended) | Inline evaluation}
```

- **Tier 1**: Sub-agent dispatch available (Claude Code `Task` tool, Cursor `/skeptical-evaluator`, Codex multi-agent with `[features] multi_agent = true`)
- **Tier 2**: Self-evaluation fallback (recommended when Tier 1 unavailable)
- **Tier 3**: User explicitly requests inline or confirms fresh session

### Cross-provider patterns

**Asking questions:**

- Claude Code: `AskUserQuestion`
- Codex: structured user-input tooling when available in the current host/runtime
- Fallback: plain text

**Sub-agent spawning:**

- Claude Code: `Task` tool, resolved from `.claude/agents/skeptical-evaluator.md`
- Cursor: `/skeptical-evaluator` or natural mention, resolved from `.cursor/agents/skeptical-evaluator.md` (or `.claude/agents/` as compatibility path)
- Codex multi-agent: verify `[features] multi_agent = true`, optional role pinning via built-in roles (`default`/`worker`/`explorer`) or custom roles under `[agents.<n>]`; Codex may also auto-spawn without explicit pinning

### Step logging convention

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/skeptic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/5] Identifying claim…
[2/5] Scanning environment…
[3/5] Checking sub-agent availability…
[4/5] Gathering evidence…
[5/5] Synthesizing verdict…
```

For long-running ops:

```
  → Searching codebase for contradicting evidence…
  → Complete. (Contradicting: N · Supporting: N)
```

### Output target

- Always inline. Never produces a file or artifact.

### SKILL.md

Written and saved to `~/Downloads/skeptic-SKILL.md`. Ready to place in `.agents/skills/skeptic/SKILL.md` or equivalent.

---

## Skill 2: /compare

### Purpose

Standalone comparative analysis skill. Can be invoked directly by the user or as a sub-agent dispatched by `/deep-research` when competing options emerge during research.

### Key design decisions

**Domain-aware evaluation dimensions.** Comparison criteria are domain-dependent. The skill must classify the domain upfront to determine what dimensions to evaluate:

- npm packages → bundle size, API ergonomics, maintenance, TypeScript support, performance
- architectural approaches → tradeoffs, constraints, operational complexity, team fit
- business strategies → cost, risk, reach, timing
- tools/apps → feature set, pricing, integration, UX

**Output modes:**

- **Inline** (default): condensed summary with a clear recommendation
- **Artifact** (optional): full breakdown using the `comparative` extended schema. Triggered by `--save` flag or detected complexity. Reuses the same `comparative` schema used by `/deep-research`.

**Shared schema with /deep-research.** When `/compare` is invoked as a sub-agent from `/deep-research`, its output should use the same `comparative` extended schema so the parent can embed it cleanly in the research artifact.

### Rough workflow

1. Parse items to compare and any user-specified dimensions from `$ARGUMENTS`
2. Classify domain → determine evaluation dimensions
3. Research each option against those dimensions (using available environment sources)
4. Score/weigh if applicable
5. Produce recommendation with rationale
6. Output inline summary or write artifact

### Open questions

- Should scoring be explicit (numeric) or qualitative? Leaning toward qualitative with a clear winner declaration unless the user requests a matrix.
- Should `/compare` support more than 2 options? Yes — N-way comparisons should work, with a ranked recommendation.
- Flag convention: `--save` to write artifact? Or detect automatically based on number of options × dimensions?

---

## Skill 3: /deep-research

### Purpose

Orchestrator skill for comprehensive research on a topic, problem space, or idea. Dispatches parallel sub-agents, conditionally invokes `/compare`, aggregates findings, cites sources, and produces a structured research artifact.

### Key design decisions

**Always produces an artifact.** Deep research should be extensive — it should never be inline-only. The artifact is the deliverable.

**Output target resolution (priority order):**

1. Obsidian vault (if configured via MCP)
2. Target path specified in arguments (e.g. `docs/research/` when running from within a repo in Claude Code)
3. Default artifact/download otherwise

**Schema hierarchy.** Research artifacts follow a base template extended by domain-specific schemas:

```
base (all research)
├── executive summary
├── sources / references
└── methodology notes

extended schemas:
├── technical      → packages/libraries, repo analysis, code examples
├── comparative    → comparison tables, scoring, recommendation (shared with /compare)
├── conceptual     → narrative, key themes, mental models
└── architectural  → tradeoffs, constraints, decision framework
```

The classification step at the start of deep research determines which extended schema applies, which shapes what sub-agents get dispatched, what dimensions get researched, and what the artifact looks like.

**Parallel sub-agent dispatch.** Multiple sub-agents research different angles simultaneously. Sub-agent selection is dynamic based on topic classification.

**Conditional /compare invocation.** When competing options naturally emerge during research (e.g. "which library should we use for X"), `/deep-research` invokes `/compare` as a sub-agent rather than doing comparison inline. This keeps concerns separated and reuses the `comparative` schema cleanly.

**Repo cloning for technical research.** When researching open-source libraries, the skill may clone repos locally for exploration rather than repeatedly fetching from GitHub (more token-efficient, better for code search). Cloned repos are deleted after research is complete.

**Separate `/compare` skill.** `/compare` is a standalone skill that can also be called by `/deep-research`. This means users who already know what they want to compare don't need to go through the full deep research flow.

### Rough workflow

1. Classify topic → select extended schema
2. Determine research shape (what sub-agents to spin up)
3. Dispatch parallel sub-agents by research angle
4. Conditionally invoke `/compare` if competing options emerge
5. For technical research: optionally clone repos, explore codebase, delete after
6. Aggregate + synthesize findings
7. Cite sources, clean up artifacts (cloned repos, temp files)
8. Resolve output target (Obsidian → path → artifact)
9. Write structured artifact using base + extended schema

### Step logging (sketch)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/deep-research
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/6] Classifying topic + selecting schema…
[2/6] Planning research angles…
[3/6] Checking sub-agent availability…
[4/6] Dispatching parallel sub-agents…
[5/6] Aggregating findings…
[6/6] Writing research artifact…
```

### Open questions

- What's the right stopping condition for "deep enough"? Probably interactive — the skill should classify upfront and give the user a sense of scope, then proceed. Could also support a `--depth` flag (surface / standard / exhaustive).
- For repo cloning: should this be opt-in or default for technical research? Leaning toward opt-in or auto-triggered only when a library has no good docs MCP coverage.
- Should the skill support a `--focus` argument to narrow research to a specific angle (e.g. `--focus security` or `--focus performance`)?

---

## Shared Conventions (All Three Skills)

### Step logging format

- Phase banner with `━━━` separators at start
- `[N/N] Step description…` indicators printed upfront before work begins
- `  → Start of long operation…` / `  → Complete.` for anything that takes time
- Don't print a line for every shell command — keep it signal, not noise

### Cross-provider question asking

- **Claude Code**: `AskUserQuestion`
- **Codex**: structured user-input tooling when available in the current host/runtime
- **Fallback**: ask in plain text

### Cross-provider sub-agent spawning

- **Claude Code**: `Task` tool
- **Cursor**: explicit invocation via `/skill-name` or natural mention
- **Codex multi-agent**: `[features] multi_agent = true` in config; built-in roles or custom `[agents.<n>]` declarations; auto-spawn also supported
- **Unavailable**: graceful degradation to self-evaluation / inline execution

### Frontmatter fields used

```yaml
name: skill-name
version: 1.0.0
description: Use when [trigger]. [What it does].
argument-hint: '[args]'
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, mcp__*
```

### Skill file locations

```
.agents/skills/skeptic/SKILL.md
.agents/skills/compare/SKILL.md
.agents/skills/deep-research/SKILL.md
```

Sub-agent definition files (if using Tier 1 dispatch):

```
.claude/agents/skeptical-evaluator.md
.claude/agents/deep-research-agent.md
```

---

## Research Output Schemas (to be fully specced)

### Base template (all research)

```markdown
# [Title]

## Executive Summary

[2-4 sentence TL;DR of findings and recommendation if applicable]

## Research Methodology

[What was researched, what sources were used, what was out of scope]

## Findings

[Main body — structure varies by extended schema]

## Sources & References

[Cited links, files, package versions, doc URLs]

## Appendix

[Raw notes, repo analysis output, supplementary data]
```

### Extended: technical

Adds to base:

- Packages / libraries evaluated
- Repo analysis (if cloned)
- Code examples
- Integration considerations

### Extended: comparative

Adds to base (also used by `/compare` in artifact mode):

- Comparison matrix / table
- Evaluation dimensions and rationale
- Scoring / weighting (qualitative or numeric)
- Clear recommendation with rationale
- Runner-up notes

### Extended: conceptual

Adds to base:

- Key themes and ideas
- Mental models
- Notable quotes / references
- Open questions surfaced

### Extended: architectural

Adds to base:

- Tradeoffs analysis
- Constraints and requirements considered
- Decision framework
- Risk considerations
- Recommended approach with rationale

---

## Next Steps

- [ ] Write `/compare` SKILL.md (resolve open questions on scoring, N-way comparisons, auto-artifact detection)
- [ ] Write `/deep-research` SKILL.md (resolve open questions on depth control, repo cloning opt-in, focus flags)
- [ ] Define `comparative` extended schema fully (used by both `/compare` and `/deep-research`)
- [ ] Define base template schema fully
- [ ] Write sub-agent definition files (`skeptical-evaluator.md`, etc.)
- [ ] Decide canonical install location in OAT skill structure
- [ ] Consider whether `/skeptic` should be a global skill (installed at `~/.claude/skills/`) vs repo-local
