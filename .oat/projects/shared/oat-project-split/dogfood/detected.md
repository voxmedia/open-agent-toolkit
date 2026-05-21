# Detected Path Dogfood

Date: 2026-05-21

## Scenario

Candidate detected request: a discovery that starts as "improve OAT workflow friction" but separates into independently shippable config-command, quick-mode-routing, and staleness-threshold work.

The expected mid-stream signals are:

- `independently-shippable`
- `no-shared-design-surface`

## Commands Exercised

```bash
pnpm run cli -- project split evaluate-signals --fired independently-shippable,no-shared-design-surface
pnpm --filter @open-agent-toolkit/cli exec vitest run src/__tests__/skills/discover-detection.test.ts src/commands/project/split/__tests__/run.test.ts
```

## Evidence

- `evaluate-signals` returned `triggered: true` and `confidence: "high"` for the two load-bearing signals.
- `discover-detection.test.ts` passed, including coverage for:
  - high-confidence prompt when the two load-bearing signals fire;
  - no prompt below threshold;
  - non-interactive detected recommendations writing `## Detected Split Recommendation` and exiting non-zero;
  - convergence detection failing fast in non-interactive mode instead of silently proceeding as one project.
- `run.test.ts` passed, including command-boundary coverage for detected-origin non-interactive behavior and declared non-interactive behavior.

## Limitations

This was not a full live `oat-project-discover` conversation. I could not honestly create an interactive mid-stream offer and end-of-discovery scope-check from inside this phase runner. The exercised evidence covers the shared signal evaluator and the automated discover/CLI behavior that backs the detected path.

No live mid-stream offer, convergence scope-check prompt, or interactive detected confirmation flow was observed in this p05 run. Treat the detected-entry dogfood as limited until tracked follow-up `bl-074b` runs the live session and records the prompt wording, confirmation flow, invoked split payload, and resulting tree.

## Followups / Rough Edges

- Tracked release follow-up `bl-074b` should run an actual interactive `oat-project-discover` conversation and capture the exact prompt wording for the mid-stream offer and convergence scope check.
- No product issue was found in the signal threshold behavior during this non-interactive pass.
