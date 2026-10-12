import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'lv-not-found',
  imports: [RouterLink, EmptyState],
  template: `
    <main class="flex min-h-dvh items-center justify-center px-4">
      <lv-empty-state
        icon="track"
        title="Page introuvable"
        message="Cette adresse ne correspond à aucune page. Vérifiez le lien ou revenez à l'accueil."
      >
        <a routerLink="/" class="font-semibold">Retour à l'accueil</a>
      </lv-empty-state>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
