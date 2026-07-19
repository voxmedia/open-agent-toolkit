# Frozen explainer-kit RC materials (f212d630)

Verified 2026-07-18 against the tracked rc.json from origin/tkstang/explainer-kit
@ 4a3d3979 (frozen code commit 534a408e):

- rc.json self-consistency: sha256 over record-minus-rcId reproduces the rcId.
- Rebuild from a pristine 534a408e worktree: 4/5 package tarballs byte-match;
  all 11 schemas + recipes match recorded per-file sha256s; both skill content
  hashes match. CLI whole-tarball hash differs (reported upstream,
  msg_02337b3a27f4) — divergence is outside the explainer surfaces and does
  not affect these frozen contracts.

These copies are p06's build inputs. Do NOT edit; the RC is immutable. p06
builds against these schemas/recipes only — never the explainer-kit source
tree.
