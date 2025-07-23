// CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD
// TODO: Re-enable when chat app is ready for production

// "use client";

// import { useState } from "react";
// import RoomsList from "./chat-components/RoomsList";
// import ChatHeader from "./chat-components/ChatHeader";
// import MessagesList from "./chat-components/MessagesList";
// import MessageInput from "./chat-components/MessageInput";
// import CreateRoomModal from "./chat-components/CreateRoomModal";
// import InvitationModal from "./chat-components/InvitationModal";
// import { useAuth } from "@/app/context/AuthContext";
// import { useChatApp } from "@/hooks/chat-app";
// import { useQueryClient } from "@tanstack/react-query";
// import { ROOM_INVITATIONS_QUERY_KEYS } from "@/hooks/chat-app/useRoomInvitations";

const ChatApp = () => {
  // const { user, loading: authLoading } = useAuth();
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  // const queryClient = useQueryClient();

  // const currentUserId = user?.id;

  // // Use the combined chat app hook
  // const {
  //   // State
  //   selectedRoom,
  //   invitationRoom,
  //   messages,
  //   currentRoom,

  //   // Data
  //   rooms,
  //   users,

  //   // Loading states
  //   isLoading,
  //   isLoadingMessages,
  //   isLoadingMoreMessages,
  //   hasMoreMessages,
  //   isCreatingRoom,
  //   isRespondingToInvitation,
  //   isSendingMessage,

  //   // Errors
  //   error,
  //   createRoomError,
  //   invitationResponseError,

  //   // Actions
  //   handleRoomSelect,
  //   handleAcceptInvitation,
  //   handleDeclineInvitation,
  //   handleCreateRoom,
  //   handleSendMessage,
  //   setInvitationRoom,
  //   loadMoreMessages,
  // } = useChatApp({
  //   userId: currentUserId,
  //   enabled: !authLoading && !!currentUserId,
  // });

  // const handleCreateRoomModal = () => {
  //   setIsCreateRoomModalOpen(true);
  // };

  // const handleCreateRoomSubmit = async (roomData: {
  //   name: string;
  //   description?: string;
  //   type: any;
  //   invitedUsers: any[];
  //   inviteUsername?: string;
  // }) => {
  //   try {
  //     await handleCreateRoom(roomData);
  //     console.log("Room creation submitted successfully");
  //     setIsCreateRoomModalOpen(false);
  //   } catch (error) {
  //     console.error("Error in handleCreateRoomSubmit:", error);
  //     // Don't close modal if there's an error
  //   }
  // };

  // const handleCall = () => {
  //   console.log("Starting call in room:", currentRoom?.name);
  // };

  // const handleVideoCall = () => {
  //   console.log("Starting video call in room:", currentRoom?.name);
  // };

  // const handleShowInfo = () => {
  //   console.log("Show room info for:", currentRoom?.name);
  // };

  // const handleShowMore = () => {
  //   console.log("Show more options for room:", currentRoom?.name);
  // };

  // const handleAttachFile = () => {
  //   console.log("Attach file");
  // };

  // const handleEmojiPicker = () => {
  //   console.log("Open emoji picker");
  // };

  // const handleDeleteRoom = async (roomId: string) => {
  //   try {
  //     console.log("Main page - handleDeleteRoom called with roomId:", roomId);
  //     const response = await fetch(
  //       `/api/rooms/${roomId}/delete?userId=${currentUserId}`,
  //       {
  //         method: "DELETE",
  //       }
  //     );

  //     if (response.ok) {
  //       console.log("Room deleted successfully:", roomId);

  //       // Navigate away from the deleted room
  //       if (selectedRoom === roomId) {
  //         // Find another room to select or go to empty state
  //         const otherRoom = rooms.find((room) => room.id !== roomId);
  //         if (otherRoom) {
  //           handleRoomSelect(otherRoom.id);
  //         }
  //       }

  //       // Refresh rooms list
  //       // This will be handled by Socket.io or we can manually refetch
  //     } else {
  //       const error = await response.json();
  //       console.error("Failed to delete room:", error.error);
  //       // TODO: Show error toast to user
  //     }
  //   } catch (error) {
  //     console.error("Error deleting room:", error);
  //     // TODO: Show error toast to user
  //   }
  // };

  // const handleInviteUsersToRoom = async (inviteData: {
  //   invitedUsers: any[];
  //   inviteUsername?: string;
  //   inviteEmail?: string;
  // }) => {
  //   if (!currentRoom) {
  //     throw new Error("No current room selected");
  //   }

  //   const response = await fetch(`/api/rooms/${currentRoom.id}/invite`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       invitedUsers: inviteData.invitedUsers,
  //       inviterId: currentUserId,
  //       inviteUsername: inviteData.inviteUsername,
  //       inviteEmail: inviteData.inviteEmail,
  //     }),
  //   });

  //   if (response.ok) {
  //     const result = await response.json();
  //     console.log("Users invited successfully:", result.message);

  //     // Invalidate room invitations cache to refresh the user list immediately
  //     queryClient.invalidateQueries({
  //       queryKey: ROOM_INVITATIONS_QUERY_KEYS.invitations(currentRoom.id),
  //     });

  //     // TODO: Show success toast to user
  //     return result;
  //   } else {
  //     const error = await response.json();
  //     console.error("Failed to invite users:", error.error);
  //     // TODO: Show error toast to user
  //     throw new Error(error.error || "Failed to invite users");
  //   }
  // };

  // // Show loading if auth is still loading or we're fetching data
  // if (authLoading || isLoading || !currentUserId) {
  //   return (
  //     <div className="flex flex-row w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-background items-center justify-center">
  //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  //     </div>
  //   );
  // }

  // // Show error state if there's an error
  // if (error) {
  //   return (
  //     <div className="flex flex-row w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-background items-center justify-center">
  //       <div className="text-center">
  //         <h3 className="text-lg font-medium text-destructive mb-2">
  //           Failed to load chat
  //         </h3>
  //         <p className="text-sm text-muted-foreground">
  //           {error.message || "An error occurred while loading the chat"}
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-row w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-background items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Chat App Temporarily Disabled
        </h3>
        <p className="text-sm text-muted-foreground">
          The chat application is currently disabled for production build. It will be re-enabled soon.
        </p>
      </div>
    </div>
  );

  // return (
  //   <div className="w-full h-full p-2 md:p-4 overflow-hidden">
  //     <div className="flex flex-row w-full h-[89dvh] md:h-[85dvh] bg-background border border-chart-1/20 rounded-md overflow-hidden">
  //       <div className="h-full hidden md:flex md:w-80 border-r bg-card">
  //         <RoomsList
  //           rooms={rooms}
  //           selectedRoom={selectedRoom || ""}
  //           onRoomSelect={handleRoomSelect}
  //           onCreateRoom={handleCreateRoomModal}
  //           currentUserId={currentUserId}
  //         />
  //       </div>

  //       <div className="h-full flex-1 flex flex-col min-w-0">
  //         <ChatHeader
  //           currentRoom={currentRoom}
  //           rooms={rooms}
  //           selectedRoom={selectedRoom || ""}
  //           onRoomSelect={handleRoomSelect}
  //           isMobileMenuOpen={isMobileMenuOpen}
  //           setIsMobileMenuOpen={setIsMobileMenuOpen}
  //           onCreateRoom={handleCreateRoomModal}
  //           onCall={handleCall}
  //           onVideoCall={handleVideoCall}
  //           onShowInfo={handleShowInfo}
  //           onShowMore={handleShowMore}
  //           currentUserId={currentUserId}
  //           users={users}
  //           onDeleteRoom={handleDeleteRoom}
  //           onInviteUsers={handleInviteUsersToRoom}
  //         />

  //         {currentRoom ? (
  //           <div className="flex-1 flex flex-col min-h-0 w-full">
  //             <div className="flex-1 overflow-hidden min-h-0">
  //               <MessagesList
  //                 messages={messages}
  //                 currentUserId={currentUserId}
  //                 roomId={selectedRoom || undefined}
  //                 isLoading={isLoadingMessages}
  //                 hasMoreMessages={hasMoreMessages}
  //                 isLoadingMore={isLoadingMoreMessages}
  //                 onLoadMore={() => {
  //                   if (selectedRoom) {
  //                     loadMoreMessages(selectedRoom);
  //                   }
  //                 }}
  //               />
  //             </div>

  //             <div className="flex-shrink-0 border-t bg-background">
  //               <MessageInput
  //                 roomName={currentRoom.name}
  //                 onSendMessage={handleSendMessage}
  //                 onAttachFile={handleAttachFile}
  //                 onEmojiPicker={handleEmojiPicker}
  //                 placeholder={`Message ${currentRoom.name}...`}
  //                 disabled={isSendingMessage}
  //               />
  //             </div>
  //           </div>
  //         ) : (
  //           <div className="flex-1 flex items-center justify-center text-center">
  //             <div>
  //               <h3 className="text-lg font-medium text-muted-foreground mb-2">
  //                 {rooms.length === 0
  //                   ? "No conversations yet"
  //                   : "Select a conversation"}
  //               </h3>
  //               <p className="text-sm text-muted-foreground mb-4">
  //                 {rooms.length === 0
  //                   ? "Start your first conversation by creating a room"
  //                   : "Choose a room from the sidebar to start messaging"}
  //               </p>
  //               {rooms.length === 0 && (
  //                 <button
  //                   onClick={handleCreateRoomModal}
  //                   className="inline-flex items-center px-4 py-2 bg-chart-3 text-white rounded-md hover:bg-primary/90 transition-colors"
  //                   disabled={isCreatingRoom}
  //                 >
  //                   {isCreatingRoom ? (
  //                     <>
  //                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
  //                       Creating...
  //                     </>
  //                   ) : (
  //                     "Create your first room"
  //                   )}
  //                 </button>
  //               )}
  //             </div>
  //           </div>
  //         )}
  //       </div>
  //     </div>

  //     <CreateRoomModal
  //       isOpen={isCreateRoomModalOpen}
  //       onClose={() => setIsCreateRoomModalOpen(false)}
  //       onCreateRoom={handleCreateRoomSubmit}
  //       users={users}
  //       rooms={rooms}
  //       currentUserId={currentUserId}
  //     />

  //     {invitationRoom && (
  //       <InvitationModal
  //         isOpen={!!invitationRoom}
  //         onClose={() => setInvitationRoom(null)}
  //         room={invitationRoom}
  //         onAccept={handleAcceptInvitation}
  //         onDecline={handleDeclineInvitation}
  //         isLoading={isRespondingToInvitation}
  //       />
  //     )}

  //     {/* Error notifications */}
  //     {createRoomError && (
  //       <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-3 rounded-md shadow-lg">
  //         Failed to create room: {createRoomError.message}
  //       </div>
  //     )}

  //     {invitationResponseError && (
  //       <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-3 rounded-md shadow-lg">
  //         Failed to respond to invitation: {invitationResponseError.message}
  //       </div>
  //     )}

  //     {/* sendMessageError removed - errors now handled via Socket.io in useChatApp */}
  //   </div>
  // );
};

export default ChatApp;
