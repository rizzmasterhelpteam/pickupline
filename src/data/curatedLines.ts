import { CategoryInfo, CategoryKey, PickupLine } from '../types';
import masterJson from './pickupLinesMaster.json';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'all', label: 'All Vibes', emoji: '🔥', description: 'Over 1,460+ lines across every vibe' },
  { id: 'smooth', label: 'Smooth', emoji: '🍸', description: 'Charming, confident & slick (218 lines)' },
  { id: 'cheesy', label: 'Cheesy', emoji: '🧀', description: 'Classic punchlines & groaners (205 lines)' },
  { id: 'nerdy', label: 'Nerdy', emoji: '💻', description: 'Tech, code, science & math (206 lines)' },
  { id: 'romantic', label: 'Romantic', emoji: '🌹', description: 'Magnetic, swoon-worthy & bold attraction (208 lines)' },
  { id: 'funny', label: 'Funny', emoji: '😂', description: 'Witty banter, self-aware roasts & laughs (212 lines)' },
  { id: 'foodie', label: 'Foodie', emoji: '🍕', description: 'Delicious culinary puns (208 lines)' },
  { id: 'clever', label: 'Clever', emoji: '🧠', description: 'Sharp double entendres & wordplay (210 lines)' },
];

const DELIVERY_TIPS: Record<CategoryKey, string[]> = {
  all: [
    'Deliver with an easy smile and unhurried eye contact.',
    'Keep your tone conversational and lighthearted.',
    'Wait a beat after the setup before dropping the punchline.',
  ],
  smooth: [
    'Deliver with relaxed eye contact and a gentle grin.',
    'Keep your voice calm, lowered, and unhurried.',
    'A confident posture sells this one best.',
    'Speak softly and let the compliment settle.',
  ],
  cheesy: [
    'Classic dramatic pause before the punchline.',
    'Say it with a knowing smirk and self-aware laugh.',
    'Commit to the cheesiness 100%—don’t apologize!',
    'Feigned seriousness makes this ten times funnier.',
  ],
  nerdy: [
    'Deadpan delivery with a twinkle in your eye.',
    'Deliver like you’re explaining an undeniable law of physics.',
    'Confident geek swagger works like magic.',
    'Smoothly drop it when the topic turns to tech or study.',
  ],
  romantic: [
    'Deliver with slow, calm eye contact and a warm smile.',
    'Speak with quiet confidence—never rush the words.',
    'Lean in slightly and let the sincerity breathe.',
    'A gentle smile right after saying it seals the moment.',
  ],
  funny: [
    'Deliver with mock-serious energy and a dry smirk.',
    'Let them laugh first before breaking your own smile.',
    'Playful self-deprecation with high charismatic energy.',
    'Say it with total theatrical confidence.',
  ],
  foodie: [
    'Great line when sharing food or ordering drinks.',
    'Playful dinner-date banter.',
    'Lighthearted and delightfully delicious.',
  ],
  clever: [
    'Delivered casually like a passing thought.',
    'Sharp, witty, and intellectual.',
    'Hold eye contact after the twist to see if they caught it.',
  ],
};

function getDeliveryTip(cat: CategoryKey, index: number): string {
  const tips = DELIVERY_TIPS[cat] || DELIVERY_TIPS.smooth;
  return tips[index % tips.length];
}

export const CURATED_PICKUP_LINES: PickupLine[] = (masterJson as Array<{ text: string; category: string; tip?: string }>).map((item, index) => {
  const category = (item.category || 'smooth') as CategoryKey;
  // Deterministic realistic reactions based on index
  const baseFire = 120 + ((index * 37) % 350);
  const baseCheesy = 30 + ((index * 23) % 180);
  const baseCringe = 5 + ((index * 11) % 40);

  return {
    id: `${category}-${index + 1}`,
    text: item.text,
    category,
    source: 'Offline Master Catalog (1,460+ Lines)',
    deliveryTip: item.tip || getDeliveryTip(category, index),
    reactions: {
      fire: baseFire,
      cheesy: baseCheesy,
      cringe: baseCringe,
    },
  };
});

// Category lookup map for high performance O(1) random retrieval
export const LINES_BY_CATEGORY: Record<CategoryKey, PickupLine[]> = {
  all: CURATED_PICKUP_LINES,
  smooth: CURATED_PICKUP_LINES.filter(l => l.category === 'smooth'),
  cheesy: CURATED_PICKUP_LINES.filter(l => l.category === 'cheesy'),
  nerdy: CURATED_PICKUP_LINES.filter(l => l.category === 'nerdy'),
  romantic: CURATED_PICKUP_LINES.filter(l => l.category === 'romantic'),
  funny: CURATED_PICKUP_LINES.filter(l => l.category === 'funny'),
  foodie: CURATED_PICKUP_LINES.filter(l => l.category === 'foodie'),
  clever: CURATED_PICKUP_LINES.filter(l => l.category === 'clever'),
};
