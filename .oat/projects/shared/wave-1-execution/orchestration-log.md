---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-08-26
---

# Orchestration Log: wave-1-execution

Running log of orchestration and subagent observations for this project. Two
audiences: (1) evaluating this wave's execution specifically, and (2) collecting
general feedback on OAT orchestration/tooling and on the `oat-wave-execute` skill
itself — bugs, friction, and things that worked well.

**Logging contract (for the orchestrator and any lifecycle skill touching this
project):** append an entry whenever something breaks, surprises, requires a
workaround, or works notably well. Structural entries (dispatch stamps, gate
results, STOP/park events, bootstrap statuses, disposition maps) are appended as
one-liners referencing artifacts by path; judgment entries are agent-authored.
Never delete entries; strike through with a correction note if one turns out
wrong. Version-stamp tool-related observations. Keep entries short and factual.
Run `pnpm format:fix` (or `pnpm exec oxfmt --write <file>`) on this file after
writing. Tag entries that bear on the wave-skill's design with a
**Skill signal (strengthens/contradicts/gap):** line — those drive the upstream
implementation.

**Entry format:**

    ### YYYY-MM-DD · [project | general] · [bug | friction | worked-well | feedback] · <area>
    What happened (1-3 sentences). Impact/workaround. Follow-up (backlog / upstream / none).

**Structural entry format (skill-appended):**

    ### YYYY-MM-DD · structural · <skill> · <scope>
    One-line mirror of the skill's structured output. Reference artifacts by path.

---

## Entries

### 2026-08-26 · project · friction · preflight

Local `main` could not be fast-forwarded from this linked worktree
(`git fetch origin main:main` refuses a branch checked out in the primary
checkout); fast-forwarded the clean primary checkout with
`git -C <primary> merge --ff-only origin/main` instead. Follow-up: none.

### 2026-08-26 · general · friction · sync manifest restamp

`pnpm run worktree:init` (oat 0.2.32) restamped `.oat/sync/manifest.json`
`oatVersion` 0.2.29→0.2.32 on the fresh integration branch; committed
separately as `chore(sync): restamp manifest oatVersion to 0.2.32` so the tree
was clean before scaffolding. This is the provenance-skew class W2 addresses.
**Skill signal (strengthens):** rule 3 (clean orchestrator tree before merges)
and the sync-commit inspection guard. Follow-up: none (W2 lane).

### 2026-08-26 · structural · oat-wave-execute · preflight

BASE_SHA=bf7aff9cbdbbd28d5709b93dbf0af2312cb0eb22 (origin/main after PR #208);
`pnpm run worktree:init` exit=0, `pnpm build` exit=0, `pnpm type-check` exit=0.
Scaffold: `oat project new wave-1-execution --mode quick --no-commit`
(`--no-commit` present on oat 0.2.32).

### 2026-08-26 · structural · oat-gate-review · plan gate

Two launches of the configured `oat-project-plan` gate (runIds
78c8d6e8-9dab-438c-8d13-a87f9b3215ac, b4dd4619-35f6-41ec-942b-127a2fef6ea8)
selected `cursor-gpt-5-6-sol-xhigh` and returned
`review_failed / unexpected_post_selection_failure` (Cursor team usage limit;
resets 2026-09-01). Evidence:
`references/plan-gate-launch-failures-2026-08-26.md`. Reviews row `plan`
remains `pending`.

### 2026-08-26 · general · bug · gate target selection

The gate availability probe is `cursor-agent --version`, which succeeds while
the provider account is quota-exhausted, so the gate deterministically selects
a target that cannot run and offers no post-selection fallback to the next
priority target. Impact: the whole program blocks on an operator config/quota
action. Follow-up: backlog candidate — gate exec-target selection should
either probe entitlement (a cheap real invocation) or fall through to the
next available target on a pre-child provider rejection.
**Skill signal (gap):** `oat-wave-execute` rule 8 covers gate timeouts but not
pre-child provider rejections; add "rejection before any reviewer output ⇒
launch defect; do not spend remediation attempts; report as boundary".

### 2026-08-26 · structural · oat-gate-review · plan gate passed

Third launch (runId 78a49137-a275-4bd3-8135-e5f27d757e24, target
`cursor-gpt-5-6-sol-xhigh`, after the operator raised the Cursor limit)
returned `ok / review_completed_gate_passed`: 0 critical, 0 important,
0 medium, 0 minor. Artifact
`reviews/archived/artifact-plan-review-2026-08-26T125608Z.md`; Reviews row
`plan` → `passed` (receive: gate judgment sweep, nothing to disposition).
Blocker `plan-gate` cleared.

### 2026-08-26 · structural · oat-wave-execute · group 1 bootstrap + dispatch

`bootstrap-group.sh wave-1 4b44635f p01 p02`: both `status=success`,
`view-parity=ok`, `sync_commit: skip`, `git_clean=pass` (script 1.3.0 relocated
its logs to `$TMPDIR/oat-bootstrap-logs/wave-1-p0N`). Implementers dispatched
natively (`oat-phase-implementer`, `model: opus`) with resolver-pinned stamps
recorded in `implementation.md` Run 1 (`w1-p01-impl-001`, `w1-p02-impl-001`).

### 2026-08-26 · general · worked-well · resolver + stamp formatter

`oat project dispatch-ceiling resolve … --json` plus the repo's
`formatDispatchStamp` (run via a tsx shim against
`packages/cli/src/providers/identity/stamp.ts`) produced grammar-stable stamps
without hand assembly. **Skill signal (gap):** the resolver JSON carries no
`dispatchStamp` field; a `--stamp` output or a CLI formatter entry point would
remove the shim. Follow-up: backlog candidate.

### 2026-08-26 · structural · oat-phase-implementer · p02

`w1-p02-impl-001` → DONE_WITH_CONCERNS; commit `c8fdefc3` (4 files, +449/−1);
focused suites pass; DoD 6/8 (release:check-versions=1, release:validate=1);
codex review (0.149.1) 1×P1 confirming the same lockstep contradiction;
Recovery Event p02-rec-001 direction-required → root direction: wave-level
lockstep bump to 0.2.33 after fan-in (`implementation.md` Run 1).

### 2026-08-26 · general · friction · release gate vs test-only changes

Any change under `packages/cli/src/**` — including `*.test.ts` excluded from the
published tarball — counts as a publishable change for `release:check-versions`
(`versionPolicyIgnorePatterns: ['assets/**']`). Impact: a test-only lane forces
a five-package lockstep bump; the wave discovery assumed none. Workaround:
one root-owned bump at integration. Follow-up: backlog candidate — decide
whether test-only paths should be version-policy-ignored (policy decision, not
taken here). **Skill signal (gap):** `oat-wave-execute` drift refresh should
intersect each plan's write surface with the repo's release change-detection
roots, not only with sibling plans.

### 2026-08-26 · structural · oat-reviewer · p02 round 1

`w1-p02-review-001` (opus, auto) → 0C/0I/1M/3m; artifact
`reviews/archived/p02-review-2026-08-26T133911Z.md`; probes P1–P10 incl. a
2187-case weaker-anywhere differential (`weaker=0`). All four findings converted
to one bounded fix round (`implementation.md` "Review Received: p02 (round 1)").

### 2026-08-26 · project · bug · orchestrator cwd drift

A compound `cd .worktrees/wave-1/p02 && …` verification call persisted the shell
cwd, so the next root bookkeeping commit (`6c2a8a30`) landed on `wave-1/p02` and
relative lookups ran from the wrong checkout. Repaired by cherry-picking onto
`wave-1-execution` (`588d3254`) and resetting `wave-1/p02` to the reviewed
`c8fdefc3` (the misplaced commit touched only `.oat/projects/`). Rule adopted:
every orchestrator command uses absolute paths / `git -C`; no bare `cd`.
**Skill signal (strengthens):** rule 5's absolute-path merge guard should be
generalized to all root commands, not only merges.

### 2026-08-26 · structural · oat-phase-implementer · p01

`w1-p01-impl-001` → DONE_WITH_CONCERNS; commit `aedced64` (1 file, +195/−4);
DoD 10/10 + test:smoke green; codex review (0.149.1) 3×P2 fixed pre-commit with
mutation proofs; concern: signal deadline 60s / reap 15s after one >10s outlier.

### 2026-08-26 · general · friction · parallel timing lane vs build-heavy lane

Concurrent p02 builds/tests (load avg 14+ on 14 CPUs) made p01's
timing-sensitive smoke gate intermittently red at a 10s bound; the lane spent
its one bounded correction recalibrating (60s/15s, ~35× observed worst case).
**Skill signal (gap):** group composition should weigh CPU contention for
timing/signal lanes, not only write-surface disjointness. Follow-up: none
beyond the log.

### 2026-08-26 · general · bug · zsh gate loop

`pnpm $cmd` in a zsh loop does not word-split, so `check:skill-bumps` reported
exit 254 ("Command not found") — a false gate failure until invoked literally.
Follow-up: brief template should say "invoke each gate literally".

### 2026-08-26 · structural · oat-reviewer · p02 round 2 (narrowed)

`w1-p02-review-002` (opus, auto, range `c8fdefc3..b486beb6`) → 0C/0I/0M/1m; all
four round-1 dispositions verified fixed; minor p02-r2-m1 deferred with
rationale (`implementation.md`). Row `p02` → `passed`. Artifact
`reviews/archived/p02-review-2026-08-26T135641Z.md`.

### 2026-08-26 · structural · oat-reviewer · p01 round 1

`w1-p01-review-001` (opus, auto) → 0C/1I/1M/2m; artifact
`reviews/archived/p01-review-2026-08-26T140159Z.md`; STOP #1 assessed not
indicated. All four converted to one bounded fix round (`implementation.md`
"Review Received: p01 (round 1)").

### 2026-08-26 · general · worked-well · reviewer-designed adversarial probes

The p01 Important (post-detach re-reap that can never settle, losing the
diagnostic and leaking temp dirs) was found ONLY by the reviewer's own probes
(C1/C2/D) and mutation probes (E1/E2) — every implementer gate, the pinned
tests, and three codex passes were green. **Skill signal (strengthens):**
DR-260715-adversarial-probe-reviewer — keep the mandatory reviewer-designed
probe for logic-bearing lanes.

### 2026-08-26 · structural · oat-reviewer · p01 round 2 (narrowed)

`w1-p01-review-002` (opus, auto, range `aedced64..6a9ed1af`) → 0C/0I/1M/3m; I1
verified fixed; M1 partially fixed (reorder mutation E2b still green). All four
converted to fix round 2 (`implementation.md`). Artifact
`reviews/archived/p01-review-2026-08-26T143550Z.md`.

### 2026-08-26 · general · feedback · mutation-class coverage

Round-1's "cover the ordering" fix guarded deletion but not reordering; the
round-2 reviewer's reorder mutation (E2b) caught it. **Skill signal (gap):**
reviewer briefs for ordering/containment claims should ask for both delete-
and reorder-class mutations, not "a mutation".

### 2026-08-26 · structural · oat-reviewer · p01 round 3 (narrowed, final)

`w1-p01-review-003` (opus, auto, range `6a9ed1af..fd8c7cb9`) → 0C/0I/0M/2m; all
round-2 dispositions verified fixed; two minors deferred with rationale. Row
`p01` → `passed`. Artifact `reviews/archived/p01-review-2026-08-26T150044Z.md`.
Phase history: 3 append-only commits, one file.

### 2026-08-26 · structural · oat-wave-execute · group 1 fan-in

Merges `c5c32345` (p01), `872a06be` (p02) — no rebase (disjoint surfaces;
reviewed SHAs preserved); lockstep bump `4fa530e6`; integration DoD 10/10 exit 0
at `4fa530e6` (`pnpm test` 173s). Gate runner stopped externally after gate 6;
gates 7–10 re-run to completion before bookkeeping. Worktrees/branches removed.

### 2026-08-26 · general · bug · recap durability vs pre-commit formatter

The project-recap built cleanly (real Chromium, visual review pass) but the
dedicated finalizer's artifact commit ran lint-staged `oxfmt --write` over the
immutable package, changing 9/27 hashed files → `recordDurability` 9×
hash-mismatch → terminal `built-not-durable`. Originals unrecoverable. Fixed
forward with formatter ignore patterns + lint-staged flag (`9f906e1d`).
**Skill signal (strengthens):** rule 7 (formatter-ignored × staged-glob) applies
to explainer run packages; the adapter's finalizer should refuse to commit
through formatting hooks or verify bytes post-commit before attesting.
Follow-up: backlog candidate (adapter finalizer byte-verification).

---

## End-of-run synthesis (2026-08-26)

### 1. Convention verdicts (evidence: entries above)

- **Thin wrapper + pointer-only tasks:** held. Neither source plan was narrowed;
  the one reconciliation (p02 rule-1 addendum) was non-narrowing and the plan
  gate confirmed it.
- **Wave-boundary drift refresh (rule 2):** held for code drift (2 PASS, empty
  intersection) but missed a non-code hazard: release change-detection roots
  (test files under `packages/cli/src/`) — see the friction entry. Verdict:
  extend the intersection check.
- **Rule 3 (clean orchestrator tree) / rule 5 (absolute paths):** violated once
  by cwd drift (commit `6c2a8a30` on the wrong branch); repaired append-only.
  Verdict: generalize rule 5 to every root command (`git -C`, absolute paths).
- **Rule 6/8 (gate scope & diagnostics):** the plan gate hit a pre-child
  provider rejection twice (Cursor usage limit) — a class rule 8 does not name.
  Verdict: add "rejection before any reviewer output ⇒ launch defect; no
  remediation attempts; boundary".
- **Rule 10 (integration gates after fan-in):** held; all green; no cumulative
  defect surfaced, but the runner-stop showed the value of per-gate exit logs.
- **Rule 11 (append-only fix rounds):** held across 3 fix commits; every
  reviewed SHA stayed immutable.
- **Rule 12 (pipefail/exit capture):** held; a zsh `pnpm $cmd` word-split bug
  produced one false gate failure in a lane (worked around by literal
  invocation).
- **Reviewer-designed adversarial probes:** decisive. p01's Important (post-
  detach unsettleable reap) and p01-r2's Medium (reorder mutation) were found
  only by reviewer probes; every implementer gate and codex pass was green.
- **Cross-model review (codex):** cheap and corroborative (p02 P1 confirmed
  the lockstep contradiction; p01 3×P2 pre-commit). One record discrepancy
  (`--uncommitted` vs `--commit` invocations) recorded without harm.

### 2. Skill-signal rulings

- Gate target selection (gap) → **upstream:** availability probe should reach
  entitlement or fall through on pre-child rejection; wave skill rule 8 addendum.
- Stamp formatter (gap) → **upstream backlog candidate:** resolver `--stamp`.
- Drift refresh vs release roots (gap) → **skill change:** intersect write
  surfaces with `findChangedWorkspaceDirs` roots; warn when a test-only lane
  forces a lockstep bump.
- CPU contention for timing lanes (gap) → **skill change:** group composition
  weighs contention for signal/timing lanes.
- Delete-and-reorder mutations (gap) → **skill change:** reviewer brief asks
  for both mutation classes on ordering claims.
- Absolute-path rule (strengthens) → **skill change:** rule 5 generalized.
- Adversarial probe rule (strengthens) → keep mandatory.

### 3. Adjustments adopted for W2–W4 (rules)

1. Every root command uses absolute paths or `git -C`; never a bare `cd`.
2. Drift refresh reports each lane's release change-detection roots and flags
   any lane that will force a lockstep bump; the wave plans the bump up front.
3. Implementer briefs say "invoke each gate literally" and capture exit codes
   per gate to a log file; the root reads the log, never the stream.
4. Reviewer briefs for ordering/containment claims require delete- AND
   reorder-class mutations.
5. Gate launches: a pre-child provider rejection is a boundary after one
   identical retry — do not spend remediation attempts.

### 4. Graduated-entries ledger

- Gate selection / entitlement probe → backlog candidate (file at wave close on
  main): open-with-owner (root).
- Resolver `--stamp` → backlog candidate: open-with-owner (root).
- Test-only paths vs `versionPolicyIgnorePatterns` policy decision → backlog
  candidate: open-with-owner (operator; policy).
- p01 deferred minors (p01-r3-m1/m2), p02 deferred minor (p02-r2-m1) →
  carried in `implementation.md` Deferred Findings for final-review resurfacing.
- Plan-gate launch failures → closed-with-evidence (`references/plan-gate-launch-failures-2026-08-26.md`).
- cwd drift incident → closed-with-evidence (repair commits `588d3254`).

Roll-up: these observations are summarized in `summary.md` `## Workflow
Observations` before any archive step.
