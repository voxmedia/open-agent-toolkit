# AGENTS (CLI Package)

Applies to work under `packages/cli/**`.

## Purpose

Maintain consistent, safe CLI behavior across commands and modules.

## Read first

- `packages/cli/README.md` (CLI package overview and instruction-sync surfaces)
- `apps/oat-docs/docs/contributing/design-principles.md` (cross-cutting CLI design principles)
- `apps/oat-docs/docs/provider-sync/index.md` (for provider-interop surfaces)

## Package commands

- `pnpm --filter @open-agent-toolkit/cli test`
- `pnpm --filter @open-agent-toolkit/cli lint`
- `pnpm --filter @open-agent-toolkit/cli type-check`

## Working conventions

- Keep command handlers thin; push logic into `engine/`, `manifest/`, `drift/`, and provider modules.
- Follow command ownership rules for prompts/types/utils (domain-local first, shared only when generic).
- Prefer named command files (`<command>.ts`, `<command>.test.ts`) and use `index.ts` mainly for command registration/re-export boundaries.
- Import policy: use only `./...` relative imports; use TypeScript aliases for anything outside the current directory.
- Do not use `../...`, `src/...`, or a catch-all alias like `@/*` in CLI source files.
- Preserve mutate-by-default with `--dry-run` opt-in and non-interactive/JSON contracts.
- Use explicit exit semantics (0 success, 1 actionable/user error, 2 system/runtime error).
- Avoid direct `console.*` calls in commands; route output through CLI logger utilities.
- Avoid unmanaged destructive filesystem mutations.
- Fake-cwd unit harnesses (`cwd: '/tmp/workspace'` or similar) must mock every
  init/doctor dependency that writes the filesystem or spawns git. Inject
  `applyOatCoreGitattributes` and `checkSyncedProjects`; do not rely on the
  production implementations against a path that does not exist.

## Preset documentation init

`docs init --ia-preset <preset> --planned-pages <count>` is opt-in, paired and validated before writes. Shared content planning consumes canonical bundled `skills/authoring-docs/references/page-templates/*.md` bodies, never framework copies. Existing surfaces require analyze/approved apply; preset init cannot adopt or replace them. Seed `contributing/templates/**` in nonReaderPaths before nav sync and preserve the no-input starter. Below 15 anticipated reader pages collapse tracks; flat-small always collapses.

## Documentation checker

- `pnpm run cli:source -- docs check --target-dir <root>` is read-only and does not build a site.
- Preserve exact G5 JSON and stable rule IDs in `src/config/documentation-check.ts`; config normalization and real config commands must retain checker policy.
- Mermaid syntax checks lazily initialize the pinned real Node DOM with strict sanitization. Do not render, enable scripts/resources, or bypass the sanitizer.

## Triad literal evidence

`docs literals` reuses checker target isolation and inline-code AST parsing but
has a separate occurrence result, never a G5 rule. Only a matching triad mirror
enables reads of selected pages/sources; authored acceptance stays in analyze.
Keep explicit content-relative reader pages, narrow repo-relative source roots,
real containment, no nested symlink traversal, bounded repo-relative exclusions,
and searched/skipped evidence. Matches are once-decoded physical-line substrings,
not runtime or registry verification. Preserve the guidance-only analyze command.

## Completion checks

- Tests updated for changed behavior.
- Lint and type-check pass for `@open-agent-toolkit/cli`.
- User-facing output includes clear next steps when failing.

## Fumadocs installation policy

Scaffold the exact Markdown serializer compatibility policy only at a new independent pnpm root. Never add member-local workspace boundaries or silently merge existing root dependency settings. Preserve the scripts-only root package patch and `--no-root-patch`; expose manual installation advice in human/JSON output. Bootstrap owns explicit approval of existing-root YAML edits.

Framework ignore-file sources use `gitignore.template` so package packing retains them; the scaffold emits `.gitignore`. Keep these and the independent-app YAML policy enrolled in the release packed-path contract. Workspace detection follows real ancestors so directory aliases cannot split an actual member.
