import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  it('présente la promesse et le parcours des statuts dans l’ordre', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Votre pressing');
    expect(el.querySelector('a[href="/login"]')).not.toBeNull();
    const steps = [...el.querySelectorAll('.journey .chip')].map((c) => c.textContent.trim());
    expect(steps).toEqual([
      'Reçu',
      'En traitement',
      'Repassage',
      'Contrôle qualité',
      'Prêt',
      'Retiré',
    ]);
  });

  it('respecte les contrastes de la charte : jamais de texte blanc sur aqua ni ambre', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const chips = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.chip')];
    for (const chip of chips) {
      const onLight =
        chip.classList.contains('bg-aqua-400') || chip.classList.contains('bg-amber-500');
      if (onLight) expect(chip.classList.contains('text-white')).toBe(false);
    }
  });
});
