<!--
Provenance: https://github.com/voxmedia/open-agent-toolkit/issues/339
Captured: 2026-11-01 with `gh issue view 339 --repo voxmedia/open-agent-toolkit --json body`
Reported producer: @open-agent-toolkit/cli 0.3.13; reviewer Claude Opus, high effort, artifact mode
Source note: the published issue says this text is "abbreviated from the real artifact"; the original 2 Medium / 3 Low body is therefore not reproducible from this fixture.
Expected after the narrow grammar change: body tally 0 Critical / 0 High / 2 Medium / 1 Low; the declared 3 Low still disagrees with the abbreviated body and must produce a structured refusal.
The issue body below is reproduced exactly as published.
-->

## Summary

A review gate run produced a substantively clean review (0 critical, 0 high, 2 medium, 3 low) that `oat gate review` rejected with `artifact_validation_failed` / `receiveEligible: false`, because the reviewer wrote each finding as a bold lead-in paragraph followed by unindented detail bullets. The section tally came out **higher** than the declared counts (6 medium / 6 low against a declared 2 / 3), and there was no supported way to revalidate the artifact after a format-only correction, so an autonomous implementation run stopped at the gate boundary until an operator intervened.

- CLI: `@open-agent-toolkit/cli` 0.3.13
- Reviewer: Claude Opus, high effort, artifact mode, spawned by `oat gate review`

## Reproduction

A `## Findings` section shaped like this (abbreviated from the real artifact):

```markdown
Findings by severity: 0 critical, 0 high, 2 medium, 3 low

## Findings

### Medium

**M1 — Title of the first finding** (`src/a.ts:1-10`)

- Issue: …
- Fix: …
- Requirement: …

**M2 — Title of the second finding** (`src/b.ts:1-10`)

- Issue: …
- Fix: …
- Requirement: …

### Low

**L1 — …**

- Issue: …
- Fix (optional): …
```

`countFindingsInSection` (`dist/commands/gate/review-verdict.js`, around lines 144–151) counts every line matching `/^([-*+]\s+\S|\d+\.\s+\S)/`. The bold lead-in lines count as zero and each column-zero detail bullet counts as one, so Medium tallies 3 + 3 = 6 and Low tallies 2 + 2 + 2 = 6. `assertAgreeingCounts` then fails against the declared summary line.

The reviewer did violate its instruction ("Every finding MUST be written as a markdown list item"), so the validator behaved as specified. The problems are in what happens next.

## Problems

1. **The diagnostic describes the opposite failure.** `FINDING_LIST_ITEM_CONTRACT_HINT` says a finding written as a bold paragraph "counts as zero, which is the usual reason a section tallies lower than the declared counts." In this shape the tally is higher, because the detail bullets are counted as findings. An agent reading the hint is pointed away from the cause.

2. **No artifact-only revalidation.** The defect is presentational, but the only supported recovery is a fresh `oat gate review`, which creates a new run and launches another provider review. `oat gate review --help` lists no option to re-verdict an existing artifact. For an autonomous run that forbids replacing an accepted review, this turns a formatting slip into a hard stop that needs a human.

3. **The validator has enough information to recognise this shape.** When the declared summary and the section tally disagree, and the number of bold lead-in paragraphs (or of `Issue:` bullets) per section equals the declared count, the mismatch is almost certainly this formatting pattern.

## Suggested changes

- Add a supported way to re-run only the verdict step on an existing artifact (for example `oat gate review --revalidate <artifact>`), recording that the content changed and keeping the original run id, so a format-only repair does not need a new provider review.
- Extend the hint to cover the over-count case: "detail bullets at column zero under a bold finding title are each counted as a finding; make the title a list item and indent its details."
- Consider counting only list items whose text begins with a finding marker, or treating column-zero `Issue:` / `Fix:` / `Requirement:` bullets as details of the preceding finding. At minimum, detect the bold-lead-in pattern and name it in the error.
- Optionally offer a deterministic normalisation, in the same spirit as the existing missing-severity-section normalisation: rewrite `**Title**` + column-zero bullets into `- **Title**` + indented bullets when doing so makes the tally equal the declared counts.
- In the reviewer prompt, show the required shape as a literal example next to the rule; the rule alone did not prevent the natural "bold title, then bullets" layout.

## Impact

One autonomous project run stopped after a passing phase review. Recovery required explicit operator authorization for a format-only repair.
