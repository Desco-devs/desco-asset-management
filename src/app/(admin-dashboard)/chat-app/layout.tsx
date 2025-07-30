'use client';

import React from 'react';
import { SupabaseRealtimeProvider } from '@/context/SupabaseRealtimeContext';

interface ChatAppLayoutProps {
  children: React.ReactNode;
}

export default function ChatAppLayout({ children }: ChatAppLayoutProps) {
  return (
    <SupabaseRealtimeProvider>
      {children}
    </SupabaseRealtimeProvider>
  );
}