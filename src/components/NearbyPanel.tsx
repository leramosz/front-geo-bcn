import type { Fountain } from '../api/types';
import { formatDistance, toCard } from '../domain/fountain';
import type { GeoState } from '../hooks/useGeolocation';
import type { NearbyResult } from '../hooks/useNearby';
import { MAX_RADIUS } from '../api/client';

interface Props {
  geo: GeoState;
  hasOrigin: boolean;
  result: NearbyResult;
  radius: number;
  onWiden: () => void;
  onPick: (fountain: Fountain) => void;
  onClose: () => void;
}

export function NearbyPanel({ geo, hasOrigin, result, radius, onWiden, onPick, onClose }: Props) {
  return (
    <section className="panel" aria-label="Fuentes cerca de mí" data-testid="nearby-panel">
      <header>
        <h2>Cerca de mí</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar lista">
          ×
        </button>
      </header>

      {!hasOrigin && geo.status === 'locating' && <p role="status">Buscando tu ubicación…</p>}
      {!hasOrigin && (geo.status === 'denied' || geo.status === 'unavailable') && (
        <p role="status">Activa la ubicación o toca un punto del mapa</p>
      )}

      {hasOrigin && result.status === 'loading' && <p role="status">Buscando fuentes…</p>}
      {hasOrigin && result.status === 'error' && (
        <p role="alert">No se han podido cargar las fuentes cercanas.</p>
      )}
      {hasOrigin && result.status === 'ready' && result.items.length === 0 && (
        <div role="status">
          <p>No hay fuentes a menos de {radius} m</p>
          {radius < MAX_RADIUS && (
            <button type="button" className="btn" onClick={onWiden}>
              Ampliar radio
            </button>
          )}
        </div>
      )}
      {hasOrigin && result.status === 'ready' && result.items.length > 0 && (
        <ol className="nearby-list">
          {result.items.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => onPick(f)}>
                <strong>{toCard(f).name}</strong>
                <span>{toCard(f).address}</span>
                <span className="distance">{f.distance != null ? formatDistance(f.distance) : ''}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
