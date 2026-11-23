# All figure fences

This page is the source of the captured compile fixture
`all-fences.compiled.js`. It holds one realistic example of each `docs-*`
figure fence.

## Steps

```docs-steps title="Set up figures"
1. Install the packages — add the docs packages to the app.
2. **Register the components (current)** — wrap the MDX map with `withDocsFigures`.
3. *Write a figure (next)* — add a `docs-tree` fence to a page.
```

## Tree

=== "Layout"

    ```docs-tree title="Project level"
    - .oat/
      - projects/
        - shared/
          - **mdxcn/ — the active project**
            - plan.md — task plan
            - state.md
      - repo/
    ```

=== "Notes"

    The bold node is the active project.

## Timeline

```docs-timeline title="Idea lifecycle"
- seed: captured in the scratchpad
- **brainstorming: actively being explored (current)**
- *summarized: finalized with a summary (next)*
```

## Terminal

```docs-terminal title="Build"
# Build the docs site
$ pnpm build:docs
Compiled 212 pages
✓ static export written to out/
```

## Decision

```docs-decision title="Storage" status="accepted" date="2026-11-21"
- **Postgres (chosen)** — we already run it
- *MongoDB (rejected)* — no schema guarantees
- SQLite — still open for local tools

The service keeps its existing connection pool. See the
[storage guide](guides/storage.md) for the migration.
```

## Check

```docs-check title="Release readiness"
- [x] Tests pass — on the merged tree
- [ ] Docs updated — scaffold and OAT pages
  - [x] Markdown Features page
  - [ ] Scaffold contributing page
```

## Compare

```docs-compare title="Figure options" accent="Fence"
| Feature        | Fence | MDX component |
| -------------- | ----- | ------------- |
| Plain Markdown | yes   | no            |
| Renders on GitHub | ✓  | –             |
| Needs imports  | no    | yes           |
```

## Annotate

````docs-annotate title="source.config.ts"
```ts
import { createSourceConfig } from '@open-agent-toolkit/docs-config'; // (1)

const config = createSourceConfig(); // (2)
export default config;
```

1. The shared chain already includes the fence transform.
2. Pass `appRoot` when the app is not the working directory.
````
