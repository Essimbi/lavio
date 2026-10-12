import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { AppApi } from '../../core/api/app-api';
import { FrDatePipe } from '../../shared/format/format';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { LicenseChip } from '../../shared/ui/status-chip/status-chip';
import { errorMessage } from '../../shared/ui/toast/toast.service';

/** Page « Ma licence » (docs/06) : plan, dates, utilisateurs, clé, renouvellement via WhatsApp. */
@Component({
  selector: 'lv-license-page',
  imports: [PageHeader, LicenseChip, FrDatePipe],
  template: `
    <lv-page-header heading="Ma licence" subtitle="Votre abonnement Lavio." />
    @if (license.hasValue()) {
      @let l = license.value();
      <section class="lv-card max-w-2xl">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-xl">Plan {{ l.planName }}</h2>
          <lv-license-chip [status]="l.status" />
        </div>
        <dl class="lv-dl">
          <dt>Clé de licence</dt>
          <dd class="tabular">{{ l.key }}</dd>
          <dt>Début</dt>
          <dd>{{ l.startsAt | frDate }}</dd>
          <dt>Fin</dt>
          <dd>{{ l.endsAt | frDate }}</dd>
          @if (l.status === 'GRACE') {
            <dt>Accès complet jusqu’au</dt>
            <dd>{{ l.graceEndsAt | frDate }}</dd>
          }
          <dt>Utilisateurs</dt>
          <dd>{{ l.activeUsers }} sur {{ l.maxUsers }}</dd>
        </dl>
        @if (l.readOnly) {
          <p class="mt-4 font-semibold text-coral-600">
            Votre licence est inactive : vous pouvez consulter et exporter vos données, mais plus
            rien enregistrer.
          </p>
        }
        <div class="mt-6">
          @if (l.renewWhatsappUrl) {
            <a class="lv-whatsapp" [href]="l.renewWhatsappUrl" target="_blank" rel="noopener"
              >Renouveler via WhatsApp</a
            >
          } @else {
            <p>Contactez le service client pour renouveler votre licence.</p>
          }
        </div>
      </section>
    } @else if (license.error()) {
      <p class="lv-alert" role="alert">{{ message(license.error()) }}</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicensePage {
  private readonly api = inject(AppApi);
  protected readonly license = resource({ loader: () => this.api.license() });
  protected readonly message = errorMessage;
}
