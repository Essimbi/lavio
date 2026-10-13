import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../../shared/ui/logo/logo';

/**
 * Mentions légales et politique de confidentialité (docs/07, docs/10). Structure définitive,
 * contenu provisoire clairement signalé : les informations marquées [●] sont à fournir.
 */
@Component({
  selector: 'lv-legal-page',
  imports: [RouterLink, Logo],
  template: `
    <div class="min-h-dvh bg-foam-50">
      <header class="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <a routerLink="/" aria-label="Lavio, accueil"><lv-logo [width]="104" /></a>
        <a routerLink="/" class="font-semibold">Retour à l’accueil</a>
      </header>
      <main class="mx-auto max-w-3xl px-4 pb-16">
        <p class="lv-alert mb-6" role="note">
          <strong>Texte provisoire.</strong> Les informations marquées [●] sont à compléter et le
          texte doit être validé par un conseil juridique avant la mise en service.
        </p>
        @if (page() === 'mentions') {
          <h1 class="mb-6 text-[32px]">Mentions légales</h1>
          <section class="legal">
            <h2>Éditeur du site</h2>
            <p>
              Lavio, édité par [● raison sociale], [● forme juridique] au capital de [●] FCFA,
              immatriculée au RCCM sous le numéro [●], NIU [●], dont le siège est situé [● adresse],
              Cameroun.
            </p>
            <p>Directeur de la publication : [● nom].</p>
            <h2>Contact</h2>
            <p>
              Service client : par WhatsApp (numéro indiqué sur la page d’accueil) ou par courriel à
              [● adresse de support].
            </p>
            <h2>Hébergement</h2>
            <p>
              Application hébergée par [● hébergeur, adresse, région d’hébergement des données].
              Voir la <a routerLink="/confidentialite">politique de confidentialité</a> pour la
              localisation des données.
            </p>
            <h2>Propriété intellectuelle</h2>
            <p>
              La marque Lavio, son logo et l’ensemble des contenus du site sont protégés. Toute
              reproduction sans autorisation est interdite.
            </p>
          </section>
        } @else {
          <h1 class="mb-6 text-[32px]">Politique de confidentialité</h1>
          <section class="legal">
            <h2>Cadre</h2>
            <p>
              Les données personnelles sont traitées conformément à la loi n° 2024/017 du 23
              décembre 2024 relative à la protection des données à caractère personnel et à la loi
              n° 2010/012 relative à la cybersécurité et à la cybercriminalité.
            </p>
            <h2>Qui fait quoi</h2>
            <p>
              Chaque pressing utilisateur de Lavio est responsable du traitement des données de ses
              clients. Lavio agit comme sous-traitant pour le compte du pressing, dans le cadre d’un
              accord de sous-traitance annexé aux conditions d’utilisation [●].
            </p>
            <p>Pour le formulaire de contact de ce site, Lavio est responsable du traitement.</p>
            <h2>Données collectées</h2>
            <ul>
              <li>
                Formulaire de contact : nom, nom du pressing, téléphone, ville et message
                facultatifs, pour vous recontacter.
              </li>
              <li>
                Clients des pressings : nom, téléphone, adresse facultative et préférences, pour la
                gestion des dépôts.
              </li>
              <li>
                Aucune pièce d’identité ni donnée bancaire n’est collectée. Lavio enregistre des
                paiements mais ne détient ni ne transfère aucun fonds.
              </li>
            </ul>
            <h2>Durées de conservation</h2>
            <p>
              Demandes de contact : [● durée]. Pièces comptables : au moins [● 10] ans. À la fin
              d’un abonnement, les données du pressing lui sont exportées sous 30 jours puis
              supprimées ou anonymisées selon l’accord.
            </p>
            <h2>Localisation des données</h2>
            <p>
              Les données sont hébergées [● région]. Tout transfert hors du Cameroun respecte les
              conditions de la loi et, le cas échéant, l’autorisation de l’Autorité de protection
              des données à caractère personnel (APDP) [●].
            </p>
            <h2>Sécurité</h2>
            <p>
              Espace isolé par pressing, échanges chiffrés (HTTPS), mots de passe protégés, actions
              sensibles tracées.
            </p>
            <h2>Vos droits</h2>
            <p>
              Vous pouvez demander l’accès, la rectification, l’effacement ou l’anonymisation de vos
              données en contactant le pressing concerné, ou Lavio à [● adresse de contact]. Vous
              pouvez saisir l’APDP.
            </p>
            <h2>Mesure d’audience</h2>
            <p>Aucun traceur publicitaire tiers n’est utilisé.</p>
          </section>
        }
      </main>
    </div>
  `,
  styles: `
    .legal h2 {
      margin: 28px 0 8px;
      font-size: 20px;
    }
    .legal p,
    .legal ul {
      margin: 0 0 10px;
    }
    .legal ul {
      padding-left: 20px;
      list-style: disc;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  /** Fourni par les données de la route. */
  readonly page = input<'mentions' | 'confidentialite'>('mentions');
}
