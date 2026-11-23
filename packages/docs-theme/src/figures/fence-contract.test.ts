/*
 * Contract between the fence table and the figure components.
 *
 * `DOCS_FENCES` in docs-transforms names the MDX element each `docs-*` fence
 * becomes; `DOCS_FIGURE_COMPONENTS` here names the components that render
 * them. A name on one side only either fails the build at render time or
 * ships a component no fence can reach, so the two lists must be equal.
 */
import { DOCS_FENCES } from '@open-agent-toolkit/docs-transforms';
import { describe, expect, it } from 'vitest';

import { DOCS_FIGURE_COMPONENTS } from './index.js';

describe('docs fence contract', () => {
  it('renders every DOCS_FENCES component and nothing else', () => {
    const fenceComponents = new Set(
      Object.values(DOCS_FENCES).map((entry) => entry.component),
    );
    const figureComponents = new Set<string>(DOCS_FIGURE_COMPONENTS);

    expect([...figureComponents].sort()).toEqual([...fenceComponents].sort());
  });

  it('maps each fence to a distinct component', () => {
    const components = Object.values(DOCS_FENCES).map(
      (entry) => entry.component,
    );

    expect(new Set(components).size).toBe(components.length);
  });
});
