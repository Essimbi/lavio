// Référencement après le build (docs/07) : sitemap.xml, ligne Sitemap du robots.txt et adresses
// absolues de l'image de partage. Actif seulement si PUBLIC_SITE_URL est défini (domaine à
// confirmer, docs/14) ; sinon le build reste valable avec des adresses relatives.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const site = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, '');
const root = join(import.meta.dirname, '..', 'dist', 'web', 'browser');
const pages = ['', 'mentions-legales', 'confidentialite'];

if (!site) {
  console.log('[seo] PUBLIC_SITE_URL absent : sitemap non généré, adresses relatives conservées.');
  process.exit(0);
}
if (!/^https:\/\/[^/]+$/.test(site)) {
  console.error(`[seo] PUBLIC_SITE_URL doit être une origine https (reçu : ${site}).`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const urls = pages
  .map((p) => `  <url><loc>${site}/${p}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n');
writeFileSync(
  join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

const robots = join(root, 'robots.txt');
const robotsText = readFileSync(robots, 'utf8').replace(/\nSitemap:.*$/m, '');
writeFileSync(robots, `${robotsText.trimEnd()}\nSitemap: ${site}/sitemap.xml\n`);

for (const p of pages) {
  const file = join(root, p, 'index.html');
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8')
    .replaceAll('content="/og-image.png"', `content="${site}/og-image.png"`)
    .replace(
      '<meta property="og:type"',
      `<meta property="og:url" content="${site}/${p}" />\n    <link rel="canonical" href="${site}/${p}" />\n    <meta property="og:type"`,
    );
  writeFileSync(file, html);
}
console.log(`[seo] sitemap.xml et adresses absolues générés pour ${site}.`);
