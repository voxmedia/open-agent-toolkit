---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-29
oat_generated: false
oat_template: false
---

# Design: pjm-init

## Overview

`oat pjm init` is a new, non-destructive, idempotent CLI command that instantiates the
project-management repo-reference surface under `.oat/repo/reference/`. Installing the
`project-management` tool pack copies _template sources_ into `.oat/templates/` and skills
into `.agents/skills/`; nothing today materializes the working reference docs. This command
closes that gap: it is the explicit **instantiate** step that follows the **install** step.

The command scaffolds four things under `.oat/repo/reference/`: `current-state.md`,
`roadmap.md`, `decision-record.md`, and the full `backlog/` structure. The three flat
reference docs are instantiated from PM-pack templates; the backlog sub-surface is delegated
to the existing, already-exported `initializeBacklog()` so backlog scaffolding is reused, not
duplicated. Two new templates — `current-state.md` and `decision-record.md` — are added to
the template source (`.oat/templates/`), the bundled assets, and the PM-pack manifest so they
are first-class alongside `roadmap.md` and `backlog-item.md`.

Key decisions: (1) a dedicated top-level `oat pjm` namespace (the taxonomy has no clear
existing home, and `pjm` is already a first-class product concept via the pack and
`oat-pjm-*` skills); (2) template content is resolved from repo-local `.oat/templates/` when
present, else from the CLI's bundled assets, so a truly fresh repo still works; (3)
non-destructive always — existing reference docs are never overwritten, matching the local
`oat backlog init` convention.

## Architecture

### System Context

```
oat init tools project-management      (INSTALL — already exists)
    └─ copies .agents/skills/oat-pjm-*  and  .oat/templates/{roadmap,decision-record,
       current-state,backlog-item}.md     (template SOURCES)

oat pjm init                           (INSTANTIATE — NEW)
    └─ materializes .oat/repo/reference/{current-state,roadmap,decision-record}.md
       + .oat/repo/reference/backlog/**   (working reference DOCS)
            └─ delegates backlog/ to initializeBacklog()  (REUSED)
```

**Key Components:**

- **`pjm` command module** — registers the `oat pjm` namespace and its `init` subcommand;
  thin handler that resolves context/paths and calls the scaffolder.
- **`initializeRepoReference()` scaffolder** — orchestration logic: instantiate the three
  flat reference docs idempotently, delegate the backlog surface to `initializeBacklog()`,
  return a structured created/skipped result.
- **Template source resolver** — resolves a template's body by name (repo-local override →
  bundled fallback) and strips the template-marker frontmatter on instantiation.
- **New template assets** — `current-state.md` and `decision-record.md` added to
  `.oat/templates/`, `bundle-assets.sh`, and `PROJECT_MANAGEMENT_TEMPLATES`.

### Data Flow

```
oat pjm init [--reference-root <path>]
  1. buildCommandContext + resolveProjectRoot(cwd)
  2. referenceRoot = <projectRoot>/.oat/repo/reference   (or --reference-root override)
  3. for name in [current-state.md, roadmap.md, decision-record.md]:
       content = resolveTemplateContent(name, {templatesRoot, assetsRoot})  # local→bundled
       content = stripTemplateFrontmatter(content)
       writeIfMissing(referenceRoot/name, content)        # skip if present
  4. initializeBacklog(referenceRoot/backlog)              # reused; already idempotent
  5. emit JSON {status, referenceRoot, created[], skipped[]}  OR text summary; exit 0
```

## Component Design

### `pjm` command module — `packages/cli/src/commands/pjm/index.ts`

**Purpose:** Register the `oat pjm` namespace and `init` subcommand; keep the handler thin.

**Responsibilities:**

- Mirror `createBacklogCommand()`: dependency-injection struct, `buildCommandContext`,
  `readGlobalOptions`, json/text output, `process.exitCode`.
- Resolve `referenceRoot` (default `<projectRoot>/.oat/repo/reference`, `--reference-root`
  override) and the template/assets source roots, then call `initializeRepoReference`.
- Register in `packages/cli/src/commands/index.ts` via `program.addCommand(createPjmCommand())`.

**Interface:**

```typescript
export function createPjmCommand(
  overrides?: Partial<PjmCommandDependencies>,
): Command; // `oat pjm` with an `init` subcommand
```

**CLI surface:**

- `oat pjm init` — scaffold the full repo-reference surface.
- `--reference-root <path>` — override (defaults to `.oat/repo/reference`), mirroring
  `oat backlog init --backlog-root`.
- No `--force`: aligns with `oat backlog init` (the direct sibling), which is purely
  non-destructive. This is the most direct satisfaction of "never overwrite curated reference
  docs." (A force escape-hatch can be added later if a real destructive convention is adopted.)

### `initializeRepoReference()` scaffolder — `packages/cli/src/commands/pjm/init.ts`

**Purpose:** The reusable, testable scaffolding logic (handler-free, like `initializeBacklog`).

**Interface:**

```typescript
export interface InitializeRepoReferenceOptions {
  referenceRoot: string; // .oat/repo/reference
  assetsRoot: string; // bundled fallback source (resolveAssetsRoot())
  templatesRoot?: string; // repo-local override source (.oat/templates)
}

export interface RepoReferenceInitResult {
  referenceRoot: string;
  created: string[]; // e.g. ['current-state.md', 'backlog/index.md']
  skipped: string[]; // already-present files left untouched
}

export async function initializeRepoReference(
  options: InitializeRepoReferenceOptions,
): Promise<RepoReferenceInitResult>;
```

**Design Decisions:**

- **Reuse `initializeBacklog`** for `backlog/`; do not re-implement backlog scaffolding.
- **Non-destructive write** via the same `writeFileIfMissing` semantics used by backlog
  init; re-running is a no-op for present files → idempotent.
- **Template-source precedence:** repo-local `.oat/templates/<name>` first (lets a repo
  customize starters before instantiating), bundled assets fallback second (guarantees a
  fresh repo works). Missing in both → actionable error.

### Template source resolver + frontmatter strip

**Purpose:** Return instantiable body content for a reference doc by template name.

- `resolveTemplateContent(name, { templatesRoot, assetsRoot })` → reads repo-local then
  bundled path.
- `stripTemplateFrontmatter(content)` → drops the leading YAML block when it carries
  `oat_template`/`oat_template_name`, so the instantiated reference doc is not itself marked
  as a template.
- **Reuse check:** if project scaffolding (`commands/project/new/scaffold.ts`) already
  exports a template-frontmatter transform, reuse it; otherwise implement this minimal local
  helper. (Implementer verifies during build.)

### New template assets

- `.oat/templates/current-state.md` — frontmatter `oat_template: true` /
  `oat_template_name: current-state`; body is a minimal "OAT Current State" skeleton
  (Canonical References / What's Implemented / What's Next) with HTML-comment guidance.
- `.oat/templates/decision-record.md` — frontmatter markers; body is a minimal "OAT Decision
  Record" with an empty Decision Index table and an ADR entry-format guide. Modeled on the
  existing reference doc's _shape_, not its content.
- Add both to `packages/cli/scripts/bundle-assets.sh` template loop and to
  `PROJECT_MANAGEMENT_TEMPLATES` in `skill-manifest.ts` (single source of truth).

## Error Handling

- **Template missing in repo-local AND bundled assets:** fail with an actionable message
  naming the template; exit code 1 (user/actionable error per `packages/cli/AGENTS.md`).
- **Unresolvable project root:** defer to existing `resolveProjectRoot` behavior.
- **Output:** route through the CLI logger (no direct `console.*`); JSON contract preserved
  under `--json`.

## Testing Strategy

Mirror the established `packages/cli/src/commands/backlog/init.test.ts` pattern (vitest,
`mkdtemp` temp roots, `access`/`readFile` assertions, cleanup in `afterEach`).

### Scaffolder unit tests (`packages/cli/src/commands/pjm/init.test.ts`)

- **Fresh repo creates all expected files:** `current-state.md`, `roadmap.md`,
  `decision-record.md`, and `backlog/{index.md, completed.md, items/.gitkeep,
archived/.gitkeep}` all exist after one run.
- **Existing files are not overwritten:** pre-write a sentinel `decision-record.md`; after
  init its contents are unchanged and it appears in `skipped`.
- **Idempotent:** running twice leaves files unchanged; the second run reports everything
  `skipped`, nothing `created`.
- **Source precedence:** repo-local `.oat/templates/<name>` is used when present; bundled
  assets are used as fallback when it is absent.

### Command integration test

- `oat pjm init` is registered and runs end-to-end against a temp workspace (mirror
  `commands.integration.test.ts`); assert the JSON result shape (`status: 'ok'`,
  `referenceRoot`, `created`/`skipped`).

### Manifest / bundling tests

- `PROJECT_MANAGEMENT_TEMPLATES` includes `current-state.md` and `decision-record.md`.
- `bundle-consistency.test.ts` stays green (bundle-assets.sh ↔ manifest in sync).
- `install-project-management.test.ts` updated: `copiedTemplates` now includes the two new
  templates (decision-record template included in PM-pack assets — the explicit acceptance
  criterion).

### Validation gate

- `pnpm --filter @open-agent-toolkit/cli test`, `lint`, `type-check`, and
  `pnpm release:validate` (after the lockstep `0.1.11 → 0.1.12` bump) all pass.

## Open Questions

- **Frontmatter strip vs reuse:** confirmed approach is strip template markers on
  instantiation; implementer confirms whether an existing scaffold transform can be reused.

## References

- Discovery: `discovery.md`
- Backlog scaffolder (reused): `packages/cli/src/commands/backlog/init.ts`
- Command pattern: `packages/cli/src/commands/backlog/index.ts`
- PM-pack manifest: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Bundle script: `packages/cli/scripts/bundle-assets.sh`
