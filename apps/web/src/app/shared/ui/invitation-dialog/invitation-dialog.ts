import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import type { InvitationLink } from '@lavio/shared';
import { FrDateTimePipe } from '../../format/format';

export interface InvitationDialogData {
  title: string;
  name: string;
  link: InvitationLink;
}

/** Lien à usage unique : à copier ou à envoyer sur WhatsApp (docs/06, étape 5). */
@Component({
  selector: 'lv-invitation-dialog',
  imports: [MatDialogModule, MatButtonModule, FrDateTimePipe],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>
        Envoyez ce lien à <strong>{{ data.name }}</strong
        >. Il sert une seule fois et reste valable jusqu’au {{ data.link.expiresAt | frDateTime }}.
      </p>
      <label class="mt-3 block text-sm font-medium" for="invitation-link">Lien d’invitation</label>
      <input
        id="invitation-link"
        class="lv-readonly-field"
        readonly
        [value]="data.link.inviteUrl"
        (focus)="select($event)"
      />
      <p class="mt-2 text-sm" aria-live="polite">{{ copied() ? 'Lien copié.' : '' }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="copy()">Copier le lien</button>
      @if (data.link.whatsappUrl) {
        <a mat-flat-button [href]="data.link.whatsappUrl" target="_blank" rel="noopener"
          >Envoyer sur WhatsApp</a
        >
      }
      <button mat-button type="button" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationDialog {
  protected readonly data = inject<InvitationDialogData>(MAT_DIALOG_DATA);
  protected readonly copied = signal(false);

  protected select(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  protected async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.data.link.inviteUrl);
    this.copied.set(true);
  }
}

export function showInvitation(dialog: MatDialog, data: InvitationDialogData): void {
  dialog.open(InvitationDialog, { data, width: '520px' });
}
