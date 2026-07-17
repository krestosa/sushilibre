# Sushi Libre

Sitio estático y responsive para la experiencia Sushi Libre de SushiClub Puerto Madero.

La migración conserva el HTML, los assets, el contenido del menú, los valores visuales y el comportamiento observable de la rama `design/video-hero-sticky-countdown`. Las fuentes mantenibles viven en Sass y TypeScript; el build genera una distribución estática en `dist/`.

## Estructura

- `src/scss/components/`: estilos del hero, dock de reserva y menú.
- `src/scss/breakpoints/`: reglas separadas por viewport y orientación.
- `src/ts/features/`: countdown, layout del dock, sheen, scroll y loop de video.
- `src/ts/menu/`: contrato, carga, render y observadores del menú.
- `tests/`: contrato inmutable del menú y smoke tests responsive.
- `dist/`: salida generada; no se versiona.

Los archivos CSS y JavaScript de la raíz se mantienen como snapshot funcional para apertura directa. El artefacto de producción se compila exclusivamente desde `src/`.

## Desarrollo

Requiere Node.js 22.

```bash
npm install
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:visual
```

Para servir el build:

```bash
node scripts/serve.mjs
```

La vista queda disponible en `http://127.0.0.1:4173`.

## Integración continua

`.github/workflows/build.yml` ejecuta typecheck, compilación Sass/TypeScript, validación exacta de categorías y valores del menú, y pruebas de navegador en escritorio y móvil. El directorio `dist/` se publica como artifact cuando todas las verificaciones pasan.

## Imagen de fondo

La imagen fotográfica de fondo está adaptada de una fotografía editorial publicada por The Modern House en su artículo Timberyard. El layout, la tipografía, el tratamiento de color y los overlays son implementación original del proyecto.
