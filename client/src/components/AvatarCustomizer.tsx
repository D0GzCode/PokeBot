
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { avatarItems } from '@/lib/avatarItems';
import type { AvatarItem, UserAvatar } from '@/lib/types';

interface AvatarCustomizerProps {
  currentAvatar: UserAvatar;
  onAvatarChange: (newAvatar: UserAvatar) => void;
}

export function AvatarCustomizer({ currentAvatar, onAvatarChange }: AvatarCustomizerProps) {
  const [previewAvatar, setPreviewAvatar] = useState<UserAvatar>(currentAvatar);
  
  const handleItemChange = (type: keyof UserAvatar, itemId: string) => {
    const selectedItem = avatarItems.find(item => item.id === parseInt(itemId));
    const newAvatar = {
      ...previewAvatar,
      [type]: selectedItem
    };
    setPreviewAvatar(newAvatar);
    onAvatarChange(newAvatar);
  };

  const getItemsByType = (type: string) => {
    return avatarItems.filter(item => item.type === type);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Customize Avatar</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          {(['head', 'body', 'legs', 'feet', 'hands', 'accessory'] as const).map((type) => (
            <div key={type} className="space-y-2">
              <Badge variant="outline" className="capitalize">{type}</Badge>
              <Select onValueChange={(value) => handleItemChange(type, value)}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${type} item`} />
                </SelectTrigger>
                <SelectContent>
                  {getItemsByType(type).map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-start gap-4">
          <Avatar className="h-32 w-32">
            <AvatarImage src={previewAvatar.body?.imageUrl} />
            <AvatarFallback>Avatar</AvatarFallback>
          </Avatar>
          {Object.entries(previewAvatar).map(([type, item]) => (
            item && (
              <Badge key={type} variant="secondary">
                {item.name}
              </Badge>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
