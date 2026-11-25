import { markerIcon } from './icons';

describe('KAN-6 · marcadores', () => {
  it('el marcador normal no lleva la clase selected', () => {
    expect(markerIcon(false).options.className).toBe('fountain-marker');
  });

  it('el marcador seleccionado se distingue con la clase selected', () => {
    expect(markerIcon(true).options.className).toBe('fountain-marker selected');
  });

  it('ancla el icono por la punta de la gota para que el popup apunte a la fuente', () => {
    const { iconSize, iconAnchor, popupAnchor } = markerIcon(false).options;
    expect(iconAnchor).toEqual([11, 22]);
    expect(iconSize).toEqual([22, 22]);
    expect(popupAnchor).toEqual([0, -22]);
  });
});
