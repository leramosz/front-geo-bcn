import { useEffect, useState } from 'react';
import { useClient } from '../api/ClientContext';
import type { DistrictWithNeighbourhoods } from '../api/types';

export function useDistricts() {
  const client = useClient();
  const [districts, setDistricts] = useState<DistrictWithNeighbourhoods[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    client
      .listDistricts(ctrl.signal)
      .then((items) => setDistricts([...items].sort((a, b) => a.id.localeCompare(b.id))))
      .catch((err: unknown) => {
        if (!ctrl.signal.aborted) console.error('[geo-bcn] error al cargar los distritos', err);
      });
    return () => ctrl.abort();
  }, [client]);
  return districts;
}
