import { pgTable, text, serial, integer, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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

export const usersRelations = relations(users, ({ many }) => ({
  pokemon: many(pokemon),
  activities: many(activities),
}));

export const pokemon = pgTable("pokemon", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  types: text("types").array(),
  imageUrl: text("image_url"),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const pokemonRelations = relations(pokemon, ({ one }) => ({
  user: one(users, {
    fields: [pokemon.userId],
    references: [users.id],
  }),
}));

// For tracking active team members
export const userTeams = pgTable("user_teams", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pokemonId: integer("pokemon_id").notNull().references(() => pokemon.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.pokemonId] }),
}));

export const userTeamsRelations = relations(userTeams, ({ one }) => ({
  user: one(users, {
    fields: [userTeams.userId],
    references: [users.id],
  }),
  pokemon: one(pokemon, {
    fields: [userTeams.pokemonId],
    references: [pokemon.id],
  }),
}));

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  timestamp: text("timestamp").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

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

export const commandSectionsRelations = relations(commandSections, ({ many }) => ({
  commands: many(commands),
}));

export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  command: text("command").notNull(),
  status: text("status").notNull(),
  statusColorClass: text("status_color_class").notNull(),
  sectionId: integer("section_id").notNull().references(() => commandSections.id, { onDelete: "cascade" }),
});

export const commandsRelations = relations(commands, ({ one }) => ({
  section: one(commandSections, {
    fields: [commands.sectionId],
    references: [commandSections.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const insertPokemonSchema = createInsertSchema(pokemon);
export const insertActivitySchema = createInsertSchema(activities);
export const insertEventSchema = createInsertSchema(events);
export const insertCommandSectionSchema = createInsertSchema(commandSections);
export const insertCommandSchema = createInsertSchema(commands);
export const insertUserTeamSchema = createInsertSchema(userTeams);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPokemon = z.infer<typeof insertPokemonSchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertCommandSection = z.infer<typeof insertCommandSectionSchema>;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
export type InsertUserTeam = z.infer<typeof insertUserTeamSchema>;

export type User = typeof users.$inferSelect;
export type Pokemon = typeof pokemon.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Event = typeof events.$inferSelect;
export type CommandSection = typeof commandSections.$inferSelect;
export type Command = typeof commands.$inferSelect;
export type UserTeam = typeof userTeams.$inferSelect;
export type UserWithTeam = User & { team: Pokemon[] };
