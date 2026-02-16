# Skills Research Reference

Agent Skills ecosystem research and notes across providers.

*Last updated: February 2026*

---

## The Agent Skills Standard

### Overview

Agent Skills is an open standard originally developed by Anthropic, released in late 2025, and now adopted by 27+ agent tools. The standard defines a portable format for packaging agent capabilities as directories containing a `SKILL.md` file with YAML frontmatter, plus optional `scripts/`, `references/`, and `assets/` directories.

**Spec:** https://agentskills.io/specification
**GitHub:** https://github.com/agentskills/agentskills

### Core Concepts

**A skill is a directory** with at minimum a `SKILL.md` file:

```
my-skill/
├── SKILL.md              # Required
├── scripts/              # Optional — executable code
├── references/           # Optional — documentation loaded on demand
└── assets/               # Optional — templates, binaries
```

**Progressive disclosure** is the core design principle:
1. **Metadata (always loaded):** `name` and `description` from YAML frontmatter — agents pre-load this at startup to decide relevance
2. **Instructions (loaded on activation):** Full SKILL.md Markdown body — loaded when the agent determines the skill is relevant to the current task
3. **Resources (loaded on demand):** Files in `scripts/`, `references/`, `assets/` — loaded only when SKILL.md references them via relative paths

### SKILL.md Frontmatter

**Required fields:**
```yaml
---
name: skill-name          # Max 64 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen
description: |            # Max 1024 chars, non-empty
  What this skill does and when to use it.
---
```

**Optional fields (spec-level):**
```yaml
---
name: skill-name
description: What it does
license: MIT                    # License name or reference to bundled file
compatibility: |                # Max 500 chars — intended product, system packages, network needs
  Requires Node.js 18+
allowed-tools: Read Grep Glob   # Space-delimited tool list (experimental)
metadata:                       # Arbitrary key-value pairs
  author: my-org
  version: "1.0"
---
```

### Spec Constraints

- SKILL.md should be **under 500 lines / ~5,000 tokens**
- Use **relative paths** from skill root: `See [guide](references/REFERENCE.md)`
- Keep file references **one level deep** from SKILL.md
- Scripts should be **self-contained** or clearly document dependencies
- Scripts should handle edge cases gracefully and write status to stderr, output to stdout

---

## Cross-Provider Safe Defaults

If you want a skill to work across Claude Code, Cursor, Codex CLI, and Gemini CLI with minimal surprises:

1. Follow the Agent Skills spec folder layout and constraints
2. Keep frontmatter minimal and conservative:
   - `name`: lowercase letters + numbers + hyphens, max 64 chars, must match folder name, no leading/trailing hyphen
   - `description`: **single line**, ≤ 500 chars (Codex enforces this), describes *when to use* + *what*
3. Put detailed instructions in the Markdown body (and/or `references/`), not in `description`
4. Treat extra frontmatter keys as **best-effort extensions**:
   - Claude Code supports many optional frontmatter keys
   - Codex CLI explicitly **ignores unknown keys** (safe to include, won't break, won't be used)
   - Cursor + Gemini support a subset; some keys are undocumented

### Cross-Provider Safe Template

```markdown
---
name: my-skill
description: Use when [triggering condition]. [What it does as disambiguation keywords] (<= 500 chars).
license: Apache-2.0
compatibility: Requires git and jq; intended for CLI-based coding agents.
metadata:
  author: my-org
  version: "1.0"
---

# My Skill

## When to use
- ...

## Instructions
- ...
```

Provider-specific fields can be layered on top but should be treated as non-portable:

```yaml
# Claude/Cursor extension fields (non-standard)
# disable-model-invocation: true
#
# Claude-only fields
# user-invocable: true
# argument-hint: "[arg]"
# allowed-tools: Read, Grep, Bash(git:*), Write
# context: fork
# agent: explore
# hooks: { ... }
```

---

## Frontmatter Compatibility Matrix

Legend: ✅ documented support | ⚠️ provider-specific semantics | 💤 ignored (documented) | ❓ not documented / unknown

| Field | Agent Skills Spec | Cursor | Claude Code | Codex CLI | Gemini CLI |
|-------|-------------------|--------|-------------|-----------|------------|
| `name` | ✅ required | ✅ required | ✅ optional¹ | ✅ required | ✅ documented |
| `description` | ✅ required | ✅ required | ✅ recommended² | ✅ required | ✅ documented |
| `license` | ✅ optional | ✅ optional | ❓ | 💤 ignored | ❓ |
| `compatibility` | ✅ optional | ✅ optional | ❓ | 💤 ignored | ❓ |
| `metadata` | ✅ optional | ✅ optional | ❓ | 💤 ignored | ❓ |
| `allowed-tools` | ⚠️ experimental | ❓ | ✅ | 💤 ignored | ❓ |
| `disable-model-invocation` | ❌ | ✅ | ✅ | 💤 ignored | ❓ |
| `user-invocable` | ❌ | ❓ | ✅ | 💤 ignored | ❓ |
| `argument-hint` | ❌ | ❓ | ✅ | 💤 ignored | ❓ |
| `model` | ❌ | ❓ | ✅ | 💤 ignored | ❓ |
| `context` / `agent` (subagent) | ❌ | ❓ | ✅ | 💤 ignored | ❓ |
| `hooks` (skill-scoped) | ❌ | ❓ | ✅ | 💤 ignored | ❓ |
| `short-description` | ❌ | ❓ | ❓ | ⚠️ example-only | ❓ |

¹ Claude Code uses directory name if `name` omitted
² Claude Code uses first paragraph of body if `description` omitted

**Key takeaway:** Codex's "ignores extra keys" means you can include Claude/Cursor-only fields without breaking Codex, but you cannot depend on them affecting Codex behavior. `name` + `description` are the only truly portable interface.

---

## Tool-Specific Implementations

### Claude Code

**Docs:** https://code.claude.com/docs/en/skills

**Skill locations (by precedence):**
1. Enterprise-managed skills
2. Personal: `~/.claude/skills/<skill-name>/SKILL.md`
3. Project: `.claude/skills/<skill-name>/SKILL.md`
4. Plugin skills: bundled with installed plugins (namespaced as `plugin-name:skill-name`)

**Claude Code-specific features:**
- `allowed-tools`: Restricts tools the agent can use without asking permission when skill is active. **Only meaningful in Claude Code.**
- `context: fork`: Runs the skill in a forked subagent context (separate context window). **Only supported in Claude Code.**
- `agent`: Specifies which subagent type to use when `context: fork` is set.
- `hooks`: Scoped hooks tied to skill lifecycle.
- `user-invocable: false`: Hides from `/` menu but Claude can still auto-invoke. Useful for "background knowledge" skills.
- `argument-hint`: Shown during autocomplete to indicate expected args.
- `skills` field in subagent frontmatter: Auto-loads specified skills into subagent context.
- **Skills subsume legacy commands:** A file at `.claude/commands/review.md` and a skill at `.claude/skills/review/SKILL.md` both create `/review`. Skills take precedence.

**Invocation:**
- Default: Model-invoked (Claude autonomously decides based on task + description)
- `disable-model-invocation: true`: User must explicitly invoke via `/` command
- Can also be referenced directly in prompts

**Collision behavior:** Enterprise > personal > project. Plugin skills are namespaced (`plugin-name:skill-name`) and won't collide with non-plugin skills. If a skill and a legacy slash command share the same name, the skill takes precedence.

### Cursor

**Docs:** https://cursor.com/docs/context/skills

**Skill locations:**
- Project:
  - `.cursor/skills/<skill-name>/SKILL.md`
  - `.claude/skills/<skill-name>/SKILL.md` (**Claude compatibility**)
  - `.codex/skills/<skill-name>/SKILL.md` (**Codex compatibility**)
- Personal:
  - `~/.cursor/skills/<skill-name>/SKILL.md`
  - `~/.claude/skills/<skill-name>/SKILL.md` (**Claude compatibility**)
  - `~/.codex/skills/<skill-name>/SKILL.md` (**Codex compatibility**)

**Notable:** Cursor explicitly reads from `.claude/skills/` and `.codex/skills/` for cross-tool compatibility. This means skills authored in `.claude/skills/` are automatically available in Cursor without symlinking.

**Documented frontmatter fields:**
- `name` (required; must match parent folder)
- `description` (required)
- `license`, `compatibility`, `metadata` (optional, per spec)
- `disable-model-invocation` (optional; makes skill slash-command-only)

**Invocation:** Default is "agent decides" — skills are auto-applied when relevant. `disable-model-invocation: true` restricts to explicit invocation only.

**Collision behavior:** Not clearly documented; needs empirical validation.

### Codex CLI (OpenAI)

**Docs:** https://developers.openai.com/codex/skills

**Skill locations (by precedence, high → low):**
1. `$CWD/.agents/skills` (repo — working directory)
2. `$CWD/../.agents/skills` (repo — parent folder)
3. `$REPO_ROOT/.agents/skills` (repo — root)
4. `$HOME/.agents/skills` (user)
5. `/etc/codex/skills` (admin)
6. Bundled system skills

> **Note (Feb 2026):** Codex has migrated from `.codex/skills` to `.agents/skills` at all repo and user scopes.

**Codex-specific behaviors:**
- **Uses `.agents/skills/` natively at all scopes** — Codex scans `.agents/skills/` from CWD up to repo root, plus `$HOME/.agents/skills` for user-level
- **Ignores unknown frontmatter keys** — you can include Claude/Cursor-specific fields without breaking Codex, but they won't affect behavior
- **Does NOT deduplicate** same-named skills — multiple can appear in selectors
- `name`: ≤ 100 chars, **single line** (spec says 64; use 64 for max portability)
- `description`: ≤ 500 chars, **single line** (spec says 1024; use 500 for max portability)
- Markdown body stays on disk and **is not injected unless explicitly invoked**
- Built-in `$skill-creator` and `$skill-installer` skills
- `/skills` slash command or `$` prefix for explicit invocation

**Invocation:** Both explicit (`$skill-name` or `/skills` selector) and implicit (model decides based on description). The body is only loaded on invocation, not at startup.

### Gemini CLI

**Docs:** https://geminicli.com/docs/cli/skills/

**Skill locations:**
- Workspace: `.gemini/skills/<skill-name>/SKILL.md` (highest precedence)
- User: `~/.gemini/skills/<skill-name>/SKILL.md`
- Extension skills (bundled in installed extensions)

**Gemini-specific behaviors:**
- Uses **explicit user consent** on activation — shows a confirmation prompt with directory path
- On approval: SKILL.md body + folder structure are added to conversation history, and the directory is added to allowed file paths
- Only `name` and `description` are documented as supported frontmatter; other spec fields (license, compatibility, etc.) are untested

**Collision behavior:** Workspace > User > Extension.

### GitHub Copilot

**Docs:** https://code.visualstudio.com/docs/copilot/customization/agent-skills

**Skill locations:**
- Project: `.github/skills/<skill-name>/SKILL.md`
- Personal: `~/.copilot/skills/<skill-name>/SKILL.md`

**Notes:** The `license` field may be required in practice even though the spec marks it optional (see https://github.com/github/copilot-cli/issues/894).

---

## Skill Name Collision Behavior

When multiple skills share the same name, providers differ:

| Provider | Collision Behavior |
|----------|-------------------|
| Claude Code | Enterprise > personal > project; plugin skills namespaced (`plugin-name:skill-name`) |
| Cursor | Not clearly documented; validate empirically |
| Codex CLI | Does **not** deduplicate — multiple same-named skills can appear in selectors |
| Gemini CLI | Workspace > User > Extension |

---

## Invocation Controls

### Who Can Invoke?

| Control | Spec | Cursor | Claude Code | Codex | Gemini |
|---------|------|--------|-------------|-------|--------|
| Agent auto-invokes | Default | Default | Default | Implicit | Via `activate_skill` |
| User explicit only | ❌ | `disable-model-invocation: true` | `disable-model-invocation: true` | Explicit `$` / `/skills` | Confirmation prompt |
| Hide from user, agent-only | ❌ | ❓ | `user-invocable: false` | ❌ | ❌ |

**Guidance for workflow-heavy skills:** Default to `disable-model-invocation: true` for skills that edit files, run commands, or have side effects — prevents accidental triggers.

---

## Distribution & Package Management

### `npx skills` CLI (Vercel)

**Repo:** https://github.com/vercel-labs/skills
**Directory:** https://skills.sh

Installs skills from GitHub repos, local paths, or GitLab URLs to any supported agent's native location.

**Installation methods:**
- **Symlink (recommended):** Single canonical copy, symlinked to each agent's path
- **Copy:** Independent copies for each agent (when symlinks aren't supported)

**Scopes:**
- Project (default): `./<agent>/skills/`
- Global (`-g`): `~/<agent>/skills/`

**Discovery paths searched** (when discovering skills in a repo):
`.agents/skills/`, `.claude/skills/`, `.codex/skills/`, `.cursor/skills/`, `.gemini/skills/`, `.github/skills/`, and 20+ more tool-specific paths. Falls back to recursive search if nothing found.

### Symlink Approach (Recommended)

Author skills in `.agents/skills/` (canonical) and distribute to provider-specific directories:

```bash
# Claude Code + Cursor (Cursor reads .claude/skills/ natively)
ln -s ../../.agents/skills/my-skill .claude/skills/my-skill

# GitHub Copilot
ln -s ../../.agents/skills/my-skill .github/skills/my-skill

# Codex reads .agents/skills/ natively at project level — no symlink needed
```

For automated distribution, use **OAT sync** (for local/internal skills) or **`npx skills add`** (for remote/community skills):

```bash
# OAT sync — manages local canonical → provider distribution with manifest tracking
oat sync --scope all --apply

# npx skills — installs remote skills from GitHub or skills.sh
npx skills add github-user/skill-repo -a claude-code -a github-copilot
```

**Result: one canonical source, two symlinks, four tools.**

**Note:** Cursor already reads `.claude/skills/` natively, so the Claude Code symlink covers both. Codex reads `.agents/skills/` at project level (per Vercel skills docs), eliminating its symlink entirely.

---

## Cross-Tool Compatibility (npx skills Matrix)

From the `npx skills` CLI compatibility matrix:

| Feature | Claude Code | Codex | Cursor | Copilot | Gemini CLI | Amp | Roo | OpenCode | Cline |
|---------|-------------|-------|--------|---------|------------|-----|-----|----------|-------|
| Basic skills | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `allowed-tools` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `context: fork` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hooks | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

Source: https://github.com/vercel-labs/skills#compatibility

---

## Proposed Spec Extensions

### `prerequisite-skills` / `related-skills` (Issue #90)

**URL:** https://github.com/agentskills/agentskills/issues/90

Would let skills declare dependencies on other skills. Relevant for skill chains where one skill should run before another.

---

## Best Practices (Distilled)

### Description Field

The `description` is your **primary routing mechanism** — it is "for routing, not reading" (Builder.io). Google's Antigravity docs call it "the most important field" and describe it as a "trigger phrase." The agentskills.io spec's own example is simply `description: When to use this skill`.

At startup, agents load *only* `name` + `description` across potentially 100+ skills, then semantic-match against the user's prompt. The body of SKILL.md already covers "what it does" once loaded. **The description's job is to win the routing decision.**

**Lead with "when", include "what" as disambiguation keywords:**

1. **Lead with triggering conditions**: "Use when…" / "Run this when…" / "Triggers when…"
2. **Include keywords for disambiguation**: nouns + verbs that differentiate from similar skills
3. **Keep it single-line**: Codex enforces single-line ≤ 500 chars
4. **Don't summarize the workflow**: providers route on description without reading the body

Examples:
- Bad: "Reviews code by checking spec compliance, then code quality, then creates PR"
- Bad: "Analyzes and audits AGENTS.md files for correctness and completeness"
- Good: "Use when you need to ensure AGENTS.md files accurately reflect the codebase. Validates commands, checks for stale paths, and identifies gaps."
- Good: "Use when reviewing code or checking PRs. Systematic quality and security analysis."

### Authoring

1. **Write for progressive disclosure** — short keyword-rich description, main instructions in body, bulk reference in `references/`
2. **Prefer deterministic scripts** — put correctness-critical logic in `scripts/`, not freeform agent reasoning
3. **Idempotence and resume safety** — read project state from disk, don't start over unless asked, use state files as source of truth
4. **Keep SKILL.md under 500 lines** — move reference material to separate files
5. **File references one level deep** — no deeply nested chains
6. **Use relative paths** from skill root

### Script Requirements

- Use `#!/bin/bash` shebang
- Use `set -e` for fail-fast behavior
- Write status messages to stderr: `echo "Message" >&2`
- Write machine-readable output (JSON) to stdout
- Include cleanup trap for temp files

### Naming

- Skill directory: kebab-case (`agents-md-audit`)
- `SKILL.md`: Always uppercase, always this exact filename
- Scripts: kebab-case.sh (`validate-commands.sh`)
- Name field: max 64 chars (use 64 for portability, even though Codex allows 100)

---

## Resolved Research Questions

### Q: How does `context: fork` interact with subagent `skills` field in Claude Code?

**Answer:** They serve different purposes and interact at different levels:

- **`context: fork` on a skill** causes the skill to run in an isolated sub-agent context with its own conversation history. You can specify `agent: Explore` (or any built-in/custom agent) to control the sub-agent type. The skill content becomes the task prompt injected into the forked context. Results are summarized and returned to the main conversation.
- **`skills` field on a subagent** pre-loads specified skills into the subagent's context, making them available for the subagent to invoke during its work.
- **Key difference (from Claude docs):** "With skills in a subagent, the subagent controls the system prompt and loads skill content. With `context: fork` in a skill, the skill content is injected into the agent you specify."
- **Known bug (Issue #17283):** As of January 2026, when a skill is invoked via the Skill tool programmatically, `context: fork` and `agent:` frontmatter fields may be ignored — the skill runs in the main conversation context instead. Workaround: restructure skills as custom agents if isolation is required.

**Source:** https://code.claude.com/docs/en/sub-agents, https://github.com/anthropics/claude-code/issues/17283

### Q: Can Codex's hierarchical skill scoping be leveraged for monorepo patterns?

**Answer:** Yes. Codex walks the directory tree from CWD up to repo root and loads skills from `.agents/skills/` at each level. The skill table shows explicit scoping:

| Scope | Location | Monorepo Use |
|-------|----------|-------------|
| CWD | `$CWD/.agents/skills` | Skills specific to a microservice or module |
| Parent | `$CWD/../.agents/skills` | Skills for a shared area in a parent folder |
| Repo Root | `$REPO_ROOT/.agents/skills` | Organization-wide skills; can be overridden by subfolder skills |

Same-named skills at a more specific scope overwrite those from a less specific scope. This mirrors the AGENTS.md "nearest file wins" pattern and is well-suited for monorepos where packages need different conventions.

**Source:** https://developers.openai.com/codex/skills, https://developers.openai.com/codex/config-advanced/, https://github.com/vercel-labs/skills

### Q: What's the practical token cost of skills via progressive disclosure vs. same content in AGENTS.md?

**Answer:** Significant savings. The architecture is:

1. **Discovery (always loaded):** Only `name` + `description` — approximately 50-100 tokens per skill. With 20 skills, that's ~1,000-2,000 tokens in the system prompt.
2. **Activation (on demand):** Full SKILL.md body loaded only when relevant. If a skill's body is 2,000 tokens but only needed for 20% of tasks, the expected cost per session is ~400 tokens vs. 2,000 if it were always in AGENTS.md.
3. **Resources (on demand):** Files in `references/`, `scripts/`, `assets/` are loaded only when SKILL.md explicitly references them. Scripts execute and return only their output — the script code itself never enters context.

**Key insight:** AGENTS.md content is loaded into every conversation. Skill content is loaded only when matched. For guidance that's needed in <50% of sessions, skills are significantly cheaper. For guidance needed in every session (project overview, build commands), AGENTS.md is appropriate.

**Source:** https://code.claude.com/docs/en/skills, https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/

### Q: How do skills interact with MCP tools in practice?

**Answer:** Skills and MCP tools are complementary but operate at different layers:

- **Skills** are instructions (what to do, how to do it). They modify Claude's prompt context.
- **MCP tools** are capabilities (access to external systems). They provide tools Claude can call.
- **`allowed-tools`** in skill frontmatter can reference MCP tools, granting them without per-use approval when the skill is active.
- **Limitation:** MCP tools are NOT available in background subagents. If a skill uses `context: fork` and runs in the background, MCP tools won't be accessible.
- **Pattern:** A skill can instruct Claude to use specific MCP tools as part of its workflow (e.g., "use the github MCP server to fetch PR details"). The skill provides the methodology; MCP provides the tooling.

MCP server schemas do load at startup and consume context whether used or not — this is a known overhead. Dynamic `list_changed` notifications (Claude Code 2.1+) help by allowing MCP servers to update available tools mid-session.

**Source:** https://code.claude.com/docs/en/skills, https://paddo.dev/blog/claude-code-21-pain-points-addressed/

### Q: Will `prerequisite-skills` make it into the spec? Timeline?

**Answer:** Unclear. Issue #90 was opened January 16, 2026 and remains open. It proposes two optional fields:
- `prerequisite-skills`: Skills that should ideally run before this skill
- `related-skills`: Complementary skills that work well together

The proposal has community interest but no official timeline or maintainer response indicating it's being worked on.

**Workaround:** Reference prerequisite skills in the SKILL.md body instructions (e.g., "Before running this skill, invoke the agents-md-audit skill first"). This works across all providers since it's just instruction text.

**Source:** https://github.com/agentskills/agentskills/issues/90

### Q: Is there an emerging standard for skill testing/validation?

**Answer:** Fragmented but growing:

- **agentskills/skills-ref** (official): Basic spec-level validation (frontmatter format, naming constraints)
- **Empirical testing** (recommended): The Claude docs recommend a "Claude A / Claude B" testing pattern — use one Claude instance (A) to author/refine the skill, and another instance (B) to test it with real tasks. Observe B's behavior and bring insights back to A.
- **Manual smoke tests** remain the standard practice: discovery (does it show up?), manual invocation (does it load?), auto-invocation (triggers correctly/not too often?), resume safety (interrupt + rerun)
- **No formal testing framework** exists for skills across providers. Each provider has different discovery and invocation mechanics that need individual validation.

**Source:** https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices, https://github.com/agentskills/agentskills/tree/main/skills-ref

### Q: Cursor reads `.claude/skills/` natively — does this make `.agents/skills/` + symlinks unnecessary?

**Answer:** No. While Cursor reading `.claude/skills/` is convenient, it only covers two of four required tools:

| Tool | Native Path | Reads `.claude/skills/`? | Reads `.agents/skills/`? |
|------|-------------|--------------------------|--------------------------|
| Claude Code | `.claude/skills/` | ✅ (native) | ❌ |
| Cursor | `.cursor/skills/` | ✅ (cross-compat) | ❌ |
| Codex CLI | `.agents/skills/` | ❌ | ✅ (project level) |
| GitHub Copilot | `.github/skills/` | ❌ | ❌ |

**Recommended approach:** Author skills in `.agents/skills/` (tool-agnostic canonical source), then symlink only where needed:

```bash
# Only two symlinks needed:
ln -s ../../.agents/skills/my-skill .claude/skills/my-skill    # Claude Code + Cursor
ln -s ../../.agents/skills/my-skill .github/skills/my-skill    # GitHub Copilot
# Codex reads .agents/skills/ natively at project level — no symlink needed
```

**One canonical source, two symlinks, four tools.**

**Note (updated Feb 2026):** Codex now reads `.agents/skills/` natively at both project level (`$CWD/.agents/skills` up to `$REPO_ROOT/.agents/skills`) and user level (`$HOME/.agents/skills`). No symlinks needed for Codex at any scope.

**Source:** https://cursor.com/docs/context/skills, https://code.visualstudio.com/docs/copilot/customization/agent-skills, https://developers.openai.com/codex/skills, https://github.com/vercel-labs/skills

### Q: How does Claude Code's skill description character budget interact with many installed skills?

**Answer:** This is a real constraint with specific numbers:

- **Budget:** ~16,000 characters (scales dynamically at 2% of context window, fallback 16,000 chars)
- **Per-skill overhead:** ~109 characters of XML structure + description length
- **At 63 skills:** One user reported only 42 of 63 skills were visible (33% hidden)
- **No warning by default** — skills silently disappear. Run `/context` to check for a warning about excluded skills.
- **Override:** Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable to increase the limit.

**Practical guidelines for description length based on skill count:**
- 60+ skills: Keep descriptions ≤ 130 characters
- 40-60 skills: Keep descriptions ≤ 150 characters
- <40 skills: Standard ≤ 500 character limit is fine

**Front-load trigger keywords in the first 50 characters** since truncation may occur.

**Source:** https://github.com/anthropics/claude-code/issues/13099, https://code.claude.com/docs/en/skills

### Q: Does Cursor actually support `allowed-tools` or just not error on it?

**Answer:** Uncertain. The `npx skills` compatibility matrix marks `allowed-tools` as ✅ for Cursor, but Cursor's own documentation does not explicitly document the field. Their docs only list `name`, `description`, `license`, `compatibility`, `metadata`, and `disable-model-invocation` as supported frontmatter.

The safe assumption: Cursor likely doesn't error on `allowed-tools` (similar to Codex's "ignore unknown keys" behavior), but whether it actually restricts tool access based on the field is unconfirmed. Treat `allowed-tools` as **Claude Code-specific for enforcement** and include it as a documentation signal for other tools.

**Source:** https://cursor.com/docs/context/skills, https://github.com/vercel-labs/skills#compatibility

---

## Remaining Open Questions

- [ ] How does the skills/commands/subagents convergence play out? (Vivek Haldar's analysis suggests they're merging into a single primitive with `context: main|fork`)
- [ ] What's the right skill count ceiling for a shared library before description budget becomes a real constraint?
- [ ] How do managed/enterprise skill deployment mechanisms differ across providers?
- [ ] Will the Agent Skills spec add a formal testing/validation framework?
- [ ] Does Codex read `.agents/skills/` at user level (`~/.agents/skills/`) or only project level?
