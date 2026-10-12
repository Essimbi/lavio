import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiError } from './api';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it("ajoute X-Requested-With aux appels de l'API", async () => {
    const pending = firstValueFrom(http.get('/api/v1/health'));
    const req = controller.expectOne('/api/v1/health');
    expect(req.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    req.flush({ status: 'ok' });
    await expect(pending).resolves.toEqual({ status: 'ok' });
  });

  it("ne touche pas aux requêtes hors de l'API", () => {
    http.get('/manifest.webmanifest').subscribe();
    const req = controller.expectOne('/manifest.webmanifest');
    expect(req.request.headers.has('X-Requested-With')).toBe(false);
    req.flush({});
  });

  it("convertit une erreur de l'API en ApiError avec son message français", async () => {
    const pending = firstValueFrom(http.post('/api/v1/payments', {}));
    controller.expectOne('/api/v1/payments').flush(
      {
        error: {
          code: 'DUPLICATE_REFERENCE',
          message: 'Cette référence Mobile Money a déjà été enregistrée.',
          details: { operatorRef: 'X1' },
        },
      },
      { status: 409, statusText: 'Conflict' },
    );
    const error = (await pending.catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('DUPLICATE_REFERENCE');
    expect(error.status).toBe(409);
    expect(error.details).toEqual({ operatorRef: 'X1' });
  });

  it('signale une coupure réseau', async () => {
    const pending = firstValueFrom(http.get('/api/v1/health'));
    controller.expectOne('/api/v1/health').error(new ProgressEvent('error'), { status: 0 });
    const error = (await pending.catch((e: unknown) => e)) as ApiError;
    expect(error.isNetworkError).toBe(true);
    expect(error.message).toMatch(/réseau/);
  });

  it('donne un message générique aux erreurs inattendues', async () => {
    const pending = firstValueFrom(http.get('/api/v1/health'));
    controller
      .expectOne('/api/v1/health')
      .flush('<html>', { status: 502, statusText: 'Bad Gateway' });
    const error = (await pending.catch((e: unknown) => e)) as ApiError;
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).not.toMatch(/html/i);
  });
});
