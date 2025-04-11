import { useQuery } from "@tanstack/react-query";
import { User, Activity, Event, CommandSection } from "@/lib/types";

export function useUserData() {
  return useQuery<User>({
    queryKey: ["/api/user"],
  });
}

export function useActivityData() {
  return useQuery<Activity[]>({
    queryKey: ["/api/activity"],
  });
}

export function useEventsData() {
  return useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
}

export function useCommandSections() {
  return useQuery<CommandSection[]>({
    queryKey: ["/api/commands"],
  });
}
