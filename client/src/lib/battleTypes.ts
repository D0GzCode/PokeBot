/**
 * Interface for a move in battle
 */
export interface BattleMove {
  id: number;
  name: string;
  power: number;
  pp: number;
  accuracy: number;
  type: string;
  damageClass: string;
  currentPp: number;
}

/**
 * Interface for a Pokemon in battle with additional battle-specific properties
 */
export interface BattlePokemon {
  id: number;
  name: string;
  level: number;
  types: string[];
  currentHp: number;
  maxHp: number;
  imageUrlFront: string;
  imageUrlBack: string;
  moves: BattleMove[];
}

/**
 * Represents the state of a battle
 */
export interface BattleState {
  id: string;
  userId: number;
  userPokemon: BattlePokemon;
  opponentPokemon: BattlePokemon;
  isUserTurn: boolean;
  messages: string[];
  battleStatus: 'active' | 'userWon' | 'opponentWon' | 'fled';
  turnCount: number;
}