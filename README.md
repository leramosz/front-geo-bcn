# front-geo-bcn

Web de fuentes de agua potable de Barcelona (KAN-5, épico KAN-1). Mapa con las 1.760 fuentes, ficha de cada una, "Cerca de mí" (geolocalización, ordenadas por distancia) y filtro por distrito y barrio.

Stack: React 18 + Vite + TypeScript, Leaflet + markercluster sobre OpenStreetMap, Vitest y Playwright.

## Arranque

Requisitos: Node 20+ y el back [ms-geo-bcn](https://github.com/leramosz/api-geo-bcn) en `http://localhost:8080` (contrato v2 en `api-geo-bcn`).

```bash
npm install
cp .env.example .env     # GEO_BCN_API_TARGET y GEO_BCN_API_KEY (por defecto dev-api-key)
npm run dev              # http://localhost:5173
```

El servidor de Vite hace de proxy de `/geo-bcn/v2` hacia el back y añade la cabecera `X-Api-Key`, de modo que la clave no viaja en el bundle ni hay problemas de CORS. Para un despliegue estático hace falta un proxy equivalente (o CORS en la API).

## Tests

```bash
npm test            # unitarios (Vitest + Testing Library)
npm run test:e2e    # e2e (Playwright, Chromium); la API se simula con las 1.760 fuentes reales
npm run typecheck
```

Los e2e no necesitan back ni red: `e2e/mockApi.ts` simula la API v2 sobre `e2e/fixtures/fountains.json`, generado desde `data/fonts_beure_2026.csv` con `npm run fixtures`. La primera vez: `npx playwright install chromium`.

Cada test indica la historia y el criterio de aceptación de Jira que cubre (por ejemplo `KAN-8 · CA5`).

## Estructura

- `src/api`: cliente de la API v2 y tipos del contrato. Valida lat/lon/radius en cliente, sigue los links `next` y convierte los errores en `ApiError` con su Problem JSON.
- `src/domain`: lógica pura (ficha, GeoJSON, distancias, descarte de fuentes sin coordenadas).
- `src/hooks`: carga de fuentes, distritos, geolocalización (recalcula solo si te mueves más de 50 m) y cercanía.
- `src/map`, `src/components`: mapa Leaflet con agrupación a 40 px, ficha, lista cercana y filtros.

## Decisiones

- El estado `UNKNOWN` (el dataset no trae estado) se muestra como "No disponible".
- Sin permiso de ubicación, "Cerca de mí" calcula desde el punto que se toque en el mapa.
- "Cómo llegar" usa un enlace universal de Google Maps con destino en las coordenadas, en modo a pie.
- Los marcadores se cargan en una sola petición (`limit=2000`) y se agrupan en el cliente.
