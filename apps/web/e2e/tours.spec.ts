import { expect, type Page, test } from '@playwright/test';

/**
 * Tournées : la caisse planifie un ramassage sur le prochain jour de tournée, le livreur le
 * marque collecté ; la liste du jour s'imprime.
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

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'Planification au comptoir : écran large');
});

test('tournée : ramassage planifié, collecté par le livreur, liste imprimable', async ({
  page,
  browser,
}) => {
  await signIn(page, 'e2e-caisse@test.local');
  await page.goto('/app/tours');
  // Sans date dans l'adresse : la tournée du jour s'affiche.
  await expect(page.getByText(/À encaisser/)).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle demande' }).click();
  const note = `Portail bleu ${Date.now()}`;
  await page.getByLabel('Client (nom ou téléphone)').fill('699000777');
  await page.getByRole('button', { name: /Client Fidèle E2E/ }).click();
  await page.getByLabel('Adresse').fill('Rue des Essais, Douala');
  await page.getByLabel('Notes').fill(note);
  await page.getByRole('button', { name: 'Enregistrer la demande' }).click();
  await expect(page.getByText('Demande enregistrée.')).toBeVisible();
  const card = page.getByRole('listitem').filter({ hasText: note });
  await expect(card).toContainText('À collecter');
  const date = new URL(page.url()).searchParams.get('date') ?? '';

  // Le livreur marque le ramassage collecté.
  const context = await browser.newContext();
  const driver = await context.newPage();
  await signIn(driver, 'e2e-livreur@test.local');
  await driver.goto(`/app/tours?date=${date}`);
  const driverCard = driver.getByRole('listitem').filter({ hasText: note });
  await driverCard.getByRole('button', { name: 'Marquer collecté' }).click();
  await expect(driverCard).toContainText('Collecté');
  await expect(driver.getByRole('button', { name: 'Nouvelle demande' })).toHaveCount(0);
  await context.close();

  // Liste du jour imprimable.
  await page.getByRole('link', { name: 'Imprimer la liste' }).click();
  const sheet = page.getByRole('article', { name: 'Liste de tournée' });
  await expect(sheet).toContainText('Rue des Essais, Douala');
  await expect(sheet).toContainText('Client Fidèle E2E');
});
