import { useEffect, useState } from 'react';
import { useClient } from '../api/ClientContext';
import type { AreaFilter } from '../api/client';
import type { Fountain } from '../api/types';
import { sortByDistance, type LatLon } from '../domain/geo';

export type NearbyResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; items: Fountain[] }
  | { status: 'error' };

export const NEARBY_LIMIT = 10;

export function useNearby(origin: LatLon | null, radius: number, filter: AreaFilter): NearbyResult {
  const client = useClient();
  const [result, setResult] = useState<NearbyResult>({ status: 'idle' });
  const { districtId, neighbourhoodId } = filter;
  const lat = origin?.lat;
  const lon = origin?.lon;

  useEffect(() => {
    if (lat == null || lon == null) {
      setResult({ status: 'idle' });
      return;
    }
    const ctrl = new AbortController();
    setResult({ status: 'loading' });
    client
      .nearby({ lat, lon, radius, limit: NEARBY_LIMIT, districtId, neighbourhoodId }, ctrl.signal)
      .then(({ items }) => setResult({ status: 'ready', items: sortByDistance(items) }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        console.error('[geo-bcn] error en cerca de mí', err);
        setResult({ status: 'error' });
      });
    return () => ctrl.abort();
  }, [client, lat, lon, radius, districtId, neighbourhoodId]);

  return result;
}
