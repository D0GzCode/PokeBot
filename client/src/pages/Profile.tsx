
import React from 'react';
import { AvatarCustomizer } from '@/components/AvatarCustomizer';
import type { UserAvatar } from '@/lib/types';

export default function Profile() {
  const handleAvatarChange = (newAvatar: UserAvatar) => {
    // TODO: Implement API call to save avatar changes
    console.log('Avatar updated:', newAvatar);
  };

  const currentAvatar = {}; // TODO: Fetch from API

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
