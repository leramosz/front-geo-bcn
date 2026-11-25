import { expect, test, type Page } from '@playwright/test';
import { FOUNTAINS, mockApi } from './mockApi';
import { mapState, waitForMap } from './helpers';

const inDistrict = FOUNTAINS.filter((f) => f.district.id === '01').length;
const inBarceloneta = FOUNTAINS.filter((f) => f.district.id === '01' && f.neighbourhood?.id === '03').length;

async function start(page: Page) {
  const api = await mockApi(page);
  await page.goto('/');
  await waitForMap(page);
  await expect(page.getByTestId('count')).toHaveText('1.760 fuentes');
  return api;
}

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

test.describe('KAN-9 · filtrar por distrito o barrio', () => {
  // CA6
  test('CA6 · filtrar por distrito muestra su total y ajusta el mapa', async ({ page }) => {
    const api = await start(page);
    const before = await mapState(page);
    await page.getByLabel('Distrito').selectOption({ label: 'Ciutat Vella' });

    await expect(page.getByTestId('count')).toHaveText(`${fmt(inDistrict)} fuentes en Ciutat Vella`);
    expect(api.requests.at(-1)!.searchParams.get('district_id')).toBe('01');
    await expect.poll(async () => (await mapState(page)).zoom).toBeGreaterThan(before.zoom);
  });

  // CA7
  test('CA7 · el selector de barrios solo ofrece los del distrito y filtra por barrio', async ({ page }) => {
    const api = await start(page);
    await page.getByLabel('Distrito').selectOption({ label: 'Ciutat Vella' });
    await expect(page.getByTestId('count')).toContainText('Ciutat Vella');

    const offered = await page.getByLabel('Barrio').locator('option').allInnerTexts();
    expect(offered).toContain('la Barceloneta');
    expect(offered).toContain('el Raval');
    const outside = FOUNTAINS.filter((f) => f.district.id !== '01' && f.neighbourhood).map((f) => f.neighbourhood!.name);
    expect(offered.filter((o) => outside.includes(o) && o !== 'Todos')).toEqual([]);

    await page.getByLabel('Barrio').selectOption({ label: 'la Barceloneta' });
    await expect(page.getByTestId('count')).toHaveText(`${fmt(inBarceloneta)} fuentes en la Barceloneta`);
    expect(api.requests.at(-1)!.searchParams.get('neighbourhood_id')).toBe('03');
  });

  // CA8
  test('CA8 · "Quitar filtro" vuelve a las 1.760 fuentes', async ({ page }) => {
    await start(page);
    await page.getByLabel('Distrito').selectOption({ label: 'Ciutat Vella' });
    await expect(page.getByTestId('count')).toContainText('en Ciutat Vella');

    await page.getByRole('button', { name: 'Quitar filtro' }).click();
    await expect(page.getByTestId('count')).toHaveText('1.760 fuentes');
    await expect(page.getByRole('button', { name: 'Quitar filtro' })).toBeHidden();
  });

  // CA9
  test.describe('combinado con cerca de mí', () => {
    test.use({ geolocation: { latitude: 41.3805, longitude: 2.188 }, permissions: ['geolocation'] });

    test('CA9 · la lista solo incluye fuentes del barrio, ordenadas por distancia', async ({ page }) => {
      const api = await start(page);
      await page.getByLabel('Distrito').selectOption({ label: 'Ciutat Vella' });
      await page.getByLabel('Barrio').selectOption({ label: 'la Barceloneta' });
      await expect(page.getByTestId('count')).toContainText('la Barceloneta');

      await page.getByRole('button', { name: 'Cerca de mí' }).click();
      const items = page.getByTestId('nearby-panel').getByRole('listitem');
      await expect(items.first()).toBeVisible();

      const nearbyRequest = api.requests.filter((u) => u.searchParams.has('lat')).at(-1)!;
      expect(nearbyRequest.searchParams.get('district_id')).toBe('01');
      expect(nearbyRequest.searchParams.get('neighbourhood_id')).toBe('03');

      const barcelonetaNames = new Set(
        FOUNTAINS.filter((f) => f.neighbourhood?.id === '03' && f.district.id === '01').map((f) => f.name ?? 'Fuente sin nombre'),
      );
      for (const name of await items.locator('strong').allInnerTexts()) expect(barcelonetaNames.has(name)).toBe(true);
      const d = await items.locator('.distance').allInnerTexts().then((t) => t.map((s) => Number(s.replace(/\D/g, ''))));
      expect(d).toEqual([...d].sort((a, b) => a - b));
    });
  });
});
