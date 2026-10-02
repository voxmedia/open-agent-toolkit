import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve('apps/oat-docs/out');
const basePath = '/open-agent-toolkit';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
      response.writeHead(404);
      response.end();
      return;
    }
    let target = resolve(root, `.${pathname.slice(basePath.length) || '/'}`);
    if (target !== root && !target.startsWith(root + sep)) {
      response.writeHead(400);
      response.end();
      return;
    }
    const details = await stat(target).catch(() => undefined);
    if (details?.isDirectory()) target = resolve(target, 'index.html');
    let status = 200;
    let bytes;
    try {
      bytes = await readFile(target);
    } catch {
      target = resolve(root, '404.html');
      status = 404;
      bytes = await readFile(target);
    }
    response.writeHead(status, {
      'Content-Type': pathname.endsWith('/api/search')
        ? 'application/json'
        : (types[extname(target)] ?? 'application/octet-stream'),
      'Cache-Control': 'no-store',
    });
    response.end(bytes);
  } catch {
    response.writeHead(400);
    response.end();
  }
});
server.listen(0, '127.0.0.1', () => {
  console.log(
    JSON.stringify({
      root,
      basePath,
      url: `http://127.0.0.1:${server.address().port}${basePath}/`,
    }),
  );
});
