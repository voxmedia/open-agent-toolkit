# Recon Worker Contract

Every recon assignment is a non-interactive leaf task. The controller supplies
the complete assignment; a worker does not infer broader authority.

## Required Assignment Envelope

The assignment must declare:

- `runId`, `waveId`, `laneId`, and exactly one mode;
- bounded objective, included scope, and excluded scope;
- allowed inputs and excluded inputs;
- source-read authority in `readSources`, including allowed read-only tools;
- sole `writePath`, contained by the packet directory and unique to the lane;
- required artifact `kind`, `schemaVersion`, and output schema;
- enforcement level and deadline; and
- whether failure should be recorded as required, optional, or conditional.

Reject an incomplete or contradictory assignment before reading sources. Never
request credentials, mutate an investigated source, broaden scope, or choose an
alternate write path.

## Modes

- `map`: inventory only the assigned source partition and report candidate
  evidence areas, unavailable inputs, and coverage gaps.
- `gather`: inspect assigned sources and emit source-grounded findings with
  typed locators, minimal display excerpts, uncertainty, and contradictions.
- `compile`: consume only designated dossiers and create a provisional claim
  ledger candidate. Deduplicate without inventing evidence.
- `verify`: consume an immutable verification brief, reopen only its declared
  sources, test locators and claim semantics, and report claim dispositions.
- `adversary`: consume scope, questions, and provisional statements only; seek
  counterevidence, unsupported inference, and missing alternatives.
- `coverage`: compare declared scope and questions with ledger coverage without
  reading gatherer reasoning.
- `reconcile`: apply review dispositions and contradiction outcomes to a new
  ledger candidate. Preserve prior revisions and never invent evidence.

No other mode is valid.

## Output Contract

Write exactly one JSON artifact at `writePath`. The artifact must include:

- `kind`, `schemaVersion`, run/wave/lane identity, mode, and outcome;
- the exact allowed and excluded inputs actually honored;
- findings or dispositions with evidence IDs and typed locators;
- uncertainty, contradictions, and gaps as explicit arrays;
- safe categorical diagnostics for unavailable or invalid inputs; and
- direct input artifact references and digests when applicable.

Persist minimal excerpts only. Detect and redact secret spans before writing;
never persist the secret or its sensitive-span digest. Finish by returning the
artifact path and compact outcome only.

The controller validates the candidate against `packet-contract.md` with the
bundled deterministic artifact validator. A validation failure quarantines the
candidate; it never authorizes the worker to rewrite a shared artifact, retry,
or launch a replacement.

## Invariants

- Read only the assignment's allowed inputs using its source-read authority.
- Write only the assigned artifact; never update a shared ledger or manifest.
- Never interact with the user.
- Never dispatch children, helpers, reviewers, or replacement workers.
- Never read excluded inputs, prior review conclusions, or raw reasoning that
  the selected mode is required to remain blind to.
- Report uncertainty and contradiction instead of converting them to
  confidence scores.
