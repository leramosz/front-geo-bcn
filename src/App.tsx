import { useCallback, useMemo, useState } from 'react';
import type { Fountain } from './api/types';
import { MAX_RADIUS, DEFAULT_RADIUS } from './api/client';
import { FilterBar, areaName, type AreaSelection } from './components/FilterBar';
import { FountainSheet } from './components/FountainSheet';
import { NearbyPanel } from './components/NearbyPanel';
import { fountainsLabel } from './domain/fountain';
import type { LatLon } from './domain/geo';
import { useDistricts } from './hooks/useDistricts';
import { useFountains } from './hooks/useFountains';
import { useGeolocation } from './hooks/useGeolocation';
import { useNearby } from './hooks/useNearby';
import { FountainMap } from './map/FountainMap';

const NO_FILTER: AreaSelection = { districtId: '', neighbourhoodId: '' };
const RADII = [DEFAULT_RADIUS, 1000, 2000, MAX_RADIUS];

export default function App() {
  const [area, setArea] = useState<AreaSelection>(NO_FILTER);
  const [selected, setSelected] = useState<Fountain | null>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [manualOrigin, setManualOrigin] = useState<LatLon | null>(null);
  const [radiusIdx, setRadiusIdx] = useState(0);

  const districts = useDistricts();
  const filter = useMemo(
    () => ({ districtId: area.districtId || undefined, neighbourhoodId: area.neighbourhoodId || undefined }),
    [area],
  );
  const data = useFountains(filter);
  const geo = useGeolocation(nearbyOpen);

  const located = geo.status === 'located' ? geo.position : null;
  // La posición real manda; el punto tocado en el mapa solo se usa sin permiso de ubicación.
  const origin = located ?? manualOrigin;
  const radius = RADII[radiusIdx];
  const nearby = useNearby(nearbyOpen ? origin : null, radius, filter);

  const handleMapClick = useCallback(
    (point: LatLon) => {
      if (nearbyOpen && !located) setManualOrigin(point);
      else setSelected(null);
    },
    [nearbyOpen, located],
  );

  const toggleNearby = () => {
    if (nearbyOpen) {
      setNearbyOpen(false);
      return;
    }
    setNearbyOpen(true);
    setRadiusIdx(0);
    setManualOrigin(null);
  };

  const area_ = areaName(districts, area);
    const loadedCount = data.fountains.length;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Fuentes BCN</h1>
        <FilterBar districts={districts} value={area} onChange={(v) => { setArea(v); setSelected(null); }} />
        <button type="button" className="btn primary" aria-pressed={nearbyOpen} onClick={toggleNearby}>
          Cerca de mí
        </button>
        <p className="count" role="status" data-testid="count">
          {data.status === 'loading' && loadedCount === 0 ? 'Cargando…' : fountainsLabel(loadedCount, area_)}
        </p>
      </header>

      <main className="stage">
        <FountainMap
          fountains={data.fountains}
          selected={selected}
          userPosition={nearbyOpen ? origin : null}
          onMapClick={handleMapClick}
          onSelect={setSelected}
          fitKey={data.loadedKey}
        />

        {data.status === 'error' && (
          <div className="banner" role="alert">
            <span>No se han podido cargar las fuentes</span>
            <button type="button" className="btn" onClick={data.retry}>
              Reintentar
            </button>
          </div>
        )}

        {nearbyOpen && (
          <NearbyPanel
            geo={geo}
            hasOrigin={origin != null}
            result={nearby}
            radius={radius}
            onWiden={() => setRadiusIdx((i) => Math.min(i + 1, RADII.length - 1))}
            onPick={setSelected}
            onClose={() => setNearbyOpen(false)}
          />
        )}
        {selected && <FountainSheet fountain={selected} onClose={() => setSelected(null)} />}
      </main>
    </div>
  );
}
