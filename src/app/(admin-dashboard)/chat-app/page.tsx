"use client";

import { useState, useEffect } from "react";
import RoomsList from "./chat-components/RoomsList";
import ChatHeader from "./chat-components/ChatHeader";
import MessagesList from "./chat-components/MessagesList";
import MessageInput from "./chat-components/MessageInput";
import CreateRoomModal from "./chat-components/CreateRoomModal";
import { useAuth } from "@/app/context/AuthContext";
import {
  RoomListItem,
  RoomType,
  MessageWithRelations,
  MessageType,
  ChatUser,
} from "@/types/chat-app";

const ChatApp = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [messages, setMessages] = useState<MessageWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserId = user?.id;

  useEffect(() => {
    if (!currentUserId || authLoading) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch users for room creation
        const usersResponse = await fetch("/api/users/getall");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }

        // Fetch user's rooms
        const roomsResponse = await fetch(
          `/api/rooms/getall?userId=${currentUserId}`
        );
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData);

          // Auto-select first room if available
          if (roomsData.length > 0 && !selectedRoom) {
            setSelectedRoom(roomsData[0].id);
          }
        } else {
          console.error("Failed to fetch rooms");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUserId, authLoading]);

  // Fetch messages when room is selected
  useEffect(() => {
    if (!selectedRoom || !currentUserId) return;

    const fetchMessages = async () => {
      try {
        // TODO: Replace with real message API
        console.log(`Fetching messages for room: ${selectedRoom}`);

        // For now, clear messages when switching rooms
        setMessages([]);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [selectedRoom, currentUserId]);

  const currentRoom = rooms.find((room) => room.id === selectedRoom);

  const handleSendMessage = (message: string) => {
    if (!selectedRoom || !currentUserId || !currentRoom) return;

    console.log(`Sending message to room ${currentRoom.name}:`, message);
    // TODO: Implement real message sending via API/Socket.io

    // Add message to local state for now
    const newMessage: MessageWithRelations = {
      id: Date.now().toString(),
      room_id: selectedRoom,
      sender_id: currentUserId,
      content: message,
      type: MessageType.TEXT,
      created_at: new Date(),
      updated_at: new Date(),
      sender: {
        id: currentUserId,
        username: user?.username || "you",
        full_name: "You",
        user_profile: user?.user_profile || "",
      },
      room: {
        id: selectedRoom,
        name: currentRoom.name,
        type: currentRoom.type as any,
      },
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoom(roomId);
    console.log("Selected room:", rooms.find((r) => r.id === roomId)?.name);
  };

  const handleCreateRoom = () => {
    setIsCreateRoomModalOpen(true);
  };

  const handleCreateRoomSubmit = async (roomData: {
    name: string;
    description?: string;
    type: RoomType;
    invitedUsers: ChatUser[];
    inviteUsername?: string;
  }) => {
    if (!currentUserId) return;

    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomData.name,
          description: roomData.description,
          type: roomData.type,
          ownerId: currentUserId,
          invitedUsers: roomData.invitedUsers,
          inviteUsername: roomData.inviteUsername,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Room created:", result);

        // Refresh rooms list
        const roomsResponse = await fetch(
          `/api/rooms/getall?userId=${currentUserId}`
        );
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData);

          // Select the new room
          setSelectedRoom(result.room.id);
        }
      } else {
        console.error("Failed to create room");
      }
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const handleCall = () => {
    console.log("Starting call in room:", currentRoom?.name);
  };

  const handleVideoCall = () => {
    console.log("Starting video call in room:", currentRoom?.name);
  };

  const handleShowInfo = () => {
    console.log("Show room info for:", currentRoom?.name);
  };

  const handleShowMore = () => {
    console.log("Show more options for room:", currentRoom?.name);
  };

  const handleAttachFile = () => {
    console.log("Attach file");
  };

  const handleEmojiPicker = () => {
    console.log("Open emoji picker");
  };

  // Show loading if auth is still loading or we're fetching data
  if (authLoading || isLoading || !currentUserId) {
    return (
      <div className="flex flex-row w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-background items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-row w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-background">
        <div className="hidden md:flex md:w-80 border-r bg-card">
          <RoomsList
            rooms={rooms}
            selectedRoom={selectedRoom || ""}
            onRoomSelect={handleRoomSelect}
            onCreateRoom={handleCreateRoom}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <ChatHeader
            currentRoom={currentRoom}
            rooms={rooms}
            selectedRoom={selectedRoom || ""}
            onRoomSelect={handleRoomSelect}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            onCreateRoom={handleCreateRoom}
            onCall={handleCall}
            onVideoCall={handleVideoCall}
            onShowInfo={handleShowInfo}
            onShowMore={handleShowMore}
          />

          {currentRoom ? (
            <>
              <MessagesList
                messages={messages}
                currentUserId={currentUserId}
                isLoading={false}
              />

              <MessageInput
                roomName={currentRoom.name}
                onSendMessage={handleSendMessage}
                onAttachFile={handleAttachFile}
                onEmojiPicker={handleEmojiPicker}
                placeholder={`Message ${currentRoom.name}...`}
              />
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
                    onClick={handleCreateRoom}
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
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
        onCreateRoom={handleCreateRoomSubmit}
        users={users}
        currentUserId={currentUserId}
      />
    </>
  );
};

export default ChatApp;
