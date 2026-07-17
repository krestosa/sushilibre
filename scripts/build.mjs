import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import * as sass from 'sass';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

await mkdir(dist, { recursive: true });
await cp(resolve(root, 'assets'), resolve(dist, 'assets'), { recursive: true });
await cp(resolve(root, 'menu.json'), resolve(dist, 'menu.json'));

const html = await readFile(resolve(root, 'index.html'), 'utf8');
await writeFile(resolve(dist, 'index.html'), html);

const stylesheet = sass.compile(resolve(root, 'src/scss/main.scss'), {
  style: 'expanded',
  loadPaths: [resolve(root, 'src/scss')],
  sourceMap: false
});
await writeFile(resolve(dist, 'styles.css'), stylesheet.css);

await esbuild.build({
  absWorkingDir: root,
  entryPoints: {
    script: 'src/ts/script.ts',
    'dock-visibility': 'src/ts/dock-visibility.ts',
    menu: 'src/ts/menu.ts',
    'menu-layout-adjustments': 'src/ts/menu-layout-adjustments.ts'
  },
  outdir: dist,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  entryNames: '[name]',
  legalComments: 'none',
  sourcemap: false,
  minify: false,
  logLevel: 'info'
});
