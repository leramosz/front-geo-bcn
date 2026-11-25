import { expect, test, type Page } from '@playwright/test';
import { FOUNTAINS, distanceMeters, mockApi } from './mockApi';
import { denyGeolocation, mapState, waitForMap } from './helpers';

const PLACA_CATALUNYA = { latitude: 41.3851, longitude: 2.1734 };
// Mar frente a la Barceloneta: sin fuentes a menos de 500 m.
const MAR = { latitude: 41.365, longitude: 2.215 };

async function start(page: Page) {
  const api = await mockApi(page);
  await page.goto('/');
  await waitForMap(page);
  await expect(page.getByTestId('count')).toHaveText('1.760 fuentes');
  return api;
}

const distances = (page: Page) =>
  page
    .getByTestId('nearby-panel')
    .locator('.distance')
    .allInnerTexts()
    .then((t) => t.map((s) => Number(s.replace(/[^\d]/g, ''))));

test.describe('KAN-8 · fuentes cerca de mí', () => {
  test.describe('con permiso de ubicación', () => {
    test.use({ geolocation: PLACA_CATALUNYA, permissions: ['geolocation'] });

    // CA5
    test('CA5 · lista de hasta 10 fuentes ordenadas por distancia y mi posición en el mapa', async ({ page }) => {
      await start(page);
      await page.getByRole('button', { name: 'Cerca de mí' }).click();

      const items = page.getByTestId('nearby-panel').getByRole('listitem');
      await expect(items).toHaveCount(10);
      const d = await distances(page);
      expect(d).toEqual([...d].sort((a, b) => a - b));
      expect(d.every((n) => n > 0)).toBe(true);
      await expect(items.first()).toContainText(/\d+ m/);
      await expect(page.locator('.leaflet-overlay-pane path.leaflet-interactive')).toHaveCount(1);
    });

    // CA8
    test('CA8 · elegir la primera centra el mapa en ella y abre su ficha', async ({ page }) => {
      await start(page);
      await page.getByRole('button', { name: 'Cerca de mí' }).click();
      const first = page.getByTestId('nearby-panel').getByRole('listitem').first();
      await expect(first).toBeVisible();
      const name = (await first.locator('strong').innerText()).trim();
      await first.getByRole('button').click();

      const sheet = page.getByTestId('fountain-sheet');
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('heading')).toHaveText(name);
      const { lat, lng, zoom } = await mapState(page);
      const nearest = FOUNTAINS.filter((f) => (f.name ?? 'Fuente sin nombre') === name)
        .map((f) => distanceMeters(lat, lng, f.location.latitude, f.location.longitude))
        .sort((a, b) => a - b)[0];
      expect(nearest).toBeLessThan(5);
      expect(zoom).toBeGreaterThanOrEqual(17);
    });

    // CA9
    test('CA9 · la lista se recalcula y reordena si me muevo más de 50 m', async ({ page, context }) => {
      await start(page);
      await page.getByRole('button', { name: 'Cerca de mí' }).click();
      await expect(page.getByTestId('nearby-panel').getByRole('listitem')).toHaveCount(10);
      const before = await distances(page);

      // ~20 m: por debajo del umbral, no recalcula.
      await context.setGeolocation({ latitude: 41.38528, longitude: 2.1734 });
      await page.waitForTimeout(400);
      expect(await distances(page)).toEqual(before);

      // ~700 m al norte: recalcula.
      await context.setGeolocation({ latitude: 41.3913, longitude: 2.1734 });
      await expect.poll(() => distances(page)).not.toEqual(before);
      const after = await distances(page);
      expect(after).toEqual([...after].sort((a, b) => a - b));
    });
  });

  // CA6
  test('CA6 · sin permiso muestra el aviso y calcula desde el punto tocado', async ({ page }) => {
    await denyGeolocation(page);
    await start(page);
    await page.getByRole('button', { name: 'Cerca de mí' }).click();
    await expect(page.getByText('Activa la ubicación o toca un punto del mapa')).toBeVisible();

    const box = (await page.getByTestId('map').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const items = page.getByTestId('nearby-panel').getByRole('listitem');
    await expect(items.first()).toBeVisible();
    const d = await distances(page);
    expect(d).toEqual([...d].sort((a, b) => a - b));
    await expect(page.getByText('Activa la ubicación o toca un punto del mapa')).toBeHidden();
  });

  // CA7
  test.describe('sin fuentes cerca', () => {
    test.use({ geolocation: MAR, permissions: ['geolocation'] });

    test('CA7 · avisa de que no hay fuentes a menos de 500 m y permite ampliar el radio', async ({ page }) => {
      const api = await start(page);
      await page.getByRole('button', { name: 'Cerca de mí' }).click();
      await expect(page.getByText('No hay fuentes a menos de 500 m')).toBeVisible();

      await page.getByRole('button', { name: 'Ampliar radio' }).click();
      await expect.poll(() => api.requests.at(-1)?.searchParams.get('radius')).toBe('1000');
      await expect(page.getByText('No hay fuentes a menos de 500 m')).toBeHidden();
    });
  });
});
