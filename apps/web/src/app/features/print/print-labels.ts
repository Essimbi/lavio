import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PressingApi } from '../../core/api/pressing-api';
import { FrDatePipe } from '../../shared/format/format';
import { errorMessage } from '../../shared/ui/toast/toast.service';
import { qrDataUrl } from './qr';

/** Étiquettes par article (docs/09) : 50 × 30 mm, ou planche A4 de 24 (`?format=a4`). */
@Component({
  selector: 'lv-print-labels',
  imports: [RouterLink, FrDatePipe],
  template: `
    <div class="print-toolbar no-print">
      <a class="lv-link-button" [routerLink]="['/app/deposits', id()]">Retour au dépôt</a>
      <button type="button" class="lv-primary" (click)="print()">Imprimer les étiquettes</button>
      @if (a4()) {
        <a class="lv-secondary" [routerLink]="['/print/labels', id()]">Format 50 × 30 mm</a>
      } @else {
        <a
          class="lv-secondary"
          [routerLink]="['/print/labels', id()]"
          [queryParams]="{ format: 'a4' }"
          >Planche A4</a
        >
      }
    </div>
    @if (labels.hasValue()) {
      <div class="labels" [class.a4]="a4()">
        @for (l of labels.value(); track $index) {
          <div class="label">
            <div>
              <p class="code">{{ l.code }}</p>
              <p class="who">{{ l.customerShortName }}</p>
              <p class="what">{{ l.itemType }} · {{ l.service }}</p>
              <p class="when">Retrait {{ l.dueDate | frDate }}</p>
            </div>
            <img class="qr" [src]="l.qr" alt="" />
          </div>
        }
      </div>
    } @else if (labels.error()) {
      <p class="lv-alert m-6" role="alert">{{ message(labels.error()) }}</p>
    } @else {
      <p class="m-6" aria-busy="true">Préparation des étiquettes…</p>
    }
  `,
  styles: `
    @page {
      size: 50mm 30mm;
      margin: 0;
    }
    @page lv-a4 {
      size: A4;
      margin: 8mm 6mm;
    }
    lv-print-labels {
      display: block;
      min-height: 100dvh;
      background: var(--lv-foam-50);
    }
    lv-print-labels .print-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      padding: 16px;
    }
    lv-print-labels .labels {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      padding: 0 16px 32px;
    }
    lv-print-labels .label {
      display: flex;
      gap: 2mm;
      align-items: center;
      justify-content: space-between;
      width: 50mm;
      height: 30mm;
      padding: 2mm 2.5mm;
      overflow: hidden;
      background: #fff;
      color: #000;
      font: 400 8.5px/1.25 var(--lv-font-body);
      box-shadow: var(--lv-shadow-card);
    }
    lv-print-labels .label p {
      margin: 0;
    }
    lv-print-labels .code {
      font: 700 15px/1.1 var(--lv-font-display);
      font-variant-numeric: tabular-nums;
    }
    lv-print-labels .who {
      font-weight: 700;
    }
    lv-print-labels .qr {
      width: 16mm;
      height: 16mm;
      image-rendering: pixelated;
    }
    @media print {
      lv-print-labels .no-print {
        display: none !important;
      }
      lv-print-labels {
        background: #fff;
      }
      lv-print-labels .labels {
        display: block;
        padding: 0;
      }
      lv-print-labels .label {
        box-shadow: none;
        break-after: page;
      }
      lv-print-labels .labels.a4 {
        page: lv-a4;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: 33.9mm;
      }
      lv-print-labels .labels.a4 .label {
        width: auto;
        height: auto;
        break-after: auto;
      }
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintLabels {
  readonly id = input.required<string>();
  readonly format = input<string>();
  private readonly api = inject(PressingApi);
  protected readonly a4 = computed(() => this.format() === 'a4');
  protected readonly labels = resource({
    params: () => this.id(),
    loader: async ({ params }) => {
      const labels = await this.api.labels(params);
      return Promise.all(
        labels.map(async (l) => ({
          ...l,
          code: l.labelCode,
          qr: await qrDataUrl(l.qrPayload, 160),
        })),
      );
    },
  });
  protected readonly message = errorMessage;

  protected print(): void {
    window.print();
  }
}
