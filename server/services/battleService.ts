import { User, Pokemon } from "@shared/schema";
import { storage } from "../storage";
import axios from "axios";

/**
 * Interface for Pokemon data from the PokeAPI
 */
interface PokemonApiData {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    back_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      }
    }
  };
  stats: {
    base_stat: number;
    stat: {
      name: string;
    }
  }[];
  types: {
    type: {
      name: string;
    }
  }[];
  moves: {
    move: {
      name: string;
      url: string;
    }
  }[];
}

/**
 * Interface for Move data from the PokeAPI
 */
interface MoveApiData {
  id: number;
  name: string;
  power: number | null;
  pp: number;
  accuracy: number | null;
  type: {
    name: string;
  };
  damage_class: {
    name: string;
  };
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

// In-memory store for active battles
const activeBattles = new Map<string, BattleState>();

/**
 * Battle Service to handle Pokemon battles
 */
export class BattleService {
  /**
   * Start a new battle between a user and an NPC opponent
   */
  async startBattle(userId: number, userPokemonId: number): Promise<BattleState> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const userPokemon = await storage.getPokemonById(userPokemonId);
    if (!userPokemon) {
      throw new Error("Pokemon not found");
    }

    // Get a random opponent based on user's Pokemon level
    const pokemonLevel = userPokemon.level || 5;
    const opponentLevel = pokemonLevel + Math.floor(Math.random() * 5) - 2;
    const adjustedLevel = Math.max(5, opponentLevel); // Minimum level 5

    // Generate a random Pokemon ID between 1 and 151 (original 151 Pokemon)
    const randomPokemonId = Math.floor(Math.random() * 151) + 1;
    
    // Fetch data from PokeAPI for user's Pokemon and opponent
    const [userPokemonData, opponentPokemonData] = await Promise.all([
      this.fetchPokemonData(userPokemon.name.toLowerCase()),
      this.fetchPokemonData(randomPokemonId)
    ]);

    // Create battle Pokemon objects
    const battleUserPokemon = await this.createBattlePokemon(userPokemonData, pokemonLevel);
    const battleOpponentPokemon = await this.createBattlePokemon(opponentPokemonData, adjustedLevel);

    // Create battle state
    const battleId = `battle_${userId}_${Date.now()}`;
    const battleState: BattleState = {
      id: battleId,
      userId,
      userPokemon: battleUserPokemon,
      opponentPokemon: battleOpponentPokemon,
      isUserTurn: true, // User goes first
      messages: [`A wild ${battleOpponentPokemon.name} appeared!`],
      battleStatus: 'active',
      turnCount: 0
    };

    // Store battle state
    activeBattles.set(battleId, battleState);

    return battleState;
  }

  /**
   * Execute a move in a battle
   */
  async executeMove(battleId: string, moveIndex: number): Promise<BattleState> {
    const battleState = activeBattles.get(battleId);
    if (!battleState) {
      throw new Error("Battle not found");
    }

    if (battleState.battleStatus !== 'active') {
      throw new Error("Battle already ended");
    }

    if (!battleState.isUserTurn) {
      throw new Error("Not user's turn");
    }

    const move = battleState.userPokemon.moves[moveIndex];
    if (!move) {
      throw new Error("Move not found");
    }

    // Decrease PP
    move.currentPp--;
    if (move.currentPp < 0) {
      throw new Error("No PP left for this move");
    }

    // Calculate damage
    const damage = this.calculateDamage(
      battleState.userPokemon,
      battleState.opponentPokemon,
      move
    );

    // Apply damage to opponent
    battleState.opponentPokemon.currentHp = Math.max(
      0,
      battleState.opponentPokemon.currentHp - damage
    );

    // Add message
    battleState.messages.push(
      `${battleState.userPokemon.name} used ${move.name}!`
    );

    // Check if opponent fainted
    if (battleState.opponentPokemon.currentHp <= 0) {
      battleState.messages.push(
        `${battleState.opponentPokemon.name} fainted!`
      );
      battleState.battleStatus = 'userWon';
      
      // Add battle win to user's record
      const user = await storage.getUser(battleState.userId);
      if (user) {
        // Create activity record for the battle win
        await storage.createActivity({
          type: 'battle',
          description: `You won a battle against ${battleState.opponentPokemon.name}!`,
          timestamp: new Date().toISOString(),
          userId: battleState.userId
        });
      }
      
      return battleState;
    }

    // Switch turn to opponent
    battleState.isUserTurn = false;
    battleState.turnCount++;

    // Execute opponent's move (AI logic)
    setTimeout(() => {
      this.executeOpponentMove(battleId);
    }, 1000);

    return battleState;
  }

  /**
   * Execute the opponent's move (AI logic)
   */
  private async executeOpponentMove(battleId: string): Promise<void> {
    const battleState = activeBattles.get(battleId);
    if (!battleState || battleState.battleStatus !== 'active' || battleState.isUserTurn) {
      return;
    }

    // Select a random move for the opponent
    const availableMoves = battleState.opponentPokemon.moves.filter(
      (move) => move.currentPp > 0
    );
    if (availableMoves.length === 0) {
      battleState.messages.push(
        `${battleState.opponentPokemon.name} has no moves left!`
      );
      battleState.isUserTurn = true;
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    const move = availableMoves[randomIndex];

    // Decrease PP
    move.currentPp--;

    // Calculate damage
    const damage = this.calculateDamage(
      battleState.opponentPokemon,
      battleState.userPokemon,
      move
    );

    // Apply damage to user's Pokemon
    battleState.userPokemon.currentHp = Math.max(
      0,
      battleState.userPokemon.currentHp - damage
    );

    // Add message
    battleState.messages.push(
      `${battleState.opponentPokemon.name} used ${move.name}!`
    );

    // Check if user's Pokemon fainted
    if (battleState.userPokemon.currentHp <= 0) {
      battleState.messages.push(
        `${battleState.userPokemon.name} fainted!`
      );
      battleState.battleStatus = 'opponentWon';
      
      // Create activity record for the battle loss
      await storage.createActivity({
        type: 'battle',
        description: `You lost a battle against ${battleState.opponentPokemon.name}.`,
        timestamp: new Date().toISOString(),
        userId: battleState.userId
      });
      
      return;
    }

    // Switch turn back to user
    battleState.isUserTurn = true;
    battleState.turnCount++;
  }

  /**
   * User tries to flee the battle
   */
  async flee(battleId: string): Promise<BattleState> {
    const battleState = activeBattles.get(battleId);
    if (!battleState) {
      throw new Error("Battle not found");
    }

    if (battleState.battleStatus !== 'active') {
      throw new Error("Battle already ended");
    }

    // 75% chance to flee successfully
    const fleeSuccessful = Math.random() < 0.75;
    
    if (fleeSuccessful) {
      battleState.messages.push("Got away safely!");
      battleState.battleStatus = 'fled';
    } else {
      battleState.messages.push("Couldn't escape!");
      
      // Switch turn to opponent
      battleState.isUserTurn = false;
      battleState.turnCount++;
      
      // Execute opponent's move
      setTimeout(() => {
        this.executeOpponentMove(battleId);
      }, 1000);
    }

    return battleState;
  }

  /**
   * Get the current state of a battle
   */
  getBattleState(battleId: string): BattleState | undefined {
    return activeBattles.get(battleId);
  }

  /**
   * End a battle and clean up resources
   */
  endBattle(battleId: string): void {
    activeBattles.delete(battleId);
  }

  /**
   * Fetch Pokemon data from the PokeAPI
   */
  private async fetchPokemonData(pokemonIdOrName: number | string): Promise<PokemonApiData> {
    try {
      const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonIdOrName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Pokemon data for ${pokemonIdOrName}:`, error);
      throw new Error(`Failed to fetch Pokemon data: ${error}`);
    }
  }

  /**
   * Fetch Move data from the PokeAPI
   */
  private async fetchMoveData(moveUrl: string): Promise<MoveApiData> {
    try {
      const response = await axios.get(moveUrl);
      return response.data;
    } catch (error) {
      console.error(`Error fetching move data:`, error);
      throw new Error(`Failed to fetch move data: ${error}`);
    }
  }

  /**
   * Create a battle Pokemon object from API data
   */
  private async createBattlePokemon(pokemonData: PokemonApiData, level: number | null): Promise<BattlePokemon> {
    // Default to level 5 if level is null
    const pokemonLevel = level || 5;
    // Get 4 random moves from the Pokemon's move pool
    const moveCount = Math.min(4, pokemonData.moves.length);
    const moveIndices = new Set<number>();
    
    while (moveIndices.size < moveCount) {
      moveIndices.add(Math.floor(Math.random() * pokemonData.moves.length));
    }
    
    const movePromises = Array.from(moveIndices).map(index => {
      const moveUrl = pokemonData.moves[index].move.url;
      return this.fetchMoveData(moveUrl);
    });
    
    const movesData = await Promise.all(movePromises);
    
    const moves: BattleMove[] = movesData.map(moveData => ({
      id: moveData.id,
      name: this.formatName(moveData.name),
      power: moveData.power || 40, // Default power if null
      pp: moveData.pp,
      accuracy: moveData.accuracy || 100, // Default accuracy if null
      type: moveData.type.name,
      damageClass: moveData.damage_class.name,
      currentPp: moveData.pp
    }));

    // Calculate HP based on level and base stats
    const baseHp = this.findStat(pokemonData.stats, 'hp');
    const maxHp = Math.floor((2 * baseHp * pokemonLevel) / 100) + pokemonLevel + 10;

    return {
      id: pokemonData.id,
      name: this.formatName(pokemonData.name),
      level: pokemonLevel,
      types: pokemonData.types.map(t => t.type.name),
      currentHp: maxHp,
      maxHp,
      imageUrlFront: pokemonData.sprites.front_default,
      imageUrlBack: pokemonData.sprites.back_default,
      moves
    };
  }

  /**
   * Calculate the damage of a move
   */
  private calculateDamage(
    attacker: BattlePokemon,
    defender: BattlePokemon,
    move: BattleMove
  ): number {
    // Check if the move hits (based on accuracy)
    if (Math.random() * 100 > move.accuracy) {
      return 0; // Move missed
    }

    // Basic damage formula from Pokémon games (simplified)
    const power = move.power;
    const attackStat = 50 + attacker.level * 2; // Simplified stat calculation
    const defenseStat = 50 + defender.level * 2; // Simplified stat calculation
    
    // Calculate type effectiveness
    const effectiveness = this.calculateTypeEffectiveness(move.type, defender.types);
    
    // Calculate critical hit (1/16 chance)
    const critical = Math.random() < 0.0625 ? 1.5 : 1.0;
    
    // Calculate STAB (Same Type Attack Bonus)
    const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;
    
    // Random factor (between 0.85 and 1.0)
    const random = 0.85 + Math.random() * 0.15;
    
    // Final damage calculation
    const damage = Math.floor(
      ((((2 * attacker.level) / 5 + 2) * power * (attackStat / defenseStat)) / 50 + 2) *
        critical *
        effectiveness *
        stab *
        random
    );
    
    return Math.max(1, damage); // Minimum damage is 1
  }

  /**
   * Calculate type effectiveness (simplified)
   */
  private calculateTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
    // Simplified type effectiveness chart
    const typeChart: Record<string, { superEffective: string[], notVeryEffective: string[], immune: string[] }> = {
      normal: {
        superEffective: [],
        notVeryEffective: ['rock', 'steel'],
        immune: ['ghost']
      },
      fire: {
        superEffective: ['grass', 'ice', 'bug', 'steel'],
        notVeryEffective: ['fire', 'water', 'rock', 'dragon'],
        immune: []
      },
      water: {
        superEffective: ['fire', 'ground', 'rock'],
        notVeryEffective: ['water', 'grass', 'dragon'],
        immune: []
      },
      electric: {
        superEffective: ['water', 'flying'],
        notVeryEffective: ['electric', 'grass', 'dragon'],
        immune: ['ground']
      },
      grass: {
        superEffective: ['water', 'ground', 'rock'],
        notVeryEffective: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
        immune: []
      },
      ice: {
        superEffective: ['grass', 'ground', 'flying', 'dragon'],
        notVeryEffective: ['fire', 'water', 'ice', 'steel'],
        immune: []
      },
      fighting: {
        superEffective: ['normal', 'ice', 'rock', 'dark', 'steel'],
        notVeryEffective: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
        immune: ['ghost']
      },
      poison: {
        superEffective: ['grass', 'fairy'],
        notVeryEffective: ['poison', 'ground', 'rock', 'ghost'],
        immune: ['steel']
      },
      ground: {
        superEffective: ['fire', 'electric', 'poison', 'rock', 'steel'],
        notVeryEffective: ['grass', 'bug'],
        immune: ['flying']
      },
      flying: {
        superEffective: ['grass', 'fighting', 'bug'],
        notVeryEffective: ['electric', 'rock', 'steel'],
        immune: []
      },
      psychic: {
        superEffective: ['fighting', 'poison'],
        notVeryEffective: ['psychic', 'steel'],
        immune: ['dark']
      },
      bug: {
        superEffective: ['grass', 'psychic', 'dark'],
        notVeryEffective: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
        immune: []
      },
      rock: {
        superEffective: ['fire', 'ice', 'flying', 'bug'],
        notVeryEffective: ['fighting', 'ground', 'steel'],
        immune: []
      },
      ghost: {
        superEffective: ['psychic', 'ghost'],
        notVeryEffective: ['dark'],
        immune: ['normal']
      },
      dragon: {
        superEffective: ['dragon'],
        notVeryEffective: ['steel'],
        immune: ['fairy']
      },
      dark: {
        superEffective: ['psychic', 'ghost'],
        notVeryEffective: ['fighting', 'dark', 'fairy'],
        immune: []
      },
      steel: {
        superEffective: ['ice', 'rock', 'fairy'],
        notVeryEffective: ['fire', 'water', 'electric', 'steel'],
        immune: []
      },
      fairy: {
        superEffective: ['fighting', 'dragon', 'dark'],
        notVeryEffective: ['fire', 'poison', 'steel'],
        immune: []
      }
    };
    
    let effectiveness = 1.0;
    
    defenderTypes.forEach(defenderType => {
      const typeEffectiveness = typeChart[moveType];
      if (!typeEffectiveness) return;
      
      if (typeEffectiveness.superEffective.includes(defenderType)) {
        effectiveness *= 2.0;
      } else if (typeEffectiveness.notVeryEffective.includes(defenderType)) {
        effectiveness *= 0.5;
      } else if (typeEffectiveness.immune.includes(defenderType)) {
        effectiveness = 0;
      }
    });
    
    return effectiveness;
  }

  /**
   * Find a stat value from the stats array
   */
  private findStat(stats: any[], statName: string): number {
    const stat = stats.find(s => s.stat.name === statName);
    return stat ? stat.base_stat : 50; // Default 50 if not found
  }

  /**
   * Format a name (capitalize first letter, replace hyphens with spaces)
   */
  private formatName(name: string): string {
    return name
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}

// Export singleton instance
export const battleService = new BattleService();