# Plan: Tracking Manifest + Agent Instructions Skill Family

## Context

OAT needs a way to track when analysis/generation operations last ran (and against what commit) so that subsequent runs can scope to only changed files (delta mode). This tracking is needed by the new agent instructions skills and will also benefit the existing knowledge index.

The agent instructions skills are OAT's first "value out of the box" skill family — they scan a codebase for instruction file coverage, quality, and drift, then help generate or update instruction files with a PR-based workflow. The reference knowledge base at `.agents/docs/agent-instruction.md` provides the quality criteria.

## Deliverables

1. **`.oat/tracking.json`** — version-controlled manifest tracking when OAT operations last ran
2. **`oat-agent-instructions-analyze`** — scan, evaluate, and report on instruction coverage/quality/drift
3. **`oat-agent-instructions-apply`** — interactive generation/update of instruction files with PR creation
4. **Knowledge index integration** — update `oat-repo-knowledge-index` to also write to tracking.json

---

## Directory Structure

```
.oat/tracking.json                                      # NEW — shared tracking manifest
.oat/repo/analysis/                                     # NEW — analysis output directory (peer to knowledge/, reviews/)
  .gitkeep

.agents/skills/oat-agent-instructions-analyze/
  SKILL.md
  references/
    analysis-artifact-template.md                       # Severity-rated report template
    directory-assessment-criteria.md                    # When does a directory need instructions?
    quality-checklist.md                                # Per-file quality evaluation criteria
  scripts/
    resolve-tracking.sh                                 # Shared: read/write .oat/tracking.json via jq
    resolve-providers.sh                                # Resolve active providers (args → sync config → auto-detect → interactive)
    resolve-instruction-files.sh                        # Discover instruction files by resolved provider list

.agents/skills/oat-agent-instructions-apply/
  SKILL.md
  references/
    instruction-file-templates/
      agents-md-root.md                                # Root AGENTS.md template
      agents-md-scoped.md                              # Scoped/package AGENTS.md template
      claude-rule.md                                   # .claude/rules/*.md template (paths frontmatter for conditional, plain md for always-on)
      cursor-rule.md                                   # .cursor/rules/*.mdc template (alwaysApply/globs/description frontmatter)
      copilot-instructions.md                          # .github/copilot-instructions.md + .github/instructions/*.instructions.md template
    apply-plan-template.md                             # What the user reviews before generation
  scripts/
    resolve-tracking.sh -> ../oat-agent-instructions-analyze/scripts/resolve-tracking.sh
```

## Provider Detection & Multi-Format Support

**AGENTS.md is always analyzed** — it's the canonical, provider-agnostic format.

Provider-specific formats (Cursor rules, Copilot instructions, Cline rules) are only analyzed/generated when the provider is detected or explicitly requested. The resolution hierarchy:

1. **Explicit argument** (`--providers claude,cursor,copilot`) — overrides everything
2. **`.oat/sync/config.json`** — already exists with `providers.{name}.enabled` — use this as the primary source
3. **Auto-detection fallback** — scan for provider directories (`.claude/`, `.cursor/`, `.github/`, etc.) if no sync config
4. **Interactive confirmation** (if TTY) — "Detected: Claude, Cursor. Analyze for other providers too?" with full provider list
5. **Non-interactive** (`--non-interactive` flag or no TTY) — skip step 4, use whatever was resolved from 1-3

No new config block in `.oat/config.json` needed — we reuse the existing `.oat/sync/config.json` provider list. One less config surface.

**Provider → instruction file format mapping:**

| Provider | Instruction Format | File Pattern |
|----------|-------------------|--------------|
| (always) | AGENTS.md | `**/AGENTS.md` |
| claude | CLAUDE.md + Claude rules | `**/CLAUDE.md`, `.claude/rules/*.md` (unconditional or `paths`-scoped) |
| cursor | Cursor rules | `.cursor/rules/*.mdc`, `.cursor/rules/*.md` (`alwaysApply`/`globs`/`description` frontmatter) |
| copilot | Copilot instructions | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` (`applyTo` globs) |
| codex | (reads AGENTS.md natively) | — |
| cline | Cline rules | `.cline/rules/*` |

## Key Design Decisions

**No subagent for analysis.** Unlike the knowledge index (7 independent documents → parallel mappers), instruction analysis is sequential — evaluating one file requires understanding what others cover (duplication detection). Design for future extraction if needed.

**Single unified report for multi-format.** Cross-format issues (duplication between AGENTS.md and .cursor/rules) are important findings. Each file evaluation row includes format type for filtering.

**Delta vs full mode:**
- Full: scan entire repo, evaluate all files and directories
- Delta: read `tracking.json` commit hash, `git diff --name-only {hash}..HEAD`, scope gap/drift analysis to changed file directories
- Quality analysis always runs on ALL instruction files regardless of mode (cheap and catches staleness)

**Analysis output location:** `.oat/repo/analysis/` (new peer to `knowledge/` and `reviews/`). Version-controlled, shared.

---

## Phased Tasks

### Phase 1: Foundation

| ID | Task | Files |
|----|------|-------|
| T-01 | Create `.oat/tracking.json` with `{"version": 1}` | `.oat/tracking.json` |
| T-02 | Create `resolve-tracking.sh` (read/write/init subcommands) | `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh` |
| T-03 | Create `resolve-instruction-files.sh` (discover files by provider detection) | `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh` |
| T-04 | Create `resolve-providers.sh` (provider resolution: args → sync config → auto-detect → interactive) | `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh` |
| T-05 | Create `.oat/repo/analysis/` directory + update `.oat/repo/README.md` | `.oat/repo/analysis/.gitkeep`, `.oat/repo/README.md` |

All Phase 1 tasks can run in parallel. T-03 depends on T-04 (uses provider list to determine which file patterns to search).

### Phase 2: Analyze Skill

| ID | Task | Files |
|----|------|-------|
| T-06 | Create analysis artifact template | `references/analysis-artifact-template.md` |
| T-07 | Create directory assessment criteria + quality checklist references (distilled from `.agents/docs/agent-instruction.md`; skills also read the full docs at runtime) | `references/directory-assessment-criteria.md`, `references/quality-checklist.md` |
| T-08 | Write the analyze SKILL.md | `SKILL.md` (~400 lines) |

T-06 and T-07 can run in parallel. T-08 depends on all of Phase 1 + T-06/T-07.

**Analyze SKILL.md process steps:**

```
Step 0: Resolve providers + mode (resolve-providers.sh for provider list; read tracking.json for delta/full mode)
Step 1: Discover instruction files (run resolve-instruction-files.sh with provider list, build inventory)
Step 2: Evaluate quality (each file against quality-checklist.md criteria)
Step 3: Assess coverage gaps (walk directory tree against directory-assessment-criteria.md)
Step 4: Drift detection — delta mode only (git diff changed files → check parent instructions)
Step 5: Write analysis artifact to .oat/repo/analysis/agent-instructions-YYYY-MM-DD.md
Step 6: Update tracking.json
Step 7: Output summary (files evaluated, coverage %, findings by severity, next step)
```

**Quality evaluation criteria** (distilled from `.agents/docs/agent-instruction.md`):

1. Commands correct and runnable (match package.json scripts)
2. Non-negotiables near top (security rules in first screenful)
3. No duplication across root/scoped files
4. Size within budget (root <300 lines hard max 500; scoped 40-150; rules <80)
5. Scoped only for real divergence (different stack, workflow, or domain)
6. Precedence clear (override semantics explicit)
7. No circular imports
8. Definition of Done present with objective criteria
9. Staleness (referenced paths still exist, commands still valid)

**Severity categories:**
- **Critical**: Instructions actively wrong (mislead agent), missing security non-negotiables
- **High**: Significant gap — important directory has no coverage, major drift
- **Medium**: Quality issues — over size budget, duplication, stale commands
- **Low**: Polish — could be better structured, minor staleness

### Phase 3: Apply Skill

| ID | Task | Files |
|----|------|-------|
| T-09 | Create instruction file templates (root, scoped, claude rules, cursor rules, copilot) | `references/instruction-file-templates/*.md` |
| T-10 | Create apply plan template | `references/apply-plan-template.md` |
| T-11 | Symlink resolve-tracking.sh into apply skill | `scripts/resolve-tracking.sh` |
| T-12 | Write the apply SKILL.md | `SKILL.md` (~350 lines) |

T-09, T-10, T-11 can run in parallel. T-12 depends on all three.

**Apply SKILL.md process steps:**

```
Step 0: Intake (existing analysis artifact? search .oat/repo/analysis/ for latest, or suggest running analyze)
Step 1: User reviews recommendations (numbered list, approve/modify/skip each)
Step 2: Create branch (git checkout -b oat/agent-instructions-YYYY-MM-DD)
Step 3: Generate/update instruction files (templates for new, preserve manual customizations for updates)
Step 4: Commit (git add specific files, user confirms)
Step 5: Push + PR via gh (follow oat-project-pr-final pattern, fallback to manual)
Step 6: Update tracking.json
Step 7: Output summary (files created/updated, PR URL, next step)
```

**Multi-format composition:** AGENTS.md generated first (canonical). CLAUDE.md uses `@AGENTS.md` import. Cursor rules are additive `.mdc` files for topics beyond what AGENTS.md covers. No content duplication across formats.

### Phase 4: Integration

| ID | Task | Files |
|----|------|-------|
| T-13 | Update `oat-repo-knowledge-index` to write to tracking.json | `.agents/skills/oat-repo-knowledge-index/SKILL.md` (add one step) |
| T-14 | Validate + sync skills (`pnpm oat:validate-skills`, `oat sync --scope all --apply`) | — |
| T-15 | Update `.oat/repo/README.md` with analysis/ docs | `.oat/repo/README.md` |

---

## Critical Files

| File | Role |
|------|------|
| `.agents/docs/agent-instruction.md` | Quality criteria source (512 lines) — checklist and gap criteria distilled from this |
| `.agents/docs/provider-reference.md` | Provider format reference — where each tool reads instruction files |
| `.agents/docs/rules-files.md` | Cross-provider deep dive on rules/instruction files (Claude, Cursor, Copilot rules specifics) |
| `.agents/docs/cursor-rules-files.md` | Cursor-specific `.mdc` format reference (frontmatter, activation modes, naming) |
| `.agents/skills/oat-repo-knowledge-index/SKILL.md` | Pattern for tracking, frontmatter, parallel agents |
| `.agents/skills/oat-review-provide/SKILL.md` | Pattern for severity findings, artifact destination, bookkeeping |
| `.agents/skills/oat-project-pr-final/SKILL.md` | Pattern for branch/PR creation via gh |
| `.oat/sync/config.json` | Existing provider config — reused for provider detection |
| `.oat/repo/README.md` | Document new analysis/ directory |

**Skills should reference these docs** (not inline the knowledge): The SKILL.md files should instruct the agent to read `.agents/docs/agent-instruction.md`, `.agents/docs/rules-files.md`, and `.agents/docs/cursor-rules-files.md` as operational context during execution, rather than duplicating the quality criteria and format specs inline. This keeps the skills under the 500-line budget and ensures they always use the latest guidance.

## Verification

1. **tracking.json**: Create it, run `resolve-tracking.sh write agentInstructions abc123 main full agents_md`, verify JSON structure with `jq . .oat/tracking.json`
2. **resolve-instruction-files.sh**: Run against this repo, verify it finds `AGENTS.md` (root + packages/cli), `CLAUDE.md` (root + packages/cli)
3. **Analyze skill**: Run `oat-agent-instructions-analyze` against this repo — should produce analysis artifact in `.oat/repo/analysis/` with findings for the existing instruction files
4. **Apply skill**: Run `oat-agent-instructions-apply` with the analysis artifact — should offer to create/update instruction files and produce a PR
5. **Skill validation**: `pnpm oat:validate-skills` passes, both skills appear in sync
6. **Knowledge index**: Run `oat-repo-knowledge-index`, verify tracking.json gets a `knowledgeIndex` entry
