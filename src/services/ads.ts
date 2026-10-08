import { Capacitor, registerPlugin, type Plugin, type PluginListenerHandle } from '@capacitor/core';
import { canShowInterstitial, INTERSTITIAL_COOLDOWN_MS, INTERSTITIAL_PRELOAD_LEAD_MS, INTERSTITIAL_MIN_ACTIONS, INTERSTITIAL_SWIPE_INTERVAL, INTERSTITIAL_TTL_MS, retryDelay } from './adPolicy';

export const AD_UNITS = {
  banner: 'ca-app-pub-7381421031784616/7513209189',
  interstitial: 'ca-app-pub-7381421031784616/4088969499',
  rewarded: 'ca-app-pub-7381421031784616/8184203153',
};
const RuntimeInfo = registerPlugin<{ getInfo(): Promise<{ requiresGdprConsent: boolean }> }>('RuntimeInfo');
type AdModule = typeof import('@capacitor-community/admob');
type ConsentInfo = import('@capacitor-community/admob').AdmobConsentInfo;
export interface AdsState { privacyRequired: boolean; bannerLoaded: boolean; showing: boolean }
const initialState: AdsState = { privacyRequired: false, bannerLoaded: false, showing: false };

/** Singleton owns native listeners/requests, independent of React card renders. */
export class AdsController {
  private module: AdModule | null = null;
  private state = initialState;
  private subscribers = new Set<() => void>();
  private listeners: PluginListenerHandle[] = [];
  private startPromise: Promise<void> | null = null;
  private startRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private startRetryAttempt = 0;
  private consent: ConsentInfo | null = null;
  private adRequestsAllowed = false;
  private ready = false;
  private active = true;
  private online = globalThis.navigator?.onLine ?? true;
  private blocked = false;
  private busyWithConsent = false;
  private disposed = false;
  private interstitialLoading = false;
  private rewardedBusy = false;
  private rewardedLoadedAt: number | null = null;
  private rewardedLoad: Promise<void> | null = null;
  private rewardedRetryAt = 0;
  private adRequestGeneration = 0;
  private loadedAt: number | null = null;
  private startedAt = Date.now();
  private requiresGdprConsent = true;
  private lastShownAt: number | null = null;
  private actions = 0;
  private swipeActions = 0;
  private retryAttempt = 0;
  private interstitialRetryAt = 0;
  private preloadTimer: ReturnType<typeof setTimeout> | null = null;
  private preloadAt = 0;
  private bannerCreated = false;
  private bannerVisible = false;
  private bannerOverlayOpen = false;
  private bannerSync: Promise<void> | null = null;
  private bannerSyncPending = false;
  private bannerRetryAt = 0;
  private bannerRetryAttempt = 0;
  private bannerRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private bannerNeedsReload = false;
  private consentRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private privacyOpen = false;
  private finishShowing: ((shown: boolean) => void) | null = null;
  private interstitialShown = false;
  private showAttempt = 0;
  private finishWatchdog: ReturnType<typeof setTimeout> | null = null;
  // Session diagnostics only: impressions come from SDK callbacks, never
  // from requests, loads, paid events, or attempts to show an ad.
  private metrics = {
    bannerManualRequests: 0, bannerLoads: 0, bannerLoadFailures: 0, bannerImpressions: 0,
    interstitialRequests: 0, interstitialLoads: 0, interstitialLoadFailures: 0,
    interstitialShows: 0, interstitialShowFailures: 0, interstitialImpressions: 0,
  };
  getDiagnostics = () => ({
    ...this.metrics, active: this.active, online: this.online, blocked: this.blocked,
    requestsAllowed: this.ready && this.adRequestsAllowed,
    bannerVisible: this.bannerVisible, bannerLoaded: this.state.bannerLoaded,
    interstitialReady: this.loadedAt !== null && Date.now() - this.loadedAt < INTERSTITIAL_TTL_MS,
    interstitialLoading: this.interstitialLoading,
  });

  subscribe = (callback: () => void) => { this.subscribers.add(callback); return () => { this.subscribers.delete(callback); }; };
  getSnapshot = () => this.state;
  private update(values: Partial<AdsState>) {
    const next = { ...this.state, ...values };
    if (next.privacyRequired === this.state.privacyRequired &&
      next.bannerLoaded === this.state.bannerLoaded &&
      next.showing === this.state.showing) return;
    this.state = next;
    this.subscribers.forEach(callback => callback());
  }
  start(): Promise<void> {
    if (this.disposed || Capacitor.getPlatform() !== 'android') return Promise.resolve();
    if (this.startRetryTimer) clearTimeout(this.startRetryTimer);
    this.startRetryTimer = null;
    this.startPromise ||= this.initialize().catch(async error => {
      console.warn('Ads unavailable; offline app remains usable', error);
      await Promise.allSettled(this.listeners.splice(0).map(handle => handle.remove()));
      this.startPromise = null;
      if (!this.disposed) {
        this.startRetryTimer = setTimeout(() => {
          this.startRetryTimer = null;
          void this.start();
        }, retryDelay(this.startRetryAttempt++));
      }
    });
    return this.startPromise;
  }
  private async initialize() {
    const [module, runtime, { App }, { Network }] = await Promise.all([
      import('@capacitor-community/admob'), RuntimeInfo.getInfo(), import('@capacitor/app'), import('@capacitor/network'),
    ]);
    if (this.disposed) return;
    this.requiresGdprConsent = runtime.requiresGdprConsent !== false;
    this.module = module;
    const { AdMob, InterstitialAdPluginEvents: events, BannerAdPluginEvents: bannerEvents } = module;
    const registrations = await Promise.allSettled([
      AdMob.addListener(events.Dismissed, () => this.completeShow()),
      AdMob.addListener(events.Showed, () => this.markShown()),
      AdMob.addListener(events.FailedToShow, error => {
        this.metrics.interstitialShowFailures++;
        console.warn('Interstitial failed to show', error);
        this.completeShow();
      }),
      // The plugin's standard interstitial AdImpression event contains paid
      // revenue, not onAdImpression. Our native patch forwards the actual SDK
      // impression separately so zero-revenue impressions are counted too.
      (AdMob as unknown as Pick<Plugin, 'addListener'>).addListener('interstitialAdRecordedImpression', () => { this.metrics.interstitialImpressions++; }),
      AdMob.addListener(bannerEvents.AdImpression, () => { this.metrics.bannerImpressions++; }),
      AdMob.addListener(bannerEvents.Loaded, () => this.onBannerLoaded()),
      AdMob.addListener(bannerEvents.FailedToLoad, error => this.onBannerFailedToLoad(error)),
      AdMob.addListener(bannerEvents.Opened, () => {
        this.bannerOverlayOpen = true;
        this.cancelPreload();
        this.cancelBannerRetry();
        void this.syncBanner();
      }),
      AdMob.addListener(bannerEvents.Closed, () => {
        this.bannerOverlayOpen = false;
        this.resumeAds();
      }),
      App.addListener('appStateChange', ({ isActive }) => {
        this.active = isActive;
        if (isActive) {
          this.resumeAds();
        } else { this.cancelPreload(); this.cancelBannerRetry(); this.cancelConsentRetry(); void this.syncBanner(); }
      }),
      Network.addListener('networkStatusChange', ({ connected }) => {
        this.online = connected;
        if (connected) {
          this.resumeAds();
        } else { this.cancelPreload(); this.cancelBannerRetry(); this.cancelConsentRetry(); void this.syncBanner(); }
      }),
    ]);
    const handles = registrations.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    if (registrations.some(result => result.status === 'rejected')) {
      await Promise.allSettled(handles.map(handle => handle.remove()));
      throw new Error('Could not register ad lifecycle listeners');
    }
    if (this.disposed) { await Promise.all(handles.map(handle => handle.remove())); return; }
    this.listeners.push(...handles);
    this.online = (await Network.getStatus()).connected;
    this.active = (await App.getState()).isActive;
    await this.requestConsent();
    this.startRetryAttempt = 0;
  }
  private resumeAds() {
    if (this.disposed) return;
    if (!this.ready || !this.adRequestsAllowed) void this.requestConsent();
    this.schedulePreload(800);
    void this.syncBanner();
  }
  private async requestConsent() {
    if (!this.module || !this.active || !this.online || this.busyWithConsent || this.disposed) return;
    this.busyWithConsent = true;
    this.cancelConsentRetry();
    const { AdMob, AdmobConsentStatus } = this.module;
    try {
      if (!this.requiresGdprConsent) {
        this.adRequestsAllowed = true;
        this.update({ privacyRequired: false });
        if (!this.ready) {
          await AdMob.initialize({ initializeForTesting: false });
          if (this.disposed) return;
          this.ready = true;
        }
        return;
      }
      // GDPR regions must remain blocked until UMP confirms consent or that
      // consent is not required for this user.
      this.adRequestsAllowed = false;
      this.consent = await AdMob.requestConsentInfo();
      if (this.consent.isConsentFormAvailable && this.consent.status === AdmobConsentStatus.REQUIRED) {
        this.consent = await AdMob.showConsentForm();
      }
      this.update({ privacyRequired: this.consent.privacyOptionsRequirementStatus === 'REQUIRED' });
      this.adRequestsAllowed = this.consent.canRequestAds;
      if (!this.adRequestsAllowed || this.disposed) return;
      if (!this.ready) {
        await AdMob.initialize({ initializeForTesting: false });
        if (this.disposed) return;
        this.ready = true;
      }
    } catch (error) {
      console.warn('Ad consent could not be updated', error);
      if (this.active && this.online && !this.disposed) {
        this.consentRetryTimer = setTimeout(() => { this.consentRetryTimer = null; void this.requestConsent(); }, 60000);
      }
    } finally {
      this.busyWithConsent = false;
      // Banner operations must not delay the independent interstitial load.
      this.schedulePreload(800);
      void this.syncBanner();
    }
  }
  private cancelConsentRetry() {
    if (this.consentRetryTimer) clearTimeout(this.consentRetryTimer);
    this.consentRetryTimer = null;
  }
  private cancelBannerRetry() {
    if (this.bannerRetryTimer) clearTimeout(this.bannerRetryTimer);
    this.bannerRetryTimer = null;
  }
  private onBannerLoaded() {
    if (this.disposed) return;
    this.metrics.bannerLoads++;
    this.bannerNeedsReload = false;
    this.bannerRetryAttempt = 0;
    this.bannerRetryAt = 0;
    this.cancelBannerRetry();
    this.update({ bannerLoaded: true });
    void this.syncBanner();
  }
  private onBannerFailedToLoad(error: unknown) {
    if (this.disposed) return;
    this.metrics.bannerLoadFailures++;
    // Keep the AdView and any displayed creative. A failed automatic refresh
    // must not destroy the banner or fight the SDK's refresh scheduling.
    // Only an empty slot gets a bounded fallback retry on the same AdView.
    if (!this.state.bannerLoaded) {
      this.bannerNeedsReload = true;
      this.scheduleBannerRetry();
    }
    console.warn('Banner failed to load', error);
  }
  private scheduleBannerRetry() {
    this.cancelBannerRetry();
    this.bannerRetryAt = Date.now() + Math.max(60000, retryDelay(this.bannerRetryAttempt++));
    if (!this.active || !this.online || this.blocked || this.privacyOpen || this.bannerOverlayOpen || this.state.showing || this.disposed) return;
    this.bannerRetryTimer = setTimeout(() => { this.bannerRetryTimer = null; void this.syncBanner(); }, this.bannerRetryAt - Date.now());
  }
  private wantsBanner() {
    return this.active && !this.blocked && !this.busyWithConsent && !this.privacyOpen && !this.bannerOverlayOpen && !this.state.showing &&
      this.adRequestsAllowed && window.innerWidth >= 320;
  }
  setBlocked(blocked: boolean) {
    if (this.blocked === blocked) return;
    this.blocked = blocked;
    if (blocked) { this.cancelBannerRetry(); this.cancelPreload(); }
    else this.schedulePreload(800);
    void this.syncBanner();
  }
  refreshViewport() { void this.syncBanner(); }
  /** Warm one reward when the preview opens; never request repeatedly while idle. */
  async prepareLoveCardReward(): Promise<void> {
    await this.start();
    if (!this.module || !this.ready || !this.adRequestsAllowed || !this.online || !this.active || this.disposed) {
      throw new Error('Ads are unavailable right now. Please try again shortly.');
    }
    if (this.rewardedLoadedAt !== null && Date.now() - this.rewardedLoadedAt < INTERSTITIAL_TTL_MS) return;
    if (Date.now() < this.rewardedRetryAt) throw new Error('No ad available right now. Please try again in a minute.');
    if (!this.rewardedLoad) {
      const generation = this.adRequestGeneration;
      this.rewardedLoad = this.module.AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded, isTesting: false })
        .then(() => {
          if (generation !== this.adRequestGeneration || this.disposed || !this.adRequestsAllowed) throw new Error('Ad availability changed. Please retry.');
          this.rewardedLoadedAt = Date.now();
          this.rewardedRetryAt = 0;
        }).catch(error => { this.rewardedRetryAt = Date.now() + 60000; throw error; }).finally(() => { this.rewardedLoad = null; });
    }
    await this.rewardedLoad;
  }
  async showLoveCardReward(onEarned: () => void): Promise<boolean> {
    if (this.rewardedBusy || this.state.showing || this.busyWithConsent || this.privacyOpen) return false;
    this.rewardedBusy = true;
    this.cancelPreload();
    this.update({ showing: true });
    const handles: PluginListenerHandle[] = [];
    let earned = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      // Bound loading, while allowing a late successful load to remain cached.
      await Promise.race([
        this.prepareLoveCardReward(),
        new Promise<never>((_, reject) => { watchdog = setTimeout(() => reject(new Error('Ad loading timed out. Please try again.')), 20000); }),
      ]);
      clearTimeout(watchdog);
      if (!this.module || !this.active || !this.online || !this.adRequestsAllowed) throw new Error('Ad unavailable. Please retry.');
      const { AdMob, RewardAdPluginEvents: events } = this.module;
      const dismissed = new Promise<void>((resolve, reject) => {
        const register = async () => {
          handles.push(await AdMob.addListener(events.Rewarded, () => {
            if (earned) return;
            earned = true;
            onEarned();
          }));
          handles.push(await AdMob.addListener(events.Dismissed, () => resolve()));
          handles.push(await AdMob.addListener(events.FailedToShow, () => reject(new Error('Ad could not open. Please retry.'))));
          handles.push(await AdMob.addListener(events.Showed, () => {
            clearTimeout(watchdog);
            this.lastShownAt = Date.now();
            this.actions = this.swipeActions = 0;
          }));
          await this.syncBanner();
          this.rewardedLoadedAt = null;
          watchdog = setTimeout(() => reject(new Error('Ad could not open. Please retry.')), 15000);
          // The promise alone is not proof that the reward was earned.
          void AdMob.showRewardVideoAd().catch(reject);
        };
        void register().catch(reject);
      });
      await dismissed;
      return earned;
    } finally {
      clearTimeout(watchdog);
      await Promise.allSettled(handles.map(handle => handle.remove()));
      this.rewardedBusy = false;
      this.update({ showing: false });
      if (earned) this.lastShownAt = Date.now();
      void this.syncBanner();
      this.schedulePreload(1000);
    }
  }
  private syncBanner(): Promise<void> {
    this.bannerSyncPending = true;
    if (!this.bannerSync) {
      // Calls during a native operation join the queue and wait until the
      // latest visibility is applied (including hide-before-interstitial).
      this.bannerSync = Promise.resolve().then(async () => {
        while (this.bannerSyncPending && !this.disposed) {
          this.bannerSyncPending = false;
          await this.reconcileBanner();
        }
      }).finally(() => {
        this.bannerSync = null;
        if (this.bannerSyncPending && !this.disposed) void this.syncBanner();
      });
    }
    return this.bannerSync;
  }
  private async reconcileBanner() {
    if (!this.ready || !this.module || this.disposed) return;
    const { AdMob, BannerAdSize, BannerAdPosition } = this.module;
    try {
      const visible = this.wantsBanner();
      if (!visible) this.cancelBannerRetry();
      if (this.bannerCreated && visible !== this.bannerVisible) {
        if (visible) await AdMob.resumeBanner(); else await AdMob.hideBanner();
        this.bannerVisible = visible;
      }
      if (visible && (!this.bannerCreated || this.bannerNeedsReload) && this.online && this.adRequestsAllowed) {
        if (Date.now() < this.bannerRetryAt) {
          if (!this.bannerRetryTimer) this.bannerRetryTimer = setTimeout(() => { this.bannerRetryTimer = null; void this.syncBanner(); }, this.bannerRetryAt - Date.now());
          return;
        }
        this.bannerNeedsReload = false;
        this.bannerCreated = this.bannerVisible = true;
        this.metrics.bannerManualRequests++;
        await AdMob.showBanner({
          adId: AD_UNITS.banner,
          adSize: BannerAdSize.BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 12,
          isTesting: false,
        });
      }
    } catch (error) {
      this.bannerCreated = this.bannerVisible = false;
      this.bannerNeedsReload = false;
      this.update({ bannerLoaded: false });
      await AdMob.removeBanner().catch(() => {});
      this.scheduleBannerRetry();
      console.warn('Banner unavailable', error);
    }
    finally {
      // Visibility can change while a native call is in flight.
      const wanted = this.wantsBanner();
      if (this.bannerCreated && wanted !== this.bannerVisible) this.bannerSyncPending = true;
    }
  }
  private cancelPreload() {
    if (this.preloadTimer) clearTimeout(this.preloadTimer);
    this.preloadTimer = null;
    this.preloadAt = 0;
  }
  private schedulePreload(delay: number) {
    if (!this.ready || !this.adRequestsAllowed || this.blocked || this.busyWithConsent || this.privacyOpen || this.bannerOverlayOpen || !this.active || !this.online || this.disposed || this.state.showing || this.interstitialLoading) return;
    // Hold one loaded ad. Refresh an expired ad on the next interaction or
    // foreground transition instead of requesting ads repeatedly while idle.
    if (this.loadedAt !== null && Date.now() - this.loadedAt < INTERSTITIAL_TTL_MS) return;
    const nextLoadAt = this.lastShownAt === null ? 0 : this.lastShownAt + INTERSTITIAL_COOLDOWN_MS - INTERSTITIAL_PRELOAD_LEAD_MS;
    const dueAt = Math.max(Date.now() + delay, this.interstitialRetryAt, nextLoadAt);
    if (this.preloadTimer && this.preloadAt <= dueAt) return;
    this.cancelPreload();
    this.preloadAt = dueAt;
    this.preloadTimer = setTimeout(() => {
      this.preloadTimer = null;
      this.preloadAt = 0;
      void this.preload();
    }, Math.max(0, dueAt - Date.now()));
  }
  private async preload() {
    if (!this.module || !this.ready || !this.adRequestsAllowed || this.blocked || this.busyWithConsent || this.privacyOpen || this.bannerOverlayOpen || !this.active || !this.online || this.disposed || this.interstitialLoading || this.state.showing) return;
    if (this.loadedAt !== null && Date.now() - this.loadedAt < INTERSTITIAL_TTL_MS) {
      return;
    }
    if (Date.now() < this.interstitialRetryAt) { this.schedulePreload(0); return; }
    this.interstitialLoading = true;
    this.loadedAt = null;
    const generation = this.adRequestGeneration;
    try {
      this.metrics.interstitialRequests++;
      await this.module.AdMob.prepareInterstitial({
        adId: AD_UNITS.interstitial, isTesting: false,
      });
      if (this.disposed || !this.adRequestsAllowed || generation !== this.adRequestGeneration) return;
      this.loadedAt = Date.now();
      this.metrics.interstitialLoads++;
      this.retryAttempt = 0;
      this.interstitialRetryAt = 0;
    } catch (error) {
      if (this.disposed || generation !== this.adRequestGeneration) return;
      this.metrics.interstitialLoadFailures++;
      // No fill is inventory unavailability, not a broken connection. Give
      // the auction time to change instead of repeatedly requesting nothing.
      const noFill = error instanceof Error && /no[\s-]?fill/i.test(error.message);
      this.interstitialRetryAt = Date.now() + Math.max(noFill ? 60000 : 0, retryDelay(this.retryAttempt++));
      console.warn('Interstitial failed to load; retry scheduled', error);
    } finally {
      this.interstitialLoading = false;
      if (this.loadedAt === null) this.schedulePreload(0);
    }
  }
  /** Explicit Next/Shuffle and accepted swipes have independent thresholds. */
  maybeShowInterstitial(): Promise<boolean> {
    this.actions = Math.min(this.actions + 1, INTERSTITIAL_MIN_ACTIONS);
    return this.tryShowInterstitial();
  }
  recordSwipe() {
    this.swipeActions = Math.min(this.swipeActions + 1, INTERSTITIAL_SWIPE_INTERVAL);
  }
  maybeShowInterstitialAfterSwipe(): Promise<boolean> {
    return this.tryShowInterstitial();
  }
  private async tryShowInterstitial(): Promise<boolean> {
    const due = this.actions >= INTERSTITIAL_MIN_ACTIONS || this.swipeActions >= INTERSTITIAL_SWIPE_INTERVAL;
    if (!this.module || !canShowInterstitial({
      loadedAt: this.loadedAt, startedAt: this.startedAt, lastShownAt: this.lastShownAt,
      actions: due ? INTERSTITIAL_MIN_ACTIONS : 0, active: this.active, online: this.online,
      blocked: this.blocked || this.busyWithConsent || this.privacyOpen || this.bannerOverlayOpen || !this.ready || !this.adRequestsAllowed || this.disposed,
      showing: this.state.showing,
    }, Date.now())) { this.schedulePreload(1000); return false; }
    this.cancelPreload();
    const { AdMob } = this.module;
    const preparedAt = this.loadedAt!;
    const attempt = ++this.showAttempt;
    let handedToSdk = false;
    this.loadedAt = null;
    this.interstitialShown = false;
    const dismissed = new Promise<boolean>(resolve => { this.finishShowing = resolve; });
    this.update({ showing: true });
    // Cover both banner hide and the show handshake. A missing native promise
    // must not leave the UI busy forever or consume an unused cached ad.
    this.finishWatchdog = setTimeout(() => {
      if (attempt !== this.showAttempt || this.interstitialShown) return;
      if (!handedToSdk) this.loadedAt = preparedAt;
      this.completeShow();
    }, 15000);
    const show = async () => {
      await this.syncBanner();
      if (attempt !== this.showAttempt || !this.state.showing) return;
      // The user can background the app or open a dialog while hiding the
      // banner. Recheck before handing the loaded ad to the SDK.
      if (!this.active || !this.online || this.blocked || this.busyWithConsent || this.privacyOpen || this.bannerOverlayOpen || this.disposed || !this.adRequestsAllowed || Date.now() - preparedAt >= INTERSTITIAL_TTL_MS) {
        this.loadedAt = preparedAt;
        this.completeShow();
        return;
      }
      handedToSdk = true;
      await AdMob.showInterstitial({ adId: AD_UNITS.interstitial });
    };
    void show().catch(error => {
      if (attempt !== this.showAttempt || !this.state.showing || this.interstitialShown) return;
      console.warn('Interstitial show call failed', error);
      if (!handedToSdk) this.loadedAt = preparedAt;
      this.completeShow();
    });
    // Native events determine the result, even if the bridge promise hangs.
    return await dismissed;
  }
  private markShown() {
    if (!this.state.showing || this.interstitialShown) return;
    this.interstitialShown = true;
    this.metrics.interstitialShows++;
    this.lastShownAt = Date.now();
    this.actions = this.swipeActions = 0;
    if (this.finishWatchdog) clearTimeout(this.finishWatchdog);
    this.finishWatchdog = null;
  }
  private completeShow() {
    if (!this.state.showing) return;
    if (this.finishWatchdog) clearTimeout(this.finishWatchdog);
    this.finishWatchdog = null;
    const finish = this.finishShowing;
    this.finishShowing = null;
    if (!this.interstitialShown && this.loadedAt === null) {
      this.interstitialRetryAt = Date.now() + retryDelay(this.retryAttempt++);
    }
    this.update({ showing: false });
    finish?.(this.interstitialShown);
    void this.syncBanner();
    this.schedulePreload(1000);
  }
  async showPrivacyOptions(): Promise<void> {
    if (!this.requiresGdprConsent || !this.module || this.busyWithConsent || this.state.showing) return;
    this.busyWithConsent = true;
    this.privacyOpen = true;
    this.cancelConsentRetry();
    this.cancelPreload();
    this.cancelBannerRetry();
    try {
      await this.syncBanner();
      await this.module.AdMob.showPrivacyOptionsForm();
      if (this.disposed) return;
      this.adRequestGeneration++;
      this.rewardedLoadedAt = null;
      this.loadedAt = null;
      this.adRequestsAllowed = false;
      if (this.bannerCreated) await this.module.AdMob.removeBanner();
      this.bannerCreated = this.bannerVisible = false;
      this.bannerNeedsReload = false;
      this.update({ bannerLoaded: false });
      this.consent = await this.module.AdMob.requestConsentInfo();
      if (this.disposed) return;
      this.update({ privacyRequired: this.consent.privacyOptionsRequirementStatus === 'REQUIRED' });
      this.adRequestsAllowed = this.consent.canRequestAds;
      if (!this.ready && this.adRequestsAllowed) {
        await this.module.AdMob.initialize({ initializeForTesting: false });
        this.ready = true;
      }
      this.bannerRetryAt = 0;
    } catch (error) {
      // Recover via the normal consent update instead of leaving a ready SDK
      // with requests permanently disabled after a failed privacy refresh.
      this.adRequestsAllowed = false;
      if (!this.disposed && this.active && this.online) {
        this.consentRetryTimer = setTimeout(() => {
          this.consentRetryTimer = null;
          void this.requestConsent();
        }, 60000);
      }
      throw error;
    } finally {
      this.busyWithConsent = false;
      this.privacyOpen = false;
      void this.syncBanner();
      this.schedulePreload(1000);
    }
  }
  async dispose() {
    this.disposed = true;
    this.adRequestGeneration++;
    this.cancelPreload();
    this.cancelBannerRetry();
    this.cancelConsentRetry();
    if (this.startRetryTimer) clearTimeout(this.startRetryTimer);
    this.startRetryTimer = null;
    if (this.finishWatchdog) clearTimeout(this.finishWatchdog);
    this.finishShowing?.(false);
    this.finishShowing = null;
    await Promise.allSettled(this.listeners.map(handle => handle.remove()));
    await this.bannerSync;
    if (this.bannerCreated) await this.module?.AdMob.removeBanner().catch(() => {});
  }
}

export const ads = new AdsController();
if (import.meta.hot) import.meta.hot.dispose(() => { void ads.dispose(); });
