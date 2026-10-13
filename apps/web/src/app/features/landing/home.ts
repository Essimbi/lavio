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
  imports: [RouterLink, Logo, ReactiveFormsModule],
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

  protected readonly year = new Date().getFullYear();
  protected readonly config = signal<PublicConfig | null>(null);

  /** Lien WhatsApp, ou repli vers le formulaire tant que la configuration n'est pas chargée. */
  protected readonly whatsapp = computed(() => {
    const c = this.config();
    return c?.whatsappNumber ? whatsappUrl(c.whatsappNumber, c.whatsappDefaultMessage) : null;
  });
  protected readonly plans = computed(() => this.config()?.plans ?? []);

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
