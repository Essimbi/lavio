# 09 — PWA, notifications push et impression

## PWA

Le web (landing, application, superadmin) est une seule application Angular installable. La responsable l'installe sur son téléphone ; le caissier peut l'installer sur le PC.

### Manifest (`manifest.webmanifest`)

```json
{
  "name": "Lavio",
  "short_name": "Lavio",
  "description": "Le pressing, sous contrôle.",
  "start_url": "/app?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#0B4F4A",
  "background_color": "#F4FAF8",
  "lang": "fr",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Copier les icônes de `docs/assets/pwa/` dans `apps/web/src/assets/icons/`. Ajouter `apple-touch-icon.png` et `favicon-32.png` dans `index.html`, `<meta name="theme-color" content="#0B4F4A">`.

### Service worker (`@angular/service-worker`, `ngsw-config.json`)

- Groupe `app` en préchargement (coquille, scripts, styles, polices) ; groupe `assets` en chargement paresseux.
- Données : seul `GET /api/v1/reports/dashboard` est mis en cache (stratégie `freshness`, délai 3 s, durée 5 min) pour afficher rapidement le dernier tableau de bord en cas de réseau lent.
- **Ne jamais mettre en cache** les routes d'authentification ni les écritures.
- Mise à jour : écouter `SwUpdate.versionUpdates` ; afficher « Une nouvelle version est disponible » avec un bouton **Actualiser**.
- `ngsw.json` et `ngsw-worker.js` servis avec `Cache-Control: no-cache` (voir `11-deploiement-vercel.md`).

### Installation

Bannière d'installation personnalisée (événement `beforeinstallprompt`) affichée après la deuxième visite connectée, fermable pour 30 jours. Sur iOS, afficher une aide : « Touchez Partager, puis Sur l'écran d'accueil. »

## Notifications push

1. Après connexion sur mobile (jamais au premier chargement), proposer « Activer les alertes » avec explication de ce qui sera notifié.
2. `SwPush.requestSubscription({ serverPublicKey })` avec la clé VAPID publique ; envoi de l'abonnement à `POST /v1/push/subscribe`.
3. Côté API : bibliothèque `web-push`, clés VAPID en variables d'environnement. Charge utile `{ title, body, url, tag }`. Les abonnements en erreur 404 ou 410 sont supprimés.
4. Un clic sur la notification ouvre l'URL ciblée (par exemple la validation à traiter).
5. Types : voir `05-regles-de-gestion.md` (notifications). Chaque notification est aussi enregistrée dans le centre de notifications de l'application.
6. Sur iOS, les notifications ne fonctionnent que si la PWA est installée sur l'écran d'accueil (iOS 16.4 ou plus) : expliquer cette condition dans l'interface.

## File d'envoi (coupures brèves)

Il n'y a **pas de mode hors ligne complet**, mais une coupure brève ne doit pas faire perdre une saisie.

- `OfflineQueueService` (IndexedDB, par exemple `idb-keyval`) met en file les écritures suivantes quand la requête échoue faute de réseau : création de dépôt, paiement, changement de statut d'article, restitution.
- Chaque requête est envoyée avec un `Idempotency-Key` (UUID) généré côté client ; le rejeu ne crée donc jamais de doublon.
- Rejeu automatique à l'événement `online` et au démarrage de l'application, dans l'ordre. Indicateur visible « En attente d'envoi (n) ».
- Limite assumée : le numéro de ticket est attribué par le serveur. Un dépôt mis en file n'a pas encore de numéro ; l'écran indique « Le ticket s'imprimera dès le retour du réseau » et propose l'impression après synchronisation.
- Les erreurs métier au rejeu (par exemple `DUPLICATE_REFERENCE`) sont présentées à l'utilisateur pour décision.

## Impression

L'impression passe par le navigateur (`window.print()` sur une route d'impression dédiée), sans application de bureau.

### Ticket thermique 80 mm

- Route `/print/ticket/:depositId`, CSS `@page { size: 80mm auto; margin: 3mm; }`, largeur utile 72 mm, texte noir sur blanc, 12 à 13 px, gras pour le numéro.
- Contenu : logo du pressing (ou logo Lavio en monochrome), nom et coordonnées du pressing, **numéro de ticket en grand (imprimé en toutes lettres)**, date, client, lignes (quantité, article, service, prix), total, acompte, solde, date de retrait prévue, **QR code** (28 mm), pied de ticket configurable, mention « Présentez ce ticket au retrait ».
- Contenu du QR : `LAVIO|<slug du pressing>|<numéro du dépôt>` (texte brut ; la lecture est prévue en V2). Génération côté client avec la bibliothèque `qrcode`.
- Conseil de poste : choisir l'imprimante par défaut, marges « aucune », et, pour une impression sans boîte de dialogue, lancer le navigateur avec `--kiosk-printing` (documenter dans l'aide).

### Étiquettes par article

Route `/print/labels/:depositId`. Format par défaut 50 × 30 mm (réglable) : `label_code` en grand (ex. `000124-03`), QR code, nom court du client, date de retrait. Alternative : planche A4 de 24 étiquettes.

### Autres impressions

- Liste de tournée du jour (A4) : adresse, téléphone, contenu, montant à encaisser.
- Reçu ou facture : PDF généré côté serveur (`pdfmake`) avec logo, NIU et ligne de TVA si activée ; polices DM Sans embarquées. Version imprimable et téléchargeable.
- Relevés et rapports : exports CSV et XLSX.

## Photos et justificatifs

Capture via `<input type="file" accept="image/*" capture="environment">`. Compression côté client (côté long 1600 px, JPEG qualité 0,8). Envoi **direct vers Vercel Blob** avec jeton de téléversement client (`@vercel/blob/client`), pour contourner la limite de 4,5 Mo des fonctions. Taille maximale 5 Mo, types image uniquement ; l'URL est enregistrée sur la ligne concernée.

## Responsive

Le poste du caissier est pensé pour l'écran large (≥ 1024 px) et le clavier ; le tableau de bord, les validations, la caisse et le stock sont pensés d'abord pour le téléphone. Cible de performance : coquille initiale ≤ 250 Ko compressés, interaction fluide sur un téléphone d'entrée de gamme en 3G/4G.
