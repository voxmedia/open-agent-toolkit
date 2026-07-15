---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
---

# Specification: cursor-cloud-autonomous-projects

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not design/implementation details.

- Avoid concrete deliverables (specific scripts, file paths, function names).
- Keep the "High-Level Design" section to architecture shape and component boundaries only.
- If a design detail comes up, record it under **Open Questions** for `oat-project-design`.

## Problem Statement

Cloud agents given OAT work today either stall on human-in-the-loop gates or improvise the workflow. The bruno-modernization-roadmap run demonstrated the failure mode concretely: the `oat` CLI was missing from the environment, no autonomy contract defined how interactive gates should resolve unattended, and the agent "approximated" an OAT project — following artifact shapes without CLI bookkeeping, state management, or gated reviews.

Cursor Cloud environments compound the problem. They are provisioned from shared per-stack base images and are typically multi-repo, with drifted copies of OAT skills hoisted from every workspace root, no user-level OAT configuration, no documented skill precedence, and no installed harness CLIs. An agent landing in one of these environments has no reliable bearings for where projects live, which skill copy to trust, or how to run reviews.

Two usage scenarios must work end-to-end. First, resume-and-run: a user completes discovery, design, and planning locally, approves the plan, and hands the project to a cloud agent to execute implementation through documentation, summary, and final PR without further approval. Second, goal-to-PR: a user provides only a goal, and the agent runs the entire lifecycle — discovery, design, plan, gated reviews, implementation, documentation, summary, final PR — autonomously, stopping only for blockers that genuinely require human judgment, credentials, or repository-policy approval.

The solution must keep OAT's public artifacts org-agnostic while allowing org-specific mechanisms (like Vox's internal docs MCP) to bind at runtime, and must leave no persisted autonomy state behind — a project run autonomously must be locally resumable with zero cleanup.

## Goals

### Primary Goals

- A cloud agent can execute a full OAT project lifecycle from a bare goal to a final PR autonomously, as a real OAT project (CLI-created artifacts, state bookkeeping, gated reviews), pausing only at defined autonomy boundaries.
- A locally planned and approved project can be handed to a cloud environment and executed to completion without further human approval.
- Interactive (non-autonomous) OAT sessions in cloud environments work with correct orientation: project-home resolution, skill precedence, CLI availability.
- Every artifact phase in an autonomous run receives independent review — cross-family whenever the environment permits — with degradation explicitly logged.

### Secondary Goals

- A continuous improvement loop: execution learnings captured during autonomous runs are synthesized into durable, version-controlled recommendations.
- Autonomous runs can research integrated systems and adjacent repositories beyond the working repo (via org-layer tooling when available).
- Single-repo cloud environments are validated as a supported configuration.

## Non-Goals

- Graphite CLI / stacked-PR tooling integration (including post-merge restack return trips) — separate skill/backlog candidate.
- Cross-repo skills-freshness automation (keeping repo-checked-in OAT skills current) — owned separately by the operator.
- Per-skill provider targeting in `oat sync` — description-gating suffices for Cursor-specific skills in other providers' views.
- Orientation skills for non-Cursor cloud harnesses (Codex cloud, Claude VMs) — the provider-agnostic autonomous skill leaves room for future siblings.
- Changes to repository squash-merge policies.

## Requirements

### Functional Requirements

**FR1: Autonomy Policy Layer**

- **Description:** Define a single autonomy contract: when autonomy is active for a session, every human-in-the-loop gate across the OAT lifecycle skills has a defined non-interactive behavior. The policy is session-scoped and is never persisted into project state as a mode.
- **Acceptance Criteria:**
  - A documented inventory maps every interactive prompt in the lifecycle skills (git-preflight, requirements gate, design-mode choice, HiLL confirmation, Tier-1 dispatch approval, review disposition, pr-final "proceed anyway", document approval, etc.) to its autonomous behavior.
  - Each mapped gate resolves without user input when autonomy is active, or is classified as a hard stop (autonomy boundary).
  - No lifecycle skill writes an autonomy mode into `state.md` or any persisted project artifact; artifacts may record execution provenance for audit.
  - The policy mechanism composes with (or extends) existing `OAT_NON_INTERACTIVE` plumbing rather than forking it.
- **Priority:** P0

**FR2: Autonomous Orchestrator Skill (`oat-project-autonomous`)**

- **Description:** A provider-agnostic, explicitly invoked skill that activates the autonomy policy, resolves the project's current state, enters the lifecycle at the right phase, and chains it to completion — including the tail (documentation, summary, final PR) — stopping only at defined autonomy boundaries.
- **Acceptance Criteria:**
  - Given an active project with an approved plan, the skill enters at implementation and drives through documentation, summary, and final PR — riding implement's `oat_post_implement_sequence` closeout (pre-approval steps → final HiLL → post-approval steps) rather than orchestrator-owned tail chaining; the orchestrator ensures the sequence is configured/resolved and the autonomy policy handles the final HiLL approval per FR6.
  - Given a bare goal, the skill runs discovery, design (when warranted), planning, gated reviews, implementation, and the same closeout-driven lifecycle tail.
  - The skill invokes existing lifecycle skills rather than re-describing their processes (thin orchestrator; no lifecycle fork).
  - Autonomy boundaries are explicit: missing credentials without offline equivalent, product-judgment ambiguity, destructive-change risk, unresolved Critical review findings, repository-policy approval requirements.
  - Works identically local and cloud; contains no Cursor-specific or org-specific mechanisms (those bind via harness/org-layer skills).
  - On session restart mid-run, resuming autonomy requires deliberate re-invocation; the skill correctly resumes from persisted project state.
- **Priority:** P0

**FR3: Autonomous Review Contract**

- **Description:** Autonomous runs obtain independent review after discovery, design, and plan artifacts, cross-family preferred. Review routing is a **pre-launch route-selection policy** executed through the dispatch substrate (`oat-dispatch-subagents` / `oat-project-dispatch-subagents`), never a runtime fallback chain; the final code review remains blocking.
- **Acceptance Criteria:**
  - Route selection happens **before launch**, from catalog/availability evidence: configured `oat gate` route when a harness CLI target is available; otherwise a policy-resolved subagent pinned to a different model family (own family identified deterministically from run metadata, never from model self-report); a same-family route is selected only when no second family is dispatchable, chosen explicitly and recorded with its selection reason and achieved independence level (context independence retained; family independence lost).
  - Accepted launches are terminal: post-accept failures follow the dispatch engine's recovery rules (bounded retry with the identical payload, then blocked) — never a silent downgrade to a cheaper route.
  - Blocking reviews (the final code review; any gate configured to block) fail closed to a boundary stop when no adequate route exists; non-blocking artifact reviews may proceed on a recorded degraded route.
  - The contract is stated mechanism-agnostically in the autonomous skill; harness-specific mechanics live in the harness-layer skill, deferring to the dispatch substrate's provider references.
  - Unresolved Critical findings block progression (autonomy boundary); Important findings follow the configured gate policy.
  - Review provenance uses the dispatch record schema (configured-invocation evidence authoritative; runtime identity non-authoritative), referenced from project artifacts.
- **Priority:** P0

**FR4: Gate Hooks for Discovery and Design Skills**

- **Description:** `oat-project-discover` and `oat-project-design` support end-of-skill configured gates (via `workflow.gates.skills`), matching the existing plan/quick-start/implement gate pattern.
- **Acceptance Criteria:**
  - A gate configured for either skill runs at skill exit with the standard `onFailure: block|prompt|warn` contract.
  - Absent configuration, behavior is unchanged.
- **Priority:** P1

**FR5: Broadened Quick-Start Exit Gate**

- **Description:** The quick-start exit gate's review scope covers the full artifact bundle (discovery + lightweight design + plan) rather than the plan alone.
- **Acceptance Criteria:**
  - The gate review prompt/scope explicitly includes discovery assumptions and lightweight design decisions when those artifacts exist.
  - Existing plan-only gate configurations continue to work.
- **Priority:** P1

**FR6: Non-Interactive HiLL Resolution**

- **Description:** Autonomous runs resolve the HiLL checkpoint confirmation without user input by taking the existing final-checkpoint default path explicitly; existing semantics are preserved (absent = unconfirmed, `[]` = every phase, explicit list = those phases).
- **Acceptance Criteria:**
  - When autonomy is active and `oat_plan_hill_phases` is unconfirmed, the run writes the explicit final-phase value with auto-review enabled (mirroring `workflow.hillCheckpointDefault: final`).
  - At an autonomous HiLL checkpoint, the auto-review runs and is received without pausing for a human; interactively, the same persisted value pauses as it does today (take-back-over safe).
  - The final HiLL approval is handled at its shipped location — implement's Final HiLL Closeout Sequence, between `oat_post_implement_sequence` pre-approval and post-approval steps — where autonomy auto-approves after a passing auto-review (a failed blocking review remains a boundary stop).
  - `[]` and absent semantics are unchanged; workflow documentation clarifies them to prevent `[]`-means-none misconfiguration.
- **Priority:** P0

**FR7: Cursor Cloud Orientation Skill (`oat-cursor-cloud-projects`)**

- **Description:** A Cursor-specific, org-agnostic skill that orients any agent running OAT work in a Cursor Cloud environment; auto-surfaced when OAT comes up in cloud contexts, for interactive and autonomous sessions alike.
- **Acceptance Criteria:**
  - Detects cloud context deterministically from environment markers and run metadata.
  - Provides project-home resolution guidance for multi-repo workspaces (projects live in the target repo's `.oat/`, never at workspace/user level; cross-repo work anchors in a primary repo).
  - Declares the skill-precedence rule (user-scope installed copy over drifted repo copies) and the CLI-availability contract (install/verify `oat`; never manually approximate artifacts).
  - Raises awareness of the autonomous skill and of org-layer context skills without hard-depending on them.
  - Canonical in the OAT repo, included in the npm bundle allowlist, synced normally to provider views; contains no org-specific names or endpoints.
  - Works in single-repo cloud environments without multi-repo assumptions.
- **Priority:** P0

**FR8: Environment Provisioning**

- **Description:** The shared cloud base environment installs and configures everything an OAT run needs: latest CLI, user-level packs/skills, seeded user-level configuration, authenticated harness CLI for gate execution, and (where needed) repo-local config overrides for cloud-specific behavior.
- **Acceptance Criteria:**
  - Fresh environments have the latest published OAT CLI on PATH and OAT packs installed at user level.
  - User-level config is seeded with a dispatch ladder and gate execution targets; gate targets degrade gracefully via availability probes when harness CLIs are absent.
  - `cursor-agent` is installed and authenticates headlessly via a Cloud Agents secret.
  - Shared config keys of each target repo are audited for cloud fitness; repo-local overrides are seeded only where needed and are explicitly documented (S3 archive sync remains enabled — cloud AWS credentials for the archive bucket are an operator-provisioned dependency).
  - Setup is idempotent and self-sufficient on a fresh VM (no OAT repo checkout required).
- **Priority:** P0

**FR9: External-Integration Research Mandate**

- **Description:** When running autonomously, the agent extensively researches integrated systems, services, and repositories outside the working repo before planning, using the best available internal documentation/search tooling; the requirement is mechanism-agnostic with org-layer binding.
- **Acceptance Criteria:**
  - The autonomous skill's evidence-gathering step states the requirement without naming org-specific tools.
  - When an org-layer docs/search skill is discoverable, it supplies the mechanism; when none exists, the gap is logged in the learnings file and the run proceeds on checked-out sources.
- **Priority:** P1

**FR10: Internal Docs MCP Skill (org layer)**

- **Description:** A skill-only Cursor plugin (in the pntr repo) teaching agents when and how to use the vox-docs MCP: index-coverage checks before reliance, semantic search usage, and when to prefer local checkout.
- **Acceptance Criteria:**
  - The skill instructs a coverage check (indexed-library listing) before trusting search results and defines fallback behavior when the server is unattached, unreachable, or lacks coverage.
  - The plugin bundles no MCP server config (the team-level server already exists; no duplicate definition).
  - Distributed via the team marketplace; installation mode chosen deliberately (operator step).
- **Priority:** P1

**FR11: Execution Learnings Log**

- **Description:** Autonomous runs maintain an append-only execution-learnings artifact in the project, categorized for later synthesis (gotchas, efficiencies, documentation gaps, skill/instruction candidates, environment issues).
- **Acceptance Criteria:**
  - The autonomous skill creates the log at run start and appends dated, categorized entries during execution.
  - Entries capture environment-limited verifications and degraded fallbacks explicitly.
- **Priority:** P1

**FR12: PR Topology Defaults**

- **Description:** Autonomous runs produce a single PR by default; stacked PRs only on explicit user request, with first-class plan support.
- **Acceptance Criteria:**
  - Default behavior yields one PR per project.
  - When a stack is requested, the plan carries a Stacked PR Strategy section (stack name, branch, base branch, dependency order, fan-in rule).
  - Parallel-group declarations verify both write-set independence and base-branch readiness.
- **Priority:** P1

**FR13: Mode Selection as Rigor Selector**

- **Description:** In autonomous runs, the quick-vs-spec-driven choice is made by the agent, framed explicitly as required pre-implementation review density.
- **Acceptance Criteria:**
  - The autonomous skill documents the decision rule: per-artifact independent review needed → spec-driven; single bundled pre-implementation review sufficient → quick.
  - The chosen mode and rationale are recorded in project artifacts.
- **Priority:** P1

**FR14: Learnings Synthesis (Continuous Improvement Loop)**

- **Description:** At end of run, execution learnings are synthesized into a durable "Autonomous Execution Learnings" recommendations section in the project summary — agent-instruction updates, cloud-environment improvements, code follow-ups, and workflow issues operating above the project level.
- **Acceptance Criteria:**
  - The summary-generation flow conditionally includes the section when an execution-learnings artifact exists (inert for normal projects; org-agnostic).
  - Recommendations are categorized and actionable; the synthesis survives project archiving via the version-controlled summary export.
  - Both summary entry paths (standalone summary and final-PR generation) produce the section.
- **Priority:** P1

### Non-Functional Requirements

**NFR1: Org-Agnostic OAT Layer**

- **Description:** OAT-shipped artifacts contain no org-specific names, endpoints, or infrastructure references; the three-layer architecture (OAT → harness → org) binds mechanisms at runtime via skill discovery.
- **Acceptance Criteria:**
  - No Vox-specific identifiers appear in any artifact shipped in the public npm bundle.
  - Removing the org layer degrades gracefully (generic requirements still executable with logged gaps).
- **Priority:** P0

**NFR2: Zero-Cleanup Takeover**

- **Description:** A project run (fully or partially) autonomously is locally resumable with no autonomy state to undo.
- **Acceptance Criteria:**
  - After any autonomous session ends, project artifacts contain no active-mode flags; a fresh interactive session behaves interactively, including pausing at persisted HiLL checkpoints.
- **Priority:** P0

**NFR3: No-Stall Guarantee**

- **Description:** Autonomous runs never wait indefinitely on user input; every stop is an explicit, reported blocker.
- **Acceptance Criteria:**
  - Every interactive prompt reachable during an autonomous run has a policy resolution or is a defined autonomy boundary that reports its blocker and stops cleanly.
  - A stall (waiting on input without a reported blocker) is classified as a defect.
- **Priority:** P0

**NFR4: Graceful Degradation**

- **Description:** Missing harness CLIs, MCP servers, or secrets produce logged fallbacks rather than aborts wherever a fallback exists.
- **Acceptance Criteria:**
  - Review dispatch, external research, and gate execution each define a degradation ladder with explicit logging.
  - Aborts occur only when no fallback preserves the run's integrity guarantees (e.g., final blocking review cannot run at all).
- **Priority:** P1

**NFR5: Single-Repo Environment Support**

- **Description:** Orientation and provisioning function in single-repo cloud environments without multi-repo assumptions.
- **Acceptance Criteria:**
  - Setup instructions cover single-repo environments; orientation content resolves project home correctly when only one repo exists.
  - An explicit validation pass runs in a single-repo environment before the project completes.
- **Priority:** P1

## Constraints

- Cursor Cloud environments start with no `oat`, `cursor-agent`, `codex`, or `claude` on PATH (verified empirically); Node 22 + npm/pnpm and `gh` are present. Setup must be self-sufficient.
- Cloud detection signals available: `CURSOR_AGENT=1`, `CURSOR_CONVERSATION_ID` (`bc-` prefix), `AWS_PROFILE=cursor-cloud-agent`, `HOSTNAME=cursor`; the `cursor-cloud` MCP provides run/environment metadata including the exact model slug.
- Cursor skill discovery merges all workspace roots with no documented precedence; same-name cross-root collisions are a confirmed platform bug. Distribution must not depend on platform-level precedence.
- `oat` CLI config/artifact resolution is repo-rooted; user-level config supplies only cross-repo defaults.
- Bundled npm assets are the only supported skill-delivery path to environments without an OAT checkout.
- Autonomous runs cannot ask mid-task questions; every interactive gate needs a defined autonomous behavior or an explicit stop condition.
- Existing HiLL semantics (`[]` = every phase; absent = unconfirmed) must be preserved for existing projects.
- OAT is published publicly; org-specific content cannot ship in it (NFR1).
- Public-package release policy: skill/bundle changes require lockstep version bumps across the five public packages and `pnpm release:validate`.

## Dependencies

- `@open-agent-toolkit/cli` npm publishing pipeline (bundled assets are the distribution vehicle).
- `cursor-agent` CLI + `CURSOR_API_KEY` Cloud Agents secret (headless gate execution).
- `cursor-cloud` MCP server (deterministic run/model metadata in cloud sessions).
- vox-docs Team MCP server (auto-attached via marketplace Default On — verified live; org layer only).
- Cloud AWS profile with S3 access to the archive bucket (operator-provisioned) for archive-on-complete sync.
- `cloud-agent-env-node` shared base image and sibling per-stack env repos (consume the same OAT-side installer).
- pntr repo plugin infrastructure (`plugins/` multi-plugin layout) and team marketplace publication (operator step).
- Cursor platform behaviors: subagent dispatch with explicit model slugs spanning families; team-marketplace plugin skill loading in cloud VMs (verified for a public plugin; team-plugin verification pending).

## High-Level Design (Proposed)

The design follows a three-layer architecture. The OAT layer (public, org-agnostic) gains an autonomy policy that gives every interactive gate a defined non-interactive resolution, plus a thin orchestrator skill that activates the policy, detects project state, and chains existing lifecycle skills from the correct entry phase through the lifecycle tail. The harness layer is a Cursor-specific orientation skill supplying cloud detection, multi-repo bearings, skill precedence, and deterministic review-dispatch mechanics. The org layer (team-distributed, allowed to name infrastructure) supplies org-specific research tooling. Skill discovery binds the layers at runtime; each lower layer degrades gracefully when the layer above it is absent.

Environment provisioning moves OAT from "sometimes checked in" to "always present": the shared base image installs the latest CLI globally, materializes packs at user scope, seeds user-level dispatch/gate configuration, and authenticates a harness CLI for gate execution. Project artifacts remain repo-rooted in the target repository.

Review integrity in autonomous mode comes from a layered review contract (configured gates → cross-family pinned subagents → logged degraded review) applied after each artifact phase, with mode selection itself framed as choosing review density. A continuous improvement loop (append-only learnings log synthesized into the version-controlled project summary) makes each autonomous run improve the next.

**Key Components:**

- Autonomy policy layer — gate-behavior contract across lifecycle skills (OAT core).
- `oat-project-autonomous` — thin state-detecting orchestrator skill (OAT core).
- `oat-cursor-cloud-projects` — Cursor Cloud orientation skill (OAT core, harness layer).
- Lifecycle skill amendments — gate hooks (discover/design), broadened quick-start gate, non-interactive HiLL resolution, summary learnings synthesis.
- Environment setup — CLI/pack/config/harness provisioning in the shared base image (env repo).
- `internal-docs-mcp` — skill-only plugin in pntr (org layer).

**Alternatives Considered:**

- Standalone self-contained autonomous skill — rejected: forks the lifecycle; recreates the "approximates OAT" failure mode.
- Policy layer only, no orchestrator — rejected: nobody owns entry-state resolution or the lifecycle tail.
- Persisted autonomy mode in project state — rejected: contaminates take-back-over; session-scoped policy chosen.
- Org-specific research baked into OAT skills — rejected: OAT ships publicly; three-layer binding chosen.
- Skill distribution via env-repo vendoring or repo-sync only — rejected: per-stack replication drift / uneven adoption; npm-bundle + user-scope install chosen.

_Design-related open questions are tracked in the [Open Questions](#open-questions) section below._

## Success Metrics

- A goal-to-PR autonomous run completes on a real repository with zero unplanned human interventions (stops only at defined autonomy boundaries, if any).
- A resume-and-run handoff (locally approved plan) reaches final PR with zero human interventions.
- 100% of artifact phases in autonomous runs carry recorded independent review provenance; cross-family review achieved whenever the environment provides two families.
- Fresh cloud environments pass an OAT readiness check (CLI on PATH, packs installed, config seeded, harness CLI authenticated) on first boot.
- Zero persisted-autonomy defects: post-run artifact inspection finds no active-mode state; local takeover requires no cleanup.
- Autonomous-run summaries include a synthesized recommendations section whenever a learnings log exists.

## Requirement Index

| ID   | Description                                                | Priority | Verification                                                    | Planned Tasks                                                          |
| ---- | ---------------------------------------------------------- | -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| FR1  | Autonomy policy: every gate has a non-interactive behavior | P0       | manual: gate-inventory walkthrough + autonomous dry run         | p01-t01, p01-t02, p01-t03, p01-t04, p01-t05                            |
| FR2  | State-detecting autonomous orchestrator skill              | P0       | e2e: goal-to-PR and resume-and-run cloud runs                   | p02-t02, p06-t03, p06-t04                                              |
| FR3  | Layered cross-family review contract                       | P0       | integration: dispatch resolution per tier; manual: provenance   | p02-t02, p02-t03, p02-t08, p06-t05                                     |
| FR4  | Gate hooks for discover/design skills                      | P1       | manual: configured-gate exercise at skill exit                  | p01-t03, p06-t06                                                       |
| FR5  | Quick-start gate covers artifact bundle                    | P1       | manual: gate prompt scope inspection on quick project           | p01-t04, p06-t06                                                       |
| FR6  | Non-interactive HiLL resolution (final + auto-review)      | P0       | manual: autonomous run writes explicit value; interactive pause | p01-t02, p01-t06, p06-t05                                              |
| FR7  | Cursor Cloud orientation skill                             | P0       | e2e: fresh multi-repo + single-repo cloud sessions              | p02-t03, p02-t05, p06-t01, p06-t02                                     |
| FR8  | Environment provisioning (CLI, packs, config, harness)     | P0       | e2e: fresh-VM readiness check                                   | p02-t04, p02-t07, p03-t02, p04-t01, p04-t02, p04-t03, p04-t04, p06-t06 |
| FR9  | External-integration research mandate (mechanism-agnostic) | P1       | manual: autonomous evidence-gathering with/without org layer    | p02-t02, p06-t04, p06-t06                                              |
| FR10 | internal-docs-mcp skill-only plugin (org layer)            | P1       | manual: coverage-check + fallback behavior in cloud session     | p05-t01, p05-t02, p06-t06                                              |
| FR11 | Append-only execution learnings log                        | P1       | manual: log presence/categorization after autonomous run        | p02-t02, p06-t04                                                       |
| FR12 | Single-PR default; first-class stacked support             | P1       | manual: plan inspection for default and stacked cases           | p02-t02, p06-t06                                                       |
| FR13 | Mode selection framed as review density                    | P1       | manual: autonomous mode-choice rationale in artifacts           | p02-t02, p06-t04                                                       |
| FR14 | Learnings synthesis into project summary                   | P1       | integration: summary generation with/without learnings file     | p01-t05, p06-t06, p06-t07                                              |
| NFR1 | Org-agnostic OAT layer                                     | P0       | manual: bundle audit for org identifiers                        | p02-t03, p06-t07                                                       |
| NFR2 | Zero-cleanup local takeover                                | P0       | manual: post-autonomous-run artifact inspection + local resume  | p02-t02, p06-t03                                                       |
| NFR3 | No-stall guarantee                                         | P0       | e2e: autonomous runs monitored for input-waits without blockers | p01-t01, p06-t03, p06-t04                                              |
| NFR4 | Graceful degradation ladders with logging                  | P1       | integration: simulated missing CLI/MCP/secret scenarios         | p02-t02, p04-t02, p04-t04, p06-t06                                     |
| NFR5 | Single-repo environment support                            | P1       | e2e: single-repo cloud environment validation pass              | p02-t03, p06-t02                                                       |

**Notes:**

- ID: Unique requirement identifier (FR# for functional, NFR# for non-functional)
- Description: Brief 1-sentence summary of the requirement
- Priority: P0 (must have) / P1 (should have) / P2 (nice to have)
- Verification: How this will be verified — format is `method: pointer`
- Planned Tasks: Filled in during planning phase to ensure traceability

## Open Questions

- **Autonomy flag mechanism:** Extend `OAT_NON_INTERACTIVE` semantics vs. a distinct autonomy signal (non-interactive picks safe defaults; autonomous also chains lifecycle phases). Design decides the mechanism and its interaction with existing plumbing.
- **Gate coverage inventory:** The exact per-skill list of interactive prompts and their autonomous resolutions (FR1's inventory) is design work.
- **Pack membership:** Does `oat-cursor-cloud-projects` join the workflows pack, a new cloud pack, or install independently? Affects what single-repo environments install.
- **Seeded user config content:** Which packs install by default at user level; exact dispatch ladder and gate execTargets shape for cloud (user's personal config is the reference).
- **Cloud config override set:** Which repo-local overrides (if any) each target repo needs after the shared-config audit.
- **Quick-start bundle gate wording:** Gate config scope vs. review-prompt phrasing for the broadened bundle review.
- **`cursor-agent` provisioning details:** Image-build vs. startup auth flow; behavior when the secret is absent.
- **Learnings log format:** Category taxonomy and entry shape optimized for FR14 synthesis (Bruno log categories as seed).
- **Plugin verification:** Confirm team-marketplace plugin skills load in cloud VMs; choose installation mode.

## Assumptions

- The published npm package remains the skill-distribution vehicle and stays current with the OAT repo.
- Cursor Cloud agents honor home-directory skill locations (`~/.agents/skills/`) — demonstrated for plugin cache; user-scope loading must be verified early in implementation.
- `cursor-cloud` MCP tools remain available for deterministic identity/environment resolution.
- Native subagent dispatch with explicit model slugs spanning at least two families remains available in Cursor Cloud sessions.
- `CURSOR_API_KEY` can be provisioned via Cloud Agents secrets for headless `cursor-agent` auth.
- The cloud AWS profile can be granted S3 access to the archive bucket (operator).

## Risks

- **User-scope skills not loaded in cloud:** Cursor may not consult `~/.agents/skills/` in cloud VMs (undocumented).
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Verify empirically first; fallbacks: instruction-level absolute-path reads in the orientation skill, or plugin-based distribution (plugin cache demonstrably loads).
- **Autonomy contract gaps:** A missed interactive prompt stalls an unattended run indefinitely.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** FR1's exhaustive gate inventory; learnings-log capture on every stall; stalls classified as defects (NFR3).
- **Skill-name collisions / drifted repo copies:** Platform bug can hide same-name skills; drifted copies mislead agents.
  - **Likelihood:** Medium-High
  - **Impact:** Medium
  - **Mitigation:** Unique names for new skills; instruction-level precedence + path-based reads; operator freshness automation (out of scope) reduces drift.
- **Cross-family review unavailable:** Single-family environments or missing harness auth reduce review independence.
  - **Likelihood:** Low-Medium
  - **Impact:** Medium
  - **Mitigation:** Layered resolution with explicit degraded logging; availability probes; final review remains blocking.
- **Lifecycle-skill churn:** Touching many skills for the policy layer risks regressions in interactive behavior.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Policy resolutions strictly additive (active only under autonomy); skill validation suite; interactive paths unchanged by default.

## References

- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Bruno execution learnings: bruno repo, `.oat/projects/shared/bruno-modernization-roadmap/oat-execution-learnings.md` (includes draft `oat-project-autonomous` skill)
- Dispatch/gate reference shape: user's personal `~/.oat/config.json` (captured in brainstorm transcript)
