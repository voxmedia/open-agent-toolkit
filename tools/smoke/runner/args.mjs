const HARNESS_VALUES = ['codex', 'claude', 'cursor-ide', 'cursor-cli'];
const SCENARIO_VALUES = ['plan-review', 'implement', 'full'];
const STAGE_VALUES = ['prepare', 'drive', 'collect'];

export const usage = `Usage: node tools/smoke/runner/run-smoke.mjs \
--harness <${HARNESS_VALUES.join('|')}> \
--scenario <${SCENARIO_VALUES.join('|')}> \
[--stage <${STAGE_VALUES.join('|')}>] [--dry-run] [--keep]`;

export class UsageError extends Error {
  constructor(message) {
    super(`${message}\n\n${usage}`);
    this.name = 'UsageError';
  }
}

function requireValue(argv, index, option) {
  const value = argv[index + 1];

  if (!value || value.startsWith('--')) {
    throw new UsageError(`${option} requires a value.`);
  }

  return value;
}

function assertEnum(option, value, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new UsageError(
      `${option} must be one of: ${allowedValues.join(', ')}. Received: ${value}`,
    );
  }
}

function assertNotRepeated(seen, option) {
  if (seen.has(option)) {
    throw new UsageError(`${option} may only be provided once.`);
  }

  seen.add(option);
}

export function parseArgs(argv) {
  const options = {
    dryRun: false,
    keep: false,
    stages: [...STAGE_VALUES],
  };
  const seen = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];

    if (
      option === '--harness' ||
      option === '--scenario' ||
      option === '--stage'
    ) {
      assertNotRepeated(seen, option);
      const value = requireValue(argv, index, option);

      if (option === '--harness') {
        assertEnum(option, value, HARNESS_VALUES);
        options.harness = value;
      } else if (option === '--scenario') {
        assertEnum(option, value, SCENARIO_VALUES);
        options.scenario = value;
      } else {
        assertEnum(option, value, STAGE_VALUES);
        options.stages = [value];
      }

      index += 1;
      continue;
    }

    if (option === '--dry-run' || option === '--keep') {
      assertNotRepeated(seen, option);
      options[option === '--dry-run' ? 'dryRun' : 'keep'] = true;
      continue;
    }

    if (option.startsWith('--')) {
      throw new UsageError(`Unknown option: ${option}`);
    }

    throw new UsageError(`Unexpected argument: ${option}`);
  }

  if (!options.harness) {
    throw new UsageError('--harness is required.');
  }

  if (!options.scenario) {
    throw new UsageError('--scenario is required.');
  }

  return {
    dryRun: options.dryRun,
    harness: options.harness,
    keep: options.keep,
    scenario: options.scenario,
    stages: options.stages,
  };
}
