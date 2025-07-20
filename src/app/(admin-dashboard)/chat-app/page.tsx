"use client";

import { useState } from "react";
import RoomsList from "./chat-components/RoomsList";
import ChatHeader from "./chat-components/ChatHeader";
import MessagesList from "./chat-components/MessagesList";
import MessageInput from "./chat-components/MessageInput";
import CreateRoomModal from "./chat-components/CreateRoomModal";
import InvitationModal from "./chat-components/InvitationModal";
import { useAuth } from "@/app/context/AuthContext";
import { useChatApp } from "@/hooks/chat-app";

const ChatApp = () => {
  const { user, loading: authLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);

  const currentUserId = user?.id;

  // Use the combined chat app hook
  const {
    // State
    selectedRoom,
    invitationRoom,
    messages,
    currentRoom,

    // Data
    rooms,
    users,

    // Loading states
    isLoading,
    isLoadingMessages,
    isCreatingRoom,
    isRespondingToInvitation,

    // Errors
    error,
    createRoomError,
    invitationResponseError,

    // Actions
    handleRoomSelect,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleCreateRoom,
    handleSendMessage,
    setInvitationRoom,
  } = useChatApp({
    userId: currentUserId,
    enabled: !authLoading && !!currentUserId,
  });

  const handleCreateRoomModal = () => {
    setIsCreateRoomModalOpen(true);
  };

  const handleCreateRoomSubmit = async (roomData: {
    name: string;
    description?: string;
    type: any;
    invitedUsers: any[];
    inviteUsername?: string;
  }) => {
    await handleCreateRoom(roomData);
    setIsCreateRoomModalOpen(false);
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

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-row w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-background items-center justify-center">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-medium text-orange-600 mb-2">
            Chat Setup Required
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Supabase Realtime needs to be configured. Please enable Realtime for
            chat tables in your Supabase dashboard.
          </p>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <strong>Next steps:</strong>
            <br />
            1. Enable Realtime for: rooms, room_members, messages,
            room_invitations
            <br />
            2. Set up RLS policies
            <br />
            3. Test real-time functionality
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 overflow-hidden">
      <div className="flex flex-row w-full h-[85dvh] bg-background border border-chart-1/20 rounded-md overflow-hidden">
        <div className="h-full hidden md:flex md:w-80 border-r bg-card">
          <RoomsList
            rooms={rooms}
            selectedRoom={selectedRoom || ""}
            onRoomSelect={handleRoomSelect}
            onCreateRoom={handleCreateRoomModal}
          />
        </div>

        <div className="h-full flex-1 flex flex-col ">
          <ChatHeader
            currentRoom={currentRoom}
            rooms={rooms}
            selectedRoom={selectedRoom || ""}
            onRoomSelect={handleRoomSelect}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            onCreateRoom={handleCreateRoomModal}
            onCall={handleCall}
            onVideoCall={handleVideoCall}
            onShowInfo={handleShowInfo}
            onShowMore={handleShowMore}
            currentUserId={currentUserId}
          />

          {currentRoom ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-hidden">
                <MessagesList
                  messages={messages}
                  currentUserId={currentUserId}
                  roomId={selectedRoom || undefined}
                  isLoading={isLoadingMessages}
                  hasMoreMessages={false} // TODO: Implement based on API response
                  isLoadingMore={false} // TODO: Implement load more state
                  onLoadMore={() => {
                    // TODO: Implement load more functionality
                    console.log("Load more messages requested");
                  }}
                />
              </div>

              <div className="flex-shrink-0">
                <MessageInput
                  roomName={currentRoom.name}
                  onSendMessage={handleSendMessage}
                  onAttachFile={handleAttachFile}
                  onEmojiPicker={handleEmojiPicker}
                  placeholder={`Message ${currentRoom.name}...`}
                />
              </div>
            </div>
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
                    onClick={handleCreateRoomModal}
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    disabled={isCreatingRoom}
                  >
                    {isCreatingRoom ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      "Create your first room"
                    )}
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
        rooms={rooms}
        currentUserId={currentUserId}
      />

      {invitationRoom && (
        <InvitationModal
          isOpen={!!invitationRoom}
          onClose={() => setInvitationRoom(null)}
          room={invitationRoom}
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
          isLoading={isRespondingToInvitation}
        />
      )}

      {/* Error notifications */}
      {createRoomError && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-3 rounded-md shadow-lg">
          Failed to create room: {createRoomError.message}
        </div>
      )}

      {invitationResponseError && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-3 rounded-md shadow-lg">
          Failed to respond to invitation: {invitationResponseError.message}
        </div>
      )}

      {/* sendMessageError removed - errors now handled via Socket.io in useChatApp */}
    </div>
  );
};

export default ChatApp;
