import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { apiInterceptor } from '../http/api.interceptor';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => ctrl.verify());

  async function login(token: string): Promise<void> {
    const pending = auth.login('awa@test.local', 'secret-secret', 'app');
    ctrl.expectOne('/api/v1/auth/login').flush({ accessToken: token, expiresIn: 900 });
    await Promise.resolve();
    ctrl.expectOne('/api/v1/auth/me').flush({ user: { id: 'u' }, tenant: null, license: null });
    await pending;
  }

  it('n’envoie aucun jeton à la connexion et l’ajoute ensuite', async () => {
    await login('jeton-1');
    const pending = firstValueFrom(http.get('/api/v1/users'));
    const req = ctrl.expectOne('/api/v1/users');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-1');
    req.flush([]);
    await pending;
  });

  it('rafraîchit la session une seule fois puis rejoue la requête', async () => {
    await login('ancien');
    const a = firstValueFrom(http.get('/api/v1/users'));
    const b = firstValueFrom(http.get('/api/v1/audit-logs'));
    const unauthorized = { error: { code: 'UNAUTHENTICATED', message: 'Session expirée' } };
    ctrl
      .expectOne('/api/v1/users')
      .flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
    ctrl
      .expectOne('/api/v1/audit-logs')
      .flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    const refresh = ctrl.match('/api/v1/auth/refresh');
    expect(refresh).toHaveLength(1);
    refresh[0]?.flush({ accessToken: 'nouveau', expiresIn: 900 });
    await new Promise((r) => setTimeout(r));
    for (const url of ['/api/v1/users', '/api/v1/audit-logs']) {
      const retry = ctrl.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer nouveau');
      retry.flush([]);
    }
    await Promise.all([a, b]);
  });

  it('renvoie vers la connexion si la session ne peut pas être renouvelée', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const pending = firstValueFrom(http.get('/api/v1/users')).catch((e: unknown) => e);
    ctrl.expectOne('/api/v1/users').flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    ctrl.expectOne('/api/v1/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    await pending;
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
    expect(auth.me()).toBeNull();
  });
});
