'use client';

import React from 'react';

interface ChatAppLayoutProps {
  children: React.ReactNode;
}

export default function ChatAppLayout({ children }: ChatAppLayoutProps) {
  return (
    <div className="h-full w-full">
      {children}
    </div>
  );
}