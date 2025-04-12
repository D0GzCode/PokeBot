
import React, { useEffect, useState } from 'react';
import { AvatarCustomizer } from '@/components/AvatarCustomizer';
import type { UserAvatar } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [currentAvatar, setCurrentAvatar] = useState<UserAvatar>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchAvatar();
  }, []);

  const fetchAvatar = async () => {
    try {
      const response = await fetch('/api/user/avatar');
      if (!response.ok) throw new Error('Failed to fetch avatar');
      const data = await response.json();
      setCurrentAvatar(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load avatar data",
        variant: "destructive",
      });
    }
  };

  const handleAvatarChange = async (newAvatar: UserAvatar) => {
    try {
      const response = await fetch('/api/user/avatar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAvatar),
      });

      if (!response.ok) throw new Error('Failed to update avatar');
      
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
      
      setCurrentAvatar(newAvatar);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Profile Customization</h1>
      <AvatarCustomizer 
        currentAvatar={currentAvatar} 
        onAvatarChange={handleAvatarChange}
      />
    </div>
  );
}
