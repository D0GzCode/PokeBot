import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-pokemon-red rounded-full w-16 h-16 flex items-center justify-center">
            <span className="material-icons text-3xl text-white">catching_pokemon</span>
          </div>
        </div>
        <h1 className="font-pixel text-3xl text-pokemon-blue dark:text-pokemon-lightblue mb-4">
          PokéVenture
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8">
          Your Pokémon Discord Bot Dashboard
        </p>
        <Link href="/dashboard">
          <Button className="bg-pokemon-red hover:bg-red-700 text-white font-medium px-6 py-2">
            Go to Dashboard
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <Card className="bg-white dark:bg-dark-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <span className="material-icons text-3xl text-pokemon-red mb-2">catching_pokemon</span>
              <h2 className="text-xl font-semibold mb-2">Catch Pokémon</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Catch wild Pokémon in the Discord server and build your collection
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-dark-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <span className="material-icons text-3xl text-pokemon-blue mb-2">casino</span>
              <h2 className="text-xl font-semibold mb-2">Battle Trainers</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Challenge NPCs and other trainers to exciting Pokémon battles
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-dark-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <span className="material-icons text-3xl text-pokemon-yellow mb-2">emoji_events</span>
              <h2 className="text-xl font-semibold mb-2">Join Tournaments</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Compete in tournaments to prove you're the very best trainer
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center text-gray-500 dark:text-gray-400">
        <p>Visit the Discord server to get started with the bot</p>
        <p className="mt-2 text-sm">Made with ❤️ for Pokémon trainers</p>
      </div>
    </div>
  );
};

export default Home;
