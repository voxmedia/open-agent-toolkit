---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-04-24
oat_generated: false
---

# Discovery: skill-cli-migration

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Migrate read-only skills to use `oat project status --json` instead of hand-parsing `state.md` frontmatter with `grep`/`awk`, and add an `npx @open-agent-toolkit/cli` fallback for environments without `oat` installed (e.g. cloud agents).

Stated value drivers:

- **Deterministic** — single parse path owned by the CLI; no bash-escaping or regex brittleness.
- **Less duplication** — the same 2–5 lines of grep/awk appear across many skills; one canonical pattern replaces them.
- **Token-efficient** — one structured output replaces several targeted grep/awk/`Read state.md` invocations.
- **Unlocks cloud-env use** — skills should still work when `oat` is not on `$PATH` but `npx` is available.

Sizing: L, a few days to land.

## Key Findings (from scoping scan)

1. **`oat --json project status` already exists and is complete for state.md needs.**
   Every `state.md` field currently grepped by skills is present in the JSON output:

   | Hand-parsed field   | JSON path              |
   | ------------------- | ---------------------- |
   | `oat_phase`         | `project.phase`        |
   | `oat_phase_status`  | `project.phaseStatus`  |
   | `oat_workflow_mode` | `project.workflowMode` |
   | `oat_docs_updated`  | `project.docsUpdated`  |
   | `oat_last_commit`   | `project.lastCommit`   |

   No CLI shape changes are required for the state.md migration.

2. **Skills in scope (grep `state.md` today):** 7 skills.
   - `oat-project-progress`
   - `oat-project-pr-progress`
   - `oat-project-pr-final`
   - `oat-project-plan`
   - `oat-project-review-provide`
   - `oat-project-reconcile`
   - `oat-project-complete`

   Several of these also **write** `state.md` (e.g., `oat-project-plan`, `oat-project-pr-final`, `oat-project-complete`). Migration touches the **read path only**. Writes are out of scope.

3. **Out-of-scope grepping surfaces.** Skills that grep `.oat/repo/knowledge/project-index.md` (`oat_source_head_sha`, `oat_source_main_merge_base_sha`, `oat_generated_at`) are **not** covered by `project status --json`. These are separate repo-knowledge artifacts, not state.md fields, and stay as-is.

4. **Skills that `Read` state.md via tool calls (no grep/awk) are out of scope** for this pass. User chose strict scoping: "all skills that currently grep state.md." Broader migration is a follow-up if this pass validates the pattern.

## Solution Space

### Approach 1: Inline shell preamble per skill _(Chosen)_

Each migrated skill's bash block starts with a 2–3 line preamble that resolves the CLI and fetches JSON once, then parses the needed fields with `jq` (primary) or `node -e` (portable fallback). The state.md grep/awk lines are replaced with JSON extraction.

**Tradeoffs:** mild duplication (the preamble repeats), but zero new abstractions. Skills stay self-contained and easy to read. No external helper file for the preamble to drift from.

### Approach 2: Single documented pattern + referenced snippet

Document the pattern once in a skill-authoring reference and have skills reference it by name. **Why not:** cross-skill indirection makes inline execution harder to reason about; skills today are generally self-contained.

### Approach 3: Shipping a helper (`oat-json` or shell function)

Ship a thin wrapper that hides oat-vs-npx resolution. **Why not:** adds a new surface to maintain, and the resolution logic is two lines.

### Chosen Direction

**Inline preamble per skill.** User validated.

## Key Decisions

1. **CLI surface:** use existing `oat --json project status`. No new flags, no CLI extension in this project.
2. **Preamble resolution:**
   ```
   OAT_CMD=$(command -v oat >/dev/null 2>&1 && echo oat || echo "npx @open-agent-toolkit/cli")
   ```
   `oat` first, `npx @open-agent-toolkit/cli` fallback. This matches user preference for `oat` when locally installed.
3. **JSON parsing:** prefer `jq -r '.project.fieldName // ""'` as the canonical form. `jq` is standard on dev and CI environments.
4. **Scope:** only skills that currently grep `state.md` (7 skills). Broader migration is a follow-up.
5. **Read path only:** for skills that also write `state.md`, we do not touch their write logic.
6. **Parallel-safe fetch:** each skill fetches JSON once per invocation and reuses it locally. No caching across skills.

## Constraints

- `state.md` remains the source of truth for project state on disk. JSON is a derived view.
- Skill content length and structure must stay within the skill-authoring conventions (`create-oat-skill` template, step indicators, required sections).
- Canonical skill `version:` frontmatter must bump for every edited `.agents/skills/*/SKILL.md` in the PR.
- Node/npx availability is assumed for the fallback branch. Envs without either cannot run skills — acceptable for "cloud agents that can `npx`" target users.

## Success Criteria

- All 7 in-scope skills no longer invoke `grep "^oat_..." state.md` / `awk` for the listed fields.
- Each migrated skill uses the shared preamble pattern and extracts fields from JSON.
- Running each skill in a worktree **with** `oat` on `$PATH` produces unchanged behavior for its status-reporting code paths.
- Running each skill in a worktree **without** `oat` on `$PATH` but with `npx` available succeeds via the fallback.
- Skill `version:` frontmatter bumped on every touched skill.
- Package lockstep version bump applied (`.agents/skills` changes trigger the 5-package public bump per AGENTS.md).

## Out of Scope

- Migrating skills that only `Read` state.md via tool calls (no grep/awk).
- Migrating hand-parsing of `.oat/repo/knowledge/project-index.md` and other non-state-md frontmatter files.
- Extending `project status --json` output with new fields.
- Any writes to `state.md`.
- Introducing a helper script, shell function, or `oat-json` wrapper.

## Open Questions

- **Verification strategy:** how do we smoke-test each migrated skill end-to-end? Proposed in plan: invoke each skill in this worktree against the scaffolded project and capture diff vs. pre-migration behavior.
- **Error-path parity:** skills today silently degrade when `grep` fails (empty string). The JSON path may error more loudly if `oat` is not a project root. The preamble should preserve "empty on failure" semantics.

## Next Steps

- **Quick mode → straight to plan** is the recommended next step. Scope is clear, the CLI is already capable, and the pattern is small enough to not require a separate design artifact.
