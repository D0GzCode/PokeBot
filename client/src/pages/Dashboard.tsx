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
    <DashboardLayout title="Dashboard" user={user}>
      {/* Trainer Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          value={isLoadingUser ? "Loading..." : user?.pokecoins.toLocaleString() || 0}
        />
      </div>

      {/* Active Pokémon Team */}
      <div className="bg-white dark:bg-dark-200 rounded-lg shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-poppins font-semibold">Your Active Team</h2>
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
                <PokemonCard key={pokemon.id} pokemon={pokemon} />
              ))}
              <PokemonCard isAddCard onClick={handleAddPokemon} />
            </>
          )}
        </div>
      </div>

      {/* Command & Channel Guides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {commandSections?.map((section) => (
          <div key={section.id} className="bg-white dark:bg-dark-200 rounded-lg shadow-sm p-5">
            <div className="flex items-center mb-4">
              <span className={`material-icons ${section.iconColor} mr-2`}>{section.icon}</span>
              <h2 className="text-lg font-poppins font-semibold">{section.title}</h2>
            </div>
            
            <div className="space-y-3">
              {section.commands.map((command) => (
                <CommandGuide key={command.id} command={command} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity & Upcoming Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-dark-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-poppins font-semibold">Recent Activity</h2>
            <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {activities?.slice(0, 4).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
        
        {/* Upcoming Events */}
        <div className="bg-white dark:bg-dark-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-poppins font-semibold">Upcoming Events</h2>
            <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              View Calendar
            </button>
          </div>
          
          <div className="space-y-4">
            {events?.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
