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
    isLoadingMoreMessages,
    hasMoreMessages,
    isCreatingRoom,
    isRespondingToInvitation,
    isSendingMessage,

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
    loadMoreMessages,
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
    try {
      await handleCreateRoom(roomData);
      console.log("Room creation submitted successfully");
      setIsCreateRoomModalOpen(false);
    } catch (error) {
      console.error("Error in handleCreateRoomSubmit:", error);
      // Don't close modal if there's an error
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

  const handleDeleteRoom = async (roomId: string) => {
    console.log("Delete room:", roomId);
    // Placeholder for room deletion
  };

  const handleInviteUsersToRoom = async (inviteData: {
    invitedUsers: any[];
    inviteUsername?: string;
    inviteEmail?: string;
  }) => {
    console.log("Invite users to room:", inviteData);
    // Placeholder for user invitation
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
        <div className="text-center">
          <h3 className="text-lg font-medium text-destructive mb-2">
            Failed to load chat
          </h3>
          <p className="text-sm text-muted-foreground">
            {error.message || "An error occurred while loading the chat"}
          </p>
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
            selectedRoom={selectedRoom || ""}
            onRoomSelect={handleRoomSelect}
            onCreateRoom={handleCreateRoomModal}
            currentUserId={currentUserId}
          />
        </div>

        <div className="h-full flex-1 flex flex-col min-w-0">
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
            users={users}
            onDeleteRoom={handleDeleteRoom}
            onInviteUsers={handleInviteUsersToRoom}
          />

          {currentRoom ? (
            <div className="flex-1 flex flex-col min-h-0 w-full">
              <div className="flex-1 overflow-hidden min-h-0">
                <MessagesList
                  messages={messages}
                  currentUserId={currentUserId}
                  roomId={selectedRoom || undefined}
                  isLoading={isLoadingMessages}
                  hasMoreMessages={hasMoreMessages}
                  isLoadingMore={isLoadingMoreMessages}
                  onLoadMore={() => {
                    if (selectedRoom) {
                      loadMoreMessages(selectedRoom);
                    }
                  }}
                />
              </div>

              <div className="flex-shrink-0 border-t bg-background">
                <MessageInput
                  roomName={currentRoom.name}
                  onSendMessage={(message) => handleSendMessage(selectedRoom || "", message)}
                  onAttachFile={handleAttachFile}
                  onEmojiPicker={handleEmojiPicker}
                  placeholder={`Message ${currentRoom.name}...`}
                  disabled={isSendingMessage}
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
                    className="inline-flex items-center px-4 py-2 bg-chart-3 text-white rounded-md hover:bg-primary/90 transition-colors"
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
        isCreating={isCreatingRoom}
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
    </div>
  );
};

export default ChatApp;