import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { CustomerDto } from '@lavio/shared';
import { PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import { PhonePipe } from '../../../shared/format/format';
import { LV_FIELD } from '../../../shared/ui/field/field';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { CustomerForm } from './customer-form';

/** Clients : recherche par nom, téléphone ou numéro de ticket ; création. */
@Component({
  selector: 'lv-customers-page',
  imports: [FormsModule, LV_FIELD, RouterLink, PageHeader, Pager, CustomerForm, PhonePipe],
  template: `
    <lv-page-header heading="Clients" subtitle="Fiches, préférences et historique.">
      @if (auth.hasTenantRole('CASHIER') && !creating()) {
        <button type="button" class="lv-primary" (click)="creating.set(true)">
          Nouveau client
        </button>
      }
    </lv-page-header>
    @if (creating()) {
      <lv-customer-form
        class="mb-6 block"
        (saved)="created($event)"
        (cancelled)="creating.set(false)"
      />
    }
    <div class="lv-toolbar" role="search">
      <lv-field label="Nom, téléphone ou numéro de ticket" class="lv-grow">
        <input
          lvControl
          class="lv-search"
          type="search"
          autocomplete="off"
          placeholder="Nom, téléphone ou n° de ticket"
          [ngModel]="q()"
          (ngModelChange)="q.set($event); page.set(1)"
        />
      </lv-field>
    </div>
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Clients
        </caption>
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">Téléphone</th>
            <th scope="col">Type</th>
            <th scope="col">Préférences</th>
          </tr>
        </thead>
        <tbody>
          @for (c of list.hasValue() ? list.value().data : []; track c.id) {
            <tr>
              <td>
                <a class="font-semibold" [routerLink]="['/app/customers', c.id]">{{ c.name }}</a>
              </td>
              <td>{{ c.phone | phone }}</td>
              <td>{{ c.type === 'COMPANY' ? 'Entreprise' : 'Particulier' }}</td>
              <td class="text-sm">{{ prefs(c) }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4">{{ list.isLoading() ? 'Chargement…' : 'Aucun client.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersPage {
  private readonly api = inject(PressingApi);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly q = signal('');
  protected readonly page = signal(1);
  protected readonly creating = signal(false);
  protected readonly list = resource({
    params: () => ({ q: this.q().trim(), page: this.page() }),
    loader: ({ params }) => this.api.customers(params),
  });

  protected readonly prefs = (c: CustomerDto) =>
    [
      c.preferences.noCover ? 'Sans housse' : '',
      c.preferences.returnHangers ? 'Cintres' : '',
      c.creditAllowed ? 'Crédit' : '',
    ]
      .filter(Boolean)
      .join(' · ');

  protected async created(c: CustomerDto): Promise<void> {
    this.creating.set(false);
    await this.router.navigate(['/app/customers', c.id]);
  }
}
