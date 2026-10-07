import type { PickupLine } from '../types';

export const HISTORY_LIMIT = 100;
export interface BrowseState { lines: PickupLine[]; index: number; visit: number }
export function createBrowseState(line: PickupLine): BrowseState {
  return { lines: [line], index: 0, visit: 0 };
}
export function appendLine(state: BrowseState, line: PickupLine): BrowseState {
  // Visiting a new card after going back discards the forward branch.
  const lines = [...state.lines.slice(0, state.index + 1), line].slice(-HISTORY_LIMIT);
  return { lines, index: lines.length - 1, visit: state.visit + 1 };
}
export function previousLine(state: BrowseState): BrowseState {
  return state.index > 0 ? { ...state, index: state.index - 1, visit: state.visit + 1 } : state;
}
