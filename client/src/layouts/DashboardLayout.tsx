import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { User } from "@/lib/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  user?: User;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  title,
  user
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Initialize dark mode
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedDarkMode === 'true' || (savedDarkMode === null && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for desktop */}
      <Sidebar user={user} />
      
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={toggleSidebar}
          />
          <div className="relative flex flex-col w-64 bg-white dark:bg-dark-200 shadow-md h-screen">
            <Sidebar user={user} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 pt-0 md:pt-0 mt-16 md:mt-0">
        <Header title={title} toggleSidebar={toggleSidebar} />
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
