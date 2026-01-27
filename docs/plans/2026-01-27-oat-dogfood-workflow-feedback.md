# Feedback: OAT Dogfood Workflow Implementation Plan

Reviewed: `docs/plans/2026-01-27-oat-dogfood-workflow.md` (dated 2026-01-27)

Overall: the plan is directionally solid and matches the v2 design intent (knowledge-first + router + phased workflow). It is not ready to execute as-written because a few items will break on this repo / on non-Claude tools, and a few conventions are internally inconsistent.

## Recommendation

Proceed after addressing the “Blockers” section below. Most fixes are small (paths, numbering, metadata, and making Claude-specific tooling optional).

## Blockers (Must Fix Before Executing)

### 1) Incorrect vendoring source paths (Task 2)

The plan references:
- `/Users/thomas.stang/Code/vox/honeycomb/.claude/agents/gsd-codebase-mapper.md`
- `/Users/thomas.stang/Code/vox/honeycomb/.claude/agents/gsd-codebase-mapper/templates/`

But our agreed upstream references are in:
- `/Users/thomas.stang/Code/workflow-research/get-shit-done/agents/gsd-codebase-mapper.md`
- `/Users/thomas.stang/Code/workflow-research/get-shit-done/agents/gsd-codebase-mapper/templates/`

Fix: update Task 2 source paths to the `workflow-research/get-shit-done/...` locations (and keep attribution headers).

### 2) Phase/Task numbering is inconsistent with the document’s own “Phase X” sections

Examples:
- Phase 2 is Discovery, but Task 10 writes `state.md` as `oat_current_task: p01-complete` and commits as `docs(p01): complete discovery...`.
- Spec is Phase 3, but Task 14 uses `docs(p02): complete specification...`.
- Design is Phase 4, but Task 18 uses `docs(p03): complete design...`.
- Plan is Phase 5, but Task 22 uses `docs(p04): complete implementation plan...`.

Fix options (pick one and apply consistently):
1) Make `pNN` always mean “workflow phase number” (Discovery=02, Spec=03, Design=04, Plan=05, Implement=06). Then update all `docs(pNN)` and `state.md` phase markers accordingly.
2) Split “workflow phase” vs “implementation plan phase/task” identifiers. For example:
   - `wf02` / `wf03` for workflow docs (discovery/spec/design/plan/implement readiness)
   - `p02-t03` reserved for the *implementation plan’s* tasks only (during `oat-implement`)

Right now it mixes both, which will confuse both humans and automation.

### 3) Claude-specific “superpowers:*” requirements should be optional

The plan/template repeatedly includes:
> “For Claude: REQUIRED SUB-SKILL: Use superpowers:executing-plans…”

That is Claude-specific and will not work in Codex/Cursor contexts. It’s fine as an optional execution mode, but it should not be a hard requirement embedded in templates.

Fix:
- Reword those headers as “Optional: if your agent supports plan-execution mode, use it. Otherwise execute step-by-step.”
- Keep the plan format (steps, expected outputs) as the cross-tool portable “contract”.

### 4) Skill packaging format is unclear for this repo (`skill.json` vs `SKILL.md` + AGENTS table)

This repo currently uses `.agent/skills/<name>/SKILL.md` and registers skills in `AGENTS.md` for `npx openskills read <skill-name>`.

The plan introduces `.agent/skills/<name>/skill.json` for every skill. There’s no evidence in this repo that `skill.json` is required or consumed.

Fix:
- Either remove `skill.json` entirely (v1 simplest), or
- Confirm openskills requires it and document the exact schema and loader behavior (otherwise it’s extra surface area that can silently drift).

### 5) Generated file frontmatter: missing “source head sha” / “base sha” fields we discussed

The plan uses only `oat_source_main_merge_base_sha`.

Given squash merges / rebases, we previously discussed storing enough to reason about staleness even if a specific commit vanishes from history. At minimum, generated knowledge docs should carry:
- `oat_source_head_sha` (HEAD at generation time)
- `oat_source_main_merge_base_sha` (merge-base with `origin/main`)
- optionally `oat_source_branch` (if applicable) and/or `oat_source_main_sha` (current `origin/main` at generation time)

Fix:
- Update the frontmatter conventions in knowledge generation to include both the head sha and merge-base sha.

## Non-Blocking Issues / Improvements (Should Fix Soon)

### A) Knowledge artifacts: commit vs ignore policy should be explicit

Task 5 (“Commit Knowledge Base”) commits `.oat/knowledge/*.md`.

That may be OK for dogfooding in this repo, but for the toolkit we should be explicit about:
- Whether `.oat/knowledge/` is intended to be committed (team-shared) vs local-only (regenerate on demand).
- If committed, whether refresh is “overwrite in-place” vs “timestamped snapshots”.

Suggestion for v1:
- Commit knowledge artifacts for this repo (so other contributors can read them).
- Add a note that downstream adopters can add `.oat/knowledge/` to `.gitignore` if they prefer.

### B) “Refresh” behavior should avoid destructive deletes

`rm -rf .oat/knowledge/*.md` is simple but risky if a human adds a hand-written note.

Suggestion:
- Only delete files that have `oat_generated: true` frontmatter, or
- Write generated files under `.oat/knowledge/generated/` and keep `.oat/knowledge/notes/` for humans.

### C) Staleness checks should be warn-only in v1 (and clarify thresholds)

The router includes age thresholds (7/14/30 days) and file-count thresholds (10/20/50).

Suggestion:
- Keep warn-only for v1 (don’t block work), but include:
  - “stale because age”, “stale because diff”, and “stale because both”
  - an easy “regenerate now” branch
  - a way to scope staleness to a project’s touched paths (future enhancement)

### D) Example project location

Committing `.agent/projects/example-todo-api/` may be OK, but it can blur the line between “real projects” vs “examples”.

Suggestion:
- Put examples under `docs/examples/...` or `.agent/projects/_examples/...` to make it obvious they are templates/examples.

### E) Template naming consistency (case)

Task 2 uses template files `STACK.md`, `ARCHITECTURE.md`, etc, while generated outputs are `stack.md`, `architecture.md`, etc.

That’s workable, but pick one convention and stick to it everywhere (including links in `project-index`).

## Consistency With Design v2 (Quick Check)

Matches design v2:
- Knowledge-first gating (router blocks if missing knowledge).
- Router (`oat-progress`) concept aligns with GSD `/gsd:progress`.
- HiL phase gates supported via `oat_hil_phases`.
- Spec includes “High-Level Design (Proposed)”, enabling “quick mode” to skip separate design in simple cases.

Still missing (but non-blocking for v1):
- Explicit “quick mode” decision logic (when is `design.md` required vs optional).
- Parallelism support: plan describes it but doesn’t include reconciliation mechanics (fine for v1).

## Concrete Edit List (Minimal Patch Set)

1) Fix vendoring source paths in Task 2 to point at `workflow-research/get-shit-done/...`.
2) Decide and apply one consistent meaning for `pNN` across:
   - commit messages (`docs(pNN)`, `feat(pNN-tMM)`)
   - `state.md` markers
   - implementation plan task IDs
3) Make “superpowers:*” tooling optional everywhere (templates + skill steps).
4) Drop `skill.json` unless/until openskills in this repo is confirmed to require it.
5) Expand knowledge doc frontmatter to include both `oat_source_head_sha` and `oat_source_main_merge_base_sha`.

