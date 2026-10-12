import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { PageMeta } from '@lavio/shared';

/** Pagination serveur (docs/08, DataTable). */
@Component({
  selector: 'lv-pager',
  template: `
    @if (meta(); as m) {
      <nav class="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
        <span
          >{{ m.total }} résultat{{ m.total > 1 ? 's' : '' }} · page {{ m.page }} sur
          {{ pages() }}</span
        >
        <span class="flex gap-2">
          <button
            type="button"
            class="lv-link-button"
            [disabled]="m.page <= 1"
            (click)="page.emit(m.page - 1)"
          >
            Précédente
          </button>
          <button
            type="button"
            class="lv-link-button"
            [disabled]="m.page >= pages()"
            (click)="page.emit(m.page + 1)"
          >
            Suivante
          </button>
        </span>
      </nav>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pager {
  readonly meta = input<PageMeta | null>(null);
  readonly page = output<number>();
  protected readonly pages = computed(() => {
    const m = this.meta();
    return m ? Math.max(1, Math.ceil(m.total / m.pageSize)) : 1;
  });
}
