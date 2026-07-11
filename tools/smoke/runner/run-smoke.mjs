import { fileURLToPath } from 'node:url';

import { parseArgs } from './args.mjs';
import { runPreflight } from './preflight.mjs';

export class HandlerUnavailableError extends Error {
  constructor(stage) {
    super(`Smoke runner stage "${stage}" is unavailable.`);
    this.name = 'HandlerUnavailableError';
  }
}

export async function runSmoke(options, { handlers = {}, preflight } = {}) {
  const results = {};

  if (typeof preflight === 'function') {
    results.preflight = await preflight(options);
  }

  for (const stage of options.stages) {
    const handler = handlers[stage];

    if (typeof handler !== 'function') {
      throw new HandlerUnavailableError(stage);
    }

    results[stage] = await handler(options);
  }

  return results;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  return runSmoke(options, {
    preflight: (preflightOptions) =>
      runPreflight(preflightOptions, { reporter: console.log }),
  });
}

const invokedPath = process.argv[1] ? fileURLToPath(import.meta.url) : null;
if (invokedPath === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
