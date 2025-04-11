import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, toggleSidebar }) => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
        (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  
  const { toast } = useToast();

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', newDarkMode);
      localStorage.setItem('darkMode', String(newDarkMode));
    }
  };

  const showNotification = () => {
    toast({
      title: "Notifications",
      description: "You have no new notifications",
    });
  };

  const showHelp = () => {
    toast({
      title: "Help",
      description: "Visit the Help & Commands page for more information",
    });
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-dark-200 shadow-sm w-full fixed top-0 z-10">
        <div className="flex items-center">
          <span className="material-icons mr-2 text-pokemon-red">catching_pokemon</span>
          <h1 className="font-pixel text-sm text-pokemon-blue dark:text-pokemon-lightblue">PokéVenture</h1>
        </div>
        <button className="p-1" onClick={toggleSidebar}>
          <span className="material-icons">menu</span>
        </button>
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between p-4 bg-white dark:bg-dark-200 shadow-sm">
        <h1 className="text-xl font-poppins font-semibold">{title}</h1>
        <div className="flex items-center space-x-4">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={showNotification}
          >
            <span className="material-icons">notifications</span>
          </button>
          <button 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" 
            onClick={toggleDarkMode}
          >
            <span className="material-icons">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={showHelp}
          >
            <span className="material-icons">help</span>
          </button>
        </div>
      </header>
    </>
  );
};

export default Header;
