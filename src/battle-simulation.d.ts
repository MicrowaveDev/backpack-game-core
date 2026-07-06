import type { Rng } from './rng.js';

export type BattleSide = 'left' | 'right' | string;
export type WinnerSide = 'left' | 'right' | null;
export type BattleOutcome = 'win' | 'loss' | 'draw';
export type BattleEndReason = 'death' | 'step_cap';

export interface BattleCombatant {
  side?: BattleSide;
  id?: string;
  characterId?: string;
  mushroomId?: string;
  playerId?: string | number | null;
  name?: string | { en?: string; [key: string]: unknown };
  currentHealth?: number;
  maxHealth: number;
  attack?: number;
  baseAttack?: number;
  speed?: number;
  baseSpeed?: number;
  defense?: number;
  baseDefense?: number;
  stunChance?: number;
  loadout?: unknown;
  state?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BattleAction {
  actionName: string;
  attackDamage: number;
  armorIgnore: number;
  stunChance: number;
}

export interface BattleDamage {
  incomingDamage: number;
  defenseValue: number;
  resolvedDamage: number;
  blockedDamage: number;
}

export interface BattleStun {
  roll: number;
  chance: number;
  stunned: boolean;
  applied: boolean;
}

export interface BattleEvent<State = unknown> {
  type: 'battle_start' | 'step_start' | 'action' | 'skip' | 'battle_end' | string;
  step: number;
  actorSide?: BattleSide;
  targetSide?: BattleSide;
  actionName?: string;
  damage?: number;
  blockedDamage?: number;
  stunned?: boolean;
  winnerSide?: WinnerSide;
  outcome?: BattleOutcome;
  endReason?: BattleEndReason;
  artifactAttribution?: unknown;
  effectTags?: unknown;
  narration: string;
  state: State;
}

export interface BattleHookArgs<Combatant extends BattleCombatant> {
  attacker: Combatant;
  defender: Combatant;
  action: BattleAction;
  damage: BattleDamage;
  stun: BattleStun;
  step: number;
  rng: Rng;
}

export interface SimulateBattleOptions<
  Combatant extends BattleCombatant = BattleCombatant,
  Summary = unknown
> {
  left: Combatant;
  right: Combatant;
  rng: Rng;
  stepCap?: number;
  maxStunChance?: number;
  summarizeCombatant?: (combatant: Combatant) => Summary;
  getCombatantLabel?: (combatant: Combatant) => string;
  getActionSpeed?: (combatant: Combatant) => number;
  getBaseSpeed?: (combatant: Combatant) => number;
  breakEqualBaseSpeedTie?: (args: {
    left: Combatant;
    right: Combatant;
    rng: Rng;
    leftSpeed: number;
    rightSpeed: number;
  }) => Combatant | BattleSide | Combatant[] | { first?: Combatant | BattleSide } | null | undefined;
  getStartNarration?: (args: { left: Combatant; right: Combatant }) => string;
  getStepNarration?: (args: { step: number; left: Combatant; right: Combatant }) => string;
  getSkipNarration?: (args: { actor: Combatant; opponent: Combatant; step: number }) => string;
  getActionNarration?: (args: Omit<BattleHookArgs<Combatant>, 'rng'>) => string;
  getEndNarration?: (args: {
    left: Combatant;
    right: Combatant;
    winnerSide: WinnerSide;
    winner: Combatant;
    outcome: BattleOutcome;
    endReason: BattleEndReason;
    finalStep: number;
  }) => string;
  prepareAction?: (args: Pick<BattleHookArgs<Combatant>, 'attacker' | 'defender' | 'action' | 'step' | 'rng'>) => void;
  afterDamageCalculated?: (args: Pick<BattleHookArgs<Combatant>, 'attacker' | 'defender' | 'action' | 'damage' | 'step' | 'rng'>) => void;
  afterDamageApplied?: (args: Pick<BattleHookArgs<Combatant>, 'attacker' | 'defender' | 'action' | 'damage' | 'step' | 'rng'>) => void;
  afterStunResolved?: (args: BattleHookArgs<Combatant>) => void;
  afterActionResolved?: (args: BattleHookArgs<Combatant>) => void;
  afterSkip?: (args: { actor: Combatant; opponent: Combatant; step: number; rng: Rng }) => void;
  getArtifactAttribution?: (args: BattleHookArgs<Combatant>) => unknown;
  getEffectTags?: (args: BattleHookArgs<Combatant>) => unknown;
}

export interface BattleSimulationResult<Summary = unknown> {
  winnerSide: WinnerSide;
  outcome: BattleOutcome;
  endReason: BattleEndReason;
  finalStep: number;
  leftState: Summary;
  rightState: Summary;
  events: BattleEvent<Summary>[];
}

export function simulateBattle<
  Combatant extends BattleCombatant = BattleCombatant,
  Summary = unknown
>(options: SimulateBattleOptions<Combatant, Summary>): BattleSimulationResult<Summary>;
