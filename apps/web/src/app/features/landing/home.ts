import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../../shared/ui/logo/logo';

interface Step {
  label: string;
  /** Classe de couleur du statut (docs/08, « Couleurs des statuts »). */
  tone: string;
}

/**
 * Page d'accueil provisoire (phase 0), prérendue au build.
 * La landing complète (docs/07) arrive en phase 6.
 */
@Component({
  selector: 'lv-home',
  imports: [RouterLink, Logo],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  /** Le parcours d'un vêtement, du dépôt au retrait : une vraie séquence. */
  protected readonly steps: Step[] = [
    { label: 'Reçu', tone: 'bg-mint-100 text-teal-900' },
    { label: 'En traitement', tone: 'bg-teal-700 text-white' },
    { label: 'Repassage', tone: 'bg-amber-500 text-ink-900' },
    { label: 'Contrôle qualité', tone: 'bg-ink-900 text-white' },
    { label: 'Prêt', tone: 'bg-aqua-400 text-ink-900' },
    { label: 'Retiré', tone: 'bg-teal-900 text-white' },
  ];

  protected readonly year = new Date().getFullYear();
}
