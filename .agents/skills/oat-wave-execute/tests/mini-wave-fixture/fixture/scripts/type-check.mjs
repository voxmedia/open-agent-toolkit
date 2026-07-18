import { existsSync } from 'node:fs';

for (const path of [
  '.oat/sync/manifest.json',
  'src/alpha.txt',
  'src/beta.txt',
  'src/finale.txt',
]) {
  if (!existsSync(path)) {
    console.error(`FIXTURE_TYPECHECK status=failed missing=${path}`);
    process.exit(1);
  }
}

console.log('FIXTURE_TYPECHECK status=passed');
