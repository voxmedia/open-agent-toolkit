---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
---

# Discovery: recon-skill

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Record implementation details as open design questions unless they are
  already firm product constraints.

## Initial Request

Create a general-purpose, user-invocable `recon` skill that cheaply prepares
source-grounded evidence for downstream agents. The skill should fan out many
economical subagents for reconnaissance, then run independent validation,
verification, adversarial, and coverage passes before compiling a compact
evidence packet. The intended result is that a more expensive model can consume
one precise packet with exact paths, line ranges, excerpts, findings, and gaps
instead of repeating the reconnaissance itself.

The skill should be useful before or during OAT project discovery but must not
depend on an OAT project destination. Its relationship to `analyze` is that
`analyze` interprets an existing target, while `recon` acquires and validates
the evidence that another workflow can later interpret.

## Clarifying Questions

### Question 1: Primary Contract

**Q:** Is the skill primarily an evidence-packet producer, a reconnaissance
orchestrator, or a persistent research workspace?

**A:** Evidence-packet producer.

**Decision:** Reconnaissance is the mechanism; the stable product contract is a
destination-independent evidence packet.

### Question 2: Packet Source of Truth

**Q:** Should the packet be narrative-first, dossier-first, or a structured
claim ledger with a compact synthesis?

**A:** Claim ledger plus synthesis.

**Decision:** `claims.json` is canonical. `packet.md` is the compact consumer
view derived from the ledger. Raw dossiers remain available for audit but are
not normal consumer input.

### Question 3: Model Policy

**Q:** Should the skill hard-code a cheap model, select different models by
worker role, or require approval of one model for the run?

**A:** Require user approval and use the same approved capable economical model
for every pass. Current models such as GPT-5.6 Luna may be examples, not durable
requirements.

**Decision:** Resolve an exact live model and effort through the existing OAT
dispatch machinery, present them for approval, and bind the entire run to that
choice. A model or effort change requires renewed approval; there is no silent
expensive-model escalation.

### Question 4: Verification Independence

**Q:** How should repeated passes avoid merely echoing the first model's
reasoning?

**A:** Use selectively blind workers.

**Decision:** Verifiers can see the claims and locators they must test but not
the gatherers' reasoning or earlier review conclusions. Adversarial workers
receive the investigation scope and provisional claims and independently seek
counterevidence.

### Question 5: Assurance and Confidence

**Q:** Should assurance use generated numerical confidence or auditable claim
states?

**A:** Use categorical evidence states and no numerical confidence.

**Decision:** Claims progress through `provisional`, `supported`, `verified`,
`contested`, `unresolved`, or `unsupported`. The packet records which rigor
profile and passes produced that status. `verified` is always scoped to the
packet's declared sources and snapshot.

### Question 6: Skill Name

**Q:** Should the skill be named `recon`, `evidence-pack`, or `investigate`?

**A:** `recon`.

**Decision:** Use the action-oriented, general-purpose name `recon`; call its
output schema an evidence packet.

### Question 7: Invocation Contract

**Q:** Should `recon` be conversational-only, require a structured manifest, or
accept concise arguments with guided completion for missing information?

**A:** Use hybrid arguments with guided completion.

**Decision:** Accept a direct investigation question or target plus optional
scope, context, rigor profile, and output-directory arguments. When required
inputs are missing, ask only for those fields. A calling skill can provide a
fully resolved request and avoid interactive discovery, while direct users keep
an approachable conversational fallback.

### Question 8: Profile Sizing

**Q:** Should rigor profiles use fixed lane counts, require a fully custom
manifest for each run, or define pass contracts with scope-adaptive lane counts
inside approved caps?

**A:** Use pass contracts with scope-adaptive lane counts and hard caps.

**Decision:** Each profile defines its mandatory passes, coverage, and
redundancy. The skill sizes bounded lanes to the actual investigation, then
presents the exact lane count, concurrency, pass topology, and hard limits in
the approval manifest. Profile names do not hide the concrete execution plan.

### Question 9: Profile Assurance

**Q:** Should profiles merely change cost, should every profile be allowed to
publish the same claim states, or should stronger statuses require stronger
pass contracts?

**A:** Use graded assurance.

**Decision:** `quick` requires bounded gathering, compilation, schema checks,
and locator validation but may publish claims only up to `supported`.
`standard` adds independent semantic verification, adversarial review, and
coverage review for load-bearing claims and may publish `verified` claims.
`thorough` adds redundant independent gathering and verification plus explicit
contradiction resolution. Exact lane counts remain scope-adaptive and visible
in the approved manifest.

### Question 10: Destination Taxonomy

**Q:** Should the default durable category be `evidence`, `reconnaissance`, or
no default category?

**A:** Use `evidence`.

**Decision:** The skill name describes the activity, while the destination
describes the durable product. Standalone project packets default beneath
`references/evidence/`; repository-level packets default beneath
`.oat/repo/reference/evidence/`. Explicit output paths and caller-directed
co-location remain authoritative overrides.

### Question 11: Failure Publication

**Q:** Should an incomplete rigor profile publish nothing, ask the user at the
failure point, or publish an explicitly downgraded partial packet when its core
artifacts remain valid?

**A:** Publish an honest partial packet when structurally valid.

**Decision:** A run may publish `packet.md` only when the manifest, canonical
ledger, and consumer view validate. It must record requested versus achieved
profile, failed or skipped passes, coverage gaps, and claim-state downgrades. If
structural compilation or validation fails, retain raw artifacts plus a failure
record but do not expose a consumable packet entry point.

### Question 12: Source Boundary

**Q:** Should the first release be repository-only, split into source-specific
modes, or use available read-only host capabilities through typed locators?

**A:** Use a capability-based multi-source contract.

**Decision:** Support local files, git evidence, read-only command output, URLs,
and available MCP or app sources without making any one external connector a
prerequisite. Evidence items use typed locators, and the run manifest records
which source capabilities were available, unavailable, or outside scope.

### Question 13: Initial Integration Scope

**Q:** Should the first release ship standalone, integrate with project
discovery and quick start, or add broad hooks across the analysis and research
skill family?

**A:** Ship standalone first.

**Decision:** The initial release owns the `recon` skill, packet contract,
examples, and user documentation. Existing workflows may consume an explicitly
supplied packet path, but this project does not add automatic lifecycle hooks or
modify the other skills' invocation behavior.

### Question 14: Design Depth

**Q:** Should quick start proceed straight to planning, produce a lightweight
design, or promote to the full spec-driven workflow?

**A:** Produce a lightweight design.

**Decision:** Define the versioned packet model, orchestration components,
artifact boundaries, state transitions, error semantics, and testing strategy
before generating the quick implementation plan. Use the configured selective
design preference as collaborative mode for the smaller lightweight section
set.

## Solution Space

### Approach 1: Evidence Context Compiler _(Recommended)_

**Description:** Resolve a bounded investigation and approved economical model,
fan out source-gathering lanes, normalize results into a structured claim
ledger, run selectively blind checks, and compile one compact packet for a
downstream consumer.

**When this is the right choice:** The consumer needs trustworthy context and
precise source locations but should not spend its own context window reading
every scout response.

**Tradeoffs:** Requires a stable packet schema, intermediate file management,
and disciplined pass boundaries. It intentionally stops short of making the
consumer's final decision.

### Approach 2: Reconnaissance Orchestrator

**Description:** Focus on high-concurrency investigation and allow each caller
to define its own final artifact.

**When this is the right choice:** The main value is flexible dispatch rather
than reusable downstream context.

**Tradeoffs:** Produces inconsistent handoffs and forces downstream consumers to
understand lane-specific output.

### Approach 3: Persistent Research Workspace

**Description:** Own a long-lived investigation that can be resumed, refreshed,
and expanded across sessions.

**When this is the right choice:** The subject evolves over time and ongoing
research management matters more than a bounded handoff.

**Tradeoffs:** Adds lifecycle, refresh, and reconciliation concerns beyond the
immediate evidence-preparation goal and overlaps the research skill family.

### Chosen Direction

**Approach:** Evidence Context Compiler

**Rationale:** It creates the strongest context firewall and the clearest value
for expensive downstream models while remaining useful to OAT discovery,
analysis, research, review, and standalone callers.

**User validated:** Yes

## Options Considered

### Packet Representation

**Options:** Narrative-only, separately authored Markdown and JSON, or canonical
JSON with a generated Markdown view.

**Chosen:** Canonical `claims.json` plus compact `packet.md`.

**Summary:** Structured claims allow deterministic merging and pass updates,
while Markdown remains the only file most consumers need to read.

### Execution Depth

**Options:** One fixed pipeline, fully adaptive stopping, or explicit rigor
profiles.

**Chosen:** `quick`, `standard`, and `thorough` rigor profiles.

**Summary:** Profiles are transparent presets expanded into a run manifest.
`standard` includes gathering, locator validation, semantic verification,
adversarial review, and coverage review; exact lane counts and limits remain a
discovery/design question.

### Worker Model Topology

**Options:** Different models by task class, automatic escalation, or one
approved model used for heterogeneous roles.

**Chosen:** One approved model and effort across every wave.

**Summary:** Independence comes from bounded roles, separate contexts,
selective blindness, and redundant passes rather than silently spending a more
expensive model.

### Output Shape

**Options:** One report file, one directory of lane dossiers, or one packet
directory with a consumer entry point and audit subtrees.

**Chosen:** Always output a directory.

**Summary:** The directory contains `packet.md`, canonical `claims.json`,
`manifest.json`, review artifacts, and `raw/` dossiers. Consumers normally read
only `packet.md`; deeper files exist for automation, audit, or follow-up.

## Key Decisions

1. **Identity:** Name the general-purpose skill `recon`, without an `oat-`
   prefix.
2. **Product:** Produce a destination-independent evidence packet rather than a
   final recommendation or persistent research workspace.
3. **Context firewall:** Keep raw worker output on disk and out of the expensive
   consumer's context by default.
4. **Canonical representation:** Treat `claims.json` as source of truth and
   derive the compact `packet.md` consumer view from it.
5. **Model approval:** Require explicit approval of the exact live model and
   effort before dispatch; use that same selection for all passes.
6. **Dispatch reuse:** Delegate catalog, provider, model, launch, and recovery
   mechanics to `oat-dispatch-subagents`; `recon` owns decomposition, evidence
   schemas, pass topology, synthesis, and user interaction.
7. **Rigor:** Provide `quick`, `standard`, and `thorough` presets, expanded into
   a visible execution manifest.
8. **Independent review:** Keep semantic verification and adversarial passes
   selectively blind to prior reasoning and conclusions.
9. **Claim states:** Use categorical, evidence-backed statuses rather than
   generated confidence percentages.
10. **Evidence locators:** Include concise excerpts with exact source locators;
    repository evidence also records revision or working-tree identity and a
    content hash so line references have snapshot context.
11. **Invocation:** Use concise arguments with guided completion rather than
    requiring every user to author a manifest or forcing every caller through a
    conversational interview.
12. **Profile sizing:** Define profile-level pass and redundancy contracts, but
    adapt lane counts to scope within explicit caps shown before approval.
13. **Graded assurance:** Reserve `verified` for profiles that completed the
    required independent semantic, adversarial, and coverage passes; a `quick`
    packet tops out at `supported`.
14. **Destination taxonomy:** Store standalone packets in an `evidence`
    reference category while allowing explicit callers to co-locate them with
    another artifact family.
15. **Partial publication:** Permit structurally valid partial packets with
    explicit profile and assurance downgrades; withhold `packet.md` when core
    packet validation fails.
16. **Source boundary:** Use capability-based, typed read-only source locators
    so one packet can cover repository, web, command, and connected-system
    evidence without separate skill modes.
17. **Initial integration:** Prove the standalone skill and packet contract
    before adding automatic hooks to discovery, analysis, research, synthesis,
    or review workflows.
18. **Design depth:** Use a collaborative lightweight design before planning;
    the project does not need a formal spec-driven promotion at this scope.

## Constraints

- The skill is read-only with respect to investigated systems. Its only writes
  are the explicitly confirmed packet directory and its own artifacts.
- It must not automatically invoke a more expensive model or change the
  approved model/effort after approval.
- Named models in examples are illustrative and must not become durable routing
  requirements.
- The same approved model may perform mapping, gathering, claim formation,
  validation, verification, adversarial review, coverage review, and packet
  assembly through different roles and prompts.
- Raw dossiers and worker reasoning must not be copied into the parent or
  downstream consumer context unless explicitly requested.
- A packet must state its investigation scope, source snapshot, rigor profile,
  passes completed, gaps, and unresolved contradictions.
- Exact source locations must be independently locator-validated before they
  are presented as validated evidence.
- The workflow must degrade honestly when subagent concurrency or source access
  is unavailable; reduced coverage cannot be reported as a full-profile run.
- OAT-aware destinations are optional integration behavior, not a prerequisite
  for invoking the skill.

## Success Criteria

- A caller can provide an investigation question or target and receive a
  bounded evidence-packet directory.
- Before any worker launches, the user sees and approves the exact model,
  effort, rigor profile, concurrency, pass topology, and hard run limits.
- Parallel gatherers produce source-grounded dossiers without modifying the
  investigated target.
- The compiler produces a valid, deduplicated claim ledger with support,
  counterevidence, gaps, and source provenance.
- Required validators reopen sources independently and accurately reflect which
  checks ran.
- `packet.md` lets a downstream model understand the major verified, contested,
  and unresolved findings without reading `raw/`.
- Important claims include concise excerpts and exact locators that can be
  reopened when needed.
- The packet never overstates assurance when sources are stale, dirty,
  inaccessible, contradictory, or outside the declared scope.
- The skill works as a standalone general-purpose tool and can also be called
  before or during OAT discovery, analysis, research, synthesis, or review.

## Out of Scope

- Making implementation changes discovered during reconnaissance.
- Making the downstream consumer's final architectural, product, security, or
  release decision.
- Automatically escalating to an expensive model.
- Building a long-lived research workspace with refresh and reconciliation
  lifecycle in the initial version.
- Hard-coding GPT-5.6 Luna or any other named model as the skill's permanent
  execution target.
- Treating agreement among same-model workers as sufficient evidence without
  independent source reopening.

## Deferred Ideas

- **Reusable approval policies:** A later version may let users save a named
  approved execution policy; the initial contract favors explicit per-run
  approval.
- **Packet refresh:** Incremental refresh and stale-claim reconciliation may be
  added after the bounded packet format is proven.
- **Cross-packet synthesis:** Merging multiple packets can remain a caller or
  `synthesize` responsibility initially.
- **Discovery and quick-start integration:**
  `BL-260830-integrate-recon-with-oat` tracks first-class lifecycle offering,
  launch, approval, destination, partial-packet, provenance, and resume behavior
  after the standalone contract stabilizes.
- **Broader skill-family integration:**
  `BL-260830-integrate-recon-across` separately tracks deliberate handoffs for
  analysis, research, synthesis, skeptic, and review-oriented consumers.

## Open Questions

- **Design-owned packet schema:** What exact versioned JSON schema represents
  claims, sources, locators, reviews, and manifest receipts?
- **Design-owned interfaces:** How should the planner, gatherers, compiler,
  selectively blind reviewers, and assembler exchange bounded artifacts without
  leaking raw context into the consumer?

## Assumptions

- Current supported agent hosts can dispatch bounded workers and expose exact
  model and effort selectors through the OAT dispatch contract.
- An economical model with high reasoning effort can perform every role in the
  packet pipeline when prompts, contexts, and acceptance criteria are bounded.
- Consumers prefer a compact Markdown entry point but benefit from a structured
  ledger for automation and targeted follow-up.
- Source excerpts can remain concise enough to save consumer work without
  turning the packet into a duplicate of the investigated corpus.

## Risks

- **Correlated model blind spots:** The same model may repeat the same error
  across passes.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Selective blindness, direct source reopening,
    adversarial prompts, redundant lanes in stronger profiles, and explicit
    unresolved states.
- **Locator drift:** File lines and external pages may change after collection.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Record revisions, dirty state, hashes, timestamps,
    excerpts, and locator-validation outcomes.
- **Packet bloat:** Raw dossiers or repeated excerpts may erase the intended
  context savings.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Keep `packet.md` compact, deduplicate claims and
    sources, cap excerpts, and isolate raw artifacts.
- **False assurance:** A completed pipeline may be mistaken for universal
  truth.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Scope every status to the manifest, expose coverage
    gaps, and reserve `verified` for profile-complete independent review.

## Next Steps

Discovery decisions are sufficient to choose design depth. Because the skill
introduces a versioned packet model, a multi-wave orchestration pipeline, and
selectively blind artifact interfaces, produce a lightweight design before
generating the implementation plan.
