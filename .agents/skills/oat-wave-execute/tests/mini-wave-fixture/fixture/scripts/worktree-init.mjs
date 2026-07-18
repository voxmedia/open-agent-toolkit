import { mkdirSync } from 'node:fs';

mkdirSync('.oat/sync', { recursive: true });
console.log('FIXTURE_INIT status=passed');
