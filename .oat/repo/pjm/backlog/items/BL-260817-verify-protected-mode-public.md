---
id: BL-260817-verify-protected-mode-public
title: Verify protected-mode public URLs with an authenticated end-to-end GET
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - explainer-kit
  - security
  - publication
assignee: null
created: 2026-08-17T04:21:20.540Z
updated: 2026-08-17T04:21:20.540Z
associated_issues: []
external_plans: []
---

## Description

In `protected` publication mode the explainer-kit skips the public fetch entirely, so nothing proves that an advertised `publicBaseUrl` actually reaches the uploaded object. Authenticated S3 verification proves the uploaded object only. The receipt reports this honestly (`publicVerification: {status: 'skipped-protected'}`), and p07-t03 additionally surfaces it in the generated catalog, but neither is a control — both are disclosure.

The sound control is an end-to-end GET through the advertised URL using deployment-appropriate credentials (CloudFront signed URL or signed cookie, or mTLS), followed by the same body-hash comparison that public mode already performs. That verifies the actual key-to-URL binding instead of proxying for it.

Background: p07-t03 originally tried to infer the binding structurally by requiring the public root path to equal the S3 key prefix. That rule was removed as unsound — the mapping is underdetermined by the two strings, since it lives in CDN configuration the tool cannot read, and a production CloudFront Origin Path deployment (bucket prefix mapped to distribution root) is a legitimate counterexample. See Recovery Event `p07-rec-001` and the operator-direction note in the explainer-improvements-v2 project.

Requires new configuration surface: a way to declare how the publisher may authenticate to the public endpoint.

Security caveat, load-bearing: any signing material or authorization header used for this check must be scoped and host-bound to the configured public root. Otherwise a misconfigured or attacker-influenced `publicBaseUrl` turns the verification step into a credential-exfiltration path — which would be strictly worse than the disclosure-only state it replaces.

Alternative considered and rejected as incomplete: provider control-plane inspection (reading the distribution's origin, behaviors, and Origin Path). It fails as unverifiable wherever routing involves DNS indirection, redirects, custom origins, CloudFront Functions, or Lambda@Edge.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
