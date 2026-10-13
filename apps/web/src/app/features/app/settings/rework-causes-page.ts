import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ReworkCauseDto } from '@lavio/shared';
import { PressingApi } from '../../../core/api/pressing-api';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Toast } from '../../../shared/ui/toast/toast.service';

/** Causes de reprise codifiées (docs/03) : liste configurable par la responsable. */
@Component({
  selector: 'lv-rework-causes-page',
  imports: [FormsModule, PageHeader],
  template: `
    <lv-page-header
      heading="Causes de reprise"
      subtitle="Motifs proposés lors d’une reprise ou d’un incident."
    />
    <form class="lv-card mb-6 flex flex-wrap items-end gap-3" (ngSubmit)="add()">
      <div class="w-40">
        <label class="lv-label" for="cause-code">Code</label>
        <input
          id="cause-code"
          class="lv-input uppercase"
          name="code"
          maxlength="20"
          required
          pattern="[A-Za-z0-9_]{2,20}"
          [ngModel]="code()"
          (ngModelChange)="code.set($event)"
        />
      </div>
      <div class="min-w-64 grow">
        <label class="lv-label" for="cause-label">Libellé</label>
        <input
          id="cause-label"
          class="lv-input"
          name="label"
          maxlength="80"
          required
          [ngModel]="label()"
          (ngModelChange)="label.set($event)"
        />
      </div>
      <button type="submit" class="lv-primary" [disabled]="!valid()">Ajouter</button>
    </form>

    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Causes de reprise
        </caption>
        <thead>
          <tr>
            <th scope="col">Code</th>
            <th scope="col">Libellé</th>
            <th scope="col">Active</th>
          </tr>
        </thead>
        <tbody>
          @for (c of causes.hasValue() ? causes.value() : []; track c.id) {
            <tr>
              <td class="tabular font-semibold">{{ c.code }}</td>
              <td>
                <label class="sr-only" [for]="'cause-' + c.id">Libellé de {{ c.code }}</label>
                <input
                  class="lv-input"
                  maxlength="80"
                  [id]="'cause-' + c.id"
                  [value]="c.label"
                  (change)="rename(c, $any($event.target).value)"
                />
              </td>
              <td>
                <label class="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    [checked]="c.isActive"
                    (change)="toggle(c, $any($event.target).checked)"
                  />
                  <span class="sr-only">Activer {{ c.label }}</span>
                  {{ c.isActive ? 'Oui' : 'Non' }}
                </label>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="3">{{ causes.isLoading() ? 'Chargement…' : 'Aucune cause.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReworkCausesPage {
  private readonly api = inject(PressingApi);
  private readonly toast = inject(Toast);
  protected readonly causes = resource({ loader: () => this.api.reworkCauses() });
  protected readonly code = signal('');
  protected readonly label = signal('');
  protected readonly valid = () =>
    /^[A-Za-z0-9_]{2,20}$/.test(this.code().trim()) && this.label().trim().length >= 2;

  private async run(action: () => Promise<unknown>, message: string): Promise<void> {
    try {
      await action();
      this.toast.success(message);
    } catch (e) {
      this.toast.error(e);
    }
    this.causes.reload();
  }

  protected async add(): Promise<void> {
    if (!this.valid()) return;
    await this.run(
      () =>
        this.api.createReworkCause({
          code: this.code().trim().toUpperCase(),
          label: this.label().trim(),
        }),
      'Cause ajoutée.',
    );
    this.code.set('');
    this.label.set('');
  }

  protected rename(c: ReworkCauseDto, label: string): Promise<void> {
    const value = label.trim();
    if (value.length < 2 || value === c.label) return Promise.resolve();
    return this.run(() => this.api.updateReworkCause(c.id, { label: value }), 'Libellé modifié.');
  }

  protected toggle(c: ReworkCauseDto, isActive: boolean): Promise<void> {
    return this.run(
      () => this.api.updateReworkCause(c.id, { isActive }),
      isActive ? 'Cause activée.' : 'Cause désactivée.',
    );
  }
}
