import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lv-page-header',
  template: `
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-[28px]">{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-ink-900/75">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap gap-2"><ng-content /></div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}
