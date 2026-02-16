# Skill & Agent Reference Architecture

Conventions for skills, subagents, and shared references across AI coding tools.

---

## The Ecosystem: What Actually Exists (February 2026)

### The Agent Skills Open Standard

Agent Skills is an **open standard** originally developed by Anthropic and now adopted by 27+ agent tools. The specification lives at [agentskills.io](https://agentskills.io) and the GitHub repo at [agentskills/agentskills](https://github.com/agentskills/agentskills).

A skill is a directory containing at minimum a `SKILL.md` file with YAML frontmatter:

```
my-skill/
├── SKILL.md              # Required — YAML frontmatter + Markdown instructions
├── scripts/              # Optional — executable code agents can run
├── references/           # Optional — additional documentation loaded on demand
└── assets/               # Optional — templates, binaries, other resources
```

**SKILL.md frontmatter (required fields):**
```yaml
---
name: skill-name          # Max 64 chars, lowercase, hyphens only
description: |            # Max 1024 chars — what it does and when to use it
  Extract text and tables from PDF files.
---
```

**Optional frontmatter fields:** `license`, `metadata` (arbitrary key-value), `allowed-tools` (experimental), `environment`.

**Progressive disclosure pattern:**
1. **Metadata (always loaded):** Name and description from frontmatter — agents pre-load this to decide relevance
2. **Instructions (loaded on activation):** Full SKILL.md body — loaded when the agent determines the skill is relevant
3. **Resources (loaded on demand):** Files in `scripts/`, `references/`, `assets/` — loaded only when SKILL.md references them

**Key constraints from the spec:**
- Keep SKILL.md under 500 lines / ~5,000 tokens
- Use relative paths from skill root: `See [guide](references/REFERENCE.md)`
- Keep file references one level deep from SKILL.md
- Scripts should be self-contained and handle edge cases gracefully

### The `npx skills` CLI (Vercel)

The [`npx skills`](https://github.com/vercel-labs/skills) CLI is the emerging **package manager for the agent skills ecosystem**. It installs skills from GitHub repos, local paths, or the [skills.sh](https://skills.sh) directory to any supported agent's native location.

**Installation creates symlinks** (recommended) or copies from a canonical source to each agent's path — single source of truth with tool-specific distribution.

### Where Skills Live: The Convergence on `.agents/skills/`

The `npx skills` CLI documents two installation scopes:

| Scope | Flag | Location Pattern | Use Case |
|-------|------|-----------------|----------|
| **Project** | (default) | `./<agent>/skills/` | Committed with project, shared with team |
| **Global** | `-g` | `~/<agent>/skills/` | Available across all projects |

Here's where **each tool** expects project-level skills:

| Agent | `--agent` flag | Project Path | Global Path |
|-------|---------------|-------------|-------------|
| **Claude Code** | `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| **Cursor** | `cursor` | `.cursor/skills/` | `~/.cursor/skills/` |
| **Codex** | `codex` | `.agents/skills/` | `~/.agents/skills/` |
| **GitHub Copilot** | `github-copilot` | `.github/skills/` | `~/.copilot/skills/` |
| **Gemini CLI** | `gemini-cli` | `.gemini/skills/` | `~/.gemini/skills/` |
| **OpenCode** | `opencode` | `.opencode/skills/` | `~/.config/opencode/skills/` |
| **Windsurf** | `windsurf` | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| **Amp** | `amp` | `.agents/skills/` | `~/.config/agents/skills/` |
| **Roo Code** | `roo` | `.roo/skills/` | `~/.roo/skills/` |
| *(25+ more)* | | | |

**Critical observation:** `.agents/skills/` is already a recognized path in this ecosystem (used by Amp natively, listed as a skill discovery path by the CLI). The `npx skills` CLI also searches `.agents/skills/` when discovering skills in a repository.

### Subagents: Native Per-Tool Convention

Subagents are a **converging but still tool-specific** concept:

| Tool | Subagent Location | File Format |
|------|------------------|-------------|
| Claude Code | `.claude/agents/` | Markdown + YAML frontmatter (`name`, `description`, `tools`, `model`, `skills`, `permissionMode`) |
| Cursor | `.cursor/agents/` | Markdown + YAML frontmatter (`name`, `description`, `model`, `tools`) |
| Codex | `.codex/agents/` | Markdown + YAML frontmatter (experimental) |

Unlike skills, there is **no open standard for subagents yet**, and no equivalent of `npx skills` for cross-tool agent distribution. Each tool's frontmatter schema differs slightly.

### Agent Instructions: The AGENTS.md Standard

`AGENTS.md` is the universal agent instruction format, supported by 60+ tools. It uses hierarchical, proximity-based precedence — the closest `AGENTS.md` to the working directory takes priority, with inheritance from parent directories.

Tool-specific instruction files also exist (`CLAUDE.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, `GEMINI.md`, etc.) but `AGENTS.md` is the cross-tool standard.

---

## The Gap: Shared Reference Documents

The Agent Skills spec defines `references/` as a **per-skill** directory for supporting documentation. But skills sometimes share a common reference document that multiple skills and subagents need to consume.

The spec recommendation is to keep file references one level deep from SKILL.md. Duplicating a shared document into each skill's `references/` directory would create exactly the drift problem standards are meant to prevent.

**A shared location for reference documents** should:
- Be referenceable by multiple skills
- Be referenceable by subagents
- Be tool-agnostic (not locked inside `.claude/` or `.cursor/`)
- Be discoverable and version-controlled

---

## Convention: `.agents/docs/`

Place shared reference documents in `.agents/docs/` at the repository root.

### Why `.agents/docs/`

- **`.agents/`** is already a recognized namespace in the skills ecosystem (Amp uses `.agents/skills/`, the `npx skills` CLI searches `.agents/skills/`)
- **Tool-agnostic** — not nested under any single tool's dot-directory
- **`docs/`** clearly communicates "reference documentation" vs. `skills/` (executable capabilities) or `agents/` (subagent definitions)
- **Git-friendly** — version-controlled alongside the codebase
- **Discoverable** — `AGENTS.md` can point agents here; skills reference via relative path

### Scoping: What Belongs in `.agents/docs/`

`.agents/docs/` is for **agent-operational guidance** — standards and references that agents consume to do their work better. It is **not** a location for general project documentation.

**Belongs in `.agents/docs/`:**
- Quality standards agents reference when generating or auditing artifacts
- Review expectations agents reference when performing code review
- Agent-specific conventions, checklists, or evaluation criteria
- Cross-provider compatibility references

**Does NOT belong in `.agents/docs/`:**
- General engineering documentation (→ `docs/`, MkDocs, wiki)
- API documentation (→ `docs/api/`, OpenAPI specs)
- Architecture decision records (→ `docs/adr/`)
- Onboarding guides, runbooks, operational docs (→ project-appropriate location)

The distinction: if a document exists primarily so that **agents can consume it as operational input** to improve their output quality, it belongs in `.agents/docs/`. If it exists for humans (even if agents also read it), it belongs in your normal documentation infrastructure.

### The `.agents/` Directory

`.agents/` becomes the **tool-agnostic agent infrastructure namespace**:

```
.agents/
├── docs/                           # Agent-operational reference documents
│   ├── skills-guide.md             # Cross-provider skills research and best practices
│   ├── subagents-guide.md          # Subagent patterns and provider differences
│   ├── provider-reference.md       # Link index to all provider documentation
│   ├── reference-architecture.md   # This document — where things live and why
│   └── ...
└── skills/                         # Tool-agnostic skills (canonical source)
    └── ...                         # Distributed to provider paths via symlink or copy
```

Skills distributed to tool-specific locations (`.claude/skills/`, `.cursor/skills/`, etc.) — whether by OAT sync, `npx skills`, or manual symlinks — can reference `.agents/docs/` via relative paths.

---

## Repository Layout

```
my-repo/
│
├── AGENTS.md                           # Root agent instructions (universal)
│
├── .agents/                            # Tool-agnostic agent infrastructure
│   ├── docs/                           # Agent-operational reference documents
│   │   ├── skills-guide.md             # Skills ecosystem guide
│   │   └── ...
│   └── skills/                         # Canonical skill source (single copy)
│       ├── my-skill/
│       │   ├── SKILL.md
│       │   └── references/
│       │       └── examples.md
│       └── ...
│
├── .claude/                            # Claude Code + Cursor (Cursor reads this)
│   ├── skills/                         # Symlinks → .agents/skills/*
│   │   ├── my-skill → ../../.agents/skills/my-skill
│   │   └── ...
│   └── agents/                         # Subagents (Claude Code native, no cross-tool standard)
│       ├── repo-scanner.md
│       └── ...
│
├── .github/                            # GitHub Copilot
│   └── skills/                         # Symlinks → ../../.agents/skills/*
│       ├── my-skill → ../../.agents/skills/my-skill
│       └── ...
│
└── .cursor/                            # Cursor-specific (non-skill config)
    ├── agents/                         # Subagents (native path)
    └── rules/                          # Rules (native)
```

**Key points:**
- Skills are authored once in `.agents/skills/` (canonical source)
- Codex reads `.agents/skills/` natively at both project and user level — no symlink needed
- Cursor reads `.claude/skills/` natively — symlink `.agents/skills/` → `.claude/skills/` covers both Claude Code and Cursor
- GitHub Copilot requires symlinks to `.github/skills/`
- Only two symlink targets needed: `.claude/skills/` and `.github/skills/`
- Subagents remain per-tool (no cross-tool standard exists yet)
- `.agents/docs/` is referenced via relative paths from skills

### What Lives Where

| Content Type | Location | Rationale |
|-------------|----------|-----------|
| Agent instructions (all tools) | `AGENTS.md` (hierarchical) | Open standard — 60k+ repos, 60+ tools |
| Shared reference documents | **`.agents/docs/`** | Tool-agnostic, agent-operational guidance |
| Skills (per tool) | `.<tool>/skills/` | Native per Agent Skills spec + tool conventions |
| Skills (cross-tool canonical) | `.agents/skills/` | Recognized by ecosystem; symlinked to tool paths |
| Subagents (per tool) | `.<tool>/agents/` | Native per tool (no cross-tool standard yet) |
| Skill-specific references | `.<tool>/skills/<n>/references/` | Per Agent Skills spec — one level deep from SKILL.md |

---

## How Skills Reference Shared Documents

### From a Skill (via symlink)

Skills are authored in `.agents/skills/` and symlinked to tool-specific paths. SKILL.md references shared docs via relative path:

```markdown
---
name: my-skill
description: Use when analyzing code quality. Validates against shared standards.
---

# My Skill

Before generating any content, read the quality standard:

**Required reference:** Read [quality-standard.md](../../docs/quality-standard.md)
in full before proceeding.

## Workflow
...
```

The relative path from `.agents/skills/my-skill/SKILL.md` traverses up to `.agents/` and into `docs/`. Since tool-specific paths (`.claude/skills/`, `.codex/skills/`, `.github/skills/`) are symlinks to `.agents/skills/`, the relative path resolves correctly through the symlink — the filesystem follows the canonical path.

### From a Subagent

Claude Code subagents can auto-load skills via the `skills` frontmatter field. They can also reference shared docs directly in their system prompt:

```markdown
---
name: quality-checker
description: |
  Evaluate artifacts against quality standards.
  Use when auditing completeness and correctness.
tools: Read, Grep, Glob
model: sonnet
---

You evaluate artifacts against the internal quality standard.

Before beginning any evaluation, read:
- .agents/docs/quality-standard.md

Evaluate against the completeness checklist and anti-pattern definitions.
```

### From AGENTS.md

The root AGENTS.md can direct any agent to shared docs:

```markdown
## Agent Reference Standards

Agent-operational guidance lives in `.agents/docs/`:
- `skills-guide.md` — cross-provider skills research and best practices
- `subagents-guide.md` — subagent patterns and provider differences
```

### From Cursor Rules or Other Tools

Any tool that can read Markdown files can point to `.agents/docs/`:

```markdown
# .cursor/rules/quality-review.mdc
---
alwaysApply: false
globs: ["AGENTS.md", "**/AGENTS.md"]
---

When reviewing or generating AGENTS.md files, consult:
.agents/docs/skills-guide.md

Follow the cross-provider safe defaults and description best practices.
```

---

## Shared Docs vs. Skill-Specific References

Both exist and serve different purposes:

| Type | Location | Scope | Example |
|------|----------|-------|---------|
| **Shared docs** | `.agents/docs/` | Cross-tool, cross-skill, cross-agent | `skills-guide.md` (agent-operational guidance) |
| **Skill references** | `.<tool>/skills/<n>/references/` | Single skill | `sample-output.md` |

**Rule of thumb:** If multiple skills or agents need the same document, it belongs in `.agents/docs/`. If only one skill uses it, it belongs in that skill's `references/` directory per the Agent Skills spec.

---

## Cross-Tool Skill Distribution

For skills that should work across multiple tools:

### Option A: OAT Sync (Recommended for local/internal skills)

Author skills in `.agents/skills/` (canonical source). Use OAT's built-in sync to distribute to each tool's native path:

```bash
# Dry-run to preview what will be synced
oat sync --scope all

# Apply the sync
oat sync --scope all --apply
```

OAT sync handles symlink/copy distribution from `.agents/skills/` to provider-specific directories, with manifest tracking and drift detection.

### Option B: `npx skills` (For remote/community skills)

Use `npx skills` to install skills from GitHub repos, the [skills.sh](https://skills.sh) directory, or other remote sources:

```bash
# Install a community skill from GitHub
npx skills add github-user/skill-repo -a claude-code -a cursor
```

### Option C: Author in Tool-Specific Paths

When skills use tool-specific features (Claude Code's `context: fork`, hooks), author directly in that tool's native path. Other tools won't consume these skills.

**Recommended approach:** Author skills in `.agents/skills/` (tool-agnostic canonical source) and use OAT sync (or symlinks) to distribute to each required tool's native path:

```
.agents/skills/my-skill/SKILL.md          ← canonical source (single copy)
  ↓ symlink
.claude/skills/my-skill → ../../.agents/skills/my-skill   ← Claude Code + Cursor
.github/skills/my-skill → ../../.agents/skills/my-skill   ← GitHub Copilot
```

Codex reads `.agents/skills/` natively at the project level — no symlink needed. Cursor natively reads `.claude/skills/` for cross-tool compatibility, so it doesn't need its own symlink either. **Result: one canonical source, two symlinks, four tools.**

All skills reference `.agents/docs/` via relative path for shared standards.

---

## Subagent Placement

Subagents remain **tool-specific** — there is no cross-tool subagent standard yet:

| Tool | Location | Example |
|------|----------|---------|
| Claude Code | `.claude/agents/repo-scanner.md` | Native — supports `name`, `description`, `tools`, `model`, `skills`, `permissionMode` |
| Cursor | `.cursor/agents/repo-scanner.md` | Native — supports `name`, `description`, `model`, `tools` |
| Codex | `.codex/agents/repo-scanner.md` | Experimental |

The system prompt body can be largely shared across tools, but frontmatter schemas differ. If maintaining multiple copies becomes overhead, consider a shared source with build-time distribution.

---

## Phased Adoption

### Phase 1: Establish Conventions

- Create `.agents/docs/` in repositories
- Author skills in `.agents/skills/` (canonical, tool-agnostic source)
- Symlink to required tool paths: `.claude/skills/`, `.github/skills/`
  - Cursor reads `.claude/skills/` natively — no additional symlink needed
  - Codex reads `.agents/skills/` natively — no symlink needed
- Skills reference `.agents/docs/` via relative path
- Subagents in `.<tool>/agents/` (no cross-tool standard yet)
- Zero custom tooling — just directory conventions, symlinks, and relative paths

### Phase 2: Scale and Distribute

- Add more reference documents to `.agents/docs/`
- Use OAT's built-in sync feature (`oat sync`) to manage canonical-to-provider distribution for internal and local skills. `npx skills` remains useful for installing remote/community skills from registries.
- Explore `prerequisite-skills` and `related-skills` frontmatter fields (proposed in the Agent Skills spec, [issue #90](https://github.com/agentskills/agentskills/issues/90))
- Subagent definitions may stabilize across tools

### Phase 3: Automated Orchestration

- CI/Cloud agents consume `.agents/docs/` standards automatically
- OAT sync + drift detection keeps tool-specific paths in sync (`oat status` reports drift, `oat sync --apply` resolves it)
- Scheduled audit skills run against shared standards
- `oat doctor` validates environment health

---

## Summary

| Question | Answer |
|----------|--------|
| What's the open standard for skills? | **Agent Skills spec** at [agentskills.io](https://agentskills.io) — SKILL.md with YAML frontmatter, `references/`, `scripts/`, `assets/` |
| Where do shared reference docs live? | **`.agents/docs/`** — tool-agnostic, agent-operational guidance only |
| Where do skills live? | **`.<tool>/skills/`** natively; **`.agents/skills/`** for cross-tool canonical source |
| Where do subagents live? | **`.<tool>/agents/`** — native per tool (no cross-tool standard yet) |
| Where do skill-specific references live? | **`.<tool>/skills/<n>/references/`** — per Agent Skills spec |
| How do skills get distributed across tools? | **OAT sync** for local/internal skills; **`npx skills`** CLI for remote/community skills — both create symlinks from canonical source to tool-specific paths |
| Is `.agents/docs/` a standard? | **No** — it's a convention. `.agents/skills/` is recognized; `.agents/docs/` fills a gap for shared non-skill references. |
| What's native vs. custom? | Skills spec, tool paths, `references/` = **standard**. `.agents/docs/` = **convention**. |
