import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { LV_FIELD } from '../field/field';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** Action destructrice : bouton corail. */
  danger?: boolean;
  /** Demande un motif facultatif. */
  askReason?: boolean;
  /** Motif obligatoire (annulation d'un dépôt). */
  reasonRequired?: boolean;
}

@Component({
  selector: 'lv-confirm-dialog',
  imports: [MatDialogModule, FormsModule, LV_FIELD],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      @if (data.askReason || data.reasonRequired) {
        <lv-field
          class="mt-4"
          label="Motif"
          [optional]="!data.reasonRequired"
          [hint]="data.reasonRequired ? 'Au moins 3 caractères.' : undefined"
        >
          <textarea
            lvControl
            rows="3"
            maxlength="500"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
          ></textarea>
        </lv-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="lv-ghost" type="button" mat-dialog-close>Annuler</button>
      <button
        type="button"
        [class.lv-primary]="!data.danger"
        [class.lv-danger-button]="data.danger"
        [disabled]="data.reasonRequired && reason().trim().length < 3"
        (click)="ref.close({ confirmed: true, reason: reason().trim() || undefined })"
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(MAT_DIALOG_DATA);
  protected readonly ref = inject(
    MatDialogRef<ConfirmDialog, { confirmed: boolean; reason?: string }>,
  );
  protected readonly reason = signal('');
}

/** Ouvre la confirmation ; renvoie `null` si l'utilisateur annule. */
export async function confirmAction(
  dialog: MatDialog,
  options: ConfirmOptions,
): Promise<{ reason?: string } | null> {
  const ref = dialog.open<ConfirmDialog, ConfirmOptions, { confirmed: boolean; reason?: string }>(
    ConfirmDialog,
    {
      data: options,
      width: '440px',
      autoFocus: 'dialog',
    },
  );
  const result = await firstValueFrom(ref.afterClosed());
  return result?.confirmed ? { reason: result.reason } : null;
}
