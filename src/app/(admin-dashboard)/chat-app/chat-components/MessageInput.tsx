"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Smile } from "lucide-react";

interface MessageInputProps {
  roomName?: string;
  onSendMessage: (message: string) => void;
  onAttachFile?: () => void;
  onEmojiPicker?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const MessageInput = ({
  roomName,
  onSendMessage,
  onAttachFile,
  onEmojiPicker,
  placeholder,
  disabled = false,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
            onChange={(e) => setMessage(e.target.value)}
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
