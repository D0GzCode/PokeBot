import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  discordId: text("discord_id").notNull().unique(),
  avatar: text("avatar"),
  trainerLevel: integer("trainer_level").default(1),
  pokecoins: integer("pokecoins").default(0),
  pokemonCaught: integer("pokemon_caught").default(0),
  battleWins: integer("battle_wins").default(0),
  tournamentWins: integer("tournament_wins").default(0),
});

export const pokemon = pgTable("pokemon", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  types: text("types").array(),
  imageUrl: text("image_url"),
  userId: integer("user_id").notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  timestamp: text("timestamp").notNull(),
  userId: integer("user_id").notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  timeRemaining: text("time_remaining").notNull(),
  colorClass: text("color_class").notNull(),
});

export const commandSections = pgTable("command_sections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  icon: text("icon").notNull(),
  iconColor: text("icon_color").notNull(),
});

export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  command: text("command").notNull(),
  status: text("status").notNull(),
  statusColorClass: text("status_color_class").notNull(),
  sectionId: integer("section_id").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertPokemonSchema = createInsertSchema(pokemon);
export const insertActivitySchema = createInsertSchema(activities);
export const insertEventSchema = createInsertSchema(events);
export const insertCommandSectionSchema = createInsertSchema(commandSections);
export const insertCommandSchema = createInsertSchema(commands);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Pokemon = typeof pokemon.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Event = typeof events.$inferSelect;
export type CommandSection = typeof commandSections.$inferSelect & { commands: Command[] };
export type Command = typeof commands.$inferSelect;
