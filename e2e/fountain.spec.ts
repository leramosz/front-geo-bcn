import { expect, test } from '@playwright/test';
import { FOUNTAINS, mockApi } from './mockApi';
import { mapState, setView, waitForMap } from './helpers';

const santCarles = FOUNTAINS.find((f) => f.id === '01-004')!;

async function openSantCarles(page: import('@playwright/test').Page) {
  await mockApi(page);
  await page.goto('/');
  await waitForMap(page);
  await expect(page.getByTestId('count')).toHaveText('1.760 fuentes');
  await setView(page, santCarles.location.latitude, santCarles.location.longitude, 19);
  await page.locator('.leaflet-marker-icon[title="Sant Carles"]').first().click();
}

test.describe('KAN-7 · ficha de una fuente', () => {
  // CA4
  test('CA4 · al tocar el marcador se abre la ficha con sus datos', async ({ page }) => {
    await openSantCarles(page);
    const sheet = page.getByTestId('fountain-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Sant Carles' })).toBeVisible();
    await expect(sheet.getByTestId('sheet-address')).toHaveText('C COMTE DE SANTA CLARA, 11');
    await expect(sheet).toContainText('la Barceloneta');
    await expect(sheet).toContainText('Ciutat Vella');
    await expect(sheet.getByTestId('sheet-status')).toHaveText('No disponible');
  });

  // CA5
  test('CA5 · cerrar con el botón o tocando fuera conserva posición y zoom', async ({ page }) => {
    await openSantCarles(page);
    await expect(page.getByTestId('fountain-sheet')).toBeVisible();
    const before = await mapState(page);

    await page.getByRole('button', { name: 'Cerrar ficha' }).click();
    await expect(page.getByTestId('fountain-sheet')).toBeHidden();
    expect(await mapState(page)).toEqual(before);

    await page.locator('.leaflet-marker-icon[title="Sant Carles"]').first().click();
    await expect(page.getByTestId('fountain-sheet')).toBeVisible();
    const box = (await page.getByTestId('map').boundingBox())!;
    await page.mouse.click(box.x + box.width - 80, box.y + 120);
    await expect(page.getByTestId('fountain-sheet')).toBeHidden();
    expect(await mapState(page)).toEqual(before);
  });

  // CA6
  test('CA6 · "Cómo llegar" abre la app de mapas con destino en las coordenadas', async ({ page, context }) => {
    await context.route('https://www.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));
    await openSantCarles(page);
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Cómo llegar' }).click();
    const popup = await popupPromise;
    const url = new URL(popup.url());
    expect(url.hostname).toBe('www.google.com');
    expect(url.pathname).toBe('/maps/dir/');
    expect(url.searchParams.get('destination')).toBe(`${santCarles.location.latitude},${santCarles.location.longitude}`);
  });
});
