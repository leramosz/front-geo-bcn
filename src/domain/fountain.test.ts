import { fountain } from '../test/factories';
import {
  directionsUrl,
  formatCount,
  formatDistance,
  fountainsLabel,
  sanitizeFountains,
  statusLabel,
  toCard,
  toFeature,
} from './fountain';

describe('KAN-6 · mapa', () => {
  // CA2 coordenadas válidas
  it('convierte a GeoJSON Point con coordinates [lon, lat]', () => {
    const f = fountain({ location: { latitude: 41.379145587, longitude: 2.18896495 } });
    const feature = toFeature(f);
    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [2.18896495, 41.379145587] });
    expect(feature.id).toBe('01-004');
  });

  // CA3 sin coordenadas o fuera de Barcelona
  it('descarta sin romper la carga las fuentes sin coordenadas o fuera de Barcelona', () => {
    const ok = fountain({ id: '01-001' });
    const noLat = fountain({ id: '01-002', location: { latitude: NaN, longitude: 2.18 } });
    const noLocation = fountain({ id: '01-003', location: undefined as never });
    const far = fountain({ id: '01-005', location: { latitude: 48.8566, longitude: 2.3522 } });

    const { valid, rejected } = sanitizeFountains([ok, noLat, noLocation, far]);

    expect(valid.map((f) => f.id)).toEqual(['01-001']);
    expect(rejected).toEqual([
      { id: '01-002', reason: 'sin-coordenadas' },
      { id: '01-003', reason: 'sin-coordenadas' },
      { id: '01-005', reason: 'fuera-de-barcelona' },
    ]);
  });

  it('formatea el total con separador de miles', () => {
    expect(formatCount(1760)).toBe('1.760');
    expect(fountainsLabel(1760)).toBe('1.760 fuentes');
    expect(fountainsLabel(1, 'la Barceloneta')).toBe('1 fuente en la Barceloneta');
  });
});

describe('KAN-7 · ficha', () => {
  // CA1 contenido de la ficha
  it('compone la ficha con nombre, dirección, barrio, distrito y coordenadas', () => {
    const card = toCard(fountain());
    expect(card).toMatchObject({
      id: '01-004',
      name: 'Sant Carles',
      address: 'C COMTE DE SANTA CLARA, 11',
      neighbourhood: 'la Barceloneta',
      district: 'Ciutat Vella',
      latitude: 41.379145587,
      longitude: 2.18896495,
    });
  });

  // CA3 datos ausentes
  it('muestra solo la calle sin número y el estado como "No disponible"', () => {
    const card = toCard(
      fountain({
        address: { street: 'C COMTE DE SANTA CLARA', street_number: null, formatted: 'C COMTE DE SANTA CLARA' },
        status: 'UNKNOWN',
      }),
    );
    expect(card.address).toBe('C COMTE DE SANTA CLARA');
    expect(card.status).toBe('No disponible');
  });

  it.each([null, '', '  ', 'SN', 'null'])('trata el número %j como ausente', (n) => {
    expect(toCard(fountain({ address: { street: 'C X', street_number: n, formatted: null } })).address).toBe('C X');
  });

  it('nunca devuelve campos vacíos ni "null"', () => {
    const card = toCard(
      fountain({
        name: null,
        address: { street: null, street_number: null, formatted: null },
        neighbourhood: null,
      }),
    );
    for (const value of [card.name, card.address, card.neighbourhood, card.district, card.status]) {
      expect(value).not.toBe('');
      expect(value).not.toMatch(/null/i);
    }
    expect(card.name).toBe('Fuente sin nombre');
  });

  it('un estado desconocido o futuro se muestra como "No disponible"', () => {
    expect(statusLabel('UNKNOWN')).toBe('No disponible');
    expect(statusLabel('ALGO_NUEVO')).toBe('No disponible');
    expect(statusLabel('OPERATIONAL')).toBe('En funcionamiento');
    expect(statusLabel('OUT_OF_SERVICE')).toBe('Fuera de servicio');
  });

  // CA6 cómo llegar (parte unitaria: la URL)
  it('construye el enlace de ruta con destino en las coordenadas', () => {
    const url = new URL(directionsUrl(41.379145587, 2.18896495));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('destination')).toBe('41.379145587,2.18896495');
  });
});

describe('KAN-8 · distancias', () => {
  it('muestra la distancia en metros enteros', () => {
    expect(formatDistance(44.6)).toBe('45 m');
    expect(formatDistance(1250)).toBe('1.250 m');
  });
});
