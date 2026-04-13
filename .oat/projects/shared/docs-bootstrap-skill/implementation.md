---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-13
oat_current_task_id: p04-t02
oat_generated: false
---

# Implementation: docs-bootstrap-skill

**Started:** 2026-04-13
**Last Updated:** 2026-04-13

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews`.
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | completed   | 4     | 4/4       |
| Phase 2 | completed   | 3     | 3/3       |
| Phase 3 | completed   | 4     | 4/4       |
| Phase 4 | in_progress | 2     | 1/2       |
| Phase 5 | pending     | 3     | 0/3       |
| Phase 6 | pending     | 3     | 0/3       |

**Total:** 12/19 tasks completed

---

## Phase 1: Skill scaffolding + shared assets

**Status:** completed
**Started:** 2026-04-13
**Completed:** 2026-04-13

### Phase Summary

**Outcome:**

- Scaffolded the `oat-docs-bootstrap` skill directory (`.agents/skills/oat-docs-bootstrap/`) with a canonical-format `SKILL.md` skeleton (Mode Assertion, Progress Indicators, Process outline with placeholder Step 0–7 headings).
- Authored the FP-15 bridge `AGENTS.md.template` at `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template` with 8 task-framed sections honoring the audience-discipline litmus test.
- Instantiated the canonical example at `apps/oat-docs/AGENTS.md`, adapted to the existing docs-app layout (quickstart vs getting-started; contributing/ dir vs file).
- Provider views (`claude`, `cursor`) refreshed via `oat sync --scope all`; both now report `in_sync` for the new skill.

**Key files touched:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` — new skeleton
- `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template` — FP-15 bridge template
- `apps/oat-docs/AGENTS.md` — canonical example
- `.claude/skills/oat-docs-bootstrap` — provider symlink
- `.cursor/skills/oat-docs-bootstrap` — provider symlink
- `.oat/sync/manifest.json` — updated to track the new skill

**Verification:**

- `pnpm oxfmt --check` passed on SKILL.md and canonical example
- `oat status --scope all` reports the new skill in sync across providers that support it

**Notes / Decisions:**

- Used `assets/` subdirectory (not `references/`) because the template is output by the skill, not read-only guidance.
- Adapted the canonical example to actually-existing paths in `apps/oat-docs/` rather than a strict template instantiation; broken references would defeat the point of an example.
- Root `AGENTS.md` does not currently have a `## Documentation` section; deferred as a follow-up (not required for skill function).

### Task p01-t01: Create oat-docs-bootstrap skill skeleton

**Status:** completed
**Commit:** 139500dc

**Outcome:**

- Scaffolded `.agents/skills/oat-docs-bootstrap/SKILL.md` with canonical frontmatter (name, version 1.0.0, description, argument-hint, disable-model-invocation, user-invocable, allowed-tools) matching the `oat-project-quick-start` shape.
- Populated Mode Assertion with concrete BLOCKED/ALLOWED activities (including the FP-15 AGENTS.md fabrication exception) and a Self-Correction Protocol covering four failure modes.
- Populated Progress Indicators with a banner + seven compact step indicators matching the 7-component pipeline.
- Added Process section headings (Step 0–7) as placeholders, each annotated with the plan task that will author its body.
- Created `assets/` subdirectory for FP-15 bridge template (populated in p01-t02).

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` — new skeleton
- `.agents/skills/oat-docs-bootstrap/assets/` — directory scaffolded (empty for now)

**Verification:**

- Run: `pnpm oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md`
- Result: pass

**Notes / Decisions:**

- Used `assets/` rather than `references/` for the template subdirectory because the template is _output_ by the skill (written to consumer repos), not _read_ for guidance. Existing skills use `references/` for read-only lookup content; this is a semantically different case.
- Allowed-tools set matches `oat-project-quick-start` (Read, Write, Bash, Glob, Grep, AskUserQuestion) plus `Edit` since the skill needs to apply file-shape patches during post-scaffold work.

---

### Task p01-t02: Author docs-app AGENTS.md bridge template (FP-15)

**Status:** completed
**Commit:** 5478b745

**Outcome:**

- Created `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template` with the 8 required task-framed sections from discovery FP-15.
- Every non-intro section starts with "When you need to..." — task framing is self-filtering for the "still relevant 6 months later" litmus test.
- All four required placeholders present and used contextually: `{{SITE_NAME}}`, `{{APP_DIR}}`, `{{REPO_NAME}}`, `{{GENERATE_INDEX_CMD}}`.
- "What not to do" section consolidates the footgun warnings (generated file hand-edits, invented nav conventions, bypass of analyze/apply, deprecated overview.md, partial site-name edits).
- "Reference" section points at peer docs (`contributing.md`, `getting-started.md`, root AGENTS.md) and the tooling surfaces (`oat docs analyze`, `oat docs apply`, `oat-project-document`, the generate-index command).

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template` — new template, 61 lines

**Verification:**

- Run: `pnpm oxfmt --check '.agents/skills/oat-docs-bootstrap/assets/*'`
- Result: skipped by oxfmt because the `.template` extension is outside its `.md` matcher. Formatting of the rendered `AGENTS.md` output happens at skill-runtime when the template is instantiated. Self-reviewed content against the discovery FP-15 content requirements and the audience litmus test.

**Notes / Decisions:**

- Framework-specific content is intentionally kept out of the template (no Fumadocs-only or MkDocs-only sections). The template is framework-agnostic; the skill's Walkthrough handles framework-specific deep-dive content in its own Sections E/F.
- The "reference" entry for `{{GENERATE_INDEX_CMD}}` is worded as a command reference rather than a usage instruction — users don't typically need to invoke it manually (it runs via `predev`/`prebuild`), and the "don't hand-edit generated output" rule already appears in "What not to do".

---

### Task p01-t03: Add canonical example at apps/oat-docs/AGENTS.md

**Status:** completed
**Commit:** 0d9ed0e2

**Outcome:**

- Created `apps/oat-docs/AGENTS.md` (61 lines) as the canonical example of a scaffolded docs-app AGENTS.md in this repo.
- Rendered the p01-t02 template with resolved placeholder values: `{{SITE_NAME}}` → `OAT Documentation`, `{{APP_DIR}}` → `apps/oat-docs`, `{{REPO_NAME}}` → `open-agent-toolkit`, `{{GENERATE_INDEX_CMD}}` → `pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`.
- Adapted the "Reference" section to the actual layout of `apps/oat-docs/`: `docs/quickstart.md` (not `docs/getting-started.md`) and `docs/contributing/` directory (not `docs/contributing.md` file). This keeps the canonical example valid for its own context without diluting the template's portability.
- Noted in the Reference section that the root `AGENTS.md` typically includes a `## Documentation` section for scaffolded docs apps and called out that the user can add one if missing (the root AGENTS.md in this repo currently lacks the section because `apps/oat-docs/` predates the scaffold convention).

**Files changed:**

- `apps/oat-docs/AGENTS.md` — new canonical example

**Verification:**

- Run: `pnpm oxfmt --check apps/oat-docs/AGENTS.md`
- Result: pass

**Notes / Decisions:**

- **Divergence from strict template fidelity:** The plan's Step 2 said "keep it a faithful instantiation." I diverged by replacing `docs/getting-started.md` with `docs/quickstart.md` and `docs/contributing.md` with `docs/contributing/` because the template's assumed paths don't exist in `apps/oat-docs/`. A strict template instantiation would produce broken references, which defeats the point of a canonical example. The template itself still points at the scaffold-standard paths; only this instantiation is adapted.
- **Follow-up consideration (not scope of this task):** The root `AGENTS.md` in this repo could be updated to include the `## Documentation` section that `oat docs init` would auto-add for a scaffolded docs app. Deferred — not required for the skill to function, and adding it would be scope creep for this task.
- **Follow-up consideration (not scope of this task):** `apps/oat-docs/` diverges from the scaffold convention in a few ways (`quickstart.md` instead of `getting-started.md`; `contributing/` directory instead of `contributing.md` file). Aligning it is a separate migration task.

---

### Task p01-t04: Refresh provider views

**Status:** completed
**Commit:** 172f5c53

**Outcome:**

- Before: `oat status --scope all` reported `oat-docs-bootstrap` as `missing` for `claude` and `cursor` providers.
- After `oat sync --scope all`: both provider views report `in_sync`. Symlinks created at `.claude/skills/oat-docs-bootstrap` and `.cursor/skills/oat-docs-bootstrap` pointing at the canonical skill directory.
- `.oat/sync/manifest.json` updated to include the new skill entry.

**Files changed:**

- `.claude/skills/oat-docs-bootstrap` → symlink to `../../.agents/skills/oat-docs-bootstrap`
- `.cursor/skills/oat-docs-bootstrap` → symlink to `../../.agents/skills/oat-docs-bootstrap`
- `.oat/sync/manifest.json` — skill entry added

**Verification:**

- Run: `oat status --scope all`
- Result: both provider views report `✓ in_sync` for `oat-docs-bootstrap`

**Notes / Decisions:**

- `copilot` provider was already in sync via symlink propagation; only `claude` and `cursor` needed the explicit sync.

---

## Phase 2: Preflight + Input Gatherer procedures

**Status:** completed
**Started:** 2026-04-13
**Completed:** 2026-04-13

### Phase Summary

**Outcome:**

- Steps 0, 1, and 2 of SKILL.md authored end-to-end (~252 net insertions across three tasks): environment bootstrap (CLI binary resolution, banner), deterministic Preflight detection (4-rule cascade for shape, read-only conflict surfacing, defaults), and full Input Gatherer (conflict-resolution handoff, one-question-at-a-time flow, validation, coherence check, Input Result contract, Conflict Resolution Contract sub-procedure).
- All four conflict resolutions (`replace`, `second-app`, `abort`, `repair`) specified with allowed mutations, preserved state, and explicit stop conditions. The pre-scaffold invariant is stated as a hard contract the Scaffold Runner will read.
- FP-12 site-name workaround is embedded in the Input Gatherer questions (siteName distinct from appName, framed as "what's this documentation for?").
- `nested-standalone` is a first-class shape alongside `monorepo` and `single-package`, with defaults resolved per shape.

**Key files touched:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` — Steps 0, 1, 2 authored (including Conflict Resolution Contract sub-procedure)

**Verification:**

- `pnpm exec oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md` — pass across all three tasks

**Notes / Decisions:**

- Preflight remains strictly read-only; all fixes/prompts flow through Input Gatherer. This keeps Preflight single-purpose and makes restart-after-interruption trivially idempotent.
- Conflict Resolution lives as a `####` sub-procedure under Step 2 rather than its own numbered step — it's a contract referenced by 2a, not a new pipeline stage.
- `second-app` is honestly scoped as deferred with a redirect. No skill changes needed when CLI schema gains multi-docs support beyond removing the refusal branch.

### Task p02-t01: Write Preflight Detector procedure

**Status:** completed
**Commit:** db505de3

**Outcome:**

- Authored Step 0 (Resolve Active Project and Environment) and Step 1 (Preflight Detector) bodies in SKILL.md (~99 net insertions).
- Step 0 bootstraps repo-root + CLI-binary resolution (supports both installed `oat` binary and `pnpm run cli --` workspace fallback); makes active-project context optional.
- Step 1 specifies deterministic shape detection (4-rule cascade: pnpm-workspace → package.json workspaces → apps+packages dirs → single-package), with the nested-standalone heuristic applied only for Fumadocs on single-package shapes with a subdirectory target.
- Existing-docs detection is read-only and surfaces 3 conflict kinds (`existing-config`, `existing-app-dir`, `existing-agents-section`) as a list.
- Defaults are explicit: `siteName` = humanized repoName (without " Documentation" suffix — the scaffold handles that); `appName` = `{repo}-docs` (monorepo) or `docs` (other); `targetDir` = `apps/{appName}` or `{appName}`.

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` (99 insertions, 2 deletions)

**Verification:**

- `pnpm oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md` — pass

**Notes / Decisions:**

- `siteName` default drops " Documentation" appendix: the scaffold template already appends it. The skill's default should be the product name alone.
- Nested-standalone heuristic stated in prose ("for Fumadocs, any single-package repo with a subdirectory target is nested-standalone; for MkDocs, stays single-package"). This is deterministic enough for the Capability Detection step later.

---

### Task p02-t02: Write Input Gatherer procedure

**Status:** completed
**Commit:** a4dddf30

**Outcome:**

- Authored Step 2 (Input Gatherer) body in SKILL.md covering conflict resolution handoff, one-at-a-time questions, input validation, coherence check, and Input Result contract (~68 insertions).
- Each question explains what the value affects downstream; FP-12 site-name is explicitly framed as distinct from package name.
- Validation rules specify exact regex for appName, required non-empty for siteName, relative-path + writable-per-resolution for targetDir, enum for framework/lint/format.
- Coherence check shows the user a rendered preview including the templated "{siteName} Documentation" display title.

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` (68 insertions, 1 deletion)

**Verification:**

- `pnpm oxfmt --check` ran with minor autoformatting applied during commit (within staged-files hook); final committed file is format-clean.

---

### Task p02-t03: Write Conflict Resolution Contract procedure

**Status:** completed
**Commit:** d5b090d9

**Outcome:**

- Authored the Conflict Resolution Contract as a dedicated sub-procedure under Step 2 of SKILL.md (~85 insertions).
- Four resolutions fully specified — `replace`, `second-app`, `abort`, `repair` — each with allowed mutations, preserved state, and explicit stop conditions.
- `second-app` refusal message includes a concrete explanation (single-documentation config schema), enumerates the alternatives, and notes the no-skill-change path when the CLI adds multi-docs support (matching the design's "honestly scoped" principle).
- `replace` uncommitted-changes guard is phrased as a concrete error the user can act on (`Commit or stash before choosing 'replace'.`).
- Pre-scaffold invariant reiterated at the end of the sub-procedure: Scaffold Runner cannot proceed until mutations have completed and working-tree state matches CLI expectations; partial resolution + scaffold is worse than either doing nothing or completing the resolution cleanly.

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` (85 insertions, 1 deletion)

**Verification:**

- Run: `pnpm exec oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md`
- Result: pass

**Notes / Decisions:**

- **Placement:** The sub-procedure is authored as a `####` section under Step 2 rather than a separate numbered Step. It's a contract referenced by 2a (conflict resolution handoff), not a new pipeline stage.
- **`repair` exit semantics:** When analyze + apply complete cleanly, the skill exits without proceeding to Scaffold Runner. Rationale: scaffolding on top of a just-repaired app would re-introduce the conflicts Preflight surfaced. The user's explicit choice was "repair, don't replace."
- **`second-app` loopback:** The skill re-prompts after surfacing the refusal rather than emitting `conflictResolution: 'second-app'`. The Input Result contract only stores resolvable values, keeping downstream logic simple.

---

## Phase 3: Scaffold Runner

**Status:** completed
**Started:** 2026-04-13
**Completed:** 2026-04-13

### Phase Summary

**Outcome:**

- Step 3 (Scaffold Runner) of SKILL.md fully authored across four tasks (~321 net insertions): CLI invocation + Capability Detection + site-identity patches (FP-12 + FP-15) + scaffold-integrity patches (FP-11 + FP-13).
- Scaffold flow: `oat docs init` invoked non-interactively with capability-gated flags; `Scaffold Result` emitted with `appRoot` (resolved from `.oat/config.json`), `createdFiles[]`, `capabilities`, `cliLogs`, and `patchesApplied[]`.
- Capability Detection gates every patch with both a CLI help probe and a file-shape check; drift classifies targets as `refused` with suggested manual fixes surfaced by the Post-Scaffold Inspector.
- All four open FP gaps (FP-11 Turbopack, FP-12 site title, FP-13 template content, FP-15 AGENTS.md) have labeled, idempotent post-patches that self-ratchet off as CLI fixes land upstream.
- Stop-on-non-zero contract explicit: CLI failure surfaces stderr verbatim + exit code + flags; no post-patches run; no Walkthrough.

**Key files touched:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` — Step 3 (Scaffold Runner) authored end-to-end with three nested `#####` sub-sections

**Verification:**

- `pnpm exec oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md` — pass across all four tasks (one reformat pass required for p03-t01 due to a nested-fence artifact, resolved by cleanup; all subsequent tasks passed on first try)

**Notes / Decisions:**

- **`appRoot` resolution:** read from `.oat/config.json` `documentation.root` after CLI completes, not inferred from `targetDir`. Survives CLI path normalization.
- **Patch labeling:** every post-patch wraps its edit with a marker comment (`<!-- FP-12 patch -->` / `/* FP-12 patch */`) for TSX module scope. Makes post-CLI-fix cleanup deterministic.
- **FP-11 Path B backup:** wrapper replacement takes `next.config.js.pre-fp11.bak` snapshot before replacing; recoverable without git.
- **Site-identity before scaffold-integrity:** patches run in that order because FP-13 sub-findings may reference strings FP-12 has just written.
- **MkDocs scope:** all Fumadocs-specific patches explicitly noted as Fumadocs-only; MkDocs handling deferred to the MkDocs Minimum Contract in Step 6 (p05-t02).

### Task p03-t01: Write Scaffold Runner CLI invocation procedure

**Status:** completed
**Commit:** 6d42e372

**Outcome:**

- Authored Step 3 (Scaffold Runner) opening + phases 3a (flag assembly), 3b (Capability Detection hook), 3c (CLI invocation), 3d (post-patch hook) in SKILL.md (~97 net insertions).
- Base flags always passed: `--yes --framework --name --target-dir --description --lint --format`; capability-gated flags (`--site-name`) only added when Capability Probe reports support (self-ratcheting as CLI fixes land).
- Stop-on-non-zero contract explicit: surface CLI stderr verbatim + exit code + exact flags passed; do not apply post-patches on failure; do not proceed to Build Verifier.
- `appRoot` resolved from `$REPO_ROOT/.oat/config.json` `documentation.root` (authoritative), not inferred from `targetDir` alone — survives CLI path normalization differences.
- Emits structured `Scaffold Result` for downstream sub-procedures (Walkthrough, Post-Scaffold Inspector).
- Pre-scaffold invariant restated: Conflict Resolution mutations must have completed before CLI invocation.

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` (97 insertions, 1 deletion)

**Verification:**

- Run: `pnpm exec oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md`
- Result: pass (after one reformat pass + stray-fence cleanup — see Notes)

**Notes / Decisions:**

- **`appRoot` resolution source.** Plan said "Scaffold Runner emits `appRoot`"; I chose to resolve it by reading back `.oat/config.json` `documentation.root` rather than reusing the pre-scaffold `targetDir` input. Rationale: the CLI may normalize paths (resolve relative → absolute, trim trailing slash), and downstream patches need to operate on the exact path the CLI wrote.
- **`createdFiles[]` requires Preflight's read-only snapshot.** The "enumerate files that did not exist before 3c" contract implicitly relies on Preflight having captured the pre-scaffold file set. I did not retro-fit Preflight to capture this explicitly — a minimal directory listing at the target path in Step 1 is sufficient and already implicit in the "Preflight is read-only" contract.
- **Stray fence artifact.** My initial edit nested a code block inside an indented list item. oxfmt's autofix closed the nested fence but left an unbalanced fence at EOF. Resolved by removing the spurious closing fence. Not a design concern; flag to myself for the remaining Step 3 tasks — avoid 4-space-indented fenced blocks.

---

### Task p03-t02: Write Capability Detection procedure

**Status:** completed
**Commit:** 960e8794

**Outcome:**

- Expanded Step 3b (Capability Detection) in SKILL.md (~48 net insertions) replacing the placeholder.
- CLI help probe specified: single `--help` invocation, parse flags for `siteNameFlag`, `turbopackRootFlag`, `agentsMdScaffoldFlag`; probe failure is recorded as warning + all caps false (never guessed).
- File-shape checks specified per patch target (FP-12 four files, FP-11 `next.config.js`, FP-13 four sub-findings, FP-15 `AGENTS.md`) with explicit scaffold-shape vs. patched-shape markers.
- Refuse-and-surface contract: ambiguous drift records `status: 'refused'` in `patchesApplied` with target, reason, and suggested manual fix; flow continues, Post-Scaffold Inspector surfaces the refused list.
- Probe ordering clarified: CLI help probe runs before `oat docs init` (feeds flag assembly); file-shape checks run after scaffold (operate on actual output).

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` (48 insertions, 2 deletions)

**Verification:**

- Run: `pnpm exec oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md`
- Result: pass on first try (no nested-fence artifacts this time)

**Notes / Decisions:**

- **FP-15 scaffold shape is "does not exist".** Called out explicitly because absence is a legitimate classification — the CLI does not scaffold `AGENTS.md` today, so "no file at path" is the expected state and the patch writes the bridge template. If the user already hand-authored `AGENTS.md`, classification is `drift` and the patch refuses (never overwrites).
- **Both CLI capability and file-shape must gate each patch.** The design was permissive — I tightened to require both: even if CLI hasn't added `--site-name`, a file that already has patched-shape markers must be treated as a no-op, not re-patched.
- **Mention of `--framework-config` passthrough.** FP-11 detection looks for both a dedicated `--turbopack-root`-style flag and a generic passthrough. Rationale: the CLI team could ship either design; capturing both avoids having to re-edit the skill when the fix lands.

---

### Task p03-t03: Write site-identity patches (FP-12 title + FP-15 AGENTS.md)

**Status:** completed
**Commit:** a0841521

**Outcome:**

- Authored the Site-identity patches sub-procedure under Step 3d in SKILL.md (~76 net insertions) as a `#####` nested section.
- FP-12 per-file edits specified for all four targets (`app/layout.tsx` branding + metadata, `docs/index.md` frontmatter + H1, `docs/getting-started.md` body, `docs/contributing.md` H1). Each edit wrapped in labeled marker comments (HTML where allowed, JS block comments for TSX module scope).
- `export const metadata` insertion logic specified: insert only if absent; never merge or replace user-authored metadata.
- FP-15 write-if-missing contract explicit with double gating (`agentsMdScaffoldFlag === false` AND file absence) and an explicit "never overwrite" rule.
- Placeholder substitution spelled out for `{{GENERATE_INDEX_CMD}}` with three shape-specific variants (monorepo `pnpm --filter`, nested-standalone `cd && pnpm run`, single-package bare) plus the `-w run cli --` fallback when no `docs:generate-index` script exists.
- Post-patch ordering documented: site-identity before scaffold-integrity because FP-13 sub-findings may reference strings FP-12 has just rewritten.

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` (76 insertions, 2 deletions)

**Verification:**

- Run: `pnpm exec oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md`
- Result: pass on first try

**Notes / Decisions:**

- **TSX comment markers.** `app/layout.tsx` is TypeScript/TSX at module scope where HTML comments are invalid. Used JS block comments (`/* FP-12 patch: ... */`) for the `export const metadata` wrapper; used JSX-style HTML comments (`{/* ... */}` inside JSX) are unnecessary because I'm wrapping the raw JSX attribute with HTML comments outside the JSX tree — but the simpler approach is inline markers on the line itself. Prose keeps it flexible so p04-t02 Inspector can detect either style.
- **FP-15 banner comment.** Added a top-of-file banner comment to the rendered AGENTS.md (`<!-- Generated by oat-docs-bootstrap (FP-15 bridge). Safe to hand-edit after generation. -->`) so users can tell the file was skill-authored and is safe to edit. Not used for idempotency — file existence is the idempotency check.
- **MkDocs scope.** FP-12 title patches are Fumadocs-only. MkDocs has no `layout.tsx`; its title handling lives in `mkdocs.yml` and is covered by the MkDocs Minimum Contract in Step 6 (Walkthrough section G, to be authored in p05-t02). Called out explicitly in the sub-procedure so the Walkthrough author doesn't duplicate.

---

### Task p03-t04: Write scaffold-integrity patches (FP-11 Turbopack + FP-13 content)

**Status:** completed
**Commit:** f7dc0d60

**Outcome:**

- Authored the Scaffold-integrity patches sub-procedure under Step 3d in SKILL.md (~100 net insertions) as a `#####` nested section, slotted between Site-identity and Post-patch ordering.
- **FP-11 Turbopack root** — triple gate (`nested-standalone` + `fumadocs` + `turbopackRootFlag === false`) with two code paths:
  - Path A: `createDocsConfig({ turbopack: { root: __dirname } })` when the passthrough is available.
  - Path B: wrapper replacement with explicit `createMDX()` config. Path B takes a `next.config.js.pre-fp11.bak` snapshot before replacing so users can inspect prior state; the backup path is recorded in `patchesApplied`.
- **FP-13 sub-findings A–D** all authored with per-target gates, patches, marker strings, and idempotency checks:
  - A: empty descriptions → static defaults (per-page, not templated).
  - B: bare commands → shape-aware rewrite (monorepo `--filter`, nested-standalone `cd &&`, single-package bare).
  - C: false lint claim → conditional narrow (drop "and linting" when `lint === 'none'`; skip when lint is configured).
  - D.1: append "Generated files" section to `contributing.md`.
  - D.2: prepend `<!-- generated by oat docs generate-index; do not hand-edit. -->` to the generated `index.md`, with a first-run `package.json` script hook fallback when the file isn't present at scaffold time.
- Refuse-and-surface reiterated: patches respect Capability Detection's drift classification without re-checking.

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` (100 insertions)

**Verification:**

- Run: `pnpm exec oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md`
- Result: pass on first try

**Notes / Decisions:**

- **FP-11 backup file.** Added `next.config.js.pre-fp11.bak` behavior to Path B. Not in the original plan, but it solves a real failure mode: wrapper replacement loses user-authored options if the wrapper had been edited. The backup makes the replacement recoverable without git-based recovery.
- **FP-13 D.2 deferred hook.** When `<appRoot>/index.md` doesn't exist at scaffold time (generate-index hasn't run yet), the patch can't prepend the header comment directly. I added a `package.json` script wrapping fallback: mutate `prebuild`/`predev` to prepend the header on the first run. Labeled with its own marker (`generated-header-D2`) inside the resulting file for idempotency.
- **MkDocs scope.** Explicitly called out that all four FP-13 sub-findings are Fumadocs-only; MkDocs handling is deferred to the Walkthrough's MkDocs Minimum Contract in p05-t02. Rationale: the MkDocs scaffold's content layout differs (no `docs/getting-started.md` or `contributing.md` in the same shape), so copy-pasting the patches would target files that don't exist.

---

## Phase 4: Build Verifier + Post-Scaffold Inspector

**Status:** in_progress
**Started:** 2026-04-13

### Task p04-t01: Write Build Verifier procedure

**Status:** completed
**Commit:** 23aa43d3

**Outcome:**

- Authored Step 4 (Build Verifier) body in SKILL.md (~70 insertions) replacing the placeholder.
- Install/build commands specified per repo shape (monorepo: root `pnpm install` + `pnpm --filter`; single-package: root; nested-standalone: inside `<appRoot>`).
- Four known failure patterns with explicit classifications: `ERR_PNPM_NO_MATCHING_VERSION` (surface-only), `fumadocs-mdx: command not found` + missing node_modules (auto-fix by rerunning install once, then escalate), Turbopack "inferred workspace root" (benign if FP-11 applied), FP-10 tsconfig churn (flag as regression).
- Unknown-error stop: last 40 lines of stderr surfaced; flow halts before Inspector/Walkthrough.
- `Verification Result` contract emitted with `installSucceeded`, `buildSucceeded`, `knownIssues[]`, `unrecognizedError`, and captured logs.
- Skip-if-scaffold-failed guard in place: if `Scaffold Result.scaffoldSucceeded !== true`, Build Verifier skips entirely.
- Cross-reference added: FP-13 is a Scaffold Runner concern, not Build Verifier.

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` (70 insertions, 1 deletion)

**Verification:**

- Run: `pnpm exec oxfmt --check .agents/skills/oat-docs-bootstrap/SKILL.md`
- Result: pass on first try

**Notes / Decisions:**

- **Retry bound for auto-fix.** The `fumadocs-mdx + missing node_modules` auto-fix retries install once and then escalates. Rationale: two attempts is enough to recover from a transient install skip, and an infinite retry loop masks real dependency problems.
- **MkDocs note.** Build Verifier as authored is Fumadocs-specific (pnpm-based). MkDocs has separate tooling (`pip install`, `mkdocs build`) and is covered by the MkDocs Minimum Contract in p05-t02. Called out in 4a to prevent confusion.

---

### Task p04-t02: Write Post-Scaffold Inspector procedure

**Status:** pending
**Commit:** -

---

## Phase 5: Educational Walkthrough + Optional Content Kickoff

**Status:** pending
**Started:** -

### Task p05-t01: Write Walkthrough Sections A-D

**Status:** pending
**Commit:** -

---

### Task p05-t02: Write Walkthrough Sections E-G (incl. MkDocs Minimum Contract)

**Status:** pending
**Commit:** -

---

### Task p05-t03: Write Optional Content Kickoff + Exit summary

**Status:** pending
**Commit:** -

---

## Phase 6: Finalization

**Status:** pending
**Started:** -

### Task p06-t01: Coherence pass + tightening

**Status:** pending
**Commit:** -

---

### Task p06-t02: Manual E2E walkthrough — nested-standalone (Fumadocs)

**Status:** pending
**Commit:** -

---

### Task p06-t03: Manual E2E smoke test — monorepo (Fumadocs)

**Status:** pending
**Commit:** -

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-04-13

**Session Start:** plan generation (pre-implementation)

- [ ] p01-t01: scaffold oat-docs-bootstrap skill skeleton — pending

**What changed (high level):**

- Plan generated (19 tasks across 6 phases); implementation not yet started

**Decisions:**

- HiLL checkpoints proposed at p03 and p05 (implement skill to confirm/update)
- Monorepo smoke test in scope for this project; deep monorepo feedback deferred to follow-up project

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |
| 3     | -         | -      | -      | -        |
| 4     | -         | -      | -      | -        |
| 5     | -         | -      | -      | -        |
| 6     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- (to be filled during implementation)

**Behavioral changes (user-facing):**

- (to be filled)

**Key files / modules:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md` — main skill entrypoint
- `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template` — FP-15 bridge template
- `apps/oat-docs/AGENTS.md` — canonical example instantiation

**Verification performed:**

- (to be filled after p06 manual walkthroughs)

**Design deltas (if any):**

- (to be filled)

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
