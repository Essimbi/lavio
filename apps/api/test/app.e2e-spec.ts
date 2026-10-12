import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createApp } from '../src/app.factory.js';

describe('Socle de l’API (e2e)', () => {
  let app: NestExpressApplication;
  let server: App;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health répond ok avec la base de données', async () => {
    const res = await request(server).get('/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('renvoie les erreurs au format de l’API, en français', async () => {
    const res = await request(server).get('/v1/route-inexistante').expect(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: "L'élément demandé est introuvable." },
    });
  });

  it('n’expose pas les routes hors du préfixe /v1', async () => {
    await request(server).get('/health').expect(404);
  });

  it('applique les en-têtes de sécurité', async () => {
    const res = await request(server).get('/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('refuse un corps de requête trop volumineux', async () => {
    const res = await request(server)
      .post('/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: 'x'.repeat(1_100_000) }))
      .expect(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('refuse un JSON invalide avec VALIDATION_FAILED', async () => {
    const res = await request(server)
      .post('/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"invalide"')
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
