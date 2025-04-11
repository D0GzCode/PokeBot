import React from "react";
import { Event } from "@/lib/types";

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <div className={`border border-l-4 ${event.colorClass} bg-${event.colorClass.split('-')[1]}-50 dark:bg-${event.colorClass.split('-')[1]}-900/20 rounded-lg p-3`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{event.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
        </div>
        <span className={`text-sm font-medium ${event.colorClass.replace('border-', 'text-')}`}>
          {event.timeRemaining}
        </span>
      </div>
    </div>
  );
};

export default EventCard;
