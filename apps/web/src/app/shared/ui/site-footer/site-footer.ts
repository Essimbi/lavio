import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../logo/logo';

/** Pied de page des pages publiques (landing, mentions légales, confidentialité). */
@Component({
  selector: 'lv-site-footer',
  imports: [RouterLink, Logo],
  template: `
    <footer class="footer">
      <div class="glow" aria-hidden="true"></div>
      <div class="inner">
        <div class="brand-col">
          <a routerLink="/" aria-label="Lavio, accueil"
            ><lv-logo variant="inverse" [width]="112"
          /></a>
          <p class="tagline">
            Le logiciel qui garde votre pressing sous contrôle : dépôts, caisse, stock et tournées.
          </p>
          @if (whatsappUrl(); as wa) {
            <a class="wa" [href]="wa" target="_blank" rel="noopener">
              <span class="wa-dot" aria-hidden="true"></span>
              Service client sur WhatsApp
              @if (whatsappNumber(); as n) {
                <span class="wa-num">+{{ n }}</span>
              }
            </a>
          }
        </div>

        <nav class="col" aria-label="Découvrir Lavio">
          <h2>Découvrir</h2>
          <a routerLink="/" fragment="fonctionnalites">Fonctionnalités</a>
          <a routerLink="/" fragment="comment">Comment ça marche</a>
          <a routerLink="/" fragment="tarifs">Tarifs</a>
          <a routerLink="/" fragment="questions">Questions fréquentes</a>
        </nav>

        <nav class="col" aria-label="Accès">
          <h2>Accès</h2>
          <a routerLink="/login">Se connecter</a>
          @if (demo()) {
            <a routerLink="/" fragment="demo">Essayer la démo</a>
          }
          <a routerLink="/" fragment="contact">Être recontacté</a>
        </nav>

        <nav class="col" aria-label="Informations légales">
          <h2>Informations</h2>
          <a routerLink="/mentions-legales">Mentions légales</a>
          <a routerLink="/confidentialite">Confidentialité</a>
        </nav>
      </div>
      <div class="bottom">
        <p>© {{ year }} Lavio · Le pressing, sous contrôle.</p>
        <p>Données isolées par pressing · Échanges chiffrés</p>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: block;
    }
    .footer {
      position: relative;
      overflow: hidden;
      background: var(--lv-teal-900);
      color: var(--lv-white);
    }
    .glow {
      position: absolute;
      inset: -40% -10% auto auto;
      width: 36rem;
      height: 36rem;
      border-radius: 50%;
      background: radial-gradient(
        closest-side,
        color-mix(in srgb, var(--lv-aqua-400) 28%, transparent),
        transparent
      );
      pointer-events: none;
    }
    .inner,
    .bottom {
      position: relative;
      width: 100%;
      max-width: 72rem;
      margin-inline: auto;
      padding-inline: 16px;
    }
    .inner {
      display: grid;
      gap: 36px;
      padding-block: 56px 40px;
    }
    @media (min-width: 640px) {
      .inner,
      .bottom {
        padding-inline: 24px;
      }
      .inner {
        grid-template-columns: repeat(3, 1fr);
      }
      .brand-col {
        grid-column: 1 / -1;
      }
    }
    @media (min-width: 1024px) {
      .inner {
        grid-template-columns: 1.6fr repeat(3, 1fr);
      }
      .brand-col {
        grid-column: auto;
      }
    }
    .tagline {
      max-width: 22rem;
      margin: 16px 0 20px;
      color: color-mix(in srgb, var(--lv-white) 82%, transparent);
    }
    .wa {
      display: inline-grid;
      grid-template-columns: auto auto;
      align-items: center;
      gap: 2px 10px;
      min-height: 44px;
      padding: 10px 20px;
      border: 1px solid color-mix(in srgb, var(--lv-white) 28%, transparent);
      border-radius: 18px;
      color: var(--lv-white);
      font-weight: 600;
      text-decoration: none;
      transition:
        background-color var(--lv-duration) var(--lv-ease),
        border-color var(--lv-duration) var(--lv-ease);
    }
    .wa:hover {
      border-color: var(--lv-white);
      background: color-mix(in srgb, var(--lv-white) 10%, transparent);
    }
    .wa-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--lv-aqua-400);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--lv-aqua-400) 30%, transparent);
    }
    .wa-num {
      grid-column: 2;
      font-weight: 500;
      color: var(--lv-mint-100);
    }
    .col {
      display: grid;
      align-content: start;
      gap: 10px;
    }
    .col h2 {
      margin: 0 0 6px;
      font: 600 13px/1.2 var(--lv-font-body);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--lv-mint-100);
    }
    .col a {
      justify-self: start;
      padding-block: 2px;
      color: var(--lv-white);
      text-decoration: none;
      background: linear-gradient(var(--lv-aqua-400), var(--lv-aqua-400)) 0 100% / 0 2px no-repeat;
      transition: background-size var(--lv-duration) var(--lv-ease);
    }
    .col a:hover,
    .col a:focus-visible {
      background-size: 100% 2px;
    }
    .bottom {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px 24px;
      padding-block: 20px 28px;
      border-top: 1px solid color-mix(in srgb, var(--lv-white) 16%, transparent);
      font-size: 14px;
      color: color-mix(in srgb, var(--lv-white) 80%, transparent);
    }
    .bottom p {
      margin: 0;
    }
    @media (max-width: 639px) {
      .bottom {
        padding-bottom: 96px; /* place pour le bouton WhatsApp flottant */
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .wa,
      .col a {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  /** Lien WhatsApp du service client (configuration publique), absent tant qu'elle n'est pas lue. */
  readonly whatsappUrl = input<string | null>(null);
  readonly whatsappNumber = input<string | null>(null);
  /** Démonstration publique ouverte. */
  readonly demo = input(false);

  protected readonly year = new Date().getFullYear();
}
