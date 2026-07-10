---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
---

# Discovery: cursor-cloud-autonomous-projects

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Enable OAT projects to run end-to-end in Cursor Cloud environments. Cloud environments are provisioned from a shared base (`cloud-agent-env-node` and stack siblings: shared Dockerfile + `environment.json`) and are typically multi-repo. A prior cloud run (bruno-modernization-roadmap) **approximated** an OAT project instead of running one: the `oat` CLI was missing, there was no autonomy contract for human-in-the-loop gates, and orchestration was improvised. That run produced an append-only `oat-execution-learnings.md` and a draft `oat-project-autonomous` skill that seed this project's requirements.

Two usage scenarios must work:

1. **Resume-and-run:** discovery/design/plan were completed and approved locally; the cloud agent executes implementation through documentation, summary, and final PR without further approval.
2. **Goal-to-PR:** the user provides only a goal/prompt; the agent runs the full lifecycle (discovery → design → plan → gated self-review → implement → document → summarize → final PR) autonomously, stopping only for true blockers (missing credentials, product-judgment ambiguity, destructive-change risk, unresolved Critical review findings, repo-policy approval).

Requested outcomes:

- Cloud environment setup that installs the OAT CLI and materializes OAT configuration and skills at user level.
- A Cursor Cloud orientation skill that gives any agent its bearings for running OAT projects in these environments.
- An autonomous execution capability (`oat-project-autonomous`) that removes human-in-the-loop pauses unless intervention is genuinely required.

## Clarifying Questions

### Question 1: Autonomy expression

**Q:** Should "autonomous" be a new standalone skill, a mode existing skills obey, or a hybrid?
**A:** An autonomy policy layer is needed for sure; both scenarios (resume-and-run, goal-to-PR) must work; hybrid discussed and accepted.
**Decision:** Autonomy policy layer + a single thin orchestrator skill (see Chosen Direction).

### Question 2: Where autonomy policy lives

**Q:** Session-scoped runtime flag, persisted project frontmatter, or hybrid?
**A:** Session-scoped flag; "can't think of any reason not to do A." Taking a project back over locally must not require un-setting anything.
**Decision:** Autonomy is a session/runtime property, never persisted as a project mode in `state.md`. Artifacts record provenance (e.g., "phase executed autonomously") for audit, but provenance is not policy. Resuming autonomy after a session restart is a deliberate re-invocation.

### Question 3: Cloud vs. autonomous

**Q:** Is the cloud skill the autonomous skill?
**A:** No — orthogonal axes. Interactive OAT sessions in cloud environments are a valid use case; autonomous runs work locally too ("don't stop" runs already work well locally).
**Decision:** Two skills: a Cursor Cloud orientation skill (bearings; auto-invoked when OAT comes up in a cloud environment; raises awareness of the autonomous skill) and a provider-agnostic autonomous orchestrator.

### Question 4: Cross-family review in cloud

**Q:** Gate reviews after discovery/design need cross-family models. `oat gate` requires harness CLIs; can cloud provide deterministic cross-family review?
**A:** Yes — verified empirically: the `cursor-cloud` MCP `run-info` call returns the exact model slug (`originalModelName`) for deterministic own-family identification, and native subagent dispatch accepts explicit model slugs spanning both families. User is fine installing `cursor-agent` + `CURSOR_API_KEY` in the base image as well.
**Decision:** Layered review contract (see Key Decisions #7); cloud installs `cursor-agent` so the gate CLI path is the normal tier.

### Question 5: Skill distribution and version drift

**Q:** Cloud workspaces hoist skills from all repos; copies drift (observed live: `oat-project-implement` at v2.0.20 / v2.0.27 / v2.0.33 across three repos in one workspace). Cursor has no documented precedence for same-name skills, and cross-root name collisions are a confirmed platform bug. Where do skills come from?
**A:** Latest CLI + latest skills installed at user level as part of environment setup; a separate automation will keep repo-checked-in skills fresh across repositories (out of scope here). Project artifacts still belong in the appropriate target repository.
**Decision:** Canonical skills in the OAT repo → bundled npm assets → user-scope install at environment setup. The orientation skill declares instruction-level precedence: read OAT skills from the user-scope copy when repo copies also exist.

### Question 6: Naming and placement of the orientation skill

**Q:** Generic (`cloud-agent-oat-projects`) or Cursor-specific? Env repo or OAT repo? `.cursor`-only stray or canonical?
**A:** Cursor-specific naming is honest — the load-bearing content (env detection markers, `run-info` identity, subagent model pinning, multi-root layout) is Cursor Cloud specific. Env repos are per-stack (node, python, …) so a skill there would be replicated and drift; OAT repo is right. Must also serve single-repo cloud environments via setup instructions.
**Decision:** `oat-cursor-cloud-projects` (Cursor-scoped name, `oat-` prefix, unique across repos), canonical in the OAT repo, added to the npm bundle — never a `.cursor`-only stray (strays are excluded from bundling, validation, and version-bump conventions).

## Solution Space

### Approach 1: Autonomy policy layer + thin state-detecting orchestrator _(Recommended)_

**Description:** Define a single autonomy contract with documented default answers for every existing human-in-the-loop gate. `oat-project-autonomous` is a thin orchestrator: it activates the policy, resolves current project state (approved plan → enter at implement; bare goal → full lifecycle), and chains existing lifecycle skills through documentation, summary, and final PR. Existing skills own their gates and consult the policy.
**When this is the right choice:** When both resume-and-run and goal-to-PR must work, and lifecycle behavior must not fork from the canonical skills.
**Tradeoffs:** Touches many skills to make each gate policy-aware; largest coordinated change surface.

### Approach 2: Standalone autonomous skill

**Description:** A self-contained skill re-describing the full lifecycle with pauses removed.
**When this is the right choice:** Fastest to ship; nothing else changes.
**Tradeoffs:** Forks the lifecycle — the exact "approximates OAT instead of running it" failure mode this project exists to fix, maintained in parallel forever.

### Approach 3: Policy layer only, no orchestrator skill

**Description:** Every skill honors `OAT_NON_INTERACTIVE`-style policy; the user chains skills by prompt.
**When this is the right choice:** Minimal delta.
**Tradeoffs:** Nobody owns the tail of the lifecycle (document → summary → final PR) or entry-state resolution; orchestration is improvised per run.

### Chosen Direction

**Approach:** Approach 1 (policy layer + thin orchestrator), sequenced pragmatically: reuse existing `OAT_NON_INTERACTIVE` plumbing where it exists and patch the gates that don't yet respect it.
**Rationale:** One source of truth for autonomy semantics; gates stay in the skills that own them; local semi-autonomous use benefits for free; the orchestrator owns exactly what nothing owns today (entry-state resolution and lifecycle tail-chaining).
**User validated:** Yes — explicitly, across brainstorm turns.

## Key Decisions

1. **Autonomy expression:** Policy layer + single state-detecting `oat-project-autonomous` orchestrator. Explicit opt-in (invoked deliberately), provider-agnostic, works locally and in cloud.
2. **Autonomy persistence:** Session-scoped runtime property; never written into `state.md` as a mode. No cleanup needed when a user takes a project back over locally. Provenance recorded in artifacts for audit only.
3. **Cloud/autonomous orthogonality:** `oat-cursor-cloud-projects` (orientation) and `oat-project-autonomous` (execution) are separate skills. Interactive OAT in cloud is a supported use case; the orientation skill raises awareness of the autonomous option.
4. **Distribution:** Canonical skills in the OAT repo, shipped via bundled npm assets; environment setup installs the latest CLI globally and installs packs at user level (all or most packs). The OAT repo does not need to be present in target environments. Skill-precedence: instruction-level rule (user-scope copy wins) because Cursor's platform precedence is undocumented and same-name collisions are a confirmed platform bug.
5. **Project home:** OAT project artifacts always live in the appropriate target repository (repo-rooted `.oat/`), never at workspace or user level. Multi-repo environments require a project-home resolution step; cross-repo projects live in the primary repo and reference sibling repos by workspace path.
6. **HiLL in autonomous mode:** Final-phase-only checkpoints with auto-triggered review and autonomous receive (no waiting on a human). Fix the footgun where an empty/null checkpoint list stops at every phase — autonomous mode must never be one config typo from stalling.
7. **Review contract (layered resolution):** The autonomous skill requires independent review after discovery, design, and plan — cross-family preferred — resolved in order: (a) configured `oat gate` when a harness CLI is available; (b) native subagent pinned to a different model family, own family identified deterministically from run metadata (`run-info` → `originalModelName`), never model self-report; (c) same-family subagent review, explicitly logged as degraded. Harness-specific mechanisms live in the orientation skill; the autonomous skill states the contract abstractly.
8. **Gates for discovery/design:** Add end-of-skill gate support to `oat-project-discover` and `oat-project-design` (independently valuable beyond this project; currently only plan/quick-start/implement gate).
9. **Mode selection = rigor selector:** In autonomous runs, the quick-vs-spec-driven judgment is explicitly framed as "how much independent review does this need before implementation?" Spec-driven → per-phase artifact gates; quick → one broadened bundle gate at quick-start exit covering discovery + lightweight design + plan (not plan alone).
10. **PR topology:** Single PR by default; stacked PRs only on user request, with the plan carrying a Stacked PR Strategy section (stack name, branch, base branch, dependency order, fan-in rule) and parallel groups verifying both write-set independence and base-branch readiness (per Bruno learnings).
11. **Environment provisioning:** Shared base image installs the OAT CLI, installs `cursor-agent` with `CURSOR_API_KEY` from secrets (gates degrade gracefully via existing `availabilityCommand` probes), and seeds user-level `~/.oat/config.json` with the dispatch ladder and gate configuration (user's existing user-level config is the reference shape). In Cursor Cloud environments, dispatch uses Cursor models only; the config's availability probes make the full ladder safe to seed.
12. **Learnings capture:** Autonomous cloud runs keep an append-only `oat-execution-learnings.md` per project (gotchas, efficiencies, missing setup, test-classification corrections, skill-improvement candidates), following the Bruno precedent.
13. **Skill placement/naming:** `oat-cursor-cloud-projects`, canonical in `.agents/skills/`, bundled, synced normally to all provider views (content self-gates via its Cursor-specific description); never a `.cursor`-only stray.
14. **Adjacent-repo context via VoxDocs MCP (scope addition, 2026-07-10):** Autonomous cloud agents must be able to research adjacent repositories they don't have checked out, using the VoxDocs MCP (hosted `docs-mcp-server`: documentation lookup + semantic/embeddings search across 80+ indexed libraries/codebases; tools include `search_docs`, `list_libraries`, `find_version`, `scrape_docs`, `fetch_url`, indexing-job management). Provisioning is **verified end-to-end**: `vox-docs` is a Team MCP server whose Default-marketplace linkage surfaces it as an installable plugin entry; with the entry's installation mode set to Default On, the server attached automatically — including propagating into an already-running cloud session mid-flight (verified live in this session: `serverStatus: ready`, `list_libraries` returned the full index) — with no credentials on the VM (HTTP MCP calls are backend-proxied). No manual `/add-plugin` step is needed. The `internal-docs-mcp` deliverable is a **skill-only Cursor plugin in the pntr repo** (`plugins/internal-docs-mcp/`, sibling to `plugins/pntr/`) teaching when and how to use vox-docs (coverage check via `list_libraries` first, search phrasing, when to prefer local checkout), wired into the autonomous skill's evidence-gathering step and the orientation skill's awareness list. It bundles no `mcp.json` — the team server already exists, and defining a duplicate would risk the documented delete-linked-server footgun.

## Constraints

- Cursor Cloud environments start with no `oat`, `cursor-agent`, `codex`, or `claude` on PATH (verified empirically); Node 22 + npm/pnpm and `gh` are present. Setup must be self-sufficient.
- Cloud detection signals available: `CURSOR_AGENT=1`, `CURSOR_CONVERSATION_ID` (`bc-` prefix), `AWS_PROFILE=cursor-cloud-agent`, `HOSTNAME=cursor`; `cursor-cloud` MCP provides `run-info`/`environment-info`.
- Cursor skill discovery merges all workspace roots with no documented precedence; same-name cross-root collisions are a confirmed platform bug (skills can vanish from invocation). Distribution design must not depend on platform-level precedence.
- `oat` CLI config/artifact resolution is repo-rooted; user-level config supplies only cross-repo defaults (dispatch ladder, gates, workflow preferences).
- Bundled npm assets are the only supported skill-delivery path to environments without an OAT checkout; anything outside `.agents/skills/` does not ship.
- Repos in a workspace may carry drifted OAT skill copies; this project cannot assume repo copies are current.
- Autonomous runs in Cursor Cloud cannot ask mid-task questions; every previously interactive gate needs a defined autonomous behavior or an explicit stop condition.
- Test/verification classification (offline vs live vs secret-bearing vs environment-limited) must be explicit; cloud runs typically lack production secrets.

## Success Criteria

- A cloud agent given "use `oat-project-autonomous` to <goal>" runs the full lifecycle — discovery through final PR — as a real OAT project (CLI-created artifacts, state bookkeeping, gates) with no manual approximation and no human pauses except defined autonomy boundaries.
- A project planned and approved locally can be handed to a cloud environment and executed to completion (implement → document → summarize → final PR) without further approval.
- Environment setup produces: latest `@open-agent-toolkit/cli` on PATH, user-level packs/skills installed, user-level config seeded (dispatch ladder + gates), `cursor-agent` authenticated.
- Every artifact phase in an autonomous run receives independent review, cross-family whenever the environment permits, with degradation explicitly logged.
- Interactive OAT sessions in cloud environments work with correct orientation (multi-repo project-home resolution, skill precedence, CLI availability).
- A project run autonomously can be taken back over locally with zero cleanup (no persisted autonomy state).
- Single-repo cloud environments are validated as a supported configuration.
- Cloud agents can query the VoxDocs MCP (docs + semantic code search over indexed codebases) during evidence gathering, and the `internal-docs-mcp` skill teaches its use.

## Out of Scope

- Graphite CLI / stacked-PR tooling integration (including "merged PR 1, restack" return trips) — separate skill/backlog candidate.
- Cross-repo skills-freshness automation (keeping repo-checked-in OAT skills current) — user is setting this up separately.
- Per-skill provider targeting in sync (would let Cursor-specific skills sync only to Cursor views) — YAGNI'd; description-gating suffices.
- Non-Cursor cloud harness orientation skills (Codex cloud, Claude VMs) — the provider-agnostic autonomous skill leaves room for future siblings.
- Changes to squash-merge repo policies.

## Deferred Ideas

- **Graphite-backed stacked PR skill** — valuable but orthogonal; squash-merge reconciliation pain exists independently of autonomy.
- **Per-skill provider targeting in `oat sync`** — revisit if Cursor-specific skills in non-Cursor provider views become noisy.
- **Platform-level skill precedence** — revisit if/when Cursor documents precedence or fixes the same-name collision bug; instruction-level precedence is the workaround.

## Open Questions

- **Pack membership:** Does `oat-cursor-cloud-projects` join the workflows pack, a new small cloud pack, or install independently? (Affects what single-repo environments install.)
- **Autonomy flag mechanism:** Extend `OAT_NON_INTERACTIVE` semantics vs. a distinct `OAT_AUTONOMOUS` flag (they differ: non-interactive picks safe defaults; autonomous also chains lifecycle phases). Design phase decides.
- **Gate coverage inventory:** Exact list of interactive prompts across lifecycle skills that need defined autonomous behaviors (requirements gate, design-mode choice, Tier-1 dispatch approval, pr-final "proceed anyway", dirty-tree preflights, etc.).
- **Seeded user config content:** Which packs install by default at user level; exact dispatch ladder / gate `execTargets` shape for cloud (user's personal config is the reference).
- **Quick-start bundle gate wording:** How the broadened artifact-bundle review is expressed in gate config vs. skill prompt.
- **Single-repo environment setup:** What the setup instructions look like for single-repo cloud environments (project-level config standing in for some user-level assumptions) — carry an explicit validation prompt through implementation.
- **HiLL footgun semantics:** Correct behavior for empty/null `oat_plan_hill_phases` after the fix (and migration for existing projects).
- **`cursor-agent` provisioning details:** Auth flow with `CURSOR_API_KEY` in image build vs. startup; failure behavior when the secret is absent.
- **VoxDocs unreachable behavior:** Auto-attachment via Default On is verified (attached mid-session in this run after the installation mode was flipped). Remaining: define skill behavior when the server is unreachable, unattached (e.g., non-team contexts), or returns no coverage for the queried repo.
- **Plugin distribution verification:** Confirm team-marketplace plugin skills reach cloud agent VMs (plugin-cache loading observed for a Cursor-public plugin this session; undocumented for team plugins). Choose installation mode for the skill-only `internal-docs-mcp` plugin. Lifecycle care for the auto-linked `vox-docs` marketplace entry: removing a marketplace plugin linked to a Team MCP server can delete the team server for cloud agents.
- **vox-docs index coverage:** `open-agent-toolkit` (and possibly other repos relevant to autonomous runs) is not yet indexed in vox-docs. Decide which repos must be indexed (via `scrape_docs` / indexing jobs) as part of this project vs. ongoing ownership of index freshness; the skill should teach a `list_libraries` coverage check before relying on search results.
- **`internal-docs-mcp` skill contract:** Trigger rules (when to reach for VoxDocs vs. local checkout), inputs (which indexes exist), and how the autonomous skill's evidence-gathering step references it without hard-depending on it (environments without the MCP must still run). Home: `plugins/internal-docs-mcp/` in the pntr repo (multi-plugin layout), keeping the pntr plugin's cloud-handoff scope clean.

## Assumptions

- The published `@open-agent-toolkit/cli` npm package remains the distribution vehicle for skills (bundled assets) and stays current with the OAT repo.
- Cursor Cloud agents honor home-directory skill locations (`~/.agents/skills/`) — plugin-cache loading from the VM home dir is demonstrated, but user-scope skill loading in cloud is undocumented; must be verified early in implementation.
- `cursor-cloud` MCP tools (`run-info`, `environment-info`) remain available to cloud agents for deterministic identity/environment resolution.
- Native subagent dispatch with explicit model slugs spanning at least two model families remains available in Cursor Cloud sessions.
- `CURSOR_API_KEY` can be provisioned via Cloud Agents secrets for `cursor-agent` headless auth.

## Risks

- **User-scope skills not loaded in cloud:** Cursor may not consult `~/.agents/skills/` in cloud VMs (undocumented).
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Verify empirically first; fallbacks include instruction-level "read skills from this absolute path" in the orientation skill (path reads always work), or plugin-based distribution (plugin cache demonstrably loads).
- **Skill-name collision bug:** Same-name skills across workspace roots can vanish from invocation.
  - **Likelihood:** High (drifted copies already present in real workspaces)
  - **Impact:** Medium
  - **Mitigation Ideas:** Unique names for new skills; instruction-level precedence + path-based reads for existing OAT skills; user's freshness automation reduces drift over time.
- **Autonomy contract gaps:** A missed interactive prompt stalls an unattended run indefinitely.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Design-phase gate-coverage inventory across all lifecycle skills; learnings-log capture on every stall; treat any stall as a defect.
- **Cross-family review unavailable:** Single-family environments (or missing `cursor-agent` auth) reduce review independence.
  - **Likelihood:** Low-Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Layered resolution with explicit degraded-mode logging; `availabilityCommand` probes; final review remains blocking regardless of family.
- **Drifted repo skills mislead agents:** An agent reads an old repo copy instead of the user-scope latest.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Orientation skill's precedence instruction; freshness automation (out of scope but complementary).

## Next Steps

Spec-driven mode: continue to `oat-project-design` (confirms requirements and produces both `spec.md` and `design.md`).

Additional context for design:

- Reference material: the Bruno run's `oat-execution-learnings.md` (in the bruno repo at `.oat/projects/shared/bruno-modernization-roadmap/`) including its draft `oat-project-autonomous` skill; the user's personal `~/.oat/config.json` (dispatch ladder + gate execTargets shape, captured in the brainstorm transcript).
- The `cloud-agent-env-node` repo (shared Dockerfile, `environment.json`, `install-repos.sh`) is the target for environment-setup changes and is present in this workspace; sibling per-stack env repos (e.g. python) consume the same OAT-side installer.
