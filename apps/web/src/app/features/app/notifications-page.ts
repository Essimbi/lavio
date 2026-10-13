import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { NotificationDto } from '@lavio/shared';
import { PressingApi } from '../../core/api/pressing-api';
import { NotificationCenter } from '../../core/notifications/notification-center';
import { FrDateTimePipe } from '../../shared/format/format';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Pager } from '../../shared/ui/pager/pager';
import { Toast } from '../../shared/ui/toast/toast.service';

/** Centre de notifications (docs/05, « Notifications ») : sans push en phase 3. */
@Component({
  selector: 'lv-notifications-page',
  imports: [FormsModule, PageHeader, Pager, FrDateTimePipe],
  template: `
    <lv-page-header heading="Notifications" subtitle="Alertes et demandes qui vous concernent.">
      <button type="button" class="lv-secondary" (click)="readAll()">Tout marquer comme lu</button>
    </lv-page-header>
    <label class="mb-4 flex min-h-11 items-center gap-2">
      <input
        type="checkbox"
        [ngModel]="unreadOnly()"
        (ngModelChange)="unreadOnly.set($event); page.set(1)"
      />
      Non lues seulement
    </label>
    <ul class="grid gap-3" role="list">
      @for (n of list.hasValue() ? list.value().data : []; track n.id) {
        <li>
          <button
            type="button"
            class="lv-card flex w-full items-start gap-3 text-left transition-transform hover:-translate-y-px"
            [class.border-l-4]="!n.readAt"
            [class.border-teal-700]="!n.readAt"
            (click)="open(n)"
          >
            <span class="grow">
              <span class="block font-semibold">
                @if (!n.readAt) {
                  <span class="sr-only">Non lue : </span>
                }
                {{ n.title }}
              </span>
              <span class="block">{{ n.body }}</span>
              <span class="mt-1 block text-sm text-teal-700">{{ n.createdAt | frDateTime }}</span>
            </span>
            @if (n.url) {
              <span class="text-sm font-semibold text-teal-700" aria-hidden="true">Ouvrir →</span>
            }
          </button>
        </li>
      } @empty {
        <li class="lv-card">{{ list.isLoading() ? 'Chargement…' : 'Aucune notification.' }}</li>
      }
    </ul>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private readonly api = inject(PressingApi);
  private readonly center = inject(NotificationCenter);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  protected readonly unreadOnly = signal(false);
  protected readonly page = signal(1);
  protected readonly list = resource({
    params: () => ({ unread: this.unreadOnly() || undefined, page: this.page() }),
    loader: ({ params }) => this.api.notifications(params),
  });

  protected async open(n: NotificationDto): Promise<void> {
    try {
      if (!n.readAt) await this.api.readNotification(n.id);
      void this.center.refresh();
      if (n.url?.startsWith('/')) await this.router.navigateByUrl(n.url);
      else this.list.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async readAll(): Promise<void> {
    try {
      await this.api.readAllNotifications();
      void this.center.refresh();
      this.list.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
