import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UtilityType } from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { FrDatePipe, todayInput } from '../../../shared/format/format';
import { QtyPipe, UTILITY_TYPE_LABELS } from '../../../shared/format/labels';
import { Toast } from '../../../shared/ui/toast/toast.service';

/** Relevés mensuels des compteurs d'eau et d'électricité (données utiles à la V2). */
@Component({
  selector: 'lv-utilities-panel',
  imports: [FormsModule, FrDatePipe, QtyPipe],
  template: `
    <form
      class="lv-card mb-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr_2fr_auto] md:items-end"
      (ngSubmit)="add()"
      aria-label="Nouveau relevé"
    >
      <div>
        <label class="lv-label" for="ut-type">Compteur</label>
        <select
          id="ut-type"
          class="lv-select"
          name="type"
          [ngModel]="type()"
          (ngModelChange)="type.set($event)"
        >
          @for (t of types; track t) {
            <option [value]="t">{{ labels[t] }}</option>
          }
        </select>
      </div>
      <div>
        <label class="lv-label" for="ut-date">Date du relevé</label>
        <input
          id="ut-date"
          class="lv-input"
          type="date"
          name="date"
          [ngModel]="date()"
          (ngModelChange)="date.set($event)"
        />
      </div>
      <div>
        <label class="lv-label" for="ut-value">Index</label>
        <input
          id="ut-value"
          class="lv-input tabular"
          type="number"
          min="0"
          step="0.001"
          name="value"
          [ngModel]="value()"
          (ngModelChange)="value.set($event)"
        />
      </div>
      <div>
        <label class="lv-label" for="ut-note">Note</label>
        <input
          id="ut-note"
          class="lv-input"
          maxlength="500"
          name="note"
          [ngModel]="note()"
          (ngModelChange)="note.set($event)"
        />
      </div>
      <button type="submit" class="lv-primary" [disabled]="value() === null || !date()">
        Enregistrer
      </button>
    </form>
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Relevés de compteurs
        </caption>
        <thead>
          <tr>
            <th scope="col">Compteur</th>
            <th scope="col">Date</th>
            <th scope="col" class="num">Index</th>
            <th scope="col" class="num">Consommation</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          @for (r of list.hasValue() ? list.value() : []; track r.id) {
            <tr>
              <td>{{ labels[r.type] }}</td>
              <td>{{ r.readingDate | frDate }}</td>
              <td class="num">{{ r.value | qty }}</td>
              <td class="num">{{ r.consumption | qty }}</td>
              <td>{{ r.note ?? '' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5">{{ list.isLoading() ? 'Chargement…' : 'Aucun relevé.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilitiesPanel {
  private readonly api = inject(ManagementApi);
  private readonly toast = inject(Toast);
  protected readonly labels = UTILITY_TYPE_LABELS;
  protected readonly types = Object.keys(UtilityType) as UtilityType[];
  protected readonly list = resource({ loader: () => this.api.readings() });
  protected readonly type = signal<UtilityType>('WATER');
  protected readonly date = signal(todayInput());
  protected readonly value = signal<number | null>(null);
  protected readonly note = signal('');

  protected async add(): Promise<void> {
    try {
      await this.api.addReading({
        type: this.type(),
        readingDate: this.date(),
        value: Number(this.value()),
        note: this.note().trim() || undefined,
      });
      this.toast.success('Relevé enregistré.');
      this.value.set(null);
      this.note.set('');
      this.list.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
