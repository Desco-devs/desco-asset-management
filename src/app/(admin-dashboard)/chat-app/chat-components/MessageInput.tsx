"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Smile } from "lucide-react";

interface MessageInputProps {
  roomName?: string;
  onSendMessage: (message: string) => void;
  onAttachFile?: () => void;
  onEmojiPicker?: () => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MessageInput = ({
  roomName,
  onSendMessage,
  onAttachFile,
  onEmojiPicker,
  onTyping,
  placeholder,
  disabled = false,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [onTyping, isTyping]);
  
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
    <div className="p-2 sm:p-4 bg-background">
      <div className="flex items-end space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAttachFile}
          disabled={disabled}
          className="hidden sm:flex"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={handleInputChange}
            placeholder={placeholder || `Message ${roomName}...`}
            className="pr-20"
            onKeyPress={handleKeyPress}
            disabled={disabled}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEmojiPicker}
              disabled={disabled}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          className="bg-chart-2"
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
          size="sm"
        >
          <Send className="h-6 w-6 text-white " />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
