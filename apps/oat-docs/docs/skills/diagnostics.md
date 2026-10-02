---
title: Diagnose Your OAT Setup
description: Inspect OAT configuration, repository adoption, instructions, documentation, and installed tools before choosing a repair.
---

## oat-doctor

**Invocation:** `/oat-doctor` for the diagnostic sweep, or
`/oat-doctor --summary` for the compact tools/dashboard view. These are agent
instructions rather than shell commands; Codex uses `$oat-doctor`, or you can
ask for the skill by name. Summary mode is not a shortened run of every
diagnostic area.

**Prerequisites:** Access to the repository and an available OAT CLI. An
existing project is not required. An uninitialized repository can still
receive bootstrap guidance; missing adoption is a finding, not evidence that
all checks passed.

**Example scenario:** A teammate installed a tool pack but cannot see its
skills in their provider. Run the full doctor sweep to distinguish installed
tools, configuration, and provider-instruction issues before reinstalling
anything. Use summary mode later when you only need the tools/dashboard
snapshot.

The full sweep covers configuration, project-management adoption, agent
instructions, documentation, and tools. The skill interprets diagnostic
findings and offers relevant follow-up checks rather than assuming a nonzero
diagnostic exit means the entire tool is broken. Inspection is read-only by
default. In an interactive run, a specifically approved, supported repair
command can be executed once; a general request to diagnose is not approval
for updates, installation, or synchronization. Non-interactive and report-only
runs stop at the report.

**Expected output:** A diagnostic report explaining what is healthy, what is
missing or inconsistent, and which bounded action could address it. A report
does not itself establish that a proposed repair ran or that the provider has
reloaded the result.

**Next step:** Approve the exact repair you want, or investigate the reported
area separately. After a repair, rerun the relevant check and verify the
original symptom rather than relying only on command completion.
