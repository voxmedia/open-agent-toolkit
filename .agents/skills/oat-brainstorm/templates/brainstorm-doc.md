---
title: '{{title}}'
date: '{{date}}'
source: oat-brainstorm
---

# {{title}}

## Overview

{{summary}}

{{#motivation}}
**Why this matters:** {{motivation}}
{{/motivation}}

{{#vision}}
**What it would look like:** {{vision}}
{{/vision}}

## Approaches Considered

{{#approachesConsidered}}

### {{name}}{{#recommended}} (recommended){{/recommended}}

{{description}}

**Tradeoffs:** {{tradeoffs}}

{{/approachesConsidered}}

## Chosen Direction

{{#chosenDirection}}

**Approach:** {{approachName}}

{{rationale}}

{{/chosenDirection}}
{{^chosenDirection}}

_No direction selected — this brainstorm captured the approach landscape but did not converge on a chosen path. Revisit when a decision is needed._

{{/chosenDirection}}

## Open Questions

{{#openQuestions}}

- {{.}}
  {{/openQuestions}}
  {{^openQuestions}}

_None outstanding._

{{/openQuestions}}

## Next Steps

{{#nextSteps}}

- {{.}}
  {{/nextSteps}}
  {{^nextSteps}}

_None defined yet._

{{/nextSteps}}

---

<details>
<summary>Transcript Session Note</summary>

{{transcriptSessionNote}}

</details>
