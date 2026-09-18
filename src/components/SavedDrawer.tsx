import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  Copy, 
  Check, 
  Share2, 
  Bookmark, 
  Search, 
  ExternalLink,
  BookOpen,
  Sparkles,
  Layers
} from 'lucide-react';
import { PickupLine } from '../types';
import { CATEGORIES, CURATED_PICKUP_LINES } from '../data/curatedLines';
import { RizzHeartIcon } from './Logo';
import { cleanLineText, resolveAccurateCategory } from '../utils/textSanitizer';

interface SavedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedLines: PickupLine[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onSelectLine: (line: PickupLine) => void;
  onToggleSave?: (line: PickupLine) => void;
}

export function SavedDrawer({
  isOpen,
  onClose,
  savedLines,
  onRemove,
  onClearAll,
  onSelectLine,
  onToggleSave,
}: SavedDrawerProps) {
  const [activeTab, setActiveTab] = useState<'saved' | 'catalog'>('saved');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activePool = activeTab === 'saved' ? savedLines : CURATED_PICKUP_LINES;

  const filteredLines = activePool.filter((item) => {
    const matchesSearch = item.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCat === 'all' || item.category === filterCat;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (line: PickupLine) => {
    const cleanText = cleanLineText(line.text);
    navigator.clipboard.writeText(cleanText);
    setCopiedId(line.id);
    if (navigator.vibrate) navigator.vibrate(10);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleShare = (line: PickupLine) => {
    const cleanText = cleanLineText(line.text);
    const cleanCat = resolveAccurateCategory(cleanText, line.category);
    if (navigator.share) {
      navigator.share({
        title: 'Pickup Line',
        text: `"${cleanText}"\n\n✨ [${cleanCat.toUpperCase()}] • via RizzLine`,
      });
    } else {
      handleCopy(line);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          {/* Bottom Sheet / Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 max-w-lg mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-[2.5rem] z-50 flex flex-col max-h-[88vh] shadow-2xl overflow-hidden"
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full mx-auto mt-3 mb-1" />

            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 border border-zinc-800 rounded-2xl">
                <button
                  type="button"
                  id="tab-saved-btn"
                  onClick={() => setActiveTab('saved')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'saved'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'saved' ? 'bg-black/25' : 'bg-zinc-800 text-zinc-400'}`}>
                    {savedLines.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-catalog-btn"
                  onClick={() => setActiveTab('catalog')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'catalog'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>All Catalog</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'catalog' ? 'bg-black/25' : 'bg-zinc-800 text-zinc-400'}`}>
                    1,460+
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'saved' && savedLines.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    id="clear-all-saved-btn"
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs flex items-center gap-1"
                    title="Clear all saved"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search & Filter Header */}
            <div className="px-5 py-3 space-y-2.5 border-b border-zinc-800/80 bg-zinc-950/50">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    activeTab === 'saved'
                      ? 'Search your saved lines...'
                      : 'Search across 1,460+ master lines...'
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 py-1">
                <button
                  type="button"
                  onClick={() => setFilterCat('all')}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filterCat === 'all'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                  }`}
                >
                  🔥 All Vibes
                </button>
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFilterCat(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                      filterCat === cat.id
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List Content Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {activeTab === 'saved' && savedLines.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-900/80 border border-zinc-800 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/10">
                    <RizzHeartIcon size={38} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-200">No saved lines yet</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Tap the heart icon on any card to bookmark lines, or explore the catalog tab to browse all 1,460+ offline lines.
                    </p>
                  </div>
                </div>
              ) : filteredLines.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No pickup lines match your search filter.
                </div>
              ) : (
                filteredLines.slice(0, 100).map((line) => {
                  const cleanText = cleanLineText(line.text);
                  const cleanCategory = resolveAccurateCategory(cleanText, line.category);
                  const isSaved = savedLines.some((s) => s.text === line.text || s.text === cleanText);
                  return (
                    <div
                      key={line.id}
                      className="p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700/80 transition-all space-y-2.5 group"
                    >
                      <p className="text-sm text-zinc-200 font-medium leading-relaxed">
                        “{cleanText}”
                      </p>

                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                        <span className="capitalize px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800/80 text-zinc-400 font-medium">
                          {cleanCategory}
                        </span>

                        <div className="flex items-center gap-1">
                          {onToggleSave && (
                            <button
                              type="button"
                              onClick={() => onToggleSave(line)}
                              title={isSaved ? 'Remove from saved' : 'Save line'}
                              className={`p-2 rounded-xl transition-colors ${
                                isSaved
                                  ? 'text-rose-500 bg-rose-500/10'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60'
                              }`}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onSelectLine(line);
                              onClose();
                            }}
                            title="Load on main card"
                            className="p-2 rounded-xl hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(line)}
                            title="Copy line"
                            className="p-2 rounded-xl hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-colors"
                          >
                            {copiedId === line.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShare(line)}
                            title="Share line"
                            className="p-2 rounded-xl hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {activeTab === 'saved' && (
                            <button
                              type="button"
                              onClick={() => onRemove(line.id)}
                              title="Delete bookmark"
                              className="p-2 rounded-xl hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {filteredLines.length > 100 && (
                <p className="text-center text-xs text-zinc-500 py-3">
                  Showing top 100 of {filteredLines.length} lines. Refine search term or category to narrow down.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
