---
id: DR-261011-bookkeeping-successors-keep
title: Bookkeeping successors keep goal delivery evidence fresh
date: 2026-10-11
status: accepted
legacy_id: null
---

# Bookkeeping successors keep goal delivery evidence fresh

## Context

Registering, receiving and publishing a delivery all commit after the reviewed revision, so an exact-head comparison would stale every delivery it records, while a paths-only rule would accept an edited Outcome or a substantive change in a tracking file.

## Decision

Evidence keeps the revision actually reviewed (reviewed_head, the Reviews row's Reviewed Head and bound revisions are never advanced). Evidence reviewed at R covers a published head H only when R = H, or R is an ancestor of H and every intervening commit, merge-introduced changes included, makes only permitted bookkeeping changes: this project's state.md, plan.md, implementation.md, project-log.md and summary.md, and the exact review artifacts of the evidence (including those of deliveries that share the same member pull request). summary.md is derived institutional memory, never the authority for outcomes, approach, constraints, decisions or endpoint (those live in the brief), so any change to it is bookkeeping; the configured post-implement sequence commits it before the pr step (p12 review M1, decision a). The allowlist stays project-scoped: a summary step before pr in goal mode defers its repo-level ledger and decision-record writes until the terminal delivery is registered (p12 review round 2 M1). Permitted are routing and progress updates, evidence recording, review dispositions, registration and observation metadata, append-only journal observations and project-log entries inserted by oat project log append (before the end-of-run synthesis section). Approved brief content (Outcomes, Approach, Constraints, Decisions, Delivery endpoint and authority, phase Intent or Exit evidence, membership, frozen scope) and any code, test, configuration, template, skill or product-doc change are substantive; a substantive change followed by its revert is not a successor; missing objects, failed inspection and unknown paths fail closed. One shared evaluator (delivery/evidence.ts) serves delivery check, delivery refresh and the closeout boundary. Accepted leniencies: a modified review artifact needs no frontmatter identity check, and a recorded **Head:** may be rewritten under the late-fix rule. A delivery's exit_gate, its integrated_review identity and its members[].reviewed_head are set once and replaced only by a commit recording a review naming a different artifact of that delivery (never a sharing sibling's; the delivery's own review artifacts are those its Reviews rows record), with each reviewed_head equal to the head the new bound_revisions binds; a bound revision that disagrees with its member's reviewed_head is not fresh (bound-revision-mismatch). This keeps the 12.6 recovery of an open delivery (fixes pushed to its member, then a clean receive) deliverable (final review round 2).

## Consequences

Brief amendments are substantive, and the goal project branch is the delivery head branch, so amendments stay local until the open delivery merges; pushing one stales that delivery (p12-t02 probe, confirmed). The goal declaration is recorded in the journal, not under the brief's Delivery endpoint and authority, so terminal deliveries carrying it stay fresh. The p12-t02 probe found and fixed two evaluator gaps: project-log appends inserted before the synthesis section, and review artifacts of sibling deliveries on a shared member.
