---
id: DR-261012-one-archive-retention-set
title: One archive retention set
date: 2026-10-12
status: accepted
legacy_id: null
---

# One archive retention set

## Context

artifact-cleanup introduced an archive identity manifest over the retained files. The manifest hashed the pr/ directory while the S3 upload and hydration already excluded pr/, so any archive restored from S3 failed its retry check as damaged. The local copy, the manifest, the upload and hydration each defined the retained set independently.

## Decision

pr/ joins reviews/ and .git in a single ARCHIVE_RETENTION_EXCLUSIONS list, and the S3 exclude list is derived from it. The local copy, the identity manifest, the S3 upload and hydration all read that one set, keeping the intentional S3 exclusion of PR material rather than starting to upload it.

## Consequences

An archive restored from S3 rehashes identical to its local original. Archived projects no longer keep their PR description, so oat-project-complete carries the regenerated PR body across the archive in a temporary file, and oat-wrap-up's sibling pr/ scan finds nothing in archived projects (BL-261012-wrap-up-pr-cross-reference). Any future change to what an archive retains edits the one list.
