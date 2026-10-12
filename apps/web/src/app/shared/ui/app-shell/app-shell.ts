import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';
import type { ShellConfig } from './nav';

/**
 * Coquille de l'application (docs/08) : barre latérale sur écran large (≥ 1024 px),
 * navigation basse sur téléphone. Utilisée par l'application du pressing et le superadmin.
 */
@Component({
  selector: 'lv-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  readonly config = input.required<ShellConfig>();
}
