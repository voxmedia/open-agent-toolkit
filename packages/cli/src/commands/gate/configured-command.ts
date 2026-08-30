export type GateCommandContractResult =
  | { kind: 'not-applicable' }
  | { kind: 'valid'; command: 'gate-review' }
  | { kind: 'invalid'; command: 'gate-review'; message: string };

const INVALID_GATE_REVIEW_COMMAND_MESSAGE =
  'Configured oat gate review commands must use the structured-output contract `oat --json gate review ...`.';

function tokenizeCommand(command: string): string[] | null {
  const tokens: string[] = [];
  let token = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]!;

    if (escaped) {
      if (character === '\n') {
        return null;
      }
      token += character;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        if (
          quote !== "'" &&
          (character === '`' ||
            (character === '$' && command[index + 1] === '('))
        ) {
          return null;
        }
        token += character;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === '\n' || character === '`') {
      return null;
    }

    if (/\s/.test(character)) {
      if (token) {
        tokens.push(token);
        token = '';
      }
      continue;
    }

    if (
      '|;&<>'.includes(character) ||
      (character === '$' && command[index + 1] === '(')
    ) {
      return null;
    }

    token += character;
  }

  if (escaped || quote) {
    return null;
  }
  if (token) {
    tokens.push(token);
  }
  return tokens;
}

function isDirectGateReview(tokens: readonly string[]): boolean {
  if (tokens[0] !== 'oat') {
    return false;
  }

  let index = 1;
  while (index < tokens.length) {
    const token = tokens[index]!;
    if (token === 'gate') {
      return (
        tokens[index + 1] === 'review' ||
        (tokens[index + 1] === '--json' && tokens[index + 2] === 'review')
      );
    }

    if (
      token === '--json' ||
      token === '--verbose' ||
      token.startsWith('--cwd=')
    ) {
      index += 1;
      continue;
    }

    if (token === '--cwd') {
      if (!tokens[index + 1]) {
        return false;
      }
      index += 2;
      continue;
    }

    return false;
  }

  return false;
}

export function validateConfiguredGateCommand(
  command: string,
): GateCommandContractResult {
  const tokens = tokenizeCommand(command);
  if (!tokens || !isDirectGateReview(tokens)) {
    return { kind: 'not-applicable' };
  }

  if (
    tokens[1] === '--json' &&
    tokens[2] === 'gate' &&
    tokens[3] === 'review' &&
    tokens.filter((token) => token === '--json').length === 1
  ) {
    return { kind: 'valid', command: 'gate-review' };
  }

  return {
    kind: 'invalid',
    command: 'gate-review',
    message: INVALID_GATE_REVIEW_COMMAND_MESSAGE,
  };
}
