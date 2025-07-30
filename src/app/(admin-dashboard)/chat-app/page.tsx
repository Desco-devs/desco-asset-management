"use client";

import { useState, useEffect } from "react";
import RoomsList from "./chat-components/RoomsList";
import MessagesList from "./chat-components/MessagesList";
import MessageInput from "./chat-components/MessageInput";
import CreateRoomModal from "./chat-components/CreateRoomModal";
import { createClient } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Room {
  id: string;
  name: string;
  type: 'DIRECT' | 'GROUP';
  owner_id: string;
  created_at: string;
  updated_at: string;
  lastMessage?: {
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
  is_owner: boolean;
  member_count: number;
  owner: {
    id: string;
    username: string;
    full_name: string;
  };
  members: {
    id: string;
    user: {
      id: string;
      username: string;
      full_name: string;
    };
  }[];
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    full_name: string;
  };
}

const ChatApp = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const supabase = createClient();

  // Authentication setup
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        setUser(user);
        fetchRooms(user.id);
      }
      setAuthLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          fetchRooms(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRooms([]);
          setSelectedRoom(null);
          setMessages([]);
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Fetch rooms for user
  const fetchRooms = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rooms/getall?userId=${userId}`);
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch messages for selected room
  const fetchMessages = async (roomId: string) => {
    try {
      const response = await fetch(`/api/messages/${roomId}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Handle room selection
  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    fetchMessages(room.id);
  };


  // Handle creating room
  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !user) return;

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRoomName,
          type: 'GROUP',
          ownerId: user.id,
        }),
      });

      if (response.ok) {
        setNewRoomName('');
        setIsCreateRoomModalOpen(false);
        fetchRooms(user.id); // Refresh rooms
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Authentication Required
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please sign in to access the chat application
          </p>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2 md:p-4 overflow-hidden">
      <div className="flex flex-row w-full h-[89dvh] md:h-[85dvh] bg-background border border-chart-1/20 rounded-md overflow-hidden">
        <div className="h-full hidden md:flex md:w-80 border-r bg-card">
          <RoomsList
            rooms={rooms}
            selectedRoom={selectedRoom?.id || ""}
            onRoomSelect={(roomId) => {
              const room = rooms.find(r => r.id === roomId);
              if (room) handleRoomSelect(room);
            }}
            onCreateRoom={() => setIsCreateRoomModalOpen(true)}
            currentUserId={user?.id}
            isUserOnline={() => false}
            onlineUserIds={[]}
          />
        </div>

        <div className="h-full flex-1 flex flex-col min-w-0">
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="border-b p-4">
                <h3 className="font-semibold">{selectedRoom.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRoom.member_count} members
                </p>
              </div>

              <div className="flex-1 flex flex-col min-h-0 w-full">
                <div className="flex-1 overflow-hidden min-h-0">
                  <MessagesList
                    messages={messages}
                    currentUserId={user?.id}
                    roomId={selectedRoom?.id || undefined}
                    isLoading={false}
                    hasMoreMessages={false}
                    isLoadingMore={false}
                    onLoadMore={() => {}}
                  />
                </div>

                <div className="flex-shrink-0 border-t bg-background">
                  <MessageInput
                    roomName={selectedRoom.name}
                    onSendMessage={async (message) => {
                      if (!selectedRoom || !user) return;
                      
                      try {
                        const response = await fetch('/api/messages/create', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            roomId: selectedRoom.id,
                            content: message,
                            senderId: user.id,
                          }),
                        });

                        if (response.ok) {
                          fetchMessages(selectedRoom.id); // Refresh messages
                        }
                      } catch (error) {
                        console.error('Error sending message:', error);
                      }
                    }}
                    onAttachFile={() => console.log("Attach file")}
                    onEmojiPicker={() => console.log("Open emoji picker")}
                    placeholder={`Message ${selectedRoom.name}...`}
                    disabled={false}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {rooms.length === 0
                    ? "No conversations yet"
                    : "Select a conversation"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {rooms.length === 0
                    ? "Start your first conversation by creating a room"
                    : "Choose a room from the sidebar to start messaging"}
                </p>
                {rooms.length === 0 && (
                  <button
                    onClick={() => setIsCreateRoomModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-chart-3 text-white rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Create your first room
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onCreateRoom={(roomData) => {
          setNewRoomName(roomData.name);
          handleCreateRoom();
        }}
        users={[]}
        rooms={rooms}
        currentUserId={user?.id}
      />
    </div>
  );
};

export default ChatApp;