---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-11
oat_phase: plan
oat_phase_status: complete
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

**Architecture:** Three-layer skill architecture (OAT / harness / org) bound at runtime via skill discovery; session-scoped autonomy signal (`OAT_AUTONOMOUS=1` implies `OAT_NON_INTERACTIVE=1`); thin orchestrator that chains existing lifecycle skills without bypassing their gates. One existing-installer CLI change: the workflows pack gains user-scope installability (no new commands or engine subsystems).

**Tech Stack:** OAT skill prose (Markdown, Agent Skills standard), OAT CLI monorepo (TypeScript ESM, vitest, oxlint/oxfmt), Docker + bash (env repo), Cursor plugin layout (pntr).

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add autonomy contract doc`

**Cross-repo note:** Phases p01–p03 and p06 work in `open-agent-toolkit`. Phase p04 works in `cloud-agent-env-node`; phase p05 works in `pntr` (both present in this multi-repo environment at `/agent/repos/<name>`; each phase's commits/PRs go to its own repo on a `cursor/`-prefixed branch). Bookkeeping writes (implementation.md, learnings) always land in the OAT repo project directory.

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter (sequential — see Parallelism)

---

## Parallelism

Fully sequential (`oat_plan_parallel_groups: []`). p02 consumes p01's contract doc; p03 gates p04's end-state validation; p06 depends on everything prior. p05 is logically independent of p01–p04 but is intentionally excluded from a parallel group: OAT parallel groups execute in same-repo worktrees, and p05 lives in a different repository (`pntr`), which the executor cannot represent as a parallel phase.

---

## Phase-Boundary Review Note

Per-phase code reviews during implementation dispatch as **native cross-family subagents pinned to the exact resolver-returned target** (project policy: managed/frontier; the user-scope ladder's Cursor frontier cell is explicitly `["gpt-5.6-sol-xhigh"]`, so the resolver returns `gpt-5.6-sol-xhigh` as the reviewer target — natively dispatchable in this host and cross-family against the Claude-family orchestrator). The exact target is preserved on retry/re-dispatch; if the host ever cannot apply it, the review blocks rather than downgrading. This is the FR3 tier-2 mechanism, applied at every phase boundary per user direction (2026-07-11). The external `oat_phase_review_gate` frontmatter is intentionally unset: no qualifying configured gate CLI target exists in this environment, and the setup contract forbids inventing enablement. Review provenance (mechanism, model, family) is recorded per phase in the Reviews table and implementation log.

---

## Operator Dependencies

| Item | Owner | Required by | Blocking behavior |
| ---- | ----- | ----------- | ----------------- |
| `CURSOR_API_KEY` Cloud Agents secret | Operator | p04 acceptance (FR8 strict readiness) | p04 steps land warn-and-continue; FR8 acceptance stays environment-limited until the authenticated check reruns green |
| npm publish of the OAT release | Operator (merge → pipeline) | p03-t02 gate; p04 end-state validation | p04 end-state validation is blocked until p03-t02 passes |
| S3 archive-bucket access for cloud AWS profile | Operator | p06 archive-on-complete verification | Marked environment-limited until granted |
| vox-docs CI indexing (`bruno`, `pntr`, `open-agent-toolkit`, `cloud-agent-env-node`) | Operator | p06-t04 research validation (soft) | FR9 gap-logging path validates instead when absent |
| `internal-docs-mcp` marketplace publication + installation mode | Operator | p06-t06 FR10 live checks | FR10 live checks environment-limited until published |

---

## Phase 1: Autonomy contract + lifecycle skill amendments (OAT repo)

**Goal (FR1, FR4, FR5, FR6, FR14):** The autonomy policy exists as a documented contract with an exhaustive gate inventory, and every lifecycle skill is policy-aware while remaining inert interactively.

### Task p01-t01: Author autonomy contract + gate inventory doc

**Files:**

- Create: `.agents/docs/autonomy-contract.md`

**Steps:**

- Define `OAT_AUTONOMOUS=1` semantics (implies/sets `OAT_NON_INTERACTIVE=1`; session-scoped; never persisted; boundary semantics; provenance rules).
- Build the gate inventory table covering **all** of: `oat-project-new`, `oat-project-quick-start`, `oat-project-discover`, `oat-project-design`, `oat-project-plan`, `oat-project-import-plan`, `oat-project-implement`, `oat-project-document`, `oat-project-summary`, `oat-project-pr-final`, `oat-project-complete`, `oat-project-review-provide`, `oat-project-review-receive`. Every interactive prompt gets a row: `skill | gate | interactive behavior | autonomous resolution | classification | provenance`.
- Classify boundaries: destructive-change risk, unresolved Critical findings, repo-policy approval, missing credentials.

**Verify (row-by-row, not counts):**

For each listed skill, extract prompt sites (`rg -n "AskUserQuestion|Ask the user|ask:|confirm" .agents/skills/<skill>/SKILL.md`) and check off each hit against an inventory row in a scratch comparison table appended to the task's commit message body or implementation notes. Zero unmapped prompt sites across all thirteen skills.

**Commit:** `git add .agents/docs/autonomy-contract.md && git commit -m "feat(p01-t01): add autonomy contract and gate inventory"`

---

### Task p01-t02: Amend oat-project-implement — non-interactive HiLL + dispatch approval

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` (version bump)

**Steps:**

- Step 2.5 area: when `OAT_AUTONOMOUS=1` and `oat_plan_hill_phases` unconfirmed → take the existing `HILL_DEFAULT=final` path (write explicit `["<final-phase-id>"]` + `oat_auto_review_at_hill_checkpoints: true`), no prompt (FR6). Preserve `[]` and explicit-list semantics untouched.
- HiLL checkpoint pause: under autonomy, run auto-review and auto-receive; continue without waiting; record provenance.
- Tier-1 subagent dispatch approval: auto-approved for the run under autonomy per inventory; log tier selection.

**Verify:**

Run: `pnpm oat:validate-skills`
Expected: pass; interactive prose paths unchanged (manual diff read confirms amendments are additive `OAT_AUTONOMOUS`-conditional blocks).

**Commit:** `feat(p01-t02): autonomy-aware HiLL resolution and dispatch approval in implement`

---

### Task p01-t03: Amend oat-project-discover and oat-project-design — gate hooks + autonomy behavior

**Files:**

- Modify: `.agents/skills/oat-project-discover/SKILL.md`, `.agents/skills/oat-project-design/SKILL.md` (version bumps)

**Steps:**

- Add end-of-skill Gate Execution section to both (copy the plan/quick-start gate contract shape: `oat gate resolve <skill> --json`, onFailure semantics) (FR4).
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
- Autonomy behaviors per inventory: git preflight → proceed-anyway already under non-interactive; requirements gate → auto-confirm (existing); design-depth choice → agent judgment with recorded rationale.

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

### Task p01-t06: Workflow docs — autonomy page, cloud guidance page, HiLL semantics

**Files:**

- Create: `apps/oat-docs/docs/workflows/projects/autonomy.md`
- Create: `apps/oat-docs/docs/workflows/projects/cursor-cloud.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md` (HiLL `[]` vs absent clarity)
- Modify: `apps/oat-docs/docs/workflows/projects/index.md` (or the nearest authored nav index — locate with `ls apps/oat-docs/docs/workflows/projects/`) so both new pages are linked
- Regenerate: `apps/oat-docs/index.md` via `oat docs generate-index`

**Steps:**

- Autonomy page: contract summary, signal pair, boundaries, review contract, learnings loop; link gate inventory.
- Cloud guidance page: running OAT in Cursor Cloud (orientation skill pointer, provisioning expectations, project-home rules) — the design Phase 6 "cloud guidance" deliverable, authored here so docs land with the feature.
- Configuration doc: document `oat_plan_hill_phases` semantics explicitly (absent = unconfirmed; `[]` = every phase; never write `[]` to mean none).

**Verify:**

Run: `pnpm build:docs` and `rg -n "autonomy|cursor-cloud" apps/oat-docs/docs/workflows/projects/index.md`
Expected: build passes; both pages present in navigation; generated index refreshed.

**Commit:** `docs(p01-t06): autonomy contract, cloud guidance, and HiLL semantics docs`

---

## Phase 2: New OAT skills + user-scope installability (OAT repo)

**Goal (FR2, FR3, FR7, FR8-install, FR9, FR11, FR12, FR13):** User-scope loading risk retired first; both skills authored per `create-oat-skill` conventions; workflows pack installable at user scope; bundled, synced, validated.

### Task p02-t01: Verify user-scope skill loading in cloud (risk retirement — BEFORE skill finalization)

**Files:**

- Modify: `.oat/projects/shared/cursor-cloud-autonomous-projects/oat-execution-learnings.md` (create if absent)

**Steps:**

- In this cloud environment: `mkdir -p ~/.agents/skills`, place a uniquely named probe skill, verify discovery in a fresh agent context (fresh cloud run in this environment, or documented equivalent evidence); record the result in the learnings log.
- If NOT loaded: activate the contingency now, while p02 is still open — the orientation skill (p02-t03) instructs absolute-path reads as the primary mechanism, and the design risk row is updated. No post-release amendment needed because this runs before release.

**Verify:**

Probe skill discoverable in fresh context (or contingency wording adopted in p02-t03 + learnings entry recorded). Definitive answer committed.

**Commit:** `chore(p02-t01): record user-scope skill loading verification`

---

### Task p02-t02: Author oat-project-autonomous SKILL.md

**Files:**

- Create: `.agents/skills/oat-project-autonomous/SKILL.md`
- Create: `.agents/skills/oat-project-autonomous/references/gate-inventory.md` (symlink → `../../../docs/autonomy-contract.md` per vendoring pattern)

**Steps:**

- Frontmatter: `version: 1.0.0`, `disable-model-invocation: true`, routing-first description ("Use when a user explicitly asks to run an OAT project autonomously end-to-end…").
- Mode assertion (blocked: bypassing skill-owned gates, persisting autonomy state, approximating artifacts without CLI; allowed: policy activation, state detection, lifecycle chaining, boundary stops).
- Workflow steps: activate signal pair → resolve project home (defer to harness skill in cloud) → entry-state detection from `state.md`/plan frontmatter → mode selection via review-density rule (FR13, rationale recorded) → external-research mandate (FR9, mechanism-agnostic) → learnings log creation (FR11, category taxonomy) → per-phase lifecycle invocation with review contract (FR3 ladder, stated abstractly) → PR topology defaults (FR12) → tail chaining (document → summary → pr-final) → phase-boundary commit+push → structured run report / boundary blocker report → restart-resume rule (deliberate re-invocation resumes from persisted state).
- Delegation capability model per Step 0.5 pattern (policy supplies authorize-once).

**Verify:**

Run: `pnpm oat:validate-skills`
Expected: pass; body <500 lines (inventory in references).

**Commit:** `feat(p02-t02): oat-project-autonomous orchestrator skill`

---

### Task p02-t03: Author oat-cursor-cloud-projects SKILL.md

**Files:**

- Create: `.agents/skills/oat-cursor-cloud-projects/SKILL.md`
- Create: `.agents/skills/oat-cursor-cloud-projects/references/cursor-cloud-mechanics.md`

**Steps:**

- Frontmatter: model-invocable (auto-surface), description keyed to "OAT + Cursor Cloud environment" triggers.
- Body: cloud detection (env markers, `cursor-cloud` MCP `run-info`/`environment-info`); project-home resolution (multi-repo + single-repo); **asset-precedence rule: user scope always wins** (all asset classes — skills, templates, scripts; the user tier is installed from `@latest` at env boot and repo copies are never customized, only stale). For skills, per-skill frontmatter `version:` comparison runs as **verification, not arbitration**: user ≥ repo is the expected invariant; if a repo copy is ever higher, treat it as an environment anomaly — use the higher copy for that read, log it to the learnings file, and flag that the user tier needs refresh (`oat tools update` / env rebuild). Absolute-path reads — primary or fallback per p02-t01 outcome; CLI availability contract (verify `oat`, install via npm if missing, never approximate artifacts); awareness pointers (autonomous skill, org-layer context skills).
- References file: deterministic family identity (`run-info` → `originalModelName` → family map), pinned-slug subagent dispatch guidance, degraded-tier logging shape.

**Verify:**

Run: `pnpm oat:validate-skills` and `rg -i "vox|voxmedia|voxops" .agents/skills/oat-cursor-cloud-projects/`
Expected: validation passes; org-identifier scan returns zero hits (NFR1).

**Commit:** `feat(p02-t03): oat-cursor-cloud-projects orientation skill`

---

### Task p02-t04: CLI — workflows pack user-scope installability as a split install, direct + aggregate (TDD)

**Rationale (verified 2026-07-11; revised after version-skew discussion):** the project-only guard exists because parts of the install are repo-coupled, but skills/templates/scripts version together in one package release — a user-scope install must carry all three (plus agents) or user-canonical skills would pair with stale repo templates/scripts. Repo copies are never customized in this fleet (difference = staleness), so user scope installs the **full asset set at user-level paths**: skills + agents to `~/.agents/`, templates to `~/.oat/templates/`, scripts to `~/.oat/scripts/` (precedent: core pack installs `~/.oat/docs/`). Only the projects-root scaffolding side effects remain project-scope-only (a projects tree in the home directory would violate repo-rooted artifacts). Project-scope behavior is unchanged.

**Files:**

- Modify: `packages/cli/src/commands/init/tools/workflows/index.ts` (replace the project-only rejection with scope routing)
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` (user-scope mode: skills/agents → user `.agents/`; templates → `~/.oat/templates/`; scripts → `~/.oat/scripts/`; skip projects-root block)
- Modify: `packages/cli/src/commands/init/tools/index.ts` (aggregate installer: add workflows to the user-eligible pack set, drop the project-only label, route user-scope installs away from `projectRoot`)
- Modify: colocated test files for both (locate with `rg -l "supports only --scope project|user-eligible|projectRoot" packages/cli/src/commands/init/tools`)
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md` (document user-scope semantics and asset destinations)

**Step 1: Write tests (RED)** — (a) direct: `oat init tools workflows --scope user` materializes skills + agents under temp-home `.agents/`, templates under temp-home `.oat/templates/`, scripts under temp-home `.oat/scripts/` (executable bit preserved), and creates **no** projects-root artifacts; (b) aggregate/guided: user-scope aggregate install includes workflows with identical destinations, writing nothing to `projectRoot`; (c) scope/removal/update semantics match other user-eligible packs; existing project-scope tests unchanged.

**Step 2: Implement (GREEN)** — scope routing in the subcommand; user-eligible set + destination routing in the aggregate installer (mirror `ideas`/`brainstorm` handling); user-destination install path in `install-workflows.ts`.

**Step 3: Refactor** — dedupe scope plumbing with the shared scope-option helper if trivial.

**Step 4: Verify:**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/workflows/index.test.ts src/commands/init/tools/index.test.ts && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli lint`
Expected: green; direct and aggregate fresh-home tests prove the full asset set at user paths with zero projects-root artifacts in the home directory.

**Commit:** `feat(p02-t04): full-asset user-scope installability for workflows pack (direct + aggregate)`

---

### Task p02-t07: CLI — user-first template/script resolution in consumers (TDD)

**Rationale:** repo copies are never customized — a differing repo copy is only stale — so the freshest tier wins. Resolution order for templates (and the instruction-level rule for scripts): **user (`~/.oat/templates/`, refreshed to latest at env boot) → repo (`.oat/templates/`) → bundled assets** (the `npx`-no-install floor). This simultaneously fixes the un-adopted-repo case (no repo templates at all — the Bruno manual-approximation trigger) and the stale-repo case. Artifacts still land in the repo's projects root regardless of template source.

**Files:**

- Modify: `packages/cli/src/commands/project/new/scaffold.ts` (per-file three-tier resolution: user → repo → bundled via `resolveAssetsRoot()`)
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts` (resolution cases)

**Step 1: Write tests (RED)** — (a) user templates present: user copy wins over differing repo copy; (b) no user install, repo present: repo copy used (today's behavior); (c) neither: bundled assets used, scaffold succeeds, artifacts land under the repo's projects root; (d) partial tiers: per-file resolution (user copy for one file, repo for another, bundled fills gaps).

**Step 2: Implement (GREEN)** — per-file three-tier resolution helper; no new config surface.

**Step 3: Refactor** — extract `resolveTemplateSource(userOatRoot, repoRoot, file)` if it clarifies.

**Step 4: Verify:**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli lint`
Expected: green; all four scenarios covered.

**Commit:** `feat(p02-t07): user-first template resolution for project scaffolding`

---

### Task p02-t05: Bundle + manifest + sync

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh` (SKILLS array), `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`

**Steps:**

- Add both new skills to the bash array and the TypeScript manifest (workflows pack — now user-scope eligible via p02-t04).
- Run `oat sync --scope project` to generate provider views.

**Verify:**

Run: locate and run the bundle-consistency test — `rg -l "bundle-assets" packages/cli/src --glob '*.test.ts'` then `pnpm --filter @open-agent-toolkit/cli exec vitest run <path>`
Expected: bundle-consistency test passes; provider views regenerated.

**Commit:** `feat(p02-t05): bundle and manifest entries for new skills`

---

### Task p02-t06: Lockstep version bumps + release validation

**Files:**

- Modify: `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`

**Steps:**

- Bump all five public package versions together (repo release policy — bundled assets and CLI changes count as shipped functionality). Design assigns "release" to Phase 3; the bump lands here because it must ship in the same PR as the changes (repo lockstep rule) — Phase 3 owns the publish boundary, not the bump.

**Verify:**

Run: `pnpm release:validate`
Expected: pass.

**Commit:** `chore(p02-t06): lockstep version bump for autonomy + cloud skills`

---

## Phase 3: OAT release (publish boundary)

**Goal:** Changes published to npm. **p04 end-state validation is hard-blocked on p03-t02 passing.**

### Task p03-t01: Full-suite verification + PR readiness

**Files:**

- Modify: `.oat/projects/shared/cursor-cloud-autonomous-projects/implementation.md` (bookkeeping)

**Steps:**

- Run the full local gate: `pnpm lint && pnpm type-check && pnpm test && pnpm build && pnpm release:validate`.
- Confirm the p01–p02 PR is pushed, review-passed, and merge-ready; record status in implementation.md.

**Verify:**

Run: commands above.
Expected: all green; implementation.md records readiness.

**Commit:** `chore(p03-t01): record release readiness`

---

### Task p03-t02: Publish boundary verification (operator merge → pipeline publish)

**Files:**

- Modify: `.oat/projects/shared/cursor-cloud-autonomous-projects/implementation.md`, `oat-execution-learnings.md` (bookkeeping)

**Steps:**

- **Operator boundary:** the user merges the OAT PR; the release pipeline publishes. This task polls for completion — it does not publish.
- Poll: `npm view @open-agent-toolkit/cli version` equals the p02-t06 bump; `npx -y @open-agent-toolkit/cli@latest --version` matches; fresh user-scope pack install (temp HOME) materializes **both new skills**.
- **Blocking rule:** until all three checks pass, p04 tasks may land code but p04's end-state validation (p04-t04 strict mode) and p06 e2e tasks must not be marked complete. If reached while unpublished, record environment-limited status + blocker in implementation.md and stop the phase (boundary stop, not silent progression).

**Verify:**

Run: the three checks above.
Expected: exact-version match + both skills present, or a recorded boundary stop.

**Commit:** `chore(p03-t02): record publish boundary verification`

---

## Phase 4: Environment provisioning (`cloud-agent-env-node` repo)

**Goal (FR8, parts of NFR4):** Fresh VMs are OAT-ready; setup idempotent; readiness check green in strict mode once operator secrets exist.

### Task p04-t01: Dockerfile — install OAT CLI + cursor-agent

**Files:**

- Modify: `cloud-agent-env-node:.cursor/Dockerfile`

**Steps:**

- `npm install -g @open-agent-toolkit/cli` (image layer, after Node install).
- Install `cursor-agent` CLI via its official install path; no secrets in image.

**Verify:**

Rebuild the environment version via the Cursor dashboard flow (operator-triggerable from the env repo PR); in the fresh VM run `oat --version && cursor-agent --version`.
Expected: both on PATH with expected versions. Until a rebuild happens, record environment-limited; do not claim verified.

**Commit:** `feat(p04-t01): install oat CLI and cursor-agent in base image` (env repo)

---

### Task p04-t02: Install script — user-scope packs + seeded config + auth wiring

**Files:**

- Modify: `cloud-agent-env-node:.cursor/install-repos.sh`
- Create: `cloud-agent-env-node:.cursor/oat-user-config.json` (versioned seed source)

**Steps:**

- Idempotent step: install/refresh OAT packs at user scope (requires p02-t04; includes workflows pack); seed `~/.oat/config.json` from the seed file (dispatch ladder for cursor/codex/claude tiers, gate execTargets with `availabilityCommand` probes, `workflow.hillCheckpointDefault: final`).
- `CURSOR_API_KEY` wiring per the `GITHUB_PACKAGES_TOKEN` reference pattern (env reference only). **Degraded vs acceptance:** absent secret → warn-and-continue with a logged "gate tier-1 unavailable" note (NFR4 degraded path); FR8 *acceptance* requires the authenticated check to pass — tracked in p04-t04 strict mode.

**Verify:**

Run script twice in the VM; `oat config dump --json` resolves the seeded ladder; second run is a no-op diff.
Expected: idempotent; config resolves; degraded/acceptance distinction logged.

**Commit:** `feat(p04-t02): user-scope OAT packs, seeded config, cursor-agent auth` (env repo)

---

### Task p04-t03: Per-repo shared-config audit + local overrides

**Files:**

- Modify: `cloud-agent-env-node:.cursor/install-repos.sh` (override seeding step, only if audit finds needs)
- Modify: `cloud-agent-env-node:README.md` (audit-outcome section)

**Steps:**

- Enumerate `.oat/config.json` keys in each mounted repo (gizmo-slack-app, open-agent-toolkit, pntr); classify cloud-safe vs needs-override (S3 sync stays enabled — bucket credentials are operator-provisioned; see Operator Dependencies).
- Seed documented `.oat/config.local.json` overrides only where classification requires.
- Update the README's repository file inventory to include the two new `.cursor/` files (`oat-user-config.json` from p04-t02, `oat-readiness.sh` from p04-t04) with one-line rationales — the README currently enumerates exactly four files.

**Verify:**

Audit table present in README; overrides (if any) materialize after script run and are listed in the table.
Expected: documented, minimal.

**Commit:** `feat(p04-t03): cloud config audit and local overrides` (env repo)

---

### Task p04-t04: Readiness check (degraded + strict modes)

**Files:**

- Create: `cloud-agent-env-node:.cursor/oat-readiness.sh`
- Modify: `cloud-agent-env-node:.cursor/install-repos.sh` (invoke at end in degraded-ok mode)

**Steps:**

- Probes: `oat` on PATH + version; user-scope packs present (incl. both new skills); `oat config dump` resolves seeded ladder; `cursor-agent --version`; authenticated `cursor-agent` probe.
- Two modes: default boot mode tolerates missing-secret auth probe (warn, exit 0, named degradation); `--strict` requires every probe green (FR8 acceptance; exit non-zero naming the failing probe).

**Verify:**

Run: `bash .cursor/oat-readiness.sh` (boot mode) and `bash .cursor/oat-readiness.sh --strict` in a provisioned VM after `CURSOR_API_KEY` exists.
Expected: boot mode green immediately; strict mode green once operator secret lands — until then FR8 acceptance recorded environment-limited.

**Commit:** `feat(p04-t04): OAT readiness check with strict acceptance mode` (env repo)

---

## Phase 5: Org layer (`pntr` repo — `internal-docs-mcp` plugin)

**Goal (FR10):** Skill-only plugin teaching vox-docs usage. Logically independent of p01–p04 (sequenced here; not parallelizable cross-repo).

### Task p05-t01: Plugin scaffold + SKILL.md

**Files:**

- Create: `pntr:plugins/internal-docs-mcp/skills/internal-docs-mcp/SKILL.md` (+ plugin manifest matching pntr's existing `plugins/pntr` layout)

**Steps:**

- Follow `create-agnostic-skill` baseline (no OAT machinery): routing description keyed to external-integration research triggers; workflow: coverage check (`list_libraries`) → scoped `search_docs` queries → when to prefer local checkout; fallback definitions (unattached → note and proceed; unreachable → log; no coverage → flag to operator via learnings when in an OAT run).
- Org names allowed by design (vox-docs).

**Verify:**

Run (pntr repo): `pnpm type-check && pnpm build && pnpm test && NO_COLOR=1 pnpm test && pnpm lint && pnpm format`
Expected: all green; manual skill read-through against live vox-docs tools confirms tool names/flows.

**Commit:** `feat(p05-t01): internal-docs-mcp skill-only plugin` (pntr repo)

---

### Task p05-t02: pntr docs + operator handoff note

**Files:**

- Modify: `pntr:README.md` (plugins section)
- Modify: `pntr:docs/index.md` (docs map entry)

**Steps:**

- Document the plugin, marketplace publication step, and installation-mode choice (operator action item; see Operator Dependencies).

**Verify (full repository chain after ALL p05 changes, per pntr AGENTS.md):**

Run (pntr repo): `pnpm install && pnpm type-check && pnpm build && pnpm test && NO_COLOR=1 pnpm test && pnpm lint && pnpm format`, then after committing: `pnpm worktree:validate` (clean working tree).
Expected: all green; worktree validation passes post-commit.

**Commit:** `docs(p05-t02): document internal-docs-mcp plugin` (pntr repo)

---

## Phase 6: Scenario validation + e2e + closure (OAT repo bookkeeping)

**Goal (FR2, FR4–FR7, FR9–FR14, NFR1–NFR5 verification):** Scenario matrix and the four e2e runs pass; audits clean; learnings synthesized. All p06 bookkeeping files live in the OAT project directory; each task commits its evidence.

### Task p06-t01: Multi-repo fresh-environment validation

**Files:**

- Modify: `implementation.md`, `oat-execution-learnings.md` (project dir)

**Steps:** Fresh cloud agent in this environment post-provisioning: readiness green (boot mode; strict if secret landed); OAT mention surfaces orientation skill; project-home resolution correct; skill precedence honored (user-scope copy read over drifted repo copies).

**Verify:** Checklist against FR7 acceptance criteria; evidence recorded per item.

**Commit:** `test(p06-t01): multi-repo fresh-environment validation evidence`

---

### Task p06-t02: Single-repo environment validation (NFR5)

**Files:**

- Modify: `implementation.md`, `oat-execution-learnings.md`

**Steps:** Operator (or agent-initiated env setup at cursor.com/onboard) creates a single-repo cloud env on the same base; run FR7/FR8 checks there (project-home resolution without multi-repo paths; setup instructions accurate). Environment-limited until the env exists — recorded as such, never skipped silently.

**Verify:** Same checklist, single-repo semantics; evidence recorded.

**Commit:** `test(p06-t02): single-repo environment validation evidence`

---

### Task p06-t03: Resume-and-run e2e + restart + boundary scenarios

**Files:**

- Modify: `implementation.md`, `oat-execution-learnings.md`

**Steps:**

- Small approved-plan fixture project; invoke `oat-project-autonomous`; verify implement→document→summary→pr-final chain, review provenance per phase, phase-boundary pushes.
- **Restart scenario:** kill/abandon the session mid-phase; new session re-invokes the skill; verify resume from persisted state with no duplicated work (FR2).
- **Boundary scenario:** contrive a boundary (e.g., unresolved Critical finding via fixture); verify structured blocker report + clean resumable stop (FR2/NFR3).
- **NFR2 inspection:** post-run artifact grep for autonomy flags (zero); local interactive resume pauses at persisted HiLL checkpoint.

**Verify:** FR2 + NFR2/NFR3 acceptance criteria checked off with evidence.

**Commit:** `test(p06-t03): resume-and-run, restart, and boundary e2e evidence`

---

### Task p06-t04: Goal-to-PR e2e

**Files:**

- Modify: `implementation.md`, `oat-execution-learnings.md`

**Steps:** Bare-goal invocation on a real small objective; verify full lifecycle incl. mode-selection rationale (FR13), research mandate with org layer present (FR9 uses vox-docs when indexed; gap-logging path when not), single-PR default (FR12), learnings log entries (FR11), summary synthesis (FR14).

**Verify:** FR2 goal-to-PR criteria end-to-end with evidence.

**Commit:** `test(p06-t04): goal-to-PR e2e evidence`

---

### Task p06-t05: HiLL + review-ladder scenario fixtures (FR3/FR6 acceptance)

**Files:**

- Modify: `implementation.md`, `oat-execution-learnings.md` (+ disposable fixture project under `.oat/projects/local/`)

**Steps:**

- **HiLL fixtures (FR6):** (a) autonomous run with unconfirmed checkpoints writes explicit `["<final-id>"]` + auto-review flag; (b) plan with `[]` preserved untouched and pauses every phase interactively; (c) the autonomous-written plan resumed interactively pauses at the final checkpoint.
- **Review ladder (FR3):** exercise all three tiers — gate CLI path (once `cursor-agent` authenticated), cross-family pinned subagent (family from `run-info`, never self-report), same-family degraded (simulated single-family constraint) — verifying provenance records mechanism+model+family and Critical findings block / Important follow gate policy.

**Verify:** Each scenario's expected observable state checked with evidence (frontmatter diffs, provenance entries).

**Commit:** `test(p06-t05): HiLL and review-ladder scenario evidence`

---

### Task p06-t06: Gate + fallback scenario matrix (FR4/FR5/FR9/FR10/FR12/FR14/NFR4)

**Files:**

- Modify: `implementation.md`, `oat-execution-learnings.md` (+ fixture project reuse)

**Steps:**

- **FR4:** configured gate at discover/design exit exercising `block`, `prompt`, `warn`, and absent-config (unchanged behavior).
- **FR5:** quick fixture — bundle-scope gate prompt covers all three artifacts; legacy plan-only config still passes.
- **FR9:** evidence-gathering with org layer absent → gap logged, run proceeds.
- **FR10:** vox-docs fallback states — unattached, unreachable (simulated), no-coverage — each behaves per skill spec.
- **FR12:** stacked-PR-requested fixture plan carries Stacked PR Strategy fields + parallel-group base-readiness statements.
- **FR14:** summary generation with learnings file (section present, categorized, both entry paths: standalone summary and pr-final) and without (inert).
- **NFR4:** simulated missing CLI / missing MCP / missing secret each produce the documented fallback + log entry.

**Verify:** Matrix table in implementation.md, one row per scenario, all green or environment-limited with reason.

**Commit:** `test(p06-t06): gate and fallback scenario matrix evidence`

---

### Task p06-t07: NFR1 bundle audit + docs closure

**Files:**

- Modify: `implementation.md`; OAT docs deltas as surfaced by `oat-project-document`

**Steps:**

- Build bundle; `rg -i "vox|voxmedia|voxops" packages/cli/assets/` → zero hits (NFR1).
- Run `oat-project-document` for docs deltas; synthesize learnings (dogfoods FR14).

**Verify:** Audit zero hits; `pnpm build:docs` green.

**Commit:** `docs(p06-t07): validation closure and bundle audit`

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
| plan   | artifact | passed  | 2026-07-11 | structured (in-memory; reviewer: cursor `gpt-5.6-sol-xhigh`, cross-family; 3 rounds, final fix applied verbatim) |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks — autonomy contract + lifecycle amendments (OAT repo)
- Phase 2: 7 tasks — risk retirement, new skills, split-scope installability, template fallback, bundle, versions (OAT repo)
- Phase 3: 2 tasks — release readiness + publish boundary
- Phase 4: 4 tasks — environment provisioning (env repo)
- Phase 5: 2 tasks — org-layer plugin (pntr repo)
- Phase 6: 7 tasks — scenario matrix, e2e validation, audits, closure

**Total: 28 tasks**

Ready for implementation after plan review.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md` (incl. Operator Action Items checklist)
- Bruno execution learnings: bruno repo, `.oat/projects/shared/bruno-modernization-roadmap/oat-execution-learnings.md`
