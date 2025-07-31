"use client";

import { Skeleton } from "@/components/ui/skeleton";

export const RoomsListSkeleton = () => {
  return (
    <div className="space-y-2 p-4">
      {/* Search skeleton */}
      <Skeleton className="h-9 w-full rounded-md" />
      
      {/* Room items skeleton */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
          {/* Avatar */}
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          
          <div className="flex-1 min-w-0 space-y-2">
            {/* Room name */}
            <Skeleton className="h-4 w-3/4" />
            
            {/* Last message */}
            <Skeleton className="h-3 w-1/2" />
          </div>
          
          {/* Time and unread badge area */}
          <div className="flex flex-col items-end space-y-1">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MessagesListSkeleton = () => {
  return (
    <div className="flex-1 space-y-4 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div 
          key={i} 
          className={`flex space-x-3 ${i % 3 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          {/* Avatar for received messages */}
          {i % 3 !== 0 && (
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          )}
          
          <div className={`max-w-xs space-y-2 ${i % 3 === 0 ? 'items-end' : 'items-start'} flex flex-col`}>
            {/* Message bubble */}
            <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-48' : 'w-32'} rounded-2xl`} />
            
            {/* Timestamp */}
            <Skeleton className="h-3 w-12" />
          </div>
          
          {/* Avatar for sent messages */}
          {i % 3 === 0 && (
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
};

export const ChatHeaderSkeleton = () => {
  return (
    <div className="flex w-full items-center justify-between py-2 border-b bg-background px-4">
      <div className="flex items-center gap-2 flex-1">
        {/* Mobile menu button skeleton */}
        <Skeleton className="h-8 w-8 rounded md:hidden" />
        
        {/* Avatar */}
        <Skeleton className="h-8 w-8 rounded-full hidden sm:block" />
        
        <div className="flex-1 space-y-1">
          {/* Room name */}
          <Skeleton className="h-4 w-32" />
          
          {/* Room info */}
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Action buttons */}
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
};

export const MessageInputSkeleton = () => {
  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end space-x-2">
        {/* Input area */}
        <Skeleton className="flex-1 h-10 rounded-md" />
        
        {/* Send button */}
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
  );
};

export const ChatAppSkeleton = () => {
  return (
    <div className="flex h-full bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex md:w-80 border-r bg-card">
        <RoomsListSkeleton />
      </div>

      {/* Main chat area skeleton */}
      <div className="flex-1 flex flex-col">
        <ChatHeaderSkeleton />
        <MessagesListSkeleton />
        <MessageInputSkeleton />
      </div>
    </div>
  );
};