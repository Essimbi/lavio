import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CatalogEntryDto } from '@lavio/shared';
import { type CatalogKind, PressingApi } from '../../../core/api/pressing-api';
import { FrDateTimePipe, XafPipe } from '../../../shared/format/format';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { errorMessage, Toast } from '../../../shared/ui/toast/toast.service';

interface Cell {
  itemTypeId: string;
  serviceId: string;
}

/**
 * Catalogue et tarifs (module 6) : articles, services, grille tarifaire datée.
 * Changer un prix crée une nouvelle ligne datée ; l'historique reste consultable.
 */
@Component({
  selector: 'lv-catalog-page',
  imports: [FormsModule, PageHeader, XafPipe, FrDateTimePipe],
  template: `
    <lv-page-header
      heading="Catalogue et tarifs"
      subtitle="Les prix sont TTC, en FCFA. Un dépôt garde toujours le prix du jour où il a été enregistré."
    />

    <div class="grid gap-6 lg:grid-cols-2">
      @for (kind of kinds; track kind.key) {
        <section class="lv-card">
          <h2 class="mb-3 text-xl">{{ kind.title }}</h2>
          <form class="mb-3 flex gap-2" (ngSubmit)="create(kind.key)">
            <label class="sr-only" [for]="'new-' + kind.key">Nouveau {{ kind.singular }}</label>
            <input
              class="lv-input"
              [id]="'new-' + kind.key"
              [name]="'new-' + kind.key"
              [placeholder]="'Nouveau ' + kind.singular"
              [ngModel]="draft()[kind.key]"
              (ngModelChange)="setDraft(kind.key, $event)"
            />
            <button type="submit" class="lv-secondary">Ajouter</button>
          </form>
          <ul class="flex flex-wrap gap-2" role="list">
            @for (
              e of (kind.key === 'item-types' ? types : services).hasValue()
                ? (kind.key === 'item-types' ? types : services).value()
                : [];
              track e.id
            ) {
              <li>
                <button
                  type="button"
                  class="entry"
                  [class.is-off]="!e.isActive"
                  (click)="toggle(kind.key, e)"
                  [attr.aria-pressed]="e.isActive"
                  [title]="e.isActive ? 'Archiver' : 'Réactiver'"
                >
                  {{ e.name }}{{ e.isActive ? '' : ' (archivé)' }}
                </button>
              </li>
            }
          </ul>
          <p class="mt-2 text-sm text-ink-900/75">Cliquer sur un nom l’archive ou le réactive.</p>
        </section>
      }
    </div>

    <section class="mt-6">
      <h2 class="mb-1 text-xl">Grille tarifaire</h2>
      <p class="mb-3 text-sm">
        Saisissez un prix puis validez avec Entrée. Une case vide signifie « pas de tarif ».
      </p>
      <div class="lv-table-wrap">
        <table class="lv-table">
          <caption class="sr-only">
            Prix par article et par service
          </caption>
          <thead>
            <tr>
              <th scope="col">Article</th>
              @for (s of activeServices(); track s.id) {
                <th scope="col" class="num">{{ s.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (t of activeTypes(); track t.id) {
              <tr>
                <th scope="row" class="text-left">{{ t.name }}</th>
                @for (s of activeServices(); track s.id) {
                  <td class="num">
                    <input
                      class="cell tabular"
                      type="number"
                      min="0"
                      step="50"
                      inputmode="numeric"
                      [attr.aria-label]="'Prix ' + t.name + ', ' + s.name"
                      [value]="price(t.id, s.id) ?? ''"
                      (focus)="selected.set({ itemTypeId: t.id, serviceId: s.id })"
                      (keydown.enter)="save(t.id, s.id, $event)"
                      (blur)="save(t.id, s.id, $event)"
                    />
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (selected(); as cell) {
      <section class="lv-card mt-6" aria-live="polite">
        <h2 class="mb-2 text-lg">Historique · {{ name(cell) }}</h2>
        @if (history.hasValue()) {
          <ol class="grid gap-1 text-sm" role="list">
            @for (h of history.value(); track h.id) {
              <li class="tabular">
                <strong>{{ h.amountXaf | xaf }}</strong> depuis le {{ h.validFrom | frDateTime }}
                @if (h.validTo) {
                  jusqu’au {{ h.validTo | frDateTime }}
                } @else {
                  (en vigueur)
                }
              </li>
            } @empty {
              <li>Aucun tarif pour l’instant.</li>
            }
          </ol>
        }
      </section>
    }
  `,
  styles: `
    .entry {
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid var(--lv-mint-100);
      border-radius: var(--lv-radius-pill);
      background: var(--lv-mint-100);
      color: var(--lv-teal-900);
      font: 600 14px var(--lv-font-body);
      cursor: pointer;
    }
    .entry.is-off {
      background: var(--lv-white);
      color: var(--lv-ink-900);
      text-decoration: line-through;
    }
    .cell {
      width: 110px;
      min-height: 40px;
      padding: 6px 8px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: var(--lv-foam-50);
      text-align: right;
      font: inherit;
    }
    .cell:focus {
      border-color: var(--lv-teal-700);
      background: var(--lv-white);
      outline: 2px solid var(--lv-aqua-400);
      outline-offset: 1px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  private readonly api = inject(PressingApi);
  private readonly toast = inject(Toast);
  protected readonly kinds: { key: CatalogKind; title: string; singular: string }[] = [
    { key: 'item-types', title: 'Articles', singular: 'article' },
    { key: 'services', title: 'Services', singular: 'service' },
  ];
  protected readonly types = resource({ loader: () => this.api.catalog('item-types') });
  protected readonly services = resource({ loader: () => this.api.catalog('services') });
  protected readonly current = resource({ loader: () => this.api.prices() });
  protected readonly draft = signal<Record<CatalogKind, string>>({
    'item-types': '',
    services: '',
  });
  protected readonly selected = signal<Cell | null>(null);
  protected readonly history = resource({
    params: () => this.selected() ?? undefined,
    loader: ({ params }) => this.api.prices(params),
  });

  protected readonly activeTypes = computed(() =>
    this.types.hasValue() ? this.types.value().filter((t) => t.isActive) : [],
  );
  protected readonly activeServices = computed(() =>
    this.services.hasValue() ? this.services.value().filter((s) => s.isActive) : [],
  );
  private readonly priceMap = computed(
    () =>
      new Map(
        (this.current.hasValue() ? this.current.value() : []).map((p) => [
          `${p.itemTypeId}:${p.serviceId}`,
          p.amountXaf,
        ]),
      ),
  );

  protected readonly price = (itemTypeId: string, serviceId: string) =>
    this.priceMap().get(`${itemTypeId}:${serviceId}`) ?? null;
  protected readonly name = (cell: Cell) =>
    `${this.activeTypes().find((t) => t.id === cell.itemTypeId)?.name ?? ''} · ${this.activeServices().find((s) => s.id === cell.serviceId)?.name ?? ''}`;

  protected setDraft(kind: CatalogKind, value: string): void {
    this.draft.update((d) => ({ ...d, [kind]: value }));
  }

  private reloadCatalog(kind: CatalogKind): void {
    if (kind === 'item-types') this.types.reload();
    else this.services.reload();
  }

  protected async create(kind: CatalogKind): Promise<void> {
    const name = this.draft()[kind].trim();
    if (!name) return;
    try {
      await this.api.createCatalog(kind, name);
      this.setDraft(kind, '');
      this.reloadCatalog(kind);
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async toggle(kind: CatalogKind, entry: CatalogEntryDto): Promise<void> {
    try {
      await this.api.updateCatalog(kind, entry.id, { isActive: !entry.isActive });
      this.reloadCatalog(kind);
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async save(itemTypeId: string, serviceId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.value.trim() === '') return;
    const amount = Math.floor(Number(input.value));
    if (!Number.isFinite(amount) || amount < 0 || amount === this.price(itemTypeId, serviceId))
      return;
    try {
      await this.api.setPrice({ itemTypeId, serviceId, amountXaf: amount });
      this.toast.success('Tarif enregistré.');
      this.current.reload();
      this.history.reload();
    } catch (e) {
      this.toast.error(new Error(errorMessage(e)));
    }
  }
}
