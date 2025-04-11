import { users, type User, type InsertUser } from "@shared/schema";
import { 
  Pokemon, 
  Activity, 
  Event, 
  CommandSection 
} from "@/lib/types";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getFirstUser(): Promise<User | undefined>;
  getRecentActivities(): Promise<Activity[]>;
  getUpcomingEvents(): Promise<Event[]>;
  getCommandSections(): Promise<CommandSection[]>;
  createActivity(activity: any): Promise<Activity>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pokemon: Map<number, Pokemon>;
  private activities: Map<number, Activity>;
  private events: Map<number, Event>;
  private commandSections: Map<number, CommandSection>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.pokemon = new Map();
    this.activities = new Map();
    this.events = new Map();
    this.commandSections = new Map();
    this.currentId = 1;
    
    // Initialize with sample data for development
    this.initializeSampleData();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.discordId === discordId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getFirstUser(): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    return users.length > 0 ? users[0] : undefined;
  }

  async getRecentActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getCommandSections(): Promise<CommandSection[]> {
    return Array.from(this.commandSections.values());
  }

  async createActivity(activityData: any): Promise<Activity> {
    const id = this.activities.size + 1;
    const activity: Activity = {
      id,
      type: activityData.type,
      description: activityData.description,
      timestamp: new Date().toISOString(),
      userId: activityData.userId,
    };
    this.activities.set(id, activity);
    return activity;
  }

  private initializeSampleData() {
    // Sample Pokémon
    const pokemon: Pokemon[] = [
      {
        id: 1,
        name: "Pikachu",
        level: 45,
        types: ["Electric"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
      },
      {
        id: 2,
        name: "Charizard",
        level: 42,
        types: ["Fire", "Flying"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png"
      },
      {
        id: 3,
        name: "Blastoise",
        level: 39,
        types: ["Water"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png"
      },
      {
        id: 4,
        name: "Venusaur",
        level: 40,
        types: ["Grass", "Poison"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png"
      },
      {
        id: 5,
        name: "Arcanine",
        level: 41,
        types: ["Fire"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/59.png"
      }
    ];

    // Add Pokémon to storage
    pokemon.forEach(p => this.pokemon.set(p.id, p));

    // Sample User
    const user: User = {
      id: 1,
      username: "AshKetchum",
      discordId: "521390831983394817", // From the provided code
      password: "password123", // This would be hashed in a real application
      avatar: "https://i.pravatar.cc/300",
      trainerLevel: 10,
      pokecoins: 1250,
      pokemonCaught: 42,
      battleWins: 28,
      tournamentWins: 3,
      team: pokemon
    };

    // Add User to storage
    this.users.set(user.id, user);

    // Sample Activities
    const activities: Activity[] = [
      {
        id: 1,
        type: "catch",
        description: "You caught a Pikachu!",
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        userId: 1
      },
      {
        id: 2,
        type: "battle",
        description: "You won a battle against TrainerBob!",
        timestamp: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
        userId: 1
      },
      {
        id: 3,
        type: "evolution",
        description: "Your Charmeleon evolved into Charizard!",
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        userId: 1
      },
      {
        id: 4,
        type: "hatch",
        description: "Your egg hatched into Togepi!",
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        userId: 1
      }
    ];

    // Add Activities to storage
    activities.forEach(a => this.activities.set(a.id, a));

    // Sample Events
    const events: Event[] = [
      {
        id: 1,
        title: "Elite Four Challenge",
        description: "Battle the Elite Four to earn exclusive rewards",
        date: new Date().toISOString(),
        timeRemaining: "Today",
        colorClass: "border-pokemon-red"
      },
      {
        id: 2,
        title: "Water Festival",
        description: "Increased spawns of Water-type Pokémon",
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        timeRemaining: "Tomorrow",
        colorClass: "border-pokemon-blue"
      },
      {
        id: 3,
        title: "Regional Tournament",
        description: "Single-elimination tournament with prizes",
        date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
        timeRemaining: "3 days",
        colorClass: "border-pokemon-yellow"
      },
      {
        id: 4,
        title: "Safari Zone",
        description: "Special catching event with rare Pokémon",
        date: new Date(Date.now() + 604800000).toISOString(), // 7 days from now
        timeRemaining: "Next week",
        colorClass: "border-green-500"
      }
    ];

    // Add Events to storage
    events.forEach(e => this.events.set(e.id, e));

    // Sample Command Sections
    const commandSections: CommandSection[] = [
      {
        id: 1,
        title: "Battles",
        icon: "casino",
        iconColor: "text-pokemon-red",
        commands: [
          {
            id: 1,
            title: "NPC Battles",
            description: "Challenge NPCs to earn XP and items",
            command: "!npc",
            status: "Available",
            statusColorClass: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
          },
          {
            id: 2,
            title: "Ranked Battles",
            description: "Battle other trainers to climb the leaderboard",
            command: "!rb",
            status: "With Queue",
            statusColorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          },
          {
            id: 3,
            title: "Battles with Sound",
            description: "Experience battles with sound effects",
            command: "!npcs",
            status: "Beta Feature",
            statusColorClass: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
          }
        ]
      },
      {
        id: 2,
        title: "Pokémon",
        icon: "catching_pokemon",
        iconColor: "text-pokemon-blue",
        commands: [
          {
            id: 4,
            title: "Catch Pokémon",
            description: "Catch Pokémon when they appear in spawns",
            command: "!catch",
            status: "Spawns Channel",
            statusColorClass: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
          },
          {
            id: 5,
            title: "Team Management",
            description: "View and manage your Pokémon team",
            command: "!team",
            status: "Any Channel",
            statusColorClass: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
          },
          {
            id: 6,
            title: "Pokémon Storage",
            description: "Access your stored Pokémon",
            command: "!storage",
            status: "Any Channel",
            statusColorClass: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
          }
        ]
      },
      {
        id: 3,
        title: "Tournaments",
        icon: "emoji_events",
        iconColor: "text-pokemon-yellow",
        commands: [
          {
            id: 7,
            title: "Create Tournament",
            description: "Create a new tournament for trainers",
            command: "!tcreate",
            status: "Ranked Channel",
            statusColorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          },
          {
            id: 8,
            title: "Join Tournament",
            description: "Join an active tournament",
            command: "!tjoin",
            status: "Ranked Channel",
            statusColorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          },
          {
            id: 9,
            title: "View Bracket",
            description: "View the current tournament bracket",
            command: "!tbracket",
            status: "Ranked Channel",
            statusColorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          }
        ]
      }
    ];

    // Add Command Sections to storage
    commandSections.forEach(s => this.commandSections.set(s.id, s));
  }
}

export const storage = new MemStorage();
