---
title: Research and Evaluate a Decision
description: Choose a research skill, challenge its conclusions, and combine evidence without confusing research with implementation.
---

Use this family when you need evidence before committing to a direction. Start
with `analyze` for something you already have, `deep-research` for a topic you
need to investigate, or `compare` for named alternatives. Use `skeptic` to test
a claim and `synthesize` to combine compatible research artifacts afterward.

These examples are instructions to an agent, not terminal commands. Use the
slash form where your provider supports it, the `$name` skill form in Codex, or
ask for the skill by name. Example paths below stand for files you supply.
None of these skills requires an existing OAT project, and research does not
authorize code changes, purchases, or publication.

## analyze

**Invocation:** `/analyze proposals/import-service.md --context criteria.md`.
Supply a file, directory, or quoted idea; the optional context file provides
constraints and background rather than replacing the analysis method.

**Prerequisites:** Accessible source material and an installed `deep-research`
skill, whose artifact schema this skill uses. If that schema is unavailable,
the skill stops rather than inventing a replacement format. Agree on a report
destination when asked.

**Example scenario:** A team has drafted an import-service proposal but has not
decided whether its retry behavior, operating cost, and user-facing recovery
flow are coherent. Give the agent the proposal and a file explaining the
team's staffing and reliability constraints. Ask it to analyze the proposal
before anyone turns it into implementation tasks.

The review covers six angles: adversarial weaknesses, gaps, opportunities,
structure, consistency, and audience fit. Context changes their emphasis, not
whether they are considered. Available workers can investigate the angles in
parallel; otherwise the agent works through them sequentially. A persuasive
proposal can still receive substantial gap findings, so distinguish strengths
from issues that must be resolved before planning.

**Expected output:** A written analysis artifact with evidence-backed findings
and recommendations, not just an inline assessment. The skill confirms where
to save it; repository analysis, user analysis, and the current directory are
possible destinations. Preserve the report with the material it evaluated so
later readers can tell which version the findings describe.

**Next step:** Resolve the highest-impact gaps, use [compare](#compare) for a
decision between alternatives, or bring the findings into a planning
conversation. Do not treat the analysis report as an approved implementation
plan.

## compare

**Invocation:**
`/compare "queue-backed import" "synchronous import" --context criteria.md --dimensions "operational complexity, recovery, team fit" --save`.
Provide at least two alternatives. `--context` supplies your priorities;
`--dimensions` replaces the comparison dimensions; `--save` requests a written
artifact instead of the default inline result.

**Prerequisites:** Named alternatives and enough evidence to evaluate them.
For a saved report, the installed `deep-research` schema must be available.
State hard constraints before comparing: a recommendation for a different
team or operating environment may not be useful to yours.

**Example scenario:** Your team can either process a customer upload during
the request or hand it to a queue. Both fit the current API, but only one
engineer will operate the service. Compare them against recovery behavior,
operational complexity, and team fit, using your existing proposal as context.

The skill evaluates each alternative against shared dimensions and explains
trade-offs. It uses qualitative judgments by default; numerical scoring needs
an explicit request, not an implied precision that the evidence cannot
support. For three or more candidates, expect a ranked recommendation. A
close result should explain the condition that would change the winner.

**Expected output:** An inline comparison by default, or a structured
comparative research artifact with `--save`. It includes a recommendation,
supporting rationale, and important caveats rather than just a feature table.

**Next step:** Test the recommendation's load-bearing claim with
[skeptic](#skeptic), investigate an unresolved dimension with
[deep-research](#deep-research), or confirm a direction before planning work.

## deep-research

**Invocation:**
`/deep-research "reliable asynchronous imports" --depth standard --focus recovery --context criteria.md`.
Use `surface`, `standard`, or `exhaustive` depth; `standard` is the default.
The focus narrows the question, while context establishes your constraints.

**Prerequisites:** A researchable question, permission to use the available
sources, and a destination for the resulting artifact. An existing project is
not required. Tell the agent if it must stay within local documents or if
external research is permitted.

**Example scenario:** You have not selected an import architecture and need to
understand failure recovery before comparing products. Research how systems
resume interrupted uploads and avoid duplicate work, constrained by your
team's operating model. This establishes the evidence base rather than asking
for an immediate vendor choice.

The skill chooses a technical, comparative, conceptual, or architectural
artifact schema to fit the question. It plans a small set of research angles
and gathers evidence through available capabilities, in parallel when
supported or sequentially otherwise. Greater depth expands the investigation;
it does not turn inaccessible sources or unsupported claims into facts.

**Expected output:** A written structured research artifact with findings,
sources, and methodology. The skill asks where it should live, with repository
research, user research, or the current directory as possible destinations.
Review the evidence and limitations before using the conclusion as a
requirement.

**Next step:** Compare concrete options using the research, challenge a
critical conclusion with [skeptic](#skeptic), or combine independent reports
with [synthesize](#synthesize).

## skeptic

**Invocation:**
`/skeptic "Retrying this import cannot create duplicate records"`.
With no explicit claim, the skill evaluates the most recent assertion in the
conversation; quote a claim when there could be ambiguity.

**Prerequisites:** A falsifiable claim and access to relevant evidence. Point
the agent to the implementation, tests, or research that supposedly supports
it. No project or output directory is required.

**Example scenario:** A design discussion assumes retries are safe because
the API accepts an idempotency key. Ask the skill to challenge that assumption
against the actual write path and failure cases before the team relies on it
for recovery. The key's existence alone is not the desired conclusion.

The skill first tries to disprove the assertion, then weighs supporting
evidence. It can use an available skeptical evaluator or perform the same
evaluation directly. Lack of evidence is a reason to report uncertainty, not
to validate the claim by default.

**Expected output:** An inline verdict, confidence, and cited evidence. The
conclusion can be that the claim holds up, that the challenge was correct,
that the answer is nuanced, or that the evidence is genuinely inconclusive.
It does not create a research file automatically.

**Next step:** Correct a disproved assumption, qualify a nuanced one, or gather
the missing evidence. If the result will influence later work, capture it in
the relevant decision or research artifact rather than relying on chat alone.

## synthesize

**Invocation:** `/synthesize research/ --inline`, or supply explicit research
files. Omit `--inline` when you want a written synthesis.

**Prerequisites:** Existing structured artifacts with `skill`, `schema`,
`topic`, `model`, and `generated_at` metadata. These requirements apply to
explicit files as well as directory discovery. Arbitrary notes or articles
are not automatically compatible inputs. Invalid explicit artifacts are
skipped with warnings; fewer than two valid inputs requires confirmation.

**Example scenario:** Two agents separately researched import recovery, and a
third compared queue-based options. Supply their saved research artifacts and
ask for a synthesis that separates agreements from contradictions before the
team chooses a direction. Do not silently convert three repetitions of one
source into three independent confirmations.

This skill works only from the supplied artifacts: it does not launch new
research or browse for missing facts. It preserves provenance, identifies
shared findings and unique insights, and explains conflicting conclusions.
A preferred interpretation remains a judgment, not a newly established fact.

**Expected output:** A written, model-tagged synthesis in the source folder or
another confirmed location, or an inline brief with `--inline`. Expect an
account of agreements, disagreements, evidence gaps, and actionable next
questions rather than concatenated summaries.

**Next step:** Resolve a contradiction with targeted research, challenge the
proposed direction with [skeptic](#skeptic), or bring the synthesis to a
planning conversation with its source artifacts attached.
