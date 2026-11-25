import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Fountain } from '../api/types';
import { BCN_CENTER, toCard, toLatLng } from '../domain/fountain';
import type { LatLon } from '../domain/geo';

export interface FountainMapProps {
  fountains: Fountain[];
  selected: Fountain | null;
  userPosition: LatLon | null;
  /** Se invoca al pulsar un punto vacío del mapa. */
  onMapClick: (point: LatLon) => void;
  onSelect: (fountain: Fountain) => void;
  /** Cambia cuando hay que encajar el mapa en las fuentes visibles (cambio de filtro). */
  fitKey: string;
}

/** Radio (px) dentro del cual las fuentes se agrupan (CA5: 40 px). */
export const CLUSTER_RADIUS_PX = 40;

const dropIcon = L.divIcon({
  className: 'fountain-marker',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function FountainMap({ fountains, selected, userPosition, onMapClick, onSelect, fitKey }: FountainMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const userLayer = useRef<L.CircleMarker | null>(null);
  const callbacks = useRef({ onMapClick, onSelect });
  callbacks.current = { onMapClick, onSelect };

  useEffect(() => {
    if (!container.current || map.current) return;
    const m = L.map(container.current, { center: BCN_CENTER, zoom: 13, zoomControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    const group = L.markerClusterGroup({
      maxClusterRadius: CLUSTER_RADIUS_PX,
      showCoverageOnHover: false,
      chunkedLoading: true,
    });
    m.addLayer(group);
    m.on('click', (e: L.LeafletMouseEvent) =>
      callbacks.current.onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng }),
    );
    map.current = m;
    cluster.current = group;
    // Gancho solo para desarrollo y e2e: permite inspeccionar zoom y centro.
    if (import.meta.env.DEV) (window as unknown as { __map?: L.Map }).__map = m;
    return () => {
      m.remove();
      map.current = null;
      cluster.current = null;
    };
  }, []);

  useEffect(() => {
    const group = cluster.current;
    if (!group) return;
    group.clearLayers();
    group.addLayers(
      fountains.map((f) => {
        const marker = L.marker(toLatLng(f), {
          icon: dropIcon,
          title: toCard(f).name,
          alt: `Fuente ${f.id}`,
          keyboard: true,
        });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          callbacks.current.onSelect(f);
        });
        (marker as L.Marker & { fountainId?: string }).fountainId = f.id;
        return marker;
      }),
    );
  }, [fountains]);

  useEffect(() => {
    const m = map.current;
    if (!m || fountains.length === 0) return;
    if (fitKey === 'all') {
      m.setView(BCN_CENTER, 13);
    } else {
      m.fitBounds(L.latLngBounds(fountains.map(toLatLng)), { padding: [40, 40], maxZoom: 17 });
    }
    // Solo al cambiar de filtro, no con cada recarga de datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, fountains.length > 0]);

  useEffect(() => {
    const m = map.current;
    if (!m || !selected) return;
    m.setView(toLatLng(selected), Math.max(m.getZoom(), 17), { animate: false });
  }, [selected]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    userLayer.current?.remove();
    userLayer.current = null;
    if (userPosition) {
      userLayer.current = L.circleMarker([userPosition.lat, userPosition.lon], {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: '#1a73e8',
        fillOpacity: 1,
      })
        .bindTooltip('Tu posición')
        .addTo(m);
      m.panTo([userPosition.lat, userPosition.lon], { animate: false });
    }
  }, [userPosition]);

  return <div ref={container} className="map" data-testid="map" role="application" aria-label="Mapa de fuentes" />;
}
