import type { DistrictList, Fountain, FountainPage, Problem } from './types';

export const API_BASE = '/geo-bcn/v2';
export const MAX_LIMIT = 2000;
export const DEFAULT_RADIUS = 500;
export const MAX_RADIUS = 5000;

/** Error HTTP de la API con su cuerpo Problem JSON (RFC 9457) cuando lo hay. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem | null,
  ) {
    super(problem?.detail ?? problem?.title ?? `HTTP ${status}`);
    this.name = 'ApiError';
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** Nombres de los parámetros rechazados (invalid_params del Problem). */
  get invalidParams(): string[] {
    return this.problem?.invalid_params?.map((p) => p.name) ?? [];
  }
}

/** Error de validación en cliente: se evita llamar a la API con parámetros fuera de rango. */
export class InvalidSearchError extends Error {
  constructor(readonly param: string, reason: string) {
    super(`${param}: ${reason}`);
    this.name = 'InvalidSearchError';
  }
}

export interface AreaFilter {
  districtId?: string;
  neighbourhoodId?: string;
}

export interface NearbyQuery extends AreaFilter {
  lat: number;
  lon: number;
  radius?: number;
  limit?: number;
}

type Fetch = typeof fetch;

async function request<T>(fetchFn: Fetch, path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetchFn(path, { headers: { Accept: 'application/json' }, signal });
  if (!res.ok) {
    let problem: Problem | null = null;
    const type = res.headers.get('Content-Type') ?? '';
    if (type.includes('json')) {
      try {
        problem = (await res.json()) as Problem;
      } catch {
        problem = null;
      }
    }
    throw new ApiError(res.status, problem);
  }
  return (await res.json()) as T;
}

function areaParams(params: URLSearchParams, filter: AreaFilter) {
  if (filter.districtId) params.set('district_id', filter.districtId);
  if (filter.neighbourhoodId) params.set('neighbourhood_id', filter.neighbourhoodId);
}

export function validateNearby(q: NearbyQuery): void {
  if (!Number.isFinite(q.lat) || q.lat < -90 || q.lat > 90) {
    throw new InvalidSearchError('lat', 'debe estar entre -90 y 90');
  }
  if (!Number.isFinite(q.lon) || q.lon < -180 || q.lon > 180) {
    throw new InvalidSearchError('lon', 'debe estar entre -180 y 180');
  }
  const radius = q.radius ?? DEFAULT_RADIUS;
  if (!Number.isInteger(radius) || radius <= 0 || radius > MAX_RADIUS) {
    throw new InvalidSearchError('radius', `debe ser un entero entre 1 y ${MAX_RADIUS}`);
  }
}

export function nearbyPath(q: NearbyQuery): string {
  validateNearby(q);
  const params = new URLSearchParams({
    lat: String(q.lat),
    lon: String(q.lon),
    radius: String(q.radius ?? DEFAULT_RADIUS),
    limit: String(q.limit ?? 10),
  });
  areaParams(params, q);
  return `${API_BASE}/drinking-water-fountains?${params}`;
}

export function listPath(filter: AreaFilter = {}): string {
  const params = new URLSearchParams({ limit: String(MAX_LIMIT) });
  areaParams(params, filter);
  return `${API_BASE}/drinking-water-fountains?${params}`;
}

/** Los links de paginación son referencias de path absoluto; se resuelven contra el mismo origen. */
function followable(link: string): string {
  return link.startsWith('/') ? link : `${API_BASE}/${link}`;
}

export function createClient(fetchFn: Fetch = (...args) => fetch(...args)) {
  return {
    /** Todas las fuentes que cumplen el filtro, siguiendo los links `next`. */
    async listFountains(filter: AreaFilter = {}, signal?: AbortSignal): Promise<Fountain[]> {
      const all: Fountain[] = [];
      let path: string | undefined = listPath(filter);
      // Tope de páginas para no entrar en bucle si el back devolviera siempre `next`.
      for (let i = 0; path && i < 50; i++) {
        const page: FountainPage = await request<FountainPage>(fetchFn, path, signal);
        all.push(...page.items);
        path = page.next ? followable(page.next) : undefined;
      }
      return all;
    },

    /** Fuentes cercanas, ordenadas por distancia, con el link a la página siguiente. */
    async nearby(q: NearbyQuery, signal?: AbortSignal): Promise<{ items: Fountain[]; next?: string }> {
      const page = await request<FountainPage>(fetchFn, nearbyPath(q), signal);
      return { items: page.items, next: page.next };
    },

    getFountain(id: string, signal?: AbortSignal): Promise<Fountain> {
      return request<Fountain>(fetchFn, `${API_BASE}/drinking-water-fountains/${encodeURIComponent(id)}`, signal);
    },

    async listDistricts(signal?: AbortSignal) {
      const list = await request<DistrictList>(fetchFn, `${API_BASE}/districts`, signal);
      return list.items;
    },
  };
}

export type GeoBcnClient = ReturnType<typeof createClient>;
