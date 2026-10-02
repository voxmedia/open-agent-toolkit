# Complexity Review at Budget Exhaustion

When a review or gate budget runs out, the loop has stopped converging, and
another round of the same review is unlikely to change that. Before asking the
operator how to proceed, the root dispatches one complexity review and shows its
result together with the reasons the loop stopped. The review asks whether the
reviewed work, or the machinery the findings keep demanding, earns its cost
against the contract; it is not another correctness review.

This document is read by two parties: the root (the orchestrating agent that
owns the exhausted loop) and the reviewer subagent it dispatches.

## When

Each owning skill points here at its exhaustion point:

| Exhaustion point                                                                    | Owning skill and step                                                                         |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Root-owned phase review still has Critical/High findings at the orchestration limit | `oat-project-implement`, `references/phase-execution.md`, Bounded Fix and Re-Review Loop      |
| Optional phase review gate still blocks at the orchestration limit                  | `oat-project-implement`, `references/phase-execution.md`, Optional External Phase Review Gate |
| Final review reaches the three-cycle review cap                                     | `oat-project-implement`, `references/completion-and-closeout.md`, Step 13                     |
| Implementation exit gate ends in `block` at `maxAttempts`                           | `oat-project-implement`, `references/completion-and-closeout.md`, Step 14                     |
| A review scope reaches the three-cycle review cap                                   | `oat-project-review-receive`, Step 8                                                          |
| Quick-start plan gate (`QS-12`) ends in `block` at `maxAttempts`                    | `oat-project-quick-start`, Gate Execution step 6                                              |

These are budget exhaustions only. A single `prompt` failure, a `warn`
outcome, and launch, transport, or runtime failures that consume no attempt do
not trigger the review.

One exhausted loop gets one review. Before dispatching, look for an existing
report for the scope and reuse the newest
`reviews/archived/complexity-<scope>-*.md` when it is newer than every review
artifact of that scope: its filename timestamp is at or after the newest of
their `oat_generated_at` values, compared at seconds precision. Among reports
from the same second, the highest collision suffix is the newest. A legacy
minute-precision name (`YYYY-MM-DDTHHMMZ`) reads as second `00`, which errs
toward a fresh review. For example, a report saved as
`complexity-p03-2026-10-02T183045Z.md` is newer than a review generated at
`2026-10-02T18:30:20Z` and older than one generated at `2026-10-02T18:30:50Z`,
an order minute precision could not establish. Dispatch again only when a new
review round has landed since that report. The rule covers a re-entered review-receive at the cap, the
final review cap reached through review-receive Step 8, and a phase scope that
reaches both the receive cap and the implement retry limit.

The operator can ask for the same review at any other time. There is no
automatic early trigger.

## Probe

The operator may have the full `complexity-review` skill installed. Probe these
paths in order and bind the first that exists:

```bash
COMPLEXITY_REVIEW_SKILL=""
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
for candidate in \
  "${HOME:-}/.agents/skills/complexity-review/SKILL.md" \
  "${HOME:-}/.claude/skills/complexity-review/SKILL.md" \
  "${REPO_ROOT:+$REPO_ROOT/.agents/skills/complexity-review/SKILL.md}"; do
  [ -n "$candidate" ] && [ -f "$candidate" ] || continue
  COMPLEXITY_REVIEW_SKILL="$candidate"
  break
done
```

- **Found:** the reviewer subagent reads that `SKILL.md` and the references it
  links, and follows them as a document. The skill is not model-invocable, so
  never launch it as a skill. Interactive questions are forbidden: where the
  skill would ask, the reviewer states the gap, labels the contract inferred,
  and marks the verdict provisional. It ignores any `--out` destination and
  returns the report inline. It then adds the OAT sections below.
- **Not found:** the reviewer follows the condensed method below, then adds the
  OAT sections.

Report which path ran in the report's first line, for example
`Method: installed complexity-review (<path>)` or `Method: OAT condensed`.

## Dispatch

The root dispatches exactly one read-only reviewer-class subagent through
`oat-project-dispatch-subagents`, at the reviewer ceiling already resolved for
the exhausted loop. The reviewer:

- writes nothing, commits nothing, and launches nothing;
- reads committed content (`git show <rev>:<path>`, `git diff <range>`) rather
  than the working tree whenever another writer may own the worktree; and
- returns the full report inline to the root.

The brief names the scope:

- **Reviewed target:** the phase commit range, the final implementation range,
  or the plan bundle (`plan.md` with the discovery, design, and spec it was
  built from).
- **Contract sources:** the backlog items the project closes, `discovery.md`,
  `spec.md`, `design.md`, and the relevant records under
  `.oat/repo/reference/decisions/`. A plan cannot justify its own machinery, so
  the contract comes from these sources, not from the reviewed plan.
- **Loop history:** every review artifact of the exhausted loop, active and
  archived, gate artifacts included, plus the dispositions recorded for them
  in `implementation.md` or `plan.md`.

### Routing outside implement

Inside an `oat-project-implement` run, the root already loaded its dispatch
contract and resolved the reviewer route, and both apply here. When the
exhausted loop belongs to `oat-project-quick-start` or to a standalone
`oat-project-review-receive` run, resolve them before the launch:

1. Probe `oat-project-dispatch-subagents/SKILL.md` and
   `oat-dispatch-subagents/SKILL.md`, each first in `${HOME}/.agents/skills`
   and then in `<repo-root>/.agents/skills`, and bind each first match; never
   rely on ambient discovery. On a miss, name the skill and give its recovery
   command, then continue with
   `Complexity review unavailable: <skill> not installed`:
   - `oat-project-dispatch-subagents`:
     `oat tools install workflows --scope <user|project>`;
   - `oat-dispatch-subagents`:
     `oat tools install utility --scope <user|project>`.
2. Read the project dispatch skill, then the engine, and follow them.
3. When no reviewer ceiling was resolved for this loop, resolve one with
   `oat project dispatch-ceiling resolve --provider "$ACTIVE_PROVIDER" --role reviewer --json`
   and launch at that ceiling.

When no reviewer route is available, the root says so in the decision message
(`Complexity review unavailable: <reason>`) and presents the decision with the
loop-stop reasons alone. It never substitutes a weaker reviewer class and never
blocks the decision on the missing review.

## Condensed method

Generated artifacts are cheap; owned complexity is not. Each piece of
machinery must earn its cost for this contract. The simplest solution is the
one with the lowest total lifecycle cost that still meets the contract and
still proves that it works, not the one with the fewest lines.

1. **Restate the contract** in four lines, from the contract sources:
   - Outcome: what was asked for, in the requester's terms.
   - Hard constraints: limits the requester or the repository imposes.
   - Acceptance criteria: how the requester would know it is done.
   - Minimum proof: the smallest evidence that the outcome is achieved.

   Separate requirements from implementation choices treated as requirements.
   Verify mechanically enforced constraints in source, validators, tests, or
   tool behavior rather than in descriptive prose. When the originating request
   is missing or ambiguous, label the contract inferred, cite each inference,
   and mark the verdict provisional. When sources conflict, report the
   conflict instead of picking the one that justifies the machinery.

2. **Establish the simplest viable baseline:** the least complex version that
   satisfies the contract and its minimum proof. It is the reference point every
   additional piece of machinery must beat, not automatically the
   recommendation.

3. **Inventory the machinery.** Consider schemas and intermediate
   representations; scripts and generated output; tests, fixtures, and
   snapshots; validation and repair loops; multiple agents or passes; state
   machines, phases, and resumable sessions; abstractions and plugin seams;
   configuration, persistence, and caching; duplicated documentation; and
   process ceremony (planning documents, review passes, phase gates). Report
   only material items, and judge the system as a whole: ten individually
   defensible additions can still be indefensible together.

4. **Apply the deletion test** to each item: what outcome does it support, what
   concrete failure occurs without it, is that failure observed or merely
   imaginable, can a smaller mechanism address it, how would we know it helped,
   what does it cost to own, and what would adding it later cost? Grade the
   evidence as **hard requirement**, **observed**, **strongly inferred**,
   **speculative**, or **unsupported**, and recommend **Keep**, **Simplify**,
   **Defer** (with an observable reintroduction trigger), or **Delete**. If an
   item can be deleted, deferred, or substantially simplified while the
   contract and its proof stay intact, it should be. A hard requirement, a
   credible threat model, an irreversible interface, or a low-frequency
   high-impact risk can justify a mechanism before any failure.

5. **Build the ledger before the verdict:**

   | Item                | Claimed value | Evidence                        | Lifecycle cost | Recommendation                   |
   | ------------------- | ------------- | ------------------------------- | -------------- | -------------------------------- |
   | {file or component} | …             | {evidence grade, with citation} | …              | Keep / Simplify / Defer / Delete |

   Cite a file and line, a section, a commit, a run, or a short quote from the
   request. "Best practice" and "consistency with siblings" belong in Claimed
   value, never in Evidence.

6. **Assign the verdict:** `Deletion-rule compliant` when every item is Keep or
   a trivial wording-only Simplify; `Partially compliant` when the central
   approach is right and the overshoot is peripheral; `Not compliant` when the
   central approach itself fails the deletion test. Append `, provisional`
   whenever the contract was inferred.

Report sections: Verdict, Contract, Simplest viable solution, and Complexity
ledger always; Proposed changes, Risks of simplifying, Reintroduction triggers,
and Out of lane only when they have content.

**Stance: skeptical, not reflexively minimalist.** Do not remove complexity
that satisfies a hard requirement, do not trade clear code for a clever
abstraction, do not recommend a large rewrite to remove a minor burden, and do
not increase net machinery. Sunk cost is irrelevant; removal and migration cost
are not. Grade necessity, not correctness: correctness, security, or staleness
findings noticed in passing go under Out of lane, one line each, and are not
investigated.

## OAT sections

Both paths add these sections to the report:

- **REQUIRES-OPERATOR:** mark each ledger row that only the operator can settle
  (a contract question, a scope or product call, accepting a risk) with
  `REQUIRES-OPERATOR` and state the question in plain terms.
- **Open findings:** classify each finding still open in the exhausted loop as
  `accepted-requirement` (the contract requires it), `regression` (the change
  broke something that worked), or `new-hardening` (a new demand beyond the
  contract). Call out recurring families: the same kind of finding returning
  across rounds.
- **Dissolvable findings:** list the open findings that a recommended Simplify,
  Defer, or Delete would dissolve.
- **Recommended disposition:** one of `extra cycles` (more fix and review
  rounds), `proceed with override` (accept the residual findings and continue),
  `corrective revision` (rework within the current approach), or `simplify`
  (apply the ledger's simplifications, then review again), with a one-sentence
  rationale. This is a recommendation only.

## Decision message and record

The root, never the reviewer:

1. Saves the returned report verbatim at
   `$PROJECT_PATH/reviews/archived/complexity-<scope>-<YYYY-MM-DDTHHMMSSZ>.md`,
   beside the loop's archived review artifacts, with the UTC timestamp from
   `date -u +%Y-%m-%dT%H%M%SZ`. When that path already exists, append `-2`,
   then `-3`, and so on before `.md` until the path is free. It is not a review event: it
   carries no `oat_review_*` or `oat_generated_at` frontmatter, has no `plan.md`
   Reviews row, and stays out of the top-level `reviews/` directory, where
   routers would read it as an unprocessed review. Write it only while no
   dispatched child owns the worktree; when `reviews/archived/` is tracked,
   commit it with the decision bookkeeping.
2. Shows one decision message containing:
   - why the loop stopped: the budget, the count reached, and the findings still
     blocking;
   - the verdict and the ledger highlights;
   - the dissolvable findings;
   - each REQUIRES-OPERATOR item, in plain terms;
   - the recommended disposition;
   - the dispositions on offer: the owning step's existing options plus
     `simplify`; and
   - the report path.
3. Records the operator's choice in `implementation.md` with the date, the
   scope, the exhaustion point, the verdict, the chosen disposition, and the
   report path.

Agents never select the disposition, including the recommended one. Under
`OAT_AUTONOMOUS=1` the run stops at its boundary report, and that report
includes the same decision-message content; no disposition is chosen or
recorded on the operator's behalf. The operator's choice is recorded when the
run resumes.

A `simplify` choice routes the accepted ledger changes through the owning
skill's normal revision path (fix tasks for a code scope, plan edits for a plan
bundle), followed by a fresh review of the revised work.
