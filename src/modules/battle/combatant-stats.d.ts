export interface CombatantBaseStats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
  stunChance?: number;
}

export interface CombatantArtifactTotals {
  damage?: number;
  armor?: number;
  speed?: number;
  stunChance?: number;
}

export interface CombatantStatClamp {
  min?: number;
  max?: number;
}

export interface DerivedCombatantStats {
  maxHealth: number;
  currentHealth: number;
  attack: number;
  defense: number;
  speed: number;
  stunChance: number;
}

export interface DeriveCombatantStatsOptions {
  baseStats: CombatantBaseStats;
  artifactTotals?: CombatantArtifactTotals;
  /** Applied to final stats, after signed bonuses have been added. */
  statClamps?: Partial<Record<Exclude<keyof DerivedCombatantStats, 'currentHealth'>, CombatantStatClamp>>;
  /** Defaults to no equipment-derived health bonus. */
  healthBonusStat?: keyof CombatantArtifactTotals | null;
  healthBonusClamp?: CombatantStatClamp;
}

export function deriveCombatantStats(options: DeriveCombatantStatsOptions): DerivedCombatantStats;
