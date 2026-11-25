const EARTH_RADIUS_M = 6_371_008.8;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Distancia del círculo máximo en metros (haversine). */
export function distanceMeters(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Umbral para recalcular "cerca de mí" cuando cambia la posición. */
export const RECALC_THRESHOLD_M = 50;

export function movedEnough(prev: LatLon | null, next: LatLon, threshold = RECALC_THRESHOLD_M): boolean {
  return prev == null || distanceMeters(prev, next) > threshold;
}

/** Orden estable por distancia y luego por id, como el keyset de la API. */
export function sortByDistance<T extends { id: string; distance?: number }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.id.localeCompare(b.id),
  );
}
