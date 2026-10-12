import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Logo } from '../../shared/ui/logo/logo';

/** Écran de connexion : provisoire en phase 0, formulaire complet en phase 1. */
@Component({
  selector: 'lv-login',
  imports: [RouterLink, EmptyState, Logo],
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <lv-logo [width]="140" />
      <lv-empty-state
        icon="key"
        title="Connexion bientôt disponible"
        message="La connexion à votre espace pressing sera ouverte dans la prochaine version."
      >
        <a routerLink="/" class="font-semibold">Retour à l'accueil</a>
      </lv-empty-state>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {}
