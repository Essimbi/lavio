import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type LeadDto, LeadStatus } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { FrDateTimePipe, PhonePipe } from '../../shared/format/format';
import { LV_FIELD } from '../../shared/ui/field/field';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Pager } from '../../shared/ui/pager/pager';
import { Toast } from '../../shared/ui/toast/toast.service';
import { LEAD_STATUS_LABELS } from './labels';

/** Demandes issues de la landing : statut, notes, contact WhatsApp (docs/06). */
@Component({
  selector: 'lv-leads-page',
  imports: [FormsModule, LV_FIELD, PageHeader, Pager, FrDateTimePipe, PhonePipe],
  template: `
    <lv-page-header heading="Demandes" subtitle="Prospects venus de la landing page." />
    <div class="lv-toolbar" role="search">
      <lv-field label="Statut">
        <select lvControl [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
          <option value="">Tous</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ label[s] }}</option>
          }
        </select>
      </lv-field>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      @for (lead of list.hasValue() ? list.value().data : []; track lead.id) {
        <article class="lv-card">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 class="text-lg">{{ lead.pressingName }}</h2>
              <p class="text-sm">
                {{ lead.name }} · {{ lead.phone | phone }}{{ lead.city ? ' · ' + lead.city : '' }}
              </p>
              <p class="text-sm text-ink-900/75">Reçue le {{ lead.createdAt | frDateTime }}</p>
            </div>
            <a class="lv-whatsapp" [href]="lead.whatsappUrl" target="_blank" rel="noopener"
              >WhatsApp</a
            >
          </div>
          @if (lead.message) {
            <p class="mt-3 rounded-field bg-foam-50 p-3">{{ lead.message }}</p>
          }
          <div class="mt-3 lv-form-grid">
            <lv-field label="Statut">
              <select
                lvControl
                [ngModel]="lead.status"
                (ngModelChange)="update(lead, { status: $event })"
              >
                @for (s of statuses; track s) {
                  <option [value]="s">{{ label[s] }}</option>
                }
              </select>
            </lv-field>
            <lv-field label="Notes" [optional]="true" hint="Enregistrées en quittant le champ.">
              <textarea
                lvControl
                rows="2"
                [ngModel]="lead.notes ?? ''"
                (blur)="saveNotes(lead, $event)"
              ></textarea>
            </lv-field>
          </div>
        </article>
      } @empty {
        <p>{{ list.isLoading() ? 'Chargement…' : 'Aucune demande.' }}</p>
      }
    </div>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadsPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(Toast);
  protected readonly statuses = Object.values(LeadStatus);
  protected readonly label = LEAD_STATUS_LABELS;
  protected readonly status = signal<LeadStatus | ''>('');
  protected readonly page = signal(1);
  protected readonly list = resource({
    params: () => ({ status: this.status(), page: this.page() }),
    loader: ({ params }) => this.api.leads(params),
  });

  protected async update(
    lead: LeadDto,
    body: { status?: LeadStatus; notes?: string },
  ): Promise<void> {
    try {
      await this.api.updateLead(lead.id, body);
      this.toast.success('Demande mise à jour.');
      this.list.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected saveNotes(lead: LeadDto, event: FocusEvent): void {
    const notes = (event.target as HTMLTextAreaElement).value;
    if (notes !== (lead.notes ?? '')) void this.update(lead, { notes });
  }
}
