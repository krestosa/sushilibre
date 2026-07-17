import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import * as sass from 'sass';
import { parseMenuSource, renderStaticHtml } from './menu-html.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dist = resolve(root, 'dist');
export const staticDir = resolve(root, 'src/static');
export const stylesEntry = resolve(root, 'src/scss/main.scss');
export const scriptsEntry = resolve(root, 'src/ts/main.ts');
export const menuSource = resolve(root, 'menu.json');
export const staticIndexTemplate = resolve(staticDir, 'index.html');

export async function assertAssets() {
  await access(resolve(dist, 'assets'), constants.R_OK);
}

export async function readMenuSource() {
  const rawMenu = await readFile(menuSource, 'utf8');
  return parseMenuSource(rawMenu);
}

export async function syncStaticFiles() {
  await mkdir(dist, { recursive: true });

  const [template, menu] = await Promise.all([
    readFile(staticIndexTemplate, 'utf8'),
    readMenuSource()
  ]);
  const generatedHtml = renderStaticHtml(template, menu);

  await Promise.all([
    writeFile(resolve(dist, 'index.html'), generatedHtml),
    writeFile(resolve(dist, '.nojekyll'), ''),
    rm(resolve(dist, 'menu.json'), { force: true })
  ]);
}

export async function compileStyles() {
  const stylesheet = sass.compile(stylesEntry, {
    style: 'expanded',
    loadPaths: [resolve(root, 'src/scss')],
    sourceMap: false
  });

  await writeFile(resolve(dist, 'app.css'), stylesheet.css);
}

export async function bundleScripts() {
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

export async function buildAll() {
  await mkdir(dist, { recursive: true });
  await assertAssets();
  await Promise.all([
    syncStaticFiles(),
    compileStyles(),
    bundleScripts()
  ]);
}
