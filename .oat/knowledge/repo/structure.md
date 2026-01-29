---
oat_generated: true
oat_generated_at: 2026-01-28
oat_source_head_sha: d3e8f0286044a5da390c8c0a6a870eb0d1e3b391
oat_source_main_merge_base_sha: c8226d8b03ab10dd8a45097fab58277fba418693
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# Directory Structure

**Analysis Date:** 2026-01-28

## Top-Level Layout

```
open-agent-toolkit/
├── .agent/                 # Agent workflow infrastructure
│   ├── skills/            # Skill definitions (SKILL.md files)
│   ├── projects/          # Project artifacts (gitignored)
│   ├── agents/            # Agent type configurations
│   └── scripts/           # Helper scripts
├── .oat/                   # OAT-specific files
│   ├── knowledge/         # Generated knowledge base
│   │   └── repo/          # Repository analysis files
│   ├── templates/         # Document templates
│   ├── scripts/           # OAT scripts
│   └── internal-project-reference/  # Dogfood docs
├── packages/               # pnpm workspace packages
│   └── cli/               # CLI package (@oat/cli)
├── tools/                  # Development tooling
│   └── git-hooks/         # Git hook management
├── docs/                   # Documentation
│   └── plans/             # Planning documents
├── .github/                # GitHub configuration
│   └── workflows/         # CI/CD workflows
├── .claude/                # Claude Code settings
├── .cursor/                # Cursor rules
└── .vscode/                # VS Code settings
```

## Key Directories

### `.agent/skills/`
Contains skill definitions following the Agent Skills Open Standard.

**Structure:**
```
.agent/skills/
├── oat-index/             # Knowledge base generation
├── oat-discovery/         # Discovery phase
├── oat-spec/              # Specification phase
├── oat-design/            # Design phase
├── oat-plan/              # Planning phase
├── oat-implement/         # Implementation phase
├── oat-progress/          # Progress checking
├── oat-request-review/    # Request review
├── oat-receive-review/    # Process review
├── oat-pr-progress/       # Progress PR
├── oat-pr-project/        # Project PR
├── create-pr-description/ # PR description generation
├── new-agent-project/     # Project initialization
└── ...
```

Each skill contains:
- `SKILL.md` - Main skill definition
- `references/` - Templates and examples (optional)
- `scripts/` - Helper scripts (optional)

### `.oat/knowledge/repo/`
Generated knowledge base files.

**Files:**
- `project-index.md` - High-level overview
- `stack.md` - Technology stack
- `architecture.md` - System design
- `structure.md` - Directory layout
- `conventions.md` - Code style
- `testing.md` - Test practices
- `integrations.md` - External services
- `concerns.md` - Technical debt

### `packages/`
pnpm workspace packages.

**Current:**
- `packages/cli/` - CLI implementation (@oat/cli)

**Entry point:**
- `packages/cli/src/index.ts`

### `.oat/templates/`
Document templates for OAT workflow.

**Templates:**
- `state.md` - Project state tracking
- `discovery.md` - Discovery document
- `spec.md` - Specification document
- `design.md` - Design document
- `plan.md` - Implementation plan
- `implementation.md` - Implementation tracking

## Naming Conventions

**Files:**
- Lowercase with hyphens: `my-skill-name/`
- Markdown files: `*.md`
- TypeScript source: `*.ts`

**Directories:**
- Lowercase with hyphens
- Plural for collections: `skills/`, `projects/`

**Configuration:**
- Dot-prefixed: `.gitignore`, `.nvmrc`
- JSON/YAML: `package.json`, `turbo.json`

## Important File Locations

**Configuration:**
- `package.json` - Root package config
- `tsconfig.json` - TypeScript config
- `biome.json` - Linting/formatting
- `turbo.json` - Build orchestration
- `pnpm-workspace.yaml` - Workspace definition

**Documentation:**
- `AGENTS.md` - Skill registry
- `CLAUDE.md` - Claude Code config (imports AGENTS.md)
- `README.md` - Project readme

**Git:**
- `.gitignore` - Ignore patterns
- `.github/workflows/ci.yml` - CI pipeline

---

*Structure analysis: 2026-01-28*
