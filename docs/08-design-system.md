# 08 — Design system (charte graphique Lavio)

Source de vérité visuelle du produit. Ressources : `docs/assets/logo/` et `docs/assets/pwa/`. La charte complète a été conçue comme une série de planches (logo, utilisation, couleurs, typographie, applications) ; ce document en donne les valeurs exactes.

## Marque

- Nom : **Lavio** (en minuscules dans le logotype : `lavio`). Promesse : **Le pressing, sous contrôle.**
- Symbole : une goutte (le lavage), un L (le nom) et une bulle (la fraîcheur).
- Valeurs : **Clarté** (chaque information se lit d'un coup d'œil), **Fiabilité** (chaque dépôt, chaque franc est suivi), **Proximité** (un outil pensé pour le pressing d'ici).
- Ton de voix : simple, direct, rassurant. Vouvoiement, phrases courtes, mots du métier. Écrire « Votre dépôt est enregistré. » plutôt que « Opération effectuée avec succès. »

## Logo

| Fichier | Usage |
|---|---|
| `logo/lavio-logo-horizontal.svg` / `.png` | Version principale, sur fond clair |
| `logo/lavio-logo-horizontal-inverse.svg` / `.png` | Sur fond teal profond ou photo sombre |
| `logo/lavio-logo-horizontal-mono.svg` / `.png` | Impression monochrome, tampons |
| `logo/lavio-symbole.svg` / `-inverse.svg` | Symbole seul (petits espaces, avatar) |
| `pwa/icon-app.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png` | Icônes de l'application et favicon |

Règles : zone de protection autour du logo au moins égale à la largeur du L ; taille minimale 24 mm en impression ou 96 px de large à l'écran ; ne pas déformer, recolorer, ajouter d'ombre ou poser sur un fond peu contrasté.

## Couleurs (variables CSS à définir dans `:root`)

| Jeton | Valeur | Usage |
|---|---|---|
| `--lv-teal-900` | `#0B4F4A` | Couleur principale : en-têtes, boutons principaux, titres |
| `--lv-teal-700` | `#1B7A72` | Liens, états actifs, secondaire |
| `--lv-aqua-400` | `#5CC8B4` | Accent : mises en avant, graphiques, bulle du logo |
| `--lv-mint-100` | `#DDF3EE` | Surfaces secondaires, puces |
| `--lv-foam-50` | `#F4FAF8` | Fond général des écrans |
| `--lv-ink-900` | `#14211F` | Texte courant |
| `--lv-white` | `#FFFFFF` | Cartes, texte sur teal |
| `--lv-coral-600` | `#C8402C` | Erreurs, retards, actions destructrices |
| `--lv-amber-500` | `#F2A33A` | Avertissements (stock bas, validation en attente), texte `ink` dessus |

Contrastes : texte blanc sur teal profond (plus de 9:1) et sur teal vif (plus de 5:1) ; encre sur écume (plus de 15:1). **Jamais de texte blanc sur aqua ni sur ambre** ; texte blanc sur corail seulement en gras ou à partir de 18 px. Proportions visées : 55 % écume et menthe, 25 % teal profond, 15 % aqua et teal vif, 5 % corail ou ambre.

### Couleurs des statuts

| Statut | Fond | Texte |
|---|---|---|
| Reçu (`RECEIVED`) | `mint-100` | `teal-900` |
| En traitement (`IN_PROGRESS`) | `teal-700` | blanc |
| Repassage (`IRONING`) | `amber-500` | `ink-900` |
| Contrôle qualité (`QUALITY_CHECK`) | `ink-900` | blanc |
| Prêt (`READY`) | `aqua-400` | `ink-900` |
| Retiré (`RETURNED`) | `teal-900` | blanc |
| En retard | `coral-600` | blanc, gras |

Ne jamais coder un statut par la couleur seule : toujours afficher le libellé.

## Typographie

- **Poppins** (500, 600, 700) : titres, logo, chiffres clés. **DM Sans** (400, 500, 700) : texte, formulaires, tableaux.
- Échelle : Titre 1 40 px/600 ; Titre 2 28 px/600 ; Titre 3 20 px/600 ; Corps 16 px/400 ; Secondaire 14 px/400 ; Légende 13 px/500. Interlignage 1,5 pour le corps, 1,2 pour les titres.
- Chiffres tabulaires pour les montants (`font-variant-numeric: tabular-nums`). Pas d'Inter, Roboto ni Arial.
- Polices auto-hébergées (paquets `@fontsource`) pour éviter la dépendance à Google Fonts en production.

## Espacement, formes, ombres

Grille de 4 px (4, 8, 12, 16, 24, 32, 48, 64). Rayons : champs 8 px, cartes 14 px, grands blocs 20 px, puces 999 px. Ombre de carte discrète : `0 6px 20px rgba(11,79,74,.10)`. Points de rupture : 640, 1024, 1440 px.

## Accessibilité

Zones tactiles d'au moins 44 px ; focus visible (anneau aqua de 2 px avec décalage) ; vrais éléments `button`, `a`, `input` avec `label` ; `aria-label` sur les boutons-icônes ; messages d'erreur reliés aux champs ; contraste vérifié ; navigation au clavier complète sur le poste du caissier ; respect de `prefers-reduced-motion`.

## Thème Angular Material

Créer un thème Material 3 : primaire teal profond, tertiaire aqua, surfaces écume. Surcharger les variables du thème avec les jetons ci-dessus. Tailwind sert à la mise en page ; ne pas dupliquer les couleurs (les jetons Tailwind pointent vers les variables `--lv-*`).

## Composants à créer (`shared/ui`)

`AppShell` (barre latérale sur PC, navigation basse sur mobile), `KpiCard`, `StatusChip`, `DataTable` (en-tête fixe, tri, pagination serveur), `MoneyInput` (FCFA, séparateur de milliers espace), `PhoneInput` (+237), `ConfirmDialog`, `Toast`, `EmptyState`, `Skeleton`, `ApprovalCard`, `LicenseBanner`, `PrintTicket`, `PrintLabel`, `WhatsAppButton`.

## Navigation

- **PC (caissier, gestion)** : tableau de bord, dépôts, clients, suivi, caisse, paiements, stock, achats, dépenses, comptabilité, tournées, paramètres. Action principale permanente : **Nouveau dépôt**.
- **Mobile (responsable)** : navigation basse : Accueil (tableau de bord), Activité (dépôts et suivi), Caisse, Stock, Plus (validations avec pastille, notifications, paramètres).
- **Dépôt en moins de 90 secondes** : écran unique : recherche client (ou création rapide) → lignes d'articles (type, service, quantité, couleur) avec ajout au clavier → total en direct → acompte → « Enregistrer et imprimer ». Pas d'assistant en plusieurs pages.

## Formats

Montants : `12 500 FCFA` (espace insécable). Dates : `12/10/2026`, heures sur 24 h. Téléphones : `+237 6XX XX XX XX`. Messages d'erreur en français, sans jargon technique.
