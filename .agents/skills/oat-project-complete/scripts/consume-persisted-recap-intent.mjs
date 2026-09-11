import { pathToFileURL } from 'node:url';

import { readPersistedIntent } from '../../oat-explainer-kit/scripts/persist-intent.mjs';

function consumptionError(message) {
  const error = new Error(message);
  error.code = 'E_RECAP_CONSUMPTION';
  return error;
}

export async function consumePersistedRecapIntent({
  statePath,
  generate = async () => undefined,
}) {
  const record = await readPersistedIntent({
    statePath,
    product: 'projectRecap',
  });
  if (record === null) {
    throw consumptionError(
      'Completion recap intent must be persisted before consumption.',
    );
  }
  if (record.decision === 'skip') {
    return {
      decision: 'skip',
      source: record.source,
      suppressed: ['manifest-discovery', 'bundle', 'authoring'],
      generated: false,
      value: null,
    };
  }
  if (record.decision !== 'generate') {
    throw consumptionError(
      `Unsupported persisted recap decision: ${String(record.decision)}`,
    );
  }
  return {
    decision: 'generate',
    source: record.source,
    suppressed: [],
    generated: true,
    value: await generate(record),
  };
}

async function main(argv) {
  if (argv.length !== 1) {
    throw consumptionError(
      'Usage: consume-persisted-recap-intent.mjs <state.md>',
    );
  }
  return consumePersistedRecapIntent({ statePath: argv[0] });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2))
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({ ok: false, code: error.code, message: error.message })}\n`,
      );
      process.exitCode = 1;
    });
}
