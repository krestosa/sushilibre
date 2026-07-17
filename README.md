# Sushi Libre

Sitio estático y responsive para la experiencia Sushi Libre de SushiClub Puerto Madero.

La fuente mantenible vive en Sass y TypeScript. El proceso de build genera la distribución estática en `dist/`.

## Estructura

- `src/scss/components/`: estilos del hero, dock de reserva y menú.
- `src/scss/breakpoints/`: reglas separadas por viewport y orientación.
- `src/ts/features/`: countdown, layout del dock, sheen, scroll y loop de video.
- `src/ts/menu/`: contrato, carga, render y observadores del menú.
- `tests/menu-contract.test.mjs`: validación de categorías y valores del menú.
- `dist/`: salida local del build; no se versiona.

`index.html` funciona como plantilla. Sass genera `app.css` y TypeScript genera `app.js`.

## Desarrollo

Requiere Node.js 22.

```bash
npm install
npm run typecheck
npm run build
npm test
```

Para servir el build:

```bash
node scripts/serve.mjs
```

La vista queda disponible en `http://127.0.0.1:4173`.

## Integración continua

`.github/workflows/build.yml` ejecuta typecheck, compilación y validación del menú. En cada push a `refactor/sass-typescript`, GitHub Actions publica `app.css` y `app.js` en la raíz de la rama utilizada por GitHub Pages. También conserva `dist/` como artifact de compilación.
