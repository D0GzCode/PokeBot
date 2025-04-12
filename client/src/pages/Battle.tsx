import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import BattleInterface from "@/components/BattleInterface";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useUserData } from "@/hooks/usePokemonData";
import type { BattleState } from "@/lib/battleTypes";

export default function Battle() {
  const [battleId, setBattleId] = useState<string | null>(null);
  const [_, params] = useRoute("/battle/:pokemonId");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userData } = useUserData();

  // Get pokemonId from route params
  const pokemonId = params?.pokemonId ? parseInt(params.pokemonId) : null;

  // Fetch battle state
  const { 
    data: battleState, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<BattleState>({
    queryKey: ['/api/battles', battleId],
    enabled: !!battleId,
    refetchInterval: (data) => data?.isUserTurn ? false : 1000, // Poll when it's not user's turn
  });

  // Start battle mutation
  const startBattleMutation = useMutation({
    mutationFn: async () => {
      if (!pokemonId) throw new Error("No Pokémon selected for battle");
      const response = await apiRequest(`/api/battles/start/${pokemonId}`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data) => {
      setBattleId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/battles', data.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error starting battle",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Execute move mutation
  const executeMoveQuery = useMutation({
    mutationFn: async ({ moveIndex }: { moveIndex: number }) => {
      if (!battleId) throw new Error("No active battle");
      const response = await apiRequest(`/api/battles/${battleId}/move/${moveIndex}`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/battles', battleId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error executing move",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Flee battle mutation
  const fleeBattleQuery = useMutation({
    mutationFn: async () => {
      if (!battleId) throw new Error("No active battle");
      const response = await apiRequest(`/api/battles/${battleId}/flee`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/battles', battleId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error fleeing battle",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Start battle when component mounts
  useEffect(() => {
    if (pokemonId && !battleId) {
      startBattleMutation.mutate();
    }
  }, [pokemonId]);

  // Handle move selection
  const handleMoveSelect = async (moveIndex: number) => {
    await executeMoveQuery.mutateAsync({ moveIndex });
  };

  // Handle flee action
  const handleFlee = async () => {
    await fleeBattleQuery.mutateAsync();
  };

  // Handle battle end
  const handleEndBattle = () => {
    if (battleId) {
      // End the battle on the server
      apiRequest(`/api/battles/${battleId}/end`, {
        method: "POST",
      }).catch(console.error);
    }
    
    // Return to dashboard
    setLocation("/dashboard");
  };

  // Loading state
  if (!battleState && (isLoading || startBattleMutation.isPending)) {
    return (
      <DashboardLayout title="Pokémon Battle" user={userData}>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="h-16 w-16 animate-spin text-red-600 mb-4" />
          <p className="text-lg">Initializing battle...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || !pokemonId) {
    return (
      <DashboardLayout title="Pokémon Battle" user={userData}>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Battle Error
            </h2>
            <p className="mb-4">
              {error ? 
                `Error: ${(error as Error).message}` : 
                "No Pokémon selected for battle"}
            </p>
            <Button onClick={() => setLocation("/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pokémon Battle" user={userData}>
      {battleState && (
        <div className="flex flex-col items-center">
          <BattleInterface
            battleState={battleState}
            onMoveSelect={handleMoveSelect}
            onFlee={handleFlee}
            isLoading={executeMoveQuery.isPending || fleeBattleQuery.isPending}
          />
          
          {/* End battle button shown only when battle is over */}
          {battleState.battleStatus !== 'active' && (
            <Button 
              className="mt-6" 
              size="lg"
              onClick={handleEndBattle}
            >
              Return to Dashboard
            </Button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}