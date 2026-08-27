# Five defects, four waves, four version bumps

The 2026-08-19 defect wave program took five bounded external plans off the
backlog and landed all five on `main` across 2026-08-26 and 2026-08-27, one
wave at a time. Every wave is merged, every wrapper project is closed, and each
wave moved the five lockstep public packages exactly once, 0.2.32 to 0.2.36.
What remains is deliberate rather than unfinished: this recap is not published,
and the completion tail across the four wrapper projects is still waiting on a
human decision.

## Program overview

The program artifact is a durable map, not something you can execute. It fixes
which plans belong to which wave and records their status; the contract each
lane actually implements stays its own immutable external plan file, and each
wave runs as a thin wrapper OAT project that adds ordering, worktree isolation,
gates, review mapping, and bookkeeping on top of that plan. Nothing in the
program narrows a plan, and the one place a plan and reality disagreed went to
the operator instead of being reinterpreted.

| Dimension        | Where the program stands                       |
| ---------------- | ---------------------------------------------- |
| Waves            | 4 of 4 merged                                  |
| Plans            | 5 of 5 done                                    |
| Wrapper projects | 4 of 4 lifecycle complete, the last 2026-08-27 |
| Public packages  | 0.2.32 to 0.2.36, one bump per wave            |
| Backlog closed   | 5 items, one per plan                          |
| Per-wave recaps  | 4 of 4 built-durable, none published            |
| Completion tail  | deferred to program close, human-gated         |

Execution was authorized once, on 2026-08-25, when the operator approved the
four-wave composition and granted session-scoped autonomy: wave PRs are created
and merged by the root orchestrator once the required gates pass. That approval
replaced an earlier record deferring execution, and it is the only blanket
authorization the program used. Everything else the operator decided — raising a
usage limit, removing a gate configuration flag, reconciling a tripped plan
STOP condition — was requested at a specific boundary and recorded where it
applied.

> [!IMPORTANT]
> Program close is not the same as the last merge. Two things are held back on
> purpose: the completion tail across all four wrapper projects, and publication
> of the five recap packages. This program recap has been generated for review
> only. Publishing is a separate, human-gated decision that has not been made.

## Wave map

The waves are strictly serial, and the ordering is a release argument rather
than a scheduling convenience. Each wave starts from the `origin/main` commit
the previous wave's close produced, so the lockstep package baseline a wave
validates against is always the one its predecessor shipped.

```diagram
graph LR
W1[W1 CI containment] -->|0.2.33| W2[W2 Sync provenance]
W2 -->|0.2.34| W3[W3 Hermetic assets]
W3 -->|0.2.35| W4[W4 Codex policy]
W4 -->|0.2.36| CLOSE[Program close]
```

Only Wave 1 ran two lanes at once, and it did so because their write surfaces
were provably disjoint — one lane in `tools/smoke/runner`, the other in
`tools/release` — with the smoke lane merged first so the bounded signal
harness was already protecting the release lane's integration run. Every later
wave is solo, and each for a stated reason rather than caution: Wave 2 changes
shipped CLI behaviour and all five lockstep manifests, so isolating it stopped a
second plan from competing for the same release baseline; Wave 3 had to pass an
isolated built-CLI proof before anything else touched the assets root; Wave 4
carries a policy surface and two independent version bumps, and going last
minimized the risk of shipping a stale model catalogue.

| Wave | Theme                     | Lanes | Started from                | Why this shape                                              |
| ---- | ------------------------- | ----- | --------------------------- | ----------------------------------------------------------- |
| W1   | Test and CI containment   | 2     | planning baseline ccf3725e  | disjoint write surfaces; gives later waves a release guard   |
| W2   | Sync provenance warning   | 1     | main 1bd5424b after W1 close | owns the next public-package baseline alone                  |
| W3   | Hermetic CLI assets        | 1     | main 39cea801 after W2 close | one shippable unit; focused review of an override boundary   |
| W4   | Codex skill policy         | 1     | main 3c135e21 after W3 close | policy surface, two bumps, last to avoid a stale catalogue   |

## Per-wave outcomes

Every wave shipped its lanes in full. No plan was narrowed, no lane was parked,
and no defect was deferred into a later wave. The waves differ in how much
review it took to get there.

| Wave | Merged as                | Packages | Plan gate           | Phase review rounds | Final review rounds | Exit gate                       |
| ---- | ------------------------ | -------- | ------------------- | ------------------- | ------------------- | ------------------------------- |
| W1   | PR #215 to `5bb2f914`    | 0.2.33   | passed on 3rd launch | p01 3, p02 2        | 4                   | generation 2 was the merge gate |
| W2   | PR #217 to `33149b26`    | 0.2.34   | passed on round 3   | 2                   | 1 plus a narrowed 2 | generation 2 after a boundary   |
| W3   | PR #219 to `cd3ba140`    | 0.2.35   | passed on round 1   | 2                   | 2                   | generation 1 passed             |
| W4   | PR #222 to `06f49fb0`    | 0.2.36   | passed on round 1   | 3, at the cap       | 3, at the cap       | generation 1 passed             |

### Wave 1 — the wave that priced the rest

Wave 1 shipped both containment fixes: a smoke cleanup harness that force-kills
and reaps a child ignoring SIGTERM, detaches an unreapable child without
stalling the event loop, and fails loudly with the paused stage and captured
output instead of wedging `pnpm test` forever; and a release guard that
additionally rejects any lockstep version not strictly greater than current
`origin/main`, composing with the existing merge-base rule instead of competing
with it.

It also paid the program's tuition. Discovery had assumed no public-package bump
was needed, but test files under `packages/cli/src` count as publishable
changes, so the repository guardrail demanded a five-package lockstep bump the
lane itself could not make. The root bumped once after fan-in rather than
loosening the version policy, which is a decision for the operator and not for a
defect lane. Two of the wave's three most useful findings — an unsettleable
post-detach reap and a reorder-mutation gap — were found only by reviewer
probes, while every implementer gate and cross-model pass was green.

### Wave 2 — the wave that found a gate boundary

Wave 2 made `oat sync` report producer and invoker version skew before it can
hide it: one human warning per skewed scope, emitted before the dry-run and
apply branch and therefore before any manifest restamp, plus a structured
`versionSkew` array in both JSON envelopes. The apply-time restamp now derives
from that same diagnostic, so the advisory and the restamp cannot drift apart.
Exit codes, planned-operation counts, apply eligibility, and the manifest schema
are untouched.

The interesting part is the exit gate. Generation 1 ran on a same-family target
with `--avoid none` and blocked after two completed attempts whose headless
child backgrounded the long gates and then ended its turn. The run diagnosed
that as the gate target's headless behaviour rather than a finding against the
wave, reproduced it three times out of three, and stopped: replacing the route,
prompt, or provider was outside the run's authority. The operator removed
`--avoid none` — a configuration bug rather than intent — and generation 2
passed on Cursor with the full definition of done in the foreground.

### Wave 3 — the wave where probes beat gates

Wave 3 turned the CLI assets root into a validated public knob.
`resolveAssetsRoot` honours a non-empty trimmed `OAT_ASSETS_DIR` and then runs
the unchanged stat and bundle-validation checks, so a missing, malformed, or
version-mismatched override fails closed with the existing actionable errors and
never silently falls back; unset or blank keeps the packaged root. The
package-coverage smoke consumer became hermetic in the same lane, bundling into
a private temp root and asserting its own restore and cleanup.

This is the wave that most clearly justifies adversarial review. Ten green
repository gates and the implementer's own tests passed over a silent
`it.skipIf` that removed the only default-binding coverage, an unswept ambient
environment class, and correct-but-unasserted cleanup. All three came from
reviewer-designed probes, and all three were fixed in a single append-only
round. The proportionate fix for the ambient class turned out to be one line at
the test-runner environment seam, not the seven call sites the finding first
implied.

### Wave 4 — the wave that stopped instead of guessing

Wave 4 replaced a stale two-model list in `codex-skill` with authority-based
routing: work is classified by OAT task class, and the model and reasoning
effort come from the live provider reference named as the source of truth, with
dated examples explicitly unable to override it. The repository-check bypass
stopped being a default and became conditional and authorization-gated, every
command example was validated against the live CLI, and an eight-case prose
contract test now guards the stale pair, retired slugs, blanket bypass, the
authority sentence, and the non-blocking below-floor rule.

The wave tripped a plan STOP condition and did not route around it: the live
help had no `--full-auto` although the skill used it. That was reported at the
drift refresh and reconciled non-narrowingly by the operator inside the plan's
own step 2, with each example row re-evaluated for sandbox semantics rather than
swapped mechanically. Both review scopes then reached the three-cycle cap, and
both were closed the same way — reviewer-specified, root-verified bounded fixes
to test files only, independently confirmed by the final review, with the last
two guard residuals ledgered to backlog instead of chased into a fourth cycle.

## Convention evolution

The rules the program executes under were not fixed in advance. Each wave's
end-of-run synthesis judged its own conventions against what actually happened
and adopted a bounded rule set for the waves that followed. The compounding is
visible: Wave 1 adopted five rules from five incidents, and by Wave 3 the
carried-forward wrapper text passed the plan artifact gate on round 1.

```timeline
2026-08-26 — W1 adopts five rules: absolute paths for every root command, drift refresh must intersect release change-detection roots, literal gate invocation with per-gate exit logs, delete- and reorder-class mutations for ordering claims, and a pre-child provider rejection as a boundary
2026-08-26 — W2 adds four: bootstrap before scaffold, list the release surfaces the plan writes and fetch before checking versions, treat post-commit release checks as the load-bearing evidence, and use the direct formatter binaries
2026-08-26 — W2 exit-gate boundary produces a configuration rule: keep the gate as reconfigured and verify the selected target in the gate-start line
2026-08-27 — W3 adds five: check Verify lines against the real runner, re-run release checks after every task commit, sweep a named class repo-wide with the fixture shape stated, require negative controls for containment lanes, and dry-run bookkeeping anchors
2026-08-27 — W4 closes with five for future programs: post-commit re-runs cover both committed-state-only gates, live-syntax rereads record flags per subcommand, cross-model review stops at two clean rounds, prose guards key on structure rather than keywords, and flag swaps are re-evaluated per example row
```

Three of these rules changed outcomes rather than paperwork.

| Rule                                     | Adopted after | What triggered it                                                 | Where it paid off                                                       |
| ---------------------------------------- | ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Delete- and reorder-class mutations      | W1            | a reorder gap that delete-class mutation missed                    | W2, where the reorder mutation exposed an unpinned restamp-only path      |
| Drift refresh intersects release roots   | W1            | an unplanned five-package bump discovered mid-wave                 | W2 onward, where every lockstep bump was pre-planned inside the lane      |
| Post-commit re-run of committed-state gates | W3         | `release:check-versions` reporting a no-op pass before the commit  | W4, which found `check:skill-bumps` behaves identically and widened it  |

The rule with the longest reach is the least technical one: a boundary is a
boundary. Wave 2 could have swapped the gate target and moved on; instead it
reproduced the failure, classified it as the target's behaviour, and handed the
operator a decision. Wave 4 could have treated a missing CLI flag as a
documentation nit; instead it stopped, reported, and let the operator reconcile
the plan. Both cost a round trip. Neither produced a silent scope change.

## Aggregate numbers

Every figure below traces to a completion record or an orchestration log at the
program-close revision. Where the records do not support a number, this recap
says so rather than estimating one.

| Measure                     | Value                    | Unit and source context                                     |
| --------------------------- | ------------------------ | ------------------------------------------------------------ |
| Plans executed              | 5 of 5                   | external plans, coverage verified twice against the index    |
| Waves merged                | 4 of 4                   | squash merges to `main`                                      |
| Public package bumps        | 4                        | lockstep across five packages, 0.2.32 to 0.2.36              |
| Backlog items closed        | 5                        | one per plan                                                 |
| Key decisions recorded      | 12                       | across four completion records; 8 pinned to DR records       |
| CLI suite growth            | 3672 to 3695 tests       | 273 files; measured after W1, W2 and W3                      |
| Skills suite after W4       | 586 of 586               | 578 existing plus 8 new contract cases                       |
| Focused cases added         | 14 in W2, 9 in W3, 8 in W4 | per-suite counts from each completion record                |
| Definition-of-done gates    | 10 per closeout baseline | one log and one captured exit code per gate                  |
| Per-wave recap packages     | 4 built-durable          | one hub each, browser evidence at 320, 768 and 1440          |

Two numbers are deliberately absent. There is no program-wide commit total: the
records name lane commits per wave but do not agree on a countable total, so the
four squash merges are the only aggregate commit figure offered here. And there
is no program-wide count of newly filed backlog items, because no source states
one; the ledger below lists what each wave filed instead.

The recap packages carry one piece of history worth keeping. Wave 1's first
durability attestation failed because the pre-commit formatter rewrote 9 of its
27 immutable package files. That is why the repository now ships a formatter
ignore for immutable explainer-kit run packages — and why this package's own
paths were checked against that ignore before anything was committed.

## Follow-up ledger

Nothing here is a surprise at close; every item was filed by the wave that found
it, at that wave's close, with an owner.

| Item                                          | Filed by | Owning group | Status | Next action                                              |
| --------------------------------------------- | -------- | ------------ | ------ | --------------------------------------------------------- |
| Silent `oatVersion` restamps outside sync      | W2       | root         | open   | extend the advisory to the three sibling call sites       |
| Gate headless-yield contract and target audit | W2       | root         | open   | make gate targets fail rather than yield in headless mode |
| Resolver `--stamp` output                     | W2       | root         | open   | emit the dispatch stamp from the resolver                 |
| Test-only paths versus version policy         | W2       | operator     | open   | policy decision, not a code change                        |
| Deterministic smoke worktree hygiene          | W2       | root         | open   | namespace or clean run worktrees on failure               |
| Partial or metadata-only override bundles     | W3       | root         | open   | add a structural check so they fail closed                |
| Override-aware remedy wording                 | W3       | root         | open   | stop pointing operators at `pnpm build`                  |
| Below-floor guard beyond a phrase literal     | W4       | root         | open   | widen the guard past the exact phrase                     |
| Span-based prose guards and probe anchors     | W4       | root         | open   | generalize the wave-4 probe runner                        |
| `provider-codex.md` refresh                   | W4       | root         | open   | ultra tier, the 2026-08-31 retirement, subcommand flags   |

### Deferred minors, bound to a trigger

These were not filed as backlog items because each has a natural next touch.

- Wave 1 deferred three: quoting in the malformed-version diagnostic, regression
  coverage for the forced and timed-out diagnostic branches, and zombie-child
  wording — all due on the next release-tooling or smoke-harness touch.
- Wave 2 deferred one: making `ScopeSyncPlan.versionSkew` non-optional on the
  next touch of the sync types.

### Open at program close

- [ ] Completion tail across all four wrapper projects — human-gated, not started.
- [ ] Publication of the four per-wave recap packages — deferred to program close by every wave row.
- [ ] Publication of this program recap — generated for review only; not published.
- [x] Program recap generated from the reconciled program artifact and all four completion records.

Two integration facts also outlive the program. The sync manifest's
`oatVersion` still trails the package versions — precisely the class Wave 2
shipped the advisory for, and the class its own backlog item tracks. And the
Codex provider reference remains a consumed authority whose own refresh is now
due, which is the follow-up Wave 4 filed on its way out.

> [!NOTE]
> Five claims in this recap's fact base are recorded as unresolved rather than
> asserted: the wave-close PR numbers, Wave 4's contract-test case count where
> the completion record and the earlier synthesis disagree, a program-wide
> commit total, Wave 1's net added test count, and a program-wide filed-backlog
> total. Each is listed with the evidence that exists and the reason it is not
> confirmed.
