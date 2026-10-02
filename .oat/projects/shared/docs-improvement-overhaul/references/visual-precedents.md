# Visual precedents and bounded scope

Read-only reconnaissance by the existing Luna xhigh route-inventory helper, on the Mini. No external assets copied, new dependencies installed, or diagrams rendered during this pass.

## Gizmo patterns

- `/Users/tstang/Code/vox/gizmo-slack-app/README.md:7` uses a Mermaid sequence diagram near the introduction.
- `documentation/public/diagrams/` has eight SVGs; `documentation/docs/engineering/agent-internals/sub-agents.md:14` and `documentation/docs/engineering/architecture/runtime-flow.md:12` pair polished SVG with Mermaid.
- `documentation/AGENTS.md:47` and `documentation/docs/engineering/contributing/markdown-features.md:77` prefer Mermaid as source of truth and warn against regenerating SVG without the actual workflow. Paired views carry dates to expose drift.
- No root license or notice file was found in that checkout. Borrow the communication pattern, not artwork or prose. OAT separately requires attribution for adapted external prose.

## Existing OAT capability

- Inventory found 18 Mermaid fences in docs plus one in the root README; no SVG assets under the docs app.
- `packages/docs-config/src/source-config.ts:21` enables Mermaid and tabs transforms.
- `packages/docs-transforms/src/remark-mermaid.ts:5` emits a custom Mermaid component.
- `packages/docs-theme/src/mermaid.tsx:17` loads/renders Mermaid after hydration. Browser QA must wait for the diagram, not accept a pre-hydration screenshot as rendered evidence.
- `apps/oat-docs/docs/contributing/markdown-features.md:45` documents Mermaid; custom docs tab syntax is not a README renderer feature.

## Accepted draft treatment

The current design bounds work to one original README adoption SVG and four docs treatments: quickstart choice, provider-sync ownership/drift, docs bootstrap/analyze/approval/apply, and idea/backlog/project promotion. Each answers one named reader question. This is not permission to redraw every existing lifecycle diagram.

Mermaid remains the canonical source for flow diagrams. The original hero SVG is a separate adoption illustration, not a manually duplicated rendering of an evolving behavior graph. All have useful text equivalents. Review actual GitHub-compatible README and Fumadocs rendering; package READMEs remain useful without diagram support.
