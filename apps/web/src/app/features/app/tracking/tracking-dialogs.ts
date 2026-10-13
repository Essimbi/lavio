import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { IncidentType, QUALITY_CHECKLIST, type ReworkCauseDto } from '@lavio/shared';
import { firstValueFrom } from 'rxjs';
import { INCIDENT_TYPE_LABELS } from '../../../shared/format/labels';

export interface QualityResult {
  checklist: Record<string, boolean>;
}

/** Contrôle qualité avant « Prêt » : tous les points doivent être cochés (docs/05). */
@Component({
  selector: 'lv-quality-dialog',
  imports: [MatDialogModule, MatButtonModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Contrôle qualité</h2>
    <mat-dialog-content>
      <p class="mb-3">{{ data.count }} article(s) · cochez chaque point vérifié.</p>
      <fieldset class="grid gap-2">
        <legend class="sr-only">Check-list de contrôle qualité</legend>
        @for (c of items; track c.key) {
          <label class="lv-choice w-full">
            <input
              type="checkbox"
              [name]="c.key"
              [ngModel]="checked()[c.key] ?? false"
              (ngModelChange)="toggle(c.key, $event)"
            />
            {{ c.label }}
          </label>
        }
      </fieldset>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        type="button"
        [disabled]="!complete()"
        (click)="ref.close({ checklist: checked() })"
      >
        Déclarer prêt
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualityDialog {
  protected readonly data = inject<{ count: number }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<QualityDialog, QualityResult>);
  protected readonly items = QUALITY_CHECKLIST;
  protected readonly checked = signal<Record<string, boolean>>({});
  protected readonly complete = computed(() => this.items.every((c) => this.checked()[c.key]));

  protected toggle(key: string, on: boolean): void {
    this.checked.update((v) => ({ ...v, [key]: on }));
  }
}

export interface ReworkResult {
  reworkCauseId?: string;
  reason?: string;
}

/** Reprise (retour en arrière) : cause codifiée et/ou motif obligatoires ; crée un incident. */
@Component({
  selector: 'lv-rework-dialog',
  imports: [MatDialogModule, MatButtonModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Reprise · {{ data.target }}</h2>
    <mat-dialog-content class="grid gap-4">
      <p>L’article repart en traitement. Un incident « Reprise » est enregistré.</p>
      <div>
        <label class="lv-label" for="rework-cause">Cause</label>
        <select
          id="rework-cause"
          class="lv-select"
          [ngModel]="causeId()"
          (ngModelChange)="causeId.set($event)"
        >
          <option value="">— Choisir —</option>
          @for (c of data.causes; track c.id) {
            <option [value]="c.id">{{ c.label }}</option>
          }
        </select>
      </div>
      <div>
        <label class="lv-label" for="rework-reason">Précisions</label>
        <textarea
          id="rework-reason"
          class="lv-input"
          rows="3"
          maxlength="500"
          [ngModel]="reason()"
          (ngModelChange)="reason.set($event)"
        ></textarea>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button type="button" [disabled]="!valid()" (click)="confirm()">
        Renvoyer en reprise
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReworkDialog {
  protected readonly data = inject<{ target: string; causes: ReworkCauseDto[] }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ReworkDialog, ReworkResult>);
  protected readonly causeId = signal('');
  protected readonly reason = signal('');
  protected readonly valid = computed(() => !!this.causeId() || this.reason().trim().length >= 3);

  protected confirm(): void {
    this.ref.close({
      reworkCauseId: this.causeId() || undefined,
      reason: this.reason().trim() || undefined,
    });
  }
}

export interface IncidentResult {
  type: IncidentType;
  causeId?: string;
  description?: string;
}

/** Signalement d'un incident sur un article (contrôle qualité). */
@Component({
  selector: 'lv-incident-dialog',
  imports: [MatDialogModule, MatButtonModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Incident · article {{ data.labelCode }}</h2>
    <mat-dialog-content class="grid gap-4">
      <div>
        <label class="lv-label" for="incident-type">Type</label>
        <select
          id="incident-type"
          class="lv-select"
          [ngModel]="type()"
          (ngModelChange)="type.set($event)"
        >
          @for (t of types; track t) {
            <option [value]="t">{{ typeLabels[t] }}</option>
          }
        </select>
      </div>
      <div>
        <label class="lv-label" for="incident-cause">Cause (facultatif)</label>
        <select
          id="incident-cause"
          class="lv-select"
          [ngModel]="causeId()"
          (ngModelChange)="causeId.set($event)"
        >
          <option value="">—</option>
          @for (c of data.causes; track c.id) {
            <option [value]="c.id">{{ c.label }}</option>
          }
        </select>
      </div>
      <div>
        <label class="lv-label" for="incident-desc">Description</label>
        <textarea
          id="incident-desc"
          class="lv-input"
          rows="3"
          maxlength="1000"
          [ngModel]="description()"
          (ngModelChange)="description.set($event)"
        ></textarea>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button type="button" (click)="confirm()">Enregistrer l’incident</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentDialog {
  protected readonly data = inject<{ labelCode: string; causes: ReworkCauseDto[] }>(
    MAT_DIALOG_DATA,
  );
  private readonly ref = inject(MatDialogRef<IncidentDialog, IncidentResult>);
  protected readonly types = (Object.keys(IncidentType) as IncidentType[]).filter(
    (t) => t !== 'REWORK',
  );
  protected readonly typeLabels = INCIDENT_TYPE_LABELS;
  protected readonly type = signal<IncidentType>('DAMAGE');
  protected readonly causeId = signal('');
  protected readonly description = signal('');

  protected confirm(): void {
    this.ref.close({
      type: this.type(),
      causeId: this.causeId() || undefined,
      description: this.description().trim() || undefined,
    });
  }
}

export function askQuality(dialog: MatDialog, count: number) {
  return firstValueFrom(
    dialog
      .open<QualityDialog, { count: number }, QualityResult>(QualityDialog, {
        data: { count },
        width: '480px',
      })
      .afterClosed(),
  );
}

export function askRework(dialog: MatDialog, target: string, causes: ReworkCauseDto[]) {
  return firstValueFrom(
    dialog
      .open<ReworkDialog, { target: string; causes: ReworkCauseDto[] }, ReworkResult>(
        ReworkDialog,
        { data: { target, causes }, width: '480px' },
      )
      .afterClosed(),
  );
}

export function askIncident(dialog: MatDialog, labelCode: string, causes: ReworkCauseDto[]) {
  return firstValueFrom(
    dialog
      .open<IncidentDialog, { labelCode: string; causes: ReworkCauseDto[] }, IncidentResult>(
        IncidentDialog,
        { data: { labelCode, causes }, width: '480px' },
      )
      .afterClosed(),
  );
}
