import type { Fountain } from '../api/types';

export const NOT_AVAILABLE = 'No disponible';
export const UNNAMED = 'Fuente sin nombre';

/** Límites holgados del término municipal de Barcelona (WGS84). */
export const BCN_BOUNDS = { minLat: 41.31, maxLat: 41.48, minLon: 2.05, maxLon: 2.24 } as const;
export const BCN_CENTER: [number, number] = [41.3926, 2.1640];

export interface Rejected {
  id: string;
  reason: 'sin-coordenadas' | 'fuera-de-barcelona';
}

function hasCoordinates(f: Fountain): boolean {
  const loc = f.location;
  return (
    loc != null &&
    typeof loc.latitude === 'number' &&
    typeof loc.longitude === 'number' &&
    Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude)
  );
}

function insideBarcelona(f: Fountain): boolean {
  const { latitude, longitude } = f.location;
  return (
    latitude >= BCN_BOUNDS.minLat &&
    latitude <= BCN_BOUNDS.maxLat &&
    longitude >= BCN_BOUNDS.minLon &&
    longitude <= BCN_BOUNDS.maxLon
  );
}

/**
 * Descarta las fuentes sin coordenadas o fuera de Barcelona sin romper la carga,
 * y las devuelve como rechazadas para poder registrarlas.
 */
export function sanitizeFountains(input: Fountain[]): { valid: Fountain[]; rejected: Rejected[] } {
  const valid: Fountain[] = [];
  const rejected: Rejected[] = [];
  for (const f of input) {
    if (!hasCoordinates(f)) rejected.push({ id: f.id, reason: 'sin-coordenadas' });
    else if (!insideBarcelona(f)) rejected.push({ id: f.id, reason: 'fuera-de-barcelona' });
    else valid.push(f);
  }
  return { valid, rejected };
}

export interface PointFeature {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Omit<Fountain, 'id' | 'location'>;
}

/** GeoJSON (RFC 7946): las coordenadas van en orden [lon, lat]. */
export function toFeature(f: Fountain): PointFeature {
  const { id, location, ...properties } = f;
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [location.longitude, location.latitude] },
    properties,
  };
}

/** Leaflet usa el orden contrario: [lat, lon]. */
export function toLatLng(f: Fountain): [number, number] {
  return [f.location.latitude, f.location.longitude];
}

export function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'OPERATIONAL':
      return 'En funcionamiento';
    case 'OUT_OF_SERVICE':
      return 'Fuera de servicio';
    default:
      // UNKNOWN, null o un valor nuevo del enum.
      return NOT_AVAILABLE;
  }
}

function clean(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = value.trim();
  return v === '' || v.toLowerCase() === 'null' || v.toUpperCase() === 'SN' ? null : v;
}

export function formatAddress(f: Pick<Fountain, 'address'>): string {
  const street = clean(f.address?.street);
  const number = clean(f.address?.street_number);
  if (!street) return clean(f.address?.formatted) ?? NOT_AVAILABLE;
  return number ? `${street}, ${number}` : street;
}

export interface FountainCard {
  id: string;
  name: string;
  address: string;
  neighbourhood: string;
  district: string;
  status: string;
  latitude: number;
  longitude: number;
  directionsUrl: string;
}

/** Modelo de la ficha: nunca devuelve campos vacíos ni "null". */
export function toCard(f: Fountain): FountainCard {
  return {
    id: f.id,
    name: clean(f.name) ?? UNNAMED,
    address: formatAddress(f),
    neighbourhood: clean(f.neighbourhood?.name) ?? NOT_AVAILABLE,
    district: clean(f.district?.name) ?? NOT_AVAILABLE,
    status: statusLabel(f.status),
    latitude: f.location.latitude,
    longitude: f.location.longitude,
    directionsUrl: directionsUrl(f.location.latitude, f.location.longitude),
  };
}

/**
 * Enlace universal de Google Maps: abre la app de mapas en Android e iOS (si está
 * instalada) y la web en escritorio, con destino y modo a pie.
 */
export function directionsUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${lat},${lon}`,
    travelmode: 'walking',
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

/** 1760 -> "1.760". Intl en es-ES no agrupa números de 4 cifras, así que se fuerza. */
export function formatCount(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function fountainsLabel(n: number, area?: string): string {
  const noun = n === 1 ? 'fuente' : 'fuentes';
  return area ? `${formatCount(n)} ${noun} en ${area}` : `${formatCount(n)} ${noun}`;
}

export function formatDistance(meters: number): string {
  return `${formatCount(Math.round(meters))} m`;
}
