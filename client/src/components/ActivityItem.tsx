import React from "react";
import { Activity } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface ActivityItemProps {
  activity: Activity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getIconByType = (type: string) => {
    switch (type) {
      case "catch":
        return {
          icon: "catching_pokemon",
          bgColor: "bg-green-100 dark:bg-green-900",
          textColor: "text-green-600 dark:text-green-300",
        };
      case "battle":
        return {
          icon: "military_tech",
          bgColor: "bg-blue-100 dark:bg-blue-900",
          textColor: "text-blue-600 dark:text-blue-300",
        };
      case "evolution":
        return {
          icon: "upgrade",
          bgColor: "bg-purple-100 dark:bg-purple-900",
          textColor: "text-purple-600 dark:text-purple-300",
        };
      case "hatch":
        return {
          icon: "egg",
          bgColor: "bg-yellow-100 dark:bg-yellow-900",
          textColor: "text-yellow-600 dark:text-yellow-300",
        };
      default:
        return {
          icon: "info",
          bgColor: "bg-gray-100 dark:bg-gray-900",
          textColor: "text-gray-600 dark:text-gray-300",
        };
    }
  };

  const { icon, bgColor, textColor } = getIconByType(activity.type);
  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });

  return (
    <div className="flex items-start">
      <div className={`p-2 rounded-full ${bgColor} ${textColor} mr-3`}>
        <span className="material-icons text-sm">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-medium">{activity.description}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</p>
      </div>
    </div>
  );
};

export default ActivityItem;
