import { describe, expect, it } from 'vitest';

import { stripTemplateFrontmatter } from './strip-template-frontmatter';

describe('stripTemplateFrontmatter', () => {
  it('strips leading template frontmatter', () => {
    const content = [
      '---',
      'oat_template: true',
      'oat_template_name: current-state',
      '---',
      '',
      '# Current State',
      '',
    ].join('\n');

    expect(stripTemplateFrontmatter(content)).toBe('# Current State\n');
  });

  it('strips when only oat_template_name is present', () => {
    const content = [
      '---',
      'oat_template_name: roadmap',
      '---',
      '',
      '# Roadmap',
    ].join('\n');

    expect(stripTemplateFrontmatter(content)).toBe('# Roadmap');
  });

  it('preserves non-template frontmatter', () => {
    const content = ['---', 'title: Keep Me', '---', '', '# Keep Me'].join(
      '\n',
    );

    expect(stripTemplateFrontmatter(content)).toBe(content);
  });

  it('preserves content without leading frontmatter', () => {
    expect(stripTemplateFrontmatter('# Plain Doc\n')).toBe('# Plain Doc\n');
  });

  it('preserves malformed frontmatter', () => {
    const content = '---\noat_template: true\n# Missing close\n';
    expect(stripTemplateFrontmatter(content)).toBe(content);
  });
});
