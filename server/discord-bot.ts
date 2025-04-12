import { 
  Client, 
  GatewayIntentBits, 
  TextChannel, 
  ChannelType, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ColorResolvable, 
  ButtonStyle, 
  ButtonInteraction,
  Message,
  Server
} from 'discord.js';
import chalk from 'chalk';
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
  HELP: '!help',
  DEX: '!dex',      // New Pokédex console command
  CREATE: '!create', // Avatar creation/selection command
  REGISTER: '!register', // User registration command
  AVATAR: '!avatar',  // Avatar item management
  SHOP: '!shop',     // Shop for avatar items and Pokéballs
  NPC: '!npc'        // Challenge NPC trainers
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
    if (!client) return;
    console.log(chalk.green('🤖 ') + chalk.bold.green(`Discord Bot Online: Logged in as ${client.user?.tag}!`));
    log(`Logged in as ${client.user?.tag}!`, 'discord');
    
    // Show server information
    if (client.guilds.cache.size > 0) {
      console.log(chalk.cyan('🌐 Connected to the following servers:'));
      client.guilds.cache.forEach(guild => {
        console.log(chalk.cyan(`   - ${guild.name} (${guild.memberCount} members)`));
      });
    } else {
      console.log(chalk.yellow('⚠️ Not connected to any Discord servers yet'));
      console.log(chalk.yellow('   To add your bot to a server, use this link:'));
      if (client.user) {
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`;
        console.log(chalk.blue(`   ${inviteLink}`));
      }
    }
    
    // Set the bot's presence
    if (client && client.user) {
      client.user.setPresence({
        status: 'online',
        activities: [{
          name: '!help | Pokémon Battles',
          type: 0 // Playing
        }]
      });
    }
  });

  // Handle message events
  client.on('messageCreate', async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();
    const args = content.split(' ');
    
    // Log messages to console with pretty formatting
    const channel = message.channel;
    const channelName = channel.type === ChannelType.DM ? "DM" : 
                       'name' in channel ? channel.name : "Unknown Channel";
    const guildName = message.guild?.name || "DM";
    
    // Only log command messages (starting with !)
    if (content.startsWith('!')) {
      console.log(
        chalk.gray(`[${new Date().toLocaleTimeString()}] `) +
        chalk.blue(`${guildName} #${channelName} `) + 
        chalk.yellow(`@${message.author.username}: `) + 
        chalk.green(content)
      );
    }

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
    else if (args[0] === COMMANDS.PROFILE) {
      await handleProfileCommand(message, args);
    }
    // Help command
    else if (content === COMMANDS.HELP) {
      await handleHelpCommand(message);
    }
    // Pokédex command
    else if (content === COMMANDS.DEX) {
      await handleDexCommand(message);
    }
    // Avatar creation command
    else if (content.startsWith(COMMANDS.CREATE)) {
      await handleCreateCommand(message, args);
    }
    // Register command
    else if (content === COMMANDS.REGISTER) {
      await handleRegisterCommand(message);
    }
    // Avatar management command
    else if (content.startsWith(COMMANDS.AVATAR)) {
      await handleAvatarCommand(message, args);
    }
    // Shop command
    else if (content.startsWith(COMMANDS.SHOP)) {
      await handleShopCommand(message, args);
    }
    // NPC battle command
    else if (content === COMMANDS.NPC) {
      await handleNpcCommand(message);
    }
  });

  // Handle button interactions
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const [action, battleId, moveIndex] = interaction.customId.split('_');
    
    // Log button interactions to console
    const username = interaction.user?.username || "Unknown User";
    const channel = interaction.channel;
    const channelName = !channel ? "Unknown Channel" : 
                       channel.type === ChannelType.DM ? "DM" : 
                       'name' in channel ? channel.name : "Unknown Channel";
    const guildName = interaction.guild?.name || "Unknown Server";
    
    console.log(
      chalk.gray(`[${new Date().toLocaleTimeString()}] `) +
      chalk.magenta(`${guildName} #${channelName} `) + 
      chalk.cyan(`@${username} clicked: `) + 
      chalk.redBright(`${action}`) +
      (action === 'move' ? chalk.yellow(` (move index: ${moveIndex})`) : '')
    );
    
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
      .setColor('#FF5722')
      .setThumbnail(message.author.displayAvatarURL());
    
    // Add the Pokémon to the embed
    team.forEach((pokemon, index) => {
      embed.addFields({
        name: `${index + 1}. ${pokemon.name} (Lv. ${pokemon.level})`,
        value: `Type: ${pokemon.types ? pokemon.types.join('/') : 'Unknown'}\nID: ${pokemon.id}`
      });
    });
    
    // Send the embed
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in team command:', error);
    await message.reply('An error occurred while getting your team. Please try again later.');
  }
}

/**
 * Handle the !profile command
 */
async function handleProfileCommand(message: Message, args: string[]): Promise<void> {
  try {
    let discordId = message.author.id;
    let username = message.author.username;
    
    // Check if a username was specified
    if (args.length >= 2) {
      username = args.slice(1).join(' ');
      // If a username was specified, we need to find the user by username
      const targetUser = await storage.getUserByUsername(username);
      if (!targetUser) {
        await message.reply(`User ${username} not found.`);
        return;
      }
      discordId = targetUser.discordId;
    }
    
    // Get the user from the database
    const user = await storage.getUserByDiscordId(discordId);
    if (!user) {
      await message.reply('User not found. Make sure they are registered!');
      return;
    }

    // Get user's team
    const team = await storage.getUserTeam(user.id);
    
    // Get total number of Pokémon caught
    const totalPokemon = await storage.getPokemonByUserId(user.id).then(pokemon => pokemon.length);
    
    // Create the profile embed
    const embed = new EmbedBuilder()
      .setTitle(`${username}'s Trainer Profile`)
      .setColor('#3F51B5')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: 'Trainer Level', value: `${user.trainerLevel}`, inline: true },
        { name: 'PokéCoins', value: `${user.pokecoins}`, inline: true },
        { name: 'Battle Wins', value: `${user.battleWins}`, inline: true },
        { name: 'Tournament Wins', value: `${user.tournamentWins}`, inline: true },
        { name: 'Pokémon Caught', value: `${user.pokemonCaught}`, inline: true },
        { name: 'NPC Battles Won', value: `${user.npcDefeated}`, inline: true },
        { name: 'Total Pokémon', value: `${totalPokemon}`, inline: true },
        { name: 'Team Size', value: `${team.length}/6`, inline: true }
      );
    
    // Add team preview if the user has Pokémon in their team
    if (team.length > 0) {
      const teamPreview = team.map(p => `${p.name} (Lv. ${p.level})`).join(', ');
      embed.addFields({ name: 'Active Team', value: teamPreview });
    }
    
    // Send the embed
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in profile command:', error);
    await message.reply('An error occurred while getting the profile. Please try again later.');
  }
}

/**
 * Handle the !help command
 */
async function handleHelpCommand(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('Pokémon Bot Commands')
    .setColor('#2196F3')
    .setDescription('Here are the available commands:')
    .addFields(
      { name: '!register', value: 'Register as a trainer to start your journey.' },
      { name: '!catch', value: 'Catch wild Pokémon that appear in the server.' },
      { name: '!team', value: 'View your current Pokémon team.' },
      { name: '!battle [pokemonId]', value: 'Start a battle with your Pokémon. If no ID is provided, your first team member will be used.' },
      { name: '!profile [username]', value: 'View your trainer profile or another trainer\'s profile.' },
      { name: '!dex', value: 'Open the Pokédex console in a DM.' },
      { name: '!create', value: 'Create or customize your trainer avatar.' },
      { name: '!avatar', value: 'Manage your avatar items and appearance.' },
      { name: '!shop', value: 'Visit the shop to buy items and Pokéballs.' },
      { name: '!npc', value: 'Challenge NPC trainers to earn rewards.' },
      { name: '!help', value: 'Display this help message.' }
    )
    .setFooter({ text: 'Made with ❤️ by Dogmail420' });
  
  await message.reply({ embeds: [embed] });
}

/**
 * Handle the !dex command
 */
async function handleDexCommand(message: Message): Promise<void> {
  try {
    // Get the user from the database
    const user = await storage.getUserByDiscordId(message.author.id);
    if (!user) {
      await message.reply('You need to register first! Use `!register` in the welcome channel.');
      return;
    }

    // Create a DM channel with the user
    const dmChannel = await message.author.createDM();
    
    // Create the Pokédex console embed (main interface)
    const dexConsole = new EmbedBuilder()
      .setTitle('🎮 Pokédex Console')
      .setDescription('Your personal Pokémon trainer console. Use the buttons below to navigate.')
      .setColor('#FF0000') // Red color for Pokédex
      .setImage('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png')
      .setFooter({ text: 'Pokédex Console v1.0 | Type "exit" to close' });
    
    // Create user profile section
    const profileSection = new EmbedBuilder()
      .setTitle(`Trainer: ${message.author.username}`)
      .setColor('#4CAF50')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: 'Level', value: `${user.trainerLevel}`, inline: true },
        { name: 'Pokémon', value: `${user.pokemonCaught}`, inline: true },
        { name: 'Battles', value: `${user.battleWins}W/${user.battleWins + user.tournamentWins}L`, inline: true },
        { name: 'NPCs Beaten', value: `${user.npcDefeated}`, inline: true }
      );
    
    // Create avatar section (placeholder for now)
    const avatarSection = new EmbedBuilder()
      .setTitle('Trainer Avatar')
      .setColor('#2196F3')
      .setDescription('Your customized trainer avatar. Use !create to customize it!')
      .setImage(user.avatar || message.author.displayAvatarURL());
    
    // Create battle section
    const battleSection = new EmbedBuilder()
      .setTitle('Battle Interface')
      .setColor('#FF9800')
      .setDescription('Click `NPC Battle` to challenge an NPC trainer or `Spawn` to find wild Pokémon to catch.');
    
    // Send all sections to create the console UI
    await dmChannel.send({ content: '```ansi\n[2;31m╔══════════════════════════════════════════════╗\n║  \u001b[1;37mWelcome to the Pokédex Console              \u001b[0m[2;31m║\n╚══════════════════════════════════════════════╝\u001b[0m\n```' });
    await dmChannel.send({ embeds: [profileSection, avatarSection] });
    await dmChannel.send({ content: '```ansi\n[2;31m╔══════════════════════════════════════════════╗\n║  \u001b[1;37mLive View                                  \u001b[0m[2;31m║\n╚══════════════════════════════════════════════╝\u001b[0m\n```' });
    await dmChannel.send({ embeds: [battleSection] });
    
    // Let the user know in the original channel
    await message.reply('I\'ve sent you a Pokédex console in your DMs!');
    
  } catch (error) {
    console.error('Error in dex command:', error);
    await message.reply('An error occurred while opening the Pokédex console. Please make sure you have DMs enabled.');
  }
}

/**
 * Handle the !create command
 */
async function handleCreateCommand(message: Message, args: string[]): Promise<void> {
  await message.reply('The avatar creation system is coming soon! Stay tuned.');
}

/**
 * Handle the !register command
 */
async function handleRegisterCommand(message: Message): Promise<void> {
  try {
    // Check if user already exists
    const existingUser = await storage.getUserByDiscordId(message.author.id);
    if (existingUser) {
      await message.reply('You are already registered! Use `!profile` to see your profile.');
      return;
    }
    
    // Create a new user
    const user = await storage.createUser({
      username: message.author.username,
      password: 'password123', // Default password, not really used for Discord users
      discordId: message.author.id,
      avatar: message.author.displayAvatarURL(),
    });
    
    // Create a welcome message
    const embed = new EmbedBuilder()
      .setTitle('🎉 Welcome to the Pokémon World!')
      .setColor('#4CAF50')
      .setDescription(`Congratulations ${message.author.username}! You are now registered as a Pokémon trainer.`)
      .addFields(
        { name: 'Next Steps', value: 'Use `!catch` to catch your first Pokémon, then `!team` to view your team, and `!battle` to start battling!' },
        { name: 'Pokédex Console', value: 'Use `!dex` to open your personal Pokédex console in DMs.' }
      )
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: 'Your adventure begins now!' });
    
    // Send the welcome message
    await message.reply({ embeds: [embed] });
    
    // Create an activity
    await storage.createActivity({
      type: 'REGISTER',
      description: `${message.author.username} registered as a new trainer!`,
      timestamp: new Date().toISOString(),
      userId: user.id,
    });
    
  } catch (error) {
    console.error('Error in register command:', error);
    await message.reply('An error occurred while registering. Please try again later.');
  }
}

/**
 * Handle the !avatar command
 */
async function handleAvatarCommand(message: Message, args: string[]): Promise<void> {
  await message.reply('The avatar management system is coming soon! Stay tuned.');
}

/**
 * Handle the !shop command
 */
async function handleShopCommand(message: Message, args: string[]): Promise<void> {
  await message.reply('The shop system is coming soon! Stay tuned.');
}

/**
 * Handle the !npc command
 */
async function handleNpcCommand(message: Message): Promise<void> {
  await message.reply('NPC battles are coming soon! Stay tuned.');
}