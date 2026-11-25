import { fountain, jsonResponse } from '../test/factories';
import { ApiError, InvalidSearchError, createClient, nearbyPath } from './client';

const problem = (status: number, detail: string, names: string[] = []) =>
  jsonResponse(
    { type: '/problems/invalid-parameter', title: 'Invalid parameter', status, detail, invalid_params: names.map((name) => ({ name, reason: 'inválido' })) },
    status,
    'application/problem+json',
  );

describe('KAN-8 · búsqueda por cercanía', () => {
  // CA2 radio y límite
  it('envía lat, lon, radius y limit', () => {
    const url = new URL(nearbyPath({ lat: 41.3851, lon: 2.1734, radius: 500, limit: 10 }), 'http://x');
    expect(url.pathname).toBe('/geo-bcn/v2/drinking-water-fountains');
    expect(Object.fromEntries(url.searchParams)).toEqual({ lat: '41.3851', lon: '2.1734', radius: '500', limit: '10' });
  });

  it('combina la cercanía con el filtro de distrito y barrio (KAN-9 CA9)', () => {
    const url = new URL(nearbyPath({ lat: 41.38, lon: 2.18, districtId: '01', neighbourhoodId: '03' }), 'http://x');
    expect(url.searchParams.get('district_id')).toBe('01');
    expect(url.searchParams.get('neighbourhood_id')).toBe('03');
  });

  // CA3 parámetros inválidos
  it.each([
    ['lat', { lat: 91, lon: 2 }],
    ['lat', { lat: -90.1, lon: 2 }],
    ['lon', { lat: 41, lon: 180.5 }],
    ['radius', { lat: 41, lon: 2, radius: 0 }],
    ['radius', { lat: 41, lon: 2, radius: -5 }],
  ])('rechaza %s fuera de rango sin llamar a la API', async (param, q) => {
    const fetchFn = vi.fn();
    const client = createClient(fetchFn);
    await expect(client.nearby(q)).rejects.toMatchObject({ name: 'InvalidSearchError', param });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(new InvalidSearchError(param, 'x')).toBeInstanceOf(Error);
  });

  it('expone el parámetro erróneo del Problem JSON cuando la API responde 400', async () => {
    const client = createClient(async () => problem(400, 'lon is required', ['lon']));
    const err = await client.nearby({ lat: 41, lon: 2 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.invalidParams).toEqual(['lon']);
  });

  // CA4 sin resultados
  it('devuelve una lista vacía (no un error) si no hay fuentes en el radio', async () => {
    const client = createClient(async () => jsonResponse({ self: '/x', items: [] }));
    await expect(client.nearby({ lat: 48.85, lon: 2.35 })).resolves.toEqual({ items: [], next: undefined });
  });

  it('devuelve el link next cuando hay más páginas', async () => {
    const client = createClient(async () => jsonResponse({ self: '/x', next: '/geo-bcn/v2/next', items: [fountain({ distance: 5 })] }));
    const { items, next } = await client.nearby({ lat: 41.38, lon: 2.17 });
    expect(items).toHaveLength(1);
    expect(next).toBe('/geo-bcn/v2/next');
  });
});

describe('KAN-7 · ficha por id', () => {
  // CA2 fuente inexistente
  it('convierte el 404 en un ApiError con su Problem JSON', async () => {
    const client = createClient(async () =>
      jsonResponse({ type: '/problems/not-found', title: 'Not found', status: 404, detail: 'No existe' }, 404, 'application/problem+json'),
    );
    const err = await client.getFountain('99-999').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.isNotFound).toBe(true);
    expect(err.problem?.title).toBe('Not found');
  });

  it('pide la fuente por su id', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(fountain()));
    await createClient(fetchFn).getFountain('01-004');
    expect(fetchFn.mock.calls[0][0]).toBe('/geo-bcn/v2/drinking-water-fountains/01-004');
  });
});

describe('KAN-6 · carga del mapa', () => {
  it('pide limit=2000 y sigue los links next hasta agotarlos', async () => {
    const calls: string[] = [];
    const client = createClient(async (input) => {
      const path = String(input);
      calls.push(path);
      return path.includes('cursor=')
        ? jsonResponse({ self: path, items: [fountain({ id: '01-002' })] })
        : jsonResponse({ self: path, next: '/geo-bcn/v2/drinking-water-fountains?limit=2000&cursor=abc', items: [fountain({ id: '01-001' })] });
    });
    const all = await client.listFountains();
    expect(all.map((f) => f.id)).toEqual(['01-001', '01-002']);
    expect(calls[0]).toContain('limit=2000');
    expect(calls).toHaveLength(2);
  });

  // CA7 error de carga (parte unitaria: el error se propaga)
  it('propaga un 5xx como ApiError', async () => {
    const client = createClient(async () => new Response('boom', { status: 503 }));
    await expect(client.listFountains()).rejects.toMatchObject({ name: 'ApiError', status: 503 });
  });
});

describe('KAN-9 · filtros y catálogo', () => {
  // CA1 / CA2
  it('filtra por district_id y neighbourhood_id', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ self: "/x", items: [] }));
    await createClient(fetchFn).listFountains({ districtId: '01', neighbourhoodId: '03' });
    const url = new URL(String(fetchFn.mock.calls[0][0]), 'http://x');
    expect(url.searchParams.get('district_id')).toBe('01');
    expect(url.searchParams.get('neighbourhood_id')).toBe('03');
  });

  // CA3 / CA4
  it('muestra el 400 de barrio de otro distrito o código inexistente', async () => {
    const client = createClient(async () => problem(400, 'neighbourhood_id does not belong to district_id', ['neighbourhood_id']));
    const err = await client.listFountains({ districtId: '01', neighbourhoodId: '40' }).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.invalidParams).toEqual(['neighbourhood_id']);
  });

  // CA5 catálogo
  it('lee los distritos con sus barrios', async () => {
    const items = [{ id: '01', name: 'Ciutat Vella', neighbourhoods: [{ id: '03', name: 'la Barceloneta' }] }];
    const districts = await createClient(async () => jsonResponse({ items })).listDistricts();
    expect(districts).toEqual(items);
  });
});
