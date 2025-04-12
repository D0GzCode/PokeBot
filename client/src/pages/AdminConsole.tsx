
import React, { useState, useEffect } from 'react';
import { EmbedBuilder } from 'discord.js';

const AdminConsole = () => {
  const [activityLog, setActivityLog] = useState([]);
  const [spawnPokemon, setSpawnPokemon] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState([]);
  const [minLevel, setMinLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(100);
  const [channelId, setChannelId] = useState('');
  
  const handleAddPokemon = () => {
    const isShiny = spawnPokemon.toLowerCase().startsWith('s');
    const pokemonName = isShiny ? spawnPokemon.slice(1) : spawnPokemon;
    
    if (selectedPokemon.length < 30) {
      setSelectedPokemon([...selectedPokemon, { name: pokemonName, shiny: isShiny }]);
      setSpawnPokemon('');
    }
  };

  const handleStartSpawn = async () => {
    if (!channelId || selectedPokemon.length === 0) return;
    
    await fetch('/api/admin/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pokemon: selectedPokemon,
        minLevel,
        maxLevel,
        channelId
      })
    });
  };

  useEffect(() => {
    const fetchActivityLog = async () => {
      const response = await fetch('/api/admin/activity');
      const data = await response.json();
      setActivityLog(data);
    };
    
    fetchActivityLog();
    const interval = setInterval(fetchActivityLog, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Admin Console</h1>
        
        {/* Activity Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Activity Log</h2>
          <div className="h-96 overflow-auto">
            {activityLog.map((activity) => (
              <div 
                key={activity.id} 
                className={`p-2 mb-2 rounded ${
                  activity.type === 'COMMAND' ? 'bg-blue-100' :
                  activity.type === 'BATTLE' ? 'bg-yellow-100' :
                  activity.type === 'SPAM' ? 'bg-red-100' :
                  activity.type === 'REGISTER' ? 'bg-blue-100' :
                  activity.type === 'SPAWN' ? 'bg-green-100' :
                  'bg-gray-100'
                }`}
              >
                <span className="font-medium">{activity.timestamp}</span>
                <p>{activity.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spawn Control */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Custom Spawn Control</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Spawn Pokemon</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spawnPokemon}
                    onChange={(e) => setSpawnPokemon(e.target.value)}
                    className="flex-1 rounded border p-2"
                    placeholder="Enter pokemon name (prefix with 's' for shiny)"
                  />
                  <button
                    onClick={handleAddPokemon}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Lowest Level</label>
                  <select
                    value={minLevel}
                    onChange={(e) => setMinLevel(Number(e.target.value))}
                    className="w-full rounded border p-2"
                  >
                    {[...Array(100)].map((_, i) => (
                      <option key={i} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Highest Level</label>
                  <select
                    value={maxLevel}
                    onChange={(e) => setMaxLevel(Number(e.target.value))}
                    className="w-full rounded border p-2"
                  >
                    {[...Array(100)].map((_, i) => (
                      <option key={i} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Channel ID</label>
                <input
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full rounded border p-2"
                  placeholder="Enter channel ID"
                />
              </div>

              <button
                onClick={handleStartSpawn}
                disabled={!channelId || selectedPokemon.length === 0}
                className="bg-green-500 text-white px-6 py-2 rounded disabled:opacity-50"
              >
                Start Spawn
              </button>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Selected Pokemon</h3>
              <div className="space-y-2">
                {selectedPokemon.map((pokemon, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{pokemon.shiny ? '⭐' : ''} {pokemon.name}</span>
                    <button
                      onClick={() => setSelectedPokemon(selectedPokemon.filter((_, i) => i !== index))}
                      className="text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConsole;
