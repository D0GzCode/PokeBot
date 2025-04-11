import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-100 flex flex-col items-center justify-center p-4">
      {/* Pokédex-styled container */}
      <div className="pokedex-container max-w-5xl w-full mb-12">
        {/* Pokédex header with lights */}
        <div className="pokedex-header mb-3">
          <h1 className="text-white text-2xl font-bold">POKÉDEX TRAINER SYSTEM</h1>
          <div className="pokedex-lights">
            <div className="pokedex-light pokedex-light-red"></div>
            <div className="pokedex-light pokedex-light-yellow"></div>
            <div className="pokedex-light pokedex-light-green"></div>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="pokedex-inner">
          {/* Welcome section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-pokemon-red rounded-full w-16 h-16 flex items-center justify-center">
                <span className="material-icons text-3xl text-white">catching_pokemon</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-pokemon-blue dark:text-pokemon-lightblue mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              PokéVenture Trainer Hub
            </h1>
            
            {/* Instructions panel */}
            <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg my-4 border-2 border-blue-200 dark:border-blue-800 max-w-md mx-auto">
              <h3 className="font-bold text-blue-800 dark:text-blue-200 flex items-center justify-center">
                <span className="material-icons mr-2">info</span>
                Welcome, Trainer!
              </h3>
              <p className="text-sm mt-1 text-blue-700 dark:text-blue-300">
                This is your Pokémon Discord Bot Dashboard. From here, you can manage your Pokémon team, view statistics, and access Discord commands.
              </p>
            </div>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8">
              Click the button below to access your trainer dashboard
            </p>
            
            <Link href="/dashboard">
              <Button className="bg-pokemon-red hover:bg-red-700 text-white font-medium px-6 py-2 shadow-md transform transition-transform hover:scale-105">
                <span className="material-icons mr-2">dashboard</span>
                Enter Trainer Dashboard
              </Button>
            </Link>
          </div>

          {/* Features section */}
          <div className="pokedex-screen p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-center">
              <span className="material-icons mr-2">stars</span>
              PokéVenture Bot Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="feature-card border-2 border-red-200 dark:border-red-900">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <span className="material-icons text-3xl text-pokemon-red mb-2">catching_pokemon</span>
                    <h2 className="text-xl font-semibold mb-2">Catch Pokémon</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      Catch wild Pokémon in the Discord server and build your collection
                    </p>
                    <div className="feature-description">
                      <p><span className="font-semibold">How it works:</span> Use the <code>/catch</code> command in Discord when wild Pokémon appear. Explore different channels for different Pokémon types.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="feature-card border-2 border-blue-200 dark:border-blue-900">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <span className="material-icons text-3xl text-pokemon-blue mb-2">casino</span>
                    <h2 className="text-xl font-semibold mb-2">Battle Trainers</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      Challenge NPCs and other trainers to exciting Pokémon battles
                    </p>
                    <div className="feature-description">
                      <p><span className="font-semibold">How it works:</span> Use the <code>/battle</code> command followed by a trainer's name to challenge them. Use the dashboard to organize your team before battles.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="feature-card border-2 border-yellow-200 dark:border-yellow-900">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <span className="material-icons text-3xl text-pokemon-yellow mb-2">emoji_events</span>
                    <h2 className="text-xl font-semibold mb-2">Join Tournaments</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      Compete in tournaments to prove you're the very best trainer
                    </p>
                    <div className="feature-description">
                      <p><span className="font-semibold">How it works:</span> Watch for tournament announcements in Discord. Use <code>/tournament join</code> to enter. Check the dashboard for tournament schedules.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Getting started section */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-3 flex items-center">
              <span className="material-icons mr-2 text-green-500">play_circle</span>
              Getting Started
            </h3>
            <ol className="list-decimal ml-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Join our Discord server to interact with the PokéVenture bot</li>
              <li>Use <code>/start</code> in Discord to create your trainer profile</li>
              <li>Catch your first Pokémon with the <code>/catch</code> command</li>
              <li>Use this dashboard to manage your team and view your progress</li>
              <li>Check the "Discord Bot Commands" section on the dashboard for all available commands</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-gray-500 dark:text-gray-400">
        <p>Visit the Discord server to get started with the bot</p>
        <p className="mt-2 text-sm">Made with ❤️ for Pokémon trainers</p>
      </div>
    </div>
  );
};

export default Home;
