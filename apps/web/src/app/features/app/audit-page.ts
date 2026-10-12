import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { AppApi } from '../../core/api/app-api';
import { FrDateTimePipe } from '../../shared/format/format';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Pager } from '../../shared/ui/pager/pager';
import { actionLabel } from '../admin/labels';

/** Journal d'audit du pressing (réservé à la responsable). */
@Component({
  selector: 'lv-audit-page',
  imports: [PageHeader, Pager, FrDateTimePipe],
  template: `
    <lv-page-header
      heading="Journal d’audit"
      subtitle="Les actions sensibles enregistrées dans votre pressing."
    />
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Journal d’audit
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Utilisateur</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          @for (log of logs.hasValue() ? logs.value().data : []; track log.id) {
            <tr>
              <td class="whitespace-nowrap">{{ log.at | frDateTime }}</td>
              <td>{{ log.userName ?? 'Système' }}</td>
              <td>{{ label(log.action) }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="3">
                {{ logs.isLoading() ? 'Chargement…' : 'Aucune action enregistrée.' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="logs.hasValue() ? logs.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  private readonly api = inject(AppApi);
  protected readonly page = signal(1);
  protected readonly logs = resource({
    params: () => this.page(),
    loader: ({ params }) => this.api.auditLogs(params),
  });
  protected readonly label = actionLabel;
}
