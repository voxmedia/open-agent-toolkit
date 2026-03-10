import { describe, expect, it } from 'vitest';
import { createSourceConfig } from './source-config.js';

describe('createSourceConfig', () => {
  it('should include remarkTabs in remarkPlugins', () => {
    const config = createSourceConfig();

    expect(config.remarkPlugins.length).toBeGreaterThanOrEqual(1);

    // Check that remarkTabs is in the array (by function name)
    const pluginNames = config.remarkPlugins.map((p) =>
      typeof p === 'function' ? p.name : String(p),
    );
    expect(pluginNames).toContain('remarkTabs');
  });

  it('should include remarkGithubBlockquoteAlert in remarkPlugins', () => {
    const config = createSourceConfig();

    const pluginNames = config.remarkPlugins.map((p) =>
      typeof p === 'function' ? p.name : String(p),
    );
    expect(pluginNames).toContain('remarkAlert');
  });

  it('should include remarkMermaid in remarkPlugins', () => {
    const config = createSourceConfig();

    const pluginNames = config.remarkPlugins.map((p) =>
      typeof p === 'function' ? p.name : String(p),
    );
    expect(pluginNames).toContain('remarkMermaid');
  });

  it('should set content directory to ./docs', () => {
    const config = createSourceConfig();

    expect(config.contentDir).toBe('./docs');
  });

  it('should include search config from createSearchConfig', () => {
    const config = createSourceConfig();

    expect(config.search).toBeDefined();
    expect(config.search.engine).toBe('flexsearch');
    expect(config.search.type).toBe('static');
  });
});
