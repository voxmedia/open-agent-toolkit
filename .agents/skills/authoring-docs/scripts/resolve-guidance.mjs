import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

// Select inputs only. The consuming skill reads Markdown and checks Contents,
// local authority and conflicts; this helper never fetches or writes a source.
const { values } = parseArgs({
  options: {
    builtin: { type: 'string' },
    'ia-guidance': { type: 'string', multiple: true },
    'conversation-guidance': { type: 'string', multiple: true },
  },
});
const explicit = values['ia-guidance'];
const conversation = values['conversation-guidance'];
if (explicit && conversation) {
  throw new Error(
    'Use one explicit source list; reconcile argument/conversation disagreement with the user first.',
  );
}
const input = JSON.parse(readFileSync(0, 'utf8'));
if (input.status !== 'ok' || input.key !== 'documentation.guidance') {
  throw new Error(
    'Expected successful oat config get documentation.guidance --json output.',
  );
}
let locations;
let source;
if (explicit || conversation) {
  locations = explicit ?? conversation;
  source = explicit ? 'explicit' : 'conversation';
} else if (input.value !== null && input.value !== undefined) {
  if (!['shared', 'user'].includes(input.source)) {
    throw new Error(
      `Unsupported documentation.guidance config source: ${input.source}`,
    );
  }
  locations = Array.isArray(input.value) ? input.value : [input.value];
  source = input.source;
} else {
  locations = [values.builtin];
  source = 'builtin';
}
if (
  !locations.length ||
  locations.some((location) => typeof location !== 'string' || !location.trim())
) {
  throw new Error(
    'Guidance requires non-empty path/URL strings (or --builtin for fallback).',
  );
}
process.stdout.write(
  `${JSON.stringify({ sources: locations.map((location) => ({ location: location.trim(), source })) }, null, 2)}\n`,
);
