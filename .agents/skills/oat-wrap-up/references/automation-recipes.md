# Automation Recipes

The `oat-wrap-up` skill is manual and model-invocable by design. OAT itself does not ship a scheduler (see `.agents/docs/agent-instruction.md:18` — scheduling is out of scope for OAT). To run the skill on a recurring cadence, configure your host agent or an external cron to invoke it. Three patterns are documented below.

## Pattern 1 — Claude Code `CronCreate` trigger

Use Claude Code's scheduled-trigger mechanism to fire the skill on a fixed cadence. Create the trigger from within Claude Code:

```
/schedule "0 9 * * 1" "/oat-wrap-up --past-week"
```

Or via the `CronCreate` tool directly (if building from the SDK):

```json
{
  "name": "oat-wrap-up-weekly",
  "cron": "0 9 * * 1",
  "timezone": "America/Los_Angeles",
  "prompt": "/oat-wrap-up --past-week"
}
```

Notes:

- `0 9 * * 1` fires every Monday at 09:00 in the configured timezone.
- The prompt is interpreted as a user message — Claude Code routes it through the normal skill invocation path.
- Pair this with a wrapper prompt like `After the wrap-up completes, git add the resulting file, commit it with "chore: weekly wrap-up for {date}", and push to a new branch with name weekly-wrap-up/{date}` if you want automated commit + push.

## Pattern 2 — Codex host scheduling

Codex exposes scheduled-trigger capabilities through its host runtime. Consult your Codex deployment's scheduling docs for the exact API (it varies by host integration).

The generic pattern:

1. Create a scheduled trigger whose prompt is `/oat-wrap-up --past-week` (or a named range that matches your cadence).
2. Configure the trigger to run in a workspace where the OAT repository is the current working directory.
3. Ensure the workspace has `gh` authenticated and, for cross-teammate visibility, a recent run of `oat project archive sync` (this can be a pre-prompt step in the trigger).

If your Codex host does not expose scheduled triggers, fall through to Pattern 3.

## Pattern 3 — Plain cron / systemd timer via headless host CLI

When neither Claude Code's `CronCreate` nor Codex host scheduling is available, drive the skill via a headless host CLI from plain cron.

### crontab example (Claude Code headless)

```cron
# Every Monday at 09:00 local time, generate a past-week wrap-up and commit it.
0 9 * * 1 cd /path/to/repo && \
  oat project archive sync --dry-run > /dev/null && \
  claude -p "/oat-wrap-up --past-week" && \
  git add .oat/repo/reference/wrap-ups && \
  git -c user.name="wrapup-bot" -c user.email="wrapup-bot@example.com" commit -m "chore: weekly wrap-up $(date -u +%Y-%m-%d)" >/dev/null 2>&1 || true
```

Notes:

- Replace `claude -p ...` with your host's headless invocation (`codex -p ...`, etc.) if using a different host.
- The `oat project archive sync --dry-run` call is a preflight check — it surfaces auth or config problems early. Change it to `oat project archive sync` if you want to actively pull teammates' archives before each run.
- The trailing `|| true` keeps cron quiet when there is nothing new to commit (e.g., the wrap-up matched a previous one).

### systemd timer example

`/etc/systemd/system/oat-wrap-up.service`:

```ini
[Unit]
Description=Generate weekly OAT wrap-up

[Service]
Type=oneshot
WorkingDirectory=/path/to/repo
ExecStart=/bin/sh -c 'oat project archive sync --dry-run && claude -p "/oat-wrap-up --past-week"'
User=wrapup-bot
```

`/etc/systemd/system/oat-wrap-up.timer`:

```ini
[Unit]
Description=Weekly OAT wrap-up

[Timer]
OnCalendar=Mon 09:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable with `systemctl enable --now oat-wrap-up.timer`.

## Operational guidance

- **Timezones**: The skill resolves named ranges against `today` in the local timezone of the host running the skill. Always pin the timezone at the scheduler layer (cron `TZ=`, systemd `OnCalendar=Mon 09:00 America/Los_Angeles`, or the Claude Code trigger's `timezone` field) so reports are reproducible across re-runs.
- **Cadence vs window length**: A weekly cadence usually pairs with `--past-week`. A biweekly cadence with `--past-2-weeks`. Running a weekly cadence with `--past-2-weeks` overlaps every report — fine if you want a rolling window, confusing if you expect discrete chunks.
- **Commit + push**: The skill itself never commits. If you want the report to land in the repo automatically, the automation wrapper owns the `git add && git commit && git push` step. Keep that wrapper out of the skill so the skill stays portable.
- **Failure handling**: If `gh` auth expires or `oat project archive sync` fails, the cron run should log the failure and exit non-zero rather than producing an empty wrap-up. Prefer pinning the shell to `set -euo pipefail` or an equivalent in the wrapper.
- **Idempotence**: Running the same window twice produces the same report content (modulo `generated_at`). Overwriting is safe; appending duplicate commits is usually not — coalesce with a pre-check (`git diff --quiet` on the wrap-ups directory) if your cadence might cause no-op runs.
