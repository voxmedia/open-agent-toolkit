import { describe, expect, it } from 'vitest';
import { injectFrontmatter } from './frontmatter';

describe('injectFrontmatter', () => {
  it('injects title from mkdocs nav and seeds description', () => {
    const input = '# Getting Started\n\nSome content.\n';
    const result = injectFrontmatter(input, {
      mkdocsTitle: 'Getting Started',
      fileName: 'getting-started.md',
    });
    expect(result.content).toBe(
      '---\ntitle: Getting Started\ndescription: ""\n---\n\n# Getting Started\n\nSome content.\n',
    );
    expect(result.titleInjected).toBe(true);
    expect(result.descriptionSeeded).toBe(true);
  });

  it('does not modify title in existing frontmatter', () => {
    const input =
      '---\ntitle: Existing Title\ndescription: Existing\n---\n\n# Content\n';
    const result = injectFrontmatter(input, {
      fileName: 'test.md',
    });
    expect(result.content).toBe(input);
    expect(result.titleInjected).toBe(false);
    expect(result.descriptionSeeded).toBe(false);
  });

  it('falls back to first heading when no mkdocs title', () => {
    const input = '# My Custom Heading\n\nContent here.\n';
    const result = injectFrontmatter(input, {
      fileName: 'custom.md',
    });
    expect(result.content).toBe(
      '---\ntitle: My Custom Heading\ndescription: ""\n---\n\n# My Custom Heading\n\nContent here.\n',
    );
    expect(result.titleInjected).toBe(true);
  });

  it('falls back to filename title-case when no heading', () => {
    const input = 'Just content without heading.\n';
    const result = injectFrontmatter(input, {
      fileName: 'my-great-page.md',
    });
    expect(result.content).toBe(
      '---\ntitle: My Great Page\ndescription: ""\n---\n\nJust content without heading.\n',
    );
    expect(result.titleInjected).toBe(true);
  });

  it('seeds description when frontmatter exists but lacks it', () => {
    const input = '---\ntitle: Existing\n---\n\nContent.\n';
    const result = injectFrontmatter(input, {
      fileName: 'test.md',
    });
    expect(result.content).toBe(
      '---\ntitle: Existing\ndescription: ""\n---\n\nContent.\n',
    );
    expect(result.titleInjected).toBe(false);
    expect(result.descriptionSeeded).toBe(true);
  });

  it('leaves file unchanged when frontmatter has both title and description', () => {
    const input = '---\ntitle: Page\ndescription: A page.\n---\n\nContent.\n';
    const result = injectFrontmatter(input, {
      fileName: 'test.md',
    });
    expect(result.content).toBe(input);
    expect(result.titleInjected).toBe(false);
    expect(result.descriptionSeeded).toBe(false);
  });
});
