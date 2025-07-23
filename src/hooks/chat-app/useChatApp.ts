// CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD
// TODO: Re-enable when chat app is ready for production

export const useChatApp = () => {
  return {
    selectedRoom: null,
    invitationRoom: null,
    messages: [],
    currentRoom: null,
    rooms: [],
    users: [],
    isLoading: false,
    isLoadingMessages: false,
    isLoadingMoreMessages: false,
    hasMoreMessages: false,
    isCreatingRoom: false,
    isRespondingToInvitation: false,
    isSendingMessage: false,
    error: null,
    createRoomError: null,
    invitationResponseError: null,
    handleRoomSelect: () => {},
    handleAcceptInvitation: () => Promise.resolve(),
    handleDeclineInvitation: () => Promise.resolve(),
    handleCreateRoom: () => Promise.resolve(),
    handleSendMessage: () => Promise.resolve(),
    setInvitationRoom: () => {},
    loadMoreMessages: () => {},
  };
};