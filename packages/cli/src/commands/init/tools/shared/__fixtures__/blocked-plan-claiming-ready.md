<!--
Captured negative-control fixture. DO NOT EDIT BY HAND.

Source:   .oat/repo/reference/external-plans/2026-09-02-add-exclusions-to-docs-index-generation.md
Captured: 6db0457c095e4384e5ac2f464ee1c4d5a47d0179 (the commit that last changed the source)
Contains: the source's frontmatter verbatim, plus its `## Dependencies`,
          `## Landing-event impact` and `## Revalidation Before Execution`
          sections verbatim. Body prose and other sections are omitted; only
          these bytes are load-bearing for the assertion.

Why this is the recorded negative control: the source declares
`oat_execution_status: READY` while its `Hard ordering` row still reads
"Pending in W1; this plan is BLOCKED until then." That contradiction is real
and live. It is tolerated today only because the plan's date selects legacy
mode; re-dated past the contract, these same bytes are rejected.

This is a snapshot rather than a live read on purpose. Repairing the real
plan is the correct maintenance action, and a test reading the live file
would make that repair break CI. Retrofitting durable plans is out of scope
for the plan that introduced this contract, so the source is left as-is and
the defect is preserved here instead.
-->

---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-add-an-exclusion-mechanism.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-add-an-exclusion-mechanism
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/239
created: '2026-09-02T23:59:00Z'
---

## Dependencies

| Type              | Dependency                                                                                                                                            | Required state                                                                                                                                   | Current state                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Hard ordering     | [Use configured docs index paths](./2026-08-30-use-configured-docs-index-paths.md) / `BL-260718-fix-oat-docs-generate-index`                          | Merged to `origin/main`; `index.ts:71-97` no longer calls `writeOatConfig`; the `generateIndex` dependency type is final.                        | Pending in W1; this plan is BLOCKED until then. |
| Soft ordering     | Sibling plan [Keep instruction-sync pointers out of docs trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md)                     | Both edit `OatDocumentationConfig`; sequence.                                                                                                    | Pending.                                        |
| Soft ordering     | Sibling plan [Add oat config unset](./2026-09-02-add-oat-config-unset-command.md)                                                                     | Land this plan first so `unset` covers the new key.                                                                                              | Pending.                                        |
| Related, distinct | W5 group 3 plan [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md) | No longer shares `oat-config.ts`: its optional config keys moved to `BL-260904-add-recap-seam-config-keys` (2026-09-05). No ordering constraint. | Pending.                                        |

One hard dependency is unsatisfied: the W1 docs-index path plan must merge
first.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                     | Required update                                                                                                          |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | No       | `docs/init/index.ts` only (different command).                                                                      | Re-run the drift check. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch. |
| `review-plan-workflow` (draft PR #190) merges                                        | Minor    | `commands/config/index.ts`, `config/index.test.ts`, `cli-utilities/configuration.md`, `reference/cli-reference.md`. | Re-anchor the config key-union, `KEY_ORDER`, and set-branch line numbers before editing step 3; no behavioral change.    |

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #239, the
W1 plan's merged result, and the generator and config tests when substantial
time passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, PR #190 lands (config command
anchors), cited contracts change, another PR implements part of the outcome,
or a load-bearing claim cannot be reproduced. Flip the status to `READY` only
after step 1 passes.

