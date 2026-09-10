---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-09-09
oat_generated: false
---

# Discovery: agent-authored-recap

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable.

## Initial Request

Backlog item `BL-260907-replace-the-default-project` (high priority; GitHub issue #230; triage amendments of 2026-09-08): replace the implementation-tail project recap with one dependable, agent-authored HTML recap plus browser-based visual verification. Keep the advanced Explainer Kit recipes available through their explicit workflow, but stop requiring adaptive portfolio planning, five injected provider seams (author, fact critic, browser session, visual critic, set planner), multi-artifact expansion, and publish/durability machinery for the ordinary lifecycle recap. The program-close recap (`program-recap`, the six required program sections) adopts the same single-artifact path. The operator asked on 2026-09-09 to run this as its own spec-driven project here, and to use it to produce the recap for the 2026-08-31 execution program (seven waves, all merged and archived; the program ledger records `recap: not run — pending` this item) once it lands.

## Clarifying Questions

### Question 1: Browser surface for visual verification

**Q:** Which browser surface verifies the rendered recap at narrow, medium, and wide widths?
**A:** The active agent's own browser capability first (for example Claude-in-Chrome or computer use) when present; otherwise the bundled Playwright/Chromium probe the kit already carries; otherwise browser-free checks with the outcome recorded as `built-needs-review`, per the 2026-09-08 decision that an authored artifact is never discarded.
**Decision:** "Available browser surface" is a three-rung ladder resolved at run time and recorded in the result; the host-agent rung is a new integration surface (no skill wires a browser tool into recaps today), the Playwright rung is the existing probe kept as-is.

### Question 2: Result record compatibility

**Q:** How does the new recap's result record relate to `explainer-kit.manifest/v1`, which the archive command hashes and re-verifies?
**A:** Keep the manifest contract exactly; only the outcome semantics change. (Superseded 2026-09-09 by the amendment below: the manifest moves to v2 because the durability fields lose their producer; see `spec.md` FR5.)
**Decision:** The archive validator and its recap tests stay untouched (superseded 2026-09-09 by operator decision: no backward compatibility is needed, so the archive package rule is replaced and its recap tests rewritten; see `design.md` § Overview); the terminal-outcome guard is rewritten so `generate` is satisfied only by a usable artifact, and `failed` is never a satisfied generation.

### Question 3: Where the mechanical parts live

**Q:** Do the deterministic parts (fact-bundle assembly from allowlisted artifacts, browser-free checks, result-record write, retry/skip decision) need a new CLI command?
**A:** No — the operator's concern is over-engineering; a CLI is acceptable only where it is clearly valuable.
**Decision:** No new CLI surface in this project. The archive-side validation already lives in the CLI and is unchanged, so a new command would add lockstep, docs, and test surface for logic only the skills invoke. The mechanical parts land as one small script set inside the OAT explainer adapter skill, tested by the skill's own test tier; promoting them to a command is a deferred idea if a second consumer ever appears.

## Solution Space

### Approach 1: Direct authoring on a kept contract _(Recommended)_

**Description:** The host agent that is already running the lifecycle authors the single HTML recap directly from an allowlisted fact bundle, then verifies it through the browser ladder; the kit's fact-base schema, freshness/dedup by input hashes, subject-bound claim checking, run identity, and the manifest contract are kept, while set planning, provider seams, expansion, and publish/durability leave the default path.
**When this is the right choice:** The consumer is a normally configured host with an agent in the loop, and the archive contract must not move.
**Tradeoffs:** Prose quality depends on the host agent, not a critic seam; visual verification quality depends on which rung of the browser ladder the host reaches.

### Approach 2: Simplify the kit in place

**Description:** Keep the kit's run orchestrator and make every seam optional with sensible defaults, so the default path degrades gracefully instead of being replaced.
**When this is the right choice:** If the advanced recipes and the default recap must share one code path.
**Tradeoffs:** Retains the five-seam surface area and its probe/skip machinery; the simplification the item asks for would be configuration, not removal.

### Approach 3: Static Markdown recap only

**Description:** Drop HTML and browser verification; the recap is the exported summary Markdown.
**When this is the right choice:** Never for this item — the acceptance criteria require a standalone, navigable HTML artifact verified visually.
**Tradeoffs:** Fails the item's core requirement.

### Chosen Direction

**Approach:** Approach 1.
**Rationale:** It removes exactly the machinery the item names, keeps exactly the contracts the triage says to keep, and matches how the wave program's own recap was produced in practice (an agent-authored hub with a fact base).
**User validated:** Yes — the three clarifying answers above (2026-09-09).

## Options Considered

### Option A: One skill owns both the project and the program recap

**Description:** The OAT explainer adapter skill exposes one generate flow with a recipe switch (project recap with its six narrative sections; program recap with its six program sections), and the completion, summary, wave-program, and wave-execute skills all call that one flow.
**Pros:** One implementation of the browser ladder, the checks, and the record; the duplicated program-recap caller in the two wave skills collapses to a reference.
**Cons:** The wave skills change in the same project.
**Chosen:** Yes.

### Option B: Separate project and program paths

**Description:** Project recap first; the program recap stays on the old caller until a later item.
**Pros:** Smaller first PR.
**Cons:** The triage amendment already put the program recap in scope, and the program's own recap is the first consumer this project must serve.
**Chosen:** No.

## Key Decisions

- **Direct agent authoring replaces the seam machinery on the default path** — the host agent authors one standalone HTML recap from an allowlisted fact bundle; the kit's author/critic/browser/visual-critic/set-planner seams, adaptive portfolio planning, multi-artifact expansion, and publish/durability are not required for the ordinary lifecycle recap and remain available only through the explicit advanced Explainer Kit workflow.
- **Keep the contracts the archive depends on** — the fact-base schema (canonical JSON, derived Markdown), freshness and dedup by project/recipe identity and input hashes, subject-bound claim checking, run identity and artifact/input hashes, and the manifest contract stay as they are; the terminal-outcome guard keeps its shape with rewritten semantics.
- **Browser ladder** — host browser tool, then the bundled Playwright probe, then browser-free checks recorded as `built-needs-review`; the authored artifact is never discarded.
- **No new CLI command** — the deterministic parts live in the skill with the skill's tests (operator decision 2026-09-09, to avoid over-engineering); promotion to a command is deferred until a second consumer needs it.
- **One generate flow for project and program recaps** — the program-close caller duplicated across the two wave skills collapses onto it; its run identity and outcome still land in the program ledger.
- **Generate/retry/skip semantics** — a `generate` decision is satisfied only by a usable artifact (visually verified, or usable-but-unverified with a recorded reason); a failure preserves a sanitized actionable cause and requires an explicit retry or skip, never a silent closeout warning.
- **Reconciliation is already done** — `BL-260902-make-autonomous-project-recap` shipped (wave 5) and its capability-probe skip contract is what this project's ladder replaces at the same lifecycle seams; `BL-260904-add-recap-seam-config-keys` is `wont_do`; no further backlog reconciliation is needed before implementation.

## Constraints

- The archive command's manifest validation and its existing recap tests must pass unchanged. (Superseded 2026-09-09 by operator decision: the manifest-key validation stays unchanged; the package rule and its tests are replaced.)
- The lifecycle consumers (completion gate and export path, summary outcome mapping, the two wave skills' program-close callers) hard-code today's outcome vocabulary and the generated/degraded/skipped mapping; they change together with the semantics, in one project.
- Bundled skill changes take one `metadata.version` bump per changed skill in the final PR and the lockstep public package bump; `pnpm test:skills`, `pnpm test:smoke`, `pnpm lint`, and `pnpm format` cover the skill tree.
- The advanced kit stays installed and its core-version parity smoke test must keep passing. (Amended 2026-09-09: the core stays installed and the parity smoke keeps passing; its callback orchestration is retired, see the amendment below.)
- Browser-less hosts must still complete the lifecycle: never block completion on a missing browser, never discard an authored artifact.
- Fact bundles are allowlisted from approved project artifacts only (summary, implementation record, orchestration log, plan, discovery/spec/design where present, the program artifact and wave summaries for the program recap); nothing outside the project or program record enters the bundle.
- Weaker-anywhere: nothing the archive or terminal-outcome guard rejects today becomes accepted unless enumerated in the design.

## Success Criteria

- A fresh, normally configured host produces one standalone, navigable HTML recap for a project without any custom provider module, and the archive command accepts and exports it.
- The recap is opened through the first available rung of the browser ladder and checked at representative narrow, medium, and wide widths, with artifact and screenshot paths retained in a small result record; on a browser-less host the browser-free checks run and the outcome is `built-needs-review` with the reason recorded.
- A `generate` decision is satisfied only when a usable visual artifact exists; generation failure surfaces a sanitized cause and an explicit retry-or-skip decision.
- Focused tests exercise the fresh-host success path and reproduction-grade negative controls for provider and browser failures, proving the failures stay visible while a valid accepted control still produces the recap.
- The program recap for the 2026-08-31 execution program is generated through the new path from the reconciled program artifact and the seven wave records, with the six required program sections, and its run identity and outcome are recorded in the program ledger.
- The completion, summary, wave-program, and wave-execute skills route on the new semantics; no lifecycle skill references a retired seam.

## Out of Scope

- Removing or rewriting the advanced Explainer Kit core, its recipes, publish/durability machinery, or its golden-conformance tests; they remain the explicit advanced workflow. (Superseded 2026-09-09 by the amendment below: the core's callback orchestration, provider seams, and the tests that exercise them are retired in this project; publish/durability and the retained libraries stay.)
- A new CLI command for recap generation (deferred idea).
- Publishing recaps to S3 or any external surface.
- Changing the fact-base schema or the manifest contract.
- The recon rework (`BL-260908-restore-recon-s-cheap-fan-out`), which runs as its own project.

## Deferred Ideas

- Promote the deterministic recap steps to an `oat project recap` command if a second consumer (for example a CI job or a non-agent host) needs them.
- A visual-diff baseline for recap screenshots across runs.
- Retiring the capability-probe skip vocabulary from the lifecycle contract once every consumer routes on the new ladder. (Pulled into scope 2026-09-09 by the amendment below.)

## Open Questions

- Fact-bundle allowlist: exactly which artifacts, in which order of precedence, and how claims are bound to subject/value for the cohesion check (design).
- The browser-ladder rung detection: how the host advertises its browser tool to a skill, and what evidence each rung records (design).
- Outcome-vocabulary migration: whether `built-durable`/`built-not-durable` survive for the default path or collapse to `built` plus `built-needs-review` and `failed` (design; the manifest enum stays).
- Retry/skip persistence: where the explicit retry-or-skip decision is recorded so a resumed completion honors it (design).
- Program-recap section sourcing for aggregate numbers across seven waves (design).

## Assumptions

- The kit's fact-base schema and cohesion checker can be reused as libraries by the new flow without pulling in the set planner.
- The archive command's manifest validation is the only CLI-side coupling; no CLI code change is required when the manifest is kept. (Superseded 2026-09-09: the package rule in `archive-utils.ts` and `package-coverage.mjs` changes in lockstep; `spec.md` § Assumptions carries the corrected list.)
- The host agents in use (Claude Code with a browser MCP, Cursor, Codex) can each reach at least one rung of the browser ladder.

## Risks

- Prose quality without a critic seam: mitigated by subject-bound claim checking and the required-section checks.
- Browser-ladder detection is a new integration surface with host-specific behavior; the browser-less path must be proven first so nothing depends on the top rung.
- Outcome-semantics drift across four consumer skills: mitigated by changing them in one project with a shared contract test.
- The program recap is the first real consumer; its fact bundle spans seven archived wrappers whose records live in the archive tree and S3 export.

## Next Steps

- Design: the fact-bundle allowlist, the browser ladder and its evidence, the rewritten outcome semantics, the retry/skip record, and the single generate flow with its two recipes.

## Amendment (2026-09-09): one project, agent-authored explainers for every caller

**Trigger.** While dispositioning the adapter's advanced path during design round 2, the operator and the author established that the path nobody can run is not a use case: both the core (`explainer-kit`) and the adapter (`oat-explainer-kit`) require the caller to supply JavaScript provider callbacks or module paths (author, critic, set planner, browser session, visual critic), an agent following prose cannot supply one, no configuration on any host names a module, and the only things that have ever satisfied those seams are test fixtures. The five real runs on this repository (2026-07-21 to 2026-08-27) all predate the seams. The project explainer at plan time has three recorded decisions, all `skip`, and no run. The kit was intended as a port of the operator's `personal-explainer-kit`, in which the agent is the author.

**Operator decision.** One project rather than a recap project plus a follow-up: "we should just verify this all as one project"; the recap and the plan explainer are "only half of this".

**Amended goal.** The Explainer Kit works again for every caller because the host agent authors the artifact: the project recap at completion, the program recap at program close, the project explainer at plan approval, and a person invoking the core skill on any inputs (an OAT project, a directory or list of documents, or a supplied fact base). One flow, selected by recipe, with the browser ladder and browser-free checks of the original scope.

**Amended non-goals.** The "advanced kit stays untouched" constraint is dropped. The core's callback orchestration (its run orchestrator, the set planner, content approval, visual review, terminal evidence, the provider-seam contracts and the tests that exercise them) and the adapter's callback path (its run orchestrator, callback references, and seam probe) are retired. Retained: the fact-base schema and the manifest contract (at v2), the QA and browser libraries, theme resolution, the recipes' floors and briefs, and the authoring shells. Also retired (operator decision, later on 2026-09-09): the durability/S3-publish path and `built-durable`; the archive export is the durable copy. Still out of scope: a new CLI command, publishing recaps anywhere new, schema changes, the recon rework.

**Amended success criteria.** In addition to the original list: a person runs the core skill on a directory of documents on a fresh host and gets one verified page; the plan skill's project explainer produces a run through the flow; zero references to the retired seams remain anywhere in the repository, and the retained libraries keep their tests.

**Sequencing.** The program recap for the 2026-08-31 execution program stays the last phase.
