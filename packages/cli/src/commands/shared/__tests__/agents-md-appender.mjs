// Real-process regression harness: pause only the first successful target read.
import * as fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const [modulePath, root, target] = process.argv.slice(2);
const { upsertAgentsMdSection } = await import(pathToFileURL(modulePath).href);
const canonicalTarget = await fs.realpath(target);
let paused = false;
const result = await upsertAgentsMdSection(
  root,
  'tools',
  '## Tool Packs\n- workflows',
  {
    fileSystem: {
      ...fs,
      readFile: async (...args) => {
        const content = await fs.readFile(...args);
        if (args[0] === canonicalTarget && !paused) {
          paused = true;
          await new Promise((resolve) => {
            process.once('message', resolve);
            process.send({ status: 'ready' });
          });
        }
        return content;
      },
    },
  },
);
process.send({ status: 'result', result });
process.disconnect();
