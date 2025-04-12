import { pgTable, text, serial, integer, boolean, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Avatar items table
export const avatarItems = pgTable("avatar_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  type: text("type").notNull(), // 'head', 'body', 'legs', 'feet', 'hands', 'accessory'
  price: integer("price").notNull().default(100),
  rarity: text("rarity").notNull().default("common"), // 'common', 'uncommon', 'rare', 'epic', 'legendary'
});

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
  npcDefeated: integer("npc_defeated").default(0),
  lastActiveAt: text("last_active_at").default(new Date().toISOString()),

  // Avatar customization
  avatarHeadItem: integer("avatar_head_item").references(() => avatarItems.id),
  avatarBodyItem: integer("avatar_body_item").references(() => avatarItems.id),
  avatarLegsItem: integer("avatar_legs_item").references(() => avatarItems.id),
  avatarFeetItem: integer("avatar_feet_item").references(() => avatarItems.id),
  avatarHandsItem: integer("avatar_hands_item").references(() => avatarItems.id),
  avatarAccessoryItem: integer("avatar_accessory_item").references(() => avatarItems.id),
});

// User items table (inventory)
export const userItems = pgTable("user_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => avatarItems.id, { onDelete: "cascade" }),
  equipped: boolean("equipped").default(false),
  obtainedAt: text("obtained_at").default(new Date().toISOString()),
});

export const pokemon = pgTable("pokemon", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  types: text("types").array(),
  imageUrl: text("image_url"),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// For tracking active team members
export const userTeams = pgTable("user_teams", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pokemonId: integer("pokemon_id").notNull().references(() => pokemon.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.pokemonId] }),
}));

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  timestamp: text("timestamp").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  sectionId: integer("section_id").notNull().references(() => commandSections.id, { onDelete: "cascade" }),
});

// NPC trainers for battles
export const npcTrainers = pgTable("npc_trainers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  difficulty: integer("difficulty").notNull().default(1),
  imageUrl: text("image_url"),
  rewardCoins: integer("reward_coins").notNull().default(50),
  rewardExp: integer("reward_exp").notNull().default(25),
  requiredLevel: integer("required_level").default(1),
});

// NPC trainer Pokemon
export const npcPokemon = pgTable("npc_pokemon", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => npcTrainers.id, { onDelete: "cascade" }),
  pokemonApiId: integer("pokemon_api_id").notNull(), // ID from PokeAPI
  level: integer("level").notNull().default(5),
  position: integer("position").notNull().default(1), // Position in trainer's team
});

// Item tables for Pokeballs, potions, etc.
export const itemTypes = pgTable("item_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull().default(100),
  imageUrl: text("image_url"),
  effect: text("effect").notNull(),
  typeId: integer("type_id").notNull().references(() => itemTypes.id, { onDelete: "cascade" }),
});

export const userInventory = pgTable("user_inventory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  pokemon: many(pokemon),
  activities: many(activities),
  userItems: many(userItems),
  inventory: many(userInventory),
  // References to avatar items
  headItem: one(avatarItems, { fields: [users.avatarHeadItem], references: [avatarItems.id] }),
  bodyItem: one(avatarItems, { fields: [users.avatarBodyItem], references: [avatarItems.id] }),
  legsItem: one(avatarItems, { fields: [users.avatarLegsItem], references: [avatarItems.id] }),
  feetItem: one(avatarItems, { fields: [users.avatarFeetItem], references: [avatarItems.id] }),
  handsItem: one(avatarItems, { fields: [users.avatarHandsItem], references: [avatarItems.id] }),
  accessoryItem: one(avatarItems, { fields: [users.avatarAccessoryItem], references: [avatarItems.id] }),
}));

export const pokemonRelations = relations(pokemon, ({ one }) => ({
  user: one(users, {
    fields: [pokemon.userId],
    references: [users.id],
  }),
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

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const commandSectionsRelations = relations(commandSections, ({ many }) => ({
  commands: many(commands),
}));

export const commandsRelations = relations(commands, ({ one }) => ({
  section: one(commandSections, {
    fields: [commands.sectionId],
    references: [commandSections.id],
  }),
}));

export const avatarItemsRelations = relations(avatarItems, ({ many }) => ({
  userItems: many(userItems),
}));

export const userItemsRelations = relations(userItems, ({ one }) => ({
  user: one(users, {
    fields: [userItems.userId],
    references: [users.id],
  }),
  item: one(avatarItems, {
    fields: [userItems.itemId],
    references: [avatarItems.id],
  }),
}));

export const npcTrainersRelations = relations(npcTrainers, ({ many }) => ({
  pokemon: many(npcPokemon),
}));

export const npcPokemonRelations = relations(npcPokemon, ({ one }) => ({
  trainer: one(npcTrainers, {
    fields: [npcPokemon.trainerId],
    references: [npcTrainers.id],
  }),
}));

export const itemTypesRelations = relations(itemTypes, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  type: one(itemTypes, {
    fields: [items.typeId],
    references: [itemTypes.id],
  }),
  inventory: many(userInventory),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
  user: one(users, {
    fields: [userInventory.userId],
    references: [users.id],
  }),
  item: one(items, {
    fields: [userInventory.itemId],
    references: [items.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertPokemonSchema = createInsertSchema(pokemon);
export const insertActivitySchema = createInsertSchema(activities);
export const insertEventSchema = createInsertSchema(events);
export const insertCommandSectionSchema = createInsertSchema(commandSections);
export const insertCommandSchema = createInsertSchema(commands);
export const insertUserTeamSchema = createInsertSchema(userTeams);
export const insertAvatarItemSchema = createInsertSchema(avatarItems);
export const insertUserItemSchema = createInsertSchema(userItems);
export const insertNpcTrainerSchema = createInsertSchema(npcTrainers);
export const insertNpcPokemonSchema = createInsertSchema(npcPokemon);
export const insertItemTypeSchema = createInsertSchema(itemTypes);
export const insertItemSchema = createInsertSchema(items);
export const insertUserInventorySchema = createInsertSchema(userInventory);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPokemon = z.infer<typeof insertPokemonSchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertCommandSection = z.infer<typeof insertCommandSectionSchema>;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
export type InsertUserTeam = z.infer<typeof insertUserTeamSchema>;
export type InsertAvatarItem = z.infer<typeof insertAvatarItemSchema>;
export type InsertUserItem = z.infer<typeof insertUserItemSchema>;
export type InsertNpcTrainer = z.infer<typeof insertNpcTrainerSchema>;
export type InsertNpcPokemon = z.infer<typeof insertNpcPokemonSchema>;
export type InsertItemType = z.infer<typeof insertItemTypeSchema>;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;

export type User = typeof users.$inferSelect;
export type Pokemon = typeof pokemon.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Event = typeof events.$inferSelect;
export type CommandSection = typeof commandSections.$inferSelect;
export type Command = typeof commands.$inferSelect;
export type UserTeam = typeof userTeams.$inferSelect;
export type AvatarItem = typeof avatarItems.$inferSelect;
export type UserItem = typeof userItems.$inferSelect;
export type NpcTrainer = typeof npcTrainers.$inferSelect;
export type NpcPokemon = typeof npcPokemon.$inferSelect;
export type ItemType = typeof itemTypes.$inferSelect;
export type Item = typeof items.$inferSelect;
export type UserInventory = typeof userInventory.$inferSelect;
export type UserWithTeam = User & { team: Pokemon[] };