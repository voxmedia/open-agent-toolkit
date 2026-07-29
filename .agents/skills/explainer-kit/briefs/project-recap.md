# Project recap author brief

## Audience

Write for a busy team reader, including people who did not work on the project
and are not deeply technical. One skim should explain what was requested, what
changed, why the important choices were made, what evidence supports the
result, and what remains.

## Voice and editing

Be direct, factual, and concise. Use short sentences, active voice, and
concrete nouns. Define unavoidable jargon inline. Cut throat-clearing, hedges,
forced triplets, nested parentheticals, em-dash chains, and “not just X but Y”
constructions. Put enumerable material in bullets or tables. Turn PR and issue
references into real links rather than bare numbers. Preserve every supported
fact and citation; state uncertainty instead of inventing connective detail.
Use the same terms, statuses, and numbers throughout.

## Narrative intent

- **Original request:** State the user-visible goal, original constraints, and
  success criteria. Separate the request from the eventual implementation.
- **Key agent decisions:** Explain the few decisions that materially shaped the
  result. Pair each decision with its reason and consequence.
- **As-built architecture:** Describe the delivered system and its boundaries.
  Include at least one high-level architecture diagram, inline or standalone.
- **Implementation record:** Summarize the work in an evidence table with
  components, notable changes, and durable references.
- **Validation evidence:** Use a table for commands, checks, observed results,
  and any limits. Do not substitute “tests passed” for concrete evidence.
- **Outcome:** Say what now works, what did not ship, and what the next reader
  should do.

## Floor

Produce one rich narrative hub covering all six sections above. It must contain
at least one high-level architecture diagram, structured lists where useful,
and evidence tables for implementation and validation. The page should remain
useful without any expansion artifact.

## Expansion license

Propose additional diagrams, a deep-dive, or a walkthrough deck when complexity
earns it. Expansion should clarify a real boundary, flow, trade-off, or
operational handoff that would overload the hub. Do not expand to repeat the
same story in another format.
