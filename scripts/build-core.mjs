import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
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
export const menuSource = resolve(root, 'menu.json');
export const staticIndexTemplate = resolve(staticDir, 'index.html');

const MENU_SCRIPT_PATTERN = /(<script\b(?=[^>]*\bid=["']menu-data["'])(?=[^>]*\btype=["']application\/json["'])[^>]*>)[\s\S]*?(<\/script>)/i;

export async function assertAssets() {
  await access(resolve(dist, 'assets'), constants.R_OK);
}

export function embedMenuData(template, menuData) {
  if (!MENU_SCRIPT_PATTERN.test(template)) {
    throw new Error('Static HTML template is missing #menu-data application/json script.');
  }

  const serialized = JSON.stringify(menuData, null, 2)
    .replaceAll('<', '\\u003c')
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  return template.replace(
    MENU_SCRIPT_PATTERN,
    (_match, openingTag, closingTag) => `${openingTag}\n${serialized}\n  ${closingTag}`
  );
}

export async function readMenuSource() {
  const rawMenu = await readFile(menuSource, 'utf8');

  try {
    return {
      rawMenu,
      menuData: JSON.parse(rawMenu)
    };
  } catch (error) {
    throw new SyntaxError(`menu.json contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function syncStaticFiles() {
  await mkdir(dist, { recursive: true });

  const [template, { rawMenu, menuData }] = await Promise.all([
    readFile(staticIndexTemplate, 'utf8'),
    readMenuSource()
  ]);
  const generatedHtml = embedMenuData(template, menuData);

  await Promise.all([
    writeFile(resolve(dist, 'index.html'), generatedHtml),
    writeFile(resolve(dist, 'menu.json'), rawMenu),
    writeFile(resolve(dist, '.nojekyll'), '')
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
