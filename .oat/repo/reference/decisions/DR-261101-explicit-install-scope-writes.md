---
id: DR-261101-explicit-install-scope-writes
title: Explicit install scope writes only that scope
date: 2026-11-01
status: accepted
legacy_id: null
---

# Explicit install scope writes only that scope

## Context

tools install filtered requested scopes by each pack's allowedScopes and then reported success for an empty target list (core is user-scope only), and an explicit --scope unioned with an existing placement in the other scope, so --scope user wrote project localPaths and a .gitignore block while --scope project wrote under HOME. init --setup ignored an explicit --scope entirely.

## Decision

An explicit --scope project or user writes and syncs only that scope for single-pack, aggregate and init --setup installs; an existing placement in the other scope is neither reconciled nor removed. A pack install that resolves to no allowed scope exits 1 (core --scope project reports that core is user-scope only, recovery code scope-not-allowed), and the aggregate install under explicit --scope project skips core and reports skippedPacks. No-flag and --scope all behavior is unchanged; core was not extended to project scope.

## Consequences

Explicit-scope installs are a safety contract backed by negative controls on HOME and repository snapshots. After an explicit-scope install the summary names only the written scope. JSON consumers see the new skippedPacks field and the scope-not-allowed recovery code.
