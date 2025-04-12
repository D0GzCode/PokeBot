import { 
  Client, 
  GatewayIntentBits, 
  TextChannel, 
  GuildMember,
  ChannelType, 
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageCreateOptions,
  AttachmentBuilder,
  ColorResolvable,
  InteractionCollector,
  ButtonInteraction,
  MessageComponentInteraction
} from 'discord.js';
import { Server } from 'http';
import { log } from './vite';
import { storage } from './storage';
import { battleService, BattleState, BattlePokemon, BattleMove } from './services/battleService';
import axios from 'axios';

// Command prefixes
const COMMANDS = {
  BATTLE: '!battle',
  CATCH: '!catch',
  TEAM: '!team',
  PROFILE: '!profile',
  HELP: '!help'
};

// Create Discord client
let client: Client | null = null;
const activeBattles = new Map<string, BattleState>();

/**
 * Set up the Discord bot
 */
export async function setupDiscordBot(server: Server): Promise<void> {
  // Check for Discord token
  if (!process.env.DISCORD_TOKEN) {
    log('Missing DISCORD_TOKEN environment variable, bot will not start', 'discord');
    return;
  }

  // Create Discord client with necessary intents
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  // Setup event handlers
  client.on('ready', () => {
    log(`Logged in as ${client?.user?.tag}!`, 'discord');
  });

  // Handle message events
  client.on('messageCreate', async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();
    const args = content.split(' ');

    // Battle command
    if (args[0] === COMMANDS.BATTLE) {
      await handleBattleCommand(message, args);
    }
    // Catch command
    else if (content === COMMANDS.CATCH) {
      await handleCatchCommand(message);
    }
    // Team command
    else if (content === COMMANDS.TEAM) {
      await handleTeamCommand(message);
    }
    // Profile command
    else if (content === COMMANDS.PROFILE) {
      await handleProfileCommand(message);
    }
    // Help command
    else if (content === COMMANDS.HELP) {
      await handleHelpCommand(message);
    }
  });

  // Handle button interactions
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const [action, battleId, moveIndex] = interaction.customId.split('_');
    
    if (action === 'move') {
      await handleMoveButton(interaction, battleId, parseInt(moveIndex));
    } else if (action === 'flee') {
      await handleFleeButton(interaction, battleId);
    }
  });

  // Log in to Discord
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    log(`Failed to log in to Discord: ${error}`, 'discord');
  }
}

/**
 * Handle the !battle command
 */
async function handleBattleCommand(message: Message, args: string[]): Promise<void> {
  try {
    // Get the user from the database
    const user = await storage.getUserByDiscordId(message.author.id);
    if (!user) {
      await message.reply('You need to register first! Use `!register` in the welcome channel.');
      return;
    }

    // Check if user has selected a Pokémon
    let userPokemonId: number;
    
    if (args.length >= 2 && !isNaN(parseInt(args[1]))) {
      userPokemonId = parseInt(args[1]);
    } else {
      // Get user's team
      const team = await storage.getUserTeam(user.id);
      if (team.length === 0) {
        await message.reply('You don\'t have any Pokémon in your team! Catch a Pokémon first.');
        return;
      }
      // Use the first Pokémon in the team
      userPokemonId = team[0].id;
    }

    // Get the Pokémon from the database
    const pokemon = await storage.getPokemonById(userPokemonId);
    if (!pokemon) {
      await message.reply('Pokémon not found! Make sure to use a valid Pokémon ID.');
      return;
    }

    // Check if the Pokémon belongs to the user
    const userTeam = await storage.getUserTeam(user.id);
    if (!userTeam.some(p => p.id === userPokemonId)) {
      await message.reply('This Pokémon is not in your team!');
      return;
    }

    // Start a battle
    const loading = await message.reply('Starting battle...');
    
    // Start the battle
    const battleState = await battleService.startBattle(user.id, userPokemonId);
    
    // Store the battle state
    activeBattles.set(battleState.id, battleState);
    
    // Edit the loading message to show the battle
    await loading.edit({ content: '', embeds: [], components: [] });
    
    // Send the battle messages
    await sendBattleMessages(message.channel as TextChannel, battleState);
    
  } catch (error) {
    console.error('Error in battle command:', error);
    await message.reply('An error occurred while starting the battle. Please try again later.');
  }
}

/**
 * Handle the move button interaction
 */
async function handleMoveButton(interaction: ButtonInteraction, battleId: string, moveIndex: number): Promise<void> {
  try {
    // Get the battle state
    const battleState = activeBattles.get(battleId);
    if (!battleState) {
      await interaction.reply({ content: 'Battle not found!', ephemeral: true });
      return;
    }

    // Check if it's the user's turn
    if (!battleState.isUserTurn) {
      await interaction.reply({ content: 'It\'s not your turn!', ephemeral: true });
      return;
    }

    // Check if the battle is still active
    if (battleState.battleStatus !== 'active') {
      await interaction.reply({ content: 'This battle has ended!', ephemeral: true });
      return;
    }

    // Execute the move
    const updatedBattleState = await battleService.executeMove(battleId, moveIndex);
    
    // Update the battle messages
    await updateBattleMessages(interaction, updatedBattleState);
    
    // Defer the update to avoid interaction timeouts
    await interaction.deferUpdate();
    
  } catch (error) {
    console.error('Error in move button handler:', error);
    await interaction.reply({ content: 'An error occurred during the battle. Please try again later.', ephemeral: true });
  }
}

/**
 * Handle the flee button interaction
 */
async function handleFleeButton(interaction: ButtonInteraction, battleId: string): Promise<void> {
  try {
    // Get the battle state
    const battleState = activeBattles.get(battleId);
    if (!battleState) {
      await interaction.reply({ content: 'Battle not found!', ephemeral: true });
      return;
    }

    // Check if it's the user's turn
    if (!battleState.isUserTurn) {
      await interaction.reply({ content: 'It\'s not your turn!', ephemeral: true });
      return;
    }

    // Check if the battle is still active
    if (battleState.battleStatus !== 'active') {
      await interaction.reply({ content: 'This battle has ended!', ephemeral: true });
      return;
    }

    // Execute the flee action
    const updatedBattleState = await battleService.flee(battleId);
    
    // Update the battle messages
    await updateBattleMessages(interaction, updatedBattleState);
    
    // Defer the update to avoid interaction timeouts
    await interaction.deferUpdate();
    
  } catch (error) {
    console.error('Error in flee button handler:', error);
    await interaction.reply({ content: 'An error occurred during the battle. Please try again later.', ephemeral: true });
  }
}

/**
 * Send the battle messages
 */
async function sendBattleMessages(channel: TextChannel, battleState: BattleState): Promise<void> {
  // Create the opponent message (top screen)
  const opponentEmbed = createOpponentEmbed(battleState);
  
  // Send the opponent message
  const opponentMessage = await channel.send({ embeds: [opponentEmbed] });
  
  // Create the user message (bottom screen)
  const userEmbed = createUserEmbed(battleState);
  
  // Create the action buttons
  const actionButtons = createActionButtons(battleState);
  
  // Send the user message with buttons
  const userMessage = await channel.send({ 
    embeds: [userEmbed],
    components: actionButtons
  });
  
  // Create the battle log message
  const battleLogEmbed = createBattleLogEmbed(battleState);
  
  // Send the battle log message
  await channel.send({ embeds: [battleLogEmbed] });
}

/**
 * Update the battle messages
 */
async function updateBattleMessages(interaction: ButtonInteraction, battleState: BattleState): Promise<void> {
  // Get the channel
  const channel = interaction.channel as TextChannel;
  
  // Get the last 3 messages in the channel
  const messages = await channel.messages.fetch({ limit: 3 });
  
  // Update the messages
  if (messages.size >= 3) {
    const [battleLogMessage, userMessage, opponentMessage] = Array.from(messages.values());
    
    // Update the opponent message (top screen)
    await opponentMessage.edit({ embeds: [createOpponentEmbed(battleState)] });
    
    // Update the user message (bottom screen)
    await userMessage.edit({ 
      embeds: [createUserEmbed(battleState)],
      components: createActionButtons(battleState)
    });
    
    // Update the battle log message
    await battleLogMessage.edit({ embeds: [createBattleLogEmbed(battleState)] });
  }
}

/**
 * Create the opponent embed (top screen)
 */
function createOpponentEmbed(battleState: BattleState): EmbedBuilder {
  const pokemon = battleState.opponentPokemon;
  const hpPercentage = Math.floor((pokemon.currentHp / pokemon.maxHp) * 100);
  const hpBarFilled = Math.floor(hpPercentage / 10);
  const hpBarEmpty = 10 - hpBarFilled;
  const hpBar = '🟩'.repeat(hpBarFilled) + '⬛'.repeat(hpBarEmpty);
  
  // Determine the color based on HP percentage
  let color: ColorResolvable = '#4CAF50'; // Green
  if (hpPercentage <= 50) color = '#FF9800'; // Orange
  if (hpPercentage <= 20) color = '#F44336'; // Red
  
  return new EmbedBuilder()
    .setTitle(`Wild ${pokemon.name} (Lv. ${pokemon.level})`)
    .setDescription(`Type: ${pokemon.types ? pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('/') : 'Unknown'}`)
    .setThumbnail(pokemon.imageUrlFront)
    .addFields(
      { name: 'HP', value: `${pokemon.currentHp}/${pokemon.maxHp}` },
      { name: 'HP Bar', value: hpBar }
    )
    .setColor(color as ColorResolvable);
}

/**
 * Create the user embed (bottom screen)
 */
function createUserEmbed(battleState: BattleState): EmbedBuilder {
  const pokemon = battleState.userPokemon;
  const hpPercentage = Math.floor((pokemon.currentHp / pokemon.maxHp) * 100);
  const hpBarFilled = Math.floor(hpPercentage / 10);
  const hpBarEmpty = 10 - hpBarFilled;
  const hpBar = '🟩'.repeat(hpBarFilled) + '⬛'.repeat(hpBarEmpty);
  
  // Determine the color based on HP percentage
  let color: ColorResolvable = '#4CAF50'; // Green
  if (hpPercentage <= 50) color = '#FF9800'; // Orange
  if (hpPercentage <= 20) color = '#F44336'; // Red
  
  return new EmbedBuilder()
    .setTitle(`Your ${pokemon.name} (Lv. ${pokemon.level})`)
    .setDescription(`Type: ${pokemon.types ? pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('/') : 'Unknown'}`)
    .setThumbnail(pokemon.imageUrlBack)
    .addFields(
      { name: 'HP', value: `${pokemon.currentHp}/${pokemon.maxHp}` },
      { name: 'HP Bar', value: hpBar }
    )
    .setColor(color as ColorResolvable);
}

/**
 * Create the battle log embed
 */
function createBattleLogEmbed(battleState: BattleState): EmbedBuilder {
  // Get the last 5 messages
  const messages = battleState.messages.slice(-5);
  
  const embed = new EmbedBuilder()
    .setTitle('Battle Log')
    .setDescription(messages.join('\n'))
    .setColor('#607D8B'); // Blueish gray
  
  // Add battle status if not active
  if (battleState.battleStatus !== 'active') {
    let statusMessage = '';
    let statusColor: ColorResolvable = '#607D8B';
    
    switch (battleState.battleStatus) {
      case 'userWon':
        statusMessage = '🏆 You won the battle!';
        statusColor = '#4CAF50'; // Green
        break;
      case 'opponentWon':
        statusMessage = '😢 You lost the battle!';
        statusColor = '#F44336'; // Red
        break;
      case 'fled':
        statusMessage = '🏃 You fled from the battle!';
        statusColor = '#FF9800'; // Orange
        break;
    }
    
    embed.addFields({ name: 'Battle Result', value: statusMessage });
    embed.setColor(statusColor);
  }
  
  return embed;
}

/**
 * Create the action buttons
 */
function createActionButtons(battleState: BattleState): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  
  // Moves buttons
  const movesRow1 = new ActionRowBuilder<ButtonBuilder>();
  const movesRow2 = new ActionRowBuilder<ButtonBuilder>();
  
  // Add move buttons (up to 4 moves)
  battleState.userPokemon.moves.forEach((move, index) => {
    const button = new ButtonBuilder()
      .setCustomId(`move_${battleState.id}_${index}`)
      .setLabel(`${move.name} (${move.currentPp}/${move.pp})`)
      .setStyle(getMoveButtonStyle(move.type))
      .setDisabled(!battleState.isUserTurn || battleState.battleStatus !== 'active' || move.currentPp <= 0);
    
    // First two moves in first row, last two in second row
    if (index < 2) {
      movesRow1.addComponents(button);
    } else {
      movesRow2.addComponents(button);
    }
  });
  
  // Control buttons (items, Pokémon, flee)
  const controlRow = new ActionRowBuilder<ButtonBuilder>();
  
  // Add item button
  controlRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`items_${battleState.id}`)
      .setLabel('Items')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true) // Not implemented yet
  );
  
  // Add Pokémon button
  controlRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`pokemon_${battleState.id}`)
      .setLabel('Pokémon')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true) // Not implemented yet
  );
  
  // Add flee button
  controlRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`flee_${battleState.id}`)
      .setLabel('Run Away')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!battleState.isUserTurn || battleState.battleStatus !== 'active')
  );
  
  // Add the rows
  if (movesRow1.components.length > 0) rows.push(movesRow1);
  if (movesRow2.components.length > 0) rows.push(movesRow2);
  rows.push(controlRow);
  
  return rows;
}

/**
 * Get the button style based on the move type
 */
function getMoveButtonStyle(type: string): ButtonStyle {
  // Map Pokémon types to button styles
  const typeStyles: Record<string, ButtonStyle> = {
    normal: ButtonStyle.Secondary,
    fire: ButtonStyle.Danger,
    water: ButtonStyle.Primary,
    electric: ButtonStyle.Success,
    grass: ButtonStyle.Success,
    ice: ButtonStyle.Primary,
    fighting: ButtonStyle.Danger,
    poison: ButtonStyle.Secondary,
    ground: ButtonStyle.Secondary,
    flying: ButtonStyle.Primary,
    psychic: ButtonStyle.Secondary,
    bug: ButtonStyle.Success,
    rock: ButtonStyle.Secondary,
    ghost: ButtonStyle.Secondary,
    dragon: ButtonStyle.Secondary,
    dark: ButtonStyle.Secondary,
    steel: ButtonStyle.Secondary,
    fairy: ButtonStyle.Secondary
  };
  
  return typeStyles[type] || ButtonStyle.Secondary;
}

/**
 * Handle the !catch command
 */
async function handleCatchCommand(message: Message): Promise<void> {
  await message.reply('This feature is not implemented yet.');
}

/**
 * Handle the !team command
 */
async function handleTeamCommand(message: Message): Promise<void> {
  try {
    // Get the user from the database
    const user = await storage.getUserByDiscordId(message.author.id);
    if (!user) {
      await message.reply('You need to register first! Use `!register` in the welcome channel.');
      return;
    }

    // Get user's team
    const team = await storage.getUserTeam(user.id);
    if (team.length === 0) {
      await message.reply('You don\'t have any Pokémon in your team! Catch a Pokémon first.');
      return;
    }

    // Create the team embed
    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s Pokémon Team`)
      .setColor('#FF5722') // Deep orange
      .setThumbnail(message.author.displayAvatarURL());

    // Add each Pokémon to the embed
    team.forEach((pokemon, index) => {
      embed.addFields({
        name: `#${index + 1}: ${pokemon.name} (Lv. ${pokemon.level})`,
        value: `Type: ${pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('/')}\nID: ${pokemon.id}`
      });
    });

    // Add battle instructions
    embed.setFooter({ text: 'To battle with a specific Pokémon, use !battle [pokemon_id]' });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in team command:', error);
    await message.reply('An error occurred while fetching your team. Please try again later.');
  }
}

/**
 * Handle the !profile command
 */
async function handleProfileCommand(message: Message): Promise<void> {
  await message.reply('This feature is not implemented yet.');
}

/**
 * Handle the !help command
 */
async function handleHelpCommand(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('PokéBot Commands')
    .setDescription('Here are the available commands:')
    .setColor('#2196F3') // Blue
    .addFields(
      { name: '!battle [pokemon_id]', value: 'Start a battle with a wild Pokémon. Optionally specify which Pokémon from your team to use.' },
      { name: '!catch', value: 'Try to catch a wild Pokémon when one appears.' },
      { name: '!team', value: 'View your Pokémon team.' },
      { name: '!profile', value: 'View your trainer profile.' }
    )
    .setFooter({ text: 'PokéBot v1.0.0' });

  await message.reply({ embeds: [embed] });
}