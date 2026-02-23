---
oat_generated: true
oat_generated_at: 2026-02-18
oat_source_head_sha: ecad67d19c241e4d03621cb11b31b86d131cbeb8
oat_source_main_merge_base_sha: 77496d562d030ebe35186d8f3421176cf61308b3
oat_index_type: thin
oat_warning: "GENERATED FILE - Thin index, will be enriched after mapper completion"
---

# open-agent-toolkit

## Overview

*Overview will be enriched after codebase analysis completes.*

## Quick Orientation

**Package Manager:** pnpm

**Key Scripts:** oat:validate-skills, build, check, check:fix, clean, cli, dev, format, format:fix, hooks:disable-all, hooks:enable-all, hooks:status, hooks, lint, lint:fix, prepare, test, type-check, worktree:init

**Entry Points:**
- `docs/oat/cli/index.md`
- `docs/oat/cli/provider-interop/index.md`
- `docs/oat/ideas/index.md`
- `docs/oat/index.md`
- `docs/oat/projects/index.md`
- `docs/oat/reference/index.md`
- `docs/oat/skills/index.md`
- `docs/oat/workflow/index.md`
- `packages/cli/src/commands/index.test.ts`
- `packages/cli/src/commands/index.ts`
- `packages/cli/src/config/index.ts`
- `packages/cli/src/drift/index.ts`
- `packages/cli/src/engine/index.ts`
- `packages/cli/src/errors/index.ts`
- `packages/cli/src/fs/index.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/manifest/index.ts`
- `packages/cli/src/shared/index.ts`
- `packages/cli/src/ui/index.ts`
- `packages/cli/src/validation/index.ts`

## Project Structure (Top-Level)

```
  .agents
  .agents/README.md
  .agents/agents
  .agents/agents/oat-codebase-mapper.md
  .agents/agents/oat-reviewer.md
  .agents/docs
  .agents/docs/agent-instruction.md
  .agents/docs/provider-reference.md
  .agents/docs/reference-architecture.md
  .agents/docs/skills-guide.md
  .agents/docs/subagents-guide.md
  .agents/skills
  .agents/skills/codex-skill
  .agents/skills/create-oat-skill
  .agents/skills/create-pr-description
  .agents/skills/create-skill
  .agents/skills/create-ticket
  .agents/skills/oat-idea-ideate
  .agents/skills/oat-idea-new
  .agents/skills/oat-idea-scratchpad
  .agents/skills/oat-idea-summarize
  .agents/skills/oat-project-clear-active
  .agents/skills/oat-project-complete
  .agents/skills/oat-project-design
  .agents/skills/oat-project-discover
  .agents/skills/oat-project-implement
  .agents/skills/oat-project-import-plan
  .agents/skills/oat-project-new
  .agents/skills/oat-project-open
  .agents/skills/oat-project-plan
  .agents/skills/oat-project-plan-writing
  .agents/skills/oat-project-pr-final
  .agents/skills/oat-project-pr-progress
  .agents/skills/oat-project-progress
  .agents/skills/oat-project-promote-spec-driven
  .agents/skills/oat-project-quick-start
  .agents/skills/oat-project-review-provide
  .agents/skills/oat-project-review-receive
  .agents/skills/oat-project-spec
  .agents/skills/oat-repo-knowledge-index
  .agents/skills/oat-review-provide
  .agents/skills/oat-worktree-bootstrap
  .agents/skills/review-backlog
  .agents/skills/update-repo-reference
  .claude
  .claude/agents
  .claude/agents/oat-codebase-mapper.md
  .claude/agents/oat-reviewer.md
  .claude/skills
  .claude/skills/codex-skill
  .claude/skills/create-oat-skill
  .claude/skills/create-pr-description
  .claude/skills/create-skill
  .claude/skills/create-ticket
  .claude/skills/oat-idea-ideate
  .claude/skills/oat-idea-new
  .claude/skills/oat-idea-scratchpad
  .claude/skills/oat-idea-summarize
  .claude/skills/oat-project-clear-active
  .claude/skills/oat-project-complete
  .claude/skills/oat-project-design
  .claude/skills/oat-project-discover
  .claude/skills/oat-project-implement
  .claude/skills/oat-project-import-plan
  .claude/skills/oat-project-new
  .claude/skills/oat-project-open
  .claude/skills/oat-project-plan
  .claude/skills/oat-project-plan-writing
  .claude/skills/oat-project-pr-final
  .claude/skills/oat-project-pr-progress
  .claude/skills/oat-project-progress
  .claude/skills/oat-project-promote-spec-driven
  .claude/skills/oat-project-quick-start
  .claude/skills/oat-project-review-provide
  .claude/skills/oat-project-review-receive
  .claude/skills/oat-project-spec
  .claude/skills/oat-repo-knowledge-index
  .claude/skills/oat-review-provide
  .claude/skills/oat-worktree-bootstrap
  .claude/skills/review-backlog
  .claude/skills/update-repo-reference
  .cursor
  .cursor/agents
  .cursor/agents/oat-codebase-mapper.md
  .cursor/agents/oat-reviewer.md
  .cursor/rules
  .cursor/rules/pr-description-rules.mdc
  .cursor/skills
  .cursor/skills/codex-skill
  .cursor/skills/create-oat-skill
  .cursor/skills/create-pr-description
  .cursor/skills/create-skill
  .cursor/skills/create-ticket
  .cursor/skills/oat-idea-ideate
  .cursor/skills/oat-idea-new
  .cursor/skills/oat-idea-scratchpad
  .cursor/skills/oat-idea-summarize
  .cursor/skills/oat-project-clear-active
  .cursor/skills/oat-project-complete
  .cursor/skills/oat-project-design
  .cursor/skills/oat-project-discover
  .cursor/skills/oat-project-implement
  .cursor/skills/oat-project-import-plan
  .cursor/skills/oat-project-new
  .cursor/skills/oat-project-open
  .cursor/skills/oat-project-plan
  .cursor/skills/oat-project-plan-writing
  .cursor/skills/oat-project-pr-final
  .cursor/skills/oat-project-pr-progress
  .cursor/skills/oat-project-progress
  .cursor/skills/oat-project-promote-spec-driven
  .cursor/skills/oat-project-quick-start
  .cursor/skills/oat-project-review-provide
  .cursor/skills/oat-project-review-receive
  .cursor/skills/oat-project-spec
  .cursor/skills/oat-repo-knowledge-index
  .cursor/skills/oat-review-provide
  .cursor/skills/oat-worktree-bootstrap
  .cursor/skills/review-backlog
  .cursor/skills/update-repo-reference
  .cursorignore
  .github
  .github/PULL_REQUEST_TEMPLATE.md
  .github/workflows
  .github/workflows/ci.yml
  .gitignore
  .ignore
  .lintstagedrc.mjs
  .nvmrc
  .oat
  .oat/active-project
  .oat/config.json
  .oat/projects
  .oat/projects-root
  .oat/projects/archived
  .oat/projects/local
  .oat/projects/shared
  .oat/repo
  .oat/repo/README.md
  .oat/repo/knowledge
  .oat/repo/reference
  .oat/repo/reviews
  .oat/state.md
  .oat/sync
  .oat/sync/config.json
  .oat/sync/manifest.json
  .oat/templates
  .oat/templates/.gitkeep
  .oat/templates/design.md
  .oat/templates/discovery.md
  .oat/templates/ideas
  .oat/templates/implementation.md
  .oat/templates/plan.md
  .oat/templates/spec.md
  .oat/templates/state.md
  .vscode
  .vscode/extensions.json
  .vscode/settings.json
  AGENTS.md
  CLAUDE.md
  README.md
  biome.json
  commitlint.config.js
  docs
  docs/oat
  docs/oat/cli
  docs/oat/ideas
  docs/oat/index.md
  docs/oat/projects
  docs/oat/quickstart.md
  docs/oat/reference
  docs/oat/skills
  docs/oat/workflow
  package.json
  packages
  packages/cli
  packages/cli/AGENTS.md
  packages/cli/CLAUDE.md
  packages/cli/package.json
  packages/cli/src
  packages/cli/tsconfig.json
  packages/cli/tsconfig.tsbuildinfo
  packages/cli/vitest.config.ts
  pnpm-lock.yaml
  pnpm-workspace.yaml
  tools
  tools/git-hooks
  tools/git-hooks/README.md
  tools/git-hooks/commit-msg
  tools/git-hooks/manage-hooks.js
  tools/git-hooks/post-checkout
  tools/git-hooks/pre-commit
  tools/git-hooks/pre-push
  tsconfig.json
  turbo.json
```

## Configuration Files

- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `biome.json`

## Testing

**Test Command:** `turbo run test`

## Next Steps

This is a thin index generated for quick orientation. Full details will be available after codebase analysis completes in:

- [stack.md](stack.md) - Technologies and dependencies (pending)
- [architecture.md](architecture.md) - System design and patterns (pending)
- [structure.md](structure.md) - Directory layout (pending)
- [integrations.md](integrations.md) - External services (pending)
- [testing.md](testing.md) - Test structure and practices (pending)
- [conventions.md](conventions.md) - Code style and patterns (pending)
- [concerns.md](concerns.md) - Technical debt and issues (pending)
