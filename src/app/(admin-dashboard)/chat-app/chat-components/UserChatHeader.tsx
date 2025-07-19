"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  MoreVertical, 
  Menu,
  Phone,
  Video,
  Info,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatUser } from "@/types/chat-app";
import UsersList from "./UsersList";

interface UserChatHeaderProps {
  selectedUser?: ChatUser | null;
  users: ChatUser[];
  onUserSelect: (user: ChatUser) => void;
  currentUserId?: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onShowInfo?: () => void;
  onShowMore?: () => void;
}

const UserChatHeader = ({ 
  selectedUser, 
  users, 
  onUserSelect, 
  currentUserId,
  isMobileMenuOpen, 
  setIsMobileMenuOpen,
  onCall,
  onVideoCall,
  onShowInfo,
  onShowMore
}: UserChatHeaderProps) => {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'VIEWER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center space-x-3">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <UsersList 
              users={users}
              selectedUser={selectedUser}
              onUserSelect={(user) => {
                onUserSelect(user);
                setIsMobileMenuOpen(false);
              }}
              currentUserId={currentUserId}
            />
          </SheetContent>
        </Sheet>

        {selectedUser ? (
          <>
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedUser.user_profile || ""} />
                <AvatarFallback className="text-sm">
                  {selectedUser.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                selectedUser.user_status === 'ACTIVE' ? "bg-green-500" : "bg-gray-400"
              )} />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-medium">{selectedUser.full_name}</h3>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getRoleBadgeColor(selectedUser.role))}
                >
                  {selectedUser.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedUser.user_status === 'ACTIVE' ? 'Online' : 'Offline'} • @{selectedUser.username}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm">
                  <MessageCircle className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h3 className="font-medium">Select a user to chat</h3>
              <p className="text-xs text-muted-foreground">
                Choose someone from the users list
              </p>
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onCall}>
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onVideoCall}>
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onShowInfo}>
            <Info className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onShowMore}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserChatHeader;