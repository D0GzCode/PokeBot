export interface Pokemon {
  id: number;
  name: string;
  level: number;
  types: string[];
  imageUrl: string;
}

export interface User {
  id: number;
  username: string;
  discordId: string;
  avatar: string;
  trainerLevel: number;
  pokecoins: number;
  pokemonCaught: number;
  battleWins: number;
  tournamentWins: number;
  team: Pokemon[];
}

export interface Activity {
  id: number;
  type: 'catch' | 'battle' | 'evolution' | 'hatch';
  description: string;
  timestamp: string;
  userId: number;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  timeRemaining: string;
  colorClass: string;
}

export interface CommandGuide {
  id: number;
  title: string;
  description: string;
  command: string;
  status: string;
  statusColorClass: string;
}

export interface CommandSection {
  id: number;
  title: string;
  icon: string;
  iconColor: string;
  commands: CommandGuide[];
}
