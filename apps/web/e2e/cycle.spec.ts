import { type Browser, expect, type Page, test } from '@playwright/test';

/**
 * Cycle complet (docs/12 et docs/13, parcours 2) : ouverture de caisse → dépôt → statuts →
 * reprise → contrôle qualité → encaissement Mobile Money avec référence → restitution → reçu →
 * clôture validée.
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

async function as(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  return { page, close: () => context.close() };
}

/** Écran de suivi : recherche par numéro, sélection de tous les articles. */
async function openTracking(page: Page, number: string) {
  await page.goto('/app/tracking');
  await page.getByLabel('Numéro de ticket').fill(number);
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByRole('link', { name: `N° ${number}` })).toBeVisible();
  await page.getByRole('button', { name: 'Tout sélectionner' }).click();
}

const statusButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'Parcours de comptoir : écran large');
});

test('cycle complet : dépôt, suivi, contrôle qualité, encaissement, restitution, clôture', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    window.print = () => undefined;
  });

  // 1. Le caissier ouvre la caisse.
  await signIn(page, 'e2e-caisse@test.local');
  await page.goto('/app/cash');
  await page.getByLabel('Fond de caisse (FCFA)').fill('10000');
  await page.getByRole('button', { name: 'Ouvrir la caisse' }).click();
  await expect(page.getByText('Caisse ouverte.')).toBeVisible();

  // 2. Dépôt d'une chemise (1 000 FCFA) pour le client fidèle.
  await page.goto('/app/deposits/new');
  const search = page.getByLabel('Téléphone, nom ou numéro de ticket');
  await search.fill('699000777');
  await expect(page.getByRole('option', { name: /Client Fidèle E2E/ })).toBeVisible();
  await search.press('Enter');
  await page.getByLabel('Article 1', { exact: true }).selectOption({ label: 'Chemise' });
  await expect(page.locator('.grand-total')).toHaveText(/1\s000\sFCFA/);
  await page.getByRole('button', { name: 'Enregistrer et imprimer' }).click();
  await expect(page).toHaveURL(/\/print\/ticket\/.+/);
  const depositId = new URL(page.url()).pathname.split('/').pop() ?? '';
  const number = (await page.locator('.ticket .number').textContent())?.replace(/\D/g, '') ?? '';
  expect(number).toMatch(/^\d{6}$/);

  // 3. L'opérateur fait avancer l'article jusqu'au contrôle qualité.
  const operator = await as(browser, 'e2e-operateur@test.local');
  await openTracking(operator.page, number);
  for (const status of ['En traitement', 'Repassage', 'Contrôle qualité']) {
    await statusButton(operator.page, status).click();
    await expect(operator.page.getByText(`1 article(s) : ${status}.`)).toBeVisible();
    await operator.page.getByRole('button', { name: 'Tout sélectionner' }).click();
  }
  // « Prêt » est réservé au contrôle qualité.
  await expect(statusButton(operator.page, 'Prêt')).toBeDisabled();

  // 4. Le contrôle qualité renvoie en reprise, puis déclare prêt après la check-list.
  const quality = await as(browser, 'e2e-qualite@test.local');
  await openTracking(quality.page, number);
  await statusButton(quality.page, 'Repassage').click();
  await quality.page.getByLabel('Cause').selectOption({ label: 'Repassage à reprendre' });
  await quality.page.getByRole('button', { name: 'Renvoyer en reprise' }).click();
  await expect(quality.page.getByText('1 article(s) : Repassage.')).toBeVisible();

  await openTracking(operator.page, number);
  await statusButton(operator.page, 'Contrôle qualité').click();
  await expect(operator.page.getByText('1 article(s) : Contrôle qualité.')).toBeVisible();
  await operator.close();

  await openTracking(quality.page, number);
  await statusButton(quality.page, 'Prêt').click();
  const dialog = quality.page.getByRole('dialog', { name: 'Contrôle qualité' });
  await expect(dialog.getByRole('button', { name: 'Déclarer prêt' })).toBeDisabled();
  for (const box of await dialog.getByRole('checkbox').all()) await box.check();
  await dialog.getByRole('button', { name: 'Déclarer prêt' }).click();
  await expect(quality.page.getByText('1 article(s) : Prêt.')).toBeVisible();
  await quality.close();

  // 5. Le caissier encaisse en Mobile Money avec la référence (docs/13, parcours 2), puis restitue.
  await page.goto(`/app/deposits/${depositId}`);
  await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible();
  await page.getByRole('button', { name: 'Encaisser' }).click();
  const payment = page.getByRole('dialog');
  await expect(payment.getByLabel('Montant (FCFA)')).toHaveValue('1000');
  await payment.getByText('Orange Money', { exact: true }).click();
  await expect(payment.getByRole('button', { name: 'Enregistrer le paiement' })).toBeDisabled();
  await payment.getByLabel('Référence de la transaction').fill(`OM-${Date.now()}`);
  await payment.getByRole('button', { name: 'Enregistrer le paiement' }).click();
  await expect(page.getByText('Paiement enregistré.')).toBeVisible();
  const restitution = page.getByRole('region', { name: 'Restitution' });
  await restitution.getByRole('checkbox').check();
  await restitution.getByRole('button', { name: 'Restituer 1 article(s)' }).click();
  await expect(page.getByText('1 article(s) restitué(s).')).toBeVisible();
  await expect(page.locator('lv-deposit-chip')).toContainText('Terminé');

  // 6. Reçu 80 mm.
  await page.getByRole('link', { name: 'Reçu' }).click();
  const receipt = page.getByRole('article', { name: 'Reçu' });
  await expect(receipt.locator('.number')).toHaveText(`N° ${number}`);
  await expect(receipt).toContainText('Articles restitués');
  await expect(receipt).toContainText('Orange Money');

  // 7. Clôture demandée par le caissier, sans écart.
  await page.goto('/app/cash');
  const expected = (
    (await page.locator('dt:has-text("Espèces attendues") + dd').textContent()) ?? ''
  ).replace(/\D/g, '');
  // Paiement Mobile Money : hors espèces, l'attendu reste le fonds de caisse.
  expect(Number(expected)).toBe(10000);
  await page.getByLabel('Espèces comptées (FCFA)').fill(expected);
  await expect(page.getByText(/Écart : 0/)).toBeVisible();
  await page.getByRole('button', { name: 'Demander la clôture' }).click();
  await expect(page.getByText('Clôture envoyée à la responsable pour validation.')).toBeVisible();

  // 8. La responsable voit la pastille et valide la clôture.
  const owner = await as(browser, 'e2e-responsable@test.local');
  await expect(
    owner.page
      .locator('.sidebar')
      .getByRole('link', { name: /Validations/ })
      .locator('.lv-badge'),
  ).toBeVisible();
  await owner.page.goto('/app/approvals');
  const request = owner.page.getByRole('listitem').filter({ hasText: 'Clôture de caisse' });
  await request.first().getByRole('button', { name: 'Valider' }).click();
  await expect(owner.page.getByText('Demande validée.')).toBeVisible();
  await owner.page.goto('/app/cash');
  await expect(owner.page.getByRole('heading', { name: 'Caisse fermée' })).toBeVisible();
  await owner.close();
});
