---
id: BL-260911-make-oat-doctor
title: Make oat-doctor a collaborative router over config, PJM, agent
  instructions, and docs health
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - doctor
  - config
  - pjm
  - agent-instructions
  - docs
  - skills
assignee: null
created: 2026-09-11T23:34:16.344Z
updated: 2026-09-11T23:34:16.344Z
associated_issues: []
external_plans: []
---

## Description

Today oat-doctor (skill 1.2.4) is a tool-inventory check: installed packs, outdated skills, three stale-pointer config checks, and a --summary dashboard, with config-key explanations read from bundled docs and a hard-coded fallback list of eleven keys. The CLI already exposes richer, machine-readable health signals that nothing routes a person to: oat doctor --json (environment and setup), oat pjm doctor --json (adoption state plus twelve pjm:\* checks such as legacy_monoliths, loose_reference_files, backlog_invalid_status), oat config list / dump / describe (resolved values with source attribution and per-key descriptions across the five surfaces), oat config adopt (bundled recommendation templates), oat instructions validate (AGENTS.md / CLAUDE.md sync integrity), and the docs skills (oat-docs-analyze, oat-agent-instructions-analyze). The operator's ask (2026-09-11): one doctor that looks at everything, presents potential issues, and asks where to dive deeper, and in the config area teaches — not just flags: what a missing setting does, why you might or might not want it, how to set it, and what belongs at project versus user level. A person who has not initialized PJM, whose PJM tree drifted from the current structure, whose root agent instructions lack the OAT context sections, or whose config carries a legacy post-implement sequence value should learn that from one place.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}

## Shape

One skill, `oat-doctor`, rewritten as a collaborative router. It runs a read-only sweep across the areas below, presents the findings grouped by area with severity, and asks where to dive deeper; each dive is a conversation that ends in an offered fix, never an applied one. Unattended invocation (no user-response channel) reports the sweep and stops. No new CLI command: every signal the sweep needs already exists as `--json` output, and the areas that need an apply step route to the skill that owns it. The teaching material is the bundled docs (`cli-utilities/configuration.md`, `config-and-local-state.md`, `workflow-gates.md`, `bootstrap.md`, `backlog-lifecycle.md`) plus `oat config describe`; the skill does not carry a second copy of key descriptions (the current eleven-key fallback list is retired).

## Areas (each a dive)

- **Config** (`oat doctor --json`, `oat config dump`, `oat config describe`, `oat config adopt --help`). Findings: stale `activeProject` / `activeIdea` / `lastPausedProject` pointers; legacy values the CLI still accepts but no longer recommends (for example a string `workflow.postImplement` sequence from `VALID_POST_IMPLEMENT_LEGACY_SEQUENCES` where the structured steps exist; deprecated `explainers.defaults.palette` / `visualProfile` in favor of `style`); keys set at a surface the docs say is the wrong owner (secrets or machine paths in shared config, team policy in local); bundled recommendation templates not yet adopted. Teaching: for every documented key group that is unset, what it does, why one might or might not set it, the command to set it, and which surface (shared, local, user) it belongs on — answered from the docs, with the person's questions answered in the same turn. Fix path: `oat config set` / `unset` / `adopt`, offered with the exact command.
- **PJM** (`oat pjm doctor --json`). Findings: adoption `absent` / `partial` (offer `oat pjm init`); the twelve `pjm:*` checks surfaced with the fix each implies (`legacy_monoliths`, `loose_reference_files`, `second_roadmap`, the four backlog integrity checks, `template_frontmatter`, `top_level_layout`). Fix path: `oat pjm init`, `oat backlog archive` / `regenerate-index`, `oat decision regenerate-index`, or a pointer to the migration prompt for structural drift.
- **Agent instructions** (`oat instructions validate --json`, plus a read of the root `AGENTS.md` / `CLAUDE.md`). Findings: sync-strategy drift; missing OAT context sections that `oat tools install --project-guidance` and `oat pjm init` normally write (skills discovery, project management, decision records, the docs section when a docs surface exists); nested instruction files that contradict the root. Fix path: `oat instructions sync`, `oat tools install --project-guidance`, or route to `oat-agent-instructions-analyze` + `-apply` for content quality.
- **Docs** (existing-docs detection as in `BL-260911-make-docs-bootstrap-a-front`). Findings: a docs surface with no `documentation` config, or docs package drift. Fix path: route to `oat-docs-bootstrap`'s front door; no docs logic lives in the doctor.
- **Tools** (the existing Steps 1–2, kept): installed packs, outdated skills, sync status.

## Acceptance Criteria

- `oat-doctor` with no arguments runs the read-only sweep over all five areas and prints one grouped report (area, finding, severity, the command or skill that fixes it), then asks which area to dive into; `--summary` keeps today's dashboard.
- A dive is a conversation: the skill explains each finding and each relevant unset key from the bundled docs (never from a hard-coded list), answers the person's questions, and offers the exact fix command or the owning skill; it applies nothing without explicit approval and never edits config, PJM, instructions, or docs itself except through the named CLI commands the person approves.
- Every finding names its evidence (the CLI check id or the file:line) and its fix path; a finding with no fix path is reported as informational.
- Under `OAT_NON_INTERACTIVE=1` or with no user-response channel the sweep report is the whole output.
- The config dive distinguishes the five surfaces and says, per key group, which surface the docs recommend; a key set on a surface the docs mark as wrong is a finding.
- The legacy-value list is sourced from the CLI (`config describe` and the config module's legacy tables), not maintained in the skill; a new legacy value in the CLI appears in the doctor without a skill edit, pinned by a contract test.
- The eleven-key fallback description list in the current skill is removed; when bundled docs are missing the doctor says so and points at `oat tools install core`.
- `oat-doctor` bumps; the `oat-docs` skill's config-question routing and the `cli-utilities/index.md` page mention the doctor as the place to start; `pnpm check`, `pnpm test:skills`, `pnpm lint`, `pnpm format` green.
- Reference repos for validation: this repository (adoption `declared`, all `pjm:*` checks passing today), `~/code/vox/pntr` (no `documentation` config, PJM present), and one fresh scratch repo with no `.oat/` at all (every area should offer its bootstrap).

## Out of scope

- A separate `oat-doctor-config` / `oat-doctor-docs` skill family: one router with dives is the operator's preference ("maybe this should all just be one thing"); dives that grow their own apply machinery route to an owning skill instead.
- New CLI diagnostics: file a follow-up if a dive needs a check the CLI cannot answer today.
- Auto-fixing anything.

Related: `BL-260911-make-docs-bootstrap-a-front` (the docs dive's target), `BL-260911-support-per-tool-scope`.
