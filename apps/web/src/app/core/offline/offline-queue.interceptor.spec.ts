import {
  HttpClient,
  type HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { apiInterceptor } from '../http/api.interceptor';
import { ApiError } from '../http/api';
import { OfflineQueue, queueLabel, REPLAY_HEADER } from './offline-queue';
import { offlineQueueInterceptor } from './offline-queue.interceptor';

describe('offlineQueueInterceptor', () => {
  const queued: { req: HttpRequest<unknown>; label: string }[] = [];

  function setup() {
    queued.length = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([offlineQueueInterceptor, apiInterceptor])),
        provideHttpClientTesting(),
        {
          provide: OfflineQueue,
          useValue: {
            label: queueLabel,
            enqueue: (req: HttpRequest<unknown>, label: string) => {
              queued.push({ req, label });
              return Promise.resolve();
            },
          },
        },
      ],
    });
    return { http: TestBed.inject(HttpClient), ctrl: TestBed.inject(HttpTestingController) };
  }

  it('met en file un paiement interrompu par une coupure, avec une clé d’idempotence', async () => {
    const { http, ctrl } = setup();
    const call = firstValueFrom(http.post('/api/v1/payments', { amountXaf: 1000 }));
    ctrl.expectOne('/api/v1/payments').error(new ProgressEvent('error'), { status: 0 });
    const error = await call.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isQueued).toBe(true);
    expect(queued).toHaveLength(1);
    expect(queued[0]?.label).toBe('Paiement');
    expect(queued[0]?.req.headers.get('Idempotency-Key')).toMatch(/^[\w-]{36}$/);
  });

  it('conserve la clé fournie par l’écran (dépôt)', async () => {
    const { http, ctrl } = setup();
    const call = firstValueFrom(
      http.post('/api/v1/deposits', {}, { headers: { 'Idempotency-Key': 'cle-du-formulaire' } }),
    );
    ctrl.expectOne('/api/v1/deposits').error(new ProgressEvent('error'), { status: 0 });
    await call.catch(() => undefined);
    expect(queued[0]?.req.headers.get('Idempotency-Key')).toBe('cle-du-formulaire');
  });

  it('ne met en file ni les erreurs métier, ni les écritures non concernées, ni les rejeux', async () => {
    const { http, ctrl } = setup();
    const business = firstValueFrom(http.post('/api/v1/deposits/d1/returns', {}));
    ctrl
      .expectOne('/api/v1/deposits/d1/returns')
      .flush(
        { error: { code: 'ITEM_NOT_READY', message: 'Article non prêt.' } },
        { status: 409, statusText: 'Conflict' },
      );
    expect(((await business.catch((e: unknown) => e)) as ApiError).code).toBe('ITEM_NOT_READY');

    const other = firstValueFrom(http.post('/api/v1/customers', {}));
    ctrl.expectOne('/api/v1/customers').error(new ProgressEvent('error'), { status: 0 });
    expect(((await other.catch((e: unknown) => e)) as ApiError).code).toBe('NETWORK_ERROR');

    const replay = firstValueFrom(
      http.post('/api/v1/payments', {}, { headers: { [REPLAY_HEADER]: '1' } }),
    );
    ctrl.expectOne('/api/v1/payments').error(new ProgressEvent('error'), { status: 0 });
    expect(((await replay.catch((e: unknown) => e)) as ApiError).code).toBe('NETWORK_ERROR');
    expect(queued).toHaveLength(0);
  });

  it('reconnaît les écritures sensibles (docs/09)', () => {
    const req = (url: string, method = 'POST') => ({ url, method });
    expect(queueLabel(req('/api/v1/deposits'))).toBe('Dépôt');
    expect(queueLabel(req('/api/v1/deposits/abc/items/status'))).toBe('Statut d’article');
    expect(queueLabel(req('/api/v1/deposits/abc/items/def/status'))).toBe('Statut d’article');
    expect(queueLabel(req('/api/v1/deposits/abc/returns'))).toBe('Restitution');
    expect(queueLabel(req('/api/v1/deposits/abc/cancel'))).toBeNull();
    expect(queueLabel(req('/api/v1/payments', 'GET'))).toBeNull();
  });
});
