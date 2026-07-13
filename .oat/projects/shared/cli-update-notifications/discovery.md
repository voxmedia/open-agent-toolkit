---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: false
---

# Discovery: cli-update-notifications

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Add a familiar CLI update experience: when a newer OAT CLI release is
available, ordinary command runs should notify the user and may offer an
interactive update. The exact mechanism is intentionally open for discovery.

## Clarifying Questions

### Question 1: Notification versus in-command update

**Q:** Should the first release use a passive update notice, or should it also
offer to run the package-manager update from inside the current command?
**A:** Use the recommended passive-notice approach.
**Decision:** The first release will notify only. It will not prompt or launch
an installer during unrelated commands.

### Question 2: Suppression and operating defaults

**Q:** Should suppression be environment-only, or should OAT also expose a
persistent preference?
**A:** The user authorized the remaining bounded decisions to be made
autonomously using the recommended defaults.
**Decision:** Support both `NO_UPDATE_NOTIFIER=1` and a persistent OAT
configuration switch. Check at most once every 24 hours and repeat a notice at
most once every 72 hours.

## Solution Space

_Include this section only when the request is exploratory or multiple viable approaches exist. For well-understood requests with an obvious approach, omit or replace with a single sentence stating the chosen direction._

### Approach 1: Cached passive notice _(Recommended)_

**Description:** Check the npm `latest` dist-tag on a bounded schedule, cache
the result, and print a concise update command when a newer stable version is
known.
**When this is the right choice:** Best for a CLI used by both humans and
automation, where command startup and exit behavior must remain predictable.
**Tradeoffs:** The user must run the update themselves, so adoption may be
slower than with an in-command prompt.

### Approach 2: Interactive update offer

**Description:** Use the same cached check, but in a genuine interactive
terminal ask whether OAT should invoke the detected package manager to install
the resolved version.
**When this is the right choice:** Best when update convenience is more
important than minimizing prompts and installation-source complexity.
**Tradeoffs:** Package-manager detection can be ambiguous; pseudo-TTY agent
sessions may still be disrupted; and a failed child installer complicates the
current command's UX and exit semantics.

### Approach 3: Explicit self-update command

**Description:** Keep automatic checks notification-only and add an explicit
`oat update` or `oat self-update` command that performs diagnostics and hands
off to the owning package manager.
**When this is the right choice:** Best when users need a guided update path,
channels, or troubleshooting without mutating installations during unrelated
commands.
**Tradeoffs:** It adds command surface and still requires package-manager-aware
handoff. True self-replacement is inappropriate for package-manager-owned
installs.

### Chosen Direction

**Approach:** Cached passive notice.
**Rationale:** It matches common Node CLI behavior, avoids disrupting agent and
script workflows, and does not need to infer ownership of the current
installation.
**User validated:** Yes.

## Options Considered

### Option A: Registry metadata check

**Description:** Resolve the published stable version from npm registry
metadata and compare it with the running CLI version.

**Pros:**

- Uses the package's authoritative `latest` dist-tag.
- Avoids shelling out to a package manager for every check.

**Cons:**

- Introduces the CLI's first routine network lookup.
- Requires cache, timeout, and silent-failure behavior.

**Chosen:** Provisionally A, subject to discovery.

**Summary:** A direct, time-bounded registry request with a durable TTL cache is
the likely mechanism. Network failure must never block or fail the user's
command.

## Key Decisions

1. **Distribution source:** Stable update availability is defined by the npm
   `latest` dist-tag for `@open-agent-toolkit/cli`, not by the numerically
   greatest published version.
2. **Command safety:** Update checking must be best-effort and must not alter
   the invoked command's exit status.
3. **Interaction model:** The first release is notification-only; it will not
   prompt or execute an update from an unrelated command.
4. **Suppression:** Respect `NO_UPDATE_NOTIFIER=1` and a persisted
   update-notification preference so both automation and individual users can
   opt out.
5. **Rate limits:** Refresh registry metadata at most once per 24 hours and
   show the same update notice at most once per 72 hours.
6. **Audience:** Run checks and show notices only for human, non-JSON command
   executions. Skip CI, tests, ephemeral package-runner invocations, local
   source development, help, and version output.
7. **Update guidance:** Display the documented npm global-install command; do
   not attempt package-manager ownership detection until OAT supports an
   executable updater.

## Constraints

- OAT supports global npm installs, ephemeral `npx` use, and local development;
  the UX must not assume every invocation owns a mutable global installation.
- JSON output, CI, non-interactive runs, tests, and ephemeral invocations must
  remain automation-safe.
- Checks must be cached and time-bounded so normal commands do not incur a
  registry round trip on every run.
- Registry and cache failures must be silent outside optional diagnostic output.

## Success Criteria

- A user running an interactive command receives a concise notice when a newer
  stable CLI version is known.
- Users on the current version, automation, and unsupported install contexts
  are not interrupted.
- Repeated commands respect check and notification rate limits.
- Offline or malformed registry responses do not fail or materially delay the
  requested command.
- Version-channel and pre-release behavior is covered by tests.

## Out of Scope

- Replacing package-manager-owned files directly.
- Automatically switching users to prerelease channels.
- Updating the other lockstep OAT packages independently of the CLI release.

## Deferred Ideas

- Channel selection (`next`, `beta`) - defer until OAT exposes a supported
  release-channel workflow.
- A standalone-distribution autoupdater - OAT is currently distributed as an
  npm package, so package-manager handoff is the safer model.

## Open Questions

No blocking discovery questions remain. Exact module boundaries and cache
schema will be resolved in the lightweight design.

## Assumptions

- The npm `latest` dist-tag is the canonical stable release signal.
- Update UX is absent from machine-readable JSON output rather than extending
  every command's JSON schema.
- A daily availability check and a three-day repeat-notice interval are fresh
  enough without becoming noisy.

## Risks

- **Command latency:** A synchronous registry request can slow every uncached
  command.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Cache successful checks, use a short timeout, and
    ensure failure backoff.
- **Wrong updater:** Invoking the wrong package manager can update a different
  installation or fail unexpectedly.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Prefer notice-only behavior; execute updates only
    when install ownership is known with high confidence.
- **Automation disruption:** Prompting in a pseudo-terminal can block agents.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Gate prompts on explicit interactive conditions and
    provide suppression controls.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- **Quick mode → straight to plan:** proceed directly to `plan.md` when
  scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused
  `design.md` (architecture, components, data flow, testing) before
  planning. Choose this when discovery surfaced architecture choices
  or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed
  the scope is larger or more complex than expected.
