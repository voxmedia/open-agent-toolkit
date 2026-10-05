---
oat_generated: false
---

# Execution learnings: backlog-wave-5

Append-only observations for this approved wave.

## 2026-10-03T20:51:11.416Z - decision - Approved wave and review setup

**Observation:** The user approved one ten-item Quick wave, one PR, Codex GPT-6.1 Sol high implementation, and Claude Opus 5.5 high independent plan, all-phase, and final review. The checkout had no prior active project.
**Impact:** Technical decisions belong in one reviewed plan; implementation follows passing required reviews. Preserve the existing recap-ticket edit and worktree-init sync-manifest update. Merge and release remain outside the endpoint.
**Recommendation:** Reuse these routes and this project on continuation; stop if an exact required route becomes unavailable.

## 2026-10-03T21:23:09.420Z - gotcha - Count-format rejection after independent plan review

**Observation:** The Opus-high plan review declared six Medium and four Low findings as bold paragraphs. The branch gate accepts list-item findings and rejected their declared counts, returning receiveEligible false. Invocation fields were present; the envelope's missing corroboration followed the verdict-parse failure.
**Impact:** A completed review process is not a received review. The Quick plan cannot become ready until the owning gate recovery produces a validated envelope.
**Recommendation:** Preserve the original run/artifact and follow the existing validation recovery boundary; never turn a local format edit or raw reviewer summary into an invented gate pass.

## 2026-10-03 - decision - Bounded planning recovery

**Observation:** Original reviewer formatting could be repaired without changing content, but the completed gate has no public same-run revalidation entry. A direct parser result is insufficient for receive eligibility.
**Impact:** Preserve the failed run and original bytes, verify authoring corrections from source, then run the existing configured gate unchanged against the revised plan. Keep product work blocked until valid receive disposition.
**Recommendation:** Treat parser proof and gate receipt as separate evidence; retain root final verification and archival outside phase-worker task dispatch.
