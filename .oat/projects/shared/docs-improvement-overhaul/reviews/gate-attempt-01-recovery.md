# Configured gate attempt 1: validation recovery

Run `b5d44f07-4bda-4d0d-a45b-ef06aef72067`, target `claude-opus-5-5-high`, configured Opus 5.5 high invocation. Installed CLI 0.3.10, unchanged configured command, legacy-plan-only scope. Underlying reviewer finished and committed its artifact, but the envelope returned `artifact_validation_failed`, exit 1, receiveEligible false, handoff null. No review-receive was invoked and no gate pass is claimed.

Cause: reviewer used bold paragraphs instead of top-level finding bullets. Its Medium tally accidentally counted two fix-option bullets, while three Low finding paragraphs counted as zero. Root normalizes only Markdown list structure, retaining all five findings, counts, prose, severities and gate frontmatter. This is a formatting repair, not suppression of findings or fabricated provenance. Parser validation alone is not a receive-eligible gate envelope; the unchanged configured gate must run again.

Root independently judged the feedback while remaining before the receive boundary:

- M1: explicitly accept full docs Next build/static export under root tests, not merely prebuild. Added that cost decision; no Turbo override.
- M2: name permanent CI assertions and durable source inputs; prohibit project-reference inputs, and verify with project directory absent. Migration map, old-route absence and content preservation remain phase-local evidence.
- L1: name branch CLI nav/index commands for apply, not installed MkDocs-only oat.
- L2: regenerate agent index; remove it from manual formatting command.
- L3: resolve/recheck later owner paths against approved p02 map, while permanent consumers read durable app files.

All are unambiguous in-scope plan clarifications accepted under the user's autonomous planning direction. No new implementation tasks, source edits, installed-skill changes or relaxed gate configuration. Readiness remains unset until a corroborated eligible gate and receipt succeed.
