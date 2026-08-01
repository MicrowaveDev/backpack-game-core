import type { Rng } from '../../shared/rng.js';

export interface SelectBattleOpponentOptions<Character> {
  playerCharacterId?: string;
  previousOpponentId?: string;
  rng?: Rng;
  getCharacterId?: (character: Character) => string;
}

export function selectBattleOpponent<Character>(
  characters: Character[],
  options?: SelectBattleOpponentOptions<Character>
): Character | null;
