import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Logo } from '../../shared/ui/logo/logo';
import { SiteFooter } from '../../shared/ui/site-footer/site-footer';

/**
 * Mentions légales et politique de confidentialité (docs/07, docs/10). Structure définitive,
 * contenu provisoire clairement signalé : les informations marquées [●] sont à fournir.
 */
@Component({
  selector: 'lv-legal-page',
  imports: [RouterLink, RouterLinkActive, Logo, SiteFooter],
  template: `
    <div class="page">
      <header class="top">
        <div class="wrap top-row">
          <a routerLink="/" aria-label="Lavio, accueil"><lv-logo [width]="104" /></a>
          <nav class="top-links" aria-label="Navigation">
            <a routerLink="/" class="back">← Retour à l’accueil</a>
            <a routerLink="/login" class="login">Se connecter</a>
          </nav>
        </div>
      </header>

      <div class="hero">
        <div class="wrap">
          <p class="eyebrow">Informations légales</p>
          <h1>{{ page() === 'mentions' ? 'Mentions légales' : 'Politique de confidentialité' }}</h1>
          <p class="intro">
            {{
              page() === 'mentions'
                ? 'Qui édite Lavio, comment nous joindre et où le service est hébergé.'
                : 'Quelles données Lavio traite, pourquoi, combien de temps, et quels sont vos droits.'
            }}
          </p>
          <nav class="switch" aria-label="Pages légales">
            <a routerLink="/mentions-legales" routerLinkActive="on" ariaCurrentWhenActive="page"
              >Mentions légales</a
            >
            <a routerLink="/confidentialite" routerLinkActive="on" ariaCurrentWhenActive="page"
              >Confidentialité</a
            >
          </nav>
        </div>
      </div>

      <div class="wrap layout">
        <aside class="toc">
          <nav aria-label="Sommaire">
            <p class="toc-title">Sommaire</p>
            <ol role="list">
              @for (s of sections(); track s.id) {
                <li>
                  <a [routerLink]="[]" [fragment]="s.id">{{ s.title }}</a>
                </li>
              }
            </ol>
          </nav>
        </aside>

        <main id="contenu" class="content">
          <p class="note" role="note">
            <strong>Texte provisoire.</strong> Les informations marquées [●] sont à compléter et le
            texte doit être validé par un conseil juridique avant la mise en service.
          </p>
          @if (page() === 'mentions') {
            <div class="legal">
              <section class="block" id="editeur">
                <h2>Éditeur du site</h2>
                <p>
                  Lavio, édité par [● raison sociale], [● forme juridique] au capital de [●] FCFA,
                  immatriculée au RCCM sous le numéro [●], NIU [●], dont le siège est situé [●
                  adresse], Cameroun.
                </p>
                <p>Directeur de la publication : [● nom].</p>
              </section>
              <section class="block" id="contact">
                <h2>Contact</h2>
                <p>
                  Service client : par WhatsApp (numéro indiqué sur la page d’accueil) ou par
                  courriel à [● adresse de support].
                </p>
              </section>
              <section class="block" id="hebergement">
                <h2>Hébergement</h2>
                <p>
                  Application hébergée par [● hébergeur, adresse, région d’hébergement des données].
                  Voir la <a routerLink="/confidentialite">politique de confidentialité</a> pour la
                  localisation des données.
                </p>
              </section>
              <section class="block" id="propriete">
                <h2>Propriété intellectuelle</h2>
                <p>
                  La marque Lavio, son logo et l’ensemble des contenus du site sont protégés. Toute
                  reproduction sans autorisation est interdite.
                </p>
              </section>
            </div>
          } @else {
            <div class="legal">
              <section class="block" id="cadre">
                <h2>Cadre</h2>
                <p>
                  Les données personnelles sont traitées conformément à la loi n° 2024/017 du 23
                  décembre 2024 relative à la protection des données à caractère personnel et à la
                  loi n° 2010/012 relative à la cybersécurité et à la cybercriminalité.
                </p>
              </section>
              <section class="block" id="roles">
                <h2>Qui fait quoi</h2>
                <p>
                  Chaque pressing utilisateur de Lavio est responsable du traitement des données de
                  ses clients. Lavio agit comme sous-traitant pour le compte du pressing, dans le
                  cadre d’un accord de sous-traitance annexé aux conditions d’utilisation [●].
                </p>
                <p>
                  Pour le formulaire de contact de ce site, Lavio est responsable du traitement.
                </p>
              </section>
              <section class="block" id="donnees">
                <h2>Données collectées</h2>
                <ul>
                  <li>
                    Formulaire de contact : nom, nom du pressing, téléphone, ville et message
                    facultatifs, pour vous recontacter.
                  </li>
                  <li>
                    Clients des pressings : nom, téléphone, adresse facultative et préférences, pour
                    la gestion des dépôts.
                  </li>
                  <li>
                    Aucune pièce d’identité ni donnée bancaire n’est collectée. Lavio enregistre des
                    paiements mais ne détient ni ne transfère aucun fonds.
                  </li>
                </ul>
              </section>
              <section class="block" id="conservation">
                <h2>Durées de conservation</h2>
                <p>
                  Demandes de contact : [● durée]. Pièces comptables : au moins [● 10] ans. À la fin
                  d’un abonnement, les données du pressing lui sont exportées sous 30 jours puis
                  supprimées ou anonymisées selon l’accord.
                </p>
              </section>
              <section class="block" id="localisation">
                <h2>Localisation des données</h2>
                <p>
                  Les données sont hébergées [● région]. Tout transfert hors du Cameroun respecte
                  les conditions de la loi et, le cas échéant, l’autorisation de l’Autorité de
                  protection des données à caractère personnel (APDP) [●].
                </p>
              </section>
              <section class="block" id="securite">
                <h2>Sécurité</h2>
                <p>
                  Espace isolé par pressing, échanges chiffrés (HTTPS), mots de passe protégés,
                  actions sensibles tracées.
                </p>
              </section>
              <section class="block" id="droits">
                <h2>Vos droits</h2>
                <p>
                  Vous pouvez demander l’accès, la rectification, l’effacement ou l’anonymisation de
                  vos données en contactant le pressing concerné, ou Lavio à [● adresse de contact].
                  Vous pouvez saisir l’APDP.
                </p>
              </section>
              <section class="block" id="audience">
                <h2>Mesure d’audience</h2>
                <p>Aucun traceur publicitaire tiers n’est utilisé.</p>
              </section>
            </div>
          }
        </main>
      </div>

      <lv-site-footer />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .page {
      min-height: 100dvh;
      background: var(--lv-foam-50);
    }
    .wrap {
      width: 100%;
      max-width: 72rem;
      margin-inline: auto;
      padding-inline: 16px;
    }
    @media (min-width: 640px) {
      .wrap {
        padding-inline: 24px;
      }
    }
    .top {
      position: sticky;
      top: 0;
      z-index: 10;
      background: color-mix(in srgb, var(--lv-foam-50) 85%, transparent);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid color-mix(in srgb, var(--lv-teal-900) 10%, transparent);
    }
    .top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-block: 14px;
    }
    .top-links {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .back {
      font-weight: 600;
      text-decoration: none;
    }
    .back:hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .login {
      display: none;
      align-items: center;
      min-height: 44px;
      padding: 0 18px;
      border: 2px solid color-mix(in srgb, var(--lv-teal-900) 35%, transparent);
      border-radius: var(--lv-radius-pill);
      font-weight: 600;
      color: var(--lv-teal-900);
      text-decoration: none;
      transition: border-color var(--lv-duration) var(--lv-ease);
    }
    .login:hover {
      border-color: var(--lv-teal-900);
    }
    @media (min-width: 640px) {
      .login {
        display: inline-flex;
      }
    }
    .hero {
      padding-block: 56px 48px;
      background:
        radial-gradient(
          40rem 20rem at 90% 0%,
          color-mix(in srgb, var(--lv-aqua-400) 28%, transparent),
          transparent 70%
        ),
        linear-gradient(160deg, var(--lv-teal-700), var(--lv-teal-900));
      color: var(--lv-white);
    }
    .eyebrow {
      display: inline-block;
      margin: 0 0 14px;
      padding: 6px 14px;
      border-radius: var(--lv-radius-pill);
      background: color-mix(in srgb, var(--lv-white) 12%, transparent);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--lv-mint-100);
    }
    .hero h1 {
      margin: 0 0 12px;
      font-size: clamp(32px, 5vw, 48px);
      line-height: 1.1;
      color: var(--lv-white);
    }
    .intro {
      max-width: 40rem;
      margin: 0 0 28px;
      font-size: 17px;
      color: color-mix(in srgb, var(--lv-white) 88%, transparent);
    }
    .switch {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border-radius: var(--lv-radius-pill);
      background: color-mix(in srgb, var(--lv-white) 12%, transparent);
    }
    .switch a {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 16px;
      border-radius: var(--lv-radius-pill);
      color: var(--lv-white);
      font-weight: 600;
      text-decoration: none;
      transition: background-color var(--lv-duration) var(--lv-ease);
    }
    .switch a:hover {
      background: color-mix(in srgb, var(--lv-white) 14%, transparent);
    }
    .switch a.on {
      background: var(--lv-white);
      color: var(--lv-teal-900);
    }
    .layout {
      display: grid;
      gap: 24px;
      padding-block: 40px 72px;
    }
    @media (min-width: 1024px) {
      .layout {
        grid-template-columns: 15rem 1fr;
        gap: 48px;
        align-items: start;
      }
      .toc {
        position: sticky;
        top: 96px;
      }
    }
    .toc nav {
      padding: 20px;
      border-radius: 20px;
      background: var(--lv-white);
      box-shadow: var(--lv-shadow-card);
    }
    .toc-title {
      margin: 0 0 10px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--lv-teal-700);
    }
    .toc ol {
      display: grid;
      gap: 2px;
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: toc;
    }
    .toc li {
      counter-increment: toc;
    }
    .toc a {
      display: flex;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      color: var(--lv-ink-900);
      text-decoration: none;
      transition: background-color var(--lv-duration) var(--lv-ease);
    }
    .toc a::before {
      content: counter(toc, decimal-leading-zero);
      font: 600 13px/1.6 var(--lv-font-display);
      color: var(--lv-teal-700);
    }
    .toc a:hover {
      background: var(--lv-mint-100);
    }
    .content {
      display: grid;
      gap: 16px;
      min-width: 0;
      outline: none;
    }
    .note {
      margin: 0;
      padding: 14px 18px;
      border-left: 4px solid var(--lv-amber-500);
      border-radius: 14px;
      background: color-mix(in srgb, var(--lv-amber-500) 14%, var(--lv-white));
      color: var(--lv-ink-900);
    }
    .legal {
      display: grid;
      gap: 16px;
    }
    .block {
      scroll-margin-top: 96px;
      padding: 24px;
      border-radius: 20px;
      background: var(--lv-white);
      box-shadow: 0 1px 0 color-mix(in srgb, var(--lv-teal-900) 8%, transparent);
      transition: box-shadow var(--lv-duration) var(--lv-ease);
    }
    .block:hover,
    .block:target {
      box-shadow: var(--lv-shadow-card);
    }
    .block:target {
      outline: 2px solid var(--lv-aqua-400);
      outline-offset: 2px;
    }
    @media (min-width: 640px) {
      .block {
        padding: 28px 32px;
      }
    }
    .block h2 {
      margin: 0 0 12px;
      font-size: 20px;
    }
    .block p,
    .block ul {
      margin: 0 0 10px;
    }
    .block > :last-child {
      margin-bottom: 0;
    }
    .block ul {
      display: grid;
      gap: 8px;
      padding-left: 20px;
      list-style: disc;
    }
    .block li::marker {
      color: var(--lv-teal-700);
    }
    @media (prefers-reduced-motion: reduce) {
      .switch a,
      .toc a,
      .block,
      .login {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  /** Fourni par les données de la route. */
  readonly page = input<'mentions' | 'confidentialite'>('mentions');

  /** Sommaire : identifiants des sections du texte ci-dessus. */
  protected readonly sections = computed(() =>
    this.page() === 'mentions'
      ? [
          { id: 'editeur', title: 'Éditeur du site' },
          { id: 'contact', title: 'Contact' },
          { id: 'hebergement', title: 'Hébergement' },
          { id: 'propriete', title: 'Propriété intellectuelle' },
        ]
      : [
          { id: 'cadre', title: 'Cadre' },
          { id: 'roles', title: 'Qui fait quoi' },
          { id: 'donnees', title: 'Données collectées' },
          { id: 'conservation', title: 'Durées de conservation' },
          { id: 'localisation', title: 'Localisation des données' },
          { id: 'securite', title: 'Sécurité' },
          { id: 'droits', title: 'Vos droits' },
          { id: 'audience', title: 'Mesure d’audience' },
        ],
  );
}
