import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

export interface F {
  id: string;
  name: string | null;
  status: string;
  address: { street: string | null; street_number: string | null; formatted: string | null };
  location: { latitude: number; longitude: number };
  district: { id: string; name: string };
  neighbourhood: { id: string; name: string } | null;
  distance?: number;
}

/** Las 1.760 fuentes reales de fonts_beure_2026.csv (ver scripts/build-fixture.mjs). */
export const FOUNTAINS: F[] = JSON.parse(
  readFileSync(new URL('./fixtures/fountains.json', import.meta.url), 'utf8'),
);

export const TOTAL = FOUNTAINS.length;

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
}

export function districts() {
  const map = new Map<string, { id: string; name: string; neighbourhoods: Map<string, string> }>();
  for (const f of FOUNTAINS) {
    const d = map.get(f.district.id) ?? { ...f.district, neighbourhoods: new Map() };
    if (f.neighbourhood) d.neighbourhoods.set(f.neighbourhood.id, f.neighbourhood.name);
    map.set(f.district.id, d);
  }
  return [...map.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => ({
      id: d.id,
      name: d.name,
      neighbourhoods: [...d.neighbourhoods].map(([id, name]) => ({ id, name })).sort((a, b) => a.id.localeCompare(b.id)),
    }));
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export interface MockOptions {
  /** Respuesta fija para el listado (por ejemplo, un 503). */
  listStatus?: number;
}

export interface MockApi {
  /** URLs pedidas al listado/cercanía, para comprobar los parámetros enviados. */
  requests: URL[];
}

/** Simula la API v2 (contrato de leramosz/api-geo-bcn) sobre las fuentes reales. */
export async function mockApi(page: Page, options: MockOptions = {}): Promise<MockApi> {
  const state: MockApi = { requests: [] };

  // Sin red real: teselas del mapa en blanco.
  const blankTile = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.route('https://tile.openstreetmap.org/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/png', body: blankTile }),
  );

  await page.route('**/geo-bcn/v2/districts', (r) => json(r, { items: districts() }));

  await page.route(/\/geo-bcn\/v2\/drinking-water-fountains\/[^/?]+$/, (r) => {
    const id = decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop()!);
    const f = FOUNTAINS.find((x) => x.id === id);
    return f
      ? json(r, f)
      : json(r, { type: '/problems/not-found', title: 'Not found', status: 404, detail: `No existe ${id}` }, 404);
  });

  await page.route(/\/geo-bcn\/v2\/drinking-water-fountains(\?.*)?$/, (r) => {
    const url = new URL(r.request().url());
    state.requests.push(url);
    if (options.listStatus) {
      return json(r, { type: 'about:blank', title: 'Service unavailable', status: options.listStatus }, options.listStatus);
    }
    const q = url.searchParams;
    const limit = Number(q.get('limit') ?? 50);
    let items = FOUNTAINS.filter(
      (f) =>
        (!q.get('district_id') || f.district.id === q.get('district_id')) &&
        (!q.get('neighbourhood_id') || f.neighbourhood?.id === q.get('neighbourhood_id')),
    );
    if (q.has('lat')) {
      const lat = Number(q.get('lat'));
      const lon = Number(q.get('lon'));
      const radius = Number(q.get('radius') ?? 500);
      items = items
        .map((f) => ({ ...f, distance: Math.round(distanceMeters(lat, lon, f.location.latitude, f.location.longitude)) }))
        .filter((f) => f.distance <= radius)
        .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
    }
    return json(r, { self: url.pathname + url.search, items: items.slice(0, limit) });
  });

  return state;
}
