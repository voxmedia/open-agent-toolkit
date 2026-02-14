# Skill Guidance (Agent Skills + Provider Differences)

This document consolidates our findings about:
- the Agent Skills open standard (`agentskills.io`)
- how different providers interpret skills and YAML frontmatter
- which frontmatter fields are portable vs provider-specific

**Last updated:** 2026-02-02

---

## TL;DR (Cross-provider “safe defaults”)

If you want a skill to work across **Claude Code**, **Cursor**, **Codex CLI**, and **Gemini CLI** with minimal surprises:

1. Follow the Agent Skills spec folder layout and constraints (name/description, optional directories).
2. Keep the **frontmatter minimal** and conservative:
   - `name`: lowercase letters + numbers + hyphens, max 64, must match folder name, no leading/trailing hyphen
   - `description`: **single line**, ≤ 500 chars, describes *when to use* + *what*
3. Put detailed instructions in the Markdown body (and/or `references/`), not in `description`.
4. Treat most extra keys as **best-effort extensions**:
   - Claude Code supports many optional frontmatter keys.
   - Codex CLI explicitly ignores unknown keys.
   - Cursor + Gemini support a subset; some keys are undocumented.

---

## Canonical spec: Agent Skills (agentskills.io)

**Primary reference:** https://agentskills.io/specification

The Agent Skills spec defines the canonical file/folder format:

```
skill-name/
  SKILL.md          # Required
  scripts/          # Optional (executable helpers)
  references/       # Optional (supporting docs)
  assets/           # Optional (templates/resources)
```

### Required frontmatter (spec)

The spec requires YAML frontmatter + Markdown body in `SKILL.md`:

```
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

### Frontmatter fields (spec)

The spec defines these fields and constraints:

| Field | Required | Constraints / Notes |
|---|---:|---|
| `name` | Yes | Max 64 chars. Lowercase letters, numbers, hyphens only. Must not start/end with `-`. |
| `description` | Yes | Max 1024 chars. Non-empty. Describe what + when. Include keywords that help relevance selection. |
| `license` | No | License string or pointer to bundled license file. |
| `compatibility` | No | Max 500 chars. Environment requirements (packages, network, product assumptions). |
| `metadata` | No | Arbitrary key/value map. Use unique-ish keys to avoid collisions. |
| `allowed-tools` | No | **Experimental**. Space-delimited list (e.g., `Bash(git:*) Read`). Support varies by implementation. |

### Progressive disclosure (spec)

The spec strongly encourages structuring skills so only `name` + `description` must load at “startup”; the full body and any supporting files load only when the agent activates the skill.

---

## Provider overview (what actually happens)

The spec defines the format; providers define the behavior.

### Cursor

Primary references:
- https://cursor.com/docs/context/skills
- https://cursor.com/docs/context/skills#frontmatter-fields

Key behavior (Cursor docs):
- Cursor loads skills from multiple locations (project + user), and also loads from Claude/Codex compatibility locations:
  - Project-level:
    - `.cursor/skills/`
    - `.claude/skills/` (Claude compatibility)
    - `.codex/skills/` (Codex compatibility)
  - User-level:
    - `~/.cursor/skills/`
    - `~/.claude/skills/` (Claude compatibility)
    - `~/.codex/skills/` (Codex compatibility)
- Default invocation behavior is “agent decides”: skills can be auto-applied when relevant.
- Cursor documents a `disable-model-invocation: true` flag that makes a skill behave like a traditional slash command (only included when explicitly invoked).

Documented frontmatter keys (Cursor):
- `name` (required; lowercase letters/numbers/hyphens; must match parent folder)
- `description` (required)
- `license` (optional)
- `compatibility` (optional)
- `metadata` (optional)
- `disable-model-invocation` (optional)

Other fields (e.g., `allowed-tools`) are **not documented** as supported in Cursor’s skills docs. Treat them as unsupported/unknown unless validated empirically.

### Claude Code

Primary references:
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/skills#frontmatter-reference
- https://code.claude.com/docs/en/skills#control-who-invokes-a-skill
- https://code.claude.com/docs/en/skills#run-skills-in-a-subagent
- https://code.claude.com/docs/en/skills#inject-dynamic-context
- https://code.claude.com/docs/en/skills#pass-arguments-to-skills
- https://code.claude.com/docs/en/plugins

Key behavior (Claude docs):
- **Skills subsume “custom slash commands”**:
  - A file at `.claude/commands/review.md` and a skill at `.claude/skills/review/SKILL.md` both create `/review`.
  - Existing `.claude/commands/**` keeps working, but skills add optional features (supporting files, invocation control, auto-load when relevant).
- Skills can be discovered from nested directories (see docs) and have both user and project scope.
- Claude may load many skill descriptions into context; there is a character budget for skill discovery (see troubleshooting section and `SLASH_COMMAND_TOOL_CHAR_BUDGET`).

Where skills live (examples shown in docs):
- User-level (global): `~/.claude/skills/<skill-name>/SKILL.md`
- Project-level: `.claude/skills/<skill-name>/SKILL.md`

#### Plugin-provided skills, namespacing, and collisions

Claude Code distinguishes between:
- **Standalone skills** (in `.claude/skills/**` and `~/.claude/skills/**`)
- **Plugin-provided skills** (installed as part of a Claude Code plugin)

**Namespacing**
- Plugin-provided skills are namespaced (e.g., `plugin-name:skill-name`) to prevent conflicts with non-plugin skills.
- Plugin-provided slash commands are also namespaced (e.g., `/plugin-name:command-name`); standalone skills/commands use unprefixed names like `/hello`.

**Collision precedence**
- When skills share the same name across levels, Claude Code prioritizes: **enterprise > personal > project**.
- If a **skill** and a **legacy slash command** (from `.claude/commands/`) share the same name, the **skill takes precedence**.

#### Nested discovery vs “flat-only” reports

Claude’s skills docs include a section titled “Automatic discovery from nested directories”, which implies nested layouts are supported.

If you observe “flat-only” behavior in practice (skills not discovered when placed in subdirectories), the safest workarounds are:
- Flatten (temporary): keep skills directly under `~/.claude/skills/<skill>/SKILL.md`
- Symlink (preferred): keep a structured skills repo elsewhere and symlink individual skills into Claude’s discovery directory

Claude frontmatter fields (from Claude’s “Frontmatter reference” table):

| Field | Notes |
|---|---|
| `name` | Optional display name; if omitted, uses directory name. Constraints: lowercase letters, numbers, hyphens (max 64). |
| `description` | Recommended; used for relevance decisions. If omitted, uses first paragraph of body. |
| `argument-hint` | Shown during autocomplete to indicate expected args (e.g. `[issue-number]`). |
| `disable-model-invocation` | When `true`, prevents Claude from auto-loading the skill (manual invocation). |
| `user-invocable` | When `false`, hides from `/` menu (Claude-only invocation). |
| `allowed-tools` | Tools Claude can use without asking permission when the skill is active. |
| `model` | Model selection when skill is active. |
| `context` | Set to `fork` to run in a forked subagent context. |
| `agent` | Which subagent type to use when `context: fork` is set. |
| `hooks` | Hooks scoped to the skill lifecycle (see “Hooks in skills and agents”). |

Claude invocation controls are unusually rich:
- `disable-model-invocation: true` → user must invoke the skill (good for side-effect workflows)
- `user-invocable: false` → Claude can use it, but user won’t see it as a slash command (good for background knowledge)

### Codex CLI (OpenAI)

Primary references:
- https://developers.openai.com/codex/skills/
- https://developers.openai.com/codex/skills/create-skill

Key behavior (Codex docs):
- Skills follow a similar `SKILL.md` pattern, but Codex is stricter about **limits** and explicitly ignores unknown keys.
- Skills are discovered from multiple locations (repo + user + admin + system). Codex does **not** deduplicate same-named skills; multiple can appear in selectors.

Skill locations (Codex docs):
- Repo-level:
  - `$CWD/.codex/skills` (current working dir you launch Codex in)
  - `$CWD/../.codex/skills` (parent folder when launching inside a Git repo)
  - `$REPO_ROOT/.codex/skills` (topmost repo root)
- User-level: `$CODEX_HOME/skills` (default: `~/.codex/skills`)
- Admin-level: `/etc/codex/skills`
- System-level: bundled with Codex

Frontmatter rules (Codex docs, “Create skills”):
- Required:
  - `name`: non-empty, **≤ 100 chars**, **single line**
  - `description`: non-empty, **≤ 500 chars**, **single line**
  - Note: the Agent Skills spec is more conservative (`name` max 64 chars); if you want maximum portability, stay within spec limits.
- **⚠️ Critical for cross-provider compatibility:** Codex **ignores extra keys**.
  - ✅ You can include Claude/Cursor-specific keys without breaking Codex
  - ❌ You cannot depend on those keys affecting Codex behavior
  - ✅ Treat `name` + `description` as your portable interface
- The Markdown body stays on disk and **is not injected into runtime context unless explicitly invoked**.

Codex also shows an optional `short-description` key in examples (treat as Codex-specific).

### Gemini CLI

Primary references:
- https://geminicli.com/docs/cli/skills/
- https://geminicli.com/docs/cli/creating-skills/

Key behavior (Gemini docs):
- Gemini CLI uses progressive disclosure + explicit user consent on activation.
- Skills can live in:
  - Workspace: `.gemini/skills/` (highest precedence)
  - User: `~/.gemini/skills/`
  - Extension skills (bundled in installed extensions)
- Precedence when names collide: **Workspace > User > Extension**
- On activation (via `activate_skill`), Gemini shows a confirmation prompt that includes the directory path the skill will gain access to. On approval:
  - `SKILL.md` body + folder structure are added to conversation history
  - the directory is added to allowed file paths (so it can read bundled assets)

Frontmatter (Gemini docs, “Creating Agent Skills”):
- Gemini’s “Creating skills” guide documents:
  - `name` (should match the directory name)
  - `description`
- Other Agent Skills spec fields (e.g., `license`, `compatibility`, `metadata`, `allowed-tools`) are **not documented** in Gemini’s guide; treat support as unknown unless validated.

---

## Frontmatter compatibility matrix (practical)

Legend:
- ✅ documented support
- ⚠️ supported but provider-specific semantics
- 💤 ignored (documented)
- ❓ not documented / unknown (test before relying)

| Field | Agent Skills spec | Cursor | Claude Code | Codex CLI | Gemini CLI |
|---|---|---|---|---|---|
| `name` | ✅ required | ✅ required | ✅ optional | ✅ required | ✅ documented |
| `description` | ✅ required | ✅ required | ✅ recommended | ✅ required | ✅ documented |
| `license` | ✅ optional | ✅ optional | ❓ | 💤 ignored (extra keys) | ❓ |
| `compatibility` | ✅ optional | ✅ optional | ❓ | 💤 ignored (extra keys) | ❓ |
| `metadata` | ✅ optional | ✅ optional | ❓ | 💤 ignored (extra keys) | ❓ |
| `allowed-tools` | ⚠️ experimental | ❓ | ✅ | 💤 ignored (extra keys) | ❓ |
| `disable-model-invocation` | ❌ | ✅ | ✅ | 💤 ignored (extra keys) | ❓ |
| `user-invocable` | ❌ | ❓ | ✅ | 💤 ignored (extra keys) | ❓ |
| `argument-hint` | ❌ | ❓ | ✅ | 💤 ignored (extra keys) | ❓ |
| `model` | ❌ | ❓ | ✅ | 💤 ignored (extra keys) | ❓ |
| `context` / `agent` (subagent) | ❌ | ❓ | ✅ | 💤 ignored (extra keys) | ❓ |
| `hooks` (skill-scoped hooks) | ❌ | ❓ | ✅ | 💤 ignored (extra keys) | ❓ |
| `short-description` | ❌ | ❓ | ❓ | ⚠️ example-only | ❓ |

Notes:
- Cursor explicitly documents “Claude compatibility” and “Codex compatibility” directories. That does **not** necessarily imply Cursor supports all Claude/Codex-only frontmatter fields.
- Codex’s “ignores extra keys” clause means you can keep Claude/Cursor-only keys in a shared repo without breaking Codex, but you cannot *depend* on them in Codex behavior.

---

## Skill name collision behavior

When multiple skills share the same name, providers differ in which one “wins”:

| Provider | Collision behavior |
|---|---|
| Claude Code | **enterprise > personal > project**; plugin-provided skills are namespaced (e.g. `plugin-name:skill-name`) and won’t collide with non-plugin skills. |
| Cursor | Not clearly documented; empirically validate whether workspace overrides user (and how extension/bundled skills interact). |
| Codex CLI | Does **not** deduplicate: multiple same-named skills can appear in selectors. |
| Gemini CLI | **Workspace > User > Extension**. |

---

## Invocation and “who can invoke this?”

Different providers implement different notions of invocation:

### Agent Skills spec

The spec’s model is:
- `name` + `description` are used at discovery time.
- The full `SKILL.md` is only loaded when the agent activates the skill.
- Beyond that, it intentionally leaves “invocation policy” to implementations.

### Cursor and Claude: `disable-model-invocation`

Both Cursor and Claude document a `disable-model-invocation: true` flag.

Conceptually:
- default behavior: the agent can auto-apply the skill when relevant
- `disable-model-invocation: true`: only include the skill when explicitly invoked (slash-command behavior)

In OAT, we often default workflow-heavy skills to `disable-model-invocation: true` to avoid accidental triggers (especially when skills can edit files / run commands).

### Claude-only: `user-invocable`

Claude supports:
- `user-invocable: false`: hide from `/` menu (Claude can still use it)

This is useful for “background knowledge” skills that should be applied opportunistically, but aren’t meaningful user actions.

### Gemini: `activate_skill` + explicit consent

Gemini CLI uses a confirmation prompt when a skill is activated (showing directory access), then injects the skill body + folder structure after approval.

### Codex: explicit invocation controls what loads

Codex explicitly states:
- only `name` + `description` are loaded by default
- the skill body is not injected unless explicitly invoked

So “auto-invocation safety” is partially handled via what actually gets loaded into context.

---

## Tool access, safety, and “allowed tools”

### Agent Skills spec: `allowed-tools` is experimental

The open standard defines an `allowed-tools` field as an *experimental* capability; support varies.

### Claude: `allowed-tools` is meaningful

Claude documents `allowed-tools` as “tools Claude can use without asking permission when this skill is active”.

If you rely on `allowed-tools` for security, treat it as Claude-specific and still write the body defensively (confirm before destructive actions; prefer dry-run).

### Gemini: directory access is explicit at activation time

Gemini CLI’s consent prompt and allowed-path behavior means the skill’s directory access boundary is important:
- bundle only what the agent needs
- avoid placing secrets in the skill directory

### OAT guidance

We use `allowed-tools` in OAT skills as:
- a “best-effort” provider hint (works well in Claude; may be ignored elsewhere)
- documentation for humans reviewing what a skill might do

---

## Arguments to skills

Only some providers document argument passing.

### Claude Code

Claude supports passing arguments to skills and has `argument-hint` for autocomplete UX.

Cross-provider guidance:
- If your skill relies on args, include a “Usage” section in the body with examples.
- Keep `description` generic enough for relevance selection, and put strict argument rules in the body.

---

## Subagents and dynamic context

### Claude Code

Claude supports:
- `context: fork` + `agent: ...` for subagent execution
- `hooks` scoped to skill lifecycle (“inject dynamic context”)

Cross-provider guidance:
- If you require subagents or hooks, treat the skill as Claude-optimized and provide a “fallback mode” in the body for providers without those capabilities.

---

## Skill authoring guidance (OAT conventions)

In this repo, we’ve found the following patterns materially improve skill reliability across providers:

### Description field best practices

The `description` is your **primary discovery interface** (and for some tools, your primary routing/trigger signal). Guidelines:

1. **Lead with triggering conditions**: start with “Use when…” / “Triggers when…” / “Run this to…”
2. **Keep it single-line**: Codex enforces single-line and length limits (≤ 500 chars)
3. **Include disambiguating keywords**: nouns + verbs that separate the skill from similar ones
4. **Avoid step-by-step summaries**: providers may route based on description without reading the full body

Examples:
- ❌ Bad: “Reviews code by checking spec compliance, then code quality, then creates PR”
- ✅ Good: “Use when reviewing code or checking PRs. Systematic quality and security analysis.”

### 1) Write for progressive disclosure

- Keep `description` short and keyword-rich.
- Keep the “main happy path” inside `SKILL.md`.
- Push bulk reference material into `references/` and only reference it when needed.

### 2) Prefer deterministic scripts for heavy lifting

If correctness matters, don’t rely on freeform agent reasoning for transformations:
- put deterministic logic into `scripts/`
- call scripts from the skill and then verify output

### 3) Use prominent progress banners for long-running skills

When a skill is multi-step or long-running, print progress banners (GSD-style) and a few “step indicators” so users know something is happening.

In OAT, see examples in:
- `.agent/skills/oat-*/SKILL.md`

### 4) Idempotence and “resume safety”

Skills should assume sessions can be interrupted and resumed:
- read the project state from disk
- don’t “start over” unless the user asks
- update state files (frontmatter) as the source of truth for resumption

---

## Recommended “cross-provider safe” frontmatter template

Use this as a starting point for a skill you want to work across providers:

```markdown
---
name: my-skill
description: One line summary of what this skill does and when to use it (<= 500 chars).
license: Apache-2.0
compatibility: Requires git and jq; intended for CLI-based coding agents.
metadata:
  author: example-org
  version: \"1.0\"
---

# My Skill

## When to use
- ...

## Instructions
- ...
```

Provider-specific additions (Claude/Cursor) can be layered on top, but treat them as non-portable:

```yaml
# Claude/Cursor extension fields (non-standard)
# disable-model-invocation: true
#
# Claude-only fields
# user-invocable: true
# argument-hint: \"[arg]\"
# allowed-tools: Read, Grep, Bash(git:*), Write
# context: fork
# agent: explore
```

---

## Sharing skills across teams (version control)

When sharing skills via Git (or distributing them internally), a few practices reduce surprises across providers:

1. **Keep the canonical format in-repo** (Agent Skills layout):
   - `skill-name/SKILL.md`
   - optional `scripts/`, `references/`, `assets/`
2. **Provide install/symlink instructions** for each provider you care about:
   - Cursor: `.cursor/skills/` (workspace) or `~/.cursor/skills/` (user)
   - Codex: `$REPO_ROOT/.codex/skills/` (repo) or `$CODEX_HOME/skills` (user)
   - Claude: `.claude/skills/` (project) or `~/.claude/skills/` (user); plugins support namespaced skills (`/plugin-name:skill-name`)
   - Gemini: `.gemini/skills/` (workspace) or `~/.gemini/skills/` (user)
3. **Document tested providers + expected behavior** (auto vs manual invocation, tool access assumptions, etc.).

If you want one repo to serve multiple tools cleanly, an `install.sh` (or Make target) that copies/symlinks your canonical skill folders into the right provider directories tends to be the most reliable approach.

---

## Validation and testing

### Spec-level validation (Agent Skills)

The Agent Skills project provides a validator:
- https://github.com/agentskills/agentskills/tree/main/skills-ref

### Repo-local validation (OAT)

This repo has a local validator script for OAT conventions:
- `.oat/scripts/validate-oat-skills.ts`
- `pnpm oat:validate-skills`

### Manual smoke tests (recommended)

For any non-trivial skill, test at least:
- discovery (does it show up?)
- manual invocation (does it load?)
- auto invocation (if applicable; does it trigger too often?)
- “resume safety” (interrupt + rerun; does it continue correctly?)

### Common test failures

- **Skill doesn’t appear**: check discovery location(s), collision behavior, and any provider-specific directory rules (and in Claude, the skill description character budget)
- **Wrong skill triggers**: description too broad; keyword overlap with a similar skill; missing “Use when …” trigger language
- **Scripts/refs not found**: path resolution issue; supporting files not bundled under the skill directory
- **Permission errors**: check provider tool permissions (Claude `allowed-tools`; Gemini activation scope; Codex sandbox/tool approvals)

---

## Reference links

Open standard:
- https://agentskills.io
- https://agentskills.io/specification
- https://github.com/agentskills/agentskills/tree/main/skills-ref

Cursor:
- https://cursor.com/docs/context/skills
- https://cursor.com/docs/context/skills#frontmatter-fields

Claude Code:
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/skills#frontmatter-reference
- https://code.claude.com/docs/en/skills#control-who-invokes-a-skill
- https://code.claude.com/docs/en/skills#run-skills-in-a-subagent
- https://code.claude.com/docs/en/skills#inject-dynamic-context
- https://code.claude.com/docs/en/skills#pass-arguments-to-skills
- https://code.claude.com/docs/en/plugins

Codex CLI:
- https://developers.openai.com/codex/skills/
- https://developers.openai.com/codex/skills/create-skill

Gemini CLI:
- https://geminicli.com/docs/cli/skills/
- https://geminicli.com/docs/cli/creating-skills/

OAT examples (this repo):
- `AGENTS.md` (skill registry + discovery)
- `.agent/skills/create-skill/SKILL.md`
- `.agent/skills/create-oat-skill/SKILL.md`
- `.agent/skills/oat-index/SKILL.md`
- `.agent/skills/oat-*/SKILL.md`
- `.oat/scripts/validate-oat-skills.ts`
