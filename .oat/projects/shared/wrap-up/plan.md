---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-10
oat_phase: plan
oat_phase_status: complete
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/.claude/plans/luminous-greeting-crystal.md
oat_import_provider: claude
oat_plan_hill_phases: ['p01']
oat_auto_review_at_checkpoints: true
oat_generated: false
---

# Implementation Plan: wrap-up

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Ship an `oat-wrap-up` skill (authored via `create-oat-skill`) that reads local OAT project summaries and merged PR metadata over a user-specified time window (past week, past two weeks, custom dates) and produces a single markdown wrap-up describing what shipped — features, bug fixes, and new user-facing capabilities. The skill is manual/model-invocable; automation patterns for host agents and cron are documented in the skill's references.

**Architecture:** The skill discovers summary files from three local locations (active projects, local archive, version-controlled export directory), filters them by `oat_last_updated` frontmatter, fetches merged PRs via the same `gh api graphql` pattern used by `collect-comments.ts`, partitions PRs into "shipped via OAT projects" vs "other merged PRs" by cross-referencing summary content, and writes a markdown report to a new version-controlled directory keyed by a new `archive.wrapUpExportPath` config value. Cross-teammate visibility comes from running the **existing** `oat project archive sync` command (at `packages/cli/src/commands/project/archive/index.ts:244`) beforehand to hydrate the local archive with teammates' archived projects — that is a documented prerequisite, not a new feature this plan ships.

**Tech Stack:** TypeScript 5.8 (ESM), Node 22, pnpm + Turborepo, oxlint + oxfmt, Node test runner (match existing `packages/cli` pattern), `gh` CLI, OAT skill framework (`create-oat-skill` wrapping `create-agnostic-skill`).

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add archive.wrapUpExportPath config key`.

## Planning Checklist

- [ ] Confirmed HiLL checkpoints with user
- [ ] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: `oat-wrap-up` skill

Single phase. Ships as one PR. Prerequisite for generating cross-teammate wrap-ups: users run `oat project archive sync` beforehand so teammates' archived projects are hydrated locally. The skill warns if the local archive appears empty but `archive.s3Uri` is configured.

### Task p01-t01: Add `archive.wrapUpExportPath` config key

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/commands/config/index.ts` (five wiring points — see context)
- Modify: `packages/cli/src/commands/config/index.test.ts` (or nearest existing config test — follow the pattern used for `archive.summaryExportPath`)
- Modify: `packages/cli/src/config/oat-config.test.ts` (if present)

**Context:**

- New config key `archive.wrapUpExportPath` mirrors the existing `archive.summaryExportPath`. Default: `.oat/repo/reference/wrap-ups`. **No empty-string opt-out** — the existing config stack silently drops empty strings on load (`oat-config.ts:184-190` trim-truthy check) and `normalizeSharedRoot` at `config/index.ts:410` throws on empty values on write. Users who don't want a persisted report use `--dry-run` or `--output /dev/null`.
- The CLI config surface has **five** wiring points that must be updated together for a new key to be readable and writable via `oat config`:
  1. `ConfigKey` union type at `config/index.ts:18-39` — add `'archive.wrapUpExportPath'` literal.
  2. `KEY_ORDER` array at `config/index.ts:78-100` — insert in alphabetical-within-group position (after `archive.summaryExportPath`).
  3. `CONFIG_CATALOG` at `config/index.ts:102-393` — add a new entry modeled on the `archive.summaryExportPath` entry at `config/index.ts:222-232` (for `oat config describe`).
  4. `getConfigValue` archive branch at `config/index.ts:486-507` — add the `archive.wrapUpExportPath` case mirroring `archive.summaryExportPath` at line 498.
  5. `setConfigValue` archive branch at `config/index.ts:639-666` — add the `archive.wrapUpExportPath` case mirroring `archive.summaryExportPath` at line 646 (uses `normalizeSharedRoot`, which throws on empty — that is the desired behavior).
- Normalization in `oat-config.ts` must match the `summaryExportPath` pattern at `oat-config.ts:183-190` (trim, strip trailing slashes, `normalizeToPosixPath`).
- Defaults map in `resolveEffectiveConfig` at `packages/cli/src/config/resolve.ts:75` must include an entry so `oat config get archive.wrapUpExportPath` returns the default when unset.

**Step 1: Write test (RED)**

Add unit tests to the nearest existing config test(s):

1. **Default resolution**: When `archive.wrapUpExportPath` is unset, `oat config get archive.wrapUpExportPath` returns `.oat/repo/reference/wrap-ups`.
2. **Explicit override via set**: `oat config set archive.wrapUpExportPath "custom/wrap-ups/"` normalizes to `custom/wrap-ups` (trim + trailing-slash strip + posix normalization).
3. **Get after set**: Round-trips through `readOatConfig` → `getConfigValue` with source `config.json`.
4. **List** includes the new key in its KEY_ORDER position.
5. **Describe** surfaces the new catalog entry for `archive.wrapUpExportPath`.
6. **Empty string on set** → throws `"Shared config values cannot be empty"` (matches existing `normalizeSharedRoot` contract; no opt-out semantics).

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests fail (RED) — key is not wired through yet.

**Step 2: Implement (GREEN)**

1. Add `wrapUpExportPath?: string` to `OatArchiveConfig` at `oat-config.ts:20-24`.
2. Extend the `normalizeOatConfig` archive branch at `oat-config.ts:172-194` to handle the new field (mirror `summaryExportPath`).
3. Add a default entry to the defaults map at `packages/cli/src/config/resolve.ts:41-68`.
4. Update all five wiring points in `config/index.ts` listed in Context.
5. Keep the `ConfigKey` union alphabetical within the archive group.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests pass (GREEN).

**Step 3: Refactor**

- Confirm `CONFIG_CATALOG` description text is accurate and distinct from `summaryExportPath` (summaries vs wrap-ups).
- Verify no copy-paste errors in the get/set branches.

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli test
```

Expected: All clean.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/resolve.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts packages/cli/src/config/oat-config.test.ts
git commit -m "feat(p01-t01): add archive.wrapUpExportPath config key for wrap-up reports"
```

---

### Task p01-t02: Author `oat-wrap-up` skill via `create-oat-skill`

**Files:**

- Create: `.agents/skills/oat-wrap-up/SKILL.md`
- Create: `.agents/skills/oat-wrap-up/references/report-template.md`
- Create: `.agents/skills/oat-wrap-up/references/automation-recipes.md`

**Context:**

- Invoke the `create-oat-skill` workflow (follow its checklist; it wraps `create-agnostic-skill` and adds OAT conventions). The resulting `SKILL.md` must include a mode assertion, `OAT ▸ WRAP-UP` progress banner, `{PROJECTS_ROOT}` resolution, and the runtime-split question-handling contract (Claude Code `AskUserQuestion` / Codex equivalent / plain text fallback).
- Frontmatter:
  ```yaml
  name: oat-wrap-up
  version: 1.0.0
  description: Use when preparing a shipping digest or weekly/biweekly wrap-up summarizing OAT projects and merged PRs over a time window. Reads local summary files and GitHub PR metadata; writes a version-controlled markdown report.
  argument-hint: '[--since YYYY-MM-DD] [--until YYYY-MM-DD] [--past-week|--past-2-weeks|--past-month] [--output <path>] [--dry-run]'
  allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
  user-invocable: true
  ```
- Skill body must document all 11 algorithm steps (summarized below; full detail lives in `references/imported-plan.md` "Phase 2 → Algorithm", noting the imported source still uses the old two-phase numbering).
- **Prerequisite hint**: step 1 (mode assertion + banner) should warn if `archive.s3Uri` is configured but `.oat/projects/archived/` contains no `.oat-archive-source.json` files, and tell the user to run `oat project archive sync` (the existing command at `packages/cli/src/commands/project/archive/index.ts:244`) so teammates' archived projects are visible to the wrap-up. Do NOT auto-invoke the sync — just warn.

**11-step algorithm** (one step indicator per step in SKILL.md):

1. Banner + mode assertion + archive-sync prerequisite warning.
2. Resolve inputs (parse args, resolve named ranges to concrete dates, compute `window_label`, validate).
3. Resolve config via `oat config get` (`projects.root`, `archive.summaryExportPath`, `archive.wrapUpExportPath`, `gh repo view` for owner/name).
4. Discover summary files from three locations: active projects (`{PROJECTS_ROOT}/*/summary.md` and multi-scope `.oat/projects/*/*/summary.md`), local archive (`.oat/projects/archived/*/summary.md` including timestamp-suffixed variants), and version-controlled export (`{summaryExportPath}/*.md`).
5. Parse and filter each file — verify OAT origin (frontmatter `oat_generated: true` OR filename `{YYYYMMDD}-{project}.md`), extract date (priority: `oat_last_updated` → `{YYYYMMDD}` via `parseArchiveSnapshotName` → file mtime), keep those in `[since, until]`.
6. Dedupe by project name (latest `oat_last_updated` wins; tie-break: active > archived > exported).
7. Fetch merged PRs via `gh api graphql` reusing the search-string pattern from `collect-comments.ts:198-205`, with pagination via `endCursor`.
8. Cross-reference PRs against included summaries; partition into "Shipped via OAT projects" vs "Other merged PRs".
9. Synthesize the report by reading Overview + What Was Implemented per summary (no string concatenation). Apply the summary template section-omission rule.
10. Write the report to `{repoRoot}/{wrapUpExportPath}/{YYYY-MM-DD}-wrap-up-{label}.md` (or stdout if `--dry-run`, or `--output` override).
11. Final banner: `OAT ▸ WRAP-UP ▸ DONE — <N> summaries + <M> PRs → <path>`.

**`references/report-template.md`** — markdown skeleton used by step 9:

```markdown
---
oat_wrap_up: true
oat_generated: true
window_since: YYYY-MM-DD
window_until: YYYY-MM-DD
window_label: past-week
generated_at: <ISO>
---

# Wrap-up: YYYY-MM-DD to YYYY-MM-DD

## TL;DR

## Features introduced

## Bug fixes

## New user-facing capabilities

## Shipped via OAT projects

## Other merged PRs

## Open follow-ups

## Included summaries (provenance)
```

**`references/automation-recipes.md`** — three patterns:

1. Claude Code — `CronCreate` trigger sending `/oat-wrap-up --past-week` on a schedule. Example trigger JSON.
2. Codex host — equivalent scheduled-trigger if the runtime exposes one; otherwise fall through to recipe #3.
3. Plain cron / systemd timer — invoke via headless host CLI, e.g. `claude -p "/oat-wrap-up --past-week"`, then git-commit the result. Example crontab + systemd unit.

Rationale (baked into the skill doc): `.agents/docs/agent-instruction.md:18` explicitly scopes scheduling out of OAT, so the skill mirrors that position rather than introducing an OAT scheduler.

**Step 1: Write test (RED)**

OAT skill authoring has a validator rather than unit tests:

```bash
pnpm oat:validate-skills
```

Expected (before authoring): validator has no findings for this skill (it does not exist yet).

**Step 2: Implement (GREEN)**

- Use `create-oat-skill` to scaffold `SKILL.md` with OAT conventions (mode assertion, banner, project-root resolution, bash safety, runtime-split question handling). Verify step indicators match the actual number of algorithm steps per the feedback memory "OAT skill conventions".
- Fill in the 11 algorithm steps.
- Author `references/report-template.md` and `references/automation-recipes.md`.

Run: `pnpm oat:validate-skills`
Expected: Validator passes with no findings for `oat-wrap-up`.

**Step 3: Refactor**

- Per the feedback memory on `create-oat-skill` template conventions: verify step indicators match the actual number of steps; verify required sections are present (Mode Assertion, Progress Indicators, Success Criteria, When to Use, When NOT to Use).
- Double-check no Claude-Code-specific tools are referenced outside the `allowed-tools` list.
- New skill → version stays at `1.0.0` per AGENTS.md skills_system guardrail (no bump needed on initial creation).

**Step 4: Verify**

```bash
pnpm -s run cli -- sync --scope all
pnpm oat:validate-skills
```

Expected: Canonical skill syncs to provider views; validator clean.

**Step 5: Commit**

```bash
git add .agents/skills/oat-wrap-up/
git commit -m "feat(p01-t02): author oat-wrap-up skill with report + automation references"
```

---

### Task p01-t03: Register skill for CLI distribution

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh`
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
- Modify: any test that asserts the exact `WORKFLOW_SKILLS` list (update fixtures if present)

**Context:**

- Per `create-oat-skill` Step 6, new OAT skills must be registered in both `bundle-assets.sh` and the appropriate category TypeScript constant so `oat init tools` installs them for users.
- Category: `workflows` (lifecycle-adjacent skill that operates over projects).

**Step 1: Write test (RED)**

If the repo has a test asserting `WORKFLOW_SKILLS` contents (e.g., a non-interactive install test), update it to expect `oat-wrap-up` in the list. Otherwise, this step is a documentation-only gate.

Run: `pnpm --filter @open-agent-toolkit/cli test -- install-workflows`
Expected: Test fails (RED) once updated to include `oat-wrap-up`.

**Step 2: Implement (GREEN)**

- Add `oat-wrap-up` to the `SKILLS` array in `packages/cli/scripts/bundle-assets.sh` (alphabetical).
- Add `'oat-wrap-up'` to the `WORKFLOW_SKILLS` constant in `install-workflows.ts` (alphabetical).

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test
pnpm build
```

Expected: Tests pass; built assets under `packages/cli/assets/skills/` include `oat-wrap-up`.

**Step 3: Refactor**

N/A — registration only.

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli test
pnpm release:validate
```

Expected: All clean. `release:validate` confirms the lockstep publishable-package version bumps (since `packages/cli` changed shipped behavior via the new config key and new bundled skill).

**Step 5: Commit**

```bash
git add packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/init/tools/workflows/install-workflows.ts
git commit -m "feat(p01-t03): register oat-wrap-up skill in CLI distribution"
```

---

### Task p01-t04: End-to-end smoke + release validation

**Files:**

- No code changes. Documentation in the PR description.

**Context:**

- Verification-only task. Exercise the fully wired skill in this repo, confirm the report lands in the new configured directory, and confirm `release:validate` passes for the combined change.

**Step 1: Write test (RED)**

N/A — verification gate.

**Step 2: Implement (GREEN)**

N/A — verification gate.

**Step 3: Refactor**

Address any findings from the smoke run (minor copy / formatting fixes only; anything larger goes back to p01-t02).

**Step 4: Verify**

1. **Archive-sync prerequisite smoke**: `pnpm -s run cli -- project archive sync --dry-run` confirms the existing command is reachable and reports its plan. (No real download needed — just verifying the prerequisite the skill documents.)

2. **Dry-run smoke**:

   ```
   /oat-wrap-up --past-2-weeks --dry-run
   ```

   Expected: Report discovers summaries under `.oat/projects/shared/` and `.oat/repo/reference/project-summaries/` (both present in this repo today), correctly partitions merged PRs into "Shipped via OAT projects" vs "Other merged PRs", prints provenance for each included summary, and emits the final `OAT ▸ WRAP-UP ▸ DONE` banner.

3. **Write smoke** (without `--dry-run`):

   ```
   /oat-wrap-up --past-2-weeks
   ```

   Expected: File lands at `.oat/repo/reference/wrap-ups/{today}-wrap-up-past-2-weeks.md`, matches the report-template structure, frontmatter includes `window_since`, `window_until`, `window_label`, `generated_at`.

4. **Custom-range smoke**:

   ```
   /oat-wrap-up --since 2026-03-20 --until 2026-04-01
   ```

   Expected: Label resolves to `custom`; filename reflects `custom`; summaries outside the window are excluded.

5. **Portability check**: Re-read the `SKILL.md` body and confirm:
   - No tool references outside `allowed-tools`.
   - Runtime-split question handling is documented (Claude Code `AskUserQuestion` / Codex equivalent / plain text fallback).
   - Progress indicators print at the start of each step, not all upfront.
   - Archive-sync prerequisite warning fires when local archive has no metadata files.

6. **Final gate**:
   ```bash
   pnpm --filter @open-agent-toolkit/cli lint
   pnpm --filter @open-agent-toolkit/cli type-check
   pnpm --filter @open-agent-toolkit/cli test
   pnpm oat:validate-skills
   pnpm release:validate
   ```

Expected: All clean.

**Step 5: Commit**

If any minor fixes were made during refactor:

```bash
git add .agents/skills/oat-wrap-up/
git commit -m "chore(p01-t04): polish oat-wrap-up skill after end-to-end smoke"
```

Otherwise, no commit for this task.

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                |
| ------ | -------- | --------------- | ---------- | --------------------------------------- |
| p01    | code     | pending         | -          | -                                       |
| final  | code     | pending         | -          | -                                       |
| spec   | artifact | pending         | -          | -                                       |
| design | artifact | pending         | -          | -                                       |
| plan   | artifact | fixes_completed | 2026-04-10 | external (inline review pasted by user) |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

Note: the `plan` review row records a plan-shape critique received inline (not via an `oat-project-review-provide artifact` file). The four findings were validated against the codebase and resolved directly in this plan.md by dropping the original Phase 1, expanding p01-t01 to cover the full config-command wiring, removing the empty-string opt-out, and eliminating the private-helper reuse that existed in the pre-rework p01-t03. See "Plan rework" in `implementation.md` for the per-finding disposition.

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks — `oat-wrap-up` skill (config key + full config-command wiring, SKILL + references, CLI distribution wiring, end-to-end smoke)

**Total: 4 tasks**

Ready for code review and merge. Ships as a single PR. Cross-teammate visibility comes from the **existing** `oat project archive sync` command, documented as a prerequisite in the skill itself — no new CLI command ships in this project.

---

## References

- Design: `design.md` (optional in import mode; not produced)
- Spec: `spec.md` (optional in import mode; not produced)
- Discovery: `discovery.md` (optional in import mode; not produced)
- Imported Source: `references/imported-plan.md` (the imported source describes a now-discarded Phase 1 `oat project archive pull` command; see "Plan rework" in `implementation.md` and the rework section of `/Users/thomas.stang/.claude/plans/luminous-greeting-crystal.md` for why it was dropped)
- Feature-planning workflow selection: option 3 (Import external plan) per `AGENTS.md`
- **Prerequisite (existing, not shipped by this plan):** `oat project archive sync` at `packages/cli/src/commands/project/archive/index.ts:244`, documented at `apps/oat-docs/docs/workflows/projects/lifecycle.md:69`. Downloads archived project snapshots from S3 into `.oat/projects/archived/` with per-project dedup via `.oat-archive-source.json`.
- Config surface wiring (p01-t01 reference points): `packages/cli/src/commands/config/index.ts` ConfigKey union L18-39, KEY_ORDER L78-100, CONFIG_CATALOG L102-393, getConfigValue archive branch L486-507, setConfigValue archive branch L639-666; existing `archive.summaryExportPath` template at L222-232, L498, L646.
- Config normalization: `packages/cli/src/config/oat-config.ts:183-190` (`summaryExportPath` pattern) and `:20-24` (`OatArchiveConfig` interface).
- Effective config defaults: `packages/cli/src/config/resolve.ts:41-68`.
- Merged-PR query pattern: `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts:198-205` (search-string construction + pagination).
- Skill authoring: `.agents/skills/create-oat-skill/SKILL.md` (wraps `.agents/skills/create-agnostic-skill/SKILL.md`).
- Reference model for artifact-producing OAT skill: `.agents/skills/oat-docs-analyze/SKILL.md`.
- Summary frontmatter schema: `.oat/templates/summary.md` (`oat_generated`, `oat_last_updated`, etc.).
- Package guardrail: `AGENTS.md` publishable-package lockstep + `pnpm release:validate` definition of done.
