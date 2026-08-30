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
        if (character === '$' && command[index + 1] === '(') {
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

  const gateIndex = tokens.indexOf('gate');
  if (gateIndex < 1) {
    return false;
  }

  const reviewIndex =
    tokens[gateIndex + 1] === 'review'
      ? gateIndex + 1
      : tokens[gateIndex + 1] === '--json' && tokens[gateIndex + 2] === 'review'
        ? gateIndex + 2
        : -1;

  return (
    reviewIndex > gateIndex &&
    tokens.slice(1, gateIndex).every((token) => token.startsWith('-'))
  );
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
