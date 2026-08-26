---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-08-26
---

# Orchestration Log: wave-2-execution

Running log of orchestration and subagent observations for this project (see
the Wave 1 log for the full logging contract). Append-only; structural entries
are one-liners referencing artifacts by path; tag skill-relevant entries with
**Skill signal (strengthens/contradicts/gap):**. Run `pnpm exec oxfmt --write`
on this file after writing.

---

## Entries

### 2026-08-26 · structural · oat-wave-execute · preflight

BASE_SHA=1bd5424b48af0f1cd385ce42246952d16ab438f7 (origin/main after W1 close);
`oat project new wave-2-execution --mode quick --no-commit`; `pnpm run
worktree:init` exit=0, `pnpm build` exit=0, `pnpm type-check` exit=0.

### 2026-08-26 · general · friction · worktree:init clobbers activeProject

`scripts/worktree/init.sh` copies `.oat/config.local.json` from the primary
checkout, so running it after `oat project new` reset `activeProject` to null;
restored with `oat config set activeProject`. Rule: run `worktree:init` before
scaffolding (W1 order), or re-set the pointer afterwards.
**Skill signal (gap):** the wave skill's Step 1/3 order should state
"bootstrap before scaffold" explicitly.

### 2026-08-26 · structural · oat-gate-review · plan gate round 1

Run `a0c09a83-2479-43ec-b693-dd1493dc5474` (`cursor-gpt-5-6-sol-xhigh`) →
`blocked`: 0C/2I/0M/0m. I1 `oat_parallel_execution: false` (wave contract
requires `true` even for a solo lane) → fixed in state.md; I2 task Step 2
restated source-plan details (bump/asset regeneration) → reduced to "Execute
the source plan in full." Both resolved in-artifact; artifact archived at
`reviews/archived/artifact-plan-review-2026-08-26T192011Z.md`; gate re-run
(remediation attempt 1 of 2).

### 2026-08-26 · structural · oat-gate-review · plan gate round 2

Run `492c318d-178b-4f78-b7be-d5f402d2732c` (`cursor-gpt-5-6-sol-xhigh`) →
`blocked`: 0C/2I. I1 release surfaces (five manifests, lockfile, versions
asset) outside the in-worktree recheck + no fresh fetch before
`release:check-versions` → rule-1 addendum extended and fetch step added;
I2 Implementation Complete checklist order contradicted the closeout sequence →
reordered and made explicitly dependent. The runner process was stopped
externally after the gate had completed; artifact recovered by runId (rule 8).
Artifact archived; gate re-run (remediation attempt 2 of 2).
**Skill signal (strengthens):** the drift-coverage audit must include the
release surfaces a plan writes, not only the files it reads.

### 2026-08-26 · structural · oat-phase-implementer · p01

`w2-p01-impl-001` → DONE; commit `b257e908` (12 files incl. lockstep bump
0.2.33→0.2.34); DoD 8/8 post-commit; codex (0.149.1) zero findings; one
pre-commit vitest timeout flake (post-implement-sequence contracts) cleared by
a no-edit rerun.

### 2026-08-26 · general · feedback · release:check-versions is post-commit-only evidence

The gate diffs committed HEAD against `origin/main`, so before the bump commit it
reports "no public package changes"; only the post-commit run exercises the
strict-greater guard. **Skill signal (gap):** brief template should say "run
release gates after the task commit as the load-bearing evidence".

### 2026-08-26 · structural · oat-reviewer · p01 rounds 1–2

Round 1 `w2-p01-review-001` → 0C/0I/1M/4m (reorder+delete mutations red);
fix round `023c2229` resolved M1 by construction (restamp derived from the
diagnostic); round 2 `w2-p01-review-002` → 0C/0I/0M/2m, all dispositions
verified, MUT-E desync caught only by the new coupling test. Row `p01` →
`passed`; two minors deferred with rationale.
**Skill signal (strengthens):** delete+reorder mutation requirement — the
round-1 reorder mutation exposed the unpinned restamp-only path.

### 2026-08-26 · structural · oat-wave-execute · final DoD

Head `4c04963c`: check 0 · type-check 0 · test 0 (152s; 273 files / 3686) · build 0 ·
check:skill-bumps 0 · release:check-versions 0 (after `git fetch origin`) ·
release:validate 0 · build:docs 0.

---

## End-of-run synthesis (2026-08-26)

### 1. Convention verdicts

- **Thin wrapper / pointer-only tasks:** held after two plan-gate rounds
  removed a restated source-plan step and set `oat_parallel_execution: true`
  for a solo lane (the wave contract's literal requirement).
- **Drift refresh + release-root intersection (W1 rule 2):** held and paid off —
  the bump was pre-planned; the plan gate still found two coverage gaps
  (release surfaces the plan writes; fetch-before-`release:check-versions`),
  now codified in the wrapper's rule-1 addendum.
- **Absolute paths / no bare cd (W1 rule 1):** held; zero incidents.
- **Literal gate invocation + per-gate exit logs (W1 rule 3):** held; note the
  implementer's observation that `pnpm exec oxfmt --check <files>` silently
  drops file arguments — use the direct binary.
- **Delete + reorder mutations (W1 rule 4):** decisive again — the reorder
  mutation exposed the unpinned restamp-only path (round-1 Medium); the
  reviewer's desync mutation (MUT-E) is now caught only by the coupling test.
- **Bootstrap before scaffold:** violated once (activeProject reset); recorded.
- **Gate resilience:** one gate runner was stopped externally after the gate
  had completed; artifact recovered by runId (rule 8) without a relaunch.

### 2. Skill-signal rulings

- worktree:init clobbers activeProject → **skill change:** Step 1/3 order
  "bootstrap, then scaffold" (or re-set the pointer).
- release:check-versions is post-commit-only evidence → **brief template
  change:** run release gates after the task commit as load-bearing evidence.
- drift-coverage audit must include written release surfaces → **skill
  change** (already applied to this wave's plan).
- delete+reorder mutations → keep mandatory (strengthens).

### 3. Adjustments adopted for W3–W4 (rules)

1. Bootstrap the worktree before `oat project new`; verify `activeProject`
   before any lifecycle command.
2. The wrapper plan's rule-1 addendum always lists the release surfaces the
   source plan writes and requires `git fetch origin` before
   `release:check-versions`.
3. Briefs state that the post-commit `release:check-versions` run is the
   load-bearing evidence for a lockstep bump.
4. Use direct `./node_modules/.bin/oxfmt` / `oxlint` for file-scoped checks.

### 4. Graduated-entries ledger

- Sibling commands restamp `oatVersion` silently (round-1 m4) → backlog
  candidate: open-with-owner (root; file at wave close).
- `ScopeSyncPlan.versionSkew` optional-field hazard (p01-r2-m1) → carried in
  `implementation.md` Deferred Findings.
- Source-plan wording drift (p01-r2-m2) → recorded; plan immutable.
- Plan-gate rounds 1–2 findings → closed-with-evidence (`b53a8d06`).

Roll-up: summarized in `summary.md` `## Workflow Observations` before any
archive step.

## Exit-gate boundary (2026-08-26)

Configured implement exit gate (`claude-fable-skip-permissions`, `--avoid none`, 40-minute ceiling) blocked in generation 1 after two completed attempts:

- Attempt 1 — run `4199a1c1`, 21:19:12Z–21:22:34Z, `targeting_correlation_failed`. The gate child launched `pnpm check`/`type-check` in the background, armed a waiter, and ended its turn ("Waiting for the monitor events") — in headless mode that ends the process, so no artifact was written.
- Attempt 2 — run `baa84df9`, runner launched as an orchestrator background task and killed by the host ~90 s in (third external runner kill this session); no envelope, no receipt, no artifact; not counted as a completed attempt.
- Attempt 3 — run `a31a6325`, launched detached (`nohup … & disown`; macOS has no `setsid`), 21:27:14Z–21:31:45Z, `targeting_correlation_failed`. The child completed the substantive review (source read, focused suites, two end-to-end CLI probes, docs check, `apply.ts:187` confirmed) and then backgrounded the full DoD chain behind a waiter and ended its turn one step before writing the artifact. Its background `check`/`type-check` recorded exit 0 before the process tree died.

Evidence: receipts `w2-exit-gate-20260826T211845Z`, `…T212345Z`, `…T212619Z` in the session scratchpad; gate-written project-log entries `56f19f0f`, `72e840cd`; child transcripts `283c13cb`, `1a35011f`, `96f809f2` under the project's Claude transcript directory.

Disposition: `onFailure: block`, `maxAttempts: 2` reached with no review verdict. The failure is the gate target's headless behaviour (backgrounding long gates then yielding), not a finding against the wave, and an identical relaunch reproduces it (3 of 3 children). Replacing the route, prompt, or provider is outside the run's authority, so this is a boundary for the operator: either re-authorize the same gate with the target/prompt adjusted to run DoD gates inline, or authorize a documented gate disposition. W1's two generations of this same gate passed on 2026-08-26 (runs `b20f4349`, `8485a4f9`), so the regression is in the child behaviour introduced since, not the gate configuration.

Rule for W3–W4 (pending operator input): before launching the exit gate, confirm the gate target's headless run cannot yield on background work — if the harness exposes background/monitor tools to the child, the gate prompt must forbid them or the target must run the DoD inline.
