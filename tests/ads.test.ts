import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { Capacitor } from '@capacitor/core';
import { AdsController } from '../src/services/ads';
import { INTERSTITIAL_COOLDOWN_MS, INTERSTITIAL_PRELOAD_LEAD_MS, INTERSTITIAL_TTL_MS } from '../src/services/adPolicy';

// Fake the native bridge and clock: these tests never request real ads.
type Harness = {
  module: { AdMob: Record<string, (...args: unknown[]) => Promise<unknown>>; BannerAdSize: { BANNER: string }; BannerAdPosition: { BOTTOM_CENTER: string }; AdmobConsentStatus?: { REQUIRED: string } };
  ready: boolean; adRequestsAllowed: boolean; active: boolean; online: boolean;
  loadedAt: number | null; startedAt: number; lastShownAt: number | null;
  actions: number; swipeActions: number; interstitialRetryAt: number;
  adRequestGeneration: number;
  requiresGdprConsent: boolean; bannerOverlayOpen: boolean;
  initialize(): Promise<void>; requestConsent(): Promise<void>;
  schedulePreload(delay: number): void; markShown(): void; completeShow(): void;
  syncBanner(): Promise<void>;
  onBannerLoaded(): void; onBannerFailedToLoad(error: unknown): void;
};

Object.defineProperty(globalThis, 'window', { value: { innerWidth: 390 }, configurable: true });

function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 500_000 });
  t.mock.method(console, 'warn', () => {});
  const controller = new AdsController();
  const state = controller as unknown as Harness;
  let loads = 0;
  let shows = 0;
  const AdMob: Harness['module']['AdMob'] = {
    prepareInterstitial: async () => { loads++; },
    showInterstitial: async () => { shows++; state.markShown(); state.completeShow(); },
    showBanner: async () => {}, hideBanner: async () => {}, resumeBanner: async () => {}, removeBanner: async () => {},
  };
  Object.assign(state, {
    module: { AdMob, BannerAdSize: { BANNER: 'BANNER' }, BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' } },
    ready: true, adRequestsAllowed: true, active: true, online: true,
    startedAt: 0, loadedAt: Date.now() - 1000,
  });
  t.after(() => controller.dispose());
  return { controller, state, AdMob, loads: () => loads, shows: () => shows };
}

async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

test('six swipes remain due through cooldown, then reset only when an ad really shows', async t => {
  const { controller, state, shows } = setup(t);
  for (let i = 0; i < 5; i++) controller.recordSwipe();
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), false);
  assert.equal(state.swipeActions, 5);
  assert.equal(state.actions, 0);
  controller.recordSwipe();
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), true);
  assert.equal(shows(), 1);
  assert.equal(state.swipeActions, 0);
  assert.equal(state.lastShownAt, Date.now());
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), false);
  assert.equal(state.swipeActions, 6);
  state.loadedAt = Date.now();
  t.mock.timers.tick(INTERSTITIAL_COOLDOWN_MS);
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), true);
  assert.equal(shows(), 2);
  assert.equal(state.swipeActions, 0);
});

test('a failed native show retains eligibility and does not start the cooldown', async t => {
  const { controller, state, AdMob, loads } = setup(t);
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  AdMob.showInterstitial = async () => { state.completeShow(); };
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), false);
  assert.equal(state.swipeActions, 6);
  assert.equal(state.lastShownAt, null);
  assert.equal(controller.getSnapshot().showing, false);
  assert.ok(state.interstitialRetryAt >= Date.now() + 15_000);
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(loads(), 0);
});

test('rapid interactions do not postpone the first preload', async t => {
  const { controller, state, loads } = setup(t);
  state.loadedAt = null;
  state.schedulePreload(1000);
  t.mock.timers.tick(500);
  controller.recordSwipe();
  await controller.maybeShowInterstitialAfterSwipe();
  t.mock.timers.tick(500);
  await flush();
  assert.equal(loads(), 1);
  assert.equal(state.loadedAt, Date.now());
});

test('a load failure keeps its retry backoff despite further card actions', async t => {
  const { controller, state, AdMob } = setup(t);
  state.loadedAt = null;
  let attempts = 0;
  AdMob.prepareInterstitial = async () => { if (++attempts === 1) throw new Error('No fill'); };
  state.schedulePreload(0);
  t.mock.timers.tick(0);
  await flush();
  const retryAt = state.interstitialRetryAt;
  assert.ok(retryAt >= Date.now() + 60_000);
  for (let i = 0; i < 8; i++) await controller.maybeShowInterstitial();
  t.mock.timers.tick(retryAt - Date.now() - 1);
  await flush();
  assert.equal(attempts, 1);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(attempts, 2);
  assert.equal(state.loadedAt, Date.now());
});

test('one cached ad is reused and expires without an idle request loop', async t => {
  const { state, loads } = setup(t);
  state.schedulePreload(0);
  t.mock.timers.tick(0);
  await flush();
  assert.equal(loads(), 0);
  t.mock.timers.tick(INTERSTITIAL_TTL_MS);
  await flush();
  assert.equal(loads(), 0);
  state.schedulePreload(0);
  t.mock.timers.tick(0);
  await flush();
  assert.equal(loads(), 1);
});

test('show waits for an in-flight banner creation to finish and hide', async t => {
  const { controller, state, AdMob } = setup(t);
  const calls: string[] = [];
  let releaseBanner!: () => void;
  AdMob.showBanner = () => { calls.push('create'); return new Promise<void>(resolve => { releaseBanner = resolve; }); };
  AdMob.hideBanner = async () => { calls.push('hide'); };
  AdMob.showInterstitial = async () => { calls.push('show'); state.markShown(); state.completeShow(); };
  const banner = state.syncBanner();
  await flush();
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  const show = controller.maybeShowInterstitialAfterSwipe();
  await flush();
  assert.deepEqual(calls, ['create']);
  releaseBanner();
  await banner;
  assert.equal(await show, true);
  assert.deepEqual(calls.slice(0, 3), ['create', 'hide', 'show']);
});

test('concurrent triggers consume a loaded interstitial only once', async t => {
  const { controller, state, AdMob, loads } = setup(t);
  let shows = 0;
  AdMob.showInterstitial = async () => { shows++; state.markShown(); };
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  const first = controller.maybeShowInterstitialAfterSwipe();
  const second = controller.maybeShowInterstitialAfterSwipe();
  await flush();
  assert.equal(await second, false);
  assert.equal(shows, 1);
  t.mock.timers.tick(30_000);
  assert.equal(controller.getSnapshot().showing, true);
  state.completeShow();
  state.completeShow();
  assert.equal(await first, true);
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(loads(), 0);
  t.mock.timers.tick(INTERSTITIAL_COOLDOWN_MS - INTERSTITIAL_PRELOAD_LEAD_MS - 31_000);
  await flush();
  assert.equal(loads(), 1);
});

test('an overlay opening during banner hide preserves the cached ad and swipe count', async t => {
  const { controller, state, shows } = setup(t);
  const preparedAt = state.loadedAt;
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  const pending = controller.maybeShowInterstitialAfterSwipe();
  controller.setBlocked(true);
  assert.equal(await pending, false);
  assert.equal(shows(), 0);
  assert.equal(state.loadedAt, preparedAt);
  assert.equal(state.swipeActions, 6);
});

test('a load started before privacy choices change cannot repopulate the ad cache', async t => {
  const { state, AdMob } = setup(t);
  state.loadedAt = null;
  let releaseLoad!: () => void;
  AdMob.prepareInterstitial = () => new Promise<void>(resolve => { releaseLoad = resolve; });
  state.schedulePreload(0);
  t.mock.timers.tick(0);
  await flush();
  state.adRequestGeneration++;
  releaseLoad();
  await flush();
  assert.equal(state.loadedAt, null);
});

test('interstitial preload proceeds while banner creation is pending', async t => {
  const { state, AdMob, loads } = setup(t);
  state.loadedAt = null;
  state.requiresGdprConsent = false;
  let releaseBanner!: () => void;
  AdMob.showBanner = () => new Promise<void>(resolve => { releaseBanner = resolve; });
  await state.requestConsent();
  await flush();
  t.mock.timers.tick(800);
  await flush();
  assert.equal(loads(), 1);
  releaseBanner();
  await state.syncBanner();
});

test('a hung native show call releases the UI without resetting eligibility', async t => {
  const { controller, state, AdMob } = setup(t);
  let rejectOldShow!: (error: Error) => void;
  AdMob.showInterstitial = () => new Promise<void>((_, reject) => { rejectOldShow = reject; });
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  const first = controller.maybeShowInterstitialAfterSwipe();
  await flush();
  t.mock.timers.tick(15000);
  assert.equal(await first, false);
  assert.equal(controller.getSnapshot().showing, false);
  assert.equal(state.swipeActions, 6);
  assert.equal(state.lastShownAt, null);
  state.loadedAt = Date.now();
  AdMob.showInterstitial = async () => {};
  const second = controller.maybeShowInterstitialAfterSwipe();
  await flush();
  rejectOldShow(new Error('Late rejection from previous call'));
  await flush();
  assert.equal(controller.getSnapshot().showing, true);
  state.markShown();
  state.completeShow();
  assert.equal(await second, true);
});

test('native dismissal completes a shown ad even if its bridge promise never resolves', async t => {
  const { controller, state, AdMob } = setup(t);
  AdMob.showInterstitial = () => { state.markShown(); return new Promise<void>(() => {}); };
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  const pending = controller.maybeShowInterstitialAfterSwipe();
  await flush();
  t.mock.timers.tick(30000);
  assert.equal(controller.getSnapshot().showing, true);
  state.completeShow();
  assert.equal(await pending, true);
});

test('a hung banner call preserves the unused interstitial and cancels its delayed show', async t => {
  const { controller, state, AdMob, shows } = setup(t);
  const preparedAt = state.loadedAt;
  let releaseBanner!: () => void;
  AdMob.showBanner = () => new Promise<void>(resolve => { releaseBanner = resolve; });
  const banner = state.syncBanner();
  await flush();
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  const pending = controller.maybeShowInterstitialAfterSwipe();
  await flush();
  t.mock.timers.tick(15000);
  assert.equal(await pending, false);
  assert.equal(state.loadedAt, preparedAt);
  assert.equal(state.swipeActions, 6);
  releaseBanner();
  await banner;
  await flush();
  assert.equal(shows(), 0);
});

test('an ad that expires while waiting for banner hide is replaced rather than displayed', async t => {
  const { controller, state, AdMob, shows, loads } = setup(t);
  state.loadedAt = Date.now() - INTERSTITIAL_TTL_MS + 500;
  let releaseBanner!: () => void;
  AdMob.showBanner = () => new Promise<void>(resolve => { releaseBanner = resolve; });
  const banner = state.syncBanner();
  await flush();
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  const pending = controller.maybeShowInterstitialAfterSwipe();
  t.mock.timers.tick(1000);
  releaseBanner();
  await banner;
  assert.equal(await pending, false);
  assert.equal(shows(), 0);
  assert.equal(state.swipeActions, 6);
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(loads(), 1);
});

test('privacy refresh failure retries consent even when the SDK is already ready', async t => {
  const { controller, state, AdMob, loads } = setup(t);
  state.module.AdmobConsentStatus = { REQUIRED: 'REQUIRED' };
  AdMob.showPrivacyOptionsForm = async () => {};
  let requests = 0;
  AdMob.requestConsentInfo = async () => {
    if (++requests === 1) throw new Error('Temporary network failure');
    return { canRequestAds: true, isConsentFormAvailable: false, status: 'OBTAINED', privacyOptionsRequirementStatus: 'NOT_REQUIRED' };
  };
  await assert.rejects(controller.showPrivacyOptions());
  assert.equal(state.ready, true);
  assert.equal(state.adRequestsAllowed, false);
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(requests, 2);
  assert.equal(state.adRequestsAllowed, true);
  t.mock.timers.tick(800);
  await flush();
  assert.equal(loads(), 1);
});

test('transient startup failures retry automatically and disposal stops retries', async t => {
  const { controller, state } = setup(t);
  t.mock.method(Capacitor, 'getPlatform', () => 'android');
  t.mock.method(Math, 'random', () => 0);
  let attempts = 0;
  t.mock.method(state, 'initialize', async () => {
    if (++attempts < 3) throw new Error('Bridge temporarily unavailable');
  });
  await controller.start();
  t.mock.timers.tick(15000);
  await flush();
  assert.equal(attempts, 2);
  await controller.dispose();
  t.mock.timers.tick(120000);
  await flush();
  assert.equal(attempts, 2);
});

test('a banner landing page blocks interstitials while retaining the loaded ad', async t => {
  const { controller, state, shows } = setup(t);
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  const preparedAt = state.loadedAt;
  state.bannerOverlayOpen = true;
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), false);
  assert.equal(state.loadedAt, preparedAt);
  assert.equal(state.swipeActions, 6);
  state.bannerOverlayOpen = false;
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), true);
  assert.equal(shows(), 1);
});

test('a stale failed load does not impose backoff on the new consent generation', async t => {
  const { state, AdMob } = setup(t);
  state.loadedAt = null;
  let rejectLoad!: (error: Error) => void;
  AdMob.prepareInterstitial = () => new Promise<void>((_, reject) => { rejectLoad = reject; });
  state.schedulePreload(0);
  t.mock.timers.tick(0);
  await flush();
  state.adRequestGeneration++;
  rejectLoad(new Error('Old request failed'));
  await flush();
  assert.equal(state.interstitialRetryAt, 0);
});

test('covered screens cancel pending preloads and resume without duplicate requests', async t => {
  const { controller, state, loads } = setup(t);
  state.loadedAt = null;
  state.schedulePreload(800);
  controller.setBlocked(true);
  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(loads(), 0);
  state.schedulePreload(0);
  t.mock.timers.tick(0);
  await flush();
  assert.equal(loads(), 0);
  controller.setBlocked(false);
  t.mock.timers.tick(800);
  await flush();
  assert.equal(loads(), 1);
  assert.equal(controller.getDiagnostics().interstitialRequests, 1);
  assert.equal(controller.getDiagnostics().interstitialLoads, 1);
  assert.equal(controller.getDiagnostics().interstitialImpressions, 0);
});

test('a cached interstitial survives an overlay without an extra load', async t => {
  const { controller, state, loads, shows } = setup(t);
  const preparedAt = state.loadedAt;
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  controller.setBlocked(true);
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), false);
  t.mock.timers.tick(5000);
  controller.setBlocked(false);
  assert.equal(state.loadedAt, preparedAt);
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), true);
  assert.equal(loads(), 0);
  assert.equal(shows(), 1);
});

test('after dismissal the next preload starts before cooldown expires, not immediately', async t => {
  const { controller, state, loads } = setup(t);
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), true);
  const preloadDelay = INTERSTITIAL_COOLDOWN_MS - INTERSTITIAL_PRELOAD_LEAD_MS;
  for (let i = 0; i < 6; i++) controller.recordSwipe();
  await controller.maybeShowInterstitialAfterSwipe();
  t.mock.timers.tick(preloadDelay - 1);
  await flush();
  assert.equal(loads(), 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(loads(), 1);
  assert.equal(state.loadedAt, Date.now());
  t.mock.timers.tick(INTERSTITIAL_PRELOAD_LEAD_MS);
  assert.equal(await controller.maybeShowInterstitialAfterSwipe(), true);
});

test('a failed banner refresh retains the loaded view and does not trigger manual request loops', async t => {
  const { controller, state, AdMob } = setup(t);
  let requests = 0;
  let removals = 0;
  AdMob.showBanner = async () => { requests++; };
  AdMob.removeBanner = async () => { removals++; };
  await state.syncBanner();
  state.onBannerLoaded();
  await flush();
  state.onBannerFailedToLoad(new Error('No fill on automatic refresh'));
  t.mock.timers.tick(120_000);
  await flush();
  controller.setBlocked(true);
  await state.syncBanner();
  controller.setBlocked(false);
  await state.syncBanner();
  assert.equal(controller.getSnapshot().bannerLoaded, true);
  assert.equal(requests, 1);
  assert.equal(removals, 0);
});

test('an empty banner retries on the same view after backoff and SDK success cancels that retry', async t => {
  const { controller, state, AdMob } = setup(t);
  let requests = 0;
  let removals = 0;
  AdMob.showBanner = async () => { requests++; };
  AdMob.removeBanner = async () => { removals++; };
  await state.syncBanner();
  state.onBannerFailedToLoad(new Error('No fill'));
  for (let i = 0; i < 5; i++) controller.refreshViewport();
  await flush();
  assert.equal(requests, 1);
  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(requests, 2);
  state.onBannerFailedToLoad(new Error('No fill'));
  state.onBannerLoaded();
  t.mock.timers.tick(120_000);
  await flush();
  assert.equal(requests, 2);
  assert.equal(removals, 0);
  assert.equal(controller.getSnapshot().bannerLoaded, true);
  assert.equal(controller.getDiagnostics().bannerImpressions, 0);
});

test('a failed empty banner stays paused while an overlay covers its slot', async t => {
  const { controller, state, AdMob } = setup(t);
  let requests = 0;
  AdMob.showBanner = async () => { requests++; };
  await state.syncBanner();
  state.onBannerFailedToLoad(new Error('No fill'));
  controller.setBlocked(true);
  await state.syncBanner();
  t.mock.timers.tick(120_000);
  await flush();
  assert.equal(requests, 1);
  controller.setBlocked(false);
  await state.syncBanner();
  assert.equal(requests, 2);
});
