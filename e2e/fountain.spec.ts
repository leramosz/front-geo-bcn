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

  test('CA4 · la ficha es un popup anclado sobre el marcador, con la flechita apuntando a él', async ({ page }) => {
    await openSantCarles(page);
    const popup = page.locator('.fountain-popup');
    await expect(popup).toBeVisible();
    await expect(popup.getByTestId('fountain-sheet')).toBeVisible();

    const marker = (await page.locator('.leaflet-marker-icon.selected').boundingBox())!;
    const tip = (await popup.locator('.leaflet-popup-tip').boundingBox())!;
    const box = (await popup.locator('.leaflet-popup-content-wrapper').boundingBox())!;
    const markerCenterX = marker.x + marker.width / 2;
    // La ficha queda por encima del marcador y su flechita está sobre él.
    expect(box.y + box.height).toBeLessThanOrEqual(marker.y + 2);
    expect(Math.abs(tip.x + tip.width / 2 - markerCenterX)).toBeLessThan(6);
  });

  test('CA4 · el marcador seleccionado cambia de color y los demás no', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await waitForMap(page);
    await expect(page.getByTestId('count')).toHaveText('1.760 fuentes');
    await setView(page, santCarles.location.latitude, santCarles.location.longitude, 19);

    const color = (selector: string) =>
      page.locator(selector).first().locator('span').evaluate((el) => getComputedStyle(el).backgroundColor);
    const normal = await color('.leaflet-marker-icon.fountain-marker:not(.selected)');

    await page.locator('.leaflet-marker-icon[title="Sant Carles"]').first().click();
    await expect(page.locator('.leaflet-marker-icon.selected')).toHaveCount(1);
    const selected = await color('.leaflet-marker-icon.selected');
    expect(selected).not.toBe(normal);

    // Al cerrar la ficha el marcador recupera su color.
    await page.getByRole('button', { name: 'Cerrar ficha' }).click();
    await expect(page.locator('.leaflet-marker-icon.selected')).toHaveCount(0);
    await expect(page.locator('.leaflet-marker-icon[title="Sant Carles"]').first().locator('span')).toHaveCSS('background-color', normal);
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
