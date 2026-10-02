---
title: Diagnose Your OAT Setup
description: Inspect OAT configuration, repository adoption, instructions, documentation, and installed tools before choosing a repair.
---

# Diagnose Your OAT Setup

## oat-doctor

**Invocation:** `/oat-doctor` for the diagnostic sweep, or
`/oat-doctor --summary` for the compact tools/dashboard view. These are agent
instructions rather than shell commands; Codex uses `$oat-doctor`. The skill
is explicit-invocation only, so use the slash or `$` form rather than relying
on the agent to pick it when you describe the problem. Summary mode is not a
shortened run of every diagnostic area.

**Prerequisites:** Access to the repository and the OAT CLI available as
`oat` on your PATH. Needs an active OAT project: no. An uninitialized
repository can still receive bootstrap guidance; missing adoption (the
repository has not been set up for that OAT feature yet) is a finding, not
evidence that all checks passed.

**Example scenario:** A teammate installed a tool pack but cannot see its
skills in their provider. Run the full doctor sweep to distinguish installed
tools, configuration, and provider-instruction issues before reinstalling
anything. Pick the tools area when the report asks which area to explore, then
approve or run the fix it names. Use summary mode
later when you only need the tools/dashboard snapshot.

The full sweep covers configuration, project-management adoption, agent
instructions, documentation, and tools. The skill interprets diagnostic
findings rather than assuming a nonzero diagnostic exit means the entire tool
is broken. After the report, it asks which area to explore further (an area,
`all`, or `done`) and repeats until you choose `done`. Inspection is read-only
by default. In an interactive run, a specifically approved, supported repair
command can be executed once; a general request to diagnose is not approval
for updates, installation, or synchronization. Non-interactive and report-only
runs stop at the report.

**What it does without asking:** It runs read-only `oat` commands with JSON
output and reads configuration and instruction files. It writes, deletes, and
commits nothing, and starts no subagents. It runs a repair only after you
approve that exact command, and only if the command is one of `oat config set`,
`oat config unset`, `oat config adopt`, `oat pjm init`,
`oat instructions sync`, `oat tools update`, or `oat tools install`. It never
runs any other command, such as `oat sync` to refresh provider views; those
commands, and hand-offs to other skills, are yours to run.

**Expected output:** A diagnostic report explaining what is healthy, what is
missing or inconsistent, and which bounded action could address it. A report
does not itself establish that a proposed repair ran or that the provider has
reloaded the result.

**Next step:** Approve the exact repair you want, or investigate the reported
area separately. After a repair, rerun the relevant check and verify the
original symptom rather than relying only on command completion.
