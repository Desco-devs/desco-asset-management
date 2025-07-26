"use client";

import { User } from "@/types/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { color } from "@/lib/color";

interface ProfileHeaderProps {
  user: User;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  // Generate initials from full name
  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-background to-muted/50 rounded-lg border">
      <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
        <AvatarImage src={user.user_profile || undefined} alt={user.full_name} />
        <AvatarFallback className={`${color} text-2xl font-bold`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{user.full_name}</h1>
          <Badge variant={user.user_status === 'ACTIVE' ? 'default' : 'destructive'}>
            {user.user_status}
          </Badge>
        </div>
        
        <p className="text-lg text-muted-foreground">@{user.username}</p>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Role:</span>
            <Badge variant={user.role === 'SUPERADMIN' ? 'default' : user.role === 'ADMIN' ? 'secondary' : 'outline'}>
              {user.role}
            </Badge>
          </div>
          {user.phone && (
            <div className="flex items-center gap-1">
              <span>Phone:</span>
              <span className="font-medium">{user.phone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}