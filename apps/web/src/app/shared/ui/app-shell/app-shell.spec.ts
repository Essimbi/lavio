import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { AppShell } from './app-shell';
import type { ShellConfig } from './nav';

@Component({ template: '<h1>Contenu</h1>' })
class Page {}

const config: ShellConfig = {
  area: 'Espace pressing',
  items: [
    { label: 'Tableau de bord', path: '/app', icon: 'home', exact: true },
    { label: 'Dépôts', path: '/app/deposits', icon: 'ticket' },
  ],
  mobileItems: [{ label: 'Accueil', path: '/app', icon: 'home', exact: true }],
  primaryAction: { label: 'Nouveau dépôt', path: '/app/deposits/new', icon: 'plus' },
};

describe('AppShell', () => {
  async function render(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'app',
            children: [
              { path: '', component: Page },
              { path: 'deposits', component: Page },
            ],
          },
        ]),
      ],
    });
    const fixture = TestBed.createComponent(AppShell);
    fixture.componentRef.setInput('config', config);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche la navigation, l’action principale et un lien d’évitement', async () => {
    const el = await render('/app');
    const labels = [...el.querySelectorAll('.sidebar .nav-link')].map((a) => a.textContent.trim());
    expect(labels).toEqual(['Tableau de bord', 'Dépôts']);
    expect(el.querySelector('.primary-action')?.textContent).toContain('Nouveau dépôt');
    expect(el.querySelector('a.skip-link')?.getAttribute('href')).toBe('#contenu');
    expect(el.querySelectorAll('nav[aria-label="Navigation principale"]')).toHaveLength(2);
  });

  it('marque la page courante avec aria-current', async () => {
    const el = await render('/app/deposits');
    const current = [...el.querySelectorAll('.sidebar [aria-current="page"]')];
    expect(current.map((a) => a.textContent.trim())).toEqual(['Dépôts']);
  });
});
