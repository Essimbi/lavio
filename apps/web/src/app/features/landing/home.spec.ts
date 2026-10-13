import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiInterceptor } from '../../core/http/api.interceptor';
import { Home } from './home';

describe('Home (landing)', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);
    return { fixture, el: fixture.nativeElement as HTMLElement, http };
  }

  const flushConfig = async (
    http: HttpTestingController,
    fixture: { whenStable: () => Promise<unknown> },
    plans: unknown[] = [],
    demo: unknown = null,
  ) => {
    http.expectOne('/api/v1/public/config').flush({
      whatsappNumber: '237600000099',
      whatsappDefaultMessage: 'Bonjour, je souhaite en savoir plus sur Lavio pour mon pressing.',
      plans,
      demo,
    });
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };

  it('présente la promesse, les sections et le parcours des statuts dans l’ordre', async () => {
    const { el } = await render();
    expect(el.querySelector('h1')?.textContent).toContain('Votre pressing');
    for (const id of ['fonctionnalites', 'comment', 'tarifs', 'questions', 'contact']) {
      expect(el.querySelector(`#${id}`)).not.toBeNull();
    }
    expect(el.querySelectorAll('.features > li')).toHaveLength(6);
    expect(el.querySelectorAll('.faq details').length).toBeGreaterThanOrEqual(6);
    const steps = [...el.querySelectorAll('.journey .chip')].map((c) => c.textContent.trim());
    expect(steps).toEqual([
      'Reçu',
      'En traitement',
      'Repassage',
      'Contrôle qualité',
      'Prêt',
      'Retiré',
    ]);
    expect(el.querySelector('a[href="/mentions-legales"]')).not.toBeNull();
    expect(el.querySelector('a[href="/confidentialite"]')).not.toBeNull();
  });

  it('construit le lien WhatsApp depuis la configuration (jamais en dur)', async () => {
    const { el, http, fixture } = await render();
    expect(el.querySelector('a[href^="https://wa.me"]')).toBeNull();
    await flushConfig(http, fixture);
    const links = [...el.querySelectorAll<HTMLAnchorElement>('a[href^="https://wa.me"]')];
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.href).toBe(
      'https://wa.me/237600000099?text=Bonjour%2C%20je%20souhaite%20en%20savoir%20plus%20sur%20Lavio%20pour%20mon%20pressing.',
    );
    const floating = el.querySelector('.wa-float');
    expect(floating?.getAttribute('aria-label')).toBe('Contacter le service client sur WhatsApp');
  });

  it('affiche les tarifs lus depuis l’API, ou « Tarif sur demande »', async () => {
    const { el, http, fixture } = await render();
    await flushConfig(http, fixture, [
      {
        code: 'STANDARD',
        name: 'Standard',
        priceMonthlyXaf: 15000,
        priceYearlyXaf: null,
        includedUsers: 2,
        extraUserPriceXaf: null,
        trialDays: 14,
      },
      {
        code: 'PRO',
        name: 'Pro',
        priceMonthlyXaf: null,
        priceYearlyXaf: null,
        includedUsers: 5,
        extraUserPriceXaf: null,
        trialDays: 0,
      },
    ]);
    const plans = [...el.querySelectorAll('.plan')].map((p) => p.textContent);
    expect(plans[0]).toMatch(/15\s000\sFCFA/);
    expect(plans[0]).toContain('Essai gratuit · 14 jours');
    expect(plans[1]).toContain('Tarif sur demande');
    expect(plans[1]).not.toContain('Essai gratuit');
    expect(el.querySelector<HTMLAnchorElement>('.plan a[href^="https://wa.me"]')?.href).toContain(
      encodeURIComponent('Plan Standard.'),
    );
  });

  it('présente la démonstration seulement si l’API publie des identifiants', async () => {
    const closed = await render();
    await flushConfig(closed.http, closed.fixture);
    expect(closed.el.querySelector('#demo')).toBeNull();
    expect(closed.el.querySelector('a[href="#demo"]')).toBeNull();
    TestBed.resetTestingModule();

    const { el, http, fixture } = await render();
    await flushConfig(http, fixture, [], {
      accounts: [
        {
          label: 'Responsable',
          email: 'demo-responsable@lavio.local',
          password: 'mot-de-passe-demo',
        },
        { label: 'Caisse', email: 'demo-caisse@lavio.local', password: 'mot-de-passe-demo' },
      ],
    });
    const accounts = [...el.querySelectorAll('#demo .demo-account')];
    expect(accounts).toHaveLength(2);
    expect(accounts.at(0)?.textContent).toContain('demo-responsable@lavio.local');
    expect(accounts.at(0)?.textContent).toContain('mot-de-passe-demo');
    expect(accounts.at(1)?.querySelector('a')?.getAttribute('href')).toBe('/login?demo=1');
    expect(el.querySelector('.hero a[href="#demo"]')?.textContent).toContain('Essayer la démo');
  });

  it('montre les captures de l’application dans des onglets accessibles', async () => {
    const { el, fixture } = await render();
    const tabs = [...el.querySelectorAll<HTMLButtonElement>('#apercu [role="tab"]')];
    expect(tabs.map((t) => t.textContent.trim())).toEqual([
      'Tableau de bord',
      'Dépôts',
      'Caisse',
      'Stock',
      'Comptabilité',
    ]);
    const visible = () =>
      [...el.querySelectorAll<HTMLElement>('#apercu [role="tabpanel"]')].filter((p) => !p.hidden);
    expect(visible()).toHaveLength(1);
    expect(visible()[0]?.querySelector('img')?.getAttribute('src')).toBe(
      '/media/app/dashboard.webp',
    );
    expect(visible()[0]?.querySelector('img')?.getAttribute('loading')).toBe('lazy');

    tabs.at(2)?.click();
    await fixture.whenStable();
    expect(visible()[0]?.querySelector('img')?.getAttribute('src')).toBe('/media/app/cash.webp');
    expect(tabs.at(2)?.getAttribute('aria-selected')).toBe('true');

    tabs.at(2)?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(visible()[0]?.querySelector('img')?.getAttribute('src')).toBe('/media/app/stock.webp');
    expect(tabs.at(3)?.getAttribute('tabindex')).toBe('0');
  });

  it('valide le formulaire, exige le consentement et envoie la demande', async () => {
    const { el, http, fixture } = await render();
    await flushConfig(http, fixture);
    const submit = el.querySelector<HTMLButtonElement>('#contact button[type="submit"]');
    submit?.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.field-error').length).toBeGreaterThanOrEqual(4);
    http.expectNone('/api/v1/public/leads');

    const set = (id: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`#${id}`);
      if (!input) throw new Error(id);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('lead-name', 'Awa Démo');
    set('lead-pressing', 'Pressing Démo');
    set('lead-phone', '6 90 00 00 00');
    el.querySelector<HTMLInputElement>('input[formcontrolname="consent"]')?.click();
    await fixture.whenStable();
    submit?.click();
    const req = http.expectOne('/api/v1/public/leads');
    expect(req.request.body).toMatchObject({
      name: 'Awa Démo',
      pressingName: 'Pressing Démo',
      consent: true,
    });
    expect(req.request.body.website).toBeUndefined();
    req.flush({ ok: true });
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(el.textContent).toContain('Merci ! Nous vous recontactons très vite.');
  });

  it('respecte les contrastes de la charte : jamais de texte blanc sur aqua ni ambre', async () => {
    const { el } = await render();
    for (const chip of el.querySelectorAll('.chip')) {
      const onLight =
        chip.classList.contains('bg-aqua-400') || chip.classList.contains('bg-amber-500');
      if (onLight) expect(chip.classList.contains('text-white')).toBe(false);
    }
  });
});
