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
  Message
} from 'discord.js';
import { Server } from 'http';
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
  NPC: '!npc',        // Challenge NPC trainers
  DMS: '!dms'       // Check DM settings
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
    // DMs check command
    else if (content === COMMANDS.DMS) {
      try {
        const dmChannel = await message.author.createDM();
        await dmChannel.send("✅ Your DMs are enabled! You can receive messages from me.");
        await message.reply("I've sent you a test message. If you received it, your DMs are properly enabled!");
      } catch (error) {
        await message.reply("❌ I couldn't send you a DM. Please enable direct messages in your Discord privacy settings:\n1. Right-click the server name\n2. Click 'Privacy Settings'\n3. Enable 'Direct Messages'");
      }
    } else if (content === '!del -1') {
      // Create confirmation buttons
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_delete_account')
            .setLabel('Yes, Delete My Account')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_delete_account')
            .setLabel('No, Keep My Account')
            .setStyle(ButtonStyle.Secondary)
        );

      await message.reply({
        content: '⚠️ **WARNING**: Are you sure you want to delete your account?\nThis will permanently delete all your data including:\n- Your trainer profile\n- All your Pokémon\n- Battle history\n- Items and currency\n\nThis action cannot be undone!',
        components: [row]
      });
    } else if (content === '!del -all' && message.member?.permissions.has('Administrator')) {
      // Create confirmation buttons for server-wide deletion
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_delete_all')
            .setLabel('Yes, Delete All Data')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_delete_all')
            .setLabel('No, Keep All Data')
            .setStyle(ButtonStyle.Secondary)
        );

      await message.reply({
        content: '⚠️ **CRITICAL WARNING**: Are you sure you want to delete ALL user data from the server?\nThis will permanently delete:\n- All trainer profiles\n- All Pokémon data\n- All battle history\n- All items and currency\n\nThis action cannot be undone and requires administrator permissions!',
        components: [row]
      });
    } else if (content === '!del -all' && !message.member?.permissions.has('Administrator')) {
      await message.reply('❌ You need administrator permissions to use this command.');
    }
  });

  // Handle button interactions
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const actionParts = interaction.customId.split('_');
    const action = actionParts[0];

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
      (action === 'move' ? chalk.yellow(` (move index: ${actionParts[2]})`) : '')
    );

    // Battle actions
    if (action === 'move') {
      await handleMoveButton(interaction, actionParts[1], parseInt(actionParts[2]));
    } else if (action === 'flee') {
      await handleFleeButton(interaction, actionParts[1]);
    }
    // Pokédex console actions
    else if (action === 'dex') {
      const dexAction = actionParts[1];

      switch (dexAction) {
        case 'npc_battle':
          await handleDexNpcBattleButton(interaction);
          break;
        case 'spawn':
          await handleDexSpawnButton(interaction);
          break;
        case 'inventory':
          await handleDexInventoryButton(interaction);
          break;
        case 'shop':
          await handleDexShopButton(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown Pokédex action', ephemeral: true });
      }
    } else if (action === 'confirm_delete_account') {
      await handleDeleteAccount(interaction);
    } else if (action === 'cancel_delete_account') {
      await interaction.reply({ content: 'Account deletion canceled.', ephemeral: true });
    } else if (action === 'confirm_delete_all') {
      await handleDeleteAllData(interaction);
    } else if (action === 'cancel_delete_all') {
      await interaction.reply({ content: 'Server-wide data deletion canceled.', ephemeral: true });
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
      { name: '!help', value: 'Display this help message.' },
      { name: '!dms', value: 'Check if your DMs are enabled for the bot.' },
      { name: '!del -1', value: 'Delete your account (irreversible).' },
      { name: '!del -all', value: 'Delete all server data (admin only, irreversible).' }
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

    // Get user's team
    const team = await storage.getUserTeam(user.id);

    // Create a DM channel with the user
    const dmChannel = await message.author.createDM();

    // Pokédex Header with Red Border
    const headerBorder = '```ansi\n[2;31m' + 
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n' +
      '┃  [1;37mPOKéDEX TERMINAL v1.0                                 [0m[2;31m┃\n' +
      '┃  [1;34mConnected to Trainer: [1;33m' + message.author.username.padEnd(31, ' ') + '[0m[2;31m┃\n' +
      '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛' +
      '\u001b[0m\n```';

    // User Profile Section (Top Left)
    const profileSection = '```ansi\n[2;31m' +
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ' +
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n' +
      '┃  [1;37mTRAINER PROFILE              [0m[2;31m┃ ' +
      '┃  [1;37mTRAINER AVATAR               [0m[2;31m┃\n' +
      '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ ' +
      '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n' +
      '┃  [1;33mName:  [1;37m' + message.author.username.padEnd(22, ' ') + '[0m[2;31m┃ ' +
      '┃  [1;34m/\\[1;37m_[1;34m/\\                         [0m[2;31m┃\n' +
      '┃  [1;33mLevel: [1;32m' + (user.trainerLevel || 1).toString().padEnd(22, ' ') + '[0m[2;31m┃ ' +
      '┃  [1;34m|  o o  |                      [0m[2;31m┃\n' +
      ';

    // Live View Section (Bottom)
    const liveViewHeader = '```ansi\n[2;31m' +
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n' +
      '┃  [1;37mLIVE VIEW                                             [0m[2;31m┃\n' +
      '┣━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n' +
      '┃  [1;33mCHANNEL FEED      [0m[2;31m┃  [1;33mBATTLE SCREEN                   [0m[2;31m┃\n' +
      '┣━━━━━━━━━━━━━━━━━━━┫━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n' +
      '\u001b[0m```';

    // Channel Feed (recent messages)
    const channelFeed = '```ansi\n[2;31m' +
      '┃ [1;37m> System: Welcome   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m> Use !help         [0m[2;31m┃             [1;33mClick buttons:          [0m[2;31m┃\n' +
      '┃ [1;37m> For commands      [0m[2;31m┃                                    ┃\n' +
      '┃ [1;30m-------------------[0m[2;31m┃             [1;32m┏━━━━━━━━━━━┓           [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃             [1;32m┃ NPC BATTLE ┃           [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃             [1;32m┗━━━━━━━━━━━┛           [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃             [1;34m┏━━━━━━━━━━━┓           [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃             [1;34m┃   SPAWN   ┃           [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃             [1;34m┗━━━━━━━━━━━┛           [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;36m> Type to chat     [0m[2;31m┃                                    ┃\n' +
      '┗━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n' +
      '\u001b[0m```';

    // Footer Section
    const footer = '```ansi\n[2;31m' +
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n' +
      '┃  [1;33mCOMMAND LINE: [1;37mType "help" for commands, "exit" to close    [0m[2;31m┃\n' +
      '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n' +
      '\u001b[0m```';

    // Send the console interface sections
    await dmChannel.send(headerBorder);
    await dmChannel.send(profileSection);
    await dmChannel.send(liveViewHeader);
    await dmChannel.send(channelFeed);
    await dmChannel.send(footer);

    // Create action row with buttons
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('dex_npc_battle')
          .setLabel('NPC BATTLE')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('dex_spawn')
          .setLabel('SPAWN POKÉMON')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('dex_inventory')
          .setLabel('INVENTORY')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('dex_shop')
          .setLabel('SHOP')
          .setStyle(ButtonStyle.Secondary)
      );

    // Send the buttons
    await dmChannel.send({ components: [actionRow] });

    // Let the user know in the original channel
    await message.reply('I\'ve sent you a Pokédex console in your DMs!');

  } catch (error) {
    console.error('Error in handleDexCommand:', error);
    const errorMessage = error.code === 50007 
      ? "I couldn't send you a DM! Please enable direct messages in your Discord privacy settings:\n1. Right-click the server name\n2. Click 'Privacy Settings'\n3. Enable 'Direct Messages'\n\nThen use `!dms` to verify DMs are working before trying `!dex` again."
      : 'An unexpected error occurred while opening the Pokédex console. Please try again later.';
    await message.reply(errorMessage);
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

    // Create a new user with console URL
    const consoleUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/console/${message.author.id}`;
    const user = await storage.createUser({
      username: message.author.username,
      password: 'password123', // Default password, not really used for Discord users
      discordId: message.author.id,
      avatar: message.author.displayAvatarURL(),
      consoleUrl: consoleUrl,
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

/**
 * Handle the Pokédex NPC Battle button interaction
 */
async function handleDexNpcBattleButton(interaction: ButtonInteraction): Promise<void> {
  try {
    // Get the user data
    const user = await storage.getUserByDiscordId(interaction.user.id);
    if (!user) {
      await interaction.reply({ content: 'User not found!', ephemeral: true });
      return;
    }

    // Get the user's team
    const team = await storage.getUserTeam(user.id);
    if (team.length === 0) {
      await interaction.reply({ content: 'You don\'t have any Pokémon in your team! Catch a Pokémon first.', ephemeral: true });
      return;
    }

    // Update the battle screen section in the Pokédex console
    const battleScreenContent = '```ansi\n[2;31m' +
      '┃ [1;37m> Starting NPC Battle [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m> Preparing Trainer   [0m[2;31m┃            [1;33mBattle Starting          [0m[2;31m┃\n' +
      '┃ [1;37m> Challenge...        [0m[2;31m┃                                    ┃\n' +
      '┃ [1;30m-------------------[0m[2;31m┃               [1;34m/\\___/\\             [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃               [1;34m|  -  |             [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃               [1;34m \\_. _/             [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃       [1;31mVS[0m[2;31m                         ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃               [1;32m/\\___/\\             [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃               [1;32m|o   o|             [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃               [1;32m\\_www_/             [0m[2;31m┃\n' +
      '┃ [1;36m> Starting Battle   [0m[2;31m┃                                    ┃\n' +
      '┗━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n' +
      '\u001b[0m```';

    // Send the updated battle screen
    await interaction.reply({ content: battleScreenContent, ephemeral: false });

    // Wait 3 seconds to simulate loading
    setTimeout(async () => {
      // Create a battle initialization message
      await interaction.followUp({ 
        content: "NPC Battle initiated! Starting a real battle in the server...", 
        ephemeral: false 
      });

      // Send the message to the user's DM
      const dmChannel = await interaction.user.createDM();
      await dmChannel.send("The battle will continue in the server. Please check your server for the battle!");

      // Now we could redirect to a real battle in the server
      // But for now we'll just end with a message
      await interaction.followUp({ 
        content: "This feature is under development. The battle system will be fully integrated soon!", 
        ephemeral: false 
      });
    }, 3000);
  } catch (error) {
    console.error('Error in Pokédex NPC Battle button handler:', error);
    await interaction.reply({ content: 'An error occurred. Please try again later.', ephemeral: true });
  }
}

/**
 * Handle the Pokédex Spawn button interaction
 */
async function handleDexSpawnButton(interaction: ButtonInteraction): Promise<void> {
  try {
    // Get the user data
    const user = await storage.getUserByDiscordId(interaction.user.id);
    if (!user) {
      await interaction.reply({ content: 'User not found!', ephemeral: true });
      return;
    }

    // Update the battle screen section to show spawning animation
    const spawnScreenContent = '```ansi\n[2;31m' +
      '┃ [1;37m> Searching for wild  [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m> Pokémon...          [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m> Stand by...         [0m[2;31m┃                                    ┃\n' +
      '┃ [1;30m-------------------[0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃            [1;32m/\\[1;37m_[1;32m/\\                 [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃            [1;32m(o . o)                [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃            [1;32m>  Y  <                [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃       [1;33m⚠ Wild Pokémon ⚠          [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃          [1;33mApproaching!            [0m[2;31m┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;37m                   [0m[2;31m┃                                    ┃\n' +
      '┃ [1;36m> Searching...      [0m[2;31m┃                                    ┃\n' +
      '┗━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n' +
      '\u001b[0m```';

    // Send the updated spawn screen
    await interaction.reply({ content: spawnScreenContent, ephemeral: false });

    // Wait 3 seconds to simulate loading
    setTimeout(async () => {
      // Create an encounter result with a random Pokémon
      const randomPokemonId = Math.floor(Math.random() * 151) + 1; // Gen 1 Pokémon

      // Create buttons for catching
      const pokeBallsRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('catch_pokeball')
            .setLabel('Poké Ball')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('catch_greatball')
            .setLabel('Great Ball')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('catch_ultraball')
            .setLabel('Ultra Ball')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('catch_flee')
            .setLabel('Run Away')
            .setStyle(ButtonStyle.Secondary)
        );

      // Send the encounter message
      await interaction.followUp({ 
        content: `A wild Pokémon appeared! Use the buttons to throw Poké Balls.`, 
        components: [pokeBallsRow],
        ephemeral: false 
      });

      // Send more info about the spawn feature
      await interaction.followUp({ 
        content: "The full spawn and catch system will be implemented soon! You'll be able to battle and catch wild Pokémon directly in Discord.",
        ephemeral: false 
      });
    }, 3000);
  } catch (error) {
    console.error('Error in Pokédex Spawn button handler:', error);
    await interaction.reply({ content: 'An error occurred. Please try again later.', ephemeral: true });
  }
}

/**
 * Handle the Pokédex Inventory button interaction
 */
async function handleDexInventoryButton(interaction: ButtonInteraction): Promise<void> {
  try {
    // Get the user data
    const user = await storage.getUserByDiscordId(interaction.user.id);
    if (!user) {
      await interaction.reply({ content: 'User not found!', ephemeral: true });
      return;
    }

    // Create an inventory display
    const inventoryContent = '```ansi\n[2;31m' +
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n' +
      '┃  [1;37mINVENTORY                                           [0m[2;31m┃\n' +
      '┣━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n' +
      '┃  [1;33mITEM CATEGORIES     [0m[2;31m┃  [1;33mITEMS                          [0m[2;31m┃\n' +
      '┣━━━━━━━━━━━━━━━━━━━┫━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n' +
      '┃ [1;32m> Poké Balls        [0m[2;31m┃  [1;37mPoké Ball x3                    [0m[2;31m┃\n' +
      '┃ [1;30m> Potions           [0m[2;31m┃  [1;37mGreat Ball x1                   [0m[2;31m┃\n' +
      '┃ [1;30m> Battle Items      [0m[2;31m┃  [1;37mUltra Ball x0                   [0m[2;31m┃\n' +
      '┃ [1;30m> Key Items         [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃ [1;30m> TMs               [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃ [1;36m> Select a category  [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┗━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n' +
      '\u001b[0m```';

    // Create buttons for inventory navigation
    const inventoryButtonsRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('inventory_pokeballs')
          .setLabel('Poké Balls')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('inventory_potions')
          .setLabel('Potions')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('inventory_battle')
          .setLabel('Battle Items')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('inventory_back')
          .setLabel('Back to Main')
          .setStyle(ButtonStyle.Secondary)
      );

    // Send the inventory display
    await interaction.reply({ 
      content: inventoryContent, 
      components: [inventoryButtonsRow],
      ephemeral: false 
    });

    // Send more info about the inventory feature
    await interaction.followUp({ 
      content: "The full inventory system will be implemented soon! You'll be able to manage and use your items directly from the console.",
      ephemeral: false 
    });
  } catch (error) {
    console.error('Error in Pokédex Inventory button handler:', error);
    await interaction.reply({ content: 'An error occurred. Please try again later.', ephemeral: true });
  }
}

/**
 * Handle the Pokédex Shop button interaction
 */
async function handleDexShopButton(interaction: ButtonInteraction): Promise<void> {
  try {
    // Get the user data
    const user = await storage.getUserByDiscordId(interaction.user.id);
    if (!user) {
      await interaction.reply({ content: 'User not found!', ephemeral: true });
      return;
    }

    // Create a shop display
    const shopContent = '```ansi\n[2;31m' +
      '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n' +
      '┃  [1;37mPOKé MART                                           [0m[2;31m┃\n' +
      '┣━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n' +
      '┃  [1;33mSHOP CATEGORIES     [0m[2;31m┃  [1;33mITEMS FOR SALE                 [0m[2;31m┃\n' +
      '┣━━━━━━━━━━━━━━━━━━━┫━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n' +
      '┃ [1;32m> Poké Balls        [0m[2;31m┃  [1;37mPoké Ball - 200 coins           [0m[2;31m┃\n' +
      '┃ [1;30m> Potions           [0m[2;31m┃  [1;37mGreat Ball - 600 coins          [0m[2;31m┃\n' +
      '┃ [1;30m> Battle Items      [0m[2;31m┃  [1;37mUltra Ball - 1200 coins         [0m[2;31m┃\n' +
      '┃ [1;30m> Clothing          [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃  [1;33mYour Coins: ' + (user.pokecoins || 0).toString().padEnd(18, ' ') + '[0m[2;31m┃\n' +
      '┃                    [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┃ [1;36m> Select a category  [0m[2;31m┃                                    [0m[2;31m┃\n' +
      '┗━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n' +
      '\u001b[0m