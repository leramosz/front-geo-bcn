import { useCallback, useEffect, useState } from 'react';
import { useClient } from '../api/ClientContext';
import type { AreaFilter } from '../api/client';
import type { Fountain } from '../api/types';
import { sanitizeFountains } from '../domain/fountain';

export type LoadState =
  | { status: 'loading'; fountains: Fountain[]; loadedKey: string }
  | { status: 'ready'; fountains: Fountain[]; loadedKey: string }
  | { status: 'error'; fountains: Fountain[]; loadedKey: string };

/** Clave del filtro con el que se cargó el conjunto actual ('all' si no hay filtro). */
export const filterKey = (f: AreaFilter) => f.neighbourhoodId || f.districtId || 'all';

/** Carga las fuentes del filtro activo (o todas) y permite reintentar. */
export function useFountains(filter: AreaFilter) {
  const client = useClient();
  const [state, setState] = useState<LoadState>({ status: 'loading', fountains: [], loadedKey: 'all' });
  const [attempt, setAttempt] = useState(0);
  const { districtId, neighbourhoodId } = filter;

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ status: 'loading', fountains: s.fountains, loadedKey: s.loadedKey }));
    client
      .listFountains({ districtId, neighbourhoodId }, ctrl.signal)
      .then((items) => {
        const { valid, rejected } = sanitizeFountains(items);
        if (rejected.length > 0) console.warn('[geo-bcn] fuentes descartadas', rejected);
        setState({ status: 'ready', fountains: valid, loadedKey: filterKey({ districtId, neighbourhoodId }) });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        console.error('[geo-bcn] error al cargar las fuentes', err);
        setState((s) => ({ status: 'error', fountains: [], loadedKey: s.loadedKey }));
      });
    return () => ctrl.abort();
  }, [client, districtId, neighbourhoodId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
