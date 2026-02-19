# Subagents Research Reference

Agent subagent ecosystem research and notes across providers.

*Last updated: February 2026*

---

## Status: Converging But Not Standardized

Unlike skills (which have the Agent Skills open standard at agentskills.io), subagents are a **converging concept without a formal cross-tool specification**. Multiple tools have independently adopted the pattern of Markdown files with YAML frontmatter in a `./<tool>/agents/` directory, but the frontmatter schemas differ between tools.

There is no equivalent of `npx skills` for cross-tool subagent distribution, no `agentskills.io` for subagents, and no formal validation library. This may change — the patterns are close enough that standardization seems likely.

---

## Core Concept

A subagent is a **specialized AI assistant** that a primary agent can delegate tasks to. Each subagent:

- Has a specific purpose and expertise area
- Uses its **own context window** separate from the main conversation (prevents context pollution)
- Can be configured with specific tool permissions
- Includes a custom system prompt that guides its behavior
- Returns results to the calling agent

Subagents are the agent equivalent of functions: they accept a task, execute independently, and return results. The calling agent orchestrates.

---

## Tool-Specific Implementations

### Claude Code

**Docs:** https://code.claude.com/docs/en/sub-agents
**SDK docs:** https://platform.claude.com/docs/en/agent-sdk/sub-agents

**Locations:**
- Project: `.claude/agents/<name>.md`
- Personal: `~/.claude/agents/<name>.md`
- Plugin: bundled in plugin `agents/` directory
- CLI: `--agents` flag (JSON, session-only)

**Priority:** Project > Plugin > User > CLI-defined

**File format:**
```markdown
---
name: agent-name                    # Required — unique identifier, lowercase + hyphens
description: When to use this agent # Required — natural language, drives auto-delegation
tools: Read, Grep, Glob, Bash      # Optional — comma-separated; inherits all if omitted
model: sonnet                       # Optional — alias (sonnet/opus/haiku) or 'inherit'
permissionMode: default             # Optional — default|acceptEdits|bypassPermissions|plan|ignore
skills: skill-1, skill-2           # Optional — auto-load skills into subagent context
---

System prompt body goes here. Multiple paragraphs.
Define role, approach, constraints.
```

**Key features:**
- **`skills` field:** Auto-loads named skills into the subagent's context. Powerful for composing skills + agents.
- **`permissionMode`:** Controls how the subagent handles permission requests. `acceptEdits` auto-approves file edits; `bypassPermissions` auto-approves everything; `plan` for read-only research.
- **`model` selection:** Can specify model alias or `inherit` from main conversation.
- **Resumable:** Subagents can be resumed across sessions via `agentId`. Useful for long-running research.
- **MCP tools:** Subagents can access MCP tools from configured servers when `tools` field is omitted.
- **No subagent nesting:** Subagents cannot spawn other subagents (prevents infinite nesting).

**Built-in subagents:**

| Name | Model | Tools | Purpose |
|------|-------|-------|---------|
| **General-purpose** | Sonnet | All | Complex multi-step tasks, code modifications |
| **Plan** | Sonnet | Read, Glob, Grep, Bash | Research-only; used in plan mode |
| **Explore** | Haiku | Read, Glob, Grep, limited Bash | Fast, lightweight, read-only codebase search |

**Delegation behavior:**
- **Automatic:** Claude delegates based on task description + subagent `description` field
- **Explicit:** User says "Use the X subagent to..."
- **Proactive tips:** Include "use PROACTIVELY" or "MUST BE USED" in description for more aggressive auto-delegation

**Management:**
- `/agents` command: Interactive create/edit/delete/view interface
- Direct file management: Create `.md` files in agents directory
- Files created manually load on next session start; `/agents` command loads immediately

### Cursor

**Docs:** https://cursor.com/docs/context/subagents

**Locations:**
- Project: `.cursor/agents/<name>.md`

**File format:**
```markdown
---
name: agent-name
description: When to use this agent
model: claude-3-sonnet-20240229    # Model specification
tools:
  - code_search
  - git_history
readonly: false                     # Prevent modifications
---

System prompt body.
```

**Key differences from Claude Code:**
- `model` takes full model identifiers, not aliases
- `tools` is a YAML list (not comma-separated string)
- `readonly` field (boolean) — not present in Claude Code
- No `skills` field — can't auto-load skills into subagent context
- No `permissionMode` field
- No resumable sessions
- Less documented overall; much of the community knowledge comes from experimentation

**Delegation behavior:**
- **Automatic:** Cursor Agent delegates based on task + subagent `description`
- **Explicit:** Use `/name` (for example `/oat-reviewer`) or mention the subagent naturally
- **Invocation model note:** Cursor docs describe explicit invocation via prompts, not a user-facing `subagent_type` parameter

**Cursor CLI subagents:**
Cursor CLI (`cursor-agent`) can spawn subagents in headless mode via shell commands:
```
cursor-agent -p [task] --output-format=text --force --model [model]
```
This enables fan-out/fan-in patterns with dynamic model selection. Community-discovered; not formally documented.

### Codex CLI (OpenAI)

**Locations and config:**
- Runtime role config (required): `~/.codex/config.toml` and/or project `.codex/config.toml`
- Role config files (required for per-role overrides): `.codex/agents/<role>.toml`

**Current model:**
- Enable multi-agent with `[features] multi_agent = true`
- Declare roles in `[agents.<name>]`
- Dispatch by role name using `agent_type`
- Use `config_file = "agents/<role>.toml"` when role-specific model/sandbox/instructions are needed

See:
- https://developers.openai.com/codex/multi-agent
- https://developers.openai.com/codex/local-config

### Cross-Tool MCP Bridge (Community)

**Repo:** https://github.com/shinpr/sub-agents-mcp

An MCP server that makes subagent workflows portable across tools. Defines agents in Markdown, executes them via whichever CLI is available (cursor-agent, claude, gemini, codex).

**Key characteristics:**
- Fresh context per subagent invocation (no carryover state)
- Configurable execution engine (Cursor CLI, Claude Code, Gemini CLI, Codex)
- Timeout and permission management
- Works with any MCP-compatible tool (Claude Desktop, Cursor, Windsurf, etc.)

---

## Subagent Architecture Patterns

### Sequential Orchestration

Tasks that require ordered steps where each step depends on the previous:

```
Primary Agent
  → repo-scanner (discovery)
  → command-validator (test discovered commands)
  → generate AGENTS.md (using results from both)
```

Each subagent completes before the next begins. Results from earlier subagents feed into later ones.

### Parallel Orchestration

Independent tasks that can run simultaneously:

```
Primary Agent (Audit)
  ├→ command-validator (test all commands)
  ├→ convention-drift-detector (compare docs vs. code)
  └→ structural-consistency-checker (evaluate quality)
  → Combine results into audit report
```

Parallel execution reduces wall-clock time significantly. Claude Code supports this natively.

### Fan-Out / Fan-In

One primary task decomposed into many parallel subtasks, results aggregated:

```
Primary Agent
  → Spawn N subagents (one per file/module/concern)
  → Each returns findings independently
  → Primary agent synthesizes
```

Used for large-scale code review, codebase analysis, multi-file refactors.

### Chained Subagents

Multiple specialized subagents invoked sequentially by the user or primary agent:

```
User: "First use code-analyzer to find issues, then use optimizer to fix them"
  → code-analyzer subagent → returns findings
  → optimizer subagent → receives findings, applies fixes
```

### Builder / Validator Pattern

Two subagents with complementary roles:

```
Builder subagent → implements feature
Validator subagent → reviews/tests the implementation
→ If validation fails, builder receives feedback and iterates
```

---

## Design Best Practices

### From Claude Code Documentation

1. **Start with Claude-generated agents** — use `/agents` to generate initial subagent, then customize
2. **Design focused subagents** — single, clear responsibility; don't make one agent do everything
3. **Write detailed prompts** — specific instructions, examples, constraints in system prompt
4. **Limit tool access** — only grant tools necessary for the subagent's purpose
5. **Version control** — check project subagents into git for team sharing
6. **Use `skills` field** — auto-load relevant skills rather than duplicating instructions

### From Community Experience

1. **Model selection matters** — use faster/cheaper models (Haiku) for read-only exploration, capable models (Sonnet/Opus) for complex reasoning
2. **Keep system prompts focused** — verbose prompts aren't always better; clear constraints outperform long instructions
3. **Test in isolation** — verify subagent behavior independently before integrating into workflows
4. **Handle failure gracefully** — subagents can fail; primary agent should have fallback behavior
5. **Context pollution is real** — the whole point of subagents is context isolation; don't undermine it by passing enormous inputs

---

## Example: AGENTS.md Management Subagents

A concrete example of a four-subagent architecture for AGENTS.md management:

| Subagent | Purpose | Used By | Model |
|----------|---------|---------|-------|
| `repo-scanner` | Deep repository discovery | Generate, Analyze, Audit | Sonnet |
| `command-validator` | Execute and verify commands | All four skills | Sonnet |
| `convention-drift-detector` | Compare docs vs. code | Analyze, Audit | Sonnet |
| `structural-consistency-checker` | Evaluate AGENTS.md quality | Audit | Sonnet |

**Key design decisions:**
- `repo-scanner` is reusable across 3 of 4 skills (amortizes discovery cost)
- Audit runs 3 subagents in parallel (command-validator + drift-detector + consistency-checker)
- `command-validator` is isolated because command execution can fail/hang
- All subagents reference `.agents/docs/` for shared quality criteria

**Placement:** `.<tool>/agents/` (native per-tool location, e.g., `.claude/agents/`)

---

## Open Questions & Areas to Research

- [ ] Will a formal subagent specification emerge (like agentskills.io for skills)?
- [ ] How do subagent `skills` fields interact with the skill's `allowed-tools` restrictions?
- [ ] What's the practical limit on concurrent subagents in Claude Code?
- [ ] Can Claude Code resumable subagents be leveraged for multi-session audit workflows?
- [ ] How does Cursor's `readonly` field compare to Claude Code's `permissionMode: plan`?
- [ ] Will `npx skills` or a similar tool eventually support subagent distribution?
- [ ] How should subagent definitions be maintained when they need to work across multiple tools with different frontmatter schemas?
- [ ] Is there a pattern for subagent testing/validation (equivalent to skills-ref for skills)?
- [ ] How do hooks interact with subagent execution? (SubagentStop hook exists in Claude Code)
