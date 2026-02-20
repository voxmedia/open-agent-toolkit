---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-19
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [4]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: .oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: Tracking Manifest + Agent Instructions Skills

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Create a shared tracking manifest and the agent instructions skill family (analyze + apply) as OAT's first "value out of the box" skills.

**Architecture:** Shell scripts for mechanical discovery (providers, instruction files, tracking), SKILL.md files for agent-driven analysis and generation, shared tracking.json for delta mode across all OAT operations.

**Tech Stack:** Bash/jq (scripts), Markdown (SKILL.md, reference docs, templates), JSON (tracking.json)

**Commit Convention:** `feat(pNN-tNN): {description}` - e.g., `feat(p01-t01): add tracking manifest`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Foundation

### Task p01-t01: Create tracking manifest

**Files:**
- Create: `.oat/tracking.json`

**Step 1: Implement**

Create `.oat/tracking.json` with initial schema:

```json
{
  "version": 1
}
```

**Step 2: Verify**

Run: `jq . .oat/tracking.json`
Expected: Valid JSON with `version: 1`

**Step 3: Commit**

```bash
git add .oat/tracking.json
git commit -m "feat(p01-t01): add tracking manifest"
```

---

### Task p01-t02: Create resolve-tracking.sh

**Files:**
- Create: `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh`

**Step 1: Implement**

Write shell script with subcommands:
- `read <operation>` — read operation entry from tracking.json via jq
- `write <operation> <commitHash> <baseBranch> <mode> [formats...]` — merge operation entry using optimistic per-key merge
- `init` — create tracking.json with `{"version": 1}` if missing or unparseable

Schema per the imported plan:
```jsonc
{
  "version": 1,
  "<operation>": {
    "lastRunAt": "ISO 8601",
    "commitHash": "...",
    "baseBranch": "...",
    "mode": "full|delta",
    "formats": ["agents_md", "claude", ...],
    "artifactPath": "..."
  }
}
```

Write protocol: read → parse → merge own top-level key → write. If missing/unparseable, reinitialize with `{"version": 1}` then write.

**Step 2: Verify**

Run:
```bash
bash .agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh init
bash .agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh write agentInstructions abc123 main full agents_md
jq . .oat/tracking.json
bash .agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh read agentInstructions
```
Expected: Valid JSON with `agentInstructions` entry containing all required fields

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh
git commit -m "feat(p01-t02): add resolve-tracking.sh with read/write/init"
```

---

### Task p01-t03: Create resolve-providers.sh

**Files:**
- Create: `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh`

**Step 1: Implement**

Write provider resolution script with precedence hierarchy:
1. Explicit `--providers` argument (comma-separated)
2. `.oat/sync/config.json` → `providers.{name}.enabled`
3. Auto-detection fallback (scan for `.claude/`, `.cursor/`, `.github/`, `.cline/` directories)
4. Interactive confirmation (if TTY and not `--non-interactive`)
5. Non-interactive mode skips step 4

Output: newline-separated list of provider names (always includes `agents_md`)

Provider mapping:
- `agents_md` → always included
- `claude` → CLAUDE.md + `.claude/rules/*.md`
- `cursor` → `.cursor/rules/*.mdc`, `.cursor/rules/*.md`
- `copilot` → `.github/copilot-instructions.md` (shim), `.github/instructions/*.instructions.md`
- `cline` → `.cline/rules/*`
- `codex` → reads AGENTS.md natively (no additional files)

**Step 2: Verify**

Run:
```bash
bash .agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh --non-interactive
```
Expected: At minimum `agents_md` plus any auto-detected providers based on repo directories

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh
git commit -m "feat(p01-t03): add resolve-providers.sh with detection hierarchy"
```

---

### Task p01-t04: Create resolve-instruction-files.sh

**Files:**
- Create: `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh`

**Dependencies:** p01-t03 (uses provider list output)

**Step 1: Implement**

Write instruction file discovery script that:
- Accepts provider list (from resolve-providers.sh output or `--providers` arg)
- For each provider, searches for matching instruction file patterns:
  - `agents_md`: `find . -name 'AGENTS.md' -not -path '*node_modules*' -not -path '*.worktrees*'`
  - `claude`: `find . -name 'CLAUDE.md' ...` + `find .claude/rules -name '*.md' ...`
  - `cursor`: `find .cursor/rules -name '*.mdc' -o -name '*.md' ...`
  - `copilot`: `.github/copilot-instructions.md` + `find .github/instructions -name '*.instructions.md' ...`
  - `cline`: `find .cline/rules -type f ...`
- Output: tab-separated `provider\tpath` per line

**Step 2: Verify**

Run:
```bash
bash .agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh --non-interactive | \
  bash .agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh
```
Expected: At minimum discovers `./AGENTS.md`, `./packages/cli/AGENTS.md`, `./CLAUDE.md`, `./packages/cli/CLAUDE.md`

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh
git commit -m "feat(p01-t04): add resolve-instruction-files.sh for provider-based discovery"
```

---

### Task p01-t05: Create analysis output directory

**Files:**
- Create: `.oat/repo/analysis/.gitkeep`
- Modify: `.oat/repo/README.md`

**Step 1: Implement**

Create `.oat/repo/analysis/.gitkeep` and update `.oat/repo/README.md` to document the new `analysis/` directory as a peer to `knowledge/` and `reviews/`.

**Step 2: Verify**

Run: `ls .oat/repo/analysis/.gitkeep`
Expected: File exists

**Step 3: Commit**

```bash
git add .oat/repo/analysis/.gitkeep .oat/repo/README.md
git commit -m "feat(p01-t05): add analysis output directory"
```

---

## Phase 2: Analyze Skill

### Task p02-t01: Create analysis artifact template

**Files:**
- Create: `.agents/skills/oat-agent-instructions-analyze/references/analysis-artifact-template.md`

**Step 1: Implement**

Create severity-rated report template with:
- Frontmatter (oat_generated, date, scope, mode, providers)
- Summary section (files evaluated, coverage %, mode used)
- Findings by severity (Critical, High, Medium, Low) with table format
- Inventory table (file path, provider, format type, line count, quality score)
- Coverage gaps table (directory, reason needed, severity)
- Recommendations section (numbered, actionable)

**Step 2: Verify**

Read file, confirm all sections present and template placeholders are clear.

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze/references/analysis-artifact-template.md
git commit -m "feat(p02-t01): add analysis artifact template"
```

---

### Task p02-t02: Create quality checklist and directory assessment criteria

**Files:**
- Create: `.agents/skills/oat-agent-instructions-analyze/references/quality-checklist.md`
- Create: `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md`

**Step 1: Implement**

Distill from `.agents/docs/agent-instruction.md` (read at implementation time):

**quality-checklist.md** — per-file evaluation criteria:
1. Commands correct and runnable (match package.json scripts)
2. Non-negotiables near top (security rules in first screenful)
3. No duplication across root/scoped files
4. Size within budget (root <300 lines hard max 500; scoped 40-150; rules <80)
5. Scoped only for real divergence
6. Precedence clear
7. No circular imports
8. Definition of Done present with objective criteria
9. Staleness (referenced paths still exist, commands still valid)
10. Cross-format body consistency (glob-scoped rules with same target should have identical bodies)

**directory-assessment-criteria.md** — when does a directory need instructions:
- Has its own package.json or build config
- Different tech stack from parent
- Public API surface
- Distinct domain boundary
- >10 source files with specialized conventions

Note: Skills also read the full `.agents/docs/agent-instruction.md` at runtime — these references are distilled checklists for structured evaluation, not replacements.

**Step 2: Verify**

Read both files, confirm criteria are clear and actionable.

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze/references/quality-checklist.md \
       .agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md
git commit -m "feat(p02-t02): add quality checklist and directory assessment criteria"
```

---

### Task p02-t03: Write analyze SKILL.md

**Files:**
- Create: `.agents/skills/oat-agent-instructions-analyze/SKILL.md`

**Dependencies:** All Phase 1 tasks, p02-t01, p02-t02

**Step 1: Implement**

Write the analyze SKILL.md (~400 lines) with:
- Frontmatter (name, description, allowed-tools, etc.)
- Mode assertion (OAT MODE: Agent Instructions Analysis)
- Process steps:
  - Step 0: Resolve providers + mode (resolve-providers.sh; read tracking.json for delta/full)
  - Step 1: Discover instruction files (resolve-instruction-files.sh with provider list)
  - Step 2: Evaluate quality (each file against quality-checklist.md)
  - Step 3: Assess coverage gaps (directory tree against directory-assessment-criteria.md)
  - Step 4: Drift detection (delta mode only — git diff changed files → check parent instructions)
  - Step 5: Write analysis artifact to `.oat/repo/analysis/agent-instructions-YYYY-MM-DD-HHmm.md`
  - Step 6: Update tracking.json via resolve-tracking.sh
  - Step 7: Output summary

Must reference `.agents/docs/agent-instruction.md`, `.agents/docs/rules-files.md`, `.agents/docs/cursor-rules-files.md` as runtime reading — not inline the knowledge.

Delta mode fallback: if stored commitHash is unresolvable, switch to full mode and log reason.

**Step 2: Verify**

Run: `pnpm oat:validate-skills 2>&1 | grep -i "agent-instructions-analyze"`
Expected: Skill appears in validation output without errors

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze/SKILL.md
git commit -m "feat(p02-t03): add oat-agent-instructions-analyze skill"
```

---

## Phase 3: Apply Skill

### Task p03-t01: Create instruction file templates

**Files:**
- Create: `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/agents-md-root.md`
- Create: `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/agents-md-scoped.md`
- Create: `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
- Create: `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/frontmatter/claude-rule.md`
- Create: `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/frontmatter/cursor-rule.md`
- Create: `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/frontmatter/copilot-instruction.md`
- Create: `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/frontmatter/copilot-shim.md`

**Step 1: Implement**

Create templates for each file type:

- **agents-md-root.md**: Root AGENTS.md template with sections for dev commands, architecture, conventions
- **agents-md-scoped.md**: Scoped/package AGENTS.md template with sections for package-specific stack, commands, conventions
- **glob-scoped-rule.md**: Provider-agnostic body template for glob-scoped rules (the shared content)
- **frontmatter/claude-rule.md**: Claude rule frontmatter example (`paths` array)
- **frontmatter/cursor-rule.md**: Cursor rule frontmatter example (`alwaysApply`/`globs`/`description`)
- **frontmatter/copilot-instruction.md**: Copilot scoped instruction frontmatter example (`applyTo` glob)
- **frontmatter/copilot-shim.md**: Minimal `copilot-instructions.md` shim with HTML comment explaining why it exists (AGENTS.md support is setting-gated in VS Code via `chat.useAgentsMdFile`)

Key design: glob-scoped rules share identical body content across providers — only frontmatter differs.

**Step 2: Verify**

Read each template, confirm frontmatter fields match provider-reference docs.

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/
git commit -m "feat(p03-t01): add instruction file templates with per-provider frontmatter"
```

---

### Task p03-t02: Create apply plan template

**Files:**
- Create: `.agents/skills/oat-agent-instructions-apply/references/apply-plan-template.md`

**Step 1: Implement**

Template for what the user reviews before generation:
- Numbered list of recommendations (from analysis artifact)
- Per-recommendation: action (create/update/skip), target file path, provider, rationale
- User marks each as approve/modify/skip
- Summary of approved actions before proceeding

**Step 2: Verify**

Read template, confirm it's clear and actionable.

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-apply/references/apply-plan-template.md
git commit -m "feat(p03-t02): add apply plan review template"
```

---

### Task p03-t03: Symlink resolve-tracking.sh into apply skill

**Files:**
- Create: `.agents/skills/oat-agent-instructions-apply/scripts/resolve-tracking.sh` (symlink)

**Step 1: Implement**

```bash
mkdir -p .agents/skills/oat-agent-instructions-apply/scripts
ln -s ../../oat-agent-instructions-analyze/scripts/resolve-tracking.sh \
  .agents/skills/oat-agent-instructions-apply/scripts/resolve-tracking.sh
```

**Step 2: Verify**

Run: `ls -la .agents/skills/oat-agent-instructions-apply/scripts/resolve-tracking.sh`
Expected: Symlink pointing to `../../oat-agent-instructions-analyze/scripts/resolve-tracking.sh`

Run: `bash .agents/skills/oat-agent-instructions-apply/scripts/resolve-tracking.sh read agentInstructions`
Expected: Returns tracking data (or empty if no prior run)

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-apply/scripts/resolve-tracking.sh
git commit -m "feat(p03-t03): symlink resolve-tracking.sh into apply skill"
```

---

### Task p03-t04: Write apply SKILL.md

**Files:**
- Create: `.agents/skills/oat-agent-instructions-apply/SKILL.md`

**Dependencies:** p03-t01, p03-t02, p03-t03

**Step 1: Implement**

Write the apply SKILL.md (~350 lines) with:
- Frontmatter (name, description, allowed-tools, etc.)
- Mode assertion (OAT MODE: Agent Instructions Apply)
- Process steps:
  - Step 0: Intake (search `.oat/repo/analysis/` for latest analysis artifact, or suggest running analyze)
  - Step 1: User reviews recommendations (numbered list, approve/modify/skip each)
  - Step 2: Create branch (`git checkout -b oat/agent-instructions-YYYY-MM-DD-HHmm`)
  - Step 3: Generate/update instruction files (templates for new, preserve manual customizations for updates)
  - Step 4: Commit (`git add` specific files, user confirms)
  - Step 5: Push + PR via `gh` (follow oat-project-pr-final pattern, fallback to manual)
  - Step 6: Update tracking.json via resolve-tracking.sh
  - Step 7: Output summary (files created/updated, PR URL, next step)

Multi-format composition: AGENTS.md first (canonical), CLAUDE.md uses `@AGENTS.md` import, glob-scoped rules written as single body with per-provider frontmatter stamped per detected provider. No content duplication.

**Step 2: Verify**

Run: `pnpm oat:validate-skills 2>&1 | grep -i "agent-instructions-apply"`
Expected: Skill appears in validation output without errors

**Step 3: Commit**

```bash
git add .agents/skills/oat-agent-instructions-apply/SKILL.md
git commit -m "feat(p03-t04): add oat-agent-instructions-apply skill"
```

---

## Phase 4: Integration

### Task p04-t01: Update oat-repo-knowledge-index to write tracking.json

**Files:**
- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`

**Step 1: Implement**

Add a step to the knowledge index SKILL.md that writes to tracking.json after successful completion:

```bash
bash .agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh \
  write knowledgeIndex "$(git rev-parse HEAD)" "$(git branch --show-current)" full
```

This is additive — insert the step after the existing final step.

**Step 2: Verify**

Read the modified SKILL.md, confirm the tracking step is correctly placed and uses resolve-tracking.sh.

**Step 3: Commit**

```bash
git add .agents/skills/oat-repo-knowledge-index/SKILL.md
git commit -m "feat(p04-t01): integrate knowledge index with tracking manifest"
```

---

### Task p04-t02: Validate and sync skills

**Files:**
- No new files (validation only)

**Step 1: Verify**

Run:
```bash
pnpm oat:validate-skills
pnpm run cli -- sync --scope all --apply
```
Expected: Both new skills pass validation and appear in sync output

**Step 2: Commit**

```bash
git add -A  # sync may update manifest and symlinks
git commit -m "chore(p04-t02): validate and sync agent instructions skills"
```

---

### Task p04-t03: Update repo README with analysis directory docs

**Files:**
- Modify: `.oat/repo/README.md`

**Step 1: Implement**

Update `.oat/repo/README.md` to document the `analysis/` directory, its purpose, and relationship to the agent instructions skills.

**Step 2: Verify**

Read updated README, confirm analysis/ section is present and accurate.

**Step 3: Commit**

```bash
git add .oat/repo/README.md
git commit -m "docs(p04-t03): document analysis directory in repo README"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| final | code | received | 2026-02-19 | reviews/final-review-2026-02-19-v2.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 5 tasks — Foundation (tracking manifest, shell scripts, analysis directory)
- Phase 2: 3 tasks — Analyze skill (templates, references, SKILL.md)
- Phase 3: 4 tasks — Apply skill (templates, symlink, SKILL.md)
- Phase 4: 3 tasks — Integration (knowledge index update, validation, docs)

**Total: 15 tasks**

Ready for code review and merge.

---

## References

- Imported Source: `references/imported-plan.md`
- Agent instruction guidance: `.agents/docs/agent-instruction.md`
- Provider reference: `.agents/docs/provider-reference.md`
- Rules files reference: `.agents/docs/rules-files.md`
- Cursor rules reference: `.agents/docs/cursor-rules-files.md`
- Copilot research: `.oat/repo/reviews/github-copilot-instructions-research-2026-02-19.md`
- Knowledge index pattern: `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- Review pattern: `.agents/skills/oat-review-provide/SKILL.md`
- PR pattern: `.agents/skills/oat-project-pr-final/SKILL.md`
