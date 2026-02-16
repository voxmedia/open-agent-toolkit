# Plan: Skill Rename + Slash-Command Cleanup

## Context

OAT skills use inconsistent naming (`oat-new-project`, `oat-discovery`, `oat-pr-project`) and reference each other via `/oat:name` slash syntax that only works in hosts supporting slash commands. Since nothing is released yet, now is the right time to normalize to `oat-<domain>-<action>` and replace slash references with skill-first wording.

Two backlog items addressed in one pass:
1. **Normalize skill naming** to `oat-<domain>-<action>` namespace model
2. **Standardize invocation language** to skill-first (drop `/oat:` slash-only references)

## Rename Mapping (15 skills)

| # | Current | New |
|---|---------|-----|
| 1 | `oat-new-project` | `oat-project-new` |
| 2 | `oat-open-project` | `oat-project-open` |
| 3 | `oat-clear-active-project` | `oat-project-clear-active` |
| 4 | `oat-complete-project` | `oat-project-complete` |
| 5 | `oat-discovery` | `oat-project-discover` |
| 6 | `oat-spec` | `oat-project-spec` |
| 7 | `oat-design` | `oat-project-design` |
| 8 | `oat-plan` | `oat-project-plan` |
| 9 | `oat-implement` | `oat-project-implement` |
| 10 | `oat-progress` | `oat-project-progress` |
| 11 | `oat-index` | `oat-project-index` |
| 12 | `oat-pr-progress` | `oat-project-pr-progress` |
| 13 | `oat-pr-project` | `oat-project-pr-final` |
| 14 | `oat-request-review` | `oat-project-review-provide` |
| 15 | `oat-receive-review` | `oat-project-review-receive` |

**Unchanged:** `oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`, `create-ticket`, `create-oat-skill`, `create-skill`, `create-pr-description`, `update-internal-project-reference`, `codex`

## Slash-Command Replacement Pattern

Every `/oat:old-name` reference becomes skill-first wording using the NEW name:

- `/oat:discovery` → the `oat-project-discover` skill
- In routing tables: `` `/oat:discovery` `` → `` `oat-project-discover` ``
- In usage examples: `/oat:request-review code p02` → `oat-project-review-provide code p02`
- In `oat_warning` frontmatter: `Regenerate with /oat:index` → `Regenerate with the oat-project-index skill`

## Implementation Steps

### Step 1: Rename directories (git mv)

15 `git mv` operations on `.agents/skills/` directories. Run as a batch.

### Step 2: Update frontmatter `name:` fields

In each renamed skill's `SKILL.md`, update the `name:` field to the new name.

### Step 3: Replace old names + slash syntax in skill files

For each of the 15 renamed skills, search-and-replace across ALL `.agents/skills/*/SKILL.md` files:
- Replace the old skill name with the new name (both as plain text and in backticks)
- Replace `/oat:old-slug` slash references with skill-first `oat-new-name` references

Key files with heavy cross-references:
- `.agents/skills/oat-progress/SKILL.md` — full routing table with ALL skills (~30 slash refs)
- `.agents/skills/oat-implement/SKILL.md` — references review, PR, plan skills
- `.agents/skills/oat-request-review/SKILL.md` — references receive-review extensively
- `.agents/skills/oat-receive-review/SKILL.md` — references implement, request-review
- `.agents/skills/oat-discovery/SKILL.md` — references index, new-project, open-project, spec

### Step 4: Replace in agent definitions

- `.agents/agents/oat-codebase-mapper.md` — references `/oat:index`, `/oat:design`, `/oat:plan`, `/oat:implement`
- `.agents/agents/oat-reviewer.md` — references `/oat:receive-review`

### Step 5: Replace in templates

- `.oat/templates/plan.md` — references `oat-implement`, `/oat:request-review`, `/oat:receive-review`
- `.oat/templates/spec.md` — references `/oat:design`, `/oat:plan`
- `.oat/templates/implementation.md` — references `/oat:pr-project`
- `.oat/templates/discovery.md` — references `/oat:spec`

### Step 6: Update AGENTS.md

Update the `<available_skills>` block: rename all 15 `<name>` entries and update `<description>` text if it references old names.

### Step 7: Update sync manifest

`.oat/sync/manifest.json` — update `canonicalPath` and `providerPath` for all 15 skills x 2 providers (claude + cursor) = 30 entries.

### Step 8: Update docs

Files to update (skill name references + any slash syntax):
- `docs/oat/skills/index.md` — skills list
- `docs/oat/workflow/lifecycle.md` — workflow phases
- `docs/oat/workflow/reviews.md` — review workflow
- `docs/oat/quickstart.md` — getting started
- `docs/oat/ideas/lifecycle.md` — references `oat-new-project`
- `docs/oat/skills/execution-contracts.md` — skill references
- `README.md` — overview

### Step 9: Update internal project reference + backlog

- `.oat/internal-project-reference/backlog.md` — rename references in backlog items, mark both naming and slash-command backlog items as done
- `.oat/internal-project-reference/current-state.md`
- `.oat/internal-project-reference/roadmap.md`
- `.oat/internal-project-reference/dogfood-workflow-implementation.md`
- `.oat/internal-project-reference/deferred-phases.md`
- Other files under `.oat/internal-project-reference/` and `.oat/projects/shared/`

### Step 10: Run sync to update provider symlinks

```bash
pnpm run cli sync --scope all --apply
```

## Verification

1. `grep -r 'oat-discovery\|oat-spec\b\|oat-design\b\|oat-plan\b\|oat-implement\b\|oat-new-project\|oat-open-project\|oat-clear-active-project\|oat-complete-project\|oat-progress\b\|oat-index\b\|oat-pr-progress\|oat-pr-project\|oat-request-review\|oat-receive-review' .agents/ docs/ .oat/templates/ AGENTS.md README.md` — should return zero hits (excluding git/node_modules)
2. `grep -r '/oat:' .agents/ docs/ .oat/templates/ AGENTS.md README.md` — should return zero hits
3. Verify manifest.json has no old paths
4. Run `pnpm run cli sync --scope all` (dry-run) to confirm sync sees no drift
