import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * Seules les pages publiques sont prérendues au build (référencement, rapidité).
 * L'application et le superadmin sont rendus côté client.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'mentions-legales', renderMode: RenderMode.Prerender },
  { path: 'confidentialite', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
