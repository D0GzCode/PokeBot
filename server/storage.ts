import { 
  users, pokemon, activities, events, commandSections, commands, userTeams,
  type User as DbUser, type InsertUser, type Pokemon, type Activity, type Event,
  type CommandSection as DbCommandSection, type Command, type InsertPokemon, type InsertActivity,
  type InsertEvent, type InsertCommandSection, type InsertCommand, type InsertUserTeam
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

// Extended user type that includes the team
export interface User extends DbUser {
  team: Pokemon[];
}

// Extended command section that includes commands
export interface CommandSection extends DbCommandSection {
  commands: Command[];
}

// Interface for storage operations
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getFirstUser(): Promise<User | undefined>;
  getRecentActivities(): Promise<Activity[]>;
  getUpcomingEvents(): Promise<Event[]>;
  getCommandSections(): Promise<CommandSection[]>;
  createActivity(activity: Omit<InsertActivity, "id">): Promise<Activity>;
  
  // Pokemon related methods
  getPokemonById(id: number): Promise<Pokemon | undefined>;
  getPokemonByUserId(userId: number): Promise<Pokemon[]>;
  createPokemon(pokemon: Omit<InsertPokemon, "id">): Promise<Pokemon>;
  
  // User team methods
  getUserTeam(userId: number): Promise<Pokemon[]>;
  addPokemonToTeam(userId: number, pokemonId: number): Promise<void>;
  removePokemonFromTeam(userId: number, pokemonId: number): Promise<void>;
  
  // Command section methods
  getCommandById(id: number): Promise<Command | undefined>;
  createCommandSection(section: Omit<InsertCommandSection, "id">): Promise<CommandSection>;
  createCommand(command: Omit<InsertCommand, "id">): Promise<Command>;
  
  // Event methods
  createEvent(event: Omit<InsertEvent, "id">): Promise<Event>;
}

// Implementation using the database
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [dbUser] = await db.select().from(users).where(eq(users.id, id));
    if (!dbUser) return undefined;
    
    // Get user's team
    const team = await this.getUserTeam(id);
    const user: User = { ...dbUser, team };
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [dbUser] = await db.select().from(users).where(eq(users.username, username));
    if (!dbUser) return undefined;
    
    // Get user's team
    const team = await this.getUserTeam(dbUser.id);
    const user: User = { ...dbUser, team };
    return user;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [dbUser] = await db.select().from(users).where(eq(users.discordId, discordId));
    if (!dbUser) return undefined;
    
    // Get user's team
    const team = await this.getUserTeam(dbUser.id);
    const user: User = { ...dbUser, team };
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [dbUser] = await db.insert(users).values(userData).returning();
    const user: User = { ...dbUser, team: [] };
    return user;
  }

  async getFirstUser(): Promise<User | undefined> {
    const [dbUser] = await db.select().from(users).limit(1);
    if (!dbUser) return undefined;
    
    // Get user's team
    const team = await this.getUserTeam(dbUser.id);
    const user: User = { ...dbUser, team };
    return user;
  }

  // Pokemon methods
  async getPokemonById(id: number): Promise<Pokemon | undefined> {
    const [foundPokemon] = await db.select().from(pokemon).where(eq(pokemon.id, id));
    return foundPokemon;
  }

  async getPokemonByUserId(userId: number): Promise<Pokemon[]> {
    return await db.select().from(pokemon).where(eq(pokemon.userId, userId));
  }

  async createPokemon(poke: Omit<InsertPokemon, "id">): Promise<Pokemon> {
    const [createdPokemon] = await db.insert(pokemon).values(poke).returning();
    return createdPokemon;
  }

  // Team methods
  async getUserTeam(userId: number): Promise<Pokemon[]> {
    const teamEntries = await db.select().from(userTeams)
      .where(eq(userTeams.userId, userId));
    
    if (teamEntries.length === 0) return [];
    
    const pokemonIds = teamEntries.map(entry => entry.pokemonId);
    const teamPokemon = await db.select().from(pokemon)
      .where(inArray(pokemon.id, pokemonIds));
    
    return teamPokemon;
  }

  async addPokemonToTeam(userId: number, pokemonId: number): Promise<void> {
    await db.insert(userTeams).values({
      userId,
      pokemonId
    }).onConflictDoNothing();
  }

  async removePokemonFromTeam(userId: number, pokemonId: number): Promise<void> {
    await db.delete(userTeams)
      .where(and(
        eq(userTeams.userId, userId),
        eq(userTeams.pokemonId, pokemonId)
      ));
  }

  // Activity methods
  async getRecentActivities(): Promise<Activity[]> {
    return await db.select().from(activities).orderBy(desc(activities.timestamp)).limit(10);
  }

  async createActivity(activity: Omit<InsertActivity, "id">): Promise<Activity> {
    const activityWithTimestamp = {
      ...activity,
      timestamp: new Date().toISOString()
    };
    
    const [createdActivity] = await db.insert(activities)
      .values(activityWithTimestamp)
      .returning();
    
    return createdActivity;
  }

  // Event methods
  async getUpcomingEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(events.date);
  }

  async createEvent(event: Omit<InsertEvent, "id">): Promise<Event> {
    const [createdEvent] = await db.insert(events).values(event).returning();
    return createdEvent;
  }

  // Command methods
  async getCommandSections(): Promise<CommandSection[]> {
    // Get all command sections
    const dbSections = await db.select().from(commandSections);
    
    // Get all commands
    const allCommands = await db.select().from(commands);
    
    // Group commands by section
    const sectionMap = new Map<number, Command[]>();
    allCommands.forEach(command => {
      const sectionId = command.sectionId;
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, []);
      }
      sectionMap.get(sectionId)?.push(command);
    });
    
    // Combine sections with their commands
    return dbSections.map(section => ({
      ...section,
      commands: sectionMap.get(section.id) || []
    }));
  }

  async getCommandById(id: number): Promise<Command | undefined> {
    const [command] = await db.select().from(commands).where(eq(commands.id, id));
    return command;
  }

  async createCommandSection(section: Omit<InsertCommandSection, "id">): Promise<CommandSection> {
    const [createdSection] = await db.insert(commandSections)
      .values(section)
      .returning();
    
    return { ...createdSection, commands: [] };
  }

  async createCommand(command: Omit<InsertCommand, "id">): Promise<Command> {
    const [createdCommand] = await db.insert(commands)
      .values(command)
      .returning();
    
    return createdCommand;
  }
  
  // Seed method to initialize the database with sample data
  async seedDatabase() {
    // Check if we already have users
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    const count = result[0]?.count || 0;
    
    if (count > 0) {
      console.log("Database already seeded.");
      return;
    }
    
    console.log("Seeding database with initial data...");
    
    try {
      // Create command sections first
      const battleSection = await this.createCommandSection({
        title: "Battles",
        icon: "casino",
        iconColor: "text-pokemon-red"
      });
      
      const pokemonSection = await this.createCommandSection({
        title: "Pokémon",
        icon: "catching_pokemon",
        iconColor: "text-pokemon-blue"
      });
      
      const tournamentSection = await this.createCommandSection({
        title: "Tournaments",
        icon: "emoji_events",
        iconColor: "text-pokemon-yellow"
      });
      
      // Create commands for each section
      await this.createCommand({
        title: "NPC Battles",
        description: "Challenge NPCs to earn XP and items",
        command: "!npc",
        status: "Available",
        statusColorClass: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
        sectionId: battleSection.id
      });
      
      await this.createCommand({
        title: "Ranked Battles",
        description: "Battle other trainers to climb the leaderboard",
        command: "!rb",
        status: "With Queue",
        statusColorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
        sectionId: battleSection.id
      });
      
      await this.createCommand({
        title: "Battles with Sound",
        description: "Experience battles with sound effects",
        command: "!npcs",
        status: "Beta Feature",
        statusColorClass: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
        sectionId: battleSection.id
      });
      
      await this.createCommand({
        title: "Catch Pokémon",
        description: "Catch Pokémon when they appear in spawns",
        command: "!catch",
        status: "Spawns Channel",
        statusColorClass: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
        sectionId: pokemonSection.id
      });
      
      await this.createCommand({
        title: "Team Management",
        description: "View and manage your Pokémon team",
        command: "!team",
        status: "Any Channel",
        statusColorClass: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
        sectionId: pokemonSection.id
      });
      
      await this.createCommand({
        title: "Pokémon Storage",
        description: "Access your stored Pokémon",
        command: "!storage",
        status: "Any Channel",
        statusColorClass: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
        sectionId: pokemonSection.id
      });
      
      await this.createCommand({
        title: "Create Tournament",
        description: "Create a new tournament for trainers",
        command: "!tcreate",
        status: "Ranked Channel",
        statusColorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
        sectionId: tournamentSection.id
      });
      
      await this.createCommand({
        title: "Join Tournament",
        description: "Join an active tournament",
        command: "!tjoin",
        status: "Ranked Channel",
        statusColorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
        sectionId: tournamentSection.id
      });
      
      await this.createCommand({
        title: "View Bracket",
        description: "View the current tournament bracket",
        command: "!tbracket",
        status: "Ranked Channel",
        statusColorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
        sectionId: tournamentSection.id
      });
      
      // Create events
      await this.createEvent({
        title: "Elite Four Challenge",
        description: "Battle the Elite Four to earn exclusive rewards",
        date: new Date().toISOString(),
        timeRemaining: "Today",
        colorClass: "border-pokemon-red"
      });
      
      await this.createEvent({
        title: "Water Festival",
        description: "Increased spawns of Water-type Pokémon",
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        timeRemaining: "Tomorrow",
        colorClass: "border-pokemon-blue"
      });
      
      await this.createEvent({
        title: "Regional Tournament",
        description: "Single-elimination tournament with prizes",
        date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
        timeRemaining: "3 days",
        colorClass: "border-pokemon-yellow"
      });
      
      await this.createEvent({
        title: "Safari Zone",
        description: "Special catching event with rare Pokémon",
        date: new Date(Date.now() + 604800000).toISOString(), // 7 days from now
        timeRemaining: "Next week",
        colorClass: "border-green-500"
      });
      
      // Create a sample user
      const user = await this.createUser({
        username: "AshKetchum",
        password: "password123", // In a real app, this would be hashed
        discordId: "521390831983394817",
        avatar: "https://i.pravatar.cc/300",
        trainerLevel: 10,
        pokecoins: 1250,
        pokemonCaught: 42,
        battleWins: 28,
        tournamentWins: 3
      });
      
      // Create sample Pokémon for the user
      const pikachu = await this.createPokemon({
        name: "Pikachu",
        level: 45,
        types: ["Electric"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
        userId: user.id
      });
      
      const charizard = await this.createPokemon({
        name: "Charizard",
        level: 42,
        types: ["Fire", "Flying"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
        userId: user.id
      });
      
      const blastoise = await this.createPokemon({
        name: "Blastoise",
        level: 39,
        types: ["Water"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png",
        userId: user.id
      });
      
      const venusaur = await this.createPokemon({
        name: "Venusaur",
        level: 40,
        types: ["Grass", "Poison"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png",
        userId: user.id
      });
      
      const arcanine = await this.createPokemon({
        name: "Arcanine",
        level: 41,
        types: ["Fire"],
        imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/59.png",
        userId: user.id
      });
      
      // Add Pokémon to user's team
      await this.addPokemonToTeam(user.id, pikachu.id);
      await this.addPokemonToTeam(user.id, charizard.id);
      await this.addPokemonToTeam(user.id, blastoise.id);
      await this.addPokemonToTeam(user.id, venusaur.id);
      await this.addPokemonToTeam(user.id, arcanine.id);
      
      // Create sample activities
      await this.createActivity({
        type: "catch",
        description: "You caught a Pikachu!",
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        userId: user.id
      });
      
      await this.createActivity({
        type: "battle",
        description: "You won a battle against TrainerBob!",
        timestamp: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
        userId: user.id
      });
      
      await this.createActivity({
        type: "evolution",
        description: "Your Charmeleon evolved into Charizard!",
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        userId: user.id
      });
      
      await this.createActivity({
        type: "hatch",
        description: "Your egg hatched into Togepi!",
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        userId: user.id
      });
      
      console.log("Database seeded successfully!");
    } catch (error) {
      console.error("Error seeding database:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
