import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

/** Écran vide : dit ce qui se trouvera ici et, si possible, quoi faire ensuite. */
@Component({
  selector: 'lv-empty-state',
  imports: [Icon],
  template: `
    <section
      class="mx-auto flex max-w-md flex-col items-center gap-3 rounded-block bg-white px-6 py-10 text-center shadow-card"
    >
      <span class="grid size-14 place-items-center rounded-full bg-mint-100 text-teal-900">
        <lv-icon [name]="icon()" [size]="28" />
      </span>
      <h2 class="text-xl">{{ title() }}</h2>
      <p class="text-[15px] text-ink-900/80">{{ message() }}</p>
      <ng-content />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly icon = input<IconName>('layers');
}
