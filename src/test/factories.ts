import type { Fountain } from '../api/types';

export function fountain(over: Partial<Fountain> = {}): Fountain {
  return {
    id: '01-004',
    name: 'Sant Carles',
    status: 'UNKNOWN',
    address: { street: 'C COMTE DE SANTA CLARA', street_number: '11', formatted: 'C COMTE DE SANTA CLARA, 11' },
    location: { latitude: 41.379145587, longitude: 2.18896495 },
    district: { id: '01', name: 'Ciutat Vella' },
    neighbourhood: { id: '03', name: 'la Barceloneta' },
    ...over,
  };
}

export function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } });
}
