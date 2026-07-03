---
oat_generated: true
oat_generated_at: 2026-07-02
oat_kind: summary
oat_project: brainstorm-visual-companion-v6
oat_workflow_mode: quick
---

# Project Summary: brainstorm-visual-companion-v6

## Overview

Brought OAT's `oat-brainstorm` **visual companion** bundle to **Superpowers v6.0.3** security, resilience, and lifecycle parity, while preserving OAT's persistence paths (`.oat/brainstorm/`), neutral branding, and conditional-offer skill semantics. The prior bundle was a v5.0.7 port; Superpowers v6 shipped a security/resilience rewrite of the local web companion that OAT had not yet adopted. Quick-mode project: discovery + plan, 4 phases, 9 tasks.

## What Was Implemented

- **Security (headline):** session-key auth on HTTP **and** WebSocket (`?key=` + cookie bootstrap); sandboxed `/files/` static serving that rejects path traversal, dotfiles, **and symlink escape**; security headers (`Cache-Control: no-store`, `X-Frame-Options: DENY`, plus additive `Referrer-Policy` / CSP `frame-ancestors 'none'` / `Cross-Origin-Resource-Policy`); WebSocket max-frame guard.
- **Resilience (client):** exponential-backoff reconnect, status-pill states, paused/tombstone overlay, keyed reload after server recovery; frame rebranded "OAT Brainstorm". OAT's existing selection-summary indicator bar was retained alongside the new v6 status pill (deliberate deviation from upstream, which removed it).
- **Lifecycle:** OAT three-tier persistence (`--project-dir` → repo walk-up → `~/.oat/brainstorm/`) with `.last-port`/`.last-token`; restart with the same `--project-dir` reuses port **and** key; `--open`; configurable idle timeout (`--idle-timeout-minutes` → `BRAINSTORM_IDLE_TIMEOUT_MS`, 4h default); `umask 077`; instance-verified `stop-server` (matches `--brainstorm-server-id` before signaling, writes `server-stopped`).
- **Docs / provenance:** `references/visual-companion.md` + `SKILL.md` step 3 document the v6 behavior; SKILL.md `version` 1.1.0 → 1.2.0; `NOTICES.md` updated to v6.0.3 adapted-port provenance.
- **Release:** lockstep bump of all 5 public packages to 0.1.34; provider views synced (no drift); `pnpm release:validate` passes.

## Verification

- 10/10 visual-companion smoke tests (`packages/cli/src/integration/visual-companion-smoke.test.ts`) — auth/headers, `/files/` traversal + dotfile + symlink sandbox (RED/GREEN-proven load-bearing during review), restart port+key reuse, stop-server stale-instance guard.
- `pnpm release:validate` passes (5 public packages @ 0.1.34); `pnpm oat:validate-skills` OK; `pnpm type-check` + `pnpm lint` clean.
- Implementer and reviewers independently ran live end-to-end server exercises (start → curl unauth/authed/traversal/dotfile/symlink → stop).

## Reviews

Per-phase gate reviews + a final review, all via fresh-context subagents (Tier 1, ceiling sonnet):

- Plan artifact review (2 cycles) — findings resolved in-plan (symlink test, provider sync).
- p01 pass · p02 pass · **p03 fail → fix → pass** (1 iteration; caught a vacuous traversal/dotfile test and made it real) · p04 skipped (no-op docs) · **final pass** (0 Critical / 0 Important; 4 minors accept-deferred with rationale).

## Deferred / Follow-ups

Four Minor findings accept-deferred (rationale in `implementation.md`): plaintext-HTTP WS assumption for an unsupported HTTPS-tunnel mode (fails closed); pre-existing dead code block in `start-server.sh`; a WS-auth doc wording nit; an untested `nextReconnectDelay` export. Separately, `bl-7d5b` (live-dogfood `oat-brainstorm`) remains open — live dogfooding was out of scope for this port.
