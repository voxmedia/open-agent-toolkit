---
oat_status: complete
oat_ready_for: null
oat_last_updated: 2026-04-05
oat_generated: false
---

# Discovery: docs-init-fixes

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Fix `oat docs init` CLI command based on friction points discovered during hands-on bootstrapping of Fumadocs docs in both monorepo and single-package repos. The friction points were identified during the docs-bootstrap-skill project discovery (which is blocked on these fixes).

Two rounds of testing:

1. Non-monorepo Fumadocs setup in a real repo (PR #13 + 8 fix commits)
2. Cross-repo testing: monorepo, single-package, and repo with existing docs

## Already Resolved

These friction points were already fixed in the current template:

- **FP-1 (OAT CLI devDep):** `@open-agent-toolkit/cli` already in `devDependencies` in template
- **FP-2 (@types/node):** `@types/node` already in `devDependencies` in template

## Remaining Friction Points

### FP-CWD: Docs commands assume CWD is repo root

**Root cause found during discovery.** `context.cwd` is set to `process.cwd()` with no repo root resolution. A utility `resolveProjectRoot()` already exists in `fs/paths.ts` (walks up to `.git/`) but no docs command uses it.

**Affected commands:**

- `generate-index` — writes `.oat/config.json` to CWD. When run from a package script inside the docs app, CWD is the docs app dir, creating a spurious `<app>/.oat/config.json`. This was the root cause of the original FP-3 (gitignore confusion) and FP-4 (dual config confusion).
- `init` — uses CWD for config read/write and AGENTS.md upsert (fine when run from repo root, but fragile)
- `nav sync` — resolves app root from CWD
- `migrate` — resolves docs dir from CWD

**Fix direction:** Docs commands that read/write OAT config should resolve the repo root via `resolveProjectRoot()` instead of using raw `context.cwd`. Path-only commands (nav sync, migrate) may be fine with CWD since they operate on local dirs.

### FP-5: Index generation path inconsistency + silent failure

Three problems:

1. `.oat/config.json` sets `index: "<app>/index.md"` (generated root index) but that file isn't created during scaffold
2. AGENTS.md section sets `Index file: <app>/docs/index.md` (content index) — different file than config points to
3. Non-OAT repos wrap `generate-index` in `|| true`, so failure is silent and the index never gets created

The config and AGENTS.md should be consistent, and failure should be loud with remediation steps.

### FP-6: Single-package repo setup incomplete

In non-monorepo repos, scaffold creates `<app>/` as a subdirectory but root `pnpm install` doesn't install it. No workspace wiring is created and no next steps are printed. Users don't know they need to `cd <app> && pnpm install`.

### FP-7: No preflight checks

`oat docs init` happily overwrites existing setup without checking for:

- Existing `.oat/config.json` documentation config
- Existing docs app or docs-related root scripts
- Existing AGENTS.md docs section

Should detect existing setup and ask whether to replace, scaffold alongside, or abort. Currently only checks if the target directory is non-empty (`ensureTargetWritable`).

### FP-8: No monorepo integration guidance

If root scripts or workspace filters assume the docs app is named `docs` and the user picks a different name, nothing warns them about what needs updating. The CLI should detect root script assumptions and surface what needs changing.

### FP-9: Doesn't detect non-OAT-repo local packages

`detectIsOatRepo` only checks for the full OAT repo structure (all 4 packages under `packages/`). A repo that has just `docs-config` or `docs-theme` locally won't get `workspace:*` wiring — it'll pull published packages instead. Should detect partial local OAT packages and offer to wire them.

### FP-10: First-build tsconfig rewrite churn

Next.js rewrites `tsconfig.json` on first build. The template should preseed all Next.js-expected settings so the first build doesn't produce a dirty diff. The current template has many Next.js settings but may be missing some that newer Next.js versions add.

## Key Decisions

1. **Fix in CLI, not workaround in skill:** All friction points are CLI-level issues that should be fixed at source.
2. **Package naming:** All references use `@open-agent-toolkit/*` scope.
3. **No breaking changes:** Fixes should be backward-compatible — existing scaffolded docs apps shouldn't break.
4. **Both repo shapes:** Fixes must work for monorepo and single-package repos.
5. **Repo root resolution:** Use existing `resolveProjectRoot()` utility for config operations rather than introducing new resolution logic.

## Constraints

- Follow CLI AGENTS.md conventions (thin handlers, logic in engine modules, no direct console)
- Preserve `--yes` / `--json` / non-interactive contracts
- Tests must be updated for changed behavior
- Lint and type-check must pass for `@open-agent-toolkit/cli`

## Success Criteria

- Running `oat docs init` in a clean monorepo produces a buildable docs app with no manual fixups
- Running `oat docs init` in a clean single-package repo produces a buildable docs app with clear next steps
- Running `oat docs init` in a repo with existing docs detects the conflict and asks the user
- `.oat/config.json` index path and AGENTS.md index path are consistent
- `generate-index` writes config to repo root, not CWD, when run from a subdirectory
- `generate-index` either succeeds or fails loudly with remediation
- No silent failures anywhere in the scaffold flow

## Out of Scope

- CI runner configuration (repo-specific)
- Content quality of scaffolded docs (expected to be docs-app-focused; analyze/apply populates project content)
- MkDocs-specific fixes (focus on Fumadocs; MkDocs parity can follow)
- The docs-bootstrap-skill itself (separate project, resumes after these fixes)
- Changing `buildCommandContext` to auto-resolve repo root (broader change, more risk than scoped fixes)

## Open Questions

- **FP-10 verification:** Need to confirm exactly which tsconfig fields Next.js adds on first build with the current template. May already be resolved in newer Next.js versions.
- **FP-9 granularity:** Should partial local package detection be per-package (wire only what's local) or all-or-nothing?

## Assumptions

- Users have pnpm available
- Users run `oat docs init` from repo root
- The template already has `@open-agent-toolkit/cli` and `@types/node` as devDependencies

## Risks

- **Scope of preflight checks (FP-7):** Could get complex if we try to handle every edge case
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation:** Start with the three most common conflicts (existing config, existing app dir, existing AGENTS section). Expand later.

## Next Steps

These are well-understood, concrete fixes with clear code locations. The CWD root-cause analysis simplified the problem space. Recommend straight to plan.
