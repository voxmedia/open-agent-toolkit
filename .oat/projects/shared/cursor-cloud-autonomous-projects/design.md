---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-07-11
oat_generated: false
---

# Design: cursor-cloud-autonomous-projects

## Overview

This project adds an autonomy capability to the OAT lifecycle without forking it, plus the provisioning and orientation needed to run OAT in Cursor Cloud environments. Confirmed approach (discovery, reaffirmed at design start): **autonomy policy layer + thin state-detecting orchestrator** — existing lifecycle skills keep owning their phases and gates and learn to consult a session-scoped autonomy policy; `oat-project-autonomous` owns only entry-state resolution and lifecycle chaining, layered pragmatically over existing `OAT_NON_INTERACTIVE` plumbing.

**Revision 2026-07-13:** aligned with the shipped dispatch substrate (`oat-dispatch-subagents` + `oat-project-dispatch-subagents`), the `oat-project-implement` restructure (reference files; `oat_post_implement_sequence` closeout; restored two-layer phase-agent topology after the coordinator experiment degraded wall-clock time — empirical validation of this design's thin-orchestrator principle), and the three-layer evidence model. The review contract is now framed as pre-launch route selection through the dispatch substrate; the lifecycle tail rides implement's post-implement sequencing.

## Architecture

### System Context

Four systems change: the OAT skill set (new skills + amendments to lifecycle skills), the OAT CLI (bundle manifest, workflow docs, and three bounded existing-code amendments — user-scope workflows install, user-first template resolution, Grok/xAI family classification; no new commands or engine subsystems), the shared cloud base environment (`cloud-agent-env-node`), and the pntr repo's plugin directory (org layer). The existing lifecycle skills remain the sole owners of their phases and gates; nothing re-implements their logic.

**Three-layer skill architecture** — layers bind at runtime via skill discovery and degrade independently:

- **OAT layer (public npm bundle, org-agnostic):** the autonomy policy contract, `oat-project-autonomous` (thin orchestrator), and lifecycle skill amendments (gate hooks, broadened quick-start gate, non-interactive HiLL resolution, summary learnings synthesis). States all requirements mechanism-agnostically.
- **Harness layer (OAT repo, Cursor-specific, org-agnostic):** `oat-cursor-cloud-projects` — cloud detection, multi-repo project-home resolution, skill precedence, CLI availability, and the Cursor-specific review-dispatch mechanics (run-metadata identity, pinned-slug subagents).
- **Org layer (team-distributed, may name infrastructure):** `internal-docs-mcp` in pntr — vox-docs usage. Absent in non-Vox contexts; its absence is logged, never fatal.

**Boundaries of this change:** no new CLI commands or engine subsystems. Three existing-code CLI amendments: (1) the workflows pack becomes installable at user scope with the **full asset set at user paths** — skills/agents to `~/.agents/`, templates to `~/.oat/templates/`, scripts to `~/.oat/scripts/` — because skills, templates, and scripts version together in one package release and user-canonical skills must not pair with stale repo companions; only the projects-root scaffolding stays project-only (today the pack rejects `--scope user` entirely); (2) `oat project new` gains **user-first template resolution** (user → repo → bundled assets; repo copies are never customized in this fleet, so a differing repo copy is only stale and the freshest tier wins) so scaffolding works in repos that never adopted OAT project-scope and never pairs new skills with stale templates, with artifacts still repo-rooted; (3) the provider-identity family classifier gains **Grok/xAI classification** so the seeded third-family gate target can participate in cross-family selection (today grok slugs classify `unknown` and same-family avoidance filters them out). The autonomy policy is a prose-level contract plus existing config/env plumbing (`OAT_NON_INTERACTIVE`, `workflow.hillCheckpointDefault`), not a new runtime. Environment provisioning is additive setup-script/Dockerfile work in the env repo. Existing interactive behavior is unchanged when autonomy is inactive.

### Component Diagram

```
User goal / approved project
        │
        ▼
oat-project-autonomous (OAT layer, orchestrator)
        │  activates session policy (OAT_AUTONOMOUS=1 → OAT_NON_INTERACTIVE=1)
        │  resolves entry phase from state.md / plan.md
        ▼
existing lifecycle skills ──consult──▶ autonomy policy (gate inventory)
  discover / design / plan /              │
  quick-start / implement /               ▼
  document / summary / pr-final    review contract (pre-launch route selection, one route per review):
        │                          gate CLI route | cross-family subagent route | recorded degraded route
        │                          (accepted launch = terminal; no fall-through between routes)
        │                                 ▲
        ▼                                 │ Cursor mechanics (run-info identity, pinned slugs)
project artifacts (repo-rooted)    oat-cursor-cloud-projects (harness layer)
  + oat-execution-learnings.md            ▲
        │                                 │ research mechanism binding
        ▼                          internal-docs-mcp (org layer, pntr plugin)
summary.md ◀── learnings synthesis
```

### Data Flow

Autonomous run: (1) user invokes `oat-project-autonomous` with a goal or existing project → (2) orchestrator activates session autonomy policy, resolves project state via CLI/`state.md` → (3) enters lifecycle at the correct phase, invoking existing skills, which consult the policy at each gate → (4) artifact phases exit through the review contract (one route selected pre-launch from catalog evidence: gate CLI, cross-family subagent, or recorded degraded; accepted launches terminal) → (5) implementation proceeds under existing implement-skill orchestration with explicit HiLL resolution → (6) lifecycle tail chains document → summary (learnings synthesis) → final PR → (7) learnings log travels with the project; summary export makes recommendations durable.

**Key interaction:** the orchestrator never bypasses a skill's own gate logic — it supplies the policy that the gate consults. That single principle keeps interactive and autonomous behavior from diverging over time.

## Component Design

### C1 — Autonomy Policy Layer (OAT core; prose contract + config plumbing)

- **Purpose:** Single source of truth for how every interactive gate resolves when a session runs autonomously.
- **Responsibilities:** Define the activation signal (session-scoped); maintain the gate inventory — a table mapping every interactive prompt across lifecycle skills to `auto-resolve: <behavior>` or `boundary: <stop condition>`; specify provenance recording (what each auto-resolved gate writes into artifacts).
- **Interface:** A documented contract section in OAT workflow docs plus per-skill prose amendments of the form "if autonomy is active → {behavior}". Activation via `OAT_AUTONOMOUS=1` (see API Design).
- **Dependencies:** Existing `OAT_NON_INTERACTIVE` handling, `workflow.hillCheckpointDefault`, gate config (`workflow.gates.skills`).
- **Design decisions:** Autonomy _implies_ non-interactive but is stronger (adds chaining + boundary semantics); the policy layer therefore _sets_ `OAT_NON_INTERACTIVE=1` and adds its own signal on top, so all existing non-interactive plumbing works unmodified. Gates the inventory classifies as boundaries (e.g., unresolved Critical findings) stop the run with a reported blocker rather than resolving silently.

### C2 — `oat-project-autonomous` (new OAT skill)

- **Purpose:** Thin orchestrator: activate policy, resolve entry state, chain lifecycle to completion.
- **Responsibilities:** Parse the goal/project argument; resolve project home (delegating to harness-layer guidance in cloud); detect entry phase from `state.md`/plan frontmatter (approved plan → implement; otherwise earliest incomplete phase; bare goal → create project); choose quick vs. spec-driven via the review-density rule (FR13); enforce the external-research mandate (FR9); create/maintain the learnings log (FR11); invoke lifecycle skills in order, with the tail (document → summary → pr-final) riding implement's `oat_post_implement_sequence` closeout rather than orchestrator-owned chaining (the orchestrator ensures the sequence is configured and the policy auto-approves the final HiLL per FR6); stop at boundaries with a structured blocker report. The orchestrator adds **no** orchestration layer over implement's phase-agent topology (the coordinator experiment's wall-clock regression is the documented anti-pattern).
- **Interface:** Invoked by name with `<goal | project-slug | ticket-ref>`; emits phase-by-phase progress and a final run report.
- **Dependencies:** All lifecycle skills; the policy layer; `oat` CLI presence (hard requirement — if missing, instruct installation, never approximate artifacts).
- **Design decisions:** Never re-describes lifecycle process (anti-fork guarantee); reads each skill's SKILL.md and executes it with policy active. Resume-after-restart requires deliberate re-invocation (NFR2).

### C3 — `oat-cursor-cloud-projects` (new OAT skill, harness layer)

- **Purpose:** Orient any OAT work in Cursor Cloud environments.
- **Responsibilities:** Deterministic cloud detection (env markers + `cursor-cloud` MCP); project-home resolution for multi-repo/single-repo workspaces; asset-precedence rule — user scope always wins for all asset classes (user tier is boot-time `@latest`; repo copies are never customized, only stale), with per-skill frontmatter semver comparison as verification rather than arbitration: user ≥ repo is the expected invariant, and a higher repo copy is an environment anomaly — the user copy remains the execution source; log the anomaly and flag the user tier for refresh before continuing when freshness is safety-critical (the comparison never switches the source); CLI availability check + install path; supply the **cloud-specific** review-dispatch context that C1/C2 reference abstractly — deterministic family identity from run metadata (`run-info` → `originalModelName`) and the **per-surface catalog rule** (each dispatch surface — Cursor Cloud native Task, IDE native, CLI subagent enum, CLI full model list — carries its own curated, differently-named subset; verified 2026-07-13: cloud native has `sol-xhigh` but not `sol-max`, the CLI subagent enum the reverse. Never assume cross-surface availability; snapshot the current surface's catalog at dispatch time, and note that CLI provisioning adds a differently-shaped surface so both routes together reach the union) — while deferring dispatch _mechanics_ to `oat-dispatch-subagents/references/provider-cursor.md` rather than restating them; surface awareness of `oat-project-autonomous` and org-layer context skills.
- **Interface:** Auto-surfaced via description triggers ("OAT" + cloud context); also explicitly invocable.
- **Dependencies:** `cursor-cloud` MCP (graceful without); env markers; installed user-scope skills.
- **Design decisions:** Cursor-specific content is honest and contained here (NFR1 keeps it org-clean, not harness-clean); name is unique across all repos (collision-bug immunity).

### C4 — Lifecycle skill amendments (existing OAT skills)

- `oat-project-discover`, `oat-project-design`: end-of-skill configured-gate hook (same contract as plan/quick-start/implement — FR4).
- `oat-project-quick-start`: exit-gate review scope widened to the artifact bundle (FR5).
- `oat-project-implement` (post-restructure targets): non-interactive HiLL resolution in `references/plan-and-resume.md` — when autonomy is active and checkpoints are unconfirmed, take the existing `hillCheckpointDefault: final` path (explicit write + auto-review) and auto-receive at checkpoints (FR6); final HiLL auto-approval in `references/completion-and-closeout.md` (Final HiLL Closeout Sequence, between `oat_post_implement_sequence` pre/post-approval steps); subagent-dispatch authorization resolves per the gate inventory (dispatch mechanics themselves are owned by the dispatch substrate, not amended).
- `oat-project-summary` (+ summary template): conditional "Autonomous Execution Learnings" section synthesized from the learnings file when present (FR14).
- Remaining interactive prompts across skills: policy-aware per the C1 inventory (requirements gate, design-mode, dirty-tree preflights, document approval, pr-final "proceed anyway" → boundary when final review failed).
- **Design decision:** every amendment is strictly additive and inert when autonomy is inactive.

### C5 — Environment provisioning (`cloud-agent-env-node`)

- **Purpose:** Fresh VMs are OAT-ready without an OAT checkout.
- **Responsibilities:** Install latest `@open-agent-toolkit/cli` globally; install packs at user scope; seed `~/.oat/config.json` (dispatch ladder + gate execTargets with availability probes); install `cursor-agent` + headless auth from the `CURSOR_API_KEY` secret; run the per-repo shared-config audit and seed documented local overrides where needed; idempotent re-runs.
- **Interface:** Dockerfile + install script steps; a readiness check (CLI on PATH, packs present, config resolves, harness authenticates) usable as a boot-time assertion and as FR8's verification.
- **Dependencies:** npm registry, Cloud Agents secrets, sibling env repos consuming the same steps.
- **Design decisions:** Seed content derives from the operator's reference config, pruned of nothing — availability probes make the full ladder safe everywhere.

### C6 — `internal-docs-mcp` (pntr, `plugins/internal-docs-mcp/`, org layer)

- **Purpose:** Teach agents to research adjacent Vox systems via vox-docs.
- **Responsibilities:** Trigger on external-integration research needs; coverage check (`list_libraries`) before reliance; search usage; fallback definition (unattached/unreachable/no coverage → log and proceed on checked-out sources).
- **Interface:** Skill-only plugin; no bundled MCP config (team server exists).
- **Dependencies:** vox-docs Team MCP attachment (Default On, verified); team marketplace publication (operator).
- **Design decisions:** Kept out of the pntr plugin proper (sibling plugin, clean scopes); org names allowed here by design.

### Skill authoring conventions (cross-cutting)

All new skills follow `create-agnostic-skill` patterns; the two `oat-*` skills additionally follow `create-oat-skill`:

- **Routing-first descriptions** using the `Use when [trigger]. [Disambiguation].` formula, single-line ≤500 chars, trigger keywords front-loaded (this is what makes C3's auto-surfacing and C6's research-time binding work).
- **Progressive disclosure:** SKILL.md bodies stay under ~500 lines/5k tokens; depth goes to `references/`. Concretely: C2's gate inventory (the FR1 mapping table) ships as a `references/` file in `oat-project-autonomous`, loaded when needed rather than always; C3's Cursor mechanics details likewise.
- **Delegation capability model** (probe → authorize once → lock tier → fail closed): C2 adopts the documented Step 0.5 pattern for its review-subagent dispatch, with the autonomy policy supplying the "authorize once" answer per the FR1 inventory instead of a mid-run prompt.
- **Frontmatter contract:** `name` = directory, `version: 1.0.0` start, semver bumps per PR (repo rule), Claude-specific fields layered safely.
- **OAT specialization** for C2/C3: mode assertion (blocked/allowed activities + self-correction), separator progress banners, `{PROJECTS_ROOT}`/local-config active-project resolution, and `pnpm oat:validate-skills` as a completion gate.
- **Bundled references:** any shared doc a distributed skill needs is vendored via the documented symlink pattern so it travels with the npm bundle.

C6 (non-`oat-*`, org layer) follows the agnostic baseline only, keeping it free of OAT-monorepo-specific machinery.

## Data Models

No databases or domain entities — the "data models" here are configuration schemas, frontmatter contracts, and document formats, all extending existing shapes.

### Autonomy activation signal (session-scoped, never persisted)

Environment-variable pair: the policy sets `OAT_NON_INTERACTIVE=1` (existing semantics: pick safe defaults) plus `OAT_AUTONOMOUS=1` (autonomy marker). No new config-file keys required for activation; consumed by skill prose, not CLI code.

### Gate inventory entry (reference doc in `oat-project-autonomous`)

`skill | prompt/gate | interactive behavior | autonomous resolution | classification (auto-resolve | boundary) | provenance note`. This table _is_ FR1's acceptance surface.

### Plan frontmatter (existing keys, no schema change)

`oat_plan_hill_phases` (absent = unconfirmed, `[]` = every phase, `["pNN"]` = listed) and `oat_auto_review_at_hill_checkpoints` — autonomous runs write explicit values (`["<final-phase-id>"]`, `true`) through the existing `hillCheckpointDefault: final` path. Stacked-PR requests add the plan's `Stacked PR Strategy` section (stack name, branch, base, dependency order, fan-in rule) — a document format, not frontmatter.

### Execution learnings log (`oat-execution-learnings.md`, project-local)

Append-only, dated entries: `timestamp - category - title` + `Observation / Impact / Recommendation` body. Category taxonomy (seeded from the Bruno log): `gotcha`, `efficiency`, `documentation-gap`, `candidate-skill-content`, `decision`, `environment-limited`. Frontmatter marks it `oat_generated: false`, append-only. This taxonomy is the input contract for FR14 synthesis.

### Summary section (conditional)

`## Autonomous Execution Learnings` in `summary.md` — categorized recommendations (agent-instruction updates, cloud-environment improvements, code follow-ups, workflow issues), each with a one-line rationale and pointer back to the source log entry.

### Seeded user config (`~/.oat/config.json`)

Existing `OatConfig` schema, no new keys — `workflow.dispatchCeiling.providers.*` (ladder), `workflow.gates.execTargets` (with `availabilityCommand` probes), `workflow.gates.skills`, `workflow.hillCheckpointDefault: final`. Cloud-specific repo-local overrides use the existing `.oat/config.local.json` layer, enumerated per repo by the FR8 audit.

### Review provenance record

Provenance uses the shipped dispatch record schema (`oat-dispatch-subagents/references/record-schema.md`): route/selection fields (`selection_source`, `selection_reason`, catalog snapshot), launch status, and configured-invocation evidence (authoritative) with runtime identity as a separate non-authoritative layer. Project artifacts (`reviews/` files, plan review table) reference these records rather than defining a parallel provenance format; the achieved independence level (cross-family vs same-family/context-only) is recorded per review.

## API Design

No HTTP APIs — the public surfaces are skill invocation contracts, one environment-variable contract, and existing config schema usage.

### Autonomy signal

A distinct `OAT_AUTONOMOUS=1` that **implies and sets** `OAT_NON_INTERACTIVE=1`. Rationale: the two must not be conflated — `OAT_NON_INTERACTIVE=1` today means "pick safe defaults instead of prompting" and is used by CI-style single-skill runs; autonomy additionally means "chain lifecycle phases and apply boundary semantics." Overloading the existing variable would give every current non-interactive consumer chaining behavior it never asked for. With the pair, existing plumbing works unmodified, and autonomy-specific prose keys off `OAT_AUTONOMOUS`. The orchestrator sets both for its session; nothing persists either.

### Skill invocation contracts

- `oat-project-autonomous <goal | project-slug | ticket-ref>` — `disable-model-invocation: true` (explicit opt-in only, per FR2); argument optional when an active project exists. Emits phase progress and a structured final run report (phases executed, reviews + provenance, PRs, boundaries hit, learnings count).
- `oat-cursor-cloud-projects` — model-invocable (its purpose is auto-surfacing on "OAT + cloud context" triggers); no arguments; also user-invocable for explicit orientation.
- `internal-docs-mcp` — model-invocable, triggered by external-integration research phrasing; no arguments.

### Config schema usage (no new keys)

`workflow.gates.skills` gains entries keyed `oat-project-discover` and `oat-project-design` (existing schema; skills gain the hook that reads them — FR4). Quick-start's gate entry stays schema-identical; the broadened bundle scope is expressed in the gate command's review prompt/scope wording (FR5), preserving existing configs.

### Environment readiness interface (FR8)

The install script ends with a readiness assertion — `oat` on PATH + version, packs present at user scope, `oat config dump` resolves the seeded ladder, `cursor-agent --version` + auth probe. Exposed as a re-runnable script step so the same check serves boot-time assertion, FR8 verification, and troubleshooting. No new `oat` CLI command (`oat doctor` integration noted as a deferred idea).

### Error/exit conventions

Boundary stops from the orchestrator produce a structured blocker report (what stopped, why it's a boundary, what the operator must do) rather than exit-code semantics — it's a skill, not a CLI command; CLI pieces keep existing `CliError` exit-code rules.

## Security Considerations

### Authentication

All credentials are Cloud Agents secrets injected as env vars: `CURSOR_API_KEY` (headless `cursor-agent`), the existing `GITHUB_PACKAGES_TOKEN` pattern (reference-only writes to `~/.npmrc`, value never persisted — the env repo's established idiom, reused for any new secret), and the AWS profile for archive sync. The setup script follows the reference-interpolation pattern: no secret values written to disk, images, or committed files. vox-docs auth never enters the VM (HTTP MCP calls are backend-proxied) — a property the design relies on and documents.

### Authorization

Autonomy widens _workflow_ authority, not _destructive_ authority: the FR1 inventory classifies destructive-change risks (data deletion, canonical generated sources, active API surfaces, force-push/history rewrites) as boundaries, never auto-resolves. Repository-policy approvals (protected branches/scopes) always stop the run. Commits and PRs follow existing branch-policy conventions; the orchestrator never merges.

### Data Protection

The learnings log and run reports are committed artifacts — the autonomous skill's prose forbids echoing secret values, tokens, or signed URLs into them (redact to variable names). Provenance records name models and mechanisms, not credentials.

### Threat Mitigation

- **Supply chain:** setup installs `@open-agent-toolkit/cli@latest` from the public registry at image build (auditable layer), not silently at runtime; Node pinned. Plugin distribution rides the team marketplace's existing trust model.
- **Public-bundle leakage (NFR1):** the org boundary is a security boundary — no internal endpoints, index names, or infrastructure identifiers in OAT-layer artifacts; the NFR1 bundle audit doubles as the leak check.

## Performance Considerations

### Scalability

No latency-critical runtime paths — the relevant dimensions are context economy, model spend, and environment boot time.

### Context economy

Skills are always-scanned metadata plus on-trigger bodies, so the new skills obey the progressive-disclosure budget: bodies under ~500 lines, heavy tables (gate inventory, Cursor mechanics) in `references/` loaded on demand. `oat-cursor-cloud-projects` is model-invocable and will surface often in cloud sessions — its body stays lean and defers to references aggressively.

### Model spend

Autonomous runs multiply subagent dispatches (reviews per artifact phase, implement-phase workers). Spend is governed by the existing dispatch-ceiling machinery — the seeded ladder plus per-project `oat_dispatch_policy` caps — not by new mechanisms. Cross-family review pins to the highest tier the ladder allows, once per artifact phase; degraded tiers are cheaper, never more expensive. The run report's review-provenance list doubles as a spend audit trail.

### Resource Limits

- **Environment boot:** CLI + pack install lands in the image build layer where possible (cached across runs), not per-boot; the install script's re-run path is idempotent and skips satisfied steps. The readiness check is a few sub-second probes.
- **Long-run behavior:** goal-to-PR runs are long by design; the orchestrator's phase-progress output and bookkeeping commits at phase boundaries keep partial progress durable and resumable, and the orchestrator **pushes the working branch at every phase boundary** so a killed VM loses at most in-phase work, nothing committed-and-pushed.

## Error Handling

### Error Categories

1. **Boundary stops (expected, clean).** Missing credentials without offline equivalent, product-judgment ambiguity, destructive-change risk, unresolved Critical review findings, repo-policy approvals. The orchestrator stops with a structured blocker report — what stopped, why it's a boundary, exact operator action — and leaves the project resumable (state committed and pushed).
2. **Degradations (recorded, run continues).** Degradation is a **pre-launch route selection**, never a post-accept fallback: review dispatch selects the best available route from catalog evidence (gate CLI route → policy-resolved cross-family subagent → explicitly selected same-family route with recorded achieved independence level); external research (org tooling → checked-out sources, gap logged); gate execution (missing harness → next `availabilityCommand`-passing target). Accepted launches are terminal — post-accept failures follow the dispatch engine's recovery (bounded identical-payload retry, then blocked). Every degraded selection produces a dispatch-record entry plus a categorized learnings-log entry — degradations are visible, never silent.
3. **Hard failures (abort with report).** The final blocking code review being unrunnable by _any_ tier; `oat` CLI installation failure (never approximate artifacts manually — the anti-Bruno rule); unrecoverable git state.
4. **Stalls (defects, NFR3).** Any wait-on-input without a reported blocker is a bug in the FR1 inventory, not acceptable behavior; when detected (e.g., an unmapped prompt fires), the run treats it as a boundary stop and logs the inventory gap as a `candidate-skill-content` learning.

### Retry Logic

Reuse, not invention: git pushes retry with exponential backoff per cloud conventions; gate reviews honor configured `maxAttempts` before their `onFailure` action; commit failures (hooks, signing) surface verbatim and block dependent steps — no success-assuming messages after a failed commit. Resume-after-restart uses the implement skill's existing bookkeeping-drift repair rules; the orchestrator never invents its own state repair.

**Setup errors (FR8):** missing secrets degrade specifically — absent `CURSOR_API_KEY` installs `cursor-agent` unauthenticated and logs that gate tier 1 is unavailable (review contract still functions via tier 2); npm registry failure fails the build loudly rather than producing a half-provisioned image.

### Logging

Skills route through their normal progress output; the learnings log is the durable record for anything a future run should know.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification         | Key Scenarios                                                                                                                                                                |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | manual               | Gate-inventory walkthrough: every interactive prompt in every lifecycle skill has a row; autonomous dry run hits no unmapped prompt                                          |
| FR2  | e2e                  | Goal-to-PR run on a real repo; resume-and-run from a locally approved plan; boundary stop produces structured blocker report; restart resumes correctly                      |
| FR3  | integration + manual | Each ladder tier exercised: gate CLI present, gate absent → cross-family subagent (family from run metadata), single family → logged degraded; provenance recorded per phase |
| FR4  | manual               | Configured gate fires at discover/design exit with block/prompt/warn honored; unconfigured → unchanged behavior                                                              |
| FR5  | manual               | Quick project's exit gate prompt demonstrably covers discovery + lightweight design + plan; legacy plan-only config still passes                                             |
| FR6  | manual               | Autonomous run writes explicit `["<final-id>"]` + auto-review; same plan resumed interactively pauses at that checkpoint                                                     |
| FR7  | e2e                  | Fresh multi-repo session: orientation surfaces on OAT mention, resolves project home, applies precedence rule; single-repo session ditto                                     |
| FR8  | e2e                  | Fresh-VM readiness check passes (CLI, packs, config resolution, harness auth); re-run idempotence                                                                            |
| FR9  | manual               | Evidence-gathering with org layer present (uses it) and absent (logs gap, proceeds)                                                                                          |
| FR10 | manual               | Coverage check precedes reliance; unattached/unreachable/no-coverage fallbacks behave as specified                                                                           |
| FR11 | manual               | Log exists post-run with dated, categorized entries incl. degradations and environment-limited checks                                                                        |
| FR12 | manual               | Default run yields one PR; stack-requested plan carries Stacked PR Strategy; parallel groups list base-readiness                                                             |
| FR13 | manual               | Mode-choice rationale recorded framed as review density                                                                                                                      |
| FR14 | integration          | Summary generation with learnings file (section present, categorized) and without (inert); both summary entry paths                                                          |
| NFR1 | manual               | Bundle audit greps shipped assets for org identifiers — zero hits                                                                                                            |
| NFR2 | manual               | Post-autonomous artifact inspection: no mode flags; local resume behaves interactively                                                                                       |
| NFR3 | e2e                  | Autonomous runs monitored: zero input-waits without blocker reports                                                                                                          |
| NFR4 | integration          | Simulated missing CLI/MCP/secret: documented fallback + log entry each                                                                                                       |
| NFR5 | e2e                  | Full validation pass in a single-repo cloud environment                                                                                                                      |

### Unit Tests

Vitest per repo conventions: the CLI's existing `bundle-consistency.test.ts` extends to the new skills (skill-manifest ↔ `bundle-assets.sh` sync); any config/doc code touched keeps its colocated tests green.

### Static Validation

`pnpm oat:validate-skills` for all `oat-*` skills (frontmatter contract, mode assertion, structure); `pnpm release:validate` for the lockstep public-package bump.

### Integration Tests

FR3 dispatch resolution and FR14 summary synthesis, runnable without full cloud runs.

### E2E Tests

The real acceptance surface: scripted cloud validation runs — fresh multi-repo, fresh single-repo, goal-to-PR, resume-and-run — each doubling as dogfooding that feeds the learnings log. Environment-limited checks are recorded as such, never claimed as passed.

## Deployment Strategy

Rollout order is dependency-driven:

1. **OAT repo ships first.** New skills + amendments land via the normal release path: lockstep version bump across the five public packages, `pnpm release:validate`, npm publish. `bundle-assets.sh` allowlist + skill-manifest gain the two new skills; `oat sync` regenerates provider views. Once published, the skills are installable everywhere — nothing else depends on unreleased state.
2. **Env repo consumes the release.** `cloud-agent-env-node` PR adds the install/seed/auth steps pinned to `@latest`; merging publishes a new environment version through the existing Cursor dashboard flow. Sibling per-stack env repos adopt the same steps afterward (documented as a copyable block; their PRs are follow-ups, not blockers).
3. **pntr plugin publishes last** (operator: marketplace + installation mode) — org layer is optional by design, so nothing upstream waits on it.

**Rollback:** each layer rolls back independently — env image rebuilds from the prior commit/environment version; npm consumers can pin a previous CLI version; plugin uninstalls cleanly (skill-only, no linked-server risk). No data migrations anywhere.

**Configuration:** seeded user config ships inside the env setup (versioned in the env repo); operator secrets (`CURSOR_API_KEY`, S3 credentials) are dashboard-side and independent of deploys.

**Monitoring:** the boot readiness check is the deploy health signal for FR8; early autonomous runs' learnings logs + run reports are the qualitative monitor for everything else — regressions surface as logged degradations/boundary stops rather than silent failures.

## Migration Plan

No database or data migrations. Compatibility is preserved by construction, with three notes:

- **Existing projects:** HiLL semantics unchanged (`[]`, absent, explicit lists all behave as today), plan/state frontmatter schemas untouched — in-flight projects are unaffected and need no updates.
- **Existing configs:** current `workflow.gates.skills` entries and plan-only quick-start gate configs keep working; new gate keys are additive. Existing `OAT_NON_INTERACTIVE` consumers see no behavior change (autonomy is a new, separate signal).
- **Existing environments and repos:** already-provisioned cloud environments pick the changes up on their next environment-version rebuild; repos carrying older checked-in OAT skill copies need nothing — the orientation skill's precedence rule handles drift until the operator's freshness automation lands.

Rollback requires no reverse migration at any layer.

## Implementation Phases

1. **Phase 1 — Autonomy contract + core skill amendments (OAT repo).** Goal: FR1's gate inventory authored; lifecycle skills policy-aware (requirements gate, design mode, HiLL resolution, Tier-1 dispatch, document/pr-final prompts); FR4 gate hooks; FR5 bundle gate; FR14 summary synthesis. Verification: inventory walkthrough, `oat:validate-skills`, interactive behavior unchanged.
2. **Phase 2 — New OAT skills + user-scope asset distribution.** Goal: both skills authored per the skill authoring conventions (`create-agnostic-skill` baseline + `create-oat-skill` specialization); workflows pack installable at user scope with the full asset set incl. update/removal; user-first template resolution in project scaffolding; bundle allowlist + skill-manifest updated, synced. Verification: `oat:validate-skills`, bundle-consistency test, installer/scaffold unit tests, `release:validate`.
3. **Phase 3 — OAT release.** Goal: lockstep bump, npm publish. Verification: fresh `npm i -g` shows new skills in pack install.
4. **Phase 4 — Environment provisioning (`cloud-agent-env-node`).** Goal: install/seed/auth steps + config audit + readiness check. Verification: fresh-VM readiness pass, idempotent re-run. (Depends on Phase 3; needs operator secrets.)
5. **Phase 5 — Org layer (pntr `internal-docs-mcp` plugin).** Goal: skill-only plugin authored. Verification: cloud-session coverage-check behavior. (Independent of Phases 1–4; operator publishes.)
6. **Phase 6 — End-to-end validation + docs.** Goal: the four e2e scenarios (multi-repo fresh, single-repo, goal-to-PR, resume-and-run), OAT docs updates (autonomy contract, cloud guidance), learnings captured. Verification: FR2/FR7/NFR3/NFR5 scenarios pass.

Phase boundaries each end committed and pushed; Phases 4–5 are cross-repo work executed from this multi-repo environment with PRs in their own repos.

## Risks and Mitigation

| Risk                                                                                                                 | Prob.    | Impact  | Mitigation                                                                                                                                                       | Contingency                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Direct cloud auto-surfacing of user-scope skills (`~/.agents/skills/`) remains unverified after the 2026-07-13 probe | Medium   | High    | Probe confirmed OAT CLI discovery, but this run could not refresh or verify model auto-surfacing; absolute-path-primary loading was activated for dependent work | Continue canonical absolute-path reads; re-probe on a fresh Phase 4 VM and retain plugin distribution as a fallback channel |
| Autonomy contract gap → unmapped prompt stalls an unattended run                                                     | Medium   | High    | FR1 exhaustive inventory; stall-as-defect handling logs the gap and stops cleanly                                                                                | Inventory patch + rerun; learnings entry prevents recurrence                                                                |
| Same-name skill collisions / drifted repo copies mislead agents                                                      | Med-High | Medium  | Unique names for new skills; instruction-level precedence; path-based reads                                                                                      | Operator freshness automation (out of scope) shrinks drift over time                                                        |
| Cross-family review unavailable (single family / no harness auth)                                                    | Low-Med  | Medium  | Layered ladder with explicit degraded logging; availability probes                                                                                               | Final review still blocking; provenance shows degradation for later re-review                                               |
| Regressions to interactive behavior from policy amendments across many skills                                        | Medium   | Medium  | Strictly additive prose (inert without `OAT_AUTONOMOUS`); skill validation; interactive-path spot checks in Phase 1 verification                                 | Per-skill revert is cheap (prose changes, semver-tracked)                                                                   |
| Model-spend overrun on long goal-to-PR runs                                                                          | Medium   | Low-Med | Existing dispatch ceiling/policy caps; provenance doubles as spend audit                                                                                         | Lower project `oat_dispatch_policy`; boundary-stop and resume under adjusted policy                                         |
| Undocumented platform behaviors we rely on change (team-MCP attachment, plugin skill loading, subagent model slugs)  | Low-Med  | Medium  | Each dependency has a verified-today note + fallback in design; readiness check catches env-level breakage early                                                 | Re-verify on failure; escalate to Cursor; fall back per ladder                                                              |
| Operator-dependency stalls (secrets, S3 grant, indexing, marketplace)                                                | Medium   | Low-Med | Operator Action Items checklist in discovery; phases sequenced so agent work never hard-blocks on them                                                           | Affected verification marked environment-limited; completed when operator items land                                        |

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Skill authoring contracts: `.agents/skills/create-agnostic-skill/SKILL.md`, `.agents/skills/create-oat-skill/SKILL.md`
- Bruno execution learnings (reference material): bruno repo, `.oat/projects/shared/bruno-modernization-roadmap/oat-execution-learnings.md`
