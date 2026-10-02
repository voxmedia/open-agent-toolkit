---
title: Research and Evaluate a Decision
description: Choose a research skill, challenge its conclusions, and combine evidence without confusing research with implementation.
---

Use this family when you need evidence before committing to a direction. Start
with `analyze` for something you already have, `deep-research` for a topic you
need to investigate, or `compare` for named alternatives. Use `skeptic` to test
a claim and `synthesize` to combine compatible research artifacts afterward.

These examples are instructions to an agent, not terminal commands. The slash
form (for example `/analyze`) is the reliable way to invoke a skill; Codex uses
the `$name` form (for example `$analyze`). These five skills also let the agent
pick them up when you ask for one by name. Example paths below stand for files
you supply. None of these skills needs an OAT project (a tracked unit of work
that OAT keeps under `.oat/projects/`), and research does not authorize code
changes, purchases, or publication.

The research skills that write a report share one default location rule. In a
repository with a `.oat/` directory the agent suggests a folder under `.oat/repo/`;
with only a user-level `~/.oat/` it suggests a folder there; otherwise it
suggests the current directory. You can accept the suggestion or name another
folder, and the skill creates the folder if it does not exist.

## analyze

**Invocation:** `/analyze proposals/import-service.md --context criteria.md`.
Supply a file, directory, or quoted idea as the target. The optional
`--context` file or directory supplies the criteria the target is judged
against (for example, a security policy or a requirements document).

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
structure, consistency, and audience fit. The detected input type (code,
design document, product spec, presentation, proposal, or unstructured idea)
decides which angles get deeper treatment; all six always run. Available
workers can investigate the angles in parallel; otherwise the agent works
through them sequentially. A persuasive proposal can still receive substantial
gap findings, so distinguish strengths from issues that must be resolved
before planning.

**What it does without asking:** It reads the target and any context. When
your agent can run subagents (helper agents it starts in the background), it
starts up to six of them, one per angle, and it may start `compare` as a
subagent if an angle turns up competing options. It then asks where to save
the report, unless you already gave an output path, creates that folder if
needed, and writes one file. It does not edit the target, commit, or push.

**Expected output:** A written analysis artifact with evidence-backed findings
and recommendations, not just an inline assessment. The suggested folder is
`.oat/repo/analysis/` in an OAT repository, `~/.oat/analysis/` with only a
user-level OAT setup, or the current directory, and the file is named
`<topic>-analysis-<model>.md`. Preserve the report with the material it
evaluated so later readers can tell which version the findings describe.

**Next step:** Resolve the highest-impact gaps, use [compare](#compare) for a
decision between alternatives, or bring the findings into a planning
conversation. Do not treat the analysis report as an approved implementation
plan.

## compare

**Invocation:**
`/compare "queue-backed import" "synchronous import" --context criteria.md --dimensions "operational complexity, recovery, team fit" --save`.
Provide at least two alternatives. `--context` supplies your priorities;
`--dimensions` replaces the default dimensions (context can still add or
reweight them); `--save` requests a written artifact instead of the default
inline result.

**Prerequisites:** Named alternatives and enough evidence to evaluate them.
For a saved report, the installed `deep-research` schema must be available.
State hard constraints before comparing: a recommendation for a different
team or operating environment may not be useful to yours. The skill uses web
search and package registries when they are available; say so if it must stay
with local sources.

**Example scenario:** Your team can either process a customer upload during
the request or hand it to a queue. Both fit the current API, but only one
engineer will operate the service. Compare them against recovery behavior,
operational complexity, and team fit, using your existing proposal as context.

The skill evaluates each alternative against shared dimensions and explains
trade-offs. It uses qualitative judgments by default; numerical scoring needs
an explicit request, not an implied precision that the evidence cannot
support. For three or more candidates, expect a ranked recommendation. A
close result should explain the condition that would change the winner.

**What it does without asking:** It researches each option against each
dimension, using web search when available. Without `--save` it answers in
the conversation and writes nothing. With `--save` it asks where to save the
file, unless you already gave an output path, creates that folder if needed,
and writes one file. It does not commit or push.

**Expected output:** An inline comparison by default, or a structured
comparative research artifact with `--save`, suggested for
`.oat/repo/analysis/` in an OAT repository and named after the options and
the model. It includes a recommendation,
supporting rationale, and important caveats rather than just a feature table.

**Next step:** Test the recommendation's load-bearing claim with
[skeptic](#skeptic), investigate an unresolved dimension with
[deep-research](#deep-research), or confirm a direction before planning work.

## deep-research

**Invocation:**
`/deep-research "reliable asynchronous imports" --depth standard --focus recovery --context criteria.md`.
Use `surface`, `standard`, or `exhaustive` depth; `standard` is the default.
The focus narrows the question, while context establishes your constraints.
Add a trailing output path (for example `docs/research/`) to skip the
destination prompt.

**Prerequisites:** A researchable question, permission to use the available
sources, and a destination for the resulting artifact. An existing project is
not required. Tell the agent if it must stay within local documents or if
external research is permitted.

**Example scenario:** You have not selected an import architecture and need to
understand failure recovery before comparing products. Research how systems
resume interrupted uploads and avoid duplicate work, constrained by your
team's operating model. This establishes the evidence base rather than asking
for an immediate vendor choice.

The skill classifies the question as technical, comparative, conceptual, or
architectural and picks the matching artifact schema (the fixed set of report
sections for that kind of topic). It plans three to six research angles (two
or three at `surface` depth) and gathers evidence through available
capabilities, in parallel when supported or sequentially otherwise. Greater
depth expands the investigation; it does not turn inaccessible sources or
unsupported claims into facts.

**What it does without asking:** It searches the web when available and,
when your agent can run subagents, starts one general-purpose subagent per
research angle; it may also start `compare` as a subagent if competing
options emerge. It then asks where to save the report, unless you gave a
trailing output path, creates that folder if needed, and writes one file. If
the chosen folder is not writable, it writes to the current directory and
tells you. It does not commit or push.

**Expected output:** A written structured research artifact with findings,
sources, and methodology, named `<topic>-<model>.md`. The suggested folder is
`.oat/repo/reference/research/` in an OAT repository, `~/.oat/research/` with
only a user-level OAT setup, or the current directory. Review the evidence and
limitations before using the conclusion as a requirement.

**Next step:** Compare concrete options using the research, challenge a
critical conclusion with [skeptic](#skeptic), or combine independent reports
with [synthesize](#synthesize).

## skeptic

**Invocation:**
`/skeptic "Retrying this import cannot create duplicate records"`.
With no explicit claim, the skill evaluates the agent's most recent factual
assertion in the conversation; quote a claim when there could be ambiguity.

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

**What it does without asking:** It reads local files, tests, lockfiles, and
Git history, and uses web search when available. When your agent can run
subagents, it starts one `skeptical-evaluator` subagent to do the
adversarial search. It writes no file and changes nothing.

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
team chooses a direction. The skill treats agreement across artifacts as high
confidence and does not detect when several artifacts relied on the same
original source, so check shared upstream sources yourself before you count
agreement as independent confirmation.

This skill works only from the supplied artifacts: it does not launch new
research or browse for missing facts. It preserves provenance, identifies
shared findings and unique insights, and explains conflicting conclusions.
A preferred interpretation remains a judgment, not a newly established fact.

**What it does without asking:** It reads the supplied artifacts only; it
starts no subagents and does no web search. With `--inline` it answers in
the conversation and writes nothing. Otherwise it asks where to save the
synthesis, unless you already gave an output path, creates that folder if
needed, and writes one file. It never modifies the input artifacts and does
not commit.

**Expected output:** A written, model-tagged synthesis
(`<topic>-synthesis-<model>.md`), suggested for the source folder when all
inputs share one folder, or an inline brief with `--inline`. Expect source
agreements, contradictions with the direction the evidence leans (flagged as
a lean, not a decision), unique single-source insights, consolidated
recommendations, and a provenance table rather than concatenated summaries.

**Next step:** Resolve a contradiction with targeted research, challenge the
proposed direction with [skeptic](#skeptic), or bring the synthesis to a
planning conversation with its source artifacts attached.
