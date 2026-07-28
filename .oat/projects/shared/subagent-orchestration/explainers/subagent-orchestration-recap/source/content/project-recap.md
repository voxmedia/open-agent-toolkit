Model-selection policy had been copied into every skill that dispatched a
subagent, and the copies had started to disagree. This project made one of them
canonical and portable.

## Original request

OAT's dispatch skill carried two different things in one place: durable
judgment about how much model a task deserves, and the machinery for actually
launching a child agent. Because the judgment lived inside OAT-specific
tooling, anyone who wanted the judgment had to take the machinery with it — so
consumers copied the guidance instead, and the copies drifted.

The request was to separate them without breaking the launch safeguards, and
without a rename that would churn every consumer at the same time.

## Key agent decisions

| Decision                      | Reason                                                                                     | Consequence                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Split guidance from mechanics | Model policy and launch machinery change on different clocks and for different reasons     | One canonical source for routing; dispatch keeps authorization, liveness, and recovery   |
| Directional dependency        | Guidance is useful without OAT; dispatch is not useful without guidance                    | Installing dispatch pulls guidance in; guidance installs alone                           |
| Opus-first Claude routing     | Cost savings belong in the high-volume bounded layer, not the low-volume root orchestrator | Fable is reserved for genuinely exceptional escalation                                   |
| Additive evidence only        | Existing dispatch records must stay valid across the change                                | New guidance and tier evidence is optional, with legacy and enriched fixtures proving it |
| Keep the existing skill name  | A rename would obscure the ownership change under consumer churn                           | `oat-dispatch-subagents` stays; a generic rename is separate work                        |

The directional dependency is the load-bearing one. It is what makes the
guidance layer genuinely portable rather than nominally extracted.

## As-built architecture

A caller classifies a bounded task; the dispatch engine resolves that class to
an authorized route and launches once.

```diagram
graph LR
Classify[Classify task] --> Guidance[Load guidance]
Guidance --> Catalog[Intersect live catalog]
Catalog --> Route[Authorize route]
Route --> Launch[Launch once]
```

That fence is the happy path, and it is linear. What it cannot show is the
shape that matters most here: the dependency between the two layers runs one
way, and the path has two places where it deliberately refuses to continue.
Both are composed diagrams linked from this page.

The split assigns ownership like this:

|                | Guidance layer                                                              | Mechanics layer                                                               |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Skill          | `subagent-orchestration`                                                    | `oat-dispatch-subagents`                                                      |
| Owns           | Task classes, selection principles, dated provider matrices, refresh policy | Capability probing, catalog intersection, routes, liveness, recovery, records |
| Installs alone | Yes                                                                         | No                                                                            |
| Audience       | Any agent, including outside OAT                                            | OAT lifecycle callers                                                         |

## Implementation record

| Component      | Notable change                                                                                                                     | Reference                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Guidance skill | New user-invocable skill: five task classes, durable principles, dated provider guidance, refresh rules                            | [PR #172](https://github.com/voxmedia/open-agent-toolkit/pull/172) |
| Dispatch skill | Reduced to mechanics while preserving probing, native-first routing, acceptance terminality, and fail-closed behavior              | [PR #172](https://github.com/voxmedia/open-agent-toolkit/pull/172) |
| Consumers      | Reviewer, implementer, planning, lifecycle-adapter, Cursor Cloud, and repo-improvement consumers migrated to a fixed loading order | [PR #172](https://github.com/voxmedia/open-agent-toolkit/pull/172) |
| Distribution   | Directional utility installation across provider sync and bundled CLI assets                                                       | [PR #172](https://github.com/voxmedia/open-agent-toolkit/pull/172) |
| Compatibility  | Legacy and enriched dispatch-record fixtures make additive evidence executable                                                     | [PR #172](https://github.com/voxmedia/open-agent-toolkit/pull/172) |

```timeline
2026-07-23 — Plan gate blocks; findings fixed and operator override recorded
2026-07-23 — Phases 1 and 2 pass after one fix iteration each
2026-07-23 — Phase 3 blocked on stale boundaries, then recovered
2026-07-23 — Final and cross-family exit gates pass with zero findings
```

## Validation evidence

| Check                   | Result                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| Phase reviews           | p01, p02, p05 passed after one fix iteration; p04 passed with zero findings     |
| Final lifecycle review  | Clean                                                                           |
| Cross-family exit gates | Two runs at critical:0, important:0, medium:0, minor:0                          |
| Repository verification | Workspace tests, lint, type-check, package and docs builds                      |
| Distribution            | Release validation, registry checks, docs-link crawling, provider-sync dry runs |

> [!IMPORTANT]
> The plan gate did not pass on its own. It blocked with one Important and one
> Medium finding, and the project proceeded under an explicit operator override
> after those were fixed. Every subsequent review was clean, but the record
> should say override rather than pass.

## Outcome

Working now: one canonical routing policy that installs and reads on its own,
dispatch mechanics that fail closed without it, migrated consumers loading
principles and exactly one provider reference in a fixed order, and dispatch
records that stayed valid across the change.

Deliberately not done: renaming `oat-dispatch-subagents` to something
provider-neutral. The name is now slightly wrong, and correcting it would have
buried the ownership change under a consumer migration. User-scope installation
of the guidance skill is also deferred until project-level distribution has
operating evidence.

The linked deep-dive on routing policy is the part worth reusing elsewhere; the
execution record is the part worth reading if you run this workflow.
