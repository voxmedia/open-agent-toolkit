import { describe, expect, it } from 'vitest';

import { validateConfiguredGateCommand } from './configured-command';

describe('validateConfiguredGateCommand', () => {
  it('accepts the canonical structured gate-review command unchanged', () => {
    const command =
      'oat --json gate review --project "$PROJECT_PATH" --scope p01';

    expect(validateConfiguredGateCommand(command)).toEqual({
      kind: 'valid',
      command: 'gate-review',
    });
  });

  it.each([
    'oat gate review --project "$PROJECT_PATH"',
    'oat gate review --json --project "$PROJECT_PATH"',
    'oat --json --json gate review --project "$PROJECT_PATH"',
    'oat gate --json review --project "$PROJECT_PATH"',
  ])('rejects non-canonical global JSON placement: %s', (command) => {
    expect(validateConfiguredGateCommand(command)).toEqual({
      kind: 'invalid',
      command: 'gate-review',
      message:
        'Configured oat gate review commands must use the structured-output contract `oat --json gate review ...`.',
    });
  });

  it.each([
    'codex exec --json "Review the configured oat gate review contract"',
    'claude -p "oat gate review --json"',
    'oat gate status --json',
    'oat gate cross-provider-exec --json',
    'oat --verbose status',
  ])('leaves unrelated and provider-native commands alone: %s', (command) => {
    expect(validateConfiguredGateCommand(command)).toEqual({
      kind: 'not-applicable',
    });
  });

  it.each([
    'env OAT_MODE=review oat --json gate review',
    'sh -c "oat --json gate review"',
    'oat --json gate review | jq .',
    'oat --json gate review $(echo later)',
  ])(
    'handles wrappers and shell-heavy shapes conservatively: %s',
    (command) => {
      expect(validateConfiguredGateCommand(command)).toEqual({
        kind: 'not-applicable',
      });
    },
  );
});
