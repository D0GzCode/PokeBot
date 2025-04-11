import React from "react";
import { Link, useLocation } from "wouter";
import { User } from "@/lib/types";

interface SidebarProps {
  user?: User;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const [location] = useLocation();

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { path: "/profile", label: "Profile", icon: "person" },
    { path: "/pokemon", label: "My Pokémon", icon: "catching_pokemon" },
    { path: "/battles", label: "Battles", icon: "casino" },
    { path: "/tournaments", label: "Tournaments", icon: "emoji_events" },
    { path: "/shop", label: "Shop", icon: "store" },
    { path: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
    { path: "/help", label: "Help & Commands", icon: "help" },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-white dark:bg-dark-200 shadow-md h-screen">
      <div className="flex flex-col items-center justify-center p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center bg-pokemon-red rounded-full w-12 h-12 mb-3">
          <span className="material-icons text-white">catching_pokemon</span>
        </div>
        <h1 className="font-pixel text-lg text-pokemon-blue dark:text-pokemon-lightblue">PokéVenture</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Discord Bot Dashboard</p>
      </div>
      
      <div className="overflow-y-auto py-4 px-3 flex-grow">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a className={`flex items-center p-2 text-base font-normal rounded-lg ${
                  location === item.path 
                    ? "bg-gray-100 dark:bg-gray-700 text-pokemon-red" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}>
                  <span className="material-icons mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      
      {user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <img 
              className="w-8 h-8 rounded-full" 
              src={user.avatar} 
              alt={`${user.username}'s Avatar`} 
            />
            <div>
              <p className="font-medium text-sm">{user.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Trainer Level {user.trainerLevel}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
