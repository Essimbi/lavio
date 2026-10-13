import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import type { StockItemDto, SupplierDto } from '@lavio/shared';
import { firstValueFrom } from 'rxjs';
import { ManagementApi } from '../../../core/api/management-api';
import { errorMessage } from '../../../shared/ui/toast/toast.service';

interface Data {
  item: StockItemDto | null;
  suppliers: SupplierDto[];
}

/** Fiche produit : création ou modification (magasinier). */
@Component({
  selector: 'lv-stock-item-dialog',
  imports: [MatDialogModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Modifier le produit' : 'Nouveau produit' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="lv-label" for="si-name">Nom</label>
          <input id="si-name" class="lv-input" formControlName="name" maxlength="80" />
        </div>
        <div>
          <label class="lv-label" for="si-category">Catégorie</label>
          <input id="si-category" class="lv-input" formControlName="category" maxlength="60" />
        </div>
        <div>
          <label class="lv-label" for="si-unit">Unité (L, kg, pièce…)</label>
          <input id="si-unit" class="lv-input" formControlName="unit" maxlength="20" />
        </div>
        <div>
          <label class="lv-label" for="si-price">Prix d’achat (FCFA)</label>
          <input
            id="si-price"
            class="lv-input tabular"
            type="number"
            min="0"
            formControlName="purchasePriceXaf"
          />
        </div>
        <div>
          <label class="lv-label" for="si-threshold">Seuil d’alerte</label>
          <input
            id="si-threshold"
            class="lv-input tabular"
            type="number"
            min="0"
            step="0.001"
            formControlName="alertThreshold"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="lv-label" for="si-supplier">Fournisseur habituel</label>
          <select id="si-supplier" class="lv-select" formControlName="supplierId">
            <option [ngValue]="null">—</option>
            @for (s of data.suppliers; track s.id) {
              <option [ngValue]="s.id">{{ s.name }}</option>
            }
          </select>
        </div>
        @if (error(); as e) {
          <p class="lv-alert sm:col-span-2" role="alert">{{ e }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Annuler</button>
        <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">
          Enregistrer
        </button>
      </mat-dialog-actions>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockItemDialog {
  protected readonly data = inject<Data>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<StockItemDialog, StockItemDto>);
  private readonly api = inject(ManagementApi);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data.item?.name ?? '', [Validators.required, Validators.minLength(2)]],
    category: [this.data.item?.category ?? ''],
    unit: [this.data.item?.unit ?? '', Validators.required],
    purchasePriceXaf: [
      this.data.item?.purchasePriceXaf ?? 0,
      [Validators.required, Validators.min(0)],
    ],
    alertThreshold: [this.data.item?.alertThreshold ?? 0, [Validators.required, Validators.min(0)]],
    supplierId: [this.data.item?.supplierId ?? (null as string | null)],
  });

  protected async save(): Promise<void> {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const body = {
      ...v,
      category: v.category.trim() || null,
      purchasePriceXaf: Math.floor(v.purchasePriceXaf),
    };
    try {
      const saved = this.data.item
        ? await this.api.updateStockItem(this.data.item.id, body)
        : await this.api.createStockItem({ ...body, category: body.category ?? undefined });
      this.ref.close(saved);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}

export function openStockItemDialog(
  dialog: MatDialog,
  data: Data,
): Promise<StockItemDto | undefined> {
  return firstValueFrom(
    dialog
      .open<StockItemDialog, Data, StockItemDto>(StockItemDialog, { data, width: '560px' })
      .afterClosed(),
  );
}
