import { createReadStream, watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import {
  buildAll,
  bundleScripts,
  compileStyles,
  dist,
  root,
  syncStaticFiles
} from './build-core.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const clients = new Set();
const pendingChanges = new Set();
const watchers = [];
let rebuildTimer = null;

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webm', 'video/webm']
]);

const liveReloadClient = `
<script data-sushilibre-dev>
(() => {
  const events = new EventSource('/__dev/events');
  events.addEventListener('css', () => {
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const url = new URL(link.href);
      url.searchParams.set('dev', Date.now().toString());
      link.href = url.href;
    });
  });
  events.addEventListener('reload', () => window.location.reload());
})();
</script>`;

function broadcast(event) {
  const payload = `event: ${event}\ndata: ${Date.now()}\n\n`;
  clients.forEach((response) => response.write(payload));
}

async function rebuild() {
  const changes = [...pendingChanges];
  pendingChanges.clear();
  rebuildTimer = null;

  const rebuildEverything = changes.some((path) => path === '*');
  const stylesChanged = rebuildEverything || changes.some((path) => path.endsWith('.scss'));
  const scriptsChanged = rebuildEverything || changes.some((path) => path.endsWith('.ts'));
  const staticChanged = rebuildEverything || changes.some((path) =>
    path.startsWith('static/') || path === 'menu.json'
  );

  try {
    if (rebuildEverything) {
      await buildAll();
    } else {
      const tasks = [];
      if (stylesChanged) tasks.push(compileStyles());
      if (scriptsChanged) tasks.push(bundleScripts());
      if (staticChanged) tasks.push(syncStaticFiles());
      await Promise.all(tasks);
    }

    const changedLabel = changes.join(', ') || 'unknown';
    console.log(`[dev] rebuilt: ${changedLabel}`);

    if (scriptsChanged || staticChanged || rebuildEverything) {
      broadcast('reload');
    } else if (stylesChanged) {
      broadcast('css');
    }
  } catch (error) {
    console.error('[dev] rebuild failed');
    console.error(error);
  }
}

function scheduleRebuild(path = '*') {
  pendingChanges.add(path.replaceAll('\\', '/'));
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(rebuild, 80);
}

function watchPath(path, prefix = '') {
  const watcher = watch(path, { recursive: true }, (_eventType, filename) => {
    const normalized = filename ? `${prefix}${String(filename)}` : '*';
    scheduleRebuild(normalized);
  });
  watchers.push(watcher);
}

await buildAll();

watchPath(resolve(root, 'src'));
watchPath(resolve(root, 'menu.json'), 'menu.json');

try {
  const assetWatcher = watch(resolve(dist, 'assets'), { recursive: true }, () => {
    console.log('[dev] asset changed');
    broadcast('reload');
  });
  watchers.push(assetWatcher);
} catch (error) {
  console.warn('[dev] assets watcher unavailable', error);
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);

  if (requestUrl.pathname === '/__dev/events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    response.write('event: connected\ndata: ready\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }

  const requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = resolve(dist, `.${decodeURIComponent(requestedPath)}`);
  const insideDist = filePath === dist || filePath.startsWith(`${dist}${sep}`);

  if (!insideDist) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Forbidden');
    return;
  }

  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) throw new Error('Not a file');

    const extension = extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extension) || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });

    if (extension === '.html') {
      const html = await readFile(filePath, 'utf8');
      response.end(html.replace('</body>', `${liveReloadClient}\n</body>`));
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Sushi Libre dev server: http://${host}:${port}`);
  console.log('SCSS updates are injected; TypeScript and static changes reload the page.');
});

function shutdown() {
  watchers.forEach((watcher) => watcher.close());
  clients.forEach((response) => response.end());
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
