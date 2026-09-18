import { useState, useEffect, useCallback } from 'react';
import { CategoryKey, PickupLine, RizzReaction } from './types';
import { fetchRandomPickupLine } from './services/pickupLineApi';
import { Header } from './components/Header';
import { CategoryBar } from './components/CategoryBar';
import { PickupCard } from './components/PickupCard';
import { ActionBar } from './components/ActionBar';
import { SavedDrawer } from './components/SavedDrawer';
import { IcebreakerModal } from './components/IcebreakerModal';
import { CURATED_PICKUP_LINES } from './data/curatedLines';
import { isCorruptedText, sanitizePickupLine } from './utils/textSanitizer';

const SAVED_STORAGE_KEY = 'pickup_lines_saved_v1';
const USER_REACTIONS_KEY = 'pickup_lines_user_reactions_v1';
const COUNTS_REACTIONS_KEY = 'pickup_lines_reaction_counts_v1';

export default function App() {
  const [category, setCategory] = useState<CategoryKey>('all');
  const [currentLine, setCurrentLine] = useState<PickupLine>(() =>
    sanitizePickupLine(CURATED_PICKUP_LINES[0])
  );
  const [history, setHistory] = useState<PickupLine[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiSource, setApiSource] = useState<string>('Curated Master Catalog');
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(10);

  // Saved bookmarks - safely purge any corrupted entries and sanitize remaining
  const [savedLines, setSavedLines] = useState<PickupLine[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_STORAGE_KEY);
      if (!stored) return [];
      const parsed: PickupLine[] = JSON.parse(stored);
      return parsed
        .filter((l) => l && l.text && !isCorruptedText(l.text))
        .map(sanitizePickupLine);
    } catch {
      return [];
    }
  });

  // Reactions state
  const [userReactions, setUserReactions] = useState<Record<string, RizzReaction>>(() => {
    try {
      const stored = localStorage.getItem(USER_REACTIONS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [reactionCounts, setReactionCounts] = useState<Record<string, { fire: number; cheesy: number; cringe: number }>>(() => {
    try {
      const stored = localStorage.getItem(COUNTS_REACTIONS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Modal drawers
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isIcebreakerOpen, setIsIcebreakerOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedLines));
    } catch {}
  }, [savedLines]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_REACTIONS_KEY, JSON.stringify(userReactions));
    } catch {}
  }, [userReactions]);

  useEffect(() => {
    try {
      localStorage.setItem(COUNTS_REACTIONS_KEY, JSON.stringify(reactionCounts));
    } catch {}
  }, [reactionCounts]);

  // Fetch next line
  const handleFetchNext = useCallback(async (catToUse?: CategoryKey) => {
    if (isLoading) return;
    setIsLoading(true);

    const targetCategory = catToUse || category;
    const result = await fetchRandomPickupLine(targetCategory);
    const sanitizedLine = sanitizePickupLine(result.line);

    // Save previous in history
    setHistory((prev) => [...prev, currentLine]);
    setHistoryIndex((prev) => prev + 1);

    setCurrentLine(sanitizedLine);
    setApiSource(result.apiSource);
    setIsFallback(result.isFallback);
    setLatencyMs(result.latencyMs);
    setIsLoading(false);
  }, [category, currentLine, isLoading]);

  // Fetch initial on mount
  useEffect(() => {
    handleFetchNext('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Category switch
  const handleSelectCategory = (newCat: CategoryKey) => {
    setCategory(newCat);
    handleFetchNext(newCat);
  };

  // Previous line
  const handlePrevious = () => {
    if (history.length === 0 || historyIndex < 0) return;
    const prevLine = history[historyIndex];
    setHistoryIndex((prev) => prev - 1);
    setCurrentLine(sanitizePickupLine(prevLine));
  };

  // Toggle Save
  const handleToggleSave = (line: PickupLine) => {
    const cleanLine = sanitizePickupLine(line);
    setSavedLines((prev) => {
      const exists = prev.some((item) => item.id === cleanLine.id || item.text === cleanLine.text);
      if (exists) {
        return prev.filter((item) => item.id !== cleanLine.id && item.text !== cleanLine.text);
      }
      return [cleanLine, ...prev];
    });
  };

  // Reaction handler
  const handleReact = (lineId: string, reaction: RizzReaction) => {
    const previous = userReactions[lineId];

    // Current line counts
    const baseReactions = currentLine.reactions || { fire: 120, cheesy: 40, cringe: 10 };
    const currentCounts = reactionCounts[lineId] || { ...baseReactions };

    const newCounts = { ...currentCounts };

    if (previous === reaction) {
      // Toggle off
      newCounts[reaction] = Math.max(0, newCounts[reaction] - 1);
      setUserReactions((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
    } else {
      // Remove previous reaction if any
      if (previous) {
        newCounts[previous] = Math.max(0, newCounts[previous] - 1);
      }
      // Add new reaction
      newCounts[reaction] = (newCounts[reaction] || 0) + 1;
      setUserReactions((prev) => ({ ...prev, [lineId]: reaction }));
      if (navigator.vibrate) navigator.vibrate([10, 15]);
    }

    setReactionCounts((prev) => ({ ...prev, [lineId]: newCounts }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleFetchNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFetchNext]);

  const isCurrentSaved = savedLines.some(
    (item) => item.id === currentLine.id || item.text === currentLine.text
  );

  const currentReactions = reactionCounts[currentLine.id] ||
    currentLine.reactions || { fire: 240, cheesy: 65, cringe: 14 };

  return (
    <main className="min-h-[100dvh] w-full bg-zinc-950 bg-dot-grid flex flex-col items-center justify-between font-sans selection:bg-rose-500/20 selection:text-rose-200 relative overflow-x-hidden">
      {/* Ambient background spotlight */}
      <div className="fixed inset-0 radial-spotlight pointer-events-none" />

      {/* Mobile-sized shell for Play Store / App wrapper experience */}
      <div className="w-full max-w-md mx-auto min-h-[100dvh] flex flex-col justify-between border-x border-zinc-800/80 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl relative z-10">
        {/* Top Header */}
        <Header
          savedCount={savedLines.length}
          onOpenSaved={() => setIsSavedDrawerOpen(true)}
        />

        {/* Category Filter Pills */}
        <CategoryBar
          selectedCategory={category}
          onSelectCategory={handleSelectCategory}
        />

        {/* Core Hero Pickup Card */}
        <PickupCard
          line={currentLine}
          isSaved={isCurrentSaved}
          onToggleSave={handleToggleSave}
          onNext={() => handleFetchNext()}
          onOpenIcebreaker={() => setIsIcebreakerOpen(true)}
          userReaction={userReactions[currentLine.id]}
          onReact={handleReact}
          reactions={currentReactions}
          latencyMs={latencyMs}
          apiSource={apiSource}
          isFallback={isFallback}
        />

        {/* Bottom Floating Navigation & Next Line CTA */}
        <ActionBar
          onNext={() => handleFetchNext()}
          onPrevious={handlePrevious}
          canGoPrevious={history.length > 0 && historyIndex >= 0}
          isLoading={isLoading}
        />
      </div>

      {/* Saved Favorites & 1,460+ Lines Explorer Drawer Sheet */}
      <SavedDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        savedLines={savedLines}
        onRemove={(id) => setSavedLines((prev) => prev.filter((l) => l.id !== id))}
        onClearAll={() => setSavedLines([])}
        onSelectLine={(line) => setCurrentLine(line)}
        onToggleSave={handleToggleSave}
      />

      {/* Icebreaker Card Snapshot Modal */}
      <IcebreakerModal
        isOpen={isIcebreakerOpen}
        onClose={() => setIsIcebreakerOpen(false)}
        line={currentLine}
      />
    </main>
  );
}
