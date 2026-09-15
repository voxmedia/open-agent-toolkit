---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-09-15
oat_generated: false
oat_template: false
---

# Discovery: oat-doctor-router

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Backlog item `BL-260911-make-oat-doctor` (high), from the operator's 2026-09-11 ask: one doctor that looks at everything, presents potential issues, and asks where to dive deeper; in the config area it teaches rather than flags — what a missing setting does, why you might or might not want it, how to set it, and what belongs at project versus user level. Someone who has not initialized PJM, whose PJM tree drifted, whose root agent instructions lack the OAT context sections, or whose config carries a legacy value should learn it from one place. The operator's own framing: "maybe this should all just be one thing, and we just surface the different things we can run doctor on", and "basically it's just a collaborative thing."

## Clarifying Questions

### Question 1: One skill or a family?

**Q:** `oat-doctor` plus `oat-doctor-config`, `oat-doctor-docs`, and so on, or one router?
**A:** One router with dives (operator, 2026-09-11; recorded in the backlog item's Out of scope).
**Decision:** One skill, `oat-doctor`, rewritten. Areas are dives inside it; a dive that needs its own apply machinery routes to the skill that owns it.

### Question 2: Where does the knowledge come from?

**Q:** Should the doctor carry its own descriptions of config keys and legacy values?
**A:** No. The current skill carries an eleven-key fallback list and a hard-coded pack manifest, both of which drift from the CLI. The CLI already exposes what the doctor needs: `oat config describe --json` returns 109 entries with group, file, scope, type, default, mutability, owning command, and description, and five of those descriptions already say "Deprecated" or "Legacy" (a sixth mentions the legacy alias it supersedes); `oat pjm doctor --json` returns twelve `pjm:*` checks with status and message; `oat instructions validate --json` returns per-file sync status; `oat doctor --json` returns the environment checks; the bundled docs under `~/.oat/docs/cli-utilities/` carry the five-surface model and the per-key guidance.
**Decision:** The doctor reads, it does not restate. Legacy detection is sourced from the CLI (design decides how, see Open Questions). The fallback description list and the hard-coded pack manifest are removed.

### Question 3: What does "collaborative" mean under automation?

**Q:** The doctor runs from `oat-docs` ("want me to check your setup?") and could run unattended.
**A:** Unattended, the sweep report is the whole output. Interactively, every dive ends in an offered fix and applies nothing itself.
**Decision:** Read-only invariant kept from today's skill; fixes are the exact CLI command or the owning skill, run only on the person's approval.

## Solution Space

### Approach 1: One router skill over existing CLI signals _(Recommended, chosen)_

**Description:** Rewrite `oat-doctor` as a five-area sweep (config, PJM, agent instructions, docs, tools) composed from the CLI's existing `--json` commands, followed by a grouped report and a "where do you want to dive?" prompt. Each dive is a conversation that teaches from the bundled docs and the `describe` output and offers fixes.
**When this is the right choice:** The signals already exist as machine-readable output and only the routing and the teaching are missing. That is the case today.
**Tradeoffs:** The skill grows in prose; it depends on the CLI's JSON shapes staying stable (pinned by contract tests).

### Approach 2: A new `oat doctor --deep` CLI diagnostic

**Description:** Move the sweep into the CLI as one command that aggregates the other doctors and emits one report; the skill becomes a thin presenter.
**When this is the right choice:** When the same aggregate is needed by CI or by non-agent consumers.
**Tradeoffs:** New CLI surface, lockstep bump, docs, tests, for an aggregation an agent can do by calling four commands; the teaching half cannot live in the CLI anyway. Rejected; noted as a follow-up trigger.

### Approach 3: A skill family (`oat-doctor-config`, `oat-doctor-docs`, ...)

**Description:** One skill per area, each installable separately.
**When this is the right choice:** When areas have independent owners and lifecycles.
**Tradeoffs:** Discovery is worse (the person must know which doctor to run), and the cross-area "here is everything wrong" view disappears. Rejected by the operator.

### Chosen Direction

**Approach:** Approach 1.
**Rationale:** Every signal the sweep needs exists; the missing pieces are routing and teaching, both prose.
**User validated:** Yes (2026-09-11, the backlog item; 2026-09-14, quick workflow chosen).

## Options Considered

### Option A: Source legacy detection by scanning `describe` descriptions for "deprecated" / "legacy" _(considered)_

Works today with no CLI change (five keys match once the successor key is excluded), but is a string match on prose and would silently miss a new deprecation worded differently.

### Option B: Add a structured deprecation field to `oat config describe` entries _(chosen for design)_

A small change to an existing command's output (`deprecated: { supersededBy }` on the five entries and any future one), with a CLI test that ties the field to the config module's legacy tables. The doctor then reads a field, not prose. This is not a new diagnostic; it is the existing describe command carrying a fact it already states in words. Design confirms the exact shape.

### Option C: Detect "missing OAT context sections" by heading presence

The CLI writes known headings into the root instructions (`## Tool Packs` from tools install with project guidance, `### Project Management` and `### Decision Records` from PJM init, `## Documentation` from docs bootstrap). Presence checks against what is installed or adopted are enough; content quality routes to `oat-agent-instructions-analyze`. Chosen.

## Key Decisions

- One `oat-doctor` skill; areas are dives; unattended runs report only.
- Read-only with one carve-out: the sweep and dives never edit config, PJM, instructions, docs, or skills; the doctor offers the exact command or the owning skill and may run exactly the command it named, once, after the person approves it (settled at plan review, 2026-09-14).
- Knowledge is sourced from the CLI (`describe`, the doctors, `instructions validate`) and the bundled docs; the eleven-key fallback list and the hand-maintained pack manifest go.
- Legacy detection is a structured field on `describe` entries, backed by a CLI contract test (Option B).
- The docs dive detects and routes to `oat-docs-bootstrap`; it carries no docs logic. The bootstrap front door itself is `BL-260911-make-docs-bootstrap-a-front` and is not blocked by this project.
- `--summary` keeps today's dashboard so existing callers and docs stay true.

## Constraints

- No new CLI diagnostic command; the one CLI change is the deprecation field on an existing command's JSON output (lockstep bump).
- Bundled skill changes take one `metadata.version` bump per changed skill and the lockstep bump; `pnpm check`, `pnpm test`, `pnpm test:skills`, `pnpm lint`, `pnpm format` green.
- The skill stays `disable-model-invocation: true`, `user-invocable: true`, and read-only (`allowed-tools` unchanged).
- Nothing in the doctor duplicates a record an existing consumer already reads (repository rule).

## Success Criteria

- `oat-doctor` with no arguments prints one grouped report across five areas (finding, severity, evidence, fix path) and asks which area to dive into; `--summary` keeps the dashboard.
- A dive explains findings and unset keys from the bundled docs and `describe`, answers questions, and offers the exact fix; nothing is applied without approval.
- Legacy config values are reported from the CLI's structured field; adding a deprecation in the CLI surfaces in the doctor with no skill edit (pinned by a contract test).
- Under `OAT_NON_INTERACTIVE=1` or with no response channel, the sweep report is the whole output.
- Verified on this repository (adoption declared, checks passing), on `~/code/vox/pntr` (no `documentation` config), and on a scratch repo with no `.oat/` (every area offers its bootstrap).

## Out of Scope

- A doctor skill family; auto-fixing; a new CLI diagnostic.
- The docs bootstrap front door and docs-directory shape (`BL-260911-make-docs-bootstrap-a-front`).
- Per-tool scope migration (`BL-260911-support-per-tool-scope`).

## Deferred Ideas

- An aggregate `oat doctor --deep` CLI command, if CI or a non-agent consumer ever needs the combined report.
- A `describe`-driven "explain this key" subcommand in the CLI, if people want the teaching without a skill.

## Open Questions

- Exact shape of the deprecation field on `describe` entries and which CLI test pins it to the legacy tables (design).
- How the sweep orders and severity-rates findings across areas so the report stays short on a healthy repo (design).
- Which bundled docs pages each dive reads, so the teaching is grounded and the skill does not restate them (design).

## Assumptions

- `oat config describe --json`, `oat pjm doctor --json`, `oat instructions validate --json`, and `oat doctor --json` keep their current shapes (verified 2026-09-14 on CLI 0.2.74).
- The bundled docs are installed at `~/.oat/docs/` whenever the core pack is; when absent the doctor says so and points at `oat tools install core`.

## Risks

- The skill grows long; mitigated by keeping each dive to the findings, the docs pointer, and the fix, and by not restating docs.
- JSON shape drift in the CLI; mitigated by contract tests over the fields the skill names.

## Next Steps

- Lightweight design (draft-and-review), then plan, plan gate, implement.
