# Sushi Libre

Sitio estático y responsive para la experiencia Sushi Libre de SushiClub Puerto Madero.

La fuente mantenible vive en Sass y TypeScript. `dist/` es la distribución estática completa y contiene todo lo necesario para ejecutar el sitio.

## Estructura

- `src/scss/`: fuente Sass organizada por componentes y breakpoints.
- `src/ts/`: fuente TypeScript organizada por responsabilidades.
- `src/static/index.html`: plantilla HTML de producción.
- `menu.json`: fuente de datos del menú.
- `dist/assets/`: única ubicación de imágenes, videos y archivos gráficos.
- `dist/`: sitio estático final con HTML, CSS, JavaScript, JSON y assets.
- `tests/menu-contract.test.mjs`: validación de categorías y valores del menú.

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
- los cambios de la plantilla, el menú o los assets recargan la página automáticamente.

## Build estático

```bash
npm run typecheck
npm run clean
npm run build
npm test
npm run serve
```

`npm run clean` elimina solamente los archivos generados y preserva `dist/assets/`.

## Integración continua

`.github/workflows/build.yml` valida TypeScript, compila la distribución, verifica el contrato del menú, publica `dist/` como artifact y actualiza los archivos estáticos versionados de `dist/`. Los assets se conservan únicamente en `dist/assets/`.
