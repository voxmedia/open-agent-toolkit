---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-08
oat_generated: true
oat_summary_last_task: p06-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-6-execution

## Overview

Wave 6 ("truthfulness residue") of the 2026-08-31 execution program: five
external plans that closed the program's remaining backlog items about
surfaces that claimed more than they knew, run as a thin wrapper project so
the fixes could execute in parallel worktrees with root-owned reviews, one
lockstep release bump (0.2.63 → 0.2.64), and full integration gates after every
fan-in. The motivating gaps were pack evidence that reported every provider
reachable from a hard-coded empty list, a final-PR skill that archived
in-progress reviews and opened PRs over dangling ledger rows, a config parser
that dropped a `__proto__` key on read and injected it in one command, skill
versions read from the top-level field alone so a `metadata.version`-only
skill reported no version, and no way to tell why a canonical skill was
missing from a provider's view. All five lanes merged; with this wave the
program's composed waves are complete (thirty of thirty-one plans done, one
parked and carried as `BL-260907-make-the-completion-seal`).

## What Was Implemented

- **Provider reachability evidence (p01).** A `provider-reachability` mapper
  feeds `projectPackEvidence` from real per-scope provider state; sync
  evidence is collected in-process (the spawned `--json` subprocess is gone);
  every production `providers: []` literal removed; the six dead diagnostic
  codes gain real emitters with a pinned severity matrix (exit codes derive
  from severity, never from the code name); `list`/`info` agree with
  `status`/`doctor` on user-agent materialization; a failed sync run reports
  as `partial` / exit 1.
- **Review-ledger paths before the final PR (p02).** `oat-project-pr-final`
  1.6.3 archives only terminal review rows (event identity, enumerated
  rewrites, idempotent names) and runs a fail-closed ledger-path guard before
  `gh pr create`: containment including symlink chains and `cd -P`, fenced and
  blockquoted rows skipped, per-table header recognition, an absent archived
  artifact excused only when `reviews/archived` was never materialized
  (`! -e` and `! -L`, with a stop for a non-directory), a missing `## Reviews`
  section and an escaped pipe in a ledger header or row are stops,
  `PRFINAL-05` registered.
- **`__proto__`-named config keys (p03).** `config/json.ts` keeps `parseTree`
  for error collection and materializes the tree iteratively into plain
  objects whose every own key is set with `Object.defineProperty`, so
  `__proto__` survives as an own data property and consumers receive ordinary
  objects; error contract unchanged, depth within one stack frame of the base;
  the injection, the `projects` sibling contract, and `unset` are pinned
  through the real `oat config` command. Decision record
  `DR-260907-oat-config-reads-materialize`.
- **`metadata.version` as the canonical skill version (p04).** One
  parsed-input contract (`parseSkillFrontmatter` with strict `uniqueKeys`,
  `resolveSkillVersion`: metadata first, top-level as alias, both-and-different
  → conflict) shared by the runtime helper, both validators, canonical-role
  resolution, and doctor; conflict is an error; alias-only a structural
  warning over all 82 bundled skills that never reaches the bump result;
  unusable or malformed declarations block on both the current and base side;
  `create-agnostic-skill` 1.4.2 and `create-oat-skill` 1.5.2 emit
  `metadata.version`; `contributing/skills.md` documents the order.
- **Provider-view diagnostics (p05).** `oat tools info <skill>` gains an
  additive provider-view section (human and JSON) from a pure
  `drift/skill-view-diagnostic.ts` mapper — `inactive`, `unsupported`,
  `excluded`, `untracked`, `unverified`, `missing-additive` (with a
  scope-correct repair), and manifest-backed additive/removed/modified classes
  — with copies compared through the shared version resolver on
  banner-stripped content, a manifest entry whose path diverges from the
  expected projection rendered honestly, an unreadable sync config or manifest
  degrading the scope to `unavailable` with a root-redacted reason, a failing
  provider degrading alone, and a real post-sync convergence case.
- **Final-review fix round (p06).** The root final review's Important and the
  fixable Mediums and Minors, fixed in two parallel lanes with
  reproduction-first probes, red-then-green controls, and two Codex rounds
  each; verified at source by the same reviewer in round 2.
- **Release.** Lockstep 0.2.63 → 0.2.64 in one fan-in bump with the
  `.oat/sync/manifest.json` restamp in the same commit; two decision records
  (`DR-260907-oat-config-reads-materialize`, `DR-260908-a-stop-whose-remedy-lies`).

## Key Decisions

- **OAT config reads materialize plain objects with own-key definition.**
  Recorded as `DR-260907-oat-config-reads-materialize`; supersedes the plan's
  null-prototype mechanism after its own STOP fired.
- **A STOP whose remedy lies inside the plan's own file scope is closed by a
  dated refresh, not a park.** Recorded as `DR-260908-a-stop-whose-remedy-lies`; p03 resumed the same day
  under the amended contract instead of parking to a later wave.
- **The alias warning runs over every bundled skill; the bump gate never sees
  it.** The structural validator's version-alias pass ignores the `oat-*`
  filter its other checks keep, so the two migrated template skills are
  covered while `check:skill-bumps` stays exit 0 (the plan's refresh
  amendment; the operator asked that the bulk migration off the top-level
  field follow as `BL-260904-migrate-bundled-skills-from`, raised to high).
- **Weaker-anywhere governs fix rounds.** p02's first fix accepted every
  absent path under the `local`/`synced` scopes because `git check-ignore`
  ignores those whole project trees; the archived-directory rule replaced it,
  and lane briefs now restate the rule for fix rounds.
- **A reviewer's suggested fix is a hypothesis.** The sentinel substitution the
  final review suggested for escaped pipes drew three Codex Criticals in the
  lane; the fail-closed stop that replaced it is strictly stronger, and the
  review's literal `! -e` needed `! -L` beside it.

## Design Deltas

- p03's mechanism changed under a dated post-STOP refresh (`03e1aa576`): plain
  objects with own-key `defineProperty` instead of null-prototype objects; the
  refresh's 5000-depth figure and the empty-content bullet are corrected at
  wave close.
- p04 rejects non-string version scalars rather than stringifying them
  (`version: 1.10` is a YAML 1.1 float); no bundled skill affected.
- p05 adds two view classes beyond the plan's four (`untracked`, native-read
  `in-sync`), carries no `strategy` on the expected projection, and offers a
  repair for a conflicting copy because the reviewer ran the repair and it
  worked.
- p01's `provider-inactive` fires only for a config-disabled provider (a
  never-detected provider produces no row); the plan's matrix row is corrected
  at wave close.

## Notable Challenges

- **Three false plan premises at recon** (p03's caller count, p04's pin set
  and the two 2026-09-06 decisions, the `oat-*` filter gap) were caught by
  executing each plan's current-state claims on the built CLI before dispatch
  and applied as dated refreshes; the plan gate still blocked once on the p04
  refresh amendment contradicting the plan's alias routing.
- **p03's STOP** fired mid-lane on two regressions the plan's own mechanism
  caused; resumed under the post-STOP refresh the same day.
- **p02's fix round introduced a Critical** (`git check-ignore` accepted
  everything for ignored project scopes) and needed two more fixes.
- **p05 depended on p04's resolver**: p04 merged first, the p05 worktree was
  rebased onto the merged tip, and its deferred Important landed as a third
  commit verified in a third round.
- **The root final review** (0C/1I/5M/14m) found a sync-config read failure
  silently dropping a provider-view section and a manifest-path divergence
  rendering a false claim; both fixed in Phase 06. The review's declared Minor
  count was one short of its bullets, so one finding was dropped until round 2
  recovered it.
- **The exit gate passed on attempt 1** (codex-5-6-sol-xhigh, 0/0/0/0) after
  reconsidering every deferral explicitly.

## Tradeoffs Made

- Alias warnings print 82 times per `oat:validate-skills` run until the
  migration item lands (plan-sanctioned bridge).
- The scaffold templates emit metadata-only frontmatter that two `^version:`
  regex readers cannot parse; fixing those readers is a blocking criterion on
  the migration item rather than a change in this wave.
- The escaped-pipe stop rejects two shapes the base accepted (a `\|` right of
  the Artifact column; a non-ledger header inside `## Reviews`) — fail-closed
  with zero corpus impact, carried as a low follow-up.
- `oat decision new` dates ids in UTC; both records this wave used
  `--created-at` and a follow-up decides local versus UTC.

## Follow-up Items

- `BL-260908-guard-normalized-config-maps` (medium) — normalizers reinstall a
  preserved `__proto__` key as a map prototype; sweep criterion added.
- `BL-260908-make-copy-strategy-skill` (medium) — copy-strategy directories
  report `drifted/modified` right after a successful sync (pre-existing).
- `BL-260908-validate-the-catalog-refresh` — validate the catalog-refresh
  policy state in `normalizeSyncEvidence`.
- `BL-260908-report-a-changed-skill-with-no` — a changed skill with no
  frontmatter block is skipped silently by the bump validator.
- `BL-260908-repair-or-exempt-archived` — 35 archived ledgers fail the new
  path guard (two genuinely dangling rows).
- `BL-260908-date-decision-record-ids` — local-date or documented-UTC ids.
- `BL-260908-keep-a-bare-proto-in-markdown` — oxfmt bolds a bare `__proto__`.
- `BL-260908-align-the-provider-view-json` (low) — `--json`/JSDoc/evidence and
  docs polish on the provider-view diagnostic.
- `BL-260908-tighten-the-pr-final-ledger` (low) — escaped-pipe boundary and
  scan-boundary prose.
- `BL-260904-migrate-bundled-skills-from` (high; next) — drop the top-level
  `version:` from every bundled skill; fix the two regex readers first.
- Plan corrections applied at wave close: p01 matrix row 2; p02 labels,
  citation, drift omissions; p03 depth figure, empty-content bullet, Outcome
  wording; p04 Step 6 pins and drift omissions.

## Associated Issues

- `BL-260903-populate-provider-reachability` — archived (p01).
- `BL-260903-pr-final-archives-reviews` — archived (p02).
- `BL-260903-preserve-proto-named-config` — archived (p03).
- `BL-260904-honor-metadata-version` — archived (p04).
- `BL-260904-diagnose-canonical-skills` — archived (p05).

## Workflow Observations

### 2026-09-07 · <project|general> · <bug|friction|worked-well|feedback> · <area>

````

Structural entries:

```text

### 2026-09-07 · structural · <producer> · <ref>
````

## Entries

Entries are chronological and append-only.

### 2026-09-07 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-6-execution/reviews/artifact-plan-review-2026-09-07T235418Z.md run=e5ddc829-41d7-410f-8e6e-d1b96ea442b6

### 2026-09-08 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-6-execution/reviews/artifact-plan-review-2026-09-08T001147Z.md run=8d154521-b9de-4949-a78f-a393bcef2991

### 2026-09-08 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-6-execution/reviews/final-review-2026-09-08T072250Z.md run=f458f4c1-dbf0-4fa2-b0d0-1b99593c4fd1
