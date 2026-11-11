import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function refuse(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

/** Execution-local references to existing explicit authority are not grants. */
function resolveDecision(options) {
  if (
    !options.prUrl ||
    options.prUrl === 'null' ||
    !['open', 'merged'].includes(options.prStatus)
  ) {
    refuse(
      'E_AUTO_PR_PRECONDITION',
      'Automatic completion requires a live merged or permitted tracked open PR; use oat-project-complete for absent PRs.',
    );
  }
  if (options.prStatus === 'open') return { shouldOpen: false, authority: '' };
  let authorities;
  try {
    authorities = JSON.parse(options.authoritiesJson ?? '[]');
  } catch {
    refuse(
      'E_AUTO_FOLLOWUP_AUTHORITY',
      'Invalid per-project authority handoff; refuse before completion writes.',
    );
  }
  if (!Array.isArray(authorities))
    refuse(
      'E_AUTO_FOLLOWUP_AUTHORITY',
      'Expected an array of existing per-project authority references.',
    );
  const matches = authorities.filter(
    (entry) =>
      entry &&
      typeof entry.projectPath === 'string' &&
      resolve(entry.projectPath) === resolve(options.projectPath) &&
      entry.originalPrUrl === options.prUrl,
  );
  if (
    matches.length !== 1 ||
    typeof matches[0].source !== 'string' ||
    !matches[0].source.trim()
  ) {
    refuse(
      'E_AUTO_FOLLOWUP_AUTHORITY',
      'Merged completion needs existing explicit authority for this project and original PR covering follow-up preparation AND publication; autonomous opt-in and PR_ON_COMPLETE do not grant it. Refuse before writes; resolve authority with oat-project-complete.',
    );
  }
  return { shouldOpen: true, authority: matches[0].source.trim() };
}

function main(argv) {
  const options = {};
  const names = {
    '--project-path': 'projectPath',
    '--pr-url': 'prUrl',
    '--pr-status': 'prStatus',
    '--authorities-json': 'authoritiesJson',
    '--format': 'format',
  };
  for (let index = 0; index < argv.length; index += 2) {
    const name = names[argv[index]];
    if (!name || argv[index + 1] === undefined)
      refuse('E_AUTO_AUTHORITY_ARGUMENT', `Invalid argument ${argv[index]}`);
    options[name] = argv[index + 1];
  }
  if (
    !options.projectPath ||
    !('prStatus' in options) ||
    (options.format && options.format !== 'shell')
  )
    refuse(
      'E_AUTO_AUTHORITY_ARGUMENT',
      'Expected project path, live PR status, PR URL and optional shell format.',
    );
  const decision = resolveDecision(options);
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  process.stdout.write(
    options.format === 'shell'
      ? `SHOULD_OPEN_PR=${quote(String(decision.shouldOpen))}\nCOMPLETION_FOLLOWUP_AUTHORITY=${quote(decision.authority)}\n`
      : `${JSON.stringify(decision)}\n`,
  );
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ code: error.code ?? 'E_AUTO_FOLLOWUP_AUTHORITY', message: error.message })}\n`,
    );
    process.exitCode = 1;
  }
}
