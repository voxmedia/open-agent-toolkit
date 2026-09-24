---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-09-24
oat_generated: false
---

# Discovery: Codex Astra Frontier

## Initial Request

After merging the Claude effort and model-guidance PR, create a separate branch
and follow-up PR for Codex Frontier. Replace the recommended Sol max candidate
with Astra high and Astra xhigh, retaining Sol xhigh first. Review the current
default dispatch ladders and model guidance against the separately maintained
accepted model-selection policy, and identify inconsistencies.

## Key Decisions

1. **Recommendation:** Codex Frontier candidates are Sol xhigh, Astra high,
   then Astra xhigh. The final candidate is the Frontier reviewer target.
2. **Support versus preference:** Remove Sol max from the recommended Frontier
   cell only. Keep it selectable in the Codex supported catalog. Add documented
   Astra efforts low through max to the catalog so lower preferred efforts
   remain valid; recommend only high and xhigh in Frontier. Do not add ultra.
3. **Policy boundary:** The accepted portfolio policy predates the latest
   release-specific OAT defaults. A newer research packet is review-pending.
   Record meaningful differences without treating draft research as approved
   policy or automatically rewriting the other ladders.
4. **Release boundary:** This is a new branch and PR based on the merged mainline.
   Keep the prior PR unchanged and avoid committing local review archives.

## Constraints

- Confirm exact Astra model ID and effort support against official documentation
  and the local Codex catalog; do not infer a Cursor selector from API support.
- Regenerate checked-in Codex agent views and the CLI bundle from canonical
  sources. Update affected tests, guidance, and release versions.
- Existing adopted dispatch cells remain user-owned; a new bundled default must
  not silently overwrite them.
- Do not claim a live paid dispatch or workload evaluation from catalog presence.

## Success Criteria

- Fresh adopters see Sol xhigh, Astra high, Astra xhigh in Codex Frontier order.
- Astra targets resolve to exact pinned reviewer and implementer variants;
  lower preferred efforts remain valid under the Frontier ceiling.
- Sol max remains supported for explicit configuration, but is absent from the
  bundled Frontier recommendation.
- Focused tests and required repository gates pass; the separate PR is open.
- The user receives a source-status-aware audit of the current ladder and
  guidance differences, with unverified routes clearly identified.

## Out of Scope

- Rewriting the independently owned model-selection corpus or declaring its
  review-pending research accepted.
- Broad retuning of Claude or Cursor ladders in this Astra PR.
- A paid provider probe or claims about production workload performance.

## Next Steps

Proceed directly to a quick-mode implementation plan for the bounded Codex
catalog, recommendation, generated-view, test, and documentation changes.
