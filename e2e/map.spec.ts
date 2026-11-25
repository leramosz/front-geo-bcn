import { expect, test } from '@playwright/test';
import { FOUNTAINS, TOTAL, mockApi } from './mockApi';
import { mapState, setView, waitForMap } from './helpers';

test.describe('KAN-6 · ver las fuentes en un mapa', () => {
  // CA4
  test('CA4 · mapa inicial centrado en Barcelona con las 1.760 fuentes', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await waitForMap(page);

    await expect(page.getByTestId('count')).toHaveText('1.760 fuentes');
    expect(TOTAL).toBe(1760);
    const { lat, lng } = await mapState(page);
    expect(lat).toBeGreaterThan(41.35);
    expect(lat).toBeLessThan(41.45);
    expect(lng).toBeGreaterThan(2.1);
    expect(lng).toBeLessThan(2.2);
  });

  // CA5
  test('CA5 · agrupa al alejar y separa en marcadores al acercar', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await waitForMap(page);
    await expect(page.getByTestId('count')).toHaveText('1.760 fuentes');

    const clusters = page.locator('.marker-cluster');
    await expect(clusters.first()).toBeVisible();
    const label = (await clusters.first().innerText()).trim();
    expect(Number(label)).toBeGreaterThan(1);

    // Acercar al máximo sobre una fuente: los grupos se separan en marcadores individuales.
    const f = FOUNTAINS[0];
    await setView(page, f.location.latitude, f.location.longitude, 19);
    await expect(page.locator('.fountain-marker').first()).toBeVisible();
  });

  // CA6
  test.describe('móvil 390x844', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('CA6 · el mapa ocupa el ancho, sin scroll horizontal y con gestos táctiles', async ({ page }) => {
      await mockApi(page);
      await page.goto('/');
      await waitForMap(page);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const box = await page.getByTestId('map').boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(389);

      // Gestos activos: arrastre, pellizco y doble toque.
      const enabled = await page.evaluate(() => {
        const m = (window as unknown as { __map: Record<string, { enabled(): boolean }> }).__map;
        return { drag: m.dragging.enabled(), pinch: m.touchZoom.enabled(), tap: m.doubleClickZoom.enabled() };
      });
      expect(enabled).toEqual({ drag: true, pinch: true, tap: true });

      // Zoom real: doble toque en un punto vacío del mapa.
      const before = (await mapState(page)).zoom;
      await page.getByTestId('map').dblclick({ position: { x: 195, y: 400 } });
      await expect.poll(async () => (await mapState(page)).zoom).toBeGreaterThan(before);
    });
  });

  // CA7
  test('CA7 · error de carga: mapa base, mensaje y botón de reintentar', async ({ page }) => {
    await mockApi(page, { listStatus: 503 });
    await page.goto('/');
    await waitForMap(page);

    await expect(page.getByText('No se han podido cargar las fuentes')).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    const retry = page.getByRole('button', { name: 'Reintentar' });
    await expect(retry).toBeVisible();

    // Al reintentar con la API de nuevo disponible, se cargan las fuentes.
    await page.unroute(/\/geo-bcn\/v2\/drinking-water-fountains(\?.*)?$/);
    await mockApi(page);
    await retry.click();
    await expect(page.getByTestId('count')).toHaveText('1.760 fuentes');
    await expect(page.getByText('No se han podido cargar las fuentes')).toBeHidden();
  });
});
