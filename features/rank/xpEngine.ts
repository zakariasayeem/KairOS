// This is the SINGLE source of truth for all XP/rank math in KairOS.
// Both the app and any future server-side reconciliation must import from here —
// never reimplement this formula elsewhere.

export const RANKS = ['D', 'C', 'B', 'A', 'S', 'SS', 'Legend'] as const;
export type Rank = (typeof RANKS)[number];

export const MAX_LEVEL_PER_RANK = 25; // reduced from 100 — see design discussion
export const BASE_XP = 0.053; // retuned against real per-session earn rates
export const RANK_STEP_MULTIPLIER = 1.6;
export const MIN_XP_PER_LEVEL = 20; // prevents sub-session-sized level requirements

// Growth-group formula per rank tier, per design spec Section 6.2 (Pokémon GBA model)
function growthGroupFormula(rank: Rank, level: number): number {
  const cubed = Math.pow(level, 3);
  switch (rank) {
    case 'D':
    case 'C':
      return 0.8 * cubed; // Fast
    case 'B':
    case 'A':
      return cubed; // Medium Fast
    case 'S':
    case 'SS':
      return 1.25 * cubed; // Slow
    case 'Legend':
      return 1.5 * cubed; // Steepest
  }
}

/**
 * XP required to go from (level - 1) to `level`, within a given rank.
 * This is the amount that fills current_xp before leveling up.
 */
export function xpRequiredForLevel(rank: Rank, level: number): number {
  const rankIndex = RANKS.indexOf(rank);
  const base = BASE_XP * Math.pow(RANK_STEP_MULTIPLIER, rankIndex);
  const computed = base * growthGroupFormula(rank, level);
  return Math.max(MIN_XP_PER_LEVEL, Math.round(computed));
}

export type RankState = {
  rank: Rank;
  level: number;
  currentXp: number;
  totalLifetimeXp: number;
};

export type XPResult = {
  newState: RankState;
  leveledUp: boolean;
  rankedUp: boolean;
  reachedLegendCap: boolean;
};

/**
 * Applies an XP gain to a rank state, handling level-ups and rank-ups.
 * Legend rank caps at MAX_LEVEL_PER_RANK — XP beyond that just accumulates
 * in totalLifetimeXp without further leveling, per design spec Section 6.1.
 */
export function applyXPGain(state: RankState, xpGained: number): XPResult {
  let { rank, level, currentXp } = state;
  const totalLifetimeXp = state.totalLifetimeXp + xpGained;
  currentXp += xpGained;

  let leveledUp = false;
  let rankedUp = false;
  let reachedLegendCap = false;

  // Legend rank at max level: XP just accumulates, no further level-ups
  if (rank === 'Legend' && level >= MAX_LEVEL_PER_RANK) {
    return {
      newState: { rank, level, currentXp, totalLifetimeXp },
      leveledUp: false,
      rankedUp: false,
      reachedLegendCap: false,
    };
  }

  // Process level-ups one at a time, in case a big XP gain spans multiple levels
  while (true) {
    const requiredForNextLevel = xpRequiredForLevel(rank, level + 1);

    if (currentXp < requiredForNextLevel) break;

    currentXp -= requiredForNextLevel;
    level += 1;
    leveledUp = true;

    if (level > MAX_LEVEL_PER_RANK) {
      const rankIndex = RANKS.indexOf(rank);
      if (rankIndex < RANKS.length - 1) {
        rank = RANKS[rankIndex + 1];
        level = 1;
        rankedUp = true;
      } else {
        // Hit Legend's cap for the first time
        level = MAX_LEVEL_PER_RANK;
        currentXp = 0;
        reachedLegendCap = true;
        break;
      }
    }
  }

  return {
    newState: { rank, level, currentXp, totalLifetimeXp },
    leveledUp,
    rankedUp,
    reachedLegendCap,
  };
}

/**
 * XP sources and their weights, per design spec Section 6.3.
 * Focus session XP scales with duration; subtask completion is a flat bonus.
 */
export const XP_SOURCES = {
  FOCUS_SESSION_PER_MINUTE: 2,
  FOCUS_SESSION_SOFT_CAP_MINUTES: 90, // diminishing returns past this point
  SUBTASK_XP_BY_DIFFICULTY: {
    easy: 5,
    medium: 10,
    hard: 15,
  },
  SUBTASK_XP_DEFAULT: 10, // fallback when difficulty is null (manual/unenriched subtasks)
} as const;

export function getSubtaskCompletionXP(difficulty: string | null): number {
  if (!difficulty) return XP_SOURCES.SUBTASK_XP_DEFAULT;
  return (
    XP_SOURCES.SUBTASK_XP_BY_DIFFICULTY[difficulty as keyof typeof XP_SOURCES.SUBTASK_XP_BY_DIFFICULTY] ??
    XP_SOURCES.SUBTASK_XP_DEFAULT
  );
}

export function calculateFocusSessionXP(durationMinutes: number): number {
  const cappedMinutes = Math.min(durationMinutes, XP_SOURCES.FOCUS_SESSION_SOFT_CAP_MINUTES);
  const overflowMinutes = Math.max(0, durationMinutes - XP_SOURCES.FOCUS_SESSION_SOFT_CAP_MINUTES);
  // Overflow minutes earn at 25% rate — soft diminishing returns, not a hard cutoff
  return Math.round(
    cappedMinutes * XP_SOURCES.FOCUS_SESSION_PER_MINUTE +
      overflowMinutes * XP_SOURCES.FOCUS_SESSION_PER_MINUTE * 0.25
  );
}
/**
 * TODO (Future):
 * Completion XP will eventually become hierarchy-aware.
 *
 * Parent subtasks own a fixed completion XP budget.
 * If a parent is broken into child subtasks, that budget
 * should be distributed across the children rather than
 * creating additional completion XP.
 *
 * Timer XP is intentionally independent of completion XP
 * and always rewards actual focus time.
 */