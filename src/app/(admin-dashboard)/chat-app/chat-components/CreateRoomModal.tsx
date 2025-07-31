"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: {
    name: string;
    description?: string;
    type: 'GROUP' | 'DIRECT';
    invitedUsers: any[];
    inviteUsername?: string;
  }) => void;
  users: any[];
  rooms: any[];
  currentUserId?: string;
  isCreating?: boolean;
}

const CreateRoomModal = ({
  isOpen,
  onClose,
  onCreateRoom,
  users,
  rooms,
  currentUserId,
  isCreating = false,
}: CreateRoomModalProps) => {
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = () => {
    setRoomName("");
    setRoomDescription("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting || isCreating) return; // Prevent closing while creating
    handleReset();
    onClose();
  };

  const handleCreate = async () => {
    if (!roomName.trim() || isSubmitting || isCreating) return;

    setIsSubmitting(true);
    
    try {
      const roomData = {
        name: roomName,
        description: roomDescription,
        type: 'GROUP' as const,
        invitedUsers: [],
        inviteUsername: undefined,
      };

      await onCreateRoom(roomData);
      handleReset();
      onClose();
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    return roomName.trim() !== "" && !isSubmitting && !isCreating;
  };

  const isLoading = isSubmitting || isCreating;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="md:max-w-2xl max-w-[90dvw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
          <DialogDescription>
            Enter the room name and description
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scroll-none">
          <div className="space-y-4">
            <div className="p-1 space-y-3">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name..."
                className="mt-1"
                disabled={isLoading}
              />
            </div>
            <div className="p-1 space-y-3">
              <Label htmlFor="roomDescription">Description (Optional)</Label>
              <Textarea
                id="roomDescription"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="What's this room about?"
                className="mt-1"
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div></div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              className="text-white bg-chart-3"
              onClick={handleCreate}
              disabled={!canProceed()}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                "Create Room"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;