import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import type { PaymentDialogData } from './payment-dialog';
import { PaymentDialog } from './payment-dialog';

describe('PaymentDialog', () => {
  const close = vi.fn();

  async function render(data: Partial<PaymentDialogData> = {}) {
    close.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            depositId: 'd1',
            ticketNumber: '000042',
            balanceXaf: 5000,
            kind: 'BALANCE',
            ...data,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(PaymentDialog);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const http = TestBed.inject(HttpTestingController);
    const submit = () => el.querySelector<HTMLButtonElement>('button[type="submit"]');
    const set = async (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(selector);
      if (!input) throw new Error(selector);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    /** Choix du mode par son libellé (la valeur est portée par l'accesseur de formulaire). */
    const choose = async (label: string) => {
      const radio = [...el.querySelectorAll('label.lv-choice')]
        .find((l) => l.textContent.trim() === label)
        ?.querySelector('input');
      if (!radio) throw new Error(label);
      radio.click();
      await fixture.whenStable();
    };
    return { fixture, el, http, submit, set, choose };
  }

  it('propose le reste à payer et refuse un montant supérieur', async () => {
    const { submit, set } = await render();
    expect(submit()?.disabled).toBe(false);
    await set('#pay-amount', '5001');
    expect(submit()?.disabled).toBe(true);
  });

  it('exige la référence pour Mobile Money', async () => {
    const { el, submit, set, choose } = await render();
    await choose('Orange Money');
    expect(el.querySelector('#pay-ref')).not.toBeNull();
    expect(submit()?.disabled).toBe(true);
    await set('#pay-ref', 'OM-123456');
    expect(submit()?.disabled).toBe(false);
  });

  it('envoie une clé d’idempotence et demande une confirmation explicite en cas de doublon', async () => {
    const { el, fixture, http, submit, set, choose } = await render();
    await choose('MTN MoMo');
    await set('#pay-ref', 'MP-777');
    submit()?.click();
    const first = http.expectOne('/api/v1/payments');
    expect(first.request.headers.get('Idempotency-Key')).toMatch(/^[\w-]{8,}$/);
    expect(first.request.body).toMatchObject({
      amountXaf: 5000,
      method: 'MTN_MOMO',
      operatorRef: 'MP-777',
    });
    first.flush(
      { error: { code: 'DUPLICATE_REFERENCE', message: 'Référence déjà enregistrée.' } },
      { status: 409, statusText: 'Conflict' },
    );
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(el.textContent).toContain('déjà été enregistrée');
    expect(submit()?.disabled).toBe(true);

    el.querySelector<HTMLInputElement>('input[name="confirmDuplicate"]')?.click();
    await fixture.whenStable();
    expect(submit()?.disabled).toBe(false);
    submit()?.click();
    const second = http.expectOne('/api/v1/payments');
    expect(second.request.body).toMatchObject({ confirmDuplicate: true });
    expect(second.request.headers.get('Idempotency-Key')).not.toBe(
      first.request.headers.get('Idempotency-Key'),
    );
    second.flush({ id: 'p1' }, { status: 201, statusText: 'Created' });
    await new Promise((r) => setTimeout(r));
    expect(close).toHaveBeenCalledWith({ id: 'p1' });
  });
});
