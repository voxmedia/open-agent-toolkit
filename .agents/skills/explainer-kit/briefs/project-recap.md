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

Produce one rich navigational hub covering all six sections above. It must
orient the reader, expose the project state and outcome in the first viewport,
and link every selected artifact with descriptive labels. The hub should remain
complete and useful without an expansion artifact.

Establish deliberate typographic roles for the title, framing statement,
section headings, labels, body text, and evidence annotations. Build hierarchy
through scale, spacing, contrast, and grouping instead of applying one repeated
card or section treatment everywhere. Keep density fit to the material: shorten
or restructure crowded passages, but do not pad sparse evidence with decorative
filler. Choose tables, lists, diagrams, and prose only when each medium makes
the evidence easier to understand.

## Expansion license

Propose a supporting diagram, walkthrough deck, or deep-dive only when it
answers a distinct reader question that the hub cannot answer cleanly. For
every proposal, identify the reader question, the source evidence that supports
it, and the rationale for choosing that medium. Do not expand to repeat the
same story in another format.

Use a diagram when topology, direction, ownership, or flow carries meaning.
Preserve branches, fan-in, cycles, labels, and explicit relationships, and fit
the frame to the content rather than leaving a tiny graph in a large canvas.
Use a deck only when pacing adds value; choose slide archetypes to match the
story, such as an outcome opener, comparison, system view, decision, evidence,
or next-action frame. Vary composition to fit each claim instead of repeating
one template. Use a deep-dive when source-backed mechanics or trade-offs need
more room than the hub can give them.
