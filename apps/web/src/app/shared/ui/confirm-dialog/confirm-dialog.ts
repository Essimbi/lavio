import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** Action destructrice : bouton corail. */
  danger?: boolean;
  /** Demande un motif facultatif. */
  askReason?: boolean;
}

@Component({
  selector: 'lv-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      @if (data.askReason) {
        <mat-form-field class="w-full">
          <mat-label>Motif (facultatif)</mat-label>
          <textarea
            matInput
            rows="3"
            maxlength="500"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
          ></textarea>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        type="button"
        [class.lv-danger]="data.danger"
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
