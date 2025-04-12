import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BattlePokemon, BattleMove, BattleState } from "@/lib/battleTypes";

interface BattleInterfaceProps {
  battleState: BattleState;
  onMoveSelect: (moveIndex: number) => Promise<void>;
  onFlee: () => Promise<void>;
  isLoading: boolean;
}

export default function BattleInterface({ 
  battleState, 
  onMoveSelect, 
  onFlee,
  isLoading 
}: BattleInterfaceProps) {
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [animateOpponentDamage, setAnimateOpponentDamage] = useState(false);
  const [animateUserDamage, setAnimateUserDamage] = useState(false);
  const [battleMessages, setBattleMessages] = useState<string[]>([]);
  
  // Calculate HP percentages
  const userHpPercent = (battleState.userPokemon.currentHp / battleState.userPokemon.maxHp) * 100;
  const opponentHpPercent = (battleState.opponentPokemon.currentHp / battleState.opponentPokemon.maxHp) * 100;

  // Determine HP color based on percentage
  const getUserHpColor = (percent: number) => {
    if (percent > 50) return "bg-green-500";
    if (percent > 20) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Handle move selection
  const handleMoveSelect = async (moveIndex: number) => {
    if (isLoading || !battleState.isUserTurn) return;
    
    setSelectedMove(moveIndex);
    setAnimateOpponentDamage(true);
    
    setTimeout(() => {
      setAnimateOpponentDamage(false);
    }, 500);
    
    await onMoveSelect(moveIndex);
  };

  // Track battle messages
  useEffect(() => {
    setBattleMessages(battleState.messages.slice(-4)); // Show only last 4 messages
    
    // If not user's turn, animate damage to user Pokemon
    if (!battleState.isUserTurn && battleState.battleStatus === 'active') {
      setTimeout(() => {
        setAnimateUserDamage(true);
        setTimeout(() => {
          setAnimateUserDamage(false);
        }, 500);
      }, 800);
    }
  }, [battleState.messages, battleState.isUserTurn, battleState.battleStatus]);

  // Get type color
  const getTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      normal: "bg-gray-400",
      fire: "bg-red-500",
      water: "bg-blue-500",
      electric: "bg-yellow-400",
      grass: "bg-green-500",
      ice: "bg-blue-200",
      fighting: "bg-red-700",
      poison: "bg-purple-500",
      ground: "bg-yellow-700",
      flying: "bg-indigo-300",
      psychic: "bg-pink-500",
      bug: "bg-lime-500",
      rock: "bg-yellow-800",
      ghost: "bg-purple-700",
      dragon: "bg-indigo-700",
      dark: "bg-gray-700",
      steel: "bg-gray-500",
      fairy: "bg-pink-300"
    };
    
    return typeColors[type] || "bg-gray-500";
  };

  return (
    <div className="flex flex-col items-center w-full gap-4 p-4">
      {/* Battle background container */}
      <div className="w-full max-w-4xl bg-gradient-to-b from-blue-50 to-green-100 rounded-xl border-4 border-red-600 p-4 relative">
        {/* Status indicator light */}
        <div className={cn(
          "absolute top-3 left-3 w-4 h-4 rounded-full animate-pulse",
          battleState.battleStatus === 'active' ? "bg-green-500" : 
          battleState.battleStatus === 'userWon' ? "bg-blue-500" : 
          "bg-red-500"
        )}></div>
        
        {/* Battle outcome message */}
        {battleState.battleStatus !== 'active' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-white/80 px-6 py-3 rounded-lg text-xl font-bold animate-pulse">
            {battleState.battleStatus === 'userWon' ? 'Victory!' : 
             battleState.battleStatus === 'opponentWon' ? 'Defeat!' : 'Escaped!'}
          </div>
        )}
        
        {/* Opponent (top screen) */}
        <div className="mb-8 flex items-center justify-between">
          <div className="bg-white rounded-lg p-2 shadow-md w-full">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-lg font-semibold">{battleState.opponentPokemon.name}</h3>
                <div className="flex space-x-1 mt-1">
                  {battleState.opponentPokemon.types.map((type, idx) => (
                    <Badge key={idx} className={`${getTypeColor(type)} text-white`}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Lv {battleState.opponentPokemon.level}</div>
                <div className="text-sm">
                  HP: {battleState.opponentPokemon.currentHp}/{battleState.opponentPokemon.maxHp}
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Progress 
                value={opponentHpPercent} 
                className={cn(
                  "h-2 transition-all duration-300",
                  getUserHpColor(opponentHpPercent),
                  animateOpponentDamage && "animate-pulse"
                )} 
              />
            </div>
          </div>
          
          <div className={cn(
            "relative ml-4 w-24 h-24 flex-shrink-0 transition-all",
            animateOpponentDamage && "animate-shake"
          )}>
            <img
              src={battleState.opponentPokemon.imageUrlFront}
              alt={battleState.opponentPokemon.name}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        
        {/* User Pokemon (bottom screen) */}
        <div className="mt-8 flex items-center justify-between">
          <div className={cn(
            "relative mr-4 w-24 h-24 flex-shrink-0 transition-all",
            animateUserDamage && "animate-shake"
          )}>
            <img
              src={battleState.userPokemon.imageUrlBack}
              alt={battleState.userPokemon.name}
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="bg-white rounded-lg p-2 shadow-md w-full">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-lg font-semibold">{battleState.userPokemon.name}</h3>
                <div className="flex space-x-1 mt-1">
                  {battleState.userPokemon.types.map((type, idx) => (
                    <Badge key={idx} className={`${getTypeColor(type)} text-white`}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Lv {battleState.userPokemon.level}</div>
                <div className="text-sm">
                  HP: {battleState.userPokemon.currentHp}/{battleState.userPokemon.maxHp}
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Progress 
                value={userHpPercent} 
                className={cn(
                  "h-2 transition-all duration-300",
                  getUserHpColor(userHpPercent),
                  animateUserDamage && "animate-pulse"
                )} 
              />
            </div>
          </div>
        </div>
        
        {/* Battle messages */}
        <div className="mt-4 bg-white border-2 border-gray-300 rounded-lg p-3 h-28 overflow-y-auto">
          {battleMessages.map((message, idx) => (
            <p key={idx} className="mb-1 animate-fadeIn">
              {message}
            </p>
          ))}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="w-full max-w-4xl grid grid-cols-2 gap-4">
        {/* Battle controls */}
        <Card className="border-4 border-red-600">
          <CardContent className="p-4">
            <h3 className="font-bold text-lg mb-3">Battle Controls</h3>
            <div className="grid grid-cols-2 gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled={isLoading || battleState.battleStatus !== 'active'}
                    >
                      Items
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Use items (not implemented yet)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled={isLoading || battleState.battleStatus !== 'active'}
                    >
                      Pokémon
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Switch Pokémon (not implemented yet)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button 
                className="w-full col-span-2" 
                variant="destructive"
                onClick={onFlee}
                disabled={isLoading || !battleState.isUserTurn || battleState.battleStatus !== 'active'}
              >
                Run Away
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Moves */}
        <Card className="border-4 border-red-600">
          <CardContent className="p-4">
            <h3 className="font-bold text-lg mb-3">Moves</h3>
            <div className="grid grid-cols-2 gap-3">
              {battleState.userPokemon.moves.map((move, idx) => (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        className={cn(
                          "w-full",
                          getTypeColor(move.type),
                          "text-white hover:brightness-110",
                          selectedMove === idx && "ring-2 ring-white"
                        )}
                        disabled={
                          isLoading || 
                          !battleState.isUserTurn || 
                          move.currentPp <= 0 || 
                          battleState.battleStatus !== 'active'
                        }
                        onClick={() => handleMoveSelect(idx)}
                      >
                        {move.name}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div>
                        <p>Type: {move.type.charAt(0).toUpperCase() + move.type.slice(1)}</p>
                        <p>Power: {move.power}</p>
                        <p>PP: {move.currentPp}/{move.pp}</p>
                        <p>Accuracy: {move.accuracy}%</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}