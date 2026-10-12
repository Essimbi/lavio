import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import type { IconName } from '../../shared/ui/icon/icon';

/** Écran d'attente d'un module pas encore livré (remplacé phase après phase). */
@Component({
  selector: 'lv-module-placeholder',
  imports: [EmptyState],
  template: `
    <h1 class="mb-6 text-[28px]">{{ heading() }}</h1>
    <lv-empty-state
      [icon]="icon()"
      [title]="heading() + ' arrive bientôt'"
      message="Ce module est en cours de préparation. Il apparaîtra ici dès sa mise en service."
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulePlaceholder {
  /** Fourni par les données de la route (withComponentInputBinding). */
  readonly heading = input('Module');
  readonly icon = input<IconName>('layers');
}
