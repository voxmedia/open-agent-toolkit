---
id: DR-260908-a-stop-whose-remedy-lies
title: A STOP whose remedy lies inside the plan's own file scope is closed by a
  dated refresh, not a park
date: 2026-09-08
status: accepted
legacy_id: null
---

# A STOP whose remedy lies inside the plan's own file scope is closed by a dated refresh, not a park

## Context

The execution program's STOP semantics (DR-260713-bundle-stop-semantics-park, carried by oat-wave-execute) park a lane when a plan's STOP condition fires, and DR-260907-pre-dispatch-refreshes-live makes dated Refresh applied entries in the source plan the only sanctioned way to amend a plan's contract. Wave 6 p03 (preserve `__proto__`-named config keys) hit its plan's own STOP mid-lane: the prescribed parseTree + getNodeValue mechanism recursed where the old parser did not and a null-prototype value broke a String() coercion in oat-config.ts. The STOP's own text prescribed the remedy (a normalization layer), the remedy touched only files already in the plan's In scope, and parking would have carried a nearly finished lane to a later wave for a change the plan itself asked for.

## Decision

When a plan's STOP condition fires and (a) the STOP text or the plan's Outcome prescribes the remedy, (b) the remedy changes no file outside the plan's declared In scope, and (c) no other lane's contract depends on the mechanism being replaced, the orchestrator amends the plan with a dated post-STOP Refresh applied entry that names the STOP, the reproduction, and the replacement mechanism, and the lane resumes on its staged work under the amended contract. The refresh is committed to the source plan before the lane resumes, the resumed dispatch carries a new request id, and the root review verifies the amended contract rather than the original. A STOP whose remedy escapes the plan's file scope, contradicts another lane's contract, or has no prescribed remedy still parks the lane exactly as before.

## Consequences

Wave 6 p03 resumed the same day and merged with a review-verified mechanism (iterative materialization into plain objects with own-key defineProperty) instead of parking to wave 7; the plan text stays the single contract because the amendment lives in it as a dated entry. The rule adds a judgment call at the STOP boundary: the orchestrator must show all three conditions in the refresh entry and record the STOP in the orchestration log. Lane briefs keep the reproduce-report-never-improvise rule; only the root may write the refresh.
