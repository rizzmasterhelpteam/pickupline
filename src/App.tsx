import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import type { CategoryKey, PickupLine, RizzReaction } from './types';
import { getRandomPickupLine } from './services/pickupLineApi';
import { ads } from './services/ads';
import { Header } from './components/Header';
import { CategoryBar } from './components/CategoryBar';
import { PickupCard } from './components/PickupCard';
import { ActionBar } from './components/ActionBar';
import { SavedDrawer } from './components/SavedDrawer';
import { IcebreakerModal } from './components/IcebreakerModal';
import { sanitizePickupLine } from './utils/textSanitizer';
import { appendLine, createBrowseState, previousLine, type BrowseState } from './utils/browseHistory';
import { validateSaved, validateReactions, validateCounts, type ReactionCounts } from './utils/storedData';
import { usePersistentState } from './hooks/usePersistentState';
import { useAds } from './hooks/useAds';
import { tapFeedback } from './utils/haptics';

const DEFAULT_REACTIONS: ReactionCounts = { fire: 240, cheesy: 65, cringe: 14 };
const EMPTY_SAVED: PickupLine[] = [];
const EMPTY_REACTIONS: Record<string, RizzReaction> = {};
const EMPTY_COUNTS: Record<string, ReactionCounts> = {};

export default function App() {
  const [category, setCategory] = useState<CategoryKey>('all');
  const [browse, setBrowse] = useState(() => createBrowseState(getRandomPickupLine('all').line));
  const browseRef = useRef(browse);
  const categoryRef = useRef(category);
  const [isLoading, setIsLoading] = useState(false);
  // Keep the first frame atomic: wait for the bundled font and brand image
  // before revealing the shell, so the header/card/actions do not pop in
  // at different times on a cold Android WebView start.
  const [screenReady, setScreenReady] = useState(false);
  const [skipCardTransition, setSkipCardTransition] = useState(true);
  const busyRef = useRef(false);
  const swipeAdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedLines, setSavedLines] = usePersistentState('pickup_lines_saved_v1', validateSaved, EMPTY_SAVED);
  const [userReactions, setUserReactions] = usePersistentState('pickup_lines_user_reactions_v1', validateReactions, EMPTY_REACTIONS);
  const [reactionCounts, setReactionCounts] = usePersistentState('pickup_lines_reaction_counts_v1', validateCounts, EMPTY_COUNTS);
  const userReactionsRef = useRef(userReactions);
  const reactionCountsRef = useRef(reactionCounts);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [hasOpenedSavedDrawer, setHasOpenedSavedDrawer] = useState(false);
  const [storyLine, setStoryLine] = useState<PickupLine | null>(null);
  const overlayRef = useRef(false);
  const adState = useAds(isSavedDrawerOpen || storyLine !== null, screenReady);
  const currentLine = browse.lines[browse.index];
  const savedTexts = useMemo(() => new Set(savedLines.map(line => line.text)), [savedLines]);

  const cancelSwipeAd = useCallback(() => {
    if (swipeAdTimer.current !== null) clearTimeout(swipeAdTimer.current);
    swipeAdTimer.current = null;
  }, []);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) cancelSwipeAd(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      cancelSwipeAd();
    };
  }, [cancelSwipeAd]);

  const commitBrowse = useCallback((next: BrowseState) => {
    browseRef.current = next;
    setBrowse(next);
  }, []);
  const handleNext = useCallback(() => {
    if (busyRef.current || overlayRef.current) return;
    cancelSwipeAd();
    setSkipCardTransition(false);
    const state = browseRef.current;
    const next = getRandomPickupLine(categoryRef.current, state.lines[state.index].text).line;
    commitBrowse(appendLine(state, next));
  }, [commitBrowse, cancelSwipeAd]);
  const handleSwipe = useCallback(() => {
    if (busyRef.current || overlayRef.current || ads.getSnapshot().showing) return;
    ads.recordSwipe();
    cancelSwipeAd();
    // Let the replacement card finish entering before showing a swipe ad.
    swipeAdTimer.current = setTimeout(() => {
      swipeAdTimer.current = null;
      if (busyRef.current || overlayRef.current || document.hidden) return;
      busyRef.current = true;
      const shown = ads.maybeShowInterstitialAfterSwipe();
      if (ads.getSnapshot().showing) setIsLoading(true);
      void shown.catch(error => console.warn('Swipe interstitial unavailable', error)).finally(() => {
        busyRef.current = false;
        setIsLoading(false);
      });
    }, 360);
  }, [cancelSwipeAd]);
  const handleExplicitNext = useCallback(async () => {
    if (busyRef.current || overlayRef.current) return;
    cancelSwipeAd();
    setSkipCardTransition(false);
    busyRef.current = true;
    setIsLoading(true);
    try {
      await ads.maybeShowInterstitial();
      const state = browseRef.current;
      const next = getRandomPickupLine(categoryRef.current, state.lines[state.index].text).line;
      commitBrowse(appendLine(state, next));
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  }, [commitBrowse, cancelSwipeAd]);
  const handlePrevious = useCallback(() => {
    if (busyRef.current || overlayRef.current) return;
    cancelSwipeAd();
    setSkipCardTransition(false);
    commitBrowse(previousLine(browseRef.current));
  }, [commitBrowse, cancelSwipeAd]);
  const handleSelectCategory = useCallback((next: CategoryKey) => {
    if (busyRef.current || overlayRef.current || categoryRef.current === next) return;
    cancelSwipeAd();
    categoryRef.current = next;
    setSkipCardTransition(true);
    setCategory(next);
    const state = browseRef.current;
    const nextLine = getRandomPickupLine(next, state.lines[state.index].text).line;
    commitBrowse(appendLine(state, nextLine));
  }, [commitBrowse, cancelSwipeAd]);
  const handleToggleSave = useCallback((line: PickupLine) => {
    const clean = sanitizePickupLine(line);
    setSavedLines(previous => previous.some(item => item.text === clean.text)
      ? previous.filter(item => item.text !== clean.text) : [clean, ...previous]);
  }, [setSavedLines]);
  const handleOpenSaved = useCallback(() => {
    if (busyRef.current) return;
    cancelSwipeAd();
    overlayRef.current = true;
    ads.setBlocked(true);
    setHasOpenedSavedDrawer(true);
    setIsSavedDrawerOpen(true);
  }, [cancelSwipeAd]);
  const handleCloseSaved = useCallback(() => {
    overlayRef.current = false;
    setIsSavedDrawerOpen(false);
  }, []);
  const handleOpenIcebreaker = useCallback((line: PickupLine) => {
    if (busyRef.current) return;
    cancelSwipeAd();
    overlayRef.current = true;
    ads.setBlocked(true);
    setStoryLine(line);
  }, [cancelSwipeAd]);
  const handleCloseIcebreaker = useCallback(() => {
    if (ads.getSnapshot().showing) return;
    overlayRef.current = false;
    setStoryLine(null);
  }, []);
  const handleSelectSavedLine = useCallback((line: PickupLine) => {
    setSkipCardTransition(true);
    commitBrowse(appendLine(browseRef.current, sanitizePickupLine(line)));
  }, [commitBrowse]);
  const handleRemoveSaved = useCallback((id: string) => setSavedLines(previous => previous.filter(line => line.id !== id)), [setSavedLines]);
  const handleClearSaved = useCallback(() => {
    if (window.confirm('Remove all saved lines?')) setSavedLines([]);
  }, [setSavedLines]);

  const handleReact = useCallback((lineId: string, reaction: RizzReaction) => {
    const line = browseRef.current.lines[browseRef.current.index];
    if (line.id !== lineId) return; // Ignore buttons on an outgoing animated card.
    const previous = userReactionsRef.current[lineId];
    const counts = { ...(reactionCountsRef.current[lineId] || line.reactions || DEFAULT_REACTIONS) };
    const reactions = { ...userReactionsRef.current };
    if (previous) counts[previous] = Math.max(0, counts[previous] - 1);
    if (previous === reaction) delete reactions[lineId];
    else { counts[reaction]++; reactions[lineId] = reaction; tapFeedback(); }
    userReactionsRef.current = reactions;
    reactionCountsRef.current = { ...reactionCountsRef.current, [lineId]: counts };
    setUserReactions(reactions);
    setReactionCounts(reactionCountsRef.current);
  }, [setUserReactions, setReactionCounts]);

  useEffect(() => {
    let cancelled = false;

    const waitForImage = new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = '/rizzline-logo.png';
    });
    const waitForFonts = document.fonts?.ready.catch(() => undefined) || Promise.resolve();
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    void Promise.allSettled([waitForImage, waitForFonts]).then(async () => {
      if (cancelled) return;
      await nextFrame();
      setScreenReady(true);
      // Let the complete shell paint once before removing the native splash.
      await nextFrame();
      if (cancelled || !Capacitor.isNativePlatform()) return;
      void import('@capacitor/splash-screen')
        .then(({ SplashScreen }) => SplashScreen.hide())
        .catch(() => {});
    });

    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (overlayRef.current || busyRef.current || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        target?.closest('button,input,textarea,select,[contenteditable="true"]')) return;
      if (event.code === 'Space' || event.key === 'ArrowRight') { event.preventDefault(); void handleExplicitNext(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); handlePrevious(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleExplicitNext, handlePrevious]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removed = false;
    const listener = import('@capacitor/app').then(({ App: NativeApp }) => NativeApp.addListener('backButton', () => {
      if (busyRef.current) return;
      if (storyLine) handleCloseIcebreaker();
      else if (isSavedDrawerOpen) handleCloseSaved();
      else if (browseRef.current.index > 0) handlePrevious();
      else void NativeApp.exitApp();
    }));
    void listener.then(handle => { if (removed) void handle.remove(); }).catch(() => {});
    return () => { removed = true; void listener.then(handle => handle.remove()).catch(() => {}); };
  }, [storyLine, isSavedDrawerOpen, handleCloseIcebreaker, handleCloseSaved, handlePrevious]);

  return (
    <main aria-busy={!screenReady} className="app-viewport min-h-0 w-full max-w-[100vw] min-w-0 bg-zinc-950 bg-dot-grid flex flex-col items-center justify-between selection:bg-rose-500/20 selection:text-rose-200 relative overflow-hidden">
      <div className="fixed inset-0 radial-spotlight pointer-events-none" />
      <div className={`app-shell-surface app-viewport w-full max-w-[100vw] sm:max-w-md min-w-0 mx-auto min-h-0 flex flex-col border-x border-white/[0.06] relative z-10 overflow-hidden transition-opacity duration-150 ${screenReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} inert={isSavedDrawerOpen || storyLine !== null || adState.showing || !screenReady}>
        <Header savedCount={savedLines.length} onOpenSaved={handleOpenSaved} />
        <CategoryBar selectedCategory={category} onSelectCategory={handleSelectCategory} />
        <PickupCard line={currentLine} transitionKey={`${currentLine.id}:${browse.visit}`} skipTransition={skipCardTransition} isSaved={savedTexts.has(currentLine.text)}
          onToggleSave={handleToggleSave} onNext={handleNext} onPrevious={handlePrevious} onSwipe={handleSwipe} canGoPrevious={browse.index > 0} onOpenIcebreaker={handleOpenIcebreaker}
          userReaction={userReactions[currentLine.id]} onReact={handleReact}
          reactions={reactionCounts[currentLine.id] || currentLine.reactions || DEFAULT_REACTIONS} isLoading={isLoading} />
        <ActionBar onNext={handleExplicitNext} onPrevious={handlePrevious} canGoPrevious={browse.index > 0}
          isLoading={isLoading} privacyRequired={adState.privacyRequired}
          onPrivacyOptions={() => { void ads.showPrivacyOptions().catch(() => {}); }} />
      </div>
      {hasOpenedSavedDrawer &&
        <SavedDrawer isOpen={isSavedDrawerOpen} onClose={handleCloseSaved} savedLines={savedLines}
          onRemove={handleRemoveSaved} onClearAll={handleClearSaved} onSelectLine={handleSelectSavedLine} />
      }
      {storyLine &&
        <IcebreakerModal isOpen onClose={handleCloseIcebreaker} line={storyLine} />
      }
    </main>
  );
}
