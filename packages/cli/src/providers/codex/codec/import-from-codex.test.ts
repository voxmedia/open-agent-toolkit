import { describe, expect, it } from 'vitest';

import { importCanonicalAgentFromCodexRole } from './import-from-codex';

describe('importCanonicalAgentFromCodexRole', () => {
  it('imports codex role TOML to canonical agent document with defaults', () => {
    const imported = importCanonicalAgentFromCodexRole({
      roleName: 'oat-reviewer',
      description: 'Reviewer role',
      roleContent: `developer_instructions = """\\n## Role\\nReview.\\n"""\nsandbox_mode = "read-only"\nmodel = "gpt-5"\n`,
    });

    expect(imported.name).toBe('oat-reviewer');
    expect(imported.description).toBe('Reviewer role');
    expect(imported.tools).toBe('Read, Grep, Glob, Bash');
    expect(imported.readonly).toBe(true);
    expect(imported.extensions.x_codex).toEqual({
      sandbox_mode: 'read-only',
      model: 'gpt-5',
    });
    expect(imported.body).toContain('## Role');
  });

  it('falls back to generated description when config description is missing', () => {
    const imported = importCanonicalAgentFromCodexRole({
      roleName: 'oat-reviewer',
      roleContent: 'developer_instructions = "Body"',
    });

    expect(imported.description).toBe('Imported from Codex role oat-reviewer');
  });
});
