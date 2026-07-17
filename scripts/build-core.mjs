import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import * as sass from 'sass';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dist = resolve(root, 'dist');
export const staticDir = resolve(root, 'src/static');
export const stylesEntry = resolve(root, 'src/scss/main.scss');
export const scriptsEntry = resolve(root, 'src/ts/main.ts');

export async function assertAssets(): Promise<void> {
  await access(resolve(dist, 'assets'), constants.R_OK);
}

export async function syncStaticFiles(): Promise<void> {
  await mkdir(dist, { recursive: true });
  await Promise.all([
    copyFile(resolve(staticDir, 'index.html'), resolve(dist, 'index.html')),
    copyFile(resolve(root, 'menu.json'), resolve(dist, 'menu.json')),
    writeFile(resolve(dist, '.nojekyll'), '')
  ]);
}

export async function compileStyles(): Promise<void> {
  const stylesheet = sass.compile(stylesEntry, {
    style: 'expanded',
    loadPaths: [resolve(root, 'src/scss')],
    sourceMap: false
  });

  await writeFile(resolve(dist, 'app.css'), stylesheet.css);
}

export async function bundleScripts(): Promise<void> {
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [scriptsEntry],
    outfile: resolve(dist, 'app.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'none',
    sourcemap: false,
    minify: false,
    logLevel: 'info'
  });
}

export async function buildAll(): Promise<void> {
  await mkdir(dist, { recursive: true });
  await assertAssets();
  await Promise.all([
    syncStaticFiles(),
    compileStyles(),
    bundleScripts()
  ]);
}
