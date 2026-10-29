import { build, preview } from 'vite';
import assert from 'node:assert/strict';

// Não toca no dist principal nem depende de uma conta ou hospedagem remota.
process.env.VITE_BASE_PATH = '/finance-hub/';
const outDir = '.tools/subdirectory-build';
await build({ build: { outDir } });
const server = await preview({
  build: { outDir },
  preview: { host: '127.0.0.1', port: 4177, strictPort: true },
});
try {
  const origin = 'http://127.0.0.1:4177';
  const root = origin + '/finance-hub/';
  const page = await fetch(root);
  assert.equal(page.status, 200);
  const html = await page.text();
  const paths = [...html.matchAll(/(?:src|href)="([^\"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith('/finance-hub/'));
  assert(paths.length >= 5);
  for (const path of paths) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    if (path.endsWith('.js')) assert.match(response.headers.get('content-type'), /javascript/);
    if (path.endsWith('.css')) assert.match(response.headers.get('content-type'), /css/);
  }
  const manifest = await (await fetch(root + 'manifest.webmanifest')).json();
  assert.equal(manifest.start_url, '/finance-hub/');
  assert.equal(manifest.scope, '/finance-hub/');
  assert.equal(manifest.lang, 'pt-BR');
  for (const icon of manifest.icons) assert.equal((await fetch(root + icon.src)).status, 200);
  const worker = await fetch(root + 'sw.js');
  assert.equal(worker.status, 200);
  assert.match(worker.headers.get('content-type'), /javascript/);
  console.log(
    'Static subdirectory check passed: HTML, scripts, CSS, icons, manifest, service worker.',
  );
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}
