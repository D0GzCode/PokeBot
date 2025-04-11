import React from "react";
import { CommandGuide as CommandGuideType } from "@/lib/types";

interface CommandGuideProps {
  command: CommandGuideType;
}

const CommandGuide: React.FC<CommandGuideProps> = ({ command }) => {
  return (
    <div className="bg-gray-50 dark:bg-dark-300 p-3 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">{command.title}</h3>
        <span className={`text-xs ${command.statusColorClass} px-2 py-0.5 rounded-full`}>
          {command.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{command.description}</p>
      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm font-mono">{command.command}</div>
    </div>
  );
};

export default CommandGuide;
