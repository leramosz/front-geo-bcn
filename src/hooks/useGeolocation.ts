import { useEffect, useRef, useState } from 'react';
import { movedEnough, type LatLon } from '../domain/geo';

export type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'located'; position: LatLon };

/**
 * Sigue la posición mientras `active` es true. Solo publica una posición nueva cuando
 * se ha movido más del umbral (50 m), para no recalcular la lista con cada lectura del GPS.
 */
export function useGeolocation(active: boolean): GeoState {
  const [state, setState] = useState<GeoState>({ status: 'idle' });
  const last = useRef<LatLon | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable' });
      return;
    }
    last.current = null;
    setState({ status: 'locating' });
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (movedEnough(last.current, next)) {
          last.current = next;
          setState({ status: 'located', position: next });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          last.current = null;
          setState({ status: 'denied' });
        } else if (last.current == null) {
          // Un fallo transitorio (timeout, señal) no debe descartar una posición ya conocida.
          setState({ status: 'unavailable' });
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  return active ? state : { status: 'idle' };
}
