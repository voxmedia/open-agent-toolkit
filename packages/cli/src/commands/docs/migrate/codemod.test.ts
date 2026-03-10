import { describe, expect, it } from 'vitest';
import { convertAdmonitions } from './codemod';

describe('convertAdmonitions', () => {
  it('converts a simple note admonition', () => {
    const input = '!!! note\n    This is a note.\n';
    const result = convertAdmonitions(input);
    expect(result.content).toBe('> [!NOTE]\n> This is a note.\n');
    expect(result.admonitionsConverted).toBe(1);
  });

  it('converts an admonition with a custom title', () => {
    const input = '!!! warning "Watch out"\n    Be careful here.\n';
    const result = convertAdmonitions(input);
    expect(result.content).toBe('> [!WARNING] Watch out\n> Be careful here.\n');
    expect(result.admonitionsConverted).toBe(1);
  });

  it('converts all supported admonition types', () => {
    const types = [
      { mkdocs: 'note', gfm: 'NOTE' },
      { mkdocs: 'warning', gfm: 'WARNING' },
      { mkdocs: 'tip', gfm: 'TIP' },
      { mkdocs: 'important', gfm: 'IMPORTANT' },
      { mkdocs: 'caution', gfm: 'CAUTION' },
      { mkdocs: 'danger', gfm: 'CAUTION' },
      { mkdocs: 'info', gfm: 'NOTE' },
      { mkdocs: 'abstract', gfm: 'NOTE' },
      { mkdocs: 'success', gfm: 'TIP' },
      { mkdocs: 'question', gfm: 'NOTE' },
      { mkdocs: 'failure', gfm: 'CAUTION' },
      { mkdocs: 'bug', gfm: 'CAUTION' },
      { mkdocs: 'example', gfm: 'TIP' },
      { mkdocs: 'quote', gfm: 'NOTE' },
    ];

    for (const { mkdocs, gfm } of types) {
      const input = `!!! ${mkdocs}\n    Content.\n`;
      const result = convertAdmonitions(input);
      expect(result.content).toBe(`> [!${gfm}]\n> Content.\n`);
    }
  });

  it('converts an admonition with multiple indented lines', () => {
    const input =
      '!!! note\n    First line.\n    Second line.\n\n    Third line after blank.\n';
    const result = convertAdmonitions(input);
    expect(result.content).toBe(
      '> [!NOTE]\n> First line.\n> Second line.\n>\n> Third line after blank.\n',
    );
    expect(result.admonitionsConverted).toBe(1);
  });

  it('preserves content after the admonition', () => {
    const input = '!!! note\n    Note content.\n\nRegular paragraph.\n';
    const result = convertAdmonitions(input);
    expect(result.content).toBe(
      '> [!NOTE]\n> Note content.\n\nRegular paragraph.\n',
    );
  });

  it('converts multiple admonitions in one file', () => {
    const input =
      '!!! note\n    First note.\n\n!!! warning "Title"\n    Second warning.\n';
    const result = convertAdmonitions(input);
    expect(result.content).toBe(
      '> [!NOTE]\n> First note.\n\n> [!WARNING] Title\n> Second warning.\n',
    );
    expect(result.admonitionsConverted).toBe(2);
  });

  it('returns unchanged content when no admonitions present', () => {
    const input = '# Hello\n\nRegular content.\n';
    const result = convertAdmonitions(input);
    expect(result.content).toBe(input);
    expect(result.admonitionsConverted).toBe(0);
  });

  it('handles collapsible admonitions (??? syntax)', () => {
    const input = '??? tip "Click to expand"\n    Hidden content.\n';
    const result = convertAdmonitions(input);
    expect(result.content).toBe(
      '> [!TIP] Click to expand\n> Hidden content.\n',
    );
    expect(result.admonitionsConverted).toBe(1);
  });
});
