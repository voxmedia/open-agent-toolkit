---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-06-26
oat_generated: false
---

# Discovery: brainstorm-visual-companion-v6

## Phase Guardrails (Discovery)

Discovery captures outcomes and constraints. Implementation file names appear only where they clarify scope boundaries agreed in the prior release review.

## Initial Request

Review Superpowers GitHub releases (currently through v6.0.3) for visual brainstorming functionality that OAT has largely ported one-to-one, identify gaps worth incorporating into the OAT brainstorm skillset, and execute the work via quick-start planning (discovery + plan, no full spec-driven workflow).

Session context: OAT's visual companion bundle was ported from **Superpowers v5.0.7** (see repo `NOTICES.md` and the `independent-brainstorming` project summary). Superpowers v6.0.0 shipped a major visual-companion security and resilience rewrite; v5.0.6 shipped server lifecycle fixes OAT already has; v6.0.3 is SDD-only and out of scope here.

## Clarifying Questions

### Question 1: Workflow shape

**Q:** Proceed without OAT project tracking, or use quick-start to capture discovery and a plan?

**A:** Use OAT quick start — capture discovery and write a plan.

**Decision:** This project (`brainstorm-visual-companion-v6`) tracks the work; implementation follows `plan.md` via `oat-project-implement`.

### Question 2: Scope boundary

**Q:** What belongs in this project vs. other OAT skills?

**A:** (Inferred from release review and user focus on visual brainstorming.)

**Decision:** Primary scope is the **visual companion Node bundle** and its **skill/reference docs** under `oat-brainstorm`. Superpowers SDD, writing-plans, harness bootstraps, and brainstorming→writing-plans terminal flow are out of scope. Optional skill-content improvements (e.g. synthesis self-review) are deferred unless trivial.

## Solution Space

OAT already diverges productively from upstream: Activation Contract, pack-aware destinations, conditional visual offer, and OAT persistence paths (`.oat/brainstorm/`). The gap is **technical parity** with Superpowers v6.0.x for the local web server, not re-adopting Superpowers' single-pipeline brainstorm model.

### Approach 1: Full v6.0.3 bundle port with OAT path adaptations _(Recommended)_

**Description:** Cherry-pick Superpowers v6.0.3 visual-companion scripts (`server.cjs`, `helper.js`, `start-server.sh`, `stop-server.sh`, `frame-template.html`) and adapt persistence/token paths from `.superpowers/brainstorm/` to OAT conventions (`.oat/brainstorm/.last-port`, `.last-token`, repo walk-up, user-scope fallback). Update `references/visual-companion.md` and `SKILL.md` step 3 for session keys, `--open`, restart semantics, and 4h idle default.

**When this is the right choice:** Security and reconnect behavior are the headline v6 changes; partial ports leave known vulnerabilities and brittle restarts.

**Tradeoffs:** Breaks byte-for-byte parity with v5.0.7 (document in `NOTICES.md`). Touches publishable bundled assets → lockstep public package version bump and `pnpm release:validate`.

### Approach 2: Security-only minimal patch

**Description:** Port only session-key auth, file sandbox, and security headers into existing OAT files without full helper/start-server v6 features.

**When this is the right choice:** If schedule is extremely tight and resilience features can wait.

**Tradeoffs:** Leaves restart persistence, stop-server instance-ID guard, status pill/tombstone UI, and Windows hardening gaps; higher merge cost later.

### Approach 3: Reimplement from scratch in OAT CLI

**Description:** Move server into `packages/cli` as `oat brainstorm visual-server` with TypeScript.

**When this is the right choice:** Long-term if the bash/Node bundle becomes unmaintainable.

**Tradeoffs:** Large scope; contradicts "ported not reimplemented" decision in `independent-brainstorming`; not justified for this increment.

### Chosen Direction

**Approach:** Full v6.0.3 bundle port with OAT path adaptations (Approach 1).

**Rationale:** v6 security model closes real local/remote exposure; resilience features match how agents actually use long brainstorm sessions; upstream MIT code is battle-tested. OAT-specific path and offer semantics stay as-is.

**User validated:** Yes — user chose quick-start to plan this work after the release review.

## Options Considered

### Option A: Pin upstream at v6.0.3 tag

**Description:** Copy files from `obra/superpowers` tag `v6.0.3` and apply mechanical `.superpowers` → `.oat` substitutions plus repo/user persistence rules from current OAT `start-server.sh`.

**Pros:**

- Clear provenance line in `NOTICES.md`
- Matches release notes the review was based on

**Cons:**

- Must re-apply OAT-only behaviors (repo walk-up, `~/.oat/brainstorm/` fallback, Codex foreground auto-detect)

**Chosen:** A

**Summary:** Port from v6.0.3 tag; preserve OAT persistence resolution order from current bundle.

### Option B: Skip Superpowers telemetry/branding

**Description:** Omit upstream telemetry hooks and Superpowers logo URLs when adapting `server.cjs`.

**Pros:** Keeps OAT neutral branding (frame template already says "Superpowers Brainstorming" — may rebrand to OAT in same pass)

**Cons:** Minor diff from upstream

**Chosen:** B for telemetry; rebrand frame header to OAT in the same implementation phase (cosmetic, low risk).

## Key Decisions

1. **Upstream version target:** Superpowers **v6.0.3** visual-companion scripts and docs (brainstorming skill server bundle only).
2. **OAT persistence:** Keep three-tier resolution (`--project-dir` → repo `.oat/` walk-up → `~/.oat/brainstorm/`); store `.last-port` / `.last-token` under the same prefix as sessions (repo or user scope), not `.superpowers/`.
3. **Skill behavior preserved:** Do not regress Activation Contract, conditional visual offer, or destination dispatcher — only update companion startup/usage prose and flags (`--open`, same `--project-dir` on restart).
4. **Publishable guardrail:** Bundled skill asset changes require lockstep bump of all five public packages and `pnpm release:validate` before merge.
5. **Testing:** Extend existing `visual-companion-smoke.test.ts` for session key, restart reuse, and stop-server instance-ID behavior.
6. **Deferred:** Inline synthesis self-review in `oat-brainstorm` step 8 (Superpowers v5.0.6 brainstorming skill change) — already lives in `oat-project-design`; not required for visual parity.

## Constraints

- Minimize scope: visual bundle + references + smoke tests + NOTICES/version/docs touchpoints only.
- Do not reformat upstream script files for oxfmt (existing ignore patterns for bundled scripts).
- Provider-linked skill views sync from `.agents/skills/oat-brainstorm/` via normal OAT sync — canonical edits under `.agents/skills/`.
- Live dogfood (`bl-7d5b`) remains a follow-up; this project delivers the port and automated smoke coverage.

## Success Criteria

- Visual companion requires session key on HTTP and WebSocket; file server rejects traversal/symlinks/dotfiles; security headers present.
- Restart with same `--project-dir` (or same repo context) reuses port/key so browser tab reconnects.
- Idle default 4 hours (configurable via `--idle-timeout-minutes`); stop-server verifies server instance ID before kill.
- Client shows connection status and paused overlay after extended disconnect (v6 helper behavior).
- `SKILL.md` and `visual-companion.md` document key URL, `--open`, restart, and idle semantics.
- `pnpm test` visual-companion smoke passes; `pnpm release:validate` passes after version bump.
- `NOTICES.md` updated to reference Superpowers v6.0.3 adapted port (no longer claims byte-for-byte v5.0.7 for all files).

## Out of Scope

- Superpowers subagent-driven development, writing-plans, task-reviewer, SDD workspace changes (v6.0.0–v6.0.3 non-visual release notes).
- Harness-specific bootstrap/tool-mapping (Kimi, Pi, Antigravity, Copilot SessionStart).
- Replacing OAT destination model with Superpowers design→spec→writing-plans pipeline.
- `oat brainstorm visual-server` CLI wrapper (deferred in original project; raw scripts remain).
- Live LLM dogfood scenarios (`bl-7d5b`) — separate backlog item.
- Synthesis self-review checklist in `oat-brainstorm` step 8 (deferred).

## Deferred Ideas

- **Synthesis self-review before handoff** — Superpowers v5.0.6 inline spec self-review adapted for `oat-brainstorm` step 8; low priority once visual parity ships.
- **CLI wrapper for visual server** — convenience command; not needed for parity.
- **Frame template full OAT visual rebrand** — beyond header text if design wants a distinct theme.

## Open Questions

- **User-scope token persistence:** When fallback is `~/.oat/brainstorm/`, should `.last-port`/`.last-token` live at `~/.oat/brainstorm/` root (mirroring repo layout)? **Assumption:** yes, for symmetric restart behavior outside a repo.
- **Frame title branding:** Rename "Superpowers Brainstorming" to "OAT Brainstorm" in frame template during port? **Assumption:** yes, cosmetic alignment with OAT product.

## Assumptions

- Superpowers v6.0.3 `skills/brainstorming/scripts/*` is the canonical upstream source set.
- Existing smoke test harness can assert keyed URLs and auth rejection without a full browser.
- No breaking change to agent workflows beyond requiring agents to use the keyed URL from `server-started` JSON (already how v6 upstream works).

## Risks

- **Regression in OAT persistence paths**
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Preserve current smoke tests for repo/user/`--project-dir` paths; add restart/key tests.

- **Publishable release validation failure**
  - **Likelihood:** Low
  - **Impact:** High (blocks merge)
  - **Mitigation:** Plan includes lockstep version bump + `pnpm release:validate` task.

- **Provider skill sync drift**
  - **Likelihood:** Low
  - **Impact:** Low
  - **Mitigation:** Bump `oat-brainstorm` skill `version:` in frontmatter; run `oat sync --scope all` before PR if needed.

## Next Steps

Proceed to quick-start **plan generation** (straight to plan — architecture is understood from release review; lightweight design skipped by user intent).
