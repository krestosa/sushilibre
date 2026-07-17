# Sushi Libre

Sitio estático y responsive para la experiencia Sushi Libre de SushiClub Puerto Madero.

La fuente mantenible vive en Sass y TypeScript. El proceso de build compila los estilos y scripts y genera una distribución estática en `dist/`.

## Estructura

- `src/scss/components/`: estilos del hero, dock de reserva y menú.
- `src/scss/breakpoints/`: reglas separadas por viewport y orientación.
- `src/ts/features/`: countdown, layout del dock, sheen, scroll y loop de video.
- `src/ts/menu/`: contrato, carga, render y observadores del menú.
- `tests/menu-contract.test.mjs`: validación inmutable de categorías y valores del menú.
- `dist/`: salida generada; no se versiona.

`index.html` funciona como plantilla del build. Los archivos CSS y JavaScript finales se generan exclusivamente desde `src/` dentro de `dist/`.

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

`.github/workflows/build.yml` ejecuta typecheck, compilación Sass/TypeScript y validación exacta de categorías y valores del menú. El directorio `dist/` se publica como artifact cuando todas las verificaciones pasan.
