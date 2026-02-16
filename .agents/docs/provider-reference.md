# AI Agent Infrastructure — Provider Documentation Reference

Quick reference for skills, subagents, hooks, and agent instructions across all major AI coding tools.

*Last updated: February 2026*

---

## Open Standards

### Agent Skills Specification
The open standard for portable agent skills, originally developed by Anthropic.

| Resource | URL |
|----------|-----|
| **Specification home** | https://agentskills.io |
| **Specification details** | https://agentskills.io/specification |
| **What are skills?** | https://agentskills.io/what-are-skills |
| **Integrate skills (for tool authors)** | https://agentskills.io/integrate-skills |
| **GitHub repo** | https://github.com/agentskills/agentskills |
| **Reference library (validation)** | https://github.com/agentskills/agentskills/tree/main/skills-ref |
| **Anthropic example skills** | https://github.com/anthropics/skills |

### AGENTS.md
The universal agent instruction format. Hierarchical, proximity-based precedence.

| Resource | URL |
|----------|-----|
| **AGENTS.md specification** | https://agents-md.org (if available) |
| **Google AGENTS.md blog post** | https://developers.googleblog.com/en/agents-md/ |
| **GitHub: agents-md org** | https://github.com/agents-md |

---

## Ecosystem Tooling

### `npx skills` CLI (Vercel)
The package manager for the agent skills ecosystem. Installs skills across 27+ agent tools.

| Resource | URL |
|----------|-----|
| **CLI repo (vercel-labs/skills)** | https://github.com/vercel-labs/skills |
| **Skills directory** | https://skills.sh |
| **Supported agents table** | https://github.com/vercel-labs/skills#supported-agents |
| **Skill discovery paths** | https://github.com/vercel-labs/skills#skill-discovery |
| **Compatibility matrix** | https://github.com/vercel-labs/skills#compatibility |
| **Vercel agent-skills collection** | https://github.com/vercel-labs/agent-skills |
| **Changelog announcement** | https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem |

### Community Resources

| Resource | URL |
|----------|-----|
| **awesome-claude-code** | https://github.com/hesreallyhim/awesome-claude-code |
| **sub-agents-mcp (cross-tool)** | https://github.com/shinpr/sub-agents-mcp |

---

## Claude Code (Anthropic)

### Skills

| Resource | URL |
|----------|-----|
| **Skills overview** | https://code.claude.com/docs/en/skills |
| **Frontmatter reference** | https://code.claude.com/docs/en/skills#frontmatter-reference |
| **Control who invokes a skill** | https://code.claude.com/docs/en/skills#control-who-invokes-a-skill |
| **Run skills in a subagent** | https://code.claude.com/docs/en/skills#run-skills-in-a-subagent |
| **Inject dynamic context** | https://code.claude.com/docs/en/skills#inject-dynamic-context |
| **Pass arguments to skills** | https://code.claude.com/docs/en/skills#pass-arguments-to-skills |
| **Best practices** | https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices |
| **Agent Skills overview (docs.claude.com)** | https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview |
| **Quickstart** | https://docs.claude.com/en/docs/agents-and-tools/agent-skills/quickstart |
| **Skills in Agent SDK** | https://docs.claude.com/en/docs/agent-sdk/skills |
| **Engineering blog: Equipping agents** | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills |

**Skill locations:**
- Project: `.claude/skills/<skill-name>/SKILL.md`
- Personal: `~/.claude/skills/<skill-name>/SKILL.md`
- Plugin: bundled with installed plugins

### Subagents

| Resource | URL |
|----------|-----|
| **Subagents documentation** | https://code.claude.com/docs/en/sub-agents |
| **Subagents in Agent SDK** | https://platform.claude.com/docs/en/agent-sdk/sub-agents |

**Subagent locations:**
- Project: `.claude/agents/<name>.md`
- Personal: `~/.claude/agents/<name>.md`

**Key frontmatter fields:** `name`, `description`, `tools`, `model`, `permissionMode`, `skills`

### Hooks

| Resource | URL |
|----------|-----|
| **Hooks guide (getting started)** | https://code.claude.com/docs/en/hooks-guide |
| **Hooks reference (full API)** | https://code.claude.com/docs/en/hooks |
| **Hooks reference (docs.claude.com)** | https://docs.claude.com/en/docs/claude-code/hooks |
| **Hooks in Agent SDK** | https://platform.claude.com/docs/en/agent-sdk/hooks |

**Hook events:** `SessionStart`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `PermissionRequest`, `Notification`, `Stop`, `SubagentStop`, `TaskCompleted`, `PreCompact`, `SessionEnd`, `TeammateIdle`, `Setup`

**Hook types:** `command` (shell), `prompt` (LLM evaluation), `agent` (subagent verification)

### Plugins

| Resource | URL |
|----------|-----|
| **Plugins documentation** | https://code.claude.com/docs/en/plugins |
| **Plugin components reference** | https://code.claude.com/docs/en/plugins-reference |
| **Plugins in Agent SDK** | https://platform.claude.com/docs/en/agent-sdk/plugins |

### Other Claude Code Resources

| Resource | URL |
|----------|-----|
| **Settings & configuration** | https://code.claude.com/docs/en/settings |
| **Output styles** | https://code.claude.com/docs/en/output-styles |
| **Headless mode** | https://code.claude.com/docs/en/headless |
| **MCP integration** | https://code.claude.com/docs/en/mcp |
| **Model configuration** | https://code.claude.com/docs/en/model-config |
| **CLI reference** | https://code.claude.com/docs/en/cli-reference |
| **Migrate to Agent SDK** | https://code.claude.com/docs/en/sdk/migration-guide |
| **Slash commands** | https://code.claude.com/docs/en/slash-commands |

---

## Cursor

### Skills

| Resource | URL |
|----------|-----|
| **Skills documentation** | https://cursor.com/docs/context/skills |
| **Frontmatter fields** | https://cursor.com/docs/context/skills#frontmatter-fields |

**Skill locations:**
- Project: `.cursor/skills/<skill-name>/SKILL.md`
- Personal: `~/.cursor/skills/<skill-name>/SKILL.md`
- **Claude compatibility:** `.claude/skills/` (project) and `~/.claude/skills/` (personal)
- **Codex compatibility:** `.codex/skills/` (project) and `~/.codex/skills/` (personal)

### Subagents

| Resource | URL |
|----------|-----|
| **Subagents documentation** | https://cursor.com/docs/context/subagents |

**Subagent locations:**
- Project: `.cursor/agents/<name>.md`

### Rules

| Resource | URL |
|----------|-----|
| **Rules documentation** | https://cursor.com/docs/context/rules |

**Rules location:** `.cursor/rules/*.mdc`

### Other Cursor Resources

| Resource | URL |
|----------|-----|
| **Cursor docs home** | https://cursor.com/docs |

---

## Codex CLI (OpenAI)

### Skills

| Resource | URL |
|----------|-----|
| **Skills documentation** | https://developers.openai.com/codex/skills |
| **Create a skill** | https://developers.openai.com/codex/skills/create-skill |
| **OpenAI skills collection** | https://github.com/openai/skills |

**Skill locations (by precedence, high → low):**
- `$CWD/.agents/skills` (repo — working directory)
- `$CWD/../.agents/skills` (repo — parent)
- `$REPO_ROOT/.agents/skills` (repo — root)
- `$HOME/.agents/skills` (user)
- `/etc/codex/skills` (admin)
- Bundled system skills

> **Note (Feb 2026):** Codex has migrated from `.codex/skills` to `.agents/skills` at all repo and user scopes. See [Codex skills docs](https://developers.openai.com/codex/skills) for current paths.
>
> If two skills share the same `name`, Codex does not merge them; both can appear in skill selectors.

### Subagents

| Resource | URL |
|----------|-----|
| **Codex agents (experimental)** | `.codex/agents/` (documentation pending) |

### Other Codex Resources

| Resource | URL |
|----------|-----|
| **Codex home** | https://developers.openai.com/codex |
| **AGENTS.md instructions** | https://developers.openai.com/codex/guides/agents-md |
| **Config file** | https://developers.openai.com/codex/local-config |
| **MCP** | https://developers.openai.com/codex/mcp |
| **SDK** | https://developers.openai.com/codex/sdk |
| **GitHub Action** | https://developers.openai.com/codex/github-action |

---

## Gemini CLI (Google)

### Skills

| Resource | URL |
|----------|-----|
| **Skills documentation** | https://geminicli.com/docs/cli/skills/ |
| **Creating skills** | https://geminicli.com/docs/cli/creating-skills/ |

**Skill locations:**
- Project: `.gemini/skills/<skill-name>/SKILL.md`
- Personal: `~/.gemini/skills/<skill-name>/SKILL.md`

### Other Gemini Resources

| Resource | URL |
|----------|-----|
| **Gemini CLI docs** | https://geminicli.com/docs/ |
| **GEMINI.md instructions** | Uses `GEMINI.md` for tool-specific instructions |

---

## GitHub Copilot

### Skills

| Resource | URL |
|----------|-----|
| **Agent Skills in VS Code** | https://code.visualstudio.com/docs/copilot/customization/agent-skills |
| **About Agent Skills** | https://docs.github.com/en/copilot/concepts/agents/about-agent-skills |

**Skill locations:**
- Project: `.github/skills/<skill-name>/SKILL.md`
- Personal: `~/.copilot/skills/<skill-name>/SKILL.md`

### Other Copilot Resources

| Resource | URL |
|----------|-----|
| **Copilot instructions** | `.github/copilot-instructions.md` |
| **Copilot CLI** | https://github.com/github/copilot-cli |

---

## Other Notable Tools

### Amp
- Project skills: `.agents/skills/` (uses the tool-agnostic namespace natively)
- Global skills: `~/.config/agents/skills/`
- Docs: https://ampcode.com/manual#agent-skills

### Windsurf
- Project skills: `.windsurf/skills/`
- Rules: `.windsurf/rules/*.md`
- Docs: https://docs.codeium.com/windsurf

### Roo Code
- Project skills: `.roo/skills/`
- Docs: https://docs.roocode.com/features/skills

### OpenCode
- Project skills: `.opencode/skills/`
- Docs: https://opencode.ai/docs/skills

### Cline
- Project skills: `.cline/skills/`
- Docs: https://docs.cline.bot/features/skills

---

## Cross-Cutting References

### Tool-Specific Instruction Files

| Tool | File / Location | Scope |
|------|----------------|-------|
| **All tools** | `AGENTS.md` (any directory) | Universal, hierarchical |
| Claude Code | `CLAUDE.md` | Claude-specific |
| Cursor | `.cursor/rules/*.mdc` | Cursor-specific |
| Copilot | `.github/copilot-instructions.md` | Copilot-specific |
| Gemini | `GEMINI.md` | Gemini-specific |
| Windsurf | `.windsurf/rules/*.md` | Windsurf-specific |

### Proposed Spec Extensions (Watch)

| Proposal | URL | Status |
|----------|-----|--------|
| `prerequisite-skills` / `related-skills` | https://github.com/agentskills/agentskills/issues/90 | Open proposal |

### Deep Dives & Analysis

| Resource | URL |
|----------|-----|
| **Agent Skills deep dive (first principles)** | https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/ |
| **Agent Skills overview (inference.sh)** | https://inference.sh/blog/skills/agent-skills-overview |
| **Claude Code hooks mastery** | https://github.com/disler/claude-code-hooks-mastery |
| **Builder.io: Skills vs Rules vs Commands** | https://www.builder.io/blog/agent-skills-rules-commands |
| **Skills/Commands/Subagents converging** | https://www.vivekhaldar.com/articles/claude-code-subagents-commands-skills-converging/ |
| **Claude Code 2.1 analysis (context: fork, hooks)** | https://paddo.dev/blog/claude-code-21-pain-points-addressed/ |
| **Google Antigravity skills codelab** | https://codelabs.developers.google.com/getting-started-with-antigravity-skills |
| **Agent Skills as quality contracts (BEN ABT)** | https://benjamin-abt.com/blog/2026/02/12/agent-skills-standard-github-copilot/ |
| **Agent Skills + Mastra integration** | https://vadim.blog/2026/02/08/agent-skills-spec |
| **Claude Code skills authoring best practices** | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices |
| **Codex advanced config (hierarchical scoping)** | https://developers.openai.com/codex/config-advanced/ |

### Key GitHub Issues

| Resource | URL |
|----------|-----|
| **Spec: prerequisite-skills proposal (#90)** | https://github.com/agentskills/agentskills/issues/90 |
| **Spec: skill installation location (#106)** | https://github.com/agentskills/agentskills/issues/106 |
| **Claude Code: context:fork bug (#17283)** | https://github.com/anthropics/claude-code/issues/17283 |
| **Claude Code: skill budget documentation (#13099)** | https://github.com/anthropics/claude-code/issues/13099 |
| **Anthropic skills: skill-creator frontmatter issue (#249)** | https://github.com/anthropics/skills/issues/249 |
