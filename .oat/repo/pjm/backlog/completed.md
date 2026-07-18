# OAT Backlog Completed

> Summary archive for completed backlog work. Keep newest entries first. Use `backlog/archived/` for full file-per-item historical records when a completed item still needs rich context.

## Entry Format

- `YYYY-MM-DD — BL-YYMMDD-slug — Title — one-line outcome summary`

## Completed Items

- 2026-07-18 — BL-260708-enable-oat-reviewer-subagent — Enable oat-reviewer subagent orchestration for faster broad reviews — Enabled bounded reviewer-local reconnaissance for faster broad reviews while preserving primary-reviewer judgment and evidence validation.
- 2026-07-13 — BL-260712-trim-dispatch-and-dry-run — Trim dispatch-and-dry-run implementation reference — Trimmed dispatch-and-dry-run.md from 715 to 562 lines: deduplicated engine/adapter-owned semantics into pointers, compressed the Dispatch Report V1 tutorial content and worked examples to their normative core, and consolidated the Codex target-first invariant. All 41 test-asserted strings and every contract regex preserved; 103 contract tests, 123 smoke tests, and release validation pass. Landed at 562 lines rather than the ~450 target because the remaining content is test-asserted normative contract; further cuts would require relaxing contract tests.
- 2026-07-13 — BL-260711-add-live-workflow-smoke — Add live workflow smoke fixture — Shipped a disposable three-phase fixture, root-owned phase-agent orchestration, deterministic and live evidence, recovery and preflight hardening, and operator documentation; the canonical Codex packet passes 10/10 assertions.
- 2026-07-11 — BL-260709-split-post-implementation — Split post-implementation sequence into pre- and post-approval steps — Added structured pre- and post-approval sequencing with legacy compatibility and restart-safe final HiLL handling.
- 2026-07-11 — BL-260707-cache-cursor-model-catalog — Cache Cursor model catalog during matrix validation — Added pass-scoped Cursor probe and broad-catalog caching for adoption and doctor.
- 2026-07-11 — BL-260707-consolidate-dispatch-matrix — Consolidate dispatch matrix normalization and traversal — Consolidated dispatch matrix normalization and traversal behind shared adapters.
- 2026-07-11 — BL-260709-add-dispatch-machine-schema — Add dispatch machine schema and formatter — Delivered Dispatch Report V1 schema, formatters, and workflow integration.
- 2026-07-10 — BL-260707-ask-to-enable-phase-review — Ask to enable phase review gates when gate config exists — Plan workflows now offer opt-in phase review gates when qualifying targets exist.
- 2026-07-10 — BL-260707-support-producer-identity — Support producer identity aggregation for final and range review gates — Final and range review gates aggregate in-scope producer provenance.
- 2026-07-10 — BL-260707-declare-gate-review-target — Declare gate review target project — Gate review projects are explicitly declared and fail closed on artifact mismatch.
- 2026-07-10 — BL-260707-record-gate-review-model — Stamp gate invocation target metadata on review artifacts — Gate reviews now stamp and corroborate configured invocation target metadata.
