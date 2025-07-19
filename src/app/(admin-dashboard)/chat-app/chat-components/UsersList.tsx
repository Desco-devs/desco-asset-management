"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MessageCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatUser } from "@/types/chat-app";

interface UsersListProps {
  users: ChatUser[];
  selectedUser?: ChatUser | null;
  onUserSelect: (user: ChatUser) => void;
  currentUserId?: string;
  onCreateRoom?: () => void;
}

const UsersList = ({ users, selectedUser, onUserSelect, currentUserId, onCreateRoom }: UsersListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredUsers = users.filter(user => 
    user.id !== currentUserId &&
    (user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Direct Messages</h2>
          {onCreateRoom && (
            <Button size="sm" variant="outline" onClick={onCreateRoom}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredUsers.map((user) => (
            <Card
              key={user.id}
              className={cn(
                "mb-2 cursor-pointer transition-colors hover:bg-accent",
                selectedUser?.id === user.id && "bg-accent border-primary"
              )}
              onClick={() => onUserSelect(user)}
            >
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.user_profile || ""} />
                      <AvatarFallback className="text-sm">
                        {user.full_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                      user.user_status === 'ACTIVE' ? "bg-green-500" : "bg-gray-400"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {user.full_name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground capitalize">
                          {user.role.toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      @{user.username}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default UsersList;