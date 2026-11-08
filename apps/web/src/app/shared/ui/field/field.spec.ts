import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LV_FIELD } from './field';

@Component({
  imports: [ReactiveFormsModule, LV_FIELD],
  template: `
    <form [formGroup]="form" (ngSubmit)="form.markAllAsTouched()">
      <lv-field label="Nom" hint="Tel qu'il apparaît." [errors]="{ required: 'Indiquez le nom.' }">
        <input lvControl formControlName="name" />
      </lv-field>
      <lv-field label="Ville" [optional]="true">
        <select lvControl formControlName="city">
          <option value="">—</option>
        </select>
      </lv-field>
      <button type="submit">Envoyer</button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly form = new FormBuilder().nonNullable.group({
    name: ['', Validators.required],
    city: [''],
  });
}

describe('LvField', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    const settle = async () => {
      await new Promise((r) => setTimeout(r));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    await settle();
    return { el: fixture.nativeElement as HTMLElement, settle };
  }

  it('relie libellé, aide et contrôle, avec le style adapté', async () => {
    const { el } = await render();
    const input = el.querySelector('input');
    const label = el.querySelector('label');
    expect(input?.id).toBeTruthy();
    expect(label?.getAttribute('for')).toBe(input?.id);
    expect(input?.classList).toContain('lv-input');
    expect(el.querySelector('select')?.classList).toContain('lv-select');
    expect(input?.getAttribute('aria-describedby')).toBe(`${input?.id ?? ''}-hint`);
    expect(el.textContent).toContain('facultatif');
    expect(input?.getAttribute('aria-invalid')).toBeNull();
  });

  it('affiche l’erreur après la soumission, puis l’efface à la saisie', async () => {
    const { el, settle } = await render();
    el.querySelector<HTMLButtonElement>('button')?.click();
    await settle();
    const input = el.querySelector('input');
    expect(el.querySelector('.lv-error')?.textContent.trim()).toBe('Indiquez le nom.');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('aria-describedby')).toBe(`${input?.id ?? ''}-error`);
    if (!input) throw new Error('input');
    input.value = 'Pressing';
    input.dispatchEvent(new Event('input'));
    await settle();
    expect(el.querySelector('.lv-error')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });
});
