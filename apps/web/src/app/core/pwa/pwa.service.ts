import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { ManagementApi } from '../api/management-api';

/** Événement non standard de Chromium (invite d'installation). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PushState = 'hidden' | 'available' | 'ios-install' | 'enabled' | 'denied';

const VISITS_KEY = 'lv-visits';
const INSTALL_DISMISSED_KEY = 'lv-install-dismissed';
const PUSH_DISMISSED_KEY = 'lv-push-dismissed';
const SNOOZE_MS = 30 * 86_400_000;

/** Stockage local tolérant (navigation privée, stockage bloqué). */
const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Préférence non conservée : sans conséquence.
    }
  },
};

const snoozed = (key: string) => Date.now() - Number(store.get(key) ?? 0) < SNOOZE_MS;

/**
 * PWA (docs/09) : nouvelle version disponible, invite d'installation après la deuxième visite
 * connectée (fermable 30 jours, aide iOS), activation des alertes push sur téléphone, ouverture
 * de l'URL ciblée au clic sur une notification.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly swUpdate = inject(SwUpdate);
  private readonly swPush = inject(SwPush);
  private readonly api = inject(ManagementApi);
  private readonly router = inject(Router);
  private installEvent: BeforeInstallPromptEvent | null = null;
  private started = false;

  readonly updateReady = signal(false);
  readonly showInstall = signal(false);
  readonly iosHelp = signal(false);
  readonly push = signal<PushState>('hidden');

  private get ios(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  private get standalone(): boolean {
    return (
      matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  private get mobile(): boolean {
    return matchMedia('(max-width: 1023px), (pointer: coarse)').matches;
  }

  /** Démarré par la coquille de l'application du pressing (utilisateur connecté). */
  start(destroyRef: DestroyRef): void {
    if (!this.browser || this.started) return;
    this.started = true;

    if (this.swUpdate.isEnabled) {
      const sub = this.swUpdate.versionUpdates.subscribe((e) => {
        if (e.type === 'VERSION_READY') this.updateReady.set(true);
      });
      destroyRef.onDestroy(() => sub.unsubscribe());
    }
    if (this.swPush.isEnabled) {
      const sub = this.swPush.notificationClicks.subscribe(({ notification }) => {
        const url = (notification.data as { url?: string } | undefined)?.url;
        if (url?.startsWith('/')) void this.router.navigateByUrl(url);
      });
      destroyRef.onDestroy(() => sub.unsubscribe());
    }

    // Visites connectées : une par session de navigation.
    try {
      if (!sessionStorage.getItem(VISITS_KEY)) {
        sessionStorage.setItem(VISITS_KEY, '1');
        store.set(VISITS_KEY, String(Number(store.get(VISITS_KEY) ?? 0) + 1));
      }
    } catch {
      // Stockage indisponible : l'invite n'apparaît pas.
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      this.installEvent = e as BeforeInstallPromptEvent;
      this.refreshInstall();
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    destroyRef.onDestroy(() => window.removeEventListener('beforeinstallprompt', onPrompt));
    this.refreshInstall();
    void this.initPush();
  }

  private refreshInstall(): void {
    const eligible =
      Number(store.get(VISITS_KEY) ?? 0) >= 2 &&
      !snoozed(INSTALL_DISMISSED_KEY) &&
      !this.standalone;
    this.iosHelp.set(eligible && this.ios && !this.installEvent);
    this.showInstall.set(eligible && (!!this.installEvent || this.ios));
  }

  async install(): Promise<void> {
    const e = this.installEvent;
    if (!e) return;
    await e.prompt();
    await e.userChoice;
    this.installEvent = null;
    this.showInstall.set(false);
  }

  dismissInstall(): void {
    store.set(INSTALL_DISMISSED_KEY, String(Date.now()));
    this.showInstall.set(false);
  }

  /** Alertes push : proposées sur téléphone seulement, jamais au premier chargement anonyme. */
  private async initPush(): Promise<void> {
    if (!this.swPush.isEnabled || !('Notification' in window)) {
      // iOS hors écran d'accueil : le push n'existe pas encore, on explique pourquoi.
      if (this.ios && !this.standalone && this.mobile && !snoozed(PUSH_DISMISSED_KEY))
        this.push.set('ios-install');
      return;
    }
    try {
      const config = await this.api.pushConfig();
      if (!config.enabled || !config.publicKey) return;
      if (Notification.permission === 'denied') {
        this.push.set('hidden');
        return;
      }
      if (Notification.permission === 'granted') {
        // Abonnement renvoyé à chaque démarrage : il suit l'utilisateur connecté sur l'appareil.
        await this.subscribe(config.publicKey);
        return;
      }
      if (this.mobile && !snoozed(PUSH_DISMISSED_KEY)) this.push.set('available');
    } catch {
      this.push.set('hidden');
    }
  }

  private async subscribe(publicKey: string): Promise<void> {
    const sub = await this.swPush.requestSubscription({ serverPublicKey: publicKey });
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
    await this.api.pushSubscribe({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    this.push.set('enabled');
  }

  async enablePush(): Promise<void> {
    const config = await this.api.pushConfig();
    if (!config.publicKey) return;
    try {
      await this.subscribe(config.publicKey);
    } catch {
      this.push.set(Notification.permission === 'denied' ? 'denied' : 'available');
    }
  }

  dismissPush(): void {
    store.set(PUSH_DISMISSED_KEY, String(Date.now()));
    this.push.set('hidden');
  }

  async reload(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } finally {
      document.location.reload();
    }
  }
}
