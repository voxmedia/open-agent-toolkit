---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-29
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p06'] # pause AFTER final review-fix phase for human review
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # fully sequential — dependency chain + final release gate
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: pjm-init

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make `oat pjm init` a first-class command that idempotently instantiates the full
PJM repo-reference surface (`current-state.md`, `roadmap.md`, `decision-record.md`, and the
`backlog/` tree) under `.oat/repo/reference/`, with `decision-record.md` and `current-state.md`
promoted to first-class bundled PM-pack templates, and the install-vs-initialize lifecycle
documented for users.

**Architecture:** A thin `oat pjm` command delegates to a reusable, non-destructive
`initializeRepoReference()` scaffolder that instantiates the three flat reference docs from
PM-pack templates (repo-local `.oat/templates/` → bundled-assets fallback) and reuses the
existing `initializeBacklog()` for the backlog tree.

**Tech Stack:** TypeScript ESM, commander, vitest, Turborepo/pnpm; Fumadocs (`apps/oat-docs`).

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p02-t01): add initializeRepoReference scaffolder`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (pause after final phase; updated to p06 after final re-review fixes were added)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

This plan is **fully sequential** (`oat_plan_parallel_groups: []`). Reasoning:

- **Dependency chain:** templates (P1) must exist before the command (P2) is correct
  end-to-end; docs (P3) must describe the _built_ command/flags to avoid drift; the lockstep
  version bump + `release:validate` (P4) is a repo-global gate that must run last over the
  whole change set.
- **Write-sets are mostly disjoint per phase** (P1 → `.oat/templates`/manifest/bundle; P2 →
  `packages/cli/src/commands/pjm`; P3 → `apps/oat-docs/docs`; P4 → five `package.json`s), so
  the constraint is dependency ordering, not file conflicts. Parallel worktrees would add
  overhead without shortening the critical path, and P4's global validation can't overlap
  earlier phases.

---

## Dispatch Profile

No explicit per-phase provider constraints. Runtime selection (capped by the resolved OAT
dispatch ceiling) chooses the tier per role. Omitted rows use runtime selection.

---

## Phase 1: PM-pack templates and bundling

### Task p01-t01: Add current-state and decision-record starter templates

**Files:**

- Create: `.oat/templates/current-state.md`
- Create: `.oat/templates/decision-record.md`

**Step 1: Author the starter templates**

Model them on the existing `.oat/templates/roadmap.md` (frontmatter marker + skeleton +
HTML-comment guidance), NOT on this repo's large curated `.oat/repo/reference/*` docs.

- `current-state.md`: frontmatter `oat_template: true` / `oat_template_name: current-state`;
  body `# OAT Current State` with empty sections: Canonical References, What's Implemented,
  What's Next — each with an HTML-comment hint.
- `decision-record.md`: frontmatter `oat_template: true` /
  `oat_template_name: decision-record`; body `# OAT Decision Record` with an empty Decision
  Index table header and an `ADR-NNN` entry-format guide in an HTML comment.

**Step 2: Verify**

Run: `test -f .oat/templates/current-state.md && test -f .oat/templates/decision-record.md && head -3 .oat/templates/current-state.md .oat/templates/decision-record.md`
Expected: both files exist and each opens with the `oat_template: true` frontmatter marker.

Run: `pnpm format`
Expected: no formatting violations introduced.

**Step 3: Commit**

```bash
git add .oat/templates/current-state.md .oat/templates/decision-record.md
git commit -m "feat(p01-t01): add current-state and decision-record starter templates"
```

---

### Task p01-t02: Register new templates in PM-pack manifest and bundle script

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` (add to `PROJECT_MANAGEMENT_TEMPLATES`)
- Modify: `packages/cli/scripts/bundle-assets.sh` (add to the `for template in ...` loop)
- Modify: `packages/cli/src/commands/init/tools/project-management/install-project-management.test.ts`
- Verify-only: `packages/cli/src/commands/init/tools/**/bundle-consistency.test.ts`

**Step 1: Write test (RED)**

Update `install-project-management.test.ts` so the `copiedTemplates` expectation includes
`current-state.md` and `decision-record.md` (alongside `backlog-item.md`, `roadmap.md`), and
have its `seedAssets` fixture seed the two new template files. This directly encodes the
acceptance criterion "decision-record template is included in project-management pack assets."

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/project-management/install-project-management.test.ts`
Expected: fails (RED) — manifest still lists only two templates.

**Step 2: Implement (GREEN)**

- Add `'current-state.md'` and `'decision-record.md'` to `PROJECT_MANAGEMENT_TEMPLATES`.
- Add both filenames to the `for template in ...` loop in `bundle-assets.sh` so the bundler
  copies them into `packages/cli/assets/templates/`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/project-management/install-project-management.test.ts`
Expected: passes (GREEN).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: bundle-consistency (manifest ↔ bundle-assets.sh) passes; lint + type-check clean.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skill-manifest.ts \
        packages/cli/scripts/bundle-assets.sh \
        packages/cli/src/commands/init/tools/project-management/install-project-management.test.ts
git commit -m "feat(p01-t02): register current-state and decision-record in PM pack manifest and bundle"
```

---

## Phase 2: Scaffolder and `oat pjm init` command

### Task p02-t01: Implement initializeRepoReference scaffolder

**Files:**

- Create: `packages/cli/src/commands/pjm/init.ts`
- Create: `packages/cli/src/commands/pjm/init.test.ts`

**Step 1: Write test (RED)**

Mirror `packages/cli/src/commands/backlog/init.test.ts` (vitest, `mkdtemp` temp roots,
`access`/`readFile`, cleanup in `afterEach`). Seed a temp `assetsRoot/templates/` (and, in the
override case, a temp `templatesRoot/`). Cover:

- **fresh creates all files:** `current-state.md`, `roadmap.md`, `decision-record.md`, and
  `backlog/{index.md, completed.md, items/.gitkeep, archived/.gitkeep}` all exist.
- **existing not overwritten:** pre-write a sentinel `decision-record.md`; assert unchanged and
  reported in `skipped`.
- **idempotent:** second run reports everything `skipped`, nothing `created`.
- **source precedence:** repo-local `templatesRoot/<name>` is used when present; bundled
  `assetsRoot/templates/<name>` is the fallback.
- **instantiation strips template frontmatter** (no `oat_template:` marker in the written doc).
- **missing in both sources:** throws an actionable error.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts`
Expected: fails (RED) — module not implemented.

**Step 2: Implement (GREEN)**

Implement `initializeRepoReference(options)` plus the template-source resolver and
frontmatter-strip helper per design. Reuse `initializeBacklog` from
`@commands/backlog/init` for the `backlog/` tree **as-is** — do not refactor it. Use
`writeFileIfMissing` semantics for non-destructive writes; return
`{ referenceRoot, created[], skipped[] }`. Before adding a new frontmatter stripper, check
`commands/project/new/scaffold.ts` for an exportable transform and reuse it if present.

**Backlog status reporting (resolves the `initializeBacklog` void-return gap):**
`initializeBacklog(backlogRoot)` returns `Promise<void>` and only writes missing files, so it
cannot tell `initializeRepoReference` what it created vs skipped. Do **not** refactor it.
Instead, `initializeRepoReference` pre-detects the known backlog paths before delegating:

- Define the known relative backlog paths the scaffolder reports on:
  `backlog/index.md`, `backlog/completed.md`, `backlog/items/.gitkeep`,
  `backlog/archived/.gitkeep`.
- Record which of those already exist (via `access`) **before** calling `initializeBacklog`.
- Call `initializeBacklog(join(referenceRoot, 'backlog'))`.
- Report each pre-existing path under `skipped` and each previously-absent path under
  `created`. This yields deterministic, idempotent backlog reporting (second run → all
  `skipped`) without reimplementing backlog file contents or changing `initializeBacklog`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts`
Expected: passes (GREEN).

**Step 3: Refactor**

Keep imports to `./...` and package aliases only (no `../`, no `src/`); ensure no direct
`console.*`.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: no errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/pjm/init.ts packages/cli/src/commands/pjm/init.test.ts
git commit -m "feat(p02-t01): add initializeRepoReference scaffolder"
```

---

### Task p02-t02: Add and register the `oat pjm init` command

**Files:**

- Create: `packages/cli/src/commands/pjm/index.ts`
- Create: `packages/cli/src/commands/pjm/index.test.ts`
- Modify: `packages/cli/src/commands/index.ts` (register `createPjmCommand()`)

**Step 1: Write test (RED)**

Add a command test mirroring `commands.integration.test.ts` (temp workspace, parse
`['--cwd', root, ...]`, capture stdout): assert `oat pjm init` creates the reference surface
and, under `--json`, emits `{ status: 'ok', referenceRoot, created, skipped }` with exit code 0. Include an assertion that `oat pjm init` is reachable from the registered program.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/index.test.ts`
Expected: fails (RED) — command not registered.

**Step 2: Implement (GREEN)**

Implement `createPjmCommand()` mirroring `createBacklogCommand()` (DI struct,
`buildCommandContext`, `readGlobalOptions`, `--reference-root` option, json/text output via the
CLI logger, `process.exitCode = 0`). Resolve `referenceRoot` (default
`<projectRoot>/.oat/repo/reference`), resolve `assetsRoot` via `resolveAssetsRoot()` and
`templatesRoot` as `<projectRoot>/.oat/templates`, then call `initializeRepoReference`. Register
in `commands/index.ts` via `program.addCommand(createPjmCommand())`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/index.test.ts`
Expected: passes (GREEN).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/commands.integration.test.ts && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pjm tests + the command integration suite pass; lint + type-check clean.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/pjm/index.ts packages/cli/src/commands/pjm/index.test.ts packages/cli/src/commands/index.ts
git commit -m "feat(p02-t02): add oat pjm init command"
```

---

## Phase 3: Documentation (first-class)

### Task p03-t01: Document install-vs-initialize lifecycle and `oat pjm init`

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md` (and/or `reference/file-locations.md`)
- Regenerate: `apps/oat-docs/index.md` (via `oat docs generate-index` — never hand-edit)

**Step 1: Read conventions**

Read `apps/oat-docs/AGENTS.md` for docs authoring conventions before editing.

**Step 2: Edit docs**

- `tool-packs.md`: extend the `project-management` pack line to include `current-state` and
  `decision-record` templates; add an **"Install vs. initialize"** section documenting that
  pack install copies skills/template sources and `oat pjm init` instantiates the repo-reference
  surface (purpose, what it scaffolds, idempotent + non-destructive, `--reference-root`,
  `--json`), delegating backlog scaffolding to `oat backlog init`.
- `cli-reference.md`: add an `oat pjm ...` row to the command-family table pointing to the
  tool-packs lifecycle section.
- `config-and-local-state.md`: cross-link `oat backlog init` as the lower-level helper that
  `oat pjm init` delegates to.
- repo-reference layout doc: ensure `current-state.md`, `roadmap.md`, `decision-record.md`, and
  `backlog/` are listed as the canonical PJM repo-reference surface.

**Step 3: Regenerate index**

Run: `pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`
Expected: `apps/oat-docs/index.md` regenerated with no unexpected drift (only the intended new entries).

Note: the bare `oat docs generate-index` defaults to `--docs-dir docs --output index.md`, which
targets the wrong directory from the repo root. Always pass the explicit docs-app paths above
(this is the same invocation the docs app's `prebuild`/`predev` scripts use).

**Step 4: Verify**

Run: `pnpm build:docs`
Expected: docs build succeeds with the new/edited pages and links resolve.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/tool-packs.md \
        apps/oat-docs/docs/reference/cli-reference.md \
        apps/oat-docs/docs/cli-utilities/config-and-local-state.md \
        apps/oat-docs/docs/reference/oat-directory-structure.md \
        apps/oat-docs/index.md
git commit -m "docs(p03-t01): document install-vs-initialize lifecycle and oat pjm init"
```

---

## Phase 4: Release lockstep bump and validation

### Task p04-t01: Lockstep version bump and release validation

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Bump all five public packages together**

Set `version` to `0.1.12` in all five `package.json` files (currently `0.1.11`). This is
required by the version-policy root set because the change touches `.oat/templates`,
`apps/oat-docs/docs`, and shipped CLI functionality.

**Step 2: Rebuild assets if needed**

Run: `pnpm build`
Expected: build succeeds; bundled assets (including the new templates and version stamp) are regenerated.

**Step 3: Verify (final gate)**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm type-check && pnpm release:validate`
Expected: full CLI suite green; lint + type-check clean; `release:validate` passes (all five
public packages on `0.1.12`, no forbidden tarball paths, no `workspace:*` leakage).

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json \
        packages/docs-config/package.json packages/docs-theme/package.json \
        packages/docs-transforms/package.json
git commit -m "chore(p04-t01): bump public packages to 0.1.12 for pjm init"
```

---

## Phase 5: Final review fixes

### Task p05-t01: (review) Restore dispatch-ceiling mainline contract

**Files:**

- Modify/restore: `packages/cli/src/commands/project/dispatch-ceiling/**`
- Modify/restore: `packages/cli/src/config/oat-config.ts`
- Modify/restore: `packages/cli/src/commands/config/index.ts`
- Modify/restore: `packages/cli/src/config/resolve.ts`
- Modify/restore: `packages/cli/src/providers/ceiling/**`
- Modify/restore: `apps/oat-docs/docs/workflows/projects/**`
- Modify/restore: `.oat/repo/reference/**` dispatch-ceiling reference artifacts affected by the branch rollback

**Step 1: Understand the issue**

Review finding `C1`: the final branch regresses the dispatch-ceiling CLI/config contract from
`main`. Direct repros fail because unsupported providers such as `cursor` now return an
invalid-provider error, and `workflow.dispatchCeiling.preset` is no longer a known config key.
The branch must preserve the provider-neutral preset/provider config, preset compilation,
provider adapter registry, unsupported-provider advisory behavior, docs/navigation, and repo
reference materials already present on `main`.

Location: `packages/cli/src/commands/project/dispatch-ceiling/index.ts:101`

**Step 2: Implement fix**

Restore the dispatch-ceiling implementation from `origin/main`/target `main` for the affected
files, keeping the PJM feature changes on top. Use a path-scoped restore or equivalent
file-by-file edits; do not reset the branch or overwrite PJM files. In particular, preserve:

- `workflow.dispatchCeiling.preset`
- `workflow.dispatchCeiling.providers.{codex,claude}`
- preset compilation and resolver output metadata (`preset`, `providers`, `dispatchArgs`,
  `mode`, `mechanism`, `verifyOnDispatch`)
- unsupported-provider advisory behavior for providers such as `cursor`
- dispatch-ceiling docs/navigation and repo-reference artifacts from `main`

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling src/config src/providers/ceiling`
Expected: dispatch-ceiling, config, and provider-ceiling tests pass.

Run: `ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json project dispatch-ceiling resolve --provider cursor --preflight`
Expected: unsupported/advisory metadata is returned instead of an invalid-provider error.

Run: `ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json config get workflow.dispatchCeiling.preset`
Expected: the config key is recognized.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling \
        packages/cli/src/config \
        packages/cli/src/commands/config/index.ts \
        packages/cli/src/providers/ceiling \
        apps/oat-docs/docs/workflows/projects \
        .oat/repo/reference
git commit -m "fix(p05-t01): restore dispatch-ceiling mainline contract"
```

---

### Task p05-t02: (review) Restore canonical OAT skill versions from main

**Files:**

- Modify/restore: `.agents/skills/oat-project-implement/SKILL.md`
- Modify/restore: `.agents/skills/oat-project-plan/SKILL.md`
- Modify/restore: `.agents/skills/oat-project-quick-start/SKILL.md`
- Regenerate if needed: provider-linked skill views from `oat sync --scope all`

**Step 1: Understand the issue**

Review finding `I1`: the branch changes canonical skills with downgraded versions relative to
`main` (`oat-project-implement` 2.0.19 vs 2.0.20, `oat-project-plan` 1.3.3 vs 1.3.4,
`oat-project-quick-start` 2.1.3 vs 2.1.4). This violates the repo policy that changed
canonical skills must increase versions in the final PR diff, and the content appears to be
part of the dispatch-ceiling rollback rather than an intentional PJM change.

Location: `.agents/skills/oat-project-implement/SKILL.md:3`

**Step 2: Implement fix**

Restore the three canonical skill files to the target `main` versions/content unless there is
a clearly intentional PJM-specific edit to preserve. If provider-linked skill views drift after
the restore, refresh them with `oat sync --scope all` and include only the generated changes
that belong to the restored canonical skills.

**Step 3: Verify**

Run: `git diff --name-status origin/main..HEAD -- .agents/skills .claude .cursor`
Expected: no accidental downgrade of the three canonical skill files remains; any remaining
skill/view diff is intentional and version-policy compliant.

Run: `pnpm release:validate`
Expected: release validation passes, including skill version bump policy.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md \
        .agents/skills/oat-project-plan/SKILL.md \
        .agents/skills/oat-project-quick-start/SKILL.md
git commit -m "fix(p05-t02): restore canonical OAT skill versions from main"
```

---

## Phase 6: Final re-review fixes

### Task p06-t01: (review) Bump public packages forward from target branch

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Understand the issue**

Review finding `I1`: `origin/main` is already at public package version `0.1.13`, while this
branch currently sets the five public packages to `0.1.12`. The branch is internally lockstep,
but it now downgrades the target branch version and would violate the release/version intent if
merged as-is.

Location: `packages/cli/package.json:3`

**Step 2: Implement fix**

Update all five public package versions from `0.1.12` to the next forward lockstep version from
the current target branch, `0.1.14`.

**Step 3: Verify**

Run: `pnpm release:validate`
Expected: release validation passes for all five public packages at `0.1.14`.

Run: `pnpm release:check-versions`
Expected: version bump policy passes against the current target branch.

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json \
        packages/docs-config/package.json packages/docs-theme/package.json \
        packages/docs-transforms/package.json
git commit -m "fix(p06-t01): bump public packages forward from target"
```

---

### Task p06-t02: (review) Restore dispatch-ceiling config docs schema

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Regenerate if needed: `apps/oat-docs/index.md`

**Step 1: Understand the issue**

Review finding `I2`: two shipped docs pages still advertise removed flat config keys
(`workflow.dispatchCeiling.codex` and `workflow.dispatchCeiling.claude`) even though the
restored runtime accepts `workflow.dispatchCeiling.preset` and
`workflow.dispatchCeiling.providers.{codex,claude}`. This leaves the dispatch-ceiling final
review finding partially closed.

Location: `apps/oat-docs/docs/cli-utilities/configuration.md:163`

**Step 2: Implement fix**

Restore the provider-neutral dispatch-ceiling documentation from `origin/main` in
`configuration.md` and the config schema section of `oat-directory-structure.md`, preserving the
PJM repo-reference additions in `oat-directory-structure.md`.

**Step 3: Verify**

Run: `ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json config get workflow.dispatchCeiling.preset`
Expected: the config key is recognized.

Run: `ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json config get workflow.dispatchCeiling.providers.codex`
Expected: the config key is recognized.

Run: `ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json config get workflow.dispatchCeiling.codex`
Expected: the stale flat key is rejected as unknown, matching the restored docs.

Run: `pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`
Expected: generated docs index is current.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/configuration.md \
        apps/oat-docs/docs/reference/oat-directory-structure.md \
        apps/oat-docs/index.md
git commit -m "fix(p06-t02): restore dispatch-ceiling config docs"
```

---

## Phase 7: Final review polish

### Task p07-t01: (review) Strip leading blank line after template frontmatter

**Files:**

- Modify: `packages/cli/src/commands/pjm/init.ts`
- Modify: `packages/cli/src/commands/pjm/init.test.ts`

**Step 1: Understand the issue**

Review finding `m1` (final review v4): `stripTemplateFrontmatter` removes the closing
`\n---` then `replace(/^\r?\n/, '')` strips only a single newline, so with the template shape
`---\n...\n---\n\n# Heading` one blank line remains before the H1 in the instantiated reference
doc (output is `"\n# OAT Decision Record\n"`). Cosmetic only — markdown renders identically.

Location: `packages/cli/src/commands/pjm/init.ts:108`

**Step 2: Implement fix**

Change the leading-newline strip to remove all leading blank lines, e.g.
`afterFrontmatter.replace(/^\r?\n+/, '')` (or `.trimStart()`). Add/extend a unit test in
`init.test.ts` asserting the instantiated doc begins exactly at the `# ` heading with no leading
blank line.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pjm suite green (including the new leading-edge assertion); lint + type-check clean.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/pjm/init.ts packages/cli/src/commands/pjm/init.test.ts
git commit -m "fix(p07-t01): strip leading blank line after template frontmatter"
```

---

## Reviews

Code rows (p01–p04, final) and artifact rows (design, plan) are tracked below. Add additional
code rows as needed; do not delete the `design`/`plan` artifact rows.

| Scope  | Type     | Status      | Date       | Artifact                                               |
| ------ | -------- | ----------- | ---------- | ------------------------------------------------------ |
| p01    | code     | passed      | 2026-05-29 | reviews/archived/p01-review-2026-05-29.md              |
| p02    | code     | passed      | 2026-05-29 | reviews/archived/p02-review-2026-05-29-v2.md           |
| p03    | code     | passed      | 2026-05-29 | reviews/archived/p03-review-2026-05-29.md              |
| p04    | code     | passed      | 2026-05-29 | reviews/archived/p04-review-2026-05-29.md              |
| p05    | code     | passed      | 2026-05-29 | reviews/archived/p05-review-2026-05-29-v2.md           |
| p06    | code     | passed      | 2026-05-29 | reviews/archived/p06-review-2026-05-29.md              |
| final  | code     | fixes_added | 2026-06-01 | reviews/archived/final-review-2026-05-29-v4.md         |
| design | artifact | pending     | -          | -                                                      |
| plan   | artifact | passed      | 2026-05-29 | reviews/archived/artifact-plan-review-2026-05-29-v2.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no unresolved Critical, Important, or Medium findings)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — add current-state + decision-record starter templates; register them in the PM-pack manifest and bundle.
- Phase 2: 2 tasks — `initializeRepoReference` scaffolder (reuses `initializeBacklog`); `oat pjm init` command + registration.
- Phase 3: 1 task — document install-vs-initialize lifecycle and the command; regenerate docs index.
- Phase 4: 1 task — lockstep `0.1.11 → 0.1.12` bump + `release:validate`.
- Phase 5: 2 review-fix tasks — restore dispatch-ceiling mainline contract and canonical skill versions from `main`.
- Phase 6: 2 review-fix tasks — bump public packages forward from current `main` and restore dispatch-ceiling config docs.
- Phase 7: 1 review-fix task — strip leading blank line after template frontmatter (final review v4 finding `m1`).

**Total: 11 tasks**

Final review v4 received: one polish fix task queued (`p07-t01`); the Important finding (rebase
onto current `main`) is a pre-PR process action, and minor `m2` is deferred. Execute `p07-t01`,
re-review, then rebase and prepare the final PR.

---

## References

- Design: `design.md`
- Spec: N/A (quick mode)
- Discovery: `discovery.md`
- Backlog scaffolder (reused): `packages/cli/src/commands/backlog/init.ts`
- Command pattern: `packages/cli/src/commands/backlog/index.ts`
- PM-pack manifest: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Bundle script: `packages/cli/scripts/bundle-assets.sh`
