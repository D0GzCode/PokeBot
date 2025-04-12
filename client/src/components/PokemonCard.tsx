import React from "react";
import { Pokemon } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Sword } from "lucide-react";

interface PokemonCardProps {
  pokemon?: Pokemon;
  isAddCard?: boolean;
  onClick?: () => void;
  showBattleButton?: boolean;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, isAddCard, onClick, showBattleButton = false }) => {
  const [_, setLocation] = useLocation();
  const getTypeColorClass = (type: string) => {
    const typeColors: Record<string, string> = {
      electric: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
      fire: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
      water: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
      grass: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
      flying: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
      poison: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
      bug: "bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200",
      normal: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
      ground: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
      rock: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
      fighting: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
      psychic: "bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200",
      ghost: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
      ice: "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200",
      dragon: "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200",
      dark: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
      steel: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
      fairy: "bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200",
    };
    
    return typeColors[type.toLowerCase()] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
  };

  if (isAddCard) {
    return (
      <div 
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
        onClick={onClick}
      >
        <span className="material-icons text-gray-400 mb-1">add_circle</span>
        <p className="text-xs text-gray-500 dark:text-gray-400">Add Pokémon</p>
      </div>
    );
  }

  if (!pokemon) return null;

  const handleBattleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pokemon) {
      setLocation(`/battle/${pokemon.id}`);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-3 relative">
      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-pokemon-red text-white text-xs flex items-center justify-center font-medium">
        {pokemon.level}
      </div>
      <img 
        src={pokemon.imageUrl} 
        alt={pokemon.name} 
        className="w-16 h-16 mx-auto" 
      />
      <div className="mt-2 text-center">
        <p className="font-medium text-sm">{pokemon.name}</p>
        <div className="flex justify-center mt-1 flex-wrap gap-1">
          {pokemon.types.map((type, index) => (
            <span key={index} className={`text-xs py-0.5 px-2 ${getTypeColorClass(type)} rounded-full`}>
              {type}
            </span>
          ))}
        </div>
        
        {showBattleButton && (
          <Button 
            size="sm" 
            className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white"
            onClick={handleBattleClick}
          >
            <Sword className="h-4 w-4 mr-1" /> Battle
          </Button>
        )}
      </div>
    </div>
  );
};

export default PokemonCard;
