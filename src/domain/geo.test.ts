import { distanceMeters, movedEnough, sortByDistance } from './geo';

describe('KAN-8 · geo', () => {
  // CA1 orden por distancia
  it('ordena de menor a mayor distancia', () => {
    const items = [
      { id: 'a', distance: 120 },
      { id: 'b', distance: 45 },
      { id: 'c', distance: 300 },
    ];
    expect(sortByDistance(items).map((i) => i.distance)).toEqual([45, 120, 300]);
  });

  it('desempata por id y deja al final lo que no trae distancia', () => {
    const sorted = sortByDistance([{ id: 'z', distance: 10 }, { id: 'b' }, { id: 'a', distance: 10 }]);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'z', 'b']);
  });

  it('calcula la distancia haversine con precisión de metros', () => {
    // Plaça Catalunya -> Sagrada Família: ~2,1 km
    const d = distanceMeters({ lat: 41.3870, lon: 2.1700 }, { lat: 41.4036, lon: 2.1744 });
    expect(d).toBeGreaterThan(1800);
    expect(d).toBeLessThan(1900);
    expect(distanceMeters({ lat: 41.38, lon: 2.17 }, { lat: 41.38, lon: 2.17 })).toBe(0);
  });

  // CA9 cambio de posición > 50 m
  it('solo recalcula si la posición cambia más de 50 m', () => {
    const base = { lat: 41.3851, lon: 2.1734 };
    expect(movedEnough(null, base)).toBe(true);
    expect(movedEnough(base, { lat: 41.38514, lon: 2.1734 })).toBe(false); // ~4 m
    expect(movedEnough(base, { lat: 41.3857, lon: 2.1734 })).toBe(true); // ~67 m
  });
});
