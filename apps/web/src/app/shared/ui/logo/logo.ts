import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Logo Lavio (docs/assets/logo). Largeur minimale 96 px à l'écran (docs/08). */
@Component({
  selector: 'lv-logo',
  template: `<img [src]="src()" alt="Lavio" [attr.width]="width()" [attr.height]="height()" />`,
  styles: ':host { display: inline-flex; } img { display: block; height: auto; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly variant = input<'default' | 'inverse'>('default');
  readonly width = input(128);
  protected readonly height = computed(() => Math.round((this.width() * 80) / 214.6));
  protected readonly src = computed(() =>
    this.variant() === 'inverse'
      ? 'brand/lavio-logo-horizontal-inverse.svg'
      : 'brand/lavio-logo-horizontal.svg',
  );
}
