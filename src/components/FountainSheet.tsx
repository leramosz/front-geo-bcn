import type { Fountain } from '../api/types';
import { toCard } from '../domain/fountain';
import { formatDistance } from '../domain/fountain';

interface Props {
  fountain: Fountain;
  onClose: () => void;
}

/** Ficha de una fuente. Nunca muestra campos vacíos ni "null" (ver toCard). */
export function FountainSheet({ fountain, onClose }: Props) {
  const card = toCard(fountain);
  return (
    <aside className="sheet-card" role="dialog" aria-label={`Ficha de ${card.name}`} data-testid="fountain-sheet">
      <header>
        <h2>{card.name}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar ficha">
          ×
        </button>
      </header>
      <dl>
        <dt>Código</dt>
        <dd>{card.id}</dd>
        <dt>Dirección</dt>
        <dd data-testid="sheet-address">{card.address}</dd>
        <dt>Barrio</dt>
        <dd>{card.neighbourhood}</dd>
        <dt>Distrito</dt>
        <dd>{card.district}</dd>
        <dt>Estado</dt>
        <dd data-testid="sheet-status">{card.status}</dd>
        {fountain.distance != null && (
          <>
            <dt>Distancia</dt>
            <dd>{formatDistance(fountain.distance)}</dd>
          </>
        )}
      </dl>
      <a className="btn primary" href={card.directionsUrl} target="_blank" rel="noopener noreferrer">
        Cómo llegar
      </a>
    </aside>
  );
}
