import L from 'leaflet';

/** Color del marcador normal y del seleccionado (ver styles.css). */
export const MARKER_CLASS = 'fountain-marker';
export const SELECTED_CLASS = 'selected';

/** Marcador en gota; el seleccionado lleva la clase `selected` y cambia de color. */
export function markerIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: selected ? `${MARKER_CLASS} ${SELECTED_CLASS}` : MARKER_CLASS,
    html: '<span></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });
}
