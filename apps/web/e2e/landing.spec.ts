import { expect, test } from '@playwright/test';

/**
 * Parcours 5 (docs/13) : landing. Le bouton WhatsApp ouvre le bon numéro avec le message par
 * défaut (lus depuis l'API) ; le formulaire de demande s'envoie.
 * Nécessite l'API (API_ORIGIN) et les données `pnpm e2e:fixtures` (numéro fictif).
 */
test.skip(!process.env['API_ORIGIN'], 'API non configurée');

test('parcours 5 : WhatsApp et formulaire de la landing', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Votre pressing/ })).toBeVisible();

  const expected =
    'https://wa.me/237600000099?text=' +
    encodeURIComponent('Bonjour, je souhaite en savoir plus sur Lavio pour mon pressing.');
  const cta = page.getByRole('link', { name: 'Parler au service client' });
  await expect(cta).toHaveAttribute('href', expected);
  await expect(cta).toHaveAttribute('target', '_blank');
  if (isMobile) {
    const floating = page.getByRole('link', { name: 'Contacter le service client sur WhatsApp' });
    await expect(floating).toBeVisible();
    await expect(floating).toHaveAttribute('href', expected);
  }

  // Formulaire : consentement exigé, puis envoi.
  const form = page.locator('#contact');
  await form.getByLabel('Votre nom').fill('Awa Démo');
  await form.getByLabel('Nom du pressing').fill('Pressing Démo');
  await form.getByLabel('Téléphone').fill('690000123');
  await form.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(
    form.getByText('Votre accord est nécessaire pour être recontacté(e).'),
  ).toBeVisible();
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(form.getByText('Merci ! Nous vous recontactons très vite.')).toBeVisible();

  // Pages légales accessibles depuis le pied de page.
  await page.getByRole('link', { name: 'Mentions légales' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeVisible();
  await expect(page.getByText('Texte provisoire.')).toBeVisible();
});
