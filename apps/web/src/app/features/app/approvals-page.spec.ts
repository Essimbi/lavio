import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiInterceptor } from '../../core/http/api.interceptor';
import { ApprovalsPage } from './approvals-page';

const base = {
  status: 'PENDING',
  requestedByName: 'Caissier Démo',
  decidedByName: null,
  reason: null,
  createdAt: '2026-10-16T08:00:00.000Z',
  decidedAt: null,
};

describe('ApprovalsPage', () => {
  it('détaille les ajustements de stock, les inventaires et les dépenses à valider', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(ApprovalsPage);
    const settle = async () => {
      await new Promise((r) => setTimeout(r));
      fixture.detectChanges();
    };
    await settle();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url === '/api/v1/approvals')
      .flush([
        {
          ...base,
          id: 'a1',
          type: 'STOCK_ADJUSTMENT',
          payload: {
            itemId: 's1',
            itemName: 'Détachant',
            unit: 'L',
            quantity: -2.5,
            reasonCode: 'LOSS',
            reasonLabel: 'Perte',
            note: 'Bidon percé',
          },
        },
        {
          ...base,
          id: 'a2',
          type: 'INVENTORY',
          payload: { inventoryId: 'i1', countedLines: 12, changedLines: 3, varianceXaf: -4500 },
        },
        {
          ...base,
          id: 'a3',
          type: 'EXPENSE',
          payload: {
            expenseId: 'e1',
            amountXaf: 75000,
            categoryName: 'Loyer',
            accountName: 'Banque',
            description: 'Loyer d’octobre',
          },
        },
      ]);
    await settle();
    const cards = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li.lv-card')].map(
      (c) => c.textContent.replace(/\s+/g, ' '),
    );
    expect(cards[0]).toContain('Détachant');
    expect(cards[0]).toContain('−2,5 L');
    expect(cards[0]).toContain('Perte');
    expect(cards[0]).toContain('Bidon percé');
    expect(cards[1]).toContain('12');
    expect(cards[1]).toMatch(/4\s500\sFCFA/);
    expect(cards[2]).toMatch(/75\s000\sFCFA/);
    expect(cards[2]).toContain('Loyer');
    expect(cards[2]).toContain('Banque');
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(
      expect.arrayContaining(['/app/stock/s1', '/app/stock/inventories/i1', '/app/expenses']),
    );
  });
});
