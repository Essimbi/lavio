import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { DepositsPage } from './deposits-page';

const empty = { data: [], meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 } };

describe('DepositsPage', () => {
  it('filtre la liste par date de retrait prévue', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(DepositsPage);
    const settle = async () => {
      await new Promise((r) => setTimeout(r));
      fixture.detectChanges();
    };
    await settle();
    const http = TestBed.inject(HttpTestingController);
    const el = fixture.nativeElement as HTMLElement;
    http.expectOne((r) => r.url === '/api/v1/deposits').flush(empty);

    const set = async (id: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`#${id}`);
      if (!input) throw new Error(id);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await settle();
    };
    await set('deposit-due-from', '2026-10-20');
    http.match((r) => r.url === '/api/v1/deposits').forEach((r) => r.flush(empty));
    await set('deposit-due-to', '2026-10-24');
    const req = http.expectOne((r) => r.url === '/api/v1/deposits');
    expect(req.request.params.get('dueFrom')).toBe('2026-10-20');
    expect(req.request.params.get('dueTo')).toBe('2026-10-24');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(empty);
  });
});
