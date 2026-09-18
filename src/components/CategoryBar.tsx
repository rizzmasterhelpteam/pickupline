import { motion } from 'motion/react';
import { CATEGORIES, LINES_BY_CATEGORY, CURATED_PICKUP_LINES } from '../data/curatedLines';
import { CategoryKey } from '../types';

interface CategoryBarProps {
  selectedCategory: CategoryKey;
  onSelectCategory: (category: CategoryKey) => void;
}

const CATEGORY_STYLES: Record<string, {
  activeBg: string;
  activeBorder: string;
  activeText: string;
  activeBadge: string;
  inactiveBorder: string;
  hoverBorder: string;
  glow: string;
}> = {
  all: {
    activeBg: 'bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500',
    activeBorder: 'border-rose-400/90',
    activeText: 'text-white',
    activeBadge: 'bg-black/30 text-white',
    inactiveBorder: 'border-zinc-800/80',
    hoverBorder: 'hover:border-rose-500/50',
    glow: 'shadow-[0_0_10px_rgba(244,63,94,0.3)]',
  },
  smooth: {
    activeBg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    activeBorder: 'border-amber-400/90',
    activeText: 'text-white',
    activeBadge: 'bg-black/30 text-amber-100',
    inactiveBorder: 'border-zinc-800/80',
    hoverBorder: 'hover:border-amber-500/50',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]',
  },
  cheesy: {
    activeBg: 'bg-gradient-to-r from-yellow-400 to-amber-500',
    activeBorder: 'border-yellow-300/90',
    activeText: 'text-zinc-950 font-bold',
    activeBadge: 'bg-black/30 text-zinc-950 font-bold',
    inactiveBorder: 'border-zinc-800/80',
    hoverBorder: 'hover:border-yellow-500/50',
    glow: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]',
  },
  nerdy: {
    activeBg: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    activeBorder: 'border-cyan-300/90',
    activeText: 'text-white',
    activeBadge: 'bg-black/30 text-cyan-100',
    inactiveBorder: 'border-zinc-800/80',
    hoverBorder: 'hover:border-cyan-500/50',
    glow: 'shadow-[0_0_10px_rgba(6,182,212,0.3)]',
  },
  romantic: {
    activeBg: 'bg-gradient-to-r from-rose-600 to-pink-600',
    activeBorder: 'border-rose-300/90',
    activeText: 'text-white',
    activeBadge: 'bg-black/30 text-rose-100',
    inactiveBorder: 'border-zinc-800/80',
    hoverBorder: 'hover:border-rose-500/50',
    glow: 'shadow-[0_0_10px_rgba(225,29,72,0.3)]',
  },
  funny: {
    activeBg: 'bg-gradient-to-r from-orange-500 to-amber-600',
    activeBorder: 'border-orange-300/90',
    activeText: 'text-white',
    activeBadge: 'bg-black/30 text-orange-100',
    inactiveBorder: 'border-zinc-800/80',
    hoverBorder: 'hover:border-orange-500/50',
    glow: 'shadow-[0_0_10px_rgba(249,115,22,0.3)]',
  },
  foodie: {
    activeBg: 'bg-gradient-to-r from-red-500 to-orange-600',
    activeBorder: 'border-red-300/90',
    activeText: 'text-white',
    activeBadge: 'bg-black/30 text-red-100',
    inactiveBorder: 'border-zinc-800/80',
    hoverBorder: 'hover:border-red-500/50',
    glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
  },
  clever: {
    activeBg: 'bg-gradient-to-r from-purple-500 to-indigo-600',
    activeBorder: 'border-purple-300/90',
    activeText: 'text-white',
    activeBadge: 'bg-black/30 text-purple-100',
    inactiveBorder: 'border-zinc-800/80',
    hoverBorder: 'hover:border-purple-500/50',
    glow: 'shadow-[0_0_10px_rgba(168,85,247,0.3)]',
  },
};

export function CategoryBar({ selectedCategory, onSelectCategory }: CategoryBarProps) {
  const currentCategoryObj = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];

  return (
    <div className="w-full px-4 py-1.5 select-none space-y-1.5">
      {/* Compact Section Header */}
      <div className="flex items-center justify-between px-0.5 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">
            Vibe
          </span>
          <span className="text-zinc-600">•</span>
          <span className="font-semibold text-rose-400">
            {currentCategoryObj.emoji} {currentCategoryObj.label}
          </span>
        </div>

        <span className="font-mono text-zinc-400 text-[9px]">
          8 Vibes
        </span>
      </div>

      {/* Sleek, Smaller Category Buttons Grid */}
      <div className="grid grid-cols-4 gap-1">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'all'
            ? CURATED_PICKUP_LINES.length
            : (LINES_BY_CATEGORY[cat.id]?.length || 0);
          const style = CATEGORY_STYLES[cat.id] || CATEGORY_STYLES.all;

          return (
            <button
              key={cat.id}
              id={`cat-pill-${cat.id}`}
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onSelectCategory(cat.id);
              }}
              className={`relative flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-center transition-all duration-150 active:scale-95 group ${
                isSelected
                  ? `${style.activeBg} ${style.activeBorder} border ${style.activeText} ${style.glow} shadow-sm`
                  : `bg-zinc-900/70 ${style.inactiveBorder} border ${style.hoverBorder} text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900`
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCategoryBorder"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute -inset-0.5 rounded-lg bg-white/20 pointer-events-none -z-10"
                />
              )}

              {/* Emoji */}
              <span className="text-xs shrink-0 drop-shadow-sm">
                {cat.emoji}
              </span>

              {/* Label */}
              <span className="text-[10px] font-semibold tracking-tight truncate">
                {cat.label}
              </span>

              {/* Count */}
              <span
                className={`text-[8px] font-mono px-1 py-0.2 rounded leading-none shrink-0 font-medium ${
                  isSelected
                    ? style.activeBadge
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
