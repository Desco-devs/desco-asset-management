"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase";
import { User, AuthContextType } from "@/types/auth";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useOnlineHeartbeat, useSetOffline } from "@/hooks/api/use-online-status";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  useSetOffline(user?.id);

  // Use heartbeat system for online status
  useOnlineHeartbeat(user?.id);

  const fetchUserProfile = useCallback(async (userId: string) => {
    console.log('🔄 fetchUserProfile: Starting for user:', userId);
    try {
      // Create abort controller for better timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout

      const response = await fetch(`/api/users/${userId}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Clear timeout if request completed
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ fetchUserProfile: Success', userData);
        setUserState(userData);
        
        // Update Supabase user metadata with role for middleware access
        if (userData.role) {
          try {
            await supabase.auth.updateUser({
              data: { 
                role: userData.role,
                user_status: userData.user_status || 'ACTIVE',
                full_name: userData.full_name
              }
            });
          } catch (metadataError) {
            console.error("Error updating user metadata:", metadataError);
          }
        }
      } else {
        console.error('❌ fetchUserProfile: HTTP error', response.status, response.statusText);
        // Try to get error details
        try {
          const errorData = await response.json();
          console.error('❌ fetchUserProfile: Error details', errorData);
        } catch (parseError) {
          console.error('❌ fetchUserProfile: Could not parse error response');
        }
        setLoading(false);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error("❌ fetchUserProfile: Request timeout after 10 seconds");
        } else {
          console.error("❌ fetchUserProfile: Error:", error.message);
        }
      } else {
        console.error("❌ fetchUserProfile: Unknown error:", error);
      }
      // Don't let auth hang if user profile fails
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Get initial user with server verification
    const getInitialUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        setSupabaseUser(user);
        await fetchUserProfile(user.id);
      }
      setLoading(false);
    };

    getInitialUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          // Verify user with server on sign in
          const { data: { user }, error } = await supabase.auth.getUser();
          if (user && !error) {
            setSupabaseUser(user);
            await fetchUserProfile(user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setUserState(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // Handle page unload for online status
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      // User is closing/refreshing the page - set offline
      // Use sendBeacon for reliability during page unload
      const blob = new Blob([JSON.stringify({ is_online: false })], {
        type: 'application/json'
      });
      navigator.sendBeacon('/api/users/online-status', blob);
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      // Clear user state first to prevent race conditions
      setUserState(null);
      setSupabaseUser(null);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: 'local' // Only clear local session, not all sessions
      });
      
      if (error) {
        console.warn('Supabase signOut error:', error);
        // Don't throw error - we've already cleared local state
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if offline status fails, continue with logout
      setUserState(null);
      setSupabaseUser(null);
      
      await supabase.auth.signOut({ scope: 'local' });
    }
  };

  const setUser = (u: User | null) => setUserState(u);
  const clearUser = () => {
    setUserState(null);
    setSupabaseUser(null);
  };

  const refreshUser = async () => {
    if (supabaseUser?.id) {
      await fetchUserProfile(supabaseUser.id);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      supabaseUser, 
      setUser, 
      clearUser, 
      loading, 
      signIn, 
      signOut,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
