---
id: DR-261012-reviews-are-not-archived
title: Reviews are not archived
date: 2026-10-12
status: accepted
legacy_id: null
---

# Reviews are not archived

## Context

Journal and plan rows cite review files, but the archive writer excludes reviews/ from the local archive copy and the S3 upload (S3_ARCHIVE_SYNC_EXCLUDES and the copy filter), so archived citations do not resolve. Thomas: reviews are noise.

## Decision

Keep excluding reviews from archives. The journal and plan must stand without the review file: a review receipt carries finding identity and substance, disposition and rationale, the linked fix task or approved deferral, and the final outcome. Review paths are local-only citations, and an unresolved review citation is never a completion defect (artifact-cleanup D2).

## Consequences

Review-receive, review-receive-remote, revise and the implement references write self-contained receipts into the owning phase or ## Reviews and Gates. The journal validator never resolves review paths. A retention change for reviews would be a new decision.
