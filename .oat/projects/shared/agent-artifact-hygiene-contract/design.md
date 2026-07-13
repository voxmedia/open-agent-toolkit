---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: agent-artifact-hygiene-contract

## Overview

Artifact formatting becomes an explicit, self-contained completion contract at every canonical boundary that can create or edit tracked output: the phase implementer and reviewer role definitions, six lifecycle skills, and the CLI-injected gate-review context note. Every copy starts with the stable, greppable lead-in `Artifact hygiene contract:` and uses equivalent verbatim instructions. Duplication is intentional: role definitions and gate prompts cross dispatch/runtime boundaries where a referenced shared file may not be loaded or even be available. The stable lead-in keeps the duplicated contract auditable and leaves room for future automated validation without adding enforcement in this project.

The contract tells a writing agent to use the concrete fix/write command already supplied by its governing plan, task, or brief. Only when that instruction is absent or unusable does the agent fall back to discovering repository-owned formatting instructions from applicable `AGENTS.md`/`CLAUDE.md` files and relevant package manifests. Discovery prefers a documented write/fix command over a check-only command and scopes the write to created or edited files when the documented command supports paths. The agent must not infer or hardcode a formatter executable, and it must not casually run a whole-tree write that pollutes the diff with unrelated changes. When fallback discovery finds no command, the agent emits one warning—`no format command discovered in repo instructions; skipping`—then continues without formatting. Existing relevant definition-of-done checks remain applicable; artifact writes are explicitly not exempt.

The canonical plan-writing contract makes the plan producer the primary and normally sole command resolver. It discovers the repository's documented fix/write command once and bakes the concrete repository command into every phase or task that writes artifacts, including a file-scoped form when supported. Downstream implementation agents execute that instruction without repeating discovery. This is per-repository command resolution, not a hardcoded formatter choice. Runtime role and skill contracts retain fallback discovery for direct lifecycle writers, stale plans, and writes outside a planned task.

## Architecture

### System Context

The change is a distributed prose contract across ten canonical surfaces: two dispatched agent roles, seven plan/lifecycle skills, and one CLI prompt constant. Canonical `.agents/` content remains the only authored source for roles and skills; `oat sync --scope all` regenerates provider views after implementation. The CLI context note independently carries the same contract because gate reviewers can be launched across runtimes without loading canonical skills.

**Key Components:**

- **Planning-time resolver (`oat-project-plan-writing`):** Reads applicable repository instructions and relevant manifests once, distinguishes fix/write commands from check-only commands, and writes the concrete command into each artifact-writing task.
- **Runtime hygiene contract:** A verbatim, greppable `Artifact hygiene contract:` block in the phase implementer, reviewer, and six direct artifact-writing lifecycle skills. It executes a supplied command first and performs repository discovery only as a fallback.
- **Gate-review prompt injection:** `REVIEW_GATE_CONTEXT_NOTE` carries the same runtime contract into CLI-dispatched gate reviews.
- **Release and provider projection:** Canonical edits are projected by `oat sync --scope all`; bundled-asset delivery is represented by lockstep version bumps across the five public packages.

### Data Flow

For planned implementation work:

1. The plan writer reads applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests.
2. It selects the documented write/fix command, not a check-only variant, and records a file-scoped invocation when supported.
3. Each artifact-writing task carries that concrete command and the relevant verification step.
4. The dispatched implementer executes the supplied command over its edited files, then runs applicable task/DoD verification. It does not repeat discovery unless the supplied instruction is absent or unusable.

For direct lifecycle or review writes:

1. The writing role or skill checks for a command supplied by its governing task or brief.
2. If none is usable, it applies the same ordered fallback discovery.
3. It formats only created or edited files when supported, avoiding unrelated whole-tree rewrites.
4. If no command is discoverable, it emits `no format command discovered in repo instructions; skipping` once and continues.

## Component Design

### Runtime Artifact Hygiene Contract

**Purpose:** Keep every artifact-writing execution path self-contained while making copies easy to audit.

**Canonical wording:**

> Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.

Role-specific text may immediately follow to preserve existing DoD semantics. The phase implementer explicitly runs the repository's applicable gate set over its produced diff, including artifact writes. Lifecycle skills apply only checks relevant to the files they changed; prose-only work does not imply unrelated full test suites.

**Placement:**

- `.agents/agents/oat-phase-implementer.md`
- `.agents/agents/oat-reviewer.md`
- `.agents/skills/oat-project-review-provide/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md`
- `.agents/skills/oat-project-summary/SKILL.md`
- `.agents/skills/oat-project-document/SKILL.md`
- `.agents/skills/oat-project-pr-final/SKILL.md`
- `.agents/skills/oat-project-quick-start/SKILL.md`
- `packages/cli/src/commands/gate/index.ts` in `REVIEW_GATE_CONTEXT_NOTE`

### Planning-Time Command Resolution

**Purpose:** Remove redundant discovery from normal implementation dispatches and make formatting an executable task step rather than ambient guidance.

`oat-project-plan-writing` must:

1. Resolve the applicable documented write/fix command once while authoring a plan.
2. Distinguish it from a check-only command.
3. Put the concrete repository command into every task that creates or edits artifacts, scoped to that task's files when supported.
4. If no command is discoverable, put the exact warn-once/no-op behavior into those tasks instead.
5. Keep the runtime contract as fallback guidance; downstream agents do not rediscover a valid baked command.

### Canonical Asset Projection and Release

All role and skill edits occur under `.agents/`. Each changed canonical skill receives one frontmatter version bump for the final PR diff, including the newly added `oat-project-plan-writing` surface. `oat sync --scope all` regenerates provider views. Because these bundled assets and the CLI prompt ship publicly, all five public package versions move in lockstep.

### Dispatch-Ladder Preflight Hardening

The shared `oat-project-plan-writing` contract must run `oat config list --json` once and inspect its resolved provider/tier entries before offering adoption. That CLI is the effective-config boundary: it merges shared, repo-local, user, and default configuration and reports source attribution, so agents must not read each raw config surface themselves. A `dispatch-ceiling resolve` result with `matrix: null` can mean only that the project has no selected ceiling; it is not evidence that candidate ladders are absent. Adoption is offered only when the effective-config output contains missing or incomplete ladder cells. When ladders are complete but policy is unresolved, planning skips adoption and asks only for the project-specific named ceiling.

## Testing Strategy

### Contract Coverage

- Audit canonical sources with an exact search for `Artifact hygiene contract:` and confirm every enumerated runtime surface is present.
- Confirm the copied runtime block remains equivalent at all nine placements; the plan-writing extension is intentionally additional rather than a divergent replacement.
- Inspect generated provider views after `oat sync --scope all` and run the repository's skill validation/version-bump checks.

### CLI Unit Tests

- Extend `packages/cli/src/commands/gate/index.test.ts` prompt assertions to require the hygiene lead-in and fallback warning text in assembled gate-review prompts.
- Run the gate command test file with the CLI package's Vitest runner, then run CLI lint and type-check.

### Workflow Artifact Verification

- Ensure the generated implementation plan itself demonstrates planner-first resolution: every artifact-writing task contains a concrete, file-scoped command derived from this repository's documented `format:fix` surface.
- Run the file-scoped write command before each implementation commit, then run the repository check command to prove no tracked artifact is left unformatted.
- Verify that package versions are lockstep, canonical skills have one version bump each, and provider views match canonical content.
- Add a skill-contract regression check that a complete user-level ladder with no project policy skips adoption and proceeds to the project-ceiling choice; `matrix: null` must not be treated as ladder absence.

### Final Validation

- Run focused CLI tests.
- Run `pnpm format`, `pnpm lint`, `pnpm type-check`, and `pnpm test`.
- Run `pnpm release:validate`; the project is not complete until it passes.

## References

- Discovery: `discovery.md`
