export type CategoryKey = 
  | 'all'
  | 'smooth'
  | 'cheesy'
  | 'nerdy'
  | 'romantic'
  | 'funny'
  | 'foodie'
  | 'clever';

export type RizzReaction = 'fire' | 'cheesy' | 'cringe';

export interface PickupLine {
  id: string;
  text: string;
  category: CategoryKey;
  source: string;
  rating?: number; // 1-5 rating or community score
  reactions?: {
    fire: number;
    cheesy: number;
    cringe: number;
  };
  deliveryTip?: string;
  timestamp?: number;
}

export interface ApiFetchResult {
  line: PickupLine;
  apiSource: 'Curated Master Catalog';
  latencyMs: number;
  isFallback: boolean;
}

export interface CategoryInfo {
  id: CategoryKey;
  label: string;
  emoji: string;
  description: string;
}
