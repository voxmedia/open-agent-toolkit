---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-14
oat_generated: false
oat_template: false
---

# Design: oat-doctor-router

Lightweight design (quick workflow). Sections not listed are intentionally omitted.

## Overview

`oat-doctor` is rewritten from a tool-inventory check into a read-only router over five areas: config, PJM, agent instructions, docs, and tools. A run has three stages. The **sweep** calls the CLI's existing JSON commands (`oat doctor --json`, `oat pjm doctor --json`, `oat config dump --json`, `oat config describe --json`, `oat instructions validate --json`, `oat tools list --json`, `oat tools outdated --json`) and four file-presence checks, and turns them into findings, each with an area, a severity, its evidence (the check id or the file), and a fix path (an exact CLI command or the owning skill). The **report** prints the findings grouped by area, most severe first, and ends with a "which area do you want to look at?" prompt; unattended, the report is the whole output. A **dive** is a conversation about one area: it explains each finding and, for config, each documented key group the person has not set, from the bundled docs and the `describe` entries, answers questions, and offers the fix; the doctor runs a fix only as the one carve-out below: exactly the command it named, once, after the person approves that command.

The one CLI change is a structured `deprecated` field on `oat config describe` entries, so the doctor reads a fact instead of scanning prose for the word "deprecated". Five entries carry that fact in their descriptions today; the field makes it machine-readable and a CLI test ties it to the catalog's deprecation phrasings so a deprecation worded like the existing ones cannot be added without the field. Everything else is prose in the skill, plus the skill's contract test. The hard-coded eleven-key description list and the hand-maintained pack manifest in today's skill are removed: the describe output and `oat tools list` already carry both.

## Architecture

**Callers.** A person (`/oat-doctor`, optionally `--summary`); `oat-docs` ("want me to check your setup?"); and eventually the docs bootstrap front door. Unattended callers get the report only.

**Sweep sources and what each area reads:**

| Area               | Sources (all read-only)                                                                                                                                                                                                                                                                                                 | Findings                                                                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config             | `oat config dump --json` (values by surface), `oat config describe --json` (109 entries: group, file, scope, type, default, mutability, owning command, description, and the new `deprecated` field), `oat doctor --json` `project:dispatch_matrix` and `project:synced_*` checks                                       | stale `activeProject` / `activeIdea` / `lastPausedProject`; any set key whose entry is `deprecated` (with `supersededBy`); a key set on a surface other than the one its entry names; unadopted recommendation templates (`oat config adopt` list) |
| PJM                | `oat pjm doctor --json` (adoption state; twelve core `pjm:*` checks plus nine `pjm:remote_*` checks when a remote binding is adopted)                                                                                                                                                                                   | adoption `none` / `partial-initialization` / `inferred-legacy`; every non-passing `pjm:*` check with the fix its message implies                                                                                                                   |
| Agent instructions | `oat instructions validate --json`; presence of the CLI-written headings in the root `AGENTS.md` (`## Tool Packs` when packs are installed with project guidance, `### Project Management` when PJM is adopted, `### Decision Records` when the decision surface exists, `## Documentation` when a docs surface exists) | sync drift (entry status `missing`, `content_mismatch`, `stray`); a missing heading for an installed or adopted capability                                                                                                                         |
| Docs               | `documentation.*` in the dump; presence of a docs app or a root `docs/` directory (the same detection `oat-docs-bootstrap` preflight uses)                                                                                                                                                                              | a docs surface with no `documentation` config; a `documentation.root` that does not exist; no surface and no config at all (info: offer the bootstrap)                                                                                             |
| Tools              | `oat tools list --json`, `oat tools outdated --json`, `oat doctor --json` provider, manifest, codex, skill-version, `packs:*`, and `*:pack_state` checks                                                                                                                                                                | outdated skills; packs installed at both scopes; packs declared in config but not installed                                                                                                                                                        |

**Severity.** `error` when a lifecycle skill would fail or write to the wrong place (stale active pointer, adoption `none` or `partial-initialization` (the CLI's literals; `inferred-legacy` is a warning, `declared` is healthy), a `pjm:*` check with status `fail`, instructions `missing`/`contentMismatch`); `warning` for drift a person should fix soon (outdated skills, deprecated keys, a missing guidance heading, a docs surface with no config); `info` for teaching opportunities (documented key groups left unset, recommendation templates not adopted). The report prints errors and warnings always; info lines are folded into one count per area and expanded only inside a dive, so a healthy repo's report stays a screen long.

**Data flow.** Sweep (seven CLI calls, four file checks) → findings list in memory → grouped report → the person picks an area → the dive re-reads only that area's sources plus the docs pages it cites → offered fixes, each a command the person runs or approves, or a skill hand-off (`oat-docs-bootstrap`, `oat-agent-instructions-analyze`, `oat-pjm-*`). The sweep and the dives write no file under the repository or the home directory; the only mutation is the approved fix command the carve-out allows.

**The CLI change.** `ConfigCatalogEntry` gains `deprecated?: { supersededBy: string; note?: string }`. The five deprecated entries carry it (`workflow.autoReviewAtHillCheckpoints` mentions the legacy alias in its description but is the successor and gets no field): `autoReviewAtCheckpoints` → `workflow.autoReviewAtHillCheckpoints`; `explainers.defaults.palette` and `explainers.defaults.visualProfile` → `explainers.defaults.style`; `workflow.dispatchCeiling.preset` → `workflow.dispatchCeiling` policy keys; `workflow.postImplementSequence` is deprecated only in its legacy string form (`wait` / `summary` / `pr` / `docs-pr`, the `VALID_POST_IMPLEMENT_LEGACY_SEQUENCES` table) → the structured `{ preApproval, postApproval }` value, expressed as `deprecated: { supersededBy: 'workflow.postImplementSequence (structured)', legacyValues: [...] }`. `describe --json` emits the field; the plain `describe <key>` output prints a `Deprecated: prefer …` line. A CLI test asserts that every catalog entry whose description carries one of the catalog's deprecation phrasings (`Deprecated compatibility`, `Deprecated nullable`, `Legacy compatibility alias`, `Legacy strings remain`) has the field, and that no field names a `supersededBy` outside the catalog, so the prose and the field cannot drift apart.

## Component Design

### `oat-doctor` skill (rewrite; 1.2.4 → 2.0.0)

- **Mode assertion** rewritten with one carve-out: the sweep and dives never write; the skill may run exactly one fix command it has just named, after the person approves that exact command, and reports the result; everything else stays blocked.
- **Step 0 Mode:** `--summary` keeps today's dashboard (Steps 5–7 of the current skill, with the pack manifest replaced by `oat tools list --json` grouped by `pack`); no argument runs the sweep; `OAT_NON_INTERACTIVE=1` or no response channel means report-only.
- **Step 1 Sweep:** the seven commands and four file checks above, each wrapped so a failing command becomes one `warning` finding ("`oat pjm doctor` unavailable: …") instead of aborting the run.
- **Step 2 Report:** the grouped format below; ends with an `AskUserQuestion` offering the areas that have findings (plus "all areas" and "done"); in report-only mode it ends after the report.
- **Step 3 Dives**, one subsection per area, each with the same shape: (a) restate the area's findings with evidence; (b) for config only, walk every distinct `group` in `describe --json` (nine today) and for each group the person has left unset, say in two or three sentences what it does, when to set it, and which surface owns it, citing the bundled page (`cli-utilities/configuration.md` § The five config surfaces, § Workflow preferences, § Dispatch policy resolution; `cli-utilities/workflow-gates.md` § Gate config; `cli-utilities/backlog-lifecycle.md` § Adoption comes first for PJM); (c) answer the person's questions from those pages; (d) offer each fix as the exact command from the entry's `owningCommand` or the owning skill, and stop. The dive tells the person the command and, only when they approve that exact command, runs it once and reports the result (the one carve-out in the Mode Assertion). PJM structural drift (`legacy_monoliths`, `loose_reference_files`, `second_roadmap`, `top_level_layout`) routes to the migration guidance in `backlog-lifecycle.md` § Catching lifecycle drift; instruction content quality routes to `oat-agent-instructions-analyze`; docs route to `oat-docs-bootstrap`.
- **Teaching rule:** the skill quotes nothing from the docs into itself; it names the page and section and reads it at run time. When `~/.oat/docs/` is absent the dive says so and offers `oat tools install core`.
- **Removed:** the fallback description list, the pack manifest, and the "Config Key Explanations" section.

### `oat config describe` (CLI, small)

- `ConfigCatalogEntry.deprecated` as above; JSON passthrough; one added line in the plain-text formatter (`formatCatalogDetails`).
- Test in `commands/config/index.test.ts`: the five entries carry the field with the expected `supersededBy`; a sweep over `describe --json` asserts every entry whose description starts with `Deprecated` or contains `Legacy compatibility alias`, `Deprecated compatibility`, `Deprecated nullable`, or `Legacy strings remain` carries it, and that `workflow.autoReviewAtHillCheckpoints` (whose description names the legacy alias it supersedes) does not; the legacy string sequences in `VALID_POST_IMPLEMENT_LEGACY_SEQUENCES` all appear in `postImplementSequence`'s `legacyValues`.

### Contract test for the skill (`.agents/skills/oat-doctor/tests/doctor-contract.test.mjs`, new)

- Pins the prose the CLI and docs depend on: the seven sweep commands and every fix command resolve against the built CLI; the report-only rule names `OAT_NON_INTERACTIVE`; the skill contains none of the eleven old key descriptions and no pack manifest list; every `pjm:*` check id the CLI emits today is mentioned in the PJM dive (so a new check id fails the test until the dive covers it); every docs page section the dives cite exists in `apps/oat-docs/docs`.

### Docs

- `cli-utilities/config-and-local-state.md:286` and `cli-utilities/tool-packs.md:853` describe the doctor's modes; both rewritten to the sweep-and-dive shape. `oat-docs/SKILL.md:137` already routes "check your setup" to the doctor; unchanged.

## Data Models

**Finding (in memory, never persisted):**

```text
{ area: config|pjm|instructions|docs|tools,
  severity: error|warning|info,
  summary: one line,
  evidence: check id | key + surface | file path,
  fix: { command } | { skill } | null }
```

**Report shape:**

```text
OAT ▸ DOCTOR
Config (1 error, 2 warnings, 4 info)
  ✖ activeProject points at .oat/projects/shared/x, which does not exist        [config.local]
    → oat config set activeProject ''
  ⚠ workflow.postImplementSequence uses the legacy value "docs-pr"              [shared]
    → prefer the structured form; see oat config describe workflow.postImplementSequence
PJM (ok)
Agent instructions (1 warning)
  ⚠ AGENTS.md has no "### Project Management" section although PJM is adopted  [AGENTS.md]
    → oat pjm init   (or: run oat-agent-instructions-analyze)
Docs (1 warning) … Tools (ok)
Where do you want to dive? [config / instructions / docs / all / done]
```

**`describe` entry addition:** `deprecated?: { supersededBy: string; note?: string; legacyValues?: string[] }`.

## Error Handling

- A sweep command fails only when its stdout is not JSON or it is killed or times out; a non-zero exit with parseable JSON is a findings result (`oat doctor` and `oat pjm doctor` exit 1 on a healthy repo with warnings). A failed command becomes one warning finding for its area with the stderr excerpt; the run continues. Every call projects to the fields the area reads (design § Architecture), never the raw payload.
- Missing bundled docs: the dive states it and offers the core install command; no fabricated explanations.
- A person asks the doctor to fix something directly: the skill's self-correction rule applies (present the command, run it only with visible approval).
- A finding with no fix path is reported as `info` with the reason (for example a `pjm:*` check whose message names no remedy).

## Testing Strategy

- **CLI:** the describe field tests above, red-then-green (remove the field from one deprecated entry → the description-sweep test fails).
- **Skill contract test:** as above, run under `pnpm test:skills`; prove it can fail by deleting one `pjm:*` id from the dive.
- **Live verification (recorded in the implementation log, not a test):** run the sweep on this repository (expect a short report: tools current, adoption declared), on `~/code/vox/pntr` (expect the docs warning: surface without `documentation` config), and on a scratch repository with no `.oat/` (expect every area offering its bootstrap: `oat init`, `oat tools install`, `oat pjm init`, `oat-docs-bootstrap`); run once with `OAT_NON_INTERACTIVE=1` and confirm the output ends at the report.
- Gates: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`, plus `pnpm lint` and `pnpm format` for the skill tree.

## Implementation Phases

1. **CLI:** the `deprecated` field, formatter line, tests, lockstep bump.
2. **Skill:** the rewrite, the contract test, the two docs pages, the skill bump; live verification on the three repositories.

## References

- `discovery.md`; `.oat/repo/pjm/backlog/items/BL-260911-make-oat-doctor.md`.
- `.agents/skills/oat-doctor/SKILL.md` (1.2.4); `packages/cli/src/commands/config/index.ts` (`ConfigCatalogEntry` `:194`, `CONFIG_CATALOG` `:388`, `formatCatalogDetails` `:3401`, `runDescribe` `:3679`); `packages/cli/src/config/oat-config.ts` (`VALID_POST_IMPLEMENT_LEGACY_SEQUENCES` `:243`, `LEGACY_POST_IMPLEMENT_SEQUENCES` `:257`); `packages/cli/src/commands/init/tools/project-guidance.ts` (`## Tool Packs`), `init/tools/project-management/agents-guidance.ts` (`### Project Management`), `decision/agents-guidance.ts` (`### Decision Records`).
- Docs: `apps/oat-docs/docs/cli-utilities/{configuration,config-and-local-state,workflow-gates,backlog-lifecycle,tool-packs}.md`, `reference/file-locations.md`.
