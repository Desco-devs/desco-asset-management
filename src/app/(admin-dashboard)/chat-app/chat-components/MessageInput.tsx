"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Smile } from "lucide-react";
import { useRoomTyping } from "@/hooks/chat-app/useChatTyping";

interface MessageInputProps {
  roomName?: string;
  roomId?: string;
  onSendMessage: (message: string) => void;
  onAttachFile?: () => void;
  onEmojiPicker?: () => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  currentUser?: any;
}

const MessageInput = ({
  roomName,
  roomId,
  onSendMessage,
  onAttachFile,
  onEmojiPicker,
  onTyping,
  placeholder,
  disabled = false,
  currentUser,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use typing hook for realtime typing indicators
  const { handleTyping } = useRoomTyping(roomId, currentUser);

  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      
      // Stop typing indicator when message is sent
      if (isTyping) {
        setIsTyping(false);
        onTyping?.(false);
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    
    // Handle realtime typing indicator
    if (newValue.trim() && roomId) {
      console.log('⌨️ Triggering typing indicator for room:', roomId);
      handleTyping();
    }
    
    // Legacy onTyping callback support
    if (!onTyping) return;
    
    // Start typing indicator if not already typing
    if (!isTyping && newValue.trim()) {
      setIsTyping(true);
      onTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    if (newValue.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping(false);
        typingTimeoutRef.current = null;
      }, 1000); // Stop typing indicator after 1 second of inactivity
    } else {
      // If input is empty, immediately stop typing indicator
      setIsTyping(false);
      onTyping(false);
    }
  }, [onTyping, isTyping, roomId, handleTyping]);
  
  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping && onTyping) {
        onTyping(false);
      }
    };
  }, [isTyping, onTyping]);

  return (
    <div className="p-3 md:p-4 bg-background border-t">
      <div className="flex items-end space-x-2 md:space-x-3">
        {/* Attach File Button - Hidden on mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onAttachFile}
          disabled={disabled}
          className="hidden sm:flex flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Message Input Container */}
        <div className="flex-1 relative min-w-0">
          <Input
            value={message}
            onChange={handleInputChange}
            placeholder={placeholder || `Message ${roomName}...`}
            className="pr-12 md:pr-16 py-2 md:py-2.5 text-sm md:text-base rounded-2xl border-input focus:border-primary"
            onKeyPress={handleKeyPress}
            disabled={disabled}
          />
          
          {/* Emoji Button - Inside input on mobile */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEmojiPicker}
              disabled={disabled}
              className="p-1 h-8 w-8 hover:bg-muted/50"
            >
              <Smile className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Send Button */}
        <Button
          className="bg-chart-2 hover:bg-chart-2/90 flex-shrink-0 rounded-full p-2 md:p-2.5 h-10 w-10 md:h-11 md:w-11"
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
        >
          <Send className="h-4 w-4 md:h-5 md:w-5 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;