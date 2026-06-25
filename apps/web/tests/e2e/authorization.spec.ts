import { expect, request, test } from '@playwright/test';

const email = process.env.SOLO_PEDIDOS_EMAIL;
const password = process.env.SOLO_PEDIDOS_PASSWORD;
const apiBaseUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3001';

test.describe('autorización del rol solo_pedidos', () => {
  test.skip(!email || !password, 'Requiere SOLO_PEDIDOS_EMAIL y SOLO_PEDIDOS_PASSWORD');

  test('limita navegación, vistas directas y API al permiso asignado', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.locator('input[name="email"]').fill(email!);
    await page.locator('input[name="password"]').fill(password!);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/Administrador\/pedidos/);
    await expect(page.getByText('Pedidos', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Usuarios', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Productos', { exact: true })).toHaveCount(0);

    await page.goto('/Administrador/usuarios');
    await expect(page).toHaveURL(/\/sin-acceso/);

    const api = await request.newContext({ baseURL: apiBaseUrl });
    const loginResponse = await api.post('/auth/login', {
      data: { email, password },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const login = await loginResponse.json();
    const headers = { Authorization: `Bearer ${login.tokens.access_token}` };

    await expect((await api.get('/pedidos', { headers })).status()).toBe(200);
    await expect((await api.get('/usuarios', { headers })).status()).toBe(403);
    await expect((await api.get('/productos/sin-lote/check', { headers })).status()).toBe(403);
    await api.dispose();
  });
});
