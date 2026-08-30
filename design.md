---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: Gate Execution Contract Hardening

## Overview

The gate execution contract will be enforced at the earliest authoritative
boundary and then preserved unchanged through runtime. `oat gate set` will
recognize direct lifecycle `oat gate review` commands, require the canonical
global-JSON form `oat --json gate review`, and reject invalid recognized
commands with an actionable message before writing any config layer. The
validator will not rewrite argv, inspect provider exec-target `baseCommand`
values, execute shell text, or claim to understand arbitrary wrappers.

At runtime, the existing headless, awaited-child, correlation, and receive
eligibility behavior remains intact. The narrow change is to classify a clean
child exit that produces no artifact as `artifact_missing`, separate from
`targeting_correlation_failed`, which remains reserved for an observed artifact
that cannot be corroborated to the expected project/run/invocation. Both paths
remain terminal, non-remediable within the same accepted launch, and
non-receive-eligible.

The integration layer will persist a valid configured command, resolve it, and
execute that exact command through the deterministic fake runtime. The test
matrix will prove correlated success, clean exit without an artifact, and
wrong-run correlation mismatch as three distinct outcomes. Gate-aware skill
guidance and docs will use the same canonical command shape so configuration,
lifecycle preflight, and examples no longer disagree.

## Architecture

### System Context

The feature stays inside the existing gate command, gate child, and workflow
skill boundaries. No new receipt store, event type, review plan, or provider
adapter is introduced.

**Key Components:**

- **Configured command validator:** Pure recognition and validation for direct
  lifecycle gate-review command strings.
- **Gate configuration writer:** Rejects invalid recognized commands before a
  shared, local, or user config mutation.
- **Headless gate runner:** Awaits one accepted child, inventories artifacts,
  and emits cause-specific structured outcomes.
- **Contract corpus:** Gate-aware skill text and docs aligned to the canonical
  global option placement.
- **Configuration-driven harness:** Executes a stored command unchanged against
  the fake runtime and parses its final structured envelope.

### Component Diagram

```text
gate set --command
        |
        v
configured-command validator ---- invalid ----> actionable error, no write
        |
      valid
        v
layered gate config -> gate resolve -> exact shell command -> oat --json gate review
                                                           |
                                                           v
                                                   one headless child
                                                           |
                          +----------------+---------------+----------------+
                          |                |                                |
                    correlated        no artifact                   observed mismatch
                          |                |                                |
                         ok       artifact_missing          targeting_correlation_failed
```

### Data Flow

1. `gate set` parses the ordinary gate fields and passes the command string to
   the pure validator before any config mutation.
2. An unrelated or conservatively unrecognized command preserves existing
   behavior. A recognized direct `oat gate review` command must match the
   canonical global-JSON prefix or returns an error naming that form.
3. A valid command is persisted byte-for-byte and later returned by
   `gate resolve` without normalization.
4. The lifecycle launches the resolved command unchanged. `gate review` creates
   its run metadata, injects headless environment, and awaits the single child.
5. After child close, artifact inventory chooses exactly one of three relevant
   branches: correlated artifact, no produced artifact, or observed but
   uncorroborated artifact.
6. The final JSON envelope carries the specific status, eligibility, handoff,
   and recovery fields consumed by the lifecycle.

## Component Design

### Configured Command Validator

**Purpose:** Detect the direct OAT gate-review command family without executing
or rewriting shell text.

**Responsibilities:**

- Recognize direct `oat` invocations whose command path is `gate review`.
- Accept only the canonical lifecycle prefix `oat --json gate review`.
- Return an actionable invalid result for missing, late, or subcommand-scoped
  `--json` placement.
- Treat provider commands, arbitrary wrappers, and unrelated shell strings as
  outside this validator rather than guessing from substrings.

**Interfaces:**

```typescript
type GateCommandContractResult =
  | { kind: 'not-applicable' }
  | { kind: 'valid'; command: 'gate-review' }
  | { kind: 'invalid'; command: 'gate-review'; message: string };

function validateConfiguredGateCommand(
  command: string,
): GateCommandContractResult;
```

**Design Decisions:**

- Keep the classifier pure and adjacent to gate commands so configuration and
  tests share one rule.
- Recognition is intentionally conservative. A future shell-AST project may
  widen wrappers; this project does not execute or fully parse arbitrary shell.
- Validation is blocking only for a recognized direct lifecycle command. It
  does not ban non-review commands from the generic gate mechanism.

### Gate Configuration Writer

**Purpose:** Make invalid lifecycle configuration impossible through
`oat gate set`.

**Responsibilities:**

- Run command validation before `updateConfigLayer`.
- Convert an invalid result into the existing human/JSON error surface with
  exit code 1.
- Guarantee that shared, local, and user config files are unchanged on failure.
- Preserve existing dev-build warnings for otherwise valid commands.

**Design Decisions:**

- There is no override flag in this project. A deliberately human-output gate
  remains possible through unrelated commands, but a recognized lifecycle
  `gate review` declaration must honor its structured consumer contract.

### Headless Terminal Classifier

**Purpose:** Separate absence of an artifact from failure to corroborate an
artifact that exists.

**Responsibilities:**

- Emit `artifact_missing` when an accepted child exits cleanly and artifact
  inventory finds neither a direct candidate nor a diagnostic artifact.
- Keep `targeting_correlation_failed` for wrong-run, wrong-project, duplicate,
  or other observed targeting/correlation evidence.
- Preserve `review_failed` for nonzero child failure, refusal, and timeout.
- Preserve `artifact_validation_failed` for malformed or contract-invalid
  artifacts.
- Keep all failure branches non-receive-eligible with `handoff: null`.

**Interfaces:**

```typescript
type ReviewGateTerminalStatus =
  | 'ok'
  | 'blocked'
  | 'review_failed'
  | 'artifact_missing'
  | 'targeting_correlation_failed'
  | 'artifact_validation_failed';
```

**Design Decisions:**

- Use a dedicated status rather than only changing `message`; automation needs
  a stable branch while operators need cause-specific recovery guidance.
- Do not relaunch or spend a remediation attempt after the child was accepted.

### Headless Prompt and Contract Corpus

**Purpose:** Ensure every producer states the same no-yield and structured
command contracts.

**Responsibilities:**

- Add a concise runner-owned context note that required review work and
  artifact/bookkeeping completion must be inline or synchronously awaited.
- Retain the deeper route contract in the review-provide and dispatch skills.
- Align gate-aware skill examples and lifecycle checks on
  `oat --json gate review` without introducing provider/model targets.
- Bump each changed canonical skill version once in the final PR diff.

**Design Decisions:**

- Reinforcement belongs in the generated headless prompt as well as the
  canonical skill because the incident occurred inside a provider child.
- This is contract alignment, not a new dispatch or receipt policy.

### Configuration-Driven Integration Harness

**Purpose:** Prove the full configured-command-to-envelope seam without an
external provider.

**Responsibilities:**

- Configure a skill gate using the public `gate set` command.
- Resolve the stored command and assert byte-for-byte preservation.
- Execute the resolved command with `PROJECT_PATH` and deterministic fake
  runtime configuration.
- Parse one final stdout envelope and preserve stderr diagnostics separately.
- Cover correlated success, clean no-artifact exit, and wrong-run mismatch.

**Design Decisions:**

- Extend the existing fake runtime and subprocess matrix rather than add a new
  provider simulator.
- Keep exact configured-command execution in the harness so the integration
  test catches option-placement or shell-mutation regressions.

## Data Models

No persistent schema is added. The existing `GateConfig` remains unchanged.
The only public model extension is the terminal status literal
`artifact_missing`; its envelope uses the existing fields:

```typescript
interface ArtifactMissingEnvelope {
  status: 'artifact_missing';
  outcome: 'review_completed_artifact_missing';
  runId: string;
  target: string;
  project: string;
  artifactPath: null;
  receiveEligible: false;
  remediable: false;
  handoff: null;
  message: string;
  recovery: string;
}
```

The recovery text tells the operator that the accepted headless child completed
without the required correlated artifact and must be fixed before a new gate
run. It does not imply same-run replacement eligibility.

## Error Handling

- **Configuration error:** Exit 1 through the existing error writer, name the
  offending structured-output contract, show
  `oat --json gate review --project "$PROJECT_PATH" ...`, and leave the selected
  config layer unchanged.
- **Child failure/refusal/timeout:** Preserve `review_failed` and current
  timeout/activity evidence.
- **Clean child without artifact:** Emit `artifact_missing`, exit 1, set
  `receiveEligible: false`, `remediable: false`, and `handoff: null`.
- **Observed correlation mismatch:** Preserve
  `targeting_correlation_failed` with actual/expected corroboration evidence.
- **Malformed artifact:** Preserve `artifact_validation_failed` and correction
  guidance.
- **Retries:** No retry behavior changes. Accepted-child failure remains
  terminal for that run.

## Testing Strategy

### Unit Tests

- Command classifier cases: canonical command; missing, late, repeated, and
  subcommand-scoped `--json`; unrelated commands; provider `baseCommand` text;
  quoted prompt substrings; conservative wrapper handling.
- `gate set` cases across human and JSON output: invalid recognized command
  exits 1, returns the actionable message, and does not mutate shared/local/user
  config; valid command persists exactly.
- Runtime writer cases: `artifact_missing` envelope fields, exit code, project
  log status, and preservation of existing mismatch/validation branches.
- Contract corpus tests: gate-aware lifecycle skill examples require canonical
  global placement and headless prompt text forbids background/waiter yielding.

### Integration Tests

- Configuration-driven correlated success resolves the exact stored command,
  launches with headless environment, and returns `ok` plus a corroborated
  receive-eligible handoff.
- Clean child exit without any artifact returns `artifact_missing` and is not
  receive-eligible.
- Wrong-run artifact returns `targeting_correlation_failed`, proving the two
  diagnoses remain distinct.
- Existing timeout, refusal, artifact validation, and liveness scenarios remain
  green.

### Repository Gates

Run focused CLI and contract suites during tasks, then the repository's full
definition-of-done sequence with an evidence-grade uncached test run before
closeout. Because bundled skills/docs and publishable CLI behavior change, also
run skill-bump and lockstep release validation gates.

## References

- Discovery: `discovery.md`
- `packages/cli/src/commands/gate/index.ts`
- `packages/cli/src/commands/gate/gate-hardening.integration.test.ts`
- `packages/cli/src/commands/gate/__fixtures__/fake-runtime.mjs`
- `.agents/skills/oat-project-review-provide/SKILL.md`
- `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
