import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { AdminApi } from '../../core/api/admin-api';
import { FrDateTimePipe } from '../../shared/format/format';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Pager } from '../../shared/ui/pager/pager';
import { actionLabel } from './labels';

/** Journal d'audit de la plateforme (actions superadmin et des pressings). */
@Component({
  selector: 'lv-admin-audit-page',
  imports: [PageHeader, Pager, FrDateTimePipe],
  template: `
    <lv-page-header heading="Journal d’audit" subtitle="Actions sensibles, en ajout seul." />
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
            <th scope="col">Objet</th>
            <th scope="col">Adresse IP</th>
          </tr>
        </thead>
        <tbody>
          @for (log of logs.hasValue() ? logs.value().data : []; track log.id) {
            <tr>
              <td class="whitespace-nowrap">{{ log.at | frDateTime }}</td>
              <td>{{ log.userName ?? 'Système' }}</td>
              <td>{{ label(log.action) }}</td>
              <td class="text-sm">{{ log.entity }}</td>
              <td class="text-sm">{{ log.ip ?? '—' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5">{{ logs.isLoading() ? 'Chargement…' : 'Aucune action.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="logs.hasValue() ? logs.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAuditPage {
  private readonly api = inject(AdminApi);
  protected readonly page = signal(1);
  protected readonly logs = resource({
    params: () => this.page(),
    loader: ({ params }) => this.api.auditLogs({ page: params }),
  });
  protected readonly label = actionLabel;
}
