import type { Page } from '@playwright/test';

interface MapState {
  lat: number;
  lng: number;
  zoom: number;
}

export const mapState = (page: Page): Promise<MapState> =>
  page.evaluate(() => {
    const m = (window as unknown as { __map: { getCenter(): { lat: number; lng: number }; getZoom(): number } }).__map;
    const c = m.getCenter();
    return { lat: c.lat, lng: c.lng, zoom: m.getZoom() };
  });

export const setView = (page: Page, lat: number, lng: number, zoom: number) =>
  page.evaluate(
    ([a, b, z]) =>
      (window as unknown as { __map: { setView(c: [number, number], z: number, o: object): void } }).__map.setView(
        [a, b],
        z,
        { animate: false },
      ),
    [lat, lng, zoom] as const,
  );

/** Espera a que el contador muestre el total y el mapa esté montado. */
export const waitForMap = async (page: Page) => {
  await page.getByTestId('map').waitFor();
  await page.waitForFunction(() => Boolean((window as unknown as { __map?: unknown }).__map));
};

/** Simula la denegación del permiso de ubicación (determinista en cualquier navegador). */
export const denyGeolocation = (page: Page) =>
  page.addInitScript(() => {
    const denied = {
      getCurrentPosition: (_ok: unknown, err: (e: object) => void) => err({ code: 1, PERMISSION_DENIED: 1, message: 'denied' }),
      watchPosition: (_ok: unknown, err: (e: object) => void) => {
        setTimeout(() => err({ code: 1, PERMISSION_DENIED: 1, message: 'denied' }), 0);
        return 1;
      },
      clearWatch: () => {},
    };
    Object.defineProperty(navigator, 'geolocation', { value: denied, configurable: true });
  });
