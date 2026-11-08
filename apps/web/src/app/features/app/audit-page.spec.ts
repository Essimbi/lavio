import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiInterceptor } from '../../core/http/api.interceptor';
import { AuditPage } from './audit-page';

const empty = { data: [], meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 } };

describe('AuditPage', () => {
  it('filtre par utilisateur, élément et période (heure de Douala, fin incluse)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(AuditPage);
    const settle = async () => {
      await new Promise((r) => setTimeout(r));
      fixture.detectChanges();
    };
    await settle();
    const http = TestBed.inject(HttpTestingController);
    const el = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/v1/users').flush([{ id: 'u1', fullName: 'Caissier Démo' }]);
    http.expectOne((r) => r.url === '/api/v1/audit-logs').flush(empty);
    await settle();

    const flushAll = () =>
      http.match((r) => r.url === '/api/v1/audit-logs').forEach((r) => r.flush(empty));
    // Contrôle retrouvé par son libellé (l'identifiant est généré par lvControl).
    const pick = async (label: string, value: string) => {
      const forLabel = [...el.querySelectorAll('label')].find(
        (l) => l.textContent.trim() === label,
      );
      const field =
        forLabel && el.querySelector<HTMLInputElement | HTMLSelectElement>(`#${forLabel.htmlFor}`);
      if (!field) throw new Error(label);
      field.value = value;
      field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input'));
      await settle();
    };
    await pick('Utilisateur', 'u1');
    flushAll();
    await pick('Élément', 'payment');
    flushAll();
    await pick('Du', '2026-10-01');
    flushAll();
    await pick('Au', '2026-10-15');
    const req = http.expectOne((r) => r.url === '/api/v1/audit-logs');
    expect(req.request.params.get('userId')).toBe('u1');
    expect(req.request.params.get('entity')).toBe('payment');
    expect(req.request.params.get('from')).toBe('2026-10-01T00:00:00+01:00');
    expect(req.request.params.get('to')).toBe('2026-10-16T00:00:00+01:00');
    req.flush(empty);
  });
});
