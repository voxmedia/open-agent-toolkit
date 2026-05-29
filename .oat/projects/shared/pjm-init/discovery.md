---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-29
oat_generated: false
---

# Discovery: pjm-init

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details. Concrete
file paths appear below only because they are part of the existing-system map that
constrains the work; they are constraints/findings, not a deliverable list.

## Initial Request

Implement first-class PJM (project-management) repo-reference initialization in
open-agent-toolkit.

**Observed gap (from `vox/voz`):** After installing the `project-management` tool
pack, `.oat/templates/roadmap.md` existed but the repo-reference docs under
`.oat/repo/reference/` were never instantiated, and `.oat/templates/decision-record.md`
did not exist at all. Installing the pack copies _template sources_; nothing
instantiates the working repo-reference surface.

**Desired behavior:** Decision records become first-class PJM artifacts alongside
roadmap, current-state, and backlog. A single non-destructive, idempotent command
scaffolds the full repo-reference surface from templates.

## Existing-System Findings (Codebase Map)

Grounded by direct inspection of `packages/cli`:

- **Bundled templates** live at `packages/cli/assets/templates/` (built from
  `.oat/templates/` by `packages/cli/scripts/bundle-assets.sh`). Present today:
  `backlog-item.md`, `roadmap.md`, plus workflow templates. **Missing:**
  `current-state.md` and `decision-record.md`.
- **PM pack manifest** is the single source of truth at
  `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`:
  `PROJECT_MANAGEMENT_TEMPLATES = ['backlog-item.md', 'roadmap.md']`. A
  `bundle-consistency.test.ts` asserts `bundle-assets.sh` stays in sync with these lists.
- **Pack install** (`install-project-management.ts`) copies templates into a target
  repo's `.oat/templates/` (manifest-driven, idempotent via `copyFileWithStatus`,
  legacy `--force` honored). It does **not** touch `.oat/repo/reference/`.
- **`current-state.md` has no CLI producer.** Grep of `packages/cli/src` finds no
  generator; it is an authored, skill-maintained reference doc (like roadmap and
  decision-record). The large files in this repo's `.oat/repo/reference/` are curated
  dogfood institutional memory, NOT templates.
- **`oat backlog init`** already scaffolds the backlog surface and exports a reusable,
  idempotent `initializeBacklog(backlogRoot)` (`packages/cli/src/commands/backlog/init.ts`)
  creating `items/`, `archived/`, `index.md`, `completed.md` via `writeFileIfMissing`.
- **CLI taxonomy:** 18 top-level namespaces registered in
  `packages/cli/src/commands/index.ts`. No `pjm` CLI namespace exists yet, but `pjm`
  is already a first-class concept via the `oat-pjm-*` skills and the
  `project-management` pack. Command modules follow a `create<X>Command()` +
  dependency-injection + `buildCommandContext`/`readGlobalOptions` + json/text output
  pattern (mirrored from `createBacklogCommand`).
- **Idempotency convention:** scaffolders are non-destructive by default (skip
  existing files); `--force` is accepted for legacy compatibility and largely ignored
  by newer scaffolders.
- **Release guardrail:** the 5 lockstep public packages are at `0.1.11`. Changes under
  `.oat/templates`, `.agents/skills`, or shipped CLI behavior require bumping all five
  together; `pnpm release:validate` enforces this.

## Solution Space

The product decision (what) is settled by the request. Two genuine design forks (how)
were explored.

### Fork 1 — Command placement

#### Approach A: New top-level `oat pjm init` _(Recommended)_

**Description:** Add a top-level `oat pjm` namespace with an `init` subcommand, mirroring
`createBacklogCommand`. Leaves room for future `oat pjm *` subcommands.
**When right:** When "PJM" is a durable first-class concept — which it already is
(`project-management` pack, `oat-pjm-*` skills).
**Tradeoffs:** Adds a new top-level namespace. One reviewer-style concern is that "pjm"
originated as a skills label; but the pack/skill naming already establishes it as a
product concept, and the user explicitly preferred this name.

#### Approach B: Nest under an existing namespace (`oat repo init`, `oat backlog`-adjacent, `oat project`)

**Description:** Reuse `repo`, `backlog`, or `project` namespaces.
**When right:** If the taxonomy clearly pointed to one home.
**Tradeoffs:** It does not. `repo` = analysis/insight tools, `backlog` = backlog-only,
`project` = per-project workflows. None cleanly owns "scaffold the whole repo-reference
surface." Forcing it in would be less discoverable than a dedicated `pjm` namespace.

#### Chosen Direction

**Approach:** A — `oat pjm init`. The user preferred it "unless the existing CLI command
taxonomy clearly points to another name," and it does not. Top-level `oat pjm` namespace
with an `init` subcommand.
**User validated:** Pending Step 2.5 / requirements confirmation.

### Fork 2 — Template source for instantiation

#### Approach A: Read template bodies from bundled assets, prefer repo-local `.oat/templates/` override _(Recommended)_

**Description:** `oat pjm init` resolves each reference doc's starter from
`.oat/templates/<name>.md` when present (so a repo can customize), else falls back to the
CLI's bundled assets (`resolveAssetsRoot()/templates/<name>.md`). Strip template-marker
frontmatter (`oat_template`, `oat_template_name`) on instantiation.
**When right:** Makes `init` self-sufficient on a truly fresh repo (bundled fallback) while
honoring the install→customize→instantiate lifecycle (repo-local override).
**Tradeoffs:** One resolution branch + frontmatter-strip step.

#### Approach B: Require pack install first; read only from `.oat/templates/`

**When right:** If we wanted to hard-couple install→init.
**Tradeoffs:** Fails the "fresh repo" acceptance criterion when templates aren't copied;
worse first-run UX.

#### Chosen Direction

**Approach:** A — bundled-asset source with repo-local override and frontmatter strip.

## Key Decisions

1. **New command:** `oat pjm init` (new top-level `oat pjm` namespace), implemented with
   the `createXCommand()` + dependency-injection pattern; json/text output; exit-code
   semantics consistent with other commands.
2. **`current-state.md` becomes a bundled template too.** It is required by the acceptance
   criteria and has no generator, so a starter template is necessary — not just
   `decision-record.md`. Both join `roadmap.md`/`backlog-item.md` as PM-pack templates.
3. **`decision-record.md` is a first-class PM template:** added to `.oat/templates/`,
   `bundle-assets.sh`, `PROJECT_MANAGEMENT_TEMPLATES`, and tests.
4. **Backlog reuse, not duplication:** `oat pjm init` calls the existing exported
   `initializeBacklog()` for the backlog surface.
5. **Non-destructive + idempotent:** never overwrite existing reference docs; re-running is
   a no-op for present files. Match the local `--force` legacy convention rather than
   inventing new flag semantics.
6. **Templates are minimal starters** (frontmatter + section skeletons like the existing
   `roadmap.md`), NOT copies of this repo's curated dogfood docs.
7. **Docs make install-vs-init explicit:** pack install copies skills/templates; `pjm init`
   instantiates the repo-reference surface; `backlog init` is the lower-level helper that
   `pjm init` delegates to.

## Constraints

- Follow `packages/cli/AGENTS.md`: thin command handlers, logic in modules, only `./` and
  alias imports (no `../`, no `src/`), route output through the CLI logger, explicit exit
  codes, mutate-by-default with non-interactive/JSON contracts.
- Keep the manifest as the single source of truth; `bundle-consistency.test.ts` must pass.
- Lockstep version bump for the 5 public packages (`0.1.11` → `0.1.12`); `pnpm
release:validate` must pass.
- `.oat/templates/*` and `packages/cli/assets/templates/*` must stay in sync via the
  bundle script.

## Success Criteria

- A fresh repo can run `oat pjm init` and immediately has `current-state.md`, `roadmap.md`,
  `decision-record.md`, and the full `backlog/` scaffold under `.oat/repo/reference/`.
- `decision-record.md` is treated as a first-class PJM template (source + bundle + manifest
  - tests).
- Existing repos are safe: no silent overwrite of curated reference docs; re-running is
  idempotent.
- Docs make the install-vs-init lifecycle explicit.
- Focused CLI tests + `pnpm release:validate` pass.

## Out of Scope

- Refactoring `initializeBacklog` internals (reuse as-is).
- Migrating `backlog.md` / `backlog-completed.md` legacy files.
- Auto-running `pjm init` as part of pack install (kept as separate lifecycle steps).
- Interactive content authoring of the reference docs (init only scaffolds starters).

## Open Questions

- **Frontmatter on instantiation:** Strip `oat_template*` markers from instantiated reference
  docs (chosen) vs copy verbatim — confirm during design.
- **Command name:** Confirm `oat pjm init` over a nested alternative at the requirements gate.

## Next Steps

Proceed to the design-depth decision (Step 2.5). Given the command-placement and
template-source design forks plus the new `current-state.md` template, a lightweight design
is the likely recommendation before planning.
