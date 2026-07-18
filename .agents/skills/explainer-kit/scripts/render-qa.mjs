#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { auditArtifactSet } from './lib/qa.mjs';

export async function runRenderQaCli(
  argv = process.argv.slice(2),
  io = console,
  options = {},
) {
  try {
    const parsed = parseArguments(argv);
    const denylist = [...parsed.denylist, ...(options.denylist ?? [])];
    if (parsed.paths.length === 0) {
      throw new Error(
        'Usage: render-qa.mjs [--deny <string>] [--type <type>] <html-path> [...]',
      );
    }

    const artifacts = await Promise.all(
      parsed.paths.map(async ({ path, type }, index) => ({
        id: `${basename(path)}-${index + 1}`,
        type,
        html: await readFile(path, 'utf8'),
      })),
    );
    const report = await auditArtifactSet({
      artifacts,
      denylist,
      ...(options.browserProbe && { browserProbe: options.browserProbe }),
      ...(options.widths && { widths: options.widths }),
    });
    io.log(JSON.stringify(report, null, 2));
    return report.valid ? 0 : 1;
  } catch (error) {
    io.log(
      JSON.stringify(
        {
          valid: false,
          issues: [
            {
              code: 'input',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        },
        null,
        2,
      ),
    );
    return 1;
  }
}

function parseArguments(argv) {
  const paths = [];
  const denylist = [];
  let nextType;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--deny') {
      const denied = argv[index + 1];
      if (!denied) throw new Error('--deny requires a string.');
      denylist.push(denied);
      index += 1;
    } else if (value === '--type') {
      nextType = argv[index + 1];
      if (!['hub', 'diagram', 'explainer', 'deck'].includes(nextType)) {
        throw new Error('--type requires hub, diagram, explainer, or deck.');
      }
      index += 1;
    } else if (value.startsWith('--')) {
      throw new Error(`Unknown option: ${value}.`);
    } else {
      paths.push({ path: value, ...(nextType && { type: nextType }) });
      nextType = undefined;
    }
  }
  if (nextType) throw new Error('--type must precede an HTML path.');
  return { paths, denylist };
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.exitCode = await runRenderQaCli();
}
