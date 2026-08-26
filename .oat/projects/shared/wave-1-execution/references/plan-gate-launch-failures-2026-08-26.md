# Plan gate launch failures — 2026-08-26

Configured gate: `workflow.gates.skills.oat-project-plan` (user config), run
exactly as configured from the wave-1-execution branch at commit `1e1c9a7e`
with `PROJECT_PATH=.oat/projects/shared/wave-1-execution`.

Target selection: `oat gate review` default avoidance (`same-family`, producer
family unknown → same-runtime avoidance of `claude`) selected the
highest-priority remaining exec target, `cursor-gpt-5-6-sol-xhigh`
(priority 150; `codex-5-6-sol-xhigh` is 130). Its availability probe
(`cursor-agent --version`) passes, so the gate selects it deterministically;
`selectAvailableExecTarget` has no post-selection fallback
(`packages/cli/src/commands/gate/index.ts` → `unexpected_post_selection_failure`).

Both launches were rejected by `cursor-agent` before any reviewer child ran:

| Attempt                     | Started (UTC)        | runId                                | Target                   | Envelope status / outcome                         | Exit |
| --------------------------- | -------------------- | ------------------------------------ | ------------------------ | ------------------------------------------------- | ---- |
| 1                           | 2026-08-26T04:19:55Z | 78c8d6e8-9dab-438c-8d13-a87f9b3215ac | cursor-gpt-5-6-sol-xhigh | review_failed / unexpected_post_selection_failure | 1    |
| 2 (identical-payload retry) | 2026-08-26T04:21:32Z | b4dd4619-35f6-41ec-942b-127a2fef6ea8 | cursor-gpt-5-6-sol-xhigh | review_failed / unexpected_post_selection_failure | 1    |

Provider stderr (identical on both attempts):

```text
ActionRequiredError: Your team has reached its usage limit Please reach out to an admin to increase your limit, or return on 9/1/2026 when your usage resets.
Error: command failed unexpectedly.
```

Envelope `message`: `Branch-local gate route did not return JSON.` No review
artifact was written; the `plan | artifact` Reviews row stays `pending`.

Disposition: operational launch failure → autonomy boundary
(`missing-credentials` class: the configured gate route's provider entitlement
is exhausted until 2026-09-01 and no integrity-preserving route exists without
operator action). Not counted as a gate remediation attempt.
