import React from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatCard from "@/components/StatCard";
import PokemonCard from "@/components/PokemonCard";
import ActivityItem from "@/components/ActivityItem";
import EventCard from "@/components/EventCard";
import CommandGuide from "@/components/CommandGuide";
import { useUserData, useActivityData, useEventsData, useCommandSections } from "@/hooks/usePokemonData";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Help tooltip component for adding context to UI elements
const HelpTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="help-tooltip">
    <span className="material-icons text-xs">help_outline</span>
    <div className="help-tooltip-content">{text}</div>
  </div>
);

const Dashboard: React.FC = () => {
  const { data: user, isLoading: isLoadingUser } = useUserData();
  const { data: activities } = useActivityData();
  const { data: events } = useEventsData();
  const { data: commandSections } = useCommandSections();
  const { toast } = useToast();

  const handleEditTeam = () => {
    toast({
      title: "Edit Team",
      description: "Team editing feature coming soon!",
    });
  };

  const handleAddPokemon = () => {
    toast({
      title: "Add Pokémon",
      description: "Pokémon addition feature coming soon!",
    });
  };

  return (
    <DashboardLayout title="Pokémon Trainer Dashboard" user={user}>
      <div className="pokedex-container mb-6">
        <div className="pokedex-header mb-3">
          <h1 className="text-white text-2xl font-bold">POKÉDEX TRAINER CONSOLE</h1>
          <div className="pokedex-lights">
            <div className="pokedex-light pokedex-light-red"></div>
            <div className="pokedex-light pokedex-light-yellow"></div>
            <div className="pokedex-light pokedex-light-green"></div>
          </div>
        </div>
        
        <div className="pokedex-inner">
          {/* Help Instructions Panel */}
          <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg mb-4 border-2 border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-blue-800 dark:text-blue-200 flex items-center">
              <span className="material-icons mr-2">info</span>
              PokéTrainer Dashboard Guide
            </h3>
            <p className="text-sm mt-1 text-blue-700 dark:text-blue-300">
              Welcome to your Pokémon Trainer Dashboard! Here you can:
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>View your trainer statistics and achievements</li>
                <li>Manage your active Pokémon team</li>
                <li>Check upcoming events and recent activity</li>
                <li>Access Discord bot commands and guides</li>
              </ul>
            </p>
          </div>

          {/* Trainer Stats Overview */}
          <div className="pokedex-screen mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center">
                <span className="material-icons mr-2">bar_chart</span>
                Trainer Statistics
                <HelpTooltip text="View your achievements and progress as a Pokémon trainer. These stats update automatically as you interact with the Discord bot." />
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                icon="catching_pokemon"
                iconBgColor="bg-blue-100 dark:bg-blue-900"
                iconTextColor="text-pokemon-blue dark:text-pokemon-lightblue"
                label="Pokémon Caught"
                value={isLoadingUser ? "Loading..." : user?.pokemonCaught || 0}
              />
              <StatCard
                icon="military_tech"
                iconBgColor="bg-red-100 dark:bg-red-900"
                iconTextColor="text-pokemon-red"
                label="Battle Wins"
                value={isLoadingUser ? "Loading..." : user?.battleWins || 0}
              />
              <StatCard
                icon="emoji_events"
                iconBgColor="bg-yellow-100 dark:bg-yellow-900"
                iconTextColor="text-pokemon-yellow"
                label="Tournament Wins"
                value={isLoadingUser ? "Loading..." : user?.tournamentWins || 0}
              />
              <StatCard
                icon="payments"
                iconBgColor="bg-green-100 dark:bg-green-900"
                iconTextColor="text-pokemon-green"
                label="PokéCoins"
                value={isLoadingUser ? "Loading..." : user?.pokecoins?.toLocaleString() || 0}
              />
            </div>
          </div>

          {/* Active Pokémon Team */}
          <div className="feature-card mb-6">
            <div className="feature-title">
              <span className="material-icons text-pokemon-red">groups</span>
              Your Active Team
              <HelpTooltip text="This is your current active Pokémon team. You can battle with these Pokémon on Discord. Edit your team or add new Pokémon using the controls." />
            </div>
            <div className="flex items-center justify-end mb-4">
              <Button 
                onClick={handleEditTeam}
                className="text-sm px-3 py-1 bg-pokemon-red hover:bg-red-600 text-white"
              >
                <span className="material-icons text-sm mr-1">edit</span>
                Edit Team
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {isLoadingUser ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-dark-300 rounded-lg p-3 animate-pulse h-28"></div>
                ))
              ) : (
                <>
                  {user?.team.map((pokemon) => (
                    <PokemonCard key={pokemon.id} pokemon={pokemon} showBattleButton={true} />
                  ))}
                  <PokemonCard isAddCard onClick={handleAddPokemon} />
                </>
              )}
            </div>
            <div className="feature-description mt-3">
              <p><span className="font-semibold">How to use:</span> Click on a Pokémon to view details. Use the "+" card to add new Pokémon to your team. Your active team will be used in battles on Discord.</p>
            </div>
          </div>

          {/* Command & Channel Guides */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <h2 className="text-lg font-bold">
                <span className="material-icons mr-2 text-purple-600">code</span>
                Discord Bot Commands
                <HelpTooltip text="These commands can be used in Discord to interact with the Pokémon bot. Copy and paste them into your Discord server." />
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {commandSections?.map((section) => (
                <div key={section.id} className="feature-card">
                  <div className="feature-title">
                    <span className={`material-icons ${section.iconColor}`}>{section.icon}</span>
                    {section.title}
                  </div>
                  
                  <div className="space-y-3">
                    {section.commands.map((command) => (
                      <CommandGuide key={command.id} command={command} />
                    ))}
                  </div>
                  <div className="feature-description mt-3">
                    <p><span className="font-semibold">How to use:</span> Type these commands in your Discord server to perform various actions with the Pokémon bot.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity & Upcoming Events */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="feature-card">
              <div className="feature-title">
                <span className="material-icons text-blue-500">history</span>
                Recent Activity
                <HelpTooltip text="Your recent interactions with the Pokémon bot, including catches, battles, and other events." />
              </div>
              <div className="flex items-center justify-end mb-4">
                <button className="pokedex-button">
                  <span className="material-icons text-xs mr-1">visibility</span>
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {activities?.slice(0, 4).map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
              <div className="feature-description mt-3">
                <p><span className="font-semibold">Activity Log:</span> This shows your recent interactions with the Pokémon bot on Discord. Check here to see your progress and achievements.</p>
              </div>
            </div>
            
            {/* Upcoming Events */}
            <div className="feature-card">
              <div className="feature-title">
                <span className="material-icons text-green-500">event</span>
                Upcoming Events
                <HelpTooltip text="Special events and tournaments scheduled in your Discord server. Don't miss out on these opportunities!" />
              </div>
              <div className="flex items-center justify-end mb-4">
                <button className="pokedex-button">
                  <span className="material-icons text-xs mr-1">calendar_today</span>
                  View Calendar
                </button>
              </div>
              
              <div className="space-y-4">
                {events?.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              <div className="feature-description mt-3">
                <p><span className="font-semibold">Event Schedule:</span> Upcoming tournaments and special events in your Discord server. Mark your calendar and prepare your team!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
