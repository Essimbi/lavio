import { expect, type Page, test } from '@playwright/test';

/**
 * Parcours 1 (docs/13) : connexion caissier, nouveau dépôt de 3 articles pour un client existant,
 * enregistrement, aperçu du ticket avec numéro et QR code. Objectif : moins de 90 secondes.
 * Nécessite l'API (API_ORIGIN) et les données `pnpm e2e:fixtures` (E2E_PASSWORD).
 */
const password = process.env['E2E_PASSWORD'];
test.skip(!process.env['API_ORIGIN'] || !password, 'API ou données de test non configurées');

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail ou téléphone').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password ?? '');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
}

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(isMobile, 'Poste du caissier : écran large et clavier');
  await page.addInitScript(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => {
      (window as unknown as { printed: number }).printed++;
    };
  });
});

test('parcours 1 : dépôt de 3 articles et ticket en moins de 90 secondes', async ({ page }) => {
  await signIn(page, 'e2e-caisse@test.local');
  await page.getByRole('link', { name: 'Nouveau dépôt' }).click();

  const started = Date.now();
  let actions = 0;
  const act = async <T>(fn: () => Promise<T>) => {
    actions++;
    return fn();
  };

  // Client existant : recherche par téléphone, Entrée.
  const search = page.getByLabel('Téléphone, nom ou numéro de ticket');
  await expect(search).toBeFocused();
  await act(() => search.fill('699000777'));
  await expect(page.getByRole('option', { name: /Client Fidèle E2E/ })).toBeVisible();
  await act(() => search.press('Enter'));
  await expect(page.getByText('Client Fidèle E2E')).toBeVisible();

  // Trois articles au clavier : article (service choisi automatiquement), quantité, couleur, Entrée.
  await act(() => page.getByLabel('Article 1', { exact: true }).selectOption({ label: 'Chemise' }));
  await act(() => page.locator('[id^="qty-"]').first().fill('2'));
  await act(() => page.locator('[id^="color-"]').first().fill('Blanc'));
  await act(() => page.locator('[id^="color-"]').first().press('Enter'));
  await act(() =>
    page.getByLabel('Article 2', { exact: true }).selectOption({ label: 'Pantalon' }),
  );
  await act(() => page.locator('[id^="color-"]').nth(1).fill('Noir'));
  await act(() => page.locator('[id^="color-"]').nth(1).press('Enter'));
  await act(() => page.getByLabel('Article 3', { exact: true }).selectOption({ label: 'Costume' }));
  await expect(page.getByLabel('Service', { exact: true }).nth(2)).toHaveValue(/.+/);

  // Total en direct : 2 × 1 000 + 1 000 + 5 000.
  await expect(page.locator('.grand-total')).toHaveText(/8\s000\sFCFA/);

  // Enregistrer et imprimer (Ctrl + Entrée).
  await act(() => page.keyboard.press('Control+Enter'));
  await expect(page).toHaveURL(/\/print\/ticket\/.+auto=1/);
  const ticket = page.getByRole('article', { name: 'Ticket de dépôt' });
  await expect(ticket.locator('.number')).toHaveText(/^N° \d{6}$/);
  await expect(ticket.getByRole('img', { name: 'QR code du ticket' })).toBeVisible();
  await expect(ticket).toContainText('Client Fidèle E2E');
  await expect(ticket).toContainText('Présentez ce ticket au retrait');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { printed: number }).printed))
    .toBe(1);

  const seconds = (Date.now() - started) / 1000;
  test.info().annotations.push({
    type: 'actions',
    description: `${actions} actions, ${seconds.toFixed(1)} s`,
  });
  expect(actions).toBeLessThanOrEqual(12);
  expect(seconds).toBeLessThan(90);

  // Le dépôt se retrouve par son numéro, sans les zéros initiaux.
  const number = Number((await ticket.locator('.number').textContent())?.replace(/\D/g, ''));
  await page.goto('/app/deposits');
  await page.getByLabel('Numéro de ticket, client ou téléphone').fill(String(number));
  await page.getByRole('button', { name: 'Ouvrir le n°' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: `Dépôt n° ${String(number).padStart(6, '0')}` }),
  ).toBeVisible();
});

test('une remise au-delà du seuil bloque le ticket jusqu’à la validation de la responsable', async ({
  page,
  browser,
}) => {
  await signIn(page, 'e2e-caisse@test.local');
  await page.goto('/app/deposits/new');
  await page.getByLabel('Téléphone, nom ou numéro de ticket').fill('699000777');
  await expect(page.getByRole('option', { name: /Client Fidèle E2E/ })).toBeVisible();
  await page.getByLabel('Téléphone, nom ou numéro de ticket').press('Enter');
  await page.getByLabel('Article 1', { exact: true }).selectOption({ label: 'Costume' });
  await page.getByLabel('Remise (FCFA)').fill('2000');
  await expect(
    page.getByRole('status').filter({ hasText: 'la responsable devra la valider' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer et imprimer' }).click();

  await expect(page.getByText('en attente de validation par la responsable')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Imprimer le ticket' })).toHaveCount(0);
  const depositUrl = page.url();

  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await signIn(owner, 'e2e-responsable@test.local');
  await owner.goto('/app/approvals');
  await owner.getByRole('button', { name: 'Valider' }).first().click();
  await expect(owner.getByText('Demande validée.')).toBeVisible();
  await ownerContext.close();

  await page.goto(depositUrl);
  await expect(page.getByRole('link', { name: 'Imprimer le ticket' })).toBeVisible();
});
