# Lifecycle Gate Approval Record

A configured lifecycle gate ends in an outcome the operator or a later session
needs to see again: it passed, it warned, the operator explicitly continued
past a failure, the project disabled it, or it blocked. Chat output does not
survive the session, so the skill that runs the gate persists the outcome in
project `state.md`. This document defines the record's shared core once; each
carrier names where it lives and what it adds.

## Core record

```yaml
<carrier>:
  status: allowed # allowed | blocked
  disposition: passed # passed | warned | prompt_approved | project_disabled; null when blocked
  config_fingerprint: '<stable hash of the resolved gate declaration>'
  reviewed_head: '<full SHA of the commit the gate reviewed>'
  decided_at: '2026-10-02T15:20:00Z'
```

- `status`: `allowed` | `blocked`.
- `disposition`: `passed`, `warned`, `prompt_approved`, or `project_disabled`
  when `status` is `allowed`; `null` when `status` is `blocked`.
- `config_fingerprint`: the writer's stable hash of the resolved gate
  declaration it ran (command, description, `onFailure`, `maxAttempts`, and the
  project override state), recorded as provenance. Implement recomputes its own
  carrier's fingerprint under its Step 14 rules; quick-start readers do not.
- `reviewed_head`: the full 40-character SHA of the commit the gate reviewed,
  recorded as provenance. `null` when no gate ran.
- `decided_at`: the ISO 8601 UTC time the outcome was decided. A record written
  before `decided_at` existed is not malformed for that reason alone.

## Write rules

| Gate outcome                                                    | Record                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| Passed its threshold                                            | `allowed` / `passed`                                        |
| Failed under `onFailure: warn`                                  | `allowed` / `warned`                                        |
| Failed under `onFailure: prompt`, operator explicitly continued | `allowed` / `prompt_approved`                               |
| Failed under `onFailure: prompt`, operator declined or deferred | `blocked` / `null`                                          |
| `block` still failing after `maxAttempts`                       | `blocked` / `null`                                          |
| Configured but disabled by project override (no launch)         | `allowed` / `project_disabled`                              |
| Launch, transport, validation, or receive failure               | `blocked` / `null`                                          |
| Not configured                                                  | no record (quick-start); implement writes `allowed/no_gate` |

Only an explicit operator continuation writes `prompt_approved`. Declining,
deferring, giving no response, or running under `OAT_AUTONOMOUS=1` writes
`blocked`, never anything that reads as approval. A rerun of the same gate
replaces the record.

## Carriers

- **`oat_implement_exit_gate`** (`oat-project-implement`,
  `references/completion-and-closeout.md` Step 14) uses this core and keeps its
  additional values and fields there: the `pending` and `stale` statuses, the
  `no_gate` disposition, and the resolution, attempt, launch, receive, waiver,
  and freshness fields. Its own effective-delta freshness rule decides whether a
  record is current.
- **`oat_quick_start_gate`** (`oat-project-quick-start`, Gate Execution) carries
  exactly the core.

## Reading a quick-start record

Readers report a quick-start record as recorded and do not recompute
`config_fingerprint`: no CLI emits a canonical fingerprint for the quick-start
gate, so a recomputation could not be reproduced across sessions. They do not
route on the record either.

- Report `status`, `disposition`, `decided_at`, and `config_fingerprint` (as
  provenance) exactly as stored.
- Report the record as malformed when `status` and `disposition` do not form
  one of the combinations in the write rules, or when a present `decided_at` is
  not a valid ISO 8601 UTC time.
- `reviewed_head` is provenance only and is not compared with `HEAD`, because
  the quick-start completion step commits after the gate.
- An absent record means none was written: no gate was configured, the gate
  has not reached an outcome, or the plan predates the record. Readers do not
  infer which.

Readers never write, repair, or infer a record.
