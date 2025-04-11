import React from "react";

interface StatCardProps {
  icon: string;
  iconBgColor: string;
  iconTextColor: string;
  label: string;
  value: number | string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconBgColor,
  iconTextColor,
  label,
  value,
}) => {
  return (
    <div className="bg-white dark:bg-dark-200 rounded-lg shadow-sm p-4">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${iconBgColor} ${iconTextColor} mr-4`}>
          <span className="material-icons">{icon}</span>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
