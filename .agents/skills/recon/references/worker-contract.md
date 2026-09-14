# Recon Worker Contract

Every recon assignment is a non-interactive leaf task. The controller supplies
the complete assignment; a worker does not infer broader authority.

## Required Assignment Envelope

The assignment must declare:

- `runId`, `waveId`, `laneId`, the approved manifest wave mode, and exactly one
  worker assignment mode;
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

The manifest's ten wave modes map to the worker's closed seven-mode vocabulary:

| Manifest wave mode         | Worker assignment mode |
| -------------------------- | ---------------------- |
| `map`                      | `map`                  |
| `gather`                   | `gather`               |
| `compile`                  | `compile`              |
| `semantic-verification`    | `verify`               |
| `adversarial`              | `adversary`            |
| `coverage`                 | `coverage`             |
| `reconciliation`           | `reconcile`            |
| `redundant-gather`         | `gather`               |
| `redundant-verification`   | `verify`               |
| `contradiction-resolution` | `adversary`            |

A `contradiction-resolution` assignment seeks discriminating evidence and
never produces a ledger candidate. The assignment inherits its exact approved
wave target; the worker neither selects nor upgrades it.

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

Write exactly one JSON artifact at `writePath` using only the supplied closed
schema's fields:

- a `recon.raw-dossier` records the approved manifest wave through `waveId` and
  records the closed worker assignment mode in `mode`; it also carries `laneId`
  and `outcome`;
- a `recon.review-result` records its approved lane in `reviewerLane` and its
  approved review discriminator in `reviewKind`; and
- every artifact includes its required `kind`, `schemaVersion`, run identity,
  honored inputs and exclusions, findings or dispositions, explicit
  uncertainty, contradictions and gaps, safe categorical diagnostics, and
  direct input references where its supplied schema permits them.

Do not add a second mode field or any other field absent from the supplied
schema. The controller validates the artifact's `waveId` and `mode`, or its
`reviewerLane` and `reviewKind`, against the approved manifest wave before the
artifact can be promoted.

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
- Return evidence and explicit gaps to the controller; never decide downstream
  sufficiency, product implications, or final conclusions.
