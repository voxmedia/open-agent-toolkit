---
skill: deep-research
schema: architectural
topic: 'Provider-Agnostic Hooks for Open Agent Toolkit'
model: gpt-5-codex
generated_at: 2026-04-05
depth: exhaustive
focus: codex hooks, claude code hooks, and OAT integration design
context: .agents/docs
---

# Provider-Agnostic Hooks for OAT

> Research synthesis compiled 2026-04-05 from official provider documentation and the current OAT codebase.
> For provider-specific links, see [provider-reference.md](../../../../.agents/docs/provider-reference.md).

## Executive Summary

Codex and Claude Code now both expose lifecycle hooks, but they are not peers yet. Claude Code ships a broad, mature hook platform with 26 documented events, 4 handler types (`command`, `http`, `prompt`, `agent`), multiple configuration scopes, and component-scoped hooks in skills and agents. Codex ships an experimental, feature-flagged hook system with 5 documented events, command handlers only, and current runtime coverage centered on Bash interception plus turn-level control points.

That asymmetry still leaves a real interoperability lane. The two providers already share the most important portable core: command hooks, JSON input/output contracts, regex-based matcher groups, parallel execution of matching handlers, and overlapping lifecycle points for `SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, and `Stop`. That common subset is enough to justify a canonical OAT hook abstraction, but only if OAT treats Claude-only and Codex-only behavior as extensions rather than pretending the systems are equivalent.

The main architectural finding is that hooks do not fit OAT's current path-mapping model as cleanly as skills, agents, and rules. Claude stores project hooks inside aggregate `settings.json` documents, while Codex stores them in aggregate `hooks.json` files discovered across config layers. That means hook support should look more like the existing Codex role/config synthesis pipeline than a simple new `PathMapping`. Phase 1 should therefore target:

1. A canonical hook format for the portable command-hook subset.
2. Import/adoption of existing Claude settings hooks into canonical OAT hook documents.
3. Export to Codex `hooks.json`.
4. Export to Claude project settings via a merge-aware synthesized config path.

Claude-specific advanced features such as HTTP hooks, prompt hooks, agent hooks, async hooks, MCP elicitation hooks, and skill/agent-scoped hooks should be modeled as provider extensions and deliberately degrade or stay provider-local when syncing to Codex.

## Methodology

**Sources consulted**

- Official Codex hooks docs: `https://developers.openai.com/codex/hooks`
- Official Claude Code hooks reference: `https://code.claude.com/docs/en/hooks`
- Official Claude Code hooks guide: `https://code.claude.com/docs/en/hooks-guide`
- OAT provider architecture and sync engine:
  - `packages/cli/src/shared/types.ts`
  - `packages/cli/src/engine/scanner.ts`
  - `packages/cli/src/engine/compute-plan.ts`
  - `packages/cli/src/providers/shared/adapter.types.ts`
  - `packages/cli/src/providers/shared/adapter.utils.ts`
  - `packages/cli/src/providers/codex/codec/export-to-codex.ts`
  - `packages/cli/src/providers/codex/codec/import-from-codex.ts`
  - `packages/cli/src/commands/shared/adopt-stray.ts`
  - `apps/oat-docs/docs/provider-sync/providers.md`
  - `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
  - `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`

**Angles explored**

1. What Codex hooks support today, including documented limitations.
2. What Claude Code hooks support today, including advanced hook types and scope.
3. The actual portable subset between the two systems.
4. Whether OAT's current provider-sync architecture can absorb hooks cleanly.
5. How existing Claude hook configurations could be adopted into canonical OAT assets.
6. Where hooks could improve OAT workflows beyond provider syncing itself.

**Constraints**

- This research is based on current official docs as of 2026-04-05. Codex explicitly marks hooks as experimental and under active development.
- The comparison is limited to official Codex and Claude Code hook systems. Cursor, Copilot, and Gemini are out of scope because the request centered on Codex and Claude Code.
- OAT hook support does not exist in the current codebase, so integration recommendations are design proposals grounded in current implementation patterns rather than shipped behavior.

## Findings

### 1. Codex hooks: small surface, strong portability signal

Codex documents hooks as an experimental extensibility framework behind `codex_hooks = true` in `config.toml`. Hooks are currently disabled on Windows. Codex discovers `hooks.json` beside active config layers, with `~/.codex/hooks.json` and `<repo>/.codex/hooks.json` called out as the practical locations. A notable design choice is that matching hooks from multiple files all run; higher-precedence config layers do not replace lower-precedence hooks.

Codex's configuration model is:

- hook event
- matcher group
- one or more hook handlers

The currently documented events are:

| Event              | Matchers        | Current runtime notes                          |
| ------------------ | --------------- | ---------------------------------------------- |
| `SessionStart`     | `source` regex  | documented runtime values: `startup`, `resume` |
| `PreToolUse`       | tool name regex | current runtime only emits `Bash`              |
| `PostToolUse`      | tool name regex | current runtime only emits `Bash`              |
| `UserPromptSubmit` | matcher ignored | turn-scoped                                    |
| `Stop`             | matcher ignored | turn-scoped                                    |

The important current limitations are:

- Only `type: "command"` is documented.
- `PreToolUse` and `PostToolUse` are Bash-only in current runtime.
- `UserPromptSubmit` and `Stop` ignore matchers today.
- Several parsed fields are explicitly documented as not yet supported and fail open.
- `PostToolUse` cannot undo side effects from the command that already ran.

Despite that narrow surface, the contract is already structurally useful for interoperability:

- JSON input on `stdin`
- JSON output on `stdout`
- exit code `2` as a block/continue signal in several events
- regex matcher groups
- concurrent execution of matching command hooks
- shared "add context or alter continuation behavior" semantics on several events

Codex-specific behavior that matters for OAT design:

- `SessionStart` and `UserPromptSubmit` can inject additional developer context.
- `Stop` can force automatic continuation by returning a block-style decision and reason.
- `PreToolUse` is positioned as a guardrail, not a full enforcement boundary.
- Hooks aggregate across config layers instead of replacing lower layers.

### 2. Claude Code hooks: broad lifecycle control and provider-specific power

Claude Code's reference describes hooks as user-defined shell commands, HTTP endpoints, or LLM-driven evaluators that execute across the Claude lifecycle. The official current event table contains 26 documented events:

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PermissionRequest`
- `PermissionDenied`
- `PostToolUse`
- `PostToolUseFailure`
- `Notification`
- `SubagentStart`
- `SubagentStop`
- `TaskCreated`
- `TaskCompleted`
- `Stop`
- `StopFailure`
- `TeammateIdle`
- `InstructionsLoaded`
- `ConfigChange`
- `CwdChanged`
- `FileChanged`
- `WorktreeCreate`
- `WorktreeRemove`
- `PreCompact`
- `PostCompact`
- `Elicitation`
- `ElicitationResult`
- `SessionEnd`

Claude supports four hook handler types:

- `command`
- `http`
- `prompt`
- `agent`

Claude also supports several capabilities Codex does not currently document:

- `if` filters using permission-rule syntax for tool events
- async command hooks
- MCP tool matching via `mcp__<server>__<tool>` names
- hook definitions in project/user/local/managed settings
- hook definitions bundled in plugins
- hook definitions in skill and agent frontmatter
- component lifecycle scoping, including `once` for skill-scoped hooks
- environment helpers like `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, and `CLAUDE_ENV_FILE`

Claude's lifecycle coverage is much broader than Codex's. It reaches into:

- tool success and tool failure
- permission dialogs and auto-denials
- subagent lifecycle
- task lifecycle
- context compaction
- config and file watching
- worktree orchestration
- MCP elicitation
- session end cleanup

That breadth makes Claude hooks powerful, but it also means a large percentage of real Claude hook configs will not map directly to Codex.

### 3. The real common subset is narrower than "hooks" as a category

The interoperable subset between Codex and Claude today is not "all hooks". It is closer to "command hooks over overlapping lifecycle points".

#### Shared primitives

Both providers support:

- event -> matcher group -> handlers structure
- regex matcher groups
- command hooks that read JSON input and can emit JSON output
- parallel execution of matching hooks
- `SessionStart`
- `PreToolUse`
- `PostToolUse`
- `UserPromptSubmit`
- `Stop`

#### Shared practical use cases

These use cases can reasonably target both providers:

- prompt screening before the model acts
- Bash command policy checks before execution
- post-Bash validation and context injection
- stop-time continuation gates
- session-start context hydration

#### Not portable today

These Claude capabilities have no current Codex peer in the official docs:

- HTTP hooks
- prompt hooks
- agent hooks
- async hooks
- permission-request hooks
- permission-denied hooks
- post-tool-failure hooks
- subagent start/stop hooks
- task lifecycle hooks
- notification hooks
- config/file/cwd watchers
- worktree lifecycle hooks
- compaction hooks
- MCP elicitation hooks
- session-end hooks
- skill-scoped and agent-scoped hooks

Even within shared event names, semantics are not always identical:

- Claude `PreToolUse` covers many tools and MCP tools; Codex currently covers `Bash` only.
- Claude supports `allow`, `deny`, `ask`, and, in some contexts, richer decision controls; Codex documents a smaller supported subset and explicitly marks several fields as parsed-but-not-supported.
- Claude `Stop` is part of a much broader lifecycle and can be combined with prompt/agent verification; Codex `Stop` currently remains a command-hook continuation gate.

### 4. OAT's current provider-sync architecture suggests hooks need synthesized aggregate export

The current OAT provider-sync engine is built around three content types:

- `skill`
- `agent`
- `rule`

That is explicit in `packages/cli/src/shared/types.ts`, `packages/cli/src/engine/scanner.ts`, and the adapter contract tests. The scanner and scope model currently assume:

- canonical directories under `.agents/skills`, `.agents/agents`, `.agents/rules`
- project scope supports those three content types
- user scope currently supports `skill` only

The adapter/path-mapping layer is also designed around path-level fanout:

- `PathMapping` links canonical directories to provider directories
- transformed content like rules uses `transformCanonical` and `parseToCanonical`
- native-read providers skip mirrored sync via `nativeRead`

That model fits rules because they still fan out one canonical file into one provider file. Hooks are different:

- Codex hooks consolidate into aggregate `.codex/hooks.json`.
- Claude project hooks consolidate into aggregate `.claude/settings.json` data.
- A single provider file can contain many hook definitions spanning multiple events and matcher groups.
- Claude also allows hooks embedded in skill and agent frontmatter, which are not standalone files at all.

This is the same reason Codex subagent support already has special synthesized handling beyond plain path mappings. OAT exports canonical markdown agents to `.codex/agents/*.toml` and upserts `.codex/config.toml` via a provider-specific codec and command-layer aggregation. Hooks should follow that pattern.

**Conclusion:** adding `contentType: "hook"` is necessary but not sufficient. Hook support also needs a provider-specific synthesis layer for aggregate configs.

### 5. Canonical OAT hook design should default to the portable subset

The cleanest OAT design is to define a canonical hook model that expresses the shared subset first, then layer provider extensions on top.

#### Recommended canonical shape

I recommend a new canonical namespace:

```text
.agents/hooks/
  block-destructive-bash/
    HOOK.md
    scripts/
      check.sh
  continue-on-failing-tests/
    HOOK.md
```

Directory-based hooks fit OAT better than a single aggregate markdown file because hook packages often need scripts, templates, or references. This also mirrors the skill packaging pattern and gives `create-agnostic-hook` a natural scaffold target.

#### Recommended `HOOK.md` frontmatter

```yaml
---
name: block-destructive-bash
description: Use when enforcing shell safety across providers.
events:
  - PreToolUse
matcher: Bash
handler:
  type: command
  command: ./scripts/check.sh
scope: project
portability:
  codex: supported
  claude: supported
extensions:
  x_claude: {}
  x_codex: {}
---
```

Key modeling rules:

- One canonical hook package should represent one logical policy or automation unit.
- The canonical surface should support only provider-overlap semantics by default:
  - event names in the common subset
  - command handlers
  - regex matcher
  - timeout
  - status message
- Provider-only fields should live in `x_claude` and `x_codex`.
- Unsupported exports should be explicit rather than silently dropped.

#### Why not make the canonical format Claude-shaped?

Because Claude's model is currently the superset, and using it as the canonical schema would push too many Claude-only assumptions into OAT:

- handler types Codex cannot consume
- event names Codex does not emit
- skill/agent-scoped lifecycle assumptions
- watcher-style hooks that have no Codex equivalent

The better design is "portable core, provider extensions", not "Claude schema with best-effort downgrade".

### 6. Existing Claude hook adoption is feasible, but only with classification

The user's migration requirement is realistic: OAT should be able to adopt existing Claude hooks and then adapt what is portable to Codex. But adoption needs classification because not every Claude hook should become a canonical portable hook.

#### Recommended adoption pipeline

1. Parse `.claude/settings.json` and `.claude/settings.local.json` hook blocks.
2. Optionally parse hooks found in skill and agent frontmatter, but treat those as phase-2 scope.
3. Split aggregate configuration into logical hook units.
4. Classify each unit:
   - portable command hook on overlapping event
   - Claude-only command hook
   - Claude-only advanced hook (`http`, `prompt`, `agent`, `async`)
   - embedded component hook
5. Materialize portable and near-portable units into `.agents/hooks/<name>/HOOK.md`.
6. Preserve provider-only data under `x_claude`.
7. Emit adoption warnings when no Codex export is possible.

#### Good candidates for automatic Claude -> Codex adaptation

- `SessionStart` command hooks
- `UserPromptSubmit` command hooks
- `PreToolUse` command hooks with `matcher: Bash`
- `PostToolUse` command hooks with `matcher: Bash`
- `Stop` command hooks

#### Needs downgrade or provider-local preservation

- Claude `Edit|Write` hooks -> no Codex runtime match today
- Claude MCP tool hooks -> no Codex peer today
- Claude async hooks -> Codex has no documented async hooks
- Claude prompt/agent/http hooks -> no Codex peer today
- Claude file/config/worktree/elicitation hooks -> no Codex peer today

This is a good fit for OAT's existing adoption logic in `packages/cli/src/commands/shared/adopt-stray.ts`, but hooks will need richer import/export metadata than rules do because the provider source is aggregate JSON, not single files.

### 7. Provider adapter design: hooks should be a sync extension, not only a path mapping

If OAT implements hooks, the provider architecture should probably evolve like this:

#### Core model changes

- Add `hook` to `ContentTypeSchema` in `packages/cli/src/shared/types.ts`.
- Extend scanner support for `.agents/hooks`.
- Extend manifest, drift, status, provider listing, and removal flows to understand hooks.
- Introduce canonical hook parsing/rendering utilities, analogous to agent codecs and rule transforms.

#### Provider export model

**Codex**

- Gather canonical hook packages that are enabled for Codex.
- Render them into a synthesized `.codex/hooks.json`.
- Track aggregate hash similarly to Codex config drift metadata.
- Support import from `.codex/hooks.json` into canonical hook packages.

**Claude**

- Gather canonical hook packages that are enabled for Claude.
- Merge them into `.claude/settings.json` under `hooks`.
- Preserve unmanaged non-hook settings.
- Support import from existing project settings into canonical hook packages.

#### Why plain `PathMapping` is not enough

Current `PathMapping` assumes a mapping like:

- canonical path -> provider path
- optional transform
- optional parse back to canonical

Hook export for Claude instead looks like:

- many canonical hook packages -> one JSON object nested inside an existing settings file

That requires aggregate synthesis and merge semantics, not just file fanout. OAT already has a precedent for this kind of exception in the Codex role/config export path, so hooks would not be conceptually out of place.

### 8. Recommended rollout for OAT

#### Phase 1: portable command-hook foundation

Ship:

- canonical `.agents/hooks/` format
- `create-agnostic-hook` skill
- Codex export/import for supported command-hook subset
- Claude project-settings export/import for supported command-hook subset
- status/drift/adopt support for canonical hooks

Do not ship in phase 1:

- Claude skill-scoped or agent-scoped hook sync
- Claude prompt/agent/http hook portability to Codex
- user-scope hook sync
- support for non-overlapping event sets as if they were portable

This phase gives users the most practical value with the least schema debt.

#### Phase 2: provider extensions and richer migration

Add:

- `x_claude` support for prompt/agent/http/async hook metadata
- adoption/import of Claude skill and agent frontmatter hooks
- richer diagnostics around non-portable hook definitions
- docs showing exact downgrade behavior into Codex

#### Phase 3: workflow-native OAT hook recipes

Add curated, OAT-specific hook bundles and docs:

- stop-time quality gates
- session-start project hydration
- canonical/provider drift reminders
- docs regeneration or index validation hints

### 9. Hooks can improve OAT workflows, but only some opportunities are portable

The user's second question was whether OAT itself could use hooks for smoother workflows beyond provider syncing. The answer is yes, with a clear split between portable and Claude-only opportunities.

#### Good portable opportunities

**Stop-time completion guard**

- Claude `Stop` and Codex `Stop` both provide a useful continuation gate.
- OAT could ship a recipe that checks for unfinished plan items, failed tests, or unresolved review actions before the agent stops.
- This aligns directly with OAT's "do not stop at clean boundaries" workflow philosophy.

**Session-start project hydration**

- On both providers, `SessionStart` can inject project-specific context.
- OAT could load active project state, current phase, latest review status, or repo conventions automatically.

**Prompt submission guardrails**

- On both providers, `UserPromptSubmit` can screen prompts for missing scope, secrets, or required workflow context.

**Bash safety and post-Bash review**

- Both providers can gate Bash usage or inject follow-up context after Bash runs.
- This is especially relevant for OAT commands with destructive or cross-provider implications.

#### Claude-only or mostly-Claude opportunities

**Instruction/config drift watchers**

- `InstructionsLoaded`, `ConfigChange`, and `FileChanged` can warn when provider views are stale or when generated artifacts drift.
- Codex has no current peer for these event families.

**Environment reloading**

- `CwdChanged` and `FileChanged` make Claude strong for repo-local env management.

**Subagent lifecycle quality gates**

- Claude's `SubagentStop` and task lifecycle hooks could enforce review or verification on delegated work.
- Codex currently does not document equivalent subagent hook points.

**Worktree orchestration**

- Claude's `WorktreeCreate` and `WorktreeRemove` can replace default git worktree behavior.
- Codex does not currently expose this lifecycle.

### 10. `create-agnostic-hook` is justified and should mirror the skill-authoring philosophy

There is enough cross-provider overlap to justify a dedicated scaffolding skill similar to `create-agnostic-skill`.

The skill should:

- default to the portable command-hook subset
- ask whether the hook is meant to target Codex, Claude, or both
- warn when the requested behavior is Claude-only
- scaffold:
  - `.agents/hooks/<name>/HOOK.md`
  - `scripts/` for command handlers
  - optional references/examples
- generate provider notes in the canonical frontmatter
- validate event compatibility before suggesting export

It should not pretend that all Claude hooks are portable. That honesty is part of the value.

### 11. Main risks and design traps

#### Trap 1: treating aggregate provider config like simple mirrored files

This will break down immediately for Claude hooks because they live inside `settings.json`, not a dedicated hook-per-file directory. The implementation has to be merge-aware.

#### Trap 2: making the canonical schema too Claude-shaped

If the canonical model bakes in HTTP/prompt/agent hooks, file watchers, or subagent lifecycle hooks as first-class portable concepts, Codex export will be mostly warning paths and user frustration.

#### Trap 3: overpromising Claude -> Codex migration

OAT can adopt existing Claude hooks, but it cannot make non-overlapping runtime capabilities appear in Codex. Migration should be framed as:

- preserve what exists canonically
- export the portable subset
- keep the rest as provider extensions or provider-local definitions

#### Trap 4: phase-1 support for skill/agent-scoped hooks

Claude supports hooks in skill and agent frontmatter, but Codex does not document an equivalent concept. If OAT starts there, the canonical schema becomes entangled with provider-specific component lifecycle semantics too early.

## Recommendation

OAT should support hooks, but as a staged provider-adapter feature with a strict portable-core design.

**Recommended decision**

- Add hooks as a new canonical OAT content family.
- Model them as directory-based canonical packages under `.agents/hooks/`.
- Make phase 1 intentionally narrow: command hooks plus the shared Codex/Claude event subset.
- Implement hook export/import as provider-specific synthesized config support, not only path-mapping fanout.
- Support adoption of existing Claude settings hooks, but classify and preserve non-portable features explicitly instead of hiding them.
- Add a `create-agnostic-hook` skill once the canonical shape is settled.

**What not to do**

- Do not market Claude and Codex hooks as interchangeable.
- Do not force Claude-only advanced hook types into the portable schema.
- Do not rely solely on `PathMapping` for hook sync.
- Do not start with skill/agent-scoped hooks as the canonical baseline.

This is a good fit for OAT's mission if it is framed as "portable where possible, explicit where provider-specific".

## Sources & References

### Official provider docs

1. OpenAI, "Codex Hooks" - `https://developers.openai.com/codex/hooks`
2. Anthropic, "Claude Code Hooks" - `https://code.claude.com/docs/en/hooks`
3. Anthropic, "Automate workflows with hooks" - `https://code.claude.com/docs/en/hooks-guide`

### OAT local references

4. `packages/cli/src/shared/types.ts`
5. `packages/cli/src/engine/scanner.ts`
6. `packages/cli/src/engine/compute-plan.ts`
7. `packages/cli/src/providers/shared/adapter.types.ts`
8. `packages/cli/src/providers/shared/adapter.utils.ts`
9. `packages/cli/src/providers/codex/codec/export-to-codex.ts`
10. `packages/cli/src/providers/codex/codec/import-from-codex.ts`
11. `packages/cli/src/commands/shared/adopt-stray.ts`
12. `apps/oat-docs/docs/provider-sync/providers.md`
13. `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
14. `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
15. `../../../.agents/docs/provider-reference.md`
