---
skill: deep-research
schema: architectural
topic: 'Provider-Agnostic Hooks for Open Agent Toolkit'
model: opus-4-6
generated_at: 2026-04-05
depth: exhaustive
focus: provider-agnostic hook abstraction & OAT integration
context: .agents/docs
---

# Provider-Agnostic Hooks — Cross-Provider Deep Dive & OAT Integration Design

> Research synthesis compiled 2026-04-05 from official provider documentation.
> For provider-specific links, see [provider-reference.md](../../../../.agents/docs/provider-reference.md).

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Methodology](#methodology)
3. [Claude Code Hooks Reference](#3-claude-code-hooks-reference)
4. [Codex Hooks Reference](#4-codex-hooks-reference)
5. [Cross-Provider Comparison](#5-cross-provider-comparison)
6. [Canonical Hook Format Design](#6-canonical-hook-format-design)
7. [OAT Integration Architecture](#7-oat-integration-architecture)
8. [OAT Workflow Enhancement Opportunities](#8-oat-workflow-enhancement-opportunities)
9. [Migration Path: Existing Claude Code Hooks](#9-migration-path-existing-claude-code-hooks)
10. [Create-Agnostic-Hook Skill Design](#10-create-agnostic-hook-skill-design)
11. [Risk Considerations](#11-risk-considerations)
12. [Recommendation](#12-recommendation)
13. [Sources & References](#13-sources--references)

---

## Executive Summary

Hooks are lifecycle event handlers that let users inject custom logic into AI coding agent workflows. Claude Code ships a mature hooks system (27 events, 4 handler types, production-ready). Codex has launched an experimental hooks system (5 official events, command handlers only, feature-flag-gated) that is rapidly converging toward Claude Code's model.

The two systems share a common core: JSON-in/JSON-out command hooks, the same exit code semantics (0=success, 2=block), regex matchers for event filtering, and concurrent execution of matching hooks. They diverge on scope (Claude has 5x more events), handler types (Claude adds HTTP, prompt, and agent handlers), tool coverage (Codex is Bash-only), and configuration location (settings.json vs hooks.json).

This research proposes treating hooks as a new OAT content type alongside skills, agents, and rules. Canonical hook definitions would live in `.agents/hooks/` as markdown files with YAML frontmatter (consistent with OAT's markdown-first approach), and provider-specific adapters would transform them to each provider's native configuration format during `oat sync`. A companion skill (`create-agnostic-hook`) would scaffold new hooks following this pattern, similar to `create-agnostic-skill`.

Beyond provider abstraction, hooks present opportunities to improve OAT's own workflows: drift detection on file change, auto-sync after tool operations, session context injection, and project lifecycle gates.

---

## Methodology

**Sources consulted:**

- Official Claude Code hooks documentation (code.claude.com/docs/en/hooks, hooks-guide)
- Official Codex hooks documentation (developers.openai.com/codex/hooks)
- Codex generated JSON schemas (github.com/openai/codex codex-rs/hooks/schema/)
- Codex config reference and advanced config docs
- Extended Codex hooks documentation (community fork)
- OAT codebase: provider adapter pattern, sync engine, CLI structure
- OAT reference architecture and existing cross-provider guides

**Angles explored:**

1. Claude Code hooks deep dive (complete API)
2. Codex hooks deep dive (complete API)
3. OAT codebase architecture (sync, adapters, where hooks fit)
4. Cross-provider comparative analysis
5. Canonical format design
6. OAT workflow enhancement opportunities

**Limitations:**

- Codex hooks are experimental and changing rapidly; the extended event set from community forks may not reflect the official roadmap
- Cursor, Copilot, and Gemini CLI do not currently have hooks systems; this analysis focuses on Claude Code and Codex
- Hook behavior in headless/CI modes may differ from interactive use

---

## 3. Claude Code Hooks Reference

### 3.1 Overview

Claude Code hooks are a production-ready extensibility system configured in `settings.json` at user, project, or managed policy scope. They intercept 27 lifecycle events across session, input, tool execution, agent, context, file, workspace, and MCP categories.

**Configuration location:** `settings.json` (user: `~/.claude/settings.json`, project: `.claude/settings.json`, local: `.claude/settings.local.json`, managed policy, plugins, skill/agent frontmatter)

**Enable/disable:** Enabled by default. `"disableAllHooks": true` disables all except managed policy hooks.

### 3.2 Event Types (27 Total)

#### Session Lifecycle

| Event                  | Trigger                                   | Blockable | Matcher                                                                                  |
| ---------------------- | ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| **SessionStart**       | Session begins, resumes, clears, compacts | No        | `startup`, `resume`, `clear`, `compact`                                                  |
| **SessionEnd**         | Session terminates                        | No        | `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other` |
| **InstructionsLoaded** | CLAUDE.md or rule loaded into context     | No        | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`             |

#### User Input

| Event                | Trigger                            | Blockable    | Matcher |
| -------------------- | ---------------------------------- | ------------ | ------- |
| **UserPromptSubmit** | Before Claude processes user input | Yes (exit 2) | None    |

#### Tool Execution

| Event                  | Trigger                          | Blockable               | Matcher         |
| ---------------------- | -------------------------------- | ----------------------- | --------------- |
| **PreToolUse**         | Before tool call executes        | Yes                     | Tool name regex |
| **PermissionRequest**  | Permission dialog appears        | Yes                     | Tool name regex |
| **PermissionDenied**   | Auto-mode classifier denies call | No (can signal retry)   | Tool name regex |
| **PostToolUse**        | After successful tool execution  | No (can inject context) | Tool name regex |
| **PostToolUseFailure** | After tool execution fails       | No                      | Tool name regex |

#### Agent Operations

| Event             | Trigger                     | Blockable | Matcher    |
| ----------------- | --------------------------- | --------- | ---------- |
| **SubagentStart** | Subagent spawns             | No        | Agent type |
| **SubagentStop**  | Subagent finishes           | Yes       | Agent type |
| **TaskCreated**   | Task created via TaskCreate | Yes       | None       |
| **TaskCompleted** | Task marked complete        | Yes       | None       |
| **TeammateIdle**  | Teammate about to go idle   | Yes       | None       |

#### Execution Control

| Event            | Trigger                    | Blockable                 | Matcher           |
| ---------------- | -------------------------- | ------------------------- | ----------------- |
| **Stop**         | Claude finishes responding | Yes (forces continuation) | None              |
| **StopFailure**  | Turn ends due to API error | No                        | Error type        |
| **Notification** | Notification sent          | No                        | Notification type |

#### File and Configuration

| Event            | Trigger                      | Blockable | Matcher           |
| ---------------- | ---------------------------- | --------- | ----------------- |
| **ConfigChange** | Config file changes          | Yes       | Config source     |
| **CwdChanged**   | Working directory changes    | No        | None              |
| **FileChanged**  | Watched file changes on disk | No        | Filename basename |

#### Workspace

| Event              | Trigger           | Blockable | Matcher |
| ------------------ | ----------------- | --------- | ------- |
| **WorktreeCreate** | Worktree creation | Yes       | None    |
| **WorktreeRemove** | Worktree removal  | No        | None    |

#### Context Management

| Event           | Trigger                   | Blockable | Matcher          |
| --------------- | ------------------------- | --------- | ---------------- |
| **PreCompact**  | Before context compaction | No        | `manual`, `auto` |
| **PostCompact** | After context compaction  | No        | `manual`, `auto` |

#### MCP Integration

| Event                 | Trigger                          | Blockable | Matcher         |
| --------------------- | -------------------------------- | --------- | --------------- |
| **Elicitation**       | MCP server requests user input   | Yes       | MCP server name |
| **ElicitationResult** | User responds to MCP elicitation | Yes       | MCP server name |

### 3.3 Handler Types (4)

| Type        | Mechanism                                         | Default Timeout | Key Fields                                |
| ----------- | ------------------------------------------------- | --------------- | ----------------------------------------- |
| **command** | Shell script; JSON stdin, exit codes, JSON stdout | 600s            | `command`, `async`, `shell`               |
| **http**    | POST to endpoint; JSON body, JSON response        | 30s             | `url`, `headers`, `allowedEnvVars`        |
| **prompt**  | Single-turn LLM yes/no evaluation                 | 30s             | `prompt` (supports `$ARGUMENTS`), `model` |
| **agent**   | Spawns subagent with tool access for verification | 60s             | `prompt` (supports `$ARGUMENTS`), `model` |

### 3.4 Configuration Schema

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex>",
        "hooks": [
          {
            "type": "command",
            "command": "script.sh",
            "timeout": 600,
            "async": false,
            "shell": "bash",
            "if": "Bash(git *)",
            "statusMessage": "Running...",
            "once": false
          }
        ]
      }
    ]
  }
}
```

### 3.5 Data Flow

**Input (all hooks):** `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name` + event-specific fields (`tool_name`, `tool_input`, `tool_response`, etc.)

**Environment variables:** `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_ENV_FILE`, `CLAUDE_CODE_REMOTE`

**Exit codes:** 0=success, 2=block (on blockable events), other=non-blocking error

**JSON output fields:** `continue`, `stopReason`, `suppressOutput`, `systemMessage`, `additionalContext` (max 10,000 chars), `decision`, `reason`, `hookSpecificOutput` (event-specific: `permissionDecision`, `updatedInput`, `updatedMCPToolOutput`, etc.)

**Permission integration:** PreToolUse hooks fire before permission checks. Hooks can tighten restrictions (`deny`) but cannot loosen them past what permission rules allow.

### 3.6 Execution Model

- All matching hooks run **in parallel**
- Identical handlers automatically **deduplicated**
- Conflicting decisions: **most restrictive wins** (deny > defer > ask > allow)
- Multiple `updatedInput` returns: **last to finish wins** (non-deterministic)

---

## 4. Codex Hooks Reference

### 4.1 Overview

Codex hooks are an **experimental** extensibility framework, off by default, disabled on Windows. The core runtime is implemented in Rust. The official release includes 5 events with command handlers only; a community-maintained extended version adds ~12 more events and prompt/agent handler types.

**Configuration location:** `hooks.json` (user: `~/.codex/hooks.json`, project: `<repo>/.codex/hooks.json`)

**Enable:** Feature flag required — `codex_hooks = true` in `[features]` or `codex --enable codex_hooks`

### 4.2 Event Types

#### Official (5 events)

| Event                | Trigger                              | Blockable                      | Matcher                                 |
| -------------------- | ------------------------------------ | ------------------------------ | --------------------------------------- |
| **SessionStart**     | Session initialization or resumption | No (can set `continue: false`) | `source` (`startup`, `resume`, `clear`) |
| **PreToolUse**       | Before tool execution                | Yes                            | `tool_name` (currently `Bash` only)     |
| **PostToolUse**      | After tool execution                 | Yes (cannot undo)              | `tool_name` (currently `Bash` only)     |
| **UserPromptSubmit** | Before prompt submitted to model     | Yes                            | None                                    |
| **Stop**             | Codex halts, awaits user direction   | Yes (block = auto-continue)    | None                                    |

#### Extended (community fork, ~12 additional events)

| Event                  | Blockable | Matcher             |
| ---------------------- | --------- | ------------------- |
| **SessionEnd**         | No        | `reason`            |
| **PermissionRequest**  | Yes       | `tool_name`         |
| **PostToolUseFailure** | No        | `tool_name`         |
| **SubagentStart**      | No        | `agent_type`        |
| **SubagentStop**       | Yes       | `agent_type`        |
| **Notification**       | No        | `notification_type` |
| **TeammateIdle**       | Yes       | N/A                 |
| **TaskCompleted**      | Yes       | N/A                 |
| **ConfigChange**       | Yes       | `source`            |
| **PreCompact**         | No        | `trigger`           |
| **WorktreeCreate**     | Special   | N/A                 |
| **WorktreeRemove**     | No        | N/A                 |

### 4.3 Handler Types

| Type        | Status        | Mechanism                                             |
| ----------- | ------------- | ----------------------------------------------------- |
| **command** | Official      | Shell script; JSON stdin, exit codes, JSON stdout     |
| **prompt**  | Extended only | Single-turn LLM evaluation; `$ARGUMENTS` substitution |
| **agent**   | Extended only | Subagent verification with tool access                |

### 4.4 Configuration Schema

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex>",
        "hooks": [
          {
            "type": "command",
            "command": "path/to/script",
            "statusMessage": "Running...",
            "timeout": 600,
            "async": false,
            "once": false
          }
        ]
      }
    ]
  }
}
```

**Alternative (config.toml):**

```toml
[[hooks.pre_tool_use]]
name = "guard-shell"
command = ["python3", "/path/to/hook.py"]
timeout = 5

[hooks.pre_tool_use.matcher]
matcher = "shell"
```

### 4.5 Data Flow

**Input (all hooks):** `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`, `permission_mode` + event-specific fields

**Exit codes:** Same as Claude Code: 0=success, 2=block, other=non-blocking error

**JSON output fields:** `continue`, `stopReason`, `systemMessage`, `suppressOutput` (parsed but not implemented), `decision`, `reason`, `hookSpecificOutput` (event-specific)

**Output aliases:** Codex accepts both camelCase and snake_case (`system_message` = `systemMessage`, `additional_context` = `additionalContext`, etc.)

**Decision aliases:** `approve`/`continue` map to allow; `block`/`abort` map to deny (case-insensitive)

### 4.6 Execution Model

- Multiple matching hooks run **concurrently**
- Automatic deduplication of identical handlers (extended)
- All layers execute additively (user + project hooks both fire)

### 4.7 Key Limitations

1. **Tool hooks are Bash-only** — PreToolUse/PostToolUse only fire for Bash tool calls
2. **Experimental and off by default** — requires feature flag
3. **Windows disabled** — hooks do not function on Windows
4. **Circumventable** — model can work around PreToolUse blocks by writing scripts to disk first
5. **`suppressOutput` parsed but not implemented**
6. **No HTTP handler type** — command only (official)
7. **No `if` conditional filtering**
8. **Plain text output handling inconsistent** across events

### 4.8 Notify System (Separate)

Codex also has a simpler notification mechanism via `notify` config key — receives JSON with `type`, `thread-id`, `turn-id`, etc. Currently supports `agent-turn-complete` event. This is separate from the hooks system.

---

## 5. Cross-Provider Comparison

### 5.1 Event Mapping

| Event                  | Claude Code     | Codex (Official) | Codex (Extended) | Portable?                      |
| ---------------------- | --------------- | ---------------- | ---------------- | ------------------------------ |
| **SessionStart**       | Yes             | Yes              | Yes              | **Yes**                        |
| **SessionEnd**         | Yes             | No               | Yes              | Partial                        |
| **InstructionsLoaded** | Yes             | No               | No               | Claude-only                    |
| **UserPromptSubmit**   | Yes             | Yes              | Yes              | **Yes**                        |
| **PreToolUse**         | Yes (all tools) | Yes (Bash only)  | Yes (Bash only)  | **Yes** (with tool constraint) |
| **PostToolUse**        | Yes (all tools) | Yes (Bash only)  | Yes (Bash only)  | **Yes** (with tool constraint) |
| **PostToolUseFailure** | Yes             | No               | Yes              | Partial                        |
| **PermissionRequest**  | Yes             | No               | Yes              | Partial                        |
| **PermissionDenied**   | Yes             | No               | No               | Claude-only                    |
| **SubagentStart**      | Yes             | No               | Yes              | Partial                        |
| **SubagentStop**       | Yes             | No               | Yes              | Partial                        |
| **TaskCreated**        | Yes             | No               | No               | Claude-only                    |
| **TaskCompleted**      | Yes             | No               | Yes              | Partial                        |
| **TeammateIdle**       | Yes             | No               | Yes              | Partial                        |
| **Stop**               | Yes             | Yes              | Yes              | **Yes**                        |
| **StopFailure**        | Yes             | No               | No               | Claude-only                    |
| **Notification**       | Yes             | No               | Yes              | Partial                        |
| **ConfigChange**       | Yes             | No               | Yes              | Partial                        |
| **CwdChanged**         | Yes             | No               | No               | Claude-only                    |
| **FileChanged**        | Yes             | No               | No               | Claude-only                    |
| **WorktreeCreate**     | Yes             | No               | Yes              | Partial                        |
| **WorktreeRemove**     | Yes             | No               | Yes              | Partial                        |
| **PreCompact**         | Yes             | No               | Yes              | Partial                        |
| **PostCompact**        | Yes             | No               | No               | Claude-only                    |
| **Elicitation**        | Yes             | No               | No               | Claude-only                    |
| **ElicitationResult**  | Yes             | No               | No               | Claude-only                    |

**Portable events (both official):** SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop

### 5.2 Handler Type Comparison

| Handler Type | Claude Code | Codex (Official) | Codex (Extended) |
| ------------ | ----------- | ---------------- | ---------------- |
| **command**  | Yes         | Yes              | Yes              |
| **http**     | Yes         | No               | No               |
| **prompt**   | Yes         | No               | Yes              |
| **agent**    | Yes         | No               | Yes              |

**Portable handler type:** command only

### 5.3 Configuration Format Comparison

| Aspect                      | Claude Code                                                              | Codex                                              |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| **File format**             | JSON (settings.json)                                                     | JSON (hooks.json) or TOML (config.toml)            |
| **File location (user)**    | `~/.claude/settings.json`                                                | `~/.codex/hooks.json`                              |
| **File location (project)** | `.claude/settings.json`                                                  | `<repo>/.codex/hooks.json`                         |
| **Schema structure**        | `hooks.<Event>[].{matcher, hooks[]}`                                     | `hooks.<Event>[].{matcher, hooks[]}`               |
| **Matcher syntax**          | Regex                                                                    | Regex (Rust flavor)                                |
| **Hook fields**             | type, command/url/prompt, timeout, async, shell, if, once, statusMessage | type, command, timeout, async, once, statusMessage |
| **Embedding in skills**     | Yes (YAML frontmatter `hooks:`)                                          | Yes (extended only)                                |
| **Disable mechanism**       | `disableAllHooks: true`                                                  | Remove feature flag                                |

### 5.4 Data Flow Comparison

| Aspect                      | Claude Code                                                            | Codex                                                                     |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Input format**            | JSON on stdin                                                          | JSON on stdin                                                             |
| **Universal input fields**  | session_id, transcript_path, cwd, permission_mode, hook_event_name     | session_id, transcript_path, cwd, permission_mode, hook_event_name, model |
| **Exit code semantics**     | 0=success, 2=block, other=error                                        | 0=success, 2=block, other=error                                           |
| **Output format**           | JSON on stdout                                                         | JSON on stdout                                                            |
| **Common output fields**    | continue, stopReason, systemMessage, suppressOutput, additionalContext | continue, stopReason, systemMessage, suppressOutput (not implemented)     |
| **Decision fields**         | decision, reason, hookSpecificOutput                                   | decision, reason, hookSpecificOutput                                      |
| **Output casing**           | camelCase only                                                         | camelCase + snake_case aliases                                            |
| **Decision aliases**        | None                                                                   | approve/continue=allow, block/abort=deny                                  |
| **additionalContext limit** | 10,000 chars                                                           | Not documented                                                            |
| **Environment variables**   | CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT, etc.                           | Not documented                                                            |
| **`if` conditional**        | Yes (tool events only)                                                 | No                                                                        |

### 5.5 Key Convergence Points

The JSON wire format is nearly identical. A command hook script that:

1. Reads JSON from stdin
2. Processes it
3. Outputs JSON to stdout
4. Uses exit code 0 or 2

...will work on both providers without modification for the 5 portable events, as long as it targets Bash tool events only (Codex constraint).

### 5.6 Key Divergence Points

1. **Event breadth** — Claude has 5x more events (27 vs 5 official)
2. **Tool scope** — Claude hooks fire for all tools; Codex only for Bash
3. **Handler diversity** — Claude has HTTP, prompt, and agent handlers
4. **Maturity** — Claude is production-ready; Codex is experimental
5. **Configuration placement** — Different files, different locations
6. **Conditional execution** — Claude has `if` filtering; Codex does not
7. **HTTP webhooks** — Claude-only capability
8. **Permission integration** — Claude hooks can participate in permission decisions; Codex has this only in extended

---

## 6. Canonical Hook Format Design

### 6.1 Design Principles

1. **Markdown-first** — Follow OAT's convention: metadata in YAML frontmatter, documentation in the body
2. **Portable by default** — Canonical hooks target the intersection of providers
3. **Progressive enhancement** — Provider-specific features opt-in via frontmatter
4. **Script-bundled** — Hook scripts live alongside the definition, like skill references/scripts
5. **Human-readable** — Unlike raw JSON config, canonical hooks are documented and discoverable

### 6.2 Directory Structure

```
.agents/
├── hooks/                              # Canonical hook definitions
│   ├── format-on-save/
│   │   ├── HOOK.md                     # Hook metadata + documentation
│   │   └── scripts/
│   │       └── format.sh              # The handler script
│   ├── protected-files/
│   │   ├── HOOK.md
│   │   └── scripts/
│   │       └── guard.sh
│   └── session-context/
│       └── HOOK.md                    # Prompt-type hook (no script needed)
├── skills/                             # Existing
├── agents/                             # Existing
└── rules/                              # Existing
```

### 6.3 HOOK.md Format

```yaml
---
name: format-on-save
version: 1.0.0
description: >
  Auto-formats files after Edit or Write operations using the project's
  configured formatter (Prettier, Black, rustfmt, etc.).
event: PostToolUse
matcher: "Edit|Write"
handler:
  type: command
  command: ./scripts/format.sh
  timeout: 30
  async: false
providers:
  claude: true
  codex: false        # Codex PostToolUse is Bash-only
  cursor: false       # No hooks system
  copilot: false      # No hooks system
---

# Format on Save

Automatically formats files after Claude edits or writes them, ensuring
consistent code style without manual intervention.

## Behavior

- Detects the file type from `tool_input.file_path`
- Runs the appropriate formatter (Prettier for JS/TS, Black for Python, etc.)
- Injects a brief `additionalContext` message confirming formatting was applied

## Requirements

- Formatter must be installed and available on PATH
- Project should have formatter config (.prettierrc, pyproject.toml, etc.)

## Notes

- Only fires on Edit and Write tools — Bash operations are not formatted
- Codex is excluded because its PostToolUse only fires for Bash tool calls
```

### 6.4 Frontmatter Schema

| Field                   | Type    | Required    | Description                                          |
| ----------------------- | ------- | ----------- | ---------------------------------------------------- |
| `name`                  | string  | Yes         | Kebab-case identifier, max 64 chars                  |
| `version`               | semver  | Yes         | Semantic version                                     |
| `description`           | string  | Yes         | What the hook does and when it fires                 |
| `event`                 | enum    | Yes         | Hook event name (from portable event set)            |
| `matcher`               | string  | No          | Regex pattern for event filtering                    |
| `handler.type`          | enum    | Yes         | `command`, `http`, `prompt`, `agent`                 |
| `handler.command`       | string  | Conditional | Script path (relative to hook dir) or inline command |
| `handler.url`           | string  | Conditional | HTTP endpoint (http handler only)                    |
| `handler.prompt`        | string  | Conditional | LLM prompt text (prompt/agent handler only)          |
| `handler.timeout`       | number  | No          | Timeout in seconds                                   |
| `handler.async`         | boolean | No          | Run in background (default: false)                   |
| `handler.shell`         | string  | No          | Shell to use (default: bash)                         |
| `handler.model`         | string  | No          | Model for prompt/agent handlers                      |
| `handler.once`          | boolean | No          | Fire only once per session (default: false)          |
| `handler.if`            | string  | No          | Conditional filter (Claude-only, noted in providers) |
| `handler.statusMessage` | string  | No          | User-visible status during execution                 |
| `handler.headers`       | object  | No          | HTTP headers (http handler only)                     |
| `providers`             | object  | No          | Per-provider enable/disable overrides                |
| `providers.<name>`      | boolean | No          | Enable (true) or disable (false) for this provider   |

### 6.5 Portable Event Enum

For the canonical format, events are categorized by portability:

**Tier 1 — Portable (both providers, official):**
`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`

**Tier 2 — Converging (Claude official + Codex extended):**
`SessionEnd`, `PostToolUseFailure`, `PermissionRequest`, `SubagentStart`, `SubagentStop`, `TaskCompleted`, `TeammateIdle`, `Notification`, `ConfigChange`, `PreCompact`, `WorktreeCreate`, `WorktreeRemove`

**Tier 3 — Provider-specific (Claude-only):**
`InstructionsLoaded`, `PermissionDenied`, `TaskCreated`, `StopFailure`, `CwdChanged`, `FileChanged`, `PostCompact`, `Elicitation`, `ElicitationResult`

Canonical hooks should prefer Tier 1 events for maximum portability. Tier 2 events should note `providers:` overrides. Tier 3 events should be authored directly in provider-specific config.

### 6.6 Transformation Rules

**Canonical HOOK.md → Claude Code settings.json:**

```json
// .claude/settings.json (merged into existing hooks section)
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".agents/hooks/format-on-save/scripts/format.sh",
            "timeout": 30,
            "async": false,
            "statusMessage": "Formatting..."
          }
        ]
      }
    ]
  }
}
```

**Canonical HOOK.md → Codex hooks.json:**

```json
// .codex/hooks.json (merged into existing hooks section)
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".agents/hooks/format-on-save/scripts/format.sh",
            "timeout": 30,
            "async": false,
            "statusMessage": "Formatting..."
          }
        ]
      }
    ]
  }
}
```

Note: The adapter adjusts the matcher from `Edit|Write` to `Bash` for Codex (since Codex only supports Bash tool events), or skips the hook entirely if `providers.codex: false`.

---

## 7. OAT Integration Architecture

### 7.1 Decision Framework

**Decision drivers:**

- Consistency with existing OAT content types (skills, agents, rules)
- Leverage existing sync machinery (adapters, manifests, plans)
- Support the provider-agnostic → provider-specific transformation pattern
- Handle the fundamental difference: hooks are configuration, not content files

**Constraints:**

- Claude Code hooks live in `settings.json` (not standalone files)
- Codex hooks live in `hooks.json` (not standalone files)
- Hooks must merge into existing provider config, not replace it
- Script files must be accessible at the path referenced in the generated config

**Quality attributes:**

- **Portability** — canonical hooks work across providers
- **Discoverability** — hooks are documented and browsable
- **Safety** — sync should not overwrite user's manually-configured hooks
- **Consistency** — follows the same patterns as skills/agents/rules

### 7.2 Options Analyzed

#### Option A: Hooks as OAT Content Type (Config-Merge Adapter)

Add `hook` to the `ContentType` enum. Each provider adapter gains a hook-specific path mapping that, instead of symlinking/copying files, **merges** generated hook config into the provider's native configuration file.

**How it works:**

1. Scanner discovers `.agents/hooks/*/HOOK.md` files
2. Each provider adapter has a `hookTransform(hookMd) → providerConfig` function
3. Instead of creating symlinks, the adapter reads the provider's existing config file (e.g., `.claude/settings.json`), merges the `hooks` section, and writes back
4. Manifest tracks which hooks were synced and their content hashes for idempotent updates
5. A managed marker (e.g., `"_oat_managed": ["format-on-save"]`) in the config prevents overwriting user hooks

**Tradeoffs:**

- (+) Fully integrated with existing sync, status, config commands
- (+) Leverages adapter pattern and manifest tracking
- (+) `oat status` naturally reports hook drift
- (-) More complex than file-based sync (config merge vs symlink/copy)
- (-) Must handle merge conflicts with user-authored hooks
- (-) Different execution path than skills/agents/rules (merge vs link)

#### Option B: Standalone Hooks Command

Add `oat hooks sync` as a separate command that reads `.agents/hooks/` and generates provider configs independently from the main sync pipeline.

**Tradeoffs:**

- (+) Simpler implementation — no changes to core sync engine
- (+) Clear separation of concerns
- (-) Inconsistent with existing OAT patterns
- (-) Duplicates adapter/manifest logic
- (-) `oat status` wouldn't naturally include hooks

#### Option C: Hook Scaffolding Only (No Sync)

OAT provides only the canonical format and a scaffolding skill. Users manually configure provider hooks referencing the canonical scripts.

**Tradeoffs:**

- (+) Simplest implementation
- (+) No risk of overwriting user config
- (-) Defeats the purpose of provider-agnostic tooling
- (-) No automation benefit over writing hooks directly

### 7.3 Tradeoff Matrix

| Dimension                 | Option A (Content Type) | Option B (Standalone) | Option C (Scaffold Only) |
| ------------------------- | ----------------------- | --------------------- | ------------------------ |
| Consistency with OAT      | High                    | Medium                | Low                      |
| Implementation complexity | High                    | Medium                | Low                      |
| User experience           | Best (integrated)       | Good                  | Manual                   |
| Safety (config merge)     | Requires care           | Requires care         | No risk                  |
| `oat status` integration  | Automatic               | Separate              | None                     |
| `oat sync --dry-run`      | Automatic               | Separate              | N/A                      |
| Manifest tracking         | Automatic               | Custom                | None                     |
| Provider adapter reuse    | Full                    | Partial               | None                     |

### 7.4 Recommended Architecture: Option A (Phased)

**Phase 1: Canonical format + scaffolding skill**

- Define the HOOK.md format (section 6.3)
- Create the `create-agnostic-hook` skill
- Document the canonical format in `.agents/docs/`
- Users manually reference canonical scripts in provider configs

**Phase 2: Sync integration**

- Add `hook` to `ContentType` enum
- Implement config-merge adapters for Claude Code and Codex
- Add OAT-managed marker tracking
- Integrate with `oat status` for drift detection

**Phase 3: Advanced features**

- Hook adoption command: `oat hooks adopt` — reads existing provider hooks and generates canonical HOOK.md files
- Hook validation: `oat hooks validate` — checks canonical hooks against provider constraints
- Provider compatibility matrix in `oat hooks list`

### 7.5 Key Implementation Files

| Purpose                         | File                                                 |
| ------------------------------- | ---------------------------------------------------- |
| Content type enum               | `packages/cli/src/shared/types.ts`                   |
| Scanner (add hook discovery)    | `packages/cli/src/engine/scanner.ts`                 |
| Adapter interface               | `packages/cli/src/providers/shared/adapter.types.ts` |
| Claude adapter                  | `packages/cli/src/providers/claude/`                 |
| Codex adapter                   | `packages/cli/src/providers/codex/`                  |
| Compute plan (add merge logic)  | `packages/cli/src/engine/compute-plan.ts`            |
| Execute plan (add config write) | `packages/cli/src/engine/execute-plan.ts`            |

---

## 8. OAT Workflow Enhancement Opportunities

Beyond provider abstraction, hooks can improve OAT's own workflows. These are opportunities where OAT could ship bundled hooks or recommend hook configurations.

### 8.1 Drift Detection on File Change (Claude Code)

**Event:** `FileChanged` (matcher: `.agents/*`)
**Purpose:** When files in `.agents/` change outside of `oat sync`, warn the user that provider views may be stale.

```yaml
event: FileChanged
matcher: '.agents'
handler:
  type: command
  command: oat status --scope project --quiet
  statusMessage: 'Checking OAT sync status...'
```

### 8.2 Auto-Sync After Tool Operations

**Event:** `PostToolUse` (matcher: `Write|Edit`)
**Purpose:** When the agent writes to `.agents/skills/`, `.agents/hooks/`, or `.agents/rules/`, automatically trigger `oat sync` to keep provider views current.

```yaml
event: PostToolUse
matcher: 'Write|Edit'
handler:
  type: command
  command: |
    file_path=$(echo "$1" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')
    if [[ "$file_path" == *".agents/"* ]]; then
      oat sync --scope project --quiet
    fi
```

### 8.3 Session Context Injection

**Event:** `SessionStart`
**Purpose:** Inject OAT project status, active project state, or recent changes as `additionalContext` so the agent starts with awareness of the project's OAT state.

```yaml
event: SessionStart
handler:
  type: command
  command: |
    status=$(oat status --scope project --json 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo "{\"additionalContext\": \"OAT project status: $status\"}"
    fi
```

### 8.4 Project Lifecycle Gates

**Event:** `Stop`
**Purpose:** Before the agent stops, verify that OAT project tracking artifacts (plan.md, implementation.md) are updated. Pairs with OAT project workflows.

```yaml
event: Stop
handler:
  type: prompt
  prompt: |
    Check if there is an active OAT project. If so, verify that the
    implementation tracking artifact has been updated to reflect the
    work done in this session. If not updated, respond with
    {"ok": false, "reason": "Update the OAT implementation tracker before stopping."}
```

### 8.5 Pre-Commit Sync Verification

**Event:** `PreToolUse` (matcher: `Bash`, if: `Bash(git commit*)`)
**Purpose:** Before git commits, ensure provider views are in sync.

```yaml
event: PreToolUse
matcher: 'Bash'
handler:
  type: command
  command: oat status --scope project --quiet
  if: 'Bash(git commit*)'
```

Note: The `if` conditional is Claude Code specific. For Codex, the hook script itself would need to check the command content.

### 8.6 Skill Version Bump Reminder

**Event:** `PostToolUse` (matcher: `Write|Edit`)
**Purpose:** When a SKILL.md file is edited, remind the agent to bump the version field.

```yaml
event: PostToolUse
matcher: 'Write|Edit'
handler:
  type: command
  command: |
    file_path=$(echo "$1" | jq -r '.tool_input.file_path // empty')
    if [[ "$file_path" == *"SKILL.md" ]]; then
      echo "{\"additionalContext\": \"Reminder: You edited a SKILL.md file. Ensure the frontmatter version: field is bumped per OAT conventions.\"}"
    fi
```

### 8.7 Worktree Bootstrap

**Event:** `WorktreeCreate`
**Purpose:** When a worktree is created, automatically run `pnpm run worktree:init` and `oat sync`.

```yaml
event: WorktreeCreate
handler:
  type: command
  command: |
    cd "$CLAUDE_PROJECT_DIR" && pnpm run worktree:init && oat sync --scope project
```

### 8.8 Summary of Opportunities

| Hook                    | Event          | Provider Support             | Impact |
| ----------------------- | -------------- | ---------------------------- | ------ |
| Drift detection         | FileChanged    | Claude only                  | Medium |
| Auto-sync after edits   | PostToolUse    | Claude + Codex (Bash)        | High   |
| Session context         | SessionStart   | Claude + Codex               | High   |
| Project lifecycle gates | Stop           | Claude + Codex               | Medium |
| Pre-commit sync check   | PreToolUse     | Claude + Codex (Bash)        | Medium |
| Skill version reminder  | PostToolUse    | Claude only (non-Bash tools) | Low    |
| Worktree bootstrap      | WorktreeCreate | Claude only (Codex extended) | Medium |

---

## 9. Migration Path: Existing Claude Code Hooks

For users who already have Claude Code hooks configured in `.claude/settings.json` and want to make them portable or track them canonically.

### 9.1 Adoption Workflow

1. **Inventory** — Read `.claude/settings.json` hooks section
2. **Classify** — For each hook, determine if it targets a portable event (Tier 1) or provider-specific event (Tier 3)
3. **Extract scripts** — If the hook references inline shell commands, extract them to `.agents/hooks/<name>/scripts/`
4. **Generate HOOK.md** — Create canonical definitions with appropriate `providers` flags
5. **Validate** — Ensure the canonical definition generates equivalent provider config

### 9.2 Adoption Decision Tree

```
For each existing Claude Code hook:
│
├── Event is Tier 1 (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop)?
│   ├── Handler is command type?
│   │   ├── Script is Bash-compatible? → ADOPT as canonical hook
│   │   └── Script uses Claude-specific env vars? → ADOPT with provider notes
│   ├── Handler is http/prompt/agent?
│   │   └── ADOPT as canonical with providers.codex: false
│   └── Matcher targets non-Bash tools?
│       └── ADOPT with providers.codex: false (or adapt matcher)
│
├── Event is Tier 2 (converging)?
│   └── ADOPT as canonical with providers.codex: false (for now)
│
└── Event is Tier 3 (Claude-only)?
    └── KEEP in .claude/settings.json (not portable)
```

### 9.3 Script Portability Checklist

When extracting hook scripts for canonical use:

- [ ] Replace `$CLAUDE_PROJECT_DIR` with `$(git rev-parse --show-toplevel)` or equivalent
- [ ] Replace `$CLAUDE_PLUGIN_ROOT` / `$CLAUDE_PLUGIN_DATA` with portable alternatives
- [ ] Ensure `jq` dependency is documented (both providers use JSON stdin)
- [ ] Test exit code behavior (both use 0=success, 2=block)
- [ ] Verify JSON output field names (Codex accepts snake_case aliases)
- [ ] Check for `if` conditional usage (Claude-only — move logic into script)

---

## 10. Create-Agnostic-Hook Skill Design

A companion skill to `create-agnostic-skill`, following the same patterns.

### 10.1 Skill Overview

```yaml
name: create-agnostic-hook
version: 1.0.0
description: >
  Use when adding a reusable lifecycle hook for AI coding agents.
  Scaffolds a new .agents/hooks hook definition using the canonical
  HOOK.md format with provider compatibility annotations.
argument-hint: '[hook-name]'
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
```

### 10.2 Workflow Steps

1. **Gather hook information** — Name, description, target event, handler type, provider targets
2. **Assess portability** — Map event to portability tier, flag provider-specific features
3. **Plan hook structure** — Determine if script file is needed, set provider flags
4. **Create HOOK.md** — Scaffold the canonical definition
5. **Create script (if command type)** — Generate handler script with portable patterns
6. **Validate** — Check frontmatter, test script execution
7. **Sync** — Run `oat sync` if hook sync is implemented (Phase 2+)

### 10.3 Key Design Decisions

- **Event selection guidance** — Skill should recommend Tier 1 events for portability
- **Script templates** — Provide starter scripts for common patterns (format, guard, log, inject context)
- **Provider compatibility report** — After creation, show which providers will receive the hook
- **Reference to this guide** — Link to `.agents/docs/hooks-guide.md` for the full comparison

### 10.4 Example Invocation

```
/create-agnostic-hook format-on-save
```

```
Create a hook that auto-formats files after they're edited
```

---

## 11. Risk Considerations

### Technical Risks

| Risk                                   | Severity | Likelihood | Mitigation                                            |
| -------------------------------------- | -------- | ---------- | ----------------------------------------------------- |
| Config merge overwrites user hooks     | High     | Medium     | OAT-managed marker tracking; merge-only sections      |
| Codex hooks API changes (experimental) | Medium   | High       | Version pin canonical format; adapter absorbs changes |
| Script path resolution across symlinks | Medium   | Low        | Use git-root-relative paths                           |
| JSON parsing failures in hook scripts  | Low      | Medium     | Template scripts with robust error handling           |

### Organizational Risks

| Risk                                             | Severity | Likelihood | Mitigation                                              |
| ------------------------------------------------ | -------- | ---------- | ------------------------------------------------------- |
| Maintaining two hook docs (canonical + provider) | Medium   | High       | Canonical docs reference provider docs; don't duplicate |
| Users confused about canonical vs provider hooks | Medium   | Medium     | Clear documentation; `oat hooks list` shows both        |

### Timeline Risks

| Risk                                                      | Severity | Likelihood | Mitigation                                                |
| --------------------------------------------------------- | -------- | ---------- | --------------------------------------------------------- |
| Codex hooks may change significantly before stabilizing   | Medium   | High       | Phase 1 (scaffold only) has no Codex sync dependency      |
| Config-merge adapter is more complex than file-based sync | Medium   | Medium     | Phase 2 can be deferred; Phase 1 provides immediate value |

### Reversibility

- **Phase 1 (canonical format + skill):** Fully reversible — just markdown files and a skill
- **Phase 2 (sync integration):** Reversible — OAT-managed sections can be stripped from provider configs
- **Phase 3 (adoption):** Reversible — adopted hooks can be reverted to provider-specific config

---

## 12. Recommendation

### Recommended Approach

**Phase 1 first: canonical format + scaffolding skill.** This delivers immediate value (documented, discoverable, portable hook definitions) with zero risk to existing configurations.

### Rationale

1. The canonical HOOK.md format is pure upside — it makes hooks documented and discoverable regardless of sync support
2. The `create-agnostic-hook` skill follows the proven `create-agnostic-skill` pattern
3. Codex hooks are experimental and changing; premature sync integration risks churn
4. Phase 1 validates the format before investing in the more complex config-merge adapter

### Conditions

- Codex hooks must stabilize (exit experimental) before Phase 2 sync is worthwhile
- The config-merge adapter pattern must be validated in a spike before committing to Phase 2

### Fallback

If config-merge proves too complex or risky, Option C (scaffold only) remains viable indefinitely — canonical HOOK.md files have value as documentation even without automated sync.

### Next Steps

1. **Create `.agents/hooks/` directory** in OAT repo
2. **Author `create-agnostic-hook` skill** at `.agents/skills/create-agnostic-hook/SKILL.md`
3. **Add hooks section to provider-reference.md** (Codex hooks URL, update last-updated date)
4. **Ship example canonical hooks** — format-on-save, protected-files, session-context
5. **Open OAT project** for Phase 2 (sync integration) scoped to when Codex hooks stabilize

---

## 13. Sources & References

### Official Documentation

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — full API, events, handlers, configuration
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) — getting started, use cases
- [Claude Code Hooks (docs.claude.com)](https://docs.claude.com/en/docs/claude-code/hooks) — alternative reference
- [Claude Code Hooks in Agent SDK](https://platform.claude.com/docs/en/agent-sdk/hooks)
- [Codex Hooks Documentation](https://developers.openai.com/codex/hooks) — official hooks reference
- [Codex Config Reference](https://developers.openai.com/codex/config-reference) — configuration schema
- [Codex Advanced Config](https://developers.openai.com/codex/config-advanced) — hierarchical scoping

### Community & Extended Sources

- [Codex Generated JSON Schemas](https://github.com/openai/codex/tree/main/codex-rs/hooks/schema/generated/) — 10 schema files for 5 official events
- [Extended Codex Hooks Docs (fork)](https://github.com/stellarlinkco/codex/blob/main/docs/hooks.md) — community-maintained extended event set
- [Claude Code Hooks Mastery](https://github.com/disler/claude-code-hooks-mastery) — patterns and examples

### OAT Architecture

- `.agents/docs/reference-architecture.md` — canonical layout, sync conventions
- `.agents/docs/provider-reference.md` — provider documentation links
- `.agents/docs/skills-guide.md` — cross-provider skills compatibility
- `packages/cli/src/providers/shared/adapter.types.ts` — provider adapter interface
- `packages/cli/src/engine/scanner.ts` — canonical content scanner
- `packages/cli/src/engine/hook.ts` — existing OAT git hook management
