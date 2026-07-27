The redesign itself took eight phases. Reviewing it took longer, and the
loop did not converge on its own — it was ended by decision. This page records
what the review cycles actually cost, because the hub reports the outcome
without the shape of the effort.

> [!NOTE]
> This is a process record, not an architecture page. The mechanism it describes
> is the review loop, not the kit.

## What the cycles cost

| Stage                           | Cycles | Outcome                                 |
| ------------------------------- | ------ | --------------------------------------- |
| Plan artifact review            | 6      | Accepted by operator, never gate-passed |
| Final code review               | 1      | 10 findings, all verified real          |
| Re-review of the 11 fix commits | 1      | `block` with 8 further findings         |
| Disposition of those 8          | 0      | 2 fixed, 2 dissolved, 4 dropped         |

The plan needed six gate cycles before implementation began. Each cycle
surfaced real defects, which is the argument for running them. But cycles four
through six increasingly produced _design_ questions rather than plan defects —
the gate was being asked to settle interface decisions that only code contact
could settle. That is what motivated resolving nine decisions (D1 through D9)
explicitly and then treating the plan as operator-accepted.

## Where the loop stopped paying

The final code review returned ten findings and every one was reproducible.
That review earned its cost. The re-review of the resulting eleven fix commits
returned eight more, and the disposition tells the story:

- **Two were fixed** — stale render and QA warnings surviving a corrected
  resume, and a lifecycle artifact that misdescribed a commit.
- **Two dissolved** without code changes when automatic Render QA was cut. The
  unshipped browser driver and the unrestricted probe-module import existed
  only to serve a subsystem that was removed.
- **Four were dropped** rather than backlogged. Two HTML-safety gaps are
  unreachable while artifacts are composed from hash-pinned shells; one anchor
  collision needs an author to use `overview`, `introduction`, and `lead`
  simultaneously; one warning is already re-added by the pipeline.

Half of the second-round findings were either self-resolving or not worth
acting on. That ratio is the signal: the loop had stopped finding defects that
mattered and started finding defects that merely existed.

## The counter-evidence

The strongest argument against more review cycles is what happened _after_ they
stopped. The kit passed 221 core tests and a full release gate, and then three
defects were found within seconds of opening the output in a browser:

| Defect                                            | Detected by         | Missed by               |
| ------------------------------------------------- | ------------------- | ----------------------- |
| Section numerals rendered as 16px black body text | Looking at the page | 221 tests, release gate |
| Diagram labels downscaled to 8px                  | Measuring the SVG   | 221 tests, release gate |
| Wrapped list items split into separate lists      | Looking at the page | 221 tests, release gate |

None of these were subtle. All three were invisible to the entire automated
suite because the suite asserted structure while the defects were in
presentation and in a parser path no fixture exercised with wrapped input.

> [!IMPORTANT]
> More review cycles would not have found these. Rendering the output and
> reading it did, immediately. That is why the shipped decision is that the
> agent generating an explainer reviews it in a browser.

## What this implies for the next change

Two practices earned their place and one did not:

- **Revert-verification earned it.** Every probe fix was verified by breaking
  the thing it fixed and confirming the test failed. The anti-regression
  fixture was checked the same way — breaking the table renderer failed 6 of 8
  assertions.
- **Rendered review earned it.** Three real defects, zero automation.
- **Additional adversarial passes did not.** The second round produced a 2-fixed
  out-of-8 yield.

The full record lives in [PR #179](https://github.com/voxmedia/open-agent-toolkit/pull/179).
