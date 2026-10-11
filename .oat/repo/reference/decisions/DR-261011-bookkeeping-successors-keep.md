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

Evidence keeps the revision actually reviewed (reviewed_head, the Reviews row's Reviewed Head and bound revisions are never advanced). Evidence reviewed at R covers a published head H only when R = H, or R is an ancestor of H and every intervening commit, merge-introduced changes included, makes only permitted bookkeeping changes: this project's state.md, plan.md, implementation.md and project-log.md, and the exact review artifacts of the evidence (including those of deliveries that share the same member pull request). Permitted are routing and progress updates, evidence recording, review dispositions, registration and observation metadata, append-only journal observations and project-log entries inserted by oat project log append (before the end-of-run synthesis section). Approved brief content (Outcomes, Approach, Constraints, Decisions, Delivery endpoint and authority, phase Intent or Exit evidence, membership, frozen scope) and any code, test, configuration, template, skill or product-doc change are substantive; a substantive change followed by its revert is not a successor; missing objects, failed inspection and unknown paths fail closed. One shared evaluator (delivery/evidence.ts) serves delivery check, delivery refresh and the closeout boundary. Accepted leniencies: a modified review artifact needs no frontmatter identity check, and a recorded **Head:** may be rewritten under the late-fix rule. A delivery's exit_gate is set once and replaced only by a commit recording a review of a different artifact.

## Consequences

Brief amendments are substantive, and the goal project branch is the delivery head branch, so amendments stay local until the open delivery merges; pushing one stales that delivery (p12-t02 probe, confirmed). The goal declaration is recorded in the journal, not under the brief's Delivery endpoint and authority, so terminal deliveries carrying it stay fresh. The p12-t02 probe found and fixed two evaluator gaps: project-log appends inserted before the synthesis section, and review artifacts of sibling deliveries on a shared member.
