# OAT Workflow User Feedback (Dogfood)

Use this file to capture friction, pain points, confusing steps, and “wish this existed” moments while running the OAT workflow in this repo.

**Scope:** OAT dogfood workflow (skills under `.agent/skills/oat-*`, templates under `.oat/templates/`, and supporting scripts under `.oat/scripts/`).

## How to Log Feedback

Add entries as you notice them. Prefer specific reproduction steps and concrete suggestions.

## Entries

### 2026-01-29: Mapper outputs can be misleading without evidence

- **Context:** Codex artifact quality review after running `/oat:index` to generate `.oat/knowledge/repo/*.md`.
- **What happened:**
  - `integrations.md` treated `.claude/settings.local.json` as a repo config despite it being gitignored (local-only).
  - `conventions.md` described “pre-push (optional)” checks that didn’t match the actual `tools/git-hooks/pre-push`.
  - `testing.md` included “Recommended Setup”, which violates “current state only” and can become accidental policy.
- **Expected:** Knowledge docs should be strictly “what exists”, and all prescriptive claims should be evidence-backed with concrete file paths (or explicitly marked unknown/not detected).
- **Impact:** Downstream phases (design/plan/implement) can internalize incorrect conventions and waste time chasing nonexistent/optional behaviors.
- **Suggestion:** Tighten the mapper contract to (1) require file-path evidence for claims, (2) treat gitignored configs as local-only, (3) forbid recommendations in knowledge docs (keep “gaps + suggested fixes” in `concerns.md` or roadmap instead).
- **Related:** `.agent/agents/oat-codebase-mapper.md`, `.agent/skills/oat-index/SKILL.md`, `.oat/knowledge/repo/{integrations,conventions,testing}.md`.

### 2026-01-29: Dogfood project artifacts should move to `.oat/projects/shared` early

- **Context:** Running the workflow end-to-end while dogfooding and generating project artifacts (discovery/spec/design/plan/implementation/reviews).
- **What happened:** Current dogfood layout writes project artifacts to `.agent/projects/**`, which is gitignored, so project state and review artifacts don’t naturally get checked into source control.
- **Expected:** Dogfood should converge quickly toward the intended target structure under `.oat/projects/`:
  - `.oat/projects/shared/` (checked in) for active projects whose artifacts should be reviewed/collaborated on
  - `.oat/projects/local/` (gitignored) for personal experiments
  - `.oat/projects/archived/` (likely gitignored or moved later) for completed projects (future)
- **Impact:** If we keep dogfooding on `.agent/projects/**`, we’ll accumulate references and scripts that assume the old layout, and later refactors will be riskier/noisier.
- **Suggestion:** Migrate the “active project” canonical location sooner (even without full archive/local flows), and update skills to resolve projects from `.oat/projects/shared/<name>/` by default.
- **Related:** `.gitignore` (`.agent/projects/**`), `.oat/active-project` pointer semantics, `oat-*` skill project resolution logic.

### YYYY-MM-DD: {Short Title}

- **Context:** {what you were trying to do}
- **What happened:** {the friction/pain point}
- **Expected:** {what you expected instead}
- **Impact:** {time lost / confusion / errors / risk}
- **Suggestion:** {proposed change}
- **Related:** {skills/files/issues/PRs/commits}
