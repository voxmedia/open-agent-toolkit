---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-11
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: spec-driven # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: cursor-cloud-autonomous-projects

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Enable OAT projects to run end-to-end in Cursor Cloud environments — resume-and-run and goal-to-PR autonomous — via an autonomy policy layer, two new OAT skills, lifecycle skill amendments, environment provisioning, and an org-layer docs-research plugin.

**Architecture:** Three-layer skill architecture (OAT / harness / org) bound at runtime via skill discovery; session-scoped autonomy signal (`OAT_AUTONOMOUS=1` implies `OAT_NON_INTERACTIVE=1`); thin orchestrator that chains existing lifecycle skills without bypassing their gates.

**Tech Stack:** OAT skill prose (Markdown, Agent Skills standard), OAT CLI monorepo (TypeScript ESM, vitest, oxlint/oxfmt), Docker + bash (env repo), Cursor plugin layout (pntr).

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add autonomy contract doc`

**Cross-repo note:** Phases p01–p03 and p06 docs tasks work in `open-agent-toolkit`. Phase p04 works in `cloud-agent-env-node`; phase p05 works in `pntr` (both present in this multi-repo environment at `/agent/repos/<name>`; each phase's commits/PRs go to its own repo on a `cursor/`-prefixed branch).

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter (sequential — cross-repo phases and p01→p02 content coupling make worktree parallelism inapplicable)

---

## Parallelism

Fully sequential (`oat_plan_parallel_groups: []`). p02 consumes p01's contract doc; p03 gates p04; p04–p05 live in different repositories (worktree parallel groups target same-repo phases); p06 depends on everything prior. Genuinely disjoint parallelism does not exist here.

---

## Phase 1: Autonomy contract + lifecycle skill amendments (OAT repo)

**Goal (FR1, FR4, FR5, FR6, FR14):** The autonomy policy exists as a documented contract with an exhaustive gate inventory, and every lifecycle skill is policy-aware while remaining inert interactively.

### Task p01-t01: Author autonomy contract + gate inventory doc

**Files:**

- Create: `.agents/docs/autonomy-contract.md`

**Steps:**

- Define `OAT_AUTONOMOUS=1` semantics (implies/sets `OAT_NON_INTERACTIVE=1`; session-scoped; never persisted; boundary semantics; provenance rules).
- Build the gate inventory table: enumerate every interactive prompt across `oat-project-quick-start`, `oat-project-new`, `oat-project-discover`, `oat-project-design`, `oat-project-plan`, `oat-project-implement`, `oat-project-document`, `oat-project-summary`, `oat-project-pr-final`, `oat-project-complete`, `oat-project-review-receive` (grep for `AskUserQuestion`, "Ask", "prompt", "confirm" in each SKILL.md; every hit gets a row: `skill | gate | interactive behavior | autonomous resolution | classification | provenance`).
- Classify boundaries: destructive-change risk, unresolved Critical findings, repo-policy approval, missing credentials.

**Verify:**

Run: `rg -c "AskUserQuestion|Ask the user|confirm" .agents/skills/oat-project-{quick-start,discover,design,plan,implement,document,summary,pr-final,complete}/SKILL.md` and cross-check each hit has an inventory row.
Expected: zero unmapped prompts.

**Commit:** `git add .agents/docs/autonomy-contract.md && git commit -m "feat(p01-t01): add autonomy contract and gate inventory"`

---

### Task p01-t02: Amend oat-project-implement — non-interactive HiLL + dispatch approval

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` (version bump)

**Steps:**

- Step 2.5 area: when `OAT_AUTONOMOUS=1` and `oat_plan_hill_phases` unconfirmed → take the existing `HILL_DEFAULT=final` path (write explicit `["<final-phase-id>"]` + `oat_auto_review_at_hill_checkpoints: true`), no prompt (FR6).
- HiLL checkpoint pause: under autonomy, run auto-review and auto-receive; continue without waiting; record provenance.
- Tier-1 subagent dispatch approval: auto-approved for the run under autonomy per inventory; log tier selection.

**Verify:**

Run: `pnpm oat:validate-skills`
Expected: pass; interactive prose paths unchanged (manual diff read).

**Commit:** `feat(p01-t02): autonomy-aware HiLL resolution and dispatch approval in implement`

---

### Task p01-t03: Amend oat-project-discover and oat-project-design — gate hooks + autonomy behavior

**Files:**

- Modify: `.agents/skills/oat-project-discover/SKILL.md`, `.agents/skills/oat-project-design/SKILL.md` (version bumps)

**Steps:**

- Add end-of-skill Gate Execution section to both (copy the plan/quick-start gate contract verbatim shape: `oat gate resolve <skill> --json`, onFailure semantics) (FR4).
- Design: autonomy note — draft mode already forced by `OAT_NON_INTERACTIVE`; add boundary note for unresolved Critical review findings.

**Verify:**

Run: `pnpm oat:validate-skills`; `rg -n "Gate Execution" .agents/skills/oat-project-{discover,design}/SKILL.md`
Expected: both sections present; validation passes.

**Commit:** `feat(p01-t03): configured gate hooks for discover and design`

---

### Task p01-t04: Amend oat-project-quick-start — bundle gate scope + autonomy gates

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md` (version bump)

**Steps:**

- Broaden exit-gate guidance: review scope covers discovery + lightweight design + plan bundle when artifacts exist (FR5); legacy plan-only configs remain valid.
- Autonomy behaviors per inventory: git preflight → proceed-anyway already under non-interactive; requirements gate → auto-confirm (existing); design-depth choice → agent judgment with recorded rationale (FR13 pointer).

**Verify:**

Run: `pnpm oat:validate-skills`
Expected: pass.

**Commit:** `feat(p01-t04): bundle-scope exit gate and autonomy behaviors in quick-start`

---

### Task p01-t05: Amend document / pr-final / summary + summary template

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`, `.agents/skills/oat-project-summary/SKILL.md`, `.oat/templates/summary.md` (version bumps)

**Steps:**

- document: autonomy → `--auto` path.
- pr-final: failed final review + autonomy → boundary stop (never "proceed anyway" silently).
- summary: conditional `## Autonomous Execution Learnings` section — when `oat-execution-learnings.md` exists in the project, synthesize categorized recommendations (agent-instruction updates, cloud-env improvements, code follow-ups, workflow issues) with pointers to source entries (FR14); inert when absent.
- summary template: add the conditional section placeholder + guidance comment.

**Verify:**

Run: `pnpm oat:validate-skills`
Expected: pass; template renders without the section when no learnings file.

**Commit:** `feat(p01-t05): autonomy behaviors and learnings synthesis in lifecycle tail`

---

### Task p01-t06: Workflow docs — autonomy page + HiLL semantics clarity

**Files:**

- Create: `apps/oat-docs/docs/workflows/projects/autonomy.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md` (HiLL `[]` vs absent clarity), docs index via `oat docs generate-index`

**Steps:**

- Autonomy page: contract summary, signal pair, boundaries, review contract, learnings loop; link gate inventory.
- Configuration doc: document `oat_plan_hill_phases` semantics explicitly (absent = unconfirmed; `[]` = every phase; never write `[]` to mean none).

**Verify:**

Run: `pnpm build:docs`
Expected: docs build passes; index regenerated.

**Commit:** `docs(p01-t06): autonomy contract page and HiLL semantics clarification`

---

## Phase 2: New OAT skills (`oat-project-autonomous`, `oat-cursor-cloud-projects`)

**Goal (FR2, FR3, FR7, FR9, FR11, FR12, FR13):** Both skills authored per `create-oat-skill` conventions, bundled, synced, validated.

### Task p02-t01: Scaffold oat-project-autonomous SKILL.md

**Files:**

- Create: `.agents/skills/oat-project-autonomous/SKILL.md`
- Create: `.agents/skills/oat-project-autonomous/references/gate-inventory.md` (symlink → `../../../docs/autonomy-contract.md` per vendoring pattern)

**Steps:**

- Frontmatter: `version: 1.0.0`, `disable-model-invocation: true`, routing-first description ("Use when a user explicitly asks to run an OAT project autonomously end-to-end…").
- Mode assertion (blocked: bypassing skill-owned gates, persisting autonomy state, approximating artifacts without CLI; allowed: policy activation, state detection, lifecycle chaining, boundary stops).
- Workflow steps: activate signal pair → resolve project home (defer to harness skill in cloud) → entry-state detection from `state.md`/plan frontmatter → mode selection via review-density rule (FR13, rationale recorded) → external-research mandate (FR9, mechanism-agnostic) → learnings log creation (FR11, category taxonomy) → per-phase lifecycle invocation with review contract (FR3 ladder, stated abstractly) → PR topology defaults (FR12) → tail chaining (document → summary → pr-final) → phase-boundary commit+push → structured run report / boundary blocker report.
- Delegation capability model per Step 0.5 pattern (policy supplies authorize-once).

**Verify:**

Run: `pnpm oat:validate-skills`
Expected: pass; body <500 lines (inventory in references).

**Commit:** `feat(p02-t01): oat-project-autonomous orchestrator skill`

---

### Task p02-t02: Scaffold oat-cursor-cloud-projects SKILL.md

**Files:**

- Create: `.agents/skills/oat-cursor-cloud-projects/SKILL.md`
- Create: `.agents/skills/oat-cursor-cloud-projects/references/cursor-cloud-mechanics.md`

**Steps:**

- Frontmatter: model-invocable (auto-surface), description keyed to "OAT + Cursor Cloud environment" triggers.
- Body: cloud detection (env markers, `cursor-cloud` MCP `run-info`/`environment-info`); project-home resolution (multi-repo + single-repo); skill precedence rule (user-scope copy wins over drifted repo copies; absolute-path reads); CLI availability contract (verify `oat`, install via npm if missing, never approximate artifacts); awareness pointers (autonomous skill, org-layer context skills).
- References file: deterministic family identity (`run-info` → `originalModelName` → family map), pinned-slug subagent dispatch guidance, degraded-tier logging shape.

**Verify:**

Run: `pnpm oat:validate-skills`
Expected: pass; no org-specific identifiers (NFR1 spot check: `rg -i "vox|voxmedia" .agents/skills/oat-cursor-cloud-projects/` → zero hits).

**Commit:** `feat(p02-t02): oat-cursor-cloud-projects orientation skill`

---

### Task p02-t03: Bundle + manifest + sync

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh` (SKILLS array), `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`

**Steps:**

- Add both skills to the bash array and the TypeScript manifest (workflows pack membership — pack decision from spec open question resolved here: workflows pack, since both are lifecycle workflow skills; document in commit body).
- Run `oat sync --scope project` to generate provider views.

**Verify:**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts` (use the actual test file path if it differs — locate with `rg -l "bundle-assets" packages/cli/src --glob '*.test.ts'`)
Expected: bundle-consistency test passes.

**Commit:** `feat(p02-t03): bundle and manifest entries for new skills`

---

### Task p02-t04: Lockstep version bumps + release validation

**Files:**

- Modify: `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`

**Steps:**

- Bump all five public package versions together (repo release policy — bundled assets count as shipped functionality).

**Verify:**

Run: `pnpm release:validate`
Expected: pass.

**Commit:** `chore(p02-t04): lockstep version bump for autonomy + cloud skills`

---

## Phase 3: OAT release

**Goal:** Changes published to npm so environments can install them.

### Task p03-t01: Full-suite verification + release readiness

**Files:** none (verification only)

**Steps:**

- Run the full local gate: `pnpm lint && pnpm type-check && pnpm test && pnpm build && pnpm release:validate`.
- Confirm PR(s) for p01–p02 are pushed and review-ready.

**Verify:**

Run: commands above
Expected: all green.

**Commit:** none (bookkeeping only — mark task complete in implementation.md)

---

### Task p03-t02: Post-publish verification (environment-limited until merge/publish)

**Files:** none

**Steps:**

- After the release pipeline publishes: `npm view @open-agent-toolkit/cli version` shows the new version; `npx -y @open-agent-toolkit/cli@latest --version` matches; fresh pack install materializes both new skills at user scope.
- If publish has not happened yet when this task is reached, record as environment-limited in `oat-execution-learnings.md` and in implementation.md; do not claim verified.

**Verify:**

Run: `npm view @open-agent-toolkit/cli version`
Expected: new version; skills present in `~/.agents/skills/` after user-scope install.

**Commit:** none (bookkeeping)

---

## Phase 4: Environment provisioning (`cloud-agent-env-node` repo)

**Goal (FR8, parts of NFR4/NFR5):** Fresh VMs are OAT-ready; setup idempotent; readiness check green. Depends on Phase 3 publish for end-state verification (steps can land pinned to `@latest` beforehand).

### Task p04-t01: Verify user-scope skill loading in cloud (risk retirement)

**Files:**

- Modify (bruno-style log): project `oat-execution-learnings.md` (in OAT repo project dir)

**Steps:**

- In this cloud environment: `mkdir -p ~/.agents/skills`, place a uniquely named probe skill, start/inspect a fresh agent context (or team-plugin equivalent evidence) to confirm discovery; record result.
- If NOT loaded: activate contingency (orientation skill instructs absolute-path reads — adjust p02-t02 wording if needed and note in learnings).

**Verify:**

Probe skill discoverable (or contingency documented + design note updated).
Expected: definitive answer recorded.

**Commit:** `chore(p04-t01): record user-scope skill loading verification` (OAT repo, learnings file)

---

### Task p04-t02: Dockerfile — install OAT CLI + cursor-agent

**Files:**

- Modify: `cloud-agent-env-node:.cursor/Dockerfile`

**Steps:**

- `npm install -g @open-agent-toolkit/cli` (image layer, after Node install).
- Install `cursor-agent` CLI (official install path); no secrets in image.

**Verify:**

Run: `docker build` locally if feasible, else environment rebuild; `oat --version` and `cursor-agent --version` in fresh VM.
Expected: both on PATH.

**Commit:** `feat(p04-t02): install oat CLI and cursor-agent in base image` (env repo)

---

### Task p04-t03: Install script — user-scope packs + seeded config + auth wiring

**Files:**

- Modify: `cloud-agent-env-node:.cursor/install-repos.sh`
- Create: `cloud-agent-env-node:.cursor/oat-user-config.json` (seed source)

**Steps:**

- Idempotent step: install/refresh OAT packs at user scope (`oat init`/`oat tools update` user-scope path); seed `~/.oat/config.json` from the versioned seed file (dispatch ladder incl. cursor/codex/claude tiers, gate execTargets with `availabilityCommand` probes, `workflow.hillCheckpointDefault: final`).
- `CURSOR_API_KEY` wiring per the `GITHUB_PACKAGES_TOKEN` reference pattern (env reference only; warn-and-continue when absent, logging gate tier-1 unavailability).

**Verify:**

Run: re-run script twice in VM; `oat config dump --json` resolves ladder; second run is a no-op.
Expected: idempotent, config resolves.

**Commit:** `feat(p04-t03): user-scope OAT packs, seeded config, cursor-agent auth` (env repo)

---

### Task p04-t04: Per-repo shared-config audit + local overrides

**Files:**

- Modify: `cloud-agent-env-node:.cursor/install-repos.sh` (override seeding step, only if audit finds needs)
- Create: `cloud-agent-env-node:README.md` section documenting the audit outcome

**Steps:**

- Enumerate `.oat/config.json` keys in each mounted repo (gizmo-slack-app, open-agent-toolkit, pntr); classify cloud-safe vs needs-override (S3 sync stays enabled — bucket credentials are operator-provisioned).
- Seed documented `.oat/config.local.json` overrides only where classification requires.

**Verify:**

Audit table in README; overrides (if any) present after script run.
Expected: documented, minimal.

**Commit:** `feat(p04-t04): cloud config audit and local overrides` (env repo)

---

### Task p04-t05: Readiness check

**Files:**

- Create: `cloud-agent-env-node:.cursor/oat-readiness.sh`
- Modify: `cloud-agent-env-node:.cursor/install-repos.sh` (invoke at end)

**Steps:**

- Probes: `oat` on PATH + version; user-scope packs present; `oat config dump` resolves seeded ladder; `cursor-agent --version` (+ auth probe when secret present); non-zero exit with named failing probe.

**Verify:**

Run: `bash .cursor/oat-readiness.sh` in provisioned VM.
Expected: exit 0, all probes named green.

**Commit:** `feat(p04-t05): OAT readiness check` (env repo)

---

## Phase 5: Org layer (`pntr` repo — `internal-docs-mcp` plugin)

**Goal (FR10):** Skill-only plugin teaching vox-docs usage. Independent of p01–p04.

### Task p05-t01: Plugin scaffold + SKILL.md

**Files:**

- Create: `pntr:plugins/internal-docs-mcp/skills/internal-docs-mcp/SKILL.md` (+ plugin manifest matching pntr's existing plugin layout)

**Steps:**

- Follow `create-agnostic-skill` baseline (no OAT machinery): routing description keyed to external-integration research triggers; workflow: coverage check (`list_libraries`) → scoped `search_docs` queries → when to prefer local checkout; fallback definitions (unattached → note and proceed; unreachable → log; no coverage → flag to operator via learnings when in an OAT run).
- Org names allowed by design (vox-docs, endpoint).

**Verify:**

Run: pntr repo lint/test suite (`pnpm lint && pnpm test` in pntr as applicable); manual skill read-through against vox-docs live tools.
Expected: green; skill triggers correctly in a cloud session.

**Commit:** `feat(p05-t01): internal-docs-mcp skill-only plugin` (pntr repo)

---

### Task p05-t02: pntr docs + operator handoff note

**Files:**

- Modify: `pntr:README.md` (plugins section), `pntr:docs/` as fits existing structure

**Steps:**

- Document the plugin, marketplace publication step, and installation-mode choice (operator action item).

**Verify:**

Docs build/lint per pntr conventions.
Expected: green.

**Commit:** `docs(p05-t02): document internal-docs-mcp plugin` (pntr repo)

---

## Phase 6: End-to-end validation + docs closure

**Goal (FR2, FR7, NFR1, NFR2, NFR3, NFR5 verification):** The four e2e scenarios pass; audits clean; learnings synthesized.

### Task p06-t01: Multi-repo fresh-environment validation

**Steps:** Fresh cloud agent in this environment post-provisioning: readiness green; OAT mention surfaces orientation; project-home resolution correct; skill precedence honored. Record in learnings.

**Verify:** Checklist against FR7 acceptance criteria.

**Commit:** bookkeeping (learnings + implementation.md)

---

### Task p06-t02: Single-repo environment validation (NFR5)

**Steps:** Operator (or agent-initiated env setup) creates a single-repo cloud env using the same base; run the FR7/FR8 checks there. Environment-limited until the env exists.

**Verify:** Same checklist, single-repo semantics.

**Commit:** bookkeeping

---

### Task p06-t03: Resume-and-run e2e

**Steps:** Take a small approved-plan project; invoke `oat-project-autonomous`; verify implement→document→summary→pr-final chain, review provenance per phase, phase-boundary pushes, zero unplanned pauses (NFR3), zero persisted autonomy state after (NFR2 inspection).

**Verify:** FR2 + NFR2/NFR3 acceptance criteria.

**Commit:** bookkeeping

---

### Task p06-t04: Goal-to-PR e2e

**Steps:** Bare-goal invocation on a real small objective; verify full lifecycle incl. mode-selection rationale (FR13), research mandate behavior with org layer present (FR9/FR10), single-PR default (FR12), learnings log (FR11), summary synthesis (FR14).

**Verify:** FR2 goal-to-PR criteria end-to-end.

**Commit:** bookkeeping

---

### Task p06-t05: NFR1 bundle audit + docs closure

**Files:**

- Modify: OAT docs as needed; project artifacts

**Steps:**

- Build bundle; `rg -i "vox|voxmedia|voxops" packages/cli/assets/` → zero hits (NFR1).
- Close out docs deltas (`oat-project-document` run), synthesize learnings (dogfoods FR14).

**Verify:** audit zero hits; docs build green.

**Commit:** `docs(p06-t05): validation closure and bundle audit`

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| p04    | code     | pending | -    | -        |
| p05    | code     | pending | -    | -        |
| p06    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |
| plan   | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks — autonomy contract + lifecycle amendments (OAT repo)
- Phase 2: 4 tasks — new skills, bundle, versions (OAT repo)
- Phase 3: 2 tasks — release + post-publish verification
- Phase 4: 5 tasks — environment provisioning (env repo)
- Phase 5: 2 tasks — org-layer plugin (pntr repo)
- Phase 6: 5 tasks — e2e validation + audits + closure

**Total: 24 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md` (incl. Operator Action Items checklist)
- Bruno execution learnings: bruno repo, `.oat/projects/shared/bruno-modernization-roadmap/oat-execution-learnings.md`
