---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_generated: true
oat_summary_last_task: p20-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-7-execution

## Overview

Wave 7 ("post-program corrective lanes") of the 2026-08-31 execution program:
twenty external plans composed after the program's W1–W6 closed and the
metadata-version migration merged, run as a thin wrapper project so the fixes
could execute in parallel worktrees (six groups of three plus two solo lanes
under a concurrency ceiling of three) with root-owned reviews, one lockstep
release bump (0.2.66 → 0.2.67), and full integration gates after every
fan-in. The lanes closed the corrective items the program's own reviews had
filed: a synced archive script that never ran through a symlinked install, a
config command that could not remove a malformed value, a formatter that
rewrote a bare `__proto__` literal into bold, a completion seal that failed on
replay, config maps that reinstalled a preserved `__proto__` key as a
prototype, a release contract that guarded one bundle directory of seven,
a doctor example that described an impossible state, a wrong-typed docs root
that vanished in silence, a symlink warning that blamed the filesystem, stray
fences that hid normative skill prose, four docs-index follow-ups, a status
command that lost its native-skill adoption, four version-validator gaps, a
sync failure that reported "No changes required.", a copy-strategy projection
that never read in sync, a readiness contract with a decodable scanner, gates
CI never ran, skill-authoring claims no test backed, and plan authoring that
could drift below the caller's model class. Nineteen lanes merged; p16
(dispatch baselines after journaling) parked on a plan STOP because the
recorder graph's no-process guard forbids the plan's git seam, and its item
returns to planning as a decision.

## What Was Implemented

- **finalize-synced-archive reads stdin through an fd (p01).**
  `readFileSync(0)` replaces the stream reader and the main-module guard
  canonicalizes both sides, so the synced deferred-clear path runs through a
  symlinked install; a seven-case CLI entry-point test; `oat-project-complete`
  1.7.10.
- **`oat config unset` removes a malformed value (p02).** Three repair keys
  unset behind a targeted strict barrier that leaves every untargeted surface
  and the `pjm.remote` raw-write branch validated exactly as before; the
  env-override refusal uses the exported `resolveEnvOverride`; `adopt`
  resolves its surface flags through the shared resolver.
- **A repository Markdown guard for bare `__proto__` literals (p03).** A
  block-scoped CommonMark classifier (container-aware fences, HTML block types
  1–7) rejects the literal outside code spans under `.oat/repo/**` and the
  docs tree, with an invariant test derived from real `oxfmt --write`; seven
  pre-existing occurrences repaired.
- **An idempotent completion seal (p04).** `checkProjectLog` reports `sealed`,
  a replayed seal returns `already-appended`, and any new content appended to a
  sealed log is refused through a thrown `ProjectLogSealedError` mapped at the
  command layer; the parked wave-5 p09 work (durable archive receipt validator
  and resume routing) is unparked byte-exact; the summary and retro skills
  route around the refusal.
- **Own-key config maps (p05).** `getOwnKey` / `setOwnKey` guard every map
  rebuilt from parsed config data (normalizers, exec-target merges, config and
  gate lookups, the ceiling layers, the dispatch report); a global
  prototype-pollution path in `buildResolvedConfigAggregate` is closed;
  `--provider __proto__` rejects cleanly; the materialization decision record
  names every site.
- **Every required bundle directory guarded (p06).** A correspondence test
  over the exported `REQUIRED_BUNDLE_DIRECTORIES` with real-tarball pack
  controls per directory.
- **A doctor example the doctor can report (p07).** Every pack in exactly one
  of installed / available, backed by a disjointness case whose extractions
  must be complete; `oat-doctor` 1.2.4.
- **A wrong-typed `documentation.root` warns (p08).** `readOatConfigWithWarnings`
  carries the warning through a sink; `config get` and `list` read once and
  print it once (stderr, or a `warnings` array under `--json`); the value
  still falls back to the default.
- **The symlink exclusion warning names the resolved target (p09).** Or the
  on-disk spelling for a case-only mismatch; the `absent` message byte-identical;
  a 16-scenario differential shows no inert entry became effective.
- **Stray fences repaired and the scanner widened (p10).** Five skill assets
  repaired with prose byte-identical apart from fence markers; the scanner in
  `named-skill-load-contract.test.ts` walks 205 files recursively with an
  inventory floor, an after-prose defect shape, and a propagating `readdir`
  failure.
- **Docs-index follow-ups closed (p11).** A `Docs source index` bullet for both
  frameworks, a role-aware hop-cap refusal, a distinct empty-manifest line
  naming the exclusion count, and `excludes` / `instructionPointerExcludes`
  defaults in `DEFAULT_SHARED_CONFIG`.
- **`oat status` persists native-skill adoption (p12).** The first adopt and a
  confirmed `replaceCanonical` retry set `manifestChanged`; a native adopt
  adds no row; `keep` never writes; the checklist-abort harness really aborts.
- **Version-validator gaps closed (p13).** Agent roles version-gated, an
  unresolvable version a finding, the alias promotion a structural error while
  the bump gate still accepts an alias-only skill with a valid bump, and
  `check:skill-bumps` covering whole skill directories (everything but
  `tests/`) with NUL-safe paths; `AGENTS.md` and the contributing docs say so.
- **A rejected sync apply reports partial failure (p14).** The failure arm wins
  before the restamp-only ternary.
- **Copy-strategy projections converge (p15).** The banner-and-sentinel-aware
  directory hash is extracted into `engine/managed-copy-hash.ts`, hardened
  against symlinked roots and sentinels, and shared by the drift detector, the
  planner, and the retirement classifier.
- **p16 — parked.** Dispatch baselines after journaling: the recorder graph's
  no-process guard forbids the plan's git seam; partial steps 2–3 preserved
  under `parked/wave-7-p16/`.
- **The readiness contract hardened and the ledger vocabulary settled (p17).**
  `composed` / `in-progress` / `merged` are the only wave statuses; the
  source-declaration scanner runs the fence machine first, recognizes
  declarations only at an original column 0, decodes labels for
  CommonMark-bounded character references only and destinations once for
  unreserved characters, restricts HTML-block openers to CommonMark's
  conditions, and carries hidden-ness out of band; the acceptance set is the
  base's plus exactly four enumerated widenings, pinned against a 79-row
  differential and a 50,625-document sweep; the prospective floor is 18.
- **Skill-asset formatting and the worktree-init test inside CI's gates
  (p18).** `pnpm check` runs `format:root` over the skills tree, the docs, and
  `tools/smoke`; `pnpm test` runs `test:scripts` last; lint-staged formats
  `*.{mjs,cjs}`; `AGENTS.md` states the true remaining gap.
- **Skill-authoring facts corrected with named backstops (p19).** The
  500-character rule is `oat-*`-only, `allowed-tools` is comma-separated by
  convention, a bare `oat sync` defaults to `--scope all`, the Codex guidance
  quotes the live page with verification dates, the emitted template carries
  no unsourced provider claim, and the duplicated frontmatter matrix is
  consolidated; `create-agnostic-skill` 1.5.0, `create-oat-skill` 1.5.4.
- **Final-review fix round (Phase 21).** The completion seal routes on
  structure before the idempotency short-circuit and the skill re-verifies
  `sealed: true`; the project-log parser is LF-only and every validator refuses
  CR / U+2028 / U+2029 (a log two readers resolve differently fails closed);
  `synthesize` honors the seal and the lock; the directory digest is
  length-framed under a domain tag with the marker file required, plus a
  read-once compatibility bridge for existing manifests; `turbo.json` hashes
  the record surfaces; the fence scanner follows in-repo symlinks; the
  authoring skills state the alias error; `oat-wave-execute` gains a closeout
  gate step.
- **Plan writes stay on the caller's model class (p20).** The rule is written
  in `oat-repo-improve` Step 2, `oat-wave-execute`'s reconciliation contract,
  and the `repo-improve` docs page, pinned by a bundled-docs contract case;
  `oat-wave-execute` 1.9.2.

## Key Decisions

- **A STOP whose remedy lies inside the plan's file scope is refreshed; an
  architectural remedy is parked.** Applied four times (p02, p05, p15, p17)
  and once the other way (p16), each as a dated entry in the plan's
  `## Revalidation Before Execution` authored by the root.
- **Enumerated widenings are the acceptance contract for a scanner change
  (p17).** Every rendered-text-equivalent widening the differential or the
  reviewer's sweep found was either enumerated by the root with a pinned
  minimal witness — (c) label character references, (d) a whole-line comment
  before a continuation — or rejected; nothing widened silently.
- **The seal refusal is a thrown error, not a fourth result variant (p04).**
  `gate/index.ts` narrows `result.status`; the thrown `ProjectLogSealedError`
  mapped at the command layer is at least as strong, and `status` on the check
  result stays a three-value union as the plan's Review focus required.
- **A licensed narrowing needs an explicit ruling (p13, p18).** The
  `tests/`-nested exemption and the refusal of a false plan sentence were both
  adjudicated by the reviewer against the categorical weaker-anywhere rule,
  with the evidence the ruling demanded, and recorded as deviations.
- **One PR-scoped bump per skill, even across two lanes (p10 → p19, p10 →
  p20).** `create-agnostic-skill` reads 1.5.0 (superseding p10's 1.4.4 per the
  source plan's soft-ordering row) and `oat-repo-improve` stays at 2.1.5.

## Design Deltas

- p02's strict barrier is targeted to the three repair keys rather than
  removed (post-STOP refresh); the env-override probe is exported.
- p05 closes a global prototype-pollution path the plan's own Step 2 would have
  exposed, and the real cause of the corrupt `--provider __proto__` output is
  `registry.ts`'s `??` fallback, not the site the plan named.
- p15's moved helper is hardened (symlinked root or sentinel rejected) instead
  of moved verbatim.
- p17's scanner is deliberately non-CommonMark in one place (a fence opener
  inside an HTML block still hides what follows it) so the change is strictly
  narrowing there; bare `%` in a destination rejects by design.
- p18 did not write the plan's "`pnpm check` now contains everything `pnpm
format` checks" sentence (false for `packages/control-plane`); `format:fix`
  shares one root glob through `format:root:fix`.
- p19's spec-level frontmatter example keeps the spec's space-delimited value
  with OAT's comma convention in the annotation (root address-now after the
  review); the corpus rule splits on commas outside parentheses.

## Notable Challenges

- **Five STOPs in twenty lanes.** Each was a plan premise the lane could not
  reproduce as written; the root authored every remedy (four refreshes, one
  park) and the lanes resumed the same day.
- **The parked wave-5 p09 patch had been lost** from scratch before this wave;
  the plan gate's first attempt caught the dangling reference, and the work was
  rebuilt byte-exact from the subagent transcript and a dangling blob, then
  committed under the wrapper before p04 applied it.
- **Four false lane claims** (p09 "inert on macOS", p03 "external plans
  unwritable", p14's record wording, p17's "no Codex coverage possible") were
  each overturned by a reviewer with counts or a completed run.
- **Codex wedging in worktrees** (p17 three times, then two more in the fix
  round) was covered by re-running from the root checkout at review.
- **Root rulings were wrong twice** (a `create-oat-skill` pin that never
  existed; a wrapper Ordering row contradicting source-plan step 7) and the
  reviewers corrected them; both are recorded as rules for later waves.

## Tradeoffs Made

- The p16 item stays open with both halves rather than redesigning the
  recorder's process guard inside a wave ("anything too complex should be its
  own project").
- The p17 scanner rejects any bare `%` left in a destination, so a future plan
  linking a query string or fragment must spell it unencoded or lose its
  backlink (noted for authors).
- The `create-agnostic-skill` template still carries a repo-internal backstop
  path inside the emitted block, as the plan prescribed; moving it is a polish
  item.
- The recap and the completion tail for all seven wrappers are deferred to the
  program boundary per the program rules.

## Follow-up Items

- `BL-260909-sweep-the-raw-main-module` (p01) — other raw main-module guards.
- `BL-260909-repair-the-bare-fences-that` (p10) — five bare fences outside
  `.agents/skills`.
- `BL-260909-use-handle-bound-traversal` (p15) — handle-bound traversal for the
  remaining path-based readers.
- `BL-260909-reject-malformed-nested-values` (p02) — the strict `pjm.remote`
  reader.
- `BL-260909-add-a-grep-by-shape-control` (p05) — a dynamic-key indexing
  control.
- `BL-260909-show-the-brainstorm-pack` (p07) — the doctor example's missing
  pack and its derivation rule.
- `BL-260909-surface-config-warnings` (p08) — warnings on every reader path,
  one read per `config get`, the `warnings` field documented.
- `BL-260909-fix-the-agents-md-unsafe` (p12) — a shared-fixture race.
- `BL-260909-make-oat-sync-scope-all-report` (p14) — a sibling scope's failure
  in the `--scope all` body.
- `BL-260909-give-packages-control-plane` (p18) — a `check` script so its
  formatting is CI-gated (lockstep change).
- `BL-260909-make-findsection-comment-aware` (p17) — the third fence pass,
  plus CRLF and helper placement.
- `BL-260909-re-source-the-surviving-codex` (p19) — the surviving Codex `name`
  claims and the twelve dead provider-reference URLs.
- `BL-260909-wave-7-review-polish-leftovers` — the Minors deferred across the
  wave.
- `BL-260909-rewrite-inbound-references` (final review M3) — `oat backlog
archive` leaves dangling `items/` links in every plan that cites the item.
- `BL-260909-restamp-a-stale-copy-strategy` (Phase 21) — sync never restamps
  a stale `contentHash` on skip; retire the pre-framing digest bridge once it
  does; obsolete legacy mappings classify `detach`.
- Update-only, still open: `BL-260906-harden-dispatch-launch` (p16 parked;
  Notes entry points at the STOP record and the parked patch) and
  `BL-260908-retire-the-top-level-skill` (p13 landed step 1; step 2 one release
  later).
- Plan corrections applied at wave close: p01, p04, p05, p08, p10, p11, p12,
  p13, p14, p17, p18, p19, p20; `DR-260907-oat-config-reads-materialize`
  anchors re-derived by symbol.

## Associated Issues

- `BL-260907-finalize-synced-archive-mjs` — archived (p01).
- `BL-260907-let-oat-config-unset-remove` — archived (p02).
- `BL-260907-fold-oat-config-adopt-onto` — archived (p02).
- `BL-260908-keep-a-bare-proto-in-markdown` — archived (p03).
- `BL-260907-make-the-completion-seal` — archived (p04).
- `BL-260908-guard-normalized-config-maps` — archived (p05).
- `BL-260906-guard-packed-asset-directories` — archived (p06).
- `BL-260906-reconcile-the-oat-doctor` — archived (p07).
- `BL-260907-warn-when-documentation-root` — archived (p08).
- `BL-260907-name-the-resolved-target` — archived (p09).
- `BL-260906-repair-the-stray-fence-in-oat` — archived (p10).
- `BL-260906-docs-index-follow-ups-from` — archived (p11).
- `BL-260906-persist-status-native-skill` — archived (p12).
- `BL-260906-extend-check-skill-bumps` — archived (p13).
- `BL-260908-report-a-changed-skill-with-no` — archived (p13).
- `BL-260906-fix-sync-apply-branch` — archived (p14).
- `BL-260908-make-copy-strategy-skill` — archived (p15).
- `BL-260907-harden-the-external-plan` — archived (p17).
- `BL-260907-settle-the-oat-wave-program` — archived (p17).
- `BL-260906-cover-skill-test-files-under` — archived (p18).
- `BL-260906-run-scripts-worktree-init-test` — archived (p18).
- `BL-260908-correct-the-factual-skill` — archived (p19).
- `BL-260908-keep-external-plan-writes` — archived (p20).
- `BL-260906-harden-dispatch-launch` — open, update-only (p16 parked; Notes entry).
- `BL-260908-retire-the-top-level-skill` — open, update-only (p13 landed step 1; step 2 one release later).

## Workflow Observations

Rolled up from the orchestration log's end-of-run synthesis (2026-09-09):

- **Convention verdicts.** "Reproduce, report, never improvise" held through
  five STOPs (four dated refreshes, one park) and the refresh-vs-park rule
  decided each; plan writes stayed on the caller's model class and are now
  pinned by p20; reviewer-built adversarial sweeps (a 50,625-document
  combinatorial sweep, a refetched provider page) found what hand-built
  differentials and quoted claims missed; the categorical weaker-anywhere rule
  with explicit adjudication rulings turned two licensed narrowings into
  documented decisions; four false lane claims were caught by reviewers with
  counts; root address-nows closed small findings at seven of eight fan-ins.
- **Adjustments as rules.** Briefs carry the root's own pin grep, never a
  belief; a wrapper links a source-plan rule and never paraphrases it;
  `check:skill-bumps` controls run post-commit on a throwaway branch; Codex is
  retried once from the root at review when a lane's run wedged; a parked
  patch lives under the wrapper, SHA-256 pinned; scratch paths are namespaced
  by wave and Codex output mtimes are checked; lane diagnoses carry
  instrumentation counts and neutralizations are checked against the case
  they must break.
- **Graduated.** The STOP taxonomy (`DR-260908-a-stop-whose-remedy-lies`) and
  the caller-model rule (p20) are skill text; the address-now convention and
  the adjudication-ruling pattern remain wave practice recorded for the retro.
- Gate ledger: plan gate blocked once (a dangling parked-work reference,
  recovered) then passed; every lane review passed within two rounds; eight
  fan-ins each ran the eight DoD gates plus smoke, skills, scripts, and the
  root test with `Cached: 0`; the root final review returned CHANGES REQUESTED (4C/5I/6M/7m) — one Critical was the closeout archival itself (a bare `__proto__` in two summaries, bolded by the pre-commit formatter), three were product holes in the completion seal and the managed-copy digest — closed by a root record commit and a three-lane Phase 21 fix round, then a closeout gate run after the last content commit (0 cached; cli 7336); reviewer round 2 **R2**; exit gate **EXIT**.
