import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { type PublicConfig, type PublicPlan, whatsappUrl } from '@lavio/shared';
import { PublicApi } from '../../core/api/public-api';
import { ApiError } from '../../core/http/api';
import { formatXaf } from '../../shared/format/format';
import { Logo } from '../../shared/ui/logo/logo';
import { SiteFooter } from '../../shared/ui/site-footer/site-footer';

interface Step {
  label: string;
  /** Classe de couleur du statut (docs/08, « Couleurs des statuts »). */
  tone: string;
}

interface Feature {
  title: string;
  text: string;
  icon: string;
}

/** Téléphone : chiffres seulement (le serveur normalise ensuite). */
const PHONE = /^\+?[\d\s.-]{8,20}$/;

/**
 * Landing (docs/07), prérendue au build : promesse, problème, fonctionnalités, déroulé, bloc
 * responsable, tarifs lus depuis l'API, questions, formulaire de contact. Le numéro WhatsApp et
 * les prix ne sont jamais écrits en dur : ils sont chargés dans le navigateur.
 */
@Component({
  selector: 'lv-home',
  imports: [RouterLink, Logo, ReactiveFormsModule, SiteFooter],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly api = inject(PublicApi);

  protected readonly steps: Step[] = [
    { label: 'Reçu', tone: 'bg-mint-100 text-teal-900' },
    { label: 'En traitement', tone: 'bg-teal-700 text-white' },
    { label: 'Repassage', tone: 'bg-amber-500 text-ink-900' },
    { label: 'Contrôle qualité', tone: 'bg-ink-900 text-white' },
    { label: 'Prêt', tone: 'bg-aqua-400 text-ink-900' },
    { label: 'Retiré', tone: 'bg-teal-900 text-white' },
  ];

  protected readonly problems = [
    {
      title: 'Cahiers et tickets perdus',
      text: 'Le client revient, personne ne retrouve son dépôt.',
    },
    {
      title: 'Une caisse qui ne tombe pas juste',
      text: 'Espèces, Mobile Money, crédits : l’écart se découvre trop tard.',
    },
    {
      title: 'Un stock qui s’épuise sans prévenir',
      text: 'La lessive manque le jour de la grosse tournée.',
    },
  ];

  protected readonly features: Feature[] = [
    {
      title: 'Dépôts et tickets',
      text: 'Ticket imprimé en moins de 90 secondes, avec numéro écrit et QR code. Étiquette par vêtement.',
      icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
    },
    {
      title: 'Suivi de chaque vêtement',
      text: 'Reçu, en traitement, repassage, contrôle qualité, prêt, retiré. Les retards ressortent en rouge.',
      icon: 'M5 6h14M5 12h14M5 18h9M3 6h.01M3 12h.01M3 18h.01',
    },
    {
      title: 'Caisse et Mobile Money',
      text: 'Espèces, Orange Money, MTN MoMo avec référence, crédit client. Clôture avec comptage et écart.',
      icon: 'M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v4M18 10v4',
    },
    {
      title: 'Stock et alertes',
      text: 'Entrées, sorties, inventaire validé, coût moyen. Une alerte quand un produit passe sous le seuil.',
      icon: 'M4 8 12 4l8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
    },
    {
      title: 'Comptabilité de gestion',
      text: 'Dépenses, trésorerie, créances et dettes, résultat simplifié. Exports Excel et CSV.',
      icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    },
    {
      title: 'Pilotage sur téléphone',
      text: 'Tableau de bord en direct, validations en un geste, alertes sur votre téléphone.',
      icon: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
    },
  ];

  /** Chiffres clés : des faits du produit, jamais des statistiques inventées. */
  protected readonly facts = [
    { value: '< 90 s', label: 'pour enregistrer un dépôt et imprimer le ticket' },
    { value: '6', label: 'statuts suivis pour chaque vêtement, du dépôt au retrait' },
    { value: '5', label: 'modes de paiement : espèces, Orange Money, MTN MoMo, virement, chèque' },
  ];

  /** Points forts listés à côté des chiffres. */
  protected readonly highlights = [
    {
      title: 'Ticket et QR code',
      text: 'Numéro écrit en toutes lettres, étiquette par vêtement, impression 80 mm.',
    },
    {
      title: 'Caisse qui tombe juste',
      text: 'Comptage, écart expliqué, clôture validée par la responsable.',
    },
    {
      title: 'Coupure de réseau sans perte',
      text: 'Les saisies partent dès le retour de la connexion, sans doublon.',
    },
  ];

  protected readonly faq = [
    {
      q: 'Faut-il installer un logiciel ?',
      a: 'Non. Lavio s’ouvre dans le navigateur et s’installe comme une application sur le PC et le téléphone.',
    },
    {
      q: 'Faut-il internet ?',
      a: 'Oui, une connexion est nécessaire. Une coupure brève ne fait pas perdre vos saisies : elles partent dès le retour du réseau.',
    },
    {
      q: 'Comment payer l’abonnement ?',
      a: 'Vous contactez notre service client sur WhatsApp ; vous pouvez régler en espèces, par Orange Money, MTN MoMo ou virement.',
    },
    { q: 'Combien d’utilisateurs ?', a: 'Deux utilisateurs sont inclus ; vous pouvez en ajouter.' },
    {
      q: 'Mes données sont-elles protégées ?',
      a: 'Oui. Chaque pressing a un espace isolé, les échanges sont chiffrés et les actions sensibles sont tracées.',
    },
    {
      q: 'Puis-je imprimer mes tickets ?',
      a: 'Oui, sur une imprimante de tickets 80 mm, avec le numéro et un QR code.',
    },
    {
      q: 'Que se passe-t-il si mon abonnement expire ?',
      a: 'Vous gardez la consultation et l’export de vos données ; contactez-nous pour renouveler.',
    },
  ];

  /** Captures réelles de l'application (pressing de démonstration, données fictives). */
  protected readonly shots = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      alt: 'Tableau de bord de Lavio : chiffre d’affaires du mois, encaissements, dépôts en cours, en retard et stock bas.',
      caption: 'Chiffre d’affaires, encaissements, retards et alertes en un coup d’œil.',
    },
    {
      id: 'deposits',
      label: 'Dépôts',
      alt: 'Liste des dépôts de Lavio avec numéro de ticket, client, dates, statut, total et reste à payer.',
      caption:
        'Chaque dépôt retrouvé par son numéro de ticket, avec son statut et son reste à payer.',
    },
    {
      id: 'cash',
      label: 'Caisse',
      alt: 'Écran de caisse de Lavio : session ouverte, espèces attendues et journal des encaissements.',
      caption: 'Ouverture, journal des encaissements et clôture avec écart expliqué.',
    },
    {
      id: 'stock',
      label: 'Stock',
      alt: 'Écran de stock de Lavio : produits, quantités, seuils, coût moyen et alerte de stock bas.',
      caption: 'Quantités, coût moyen et alertes avant la rupture.',
    },
    {
      id: 'accounting',
      label: 'Comptabilité',
      alt: 'Trésorerie de Lavio : soldes de la caisse, de la banque, de MTN MoMo et d’Orange Money.',
      caption: 'Trésorerie par compte : caisse, banque, MTN MoMo et Orange Money.',
    },
  ];
  /** Onglet d'aperçu affiché. */
  protected readonly shot = signal(0);

  /** Flèches, Début et Fin entre les onglets (motif « tabs » de l'ARIA APG). */
  protected tabKey(event: KeyboardEvent, index: number): void {
    const last = this.shots.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % (last + 1)
        : event.key === 'ArrowLeft'
          ? (index - 1 + last + 1) % (last + 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    this.shot.set(next);
    const tabs = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
    tabs?.item(next).focus();
  }

  /** Ce que comprend l'abonnement (docs/01, docs/07). */
  protected readonly perks = [
    {
      title: 'Mise en place guidée',
      text: 'Nous créons votre espace, votre catalogue et vos tarifs, puis formons votre équipe.',
      icon: 'M4 9 5 4h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6',
    },
    {
      title: 'Assistance sur WhatsApp',
      text: 'Une question au comptoir ? Notre service client vous répond directement.',
      icon: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
    },
    {
      title: 'Vos données vous appartiennent',
      text: 'Espace isolé, échanges chiffrés, export de vos données à tout moment.',
      icon: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
    },
  ];

  protected readonly config = signal<PublicConfig | null>(null);

  /** Lien WhatsApp, ou repli vers le formulaire tant que la configuration n'est pas chargée. */
  protected readonly whatsapp = computed(() => {
    const c = this.config();
    return c?.whatsappNumber ? whatsappUrl(c.whatsappNumber, c.whatsappDefaultMessage) : null;
  });
  protected readonly plans = computed(() => this.config()?.plans ?? []);
  /** Démonstration publique (identifiants fictifs publiés par l'API), ou `null`. */
  protected readonly demo = computed(() => this.config()?.demo ?? null);
  /** Dernière valeur copiée (« email-0 », « password-1 »…), pour l'accusé « Copié ». */
  protected readonly copied = signal<string | null>(null);
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  protected async copy(value: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(key);
      clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => this.copied.set(null), 2000);
    } catch {
      this.copied.set(null);
    }
  }

  protected planLink(plan: PublicPlan): string | null {
    const c = this.config();
    return c?.whatsappNumber
      ? whatsappUrl(c.whatsappNumber, `${c.whatsappDefaultMessage} Plan ${plan.name}.`)
      : null;
  }

  protected price(value: number | null): string {
    return value === null ? 'Tarif sur demande' : formatXaf(value);
  }

  // Formulaire de contact
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    pressingName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE)]],
    city: ['', Validators.maxLength(80)],
    message: ['', Validators.maxLength(1000)],
    consent: [false, Validators.requiredTrue],
    website: [''],
  });
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  constructor() {
    // Navigateur seulement : le prérendu reste statique, sans appel à l'API.
    afterNextRender(() => {
      this.api.config().then(
        (c) => this.config.set(c),
        () => this.config.set(null),
      );
    });
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    const v = this.form.getRawValue();
    try {
      await this.api.createLead({
        name: v.name.trim(),
        pressingName: v.pressingName.trim(),
        phone: v.phone.trim(),
        city: v.city.trim() || undefined,
        message: v.message.trim() || undefined,
        consent: v.consent,
        website: v.website || undefined,
      });
      this.sent.set(true);
      this.form.reset();
      this.submitted.set(false);
    } catch (e) {
      this.formError.set(
        e instanceof ApiError
          ? e.message
          : 'Envoi impossible pour le moment. Réessayez ou écrivez-nous sur WhatsApp.',
      );
    } finally {
      this.sending.set(false);
    }
  }
}
