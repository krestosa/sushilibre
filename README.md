# Sushi Libre

Sitio estático y responsive para la experiencia Sushi Libre de SushiClub Puerto Madero.

La fuente mantenible vive en Sass y TypeScript. `dist/` es la distribución estática completa y contiene todo lo necesario para ejecutar el sitio.

## Estructura

- `src/scss/breakpoints/_desktop.scss`: estilos completos de hero, dock y menú; constituye la base heredable.
- `src/scss/breakpoints/_tablet.scss`: modificaciones heredadas para tablet.
- `src/scss/breakpoints/_mobile.scss`: modificaciones finales para mobile.
- `src/scss/components/`: únicamente unidades reutilizables y acotadas, como botón, countdown y chips.
- `src/ts/`: fuente TypeScript organizada por responsabilidades.
- `src/static/index.html`: plantilla HTML de producción; el bloque `#menu-data` se genera durante build.
- `menu.json`: única fuente editable de datos del menú.
- `dist/assets/`: única ubicación de imágenes, videos y archivos gráficos.
- `dist/`: sitio estático final con HTML, CSS, JavaScript, JSON y assets.
- `tests/menu-contract.test.mjs`: validación de categorías, valores y sincronización del menú embebido.
- `tests/style-contract.test.mjs`: validación integral de selectores y declaraciones compiladas.

`src/scss/main.scss` carga desktop, luego tablet y finalmente mobile. No existe una capa separada de secciones: toda la estructura visual vive dentro de esos tres breakpoints. Las reglas de accesibilidad y capacidades del navegador se aplican después sin introducir breakpoints adicionales.

La raíz del repositorio redirige a `dist/`, que es también la ruta publicada por GitHub Pages.

## Desarrollo

Requiere Node.js 22.

```bash
npm install
npm run dev
```

El servidor queda disponible en `http://127.0.0.1:4173`.

Durante `npm run dev`:

- los cambios de SCSS se recompilan y se aplican sin recargar la página;
- los cambios de TypeScript se recompilan y recargan la página automáticamente;
- cada cambio en `menu.json` regenera `dist/menu.json` y el `<script id="menu-data" type="application/json">` de `dist/index.html`, y luego recarga la página;
- los cambios de la plantilla o los assets recargan la página automáticamente.

## Build estático

```bash
npm run typecheck
npm run clean
npm run build
npm test
npm run serve
```

`npm run build` valida `menu.json`, lo copia a `dist/menu.json` y genera desde ese mismo contenido el fallback JSON embebido en `dist/index.html`.

`npm run clean` elimina solamente los archivos generados y preserva `dist/assets/`.

## Integración continua

`.github/workflows/build.yml` valida TypeScript, compila la distribución, verifica los contratos del menú y de estilos, publica `dist/` como artifact y actualiza los archivos estáticos versionados de `dist/`. Los assets se conservan únicamente en `dist/assets/`.
