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
  const setOffline = useSetOffline();

  // Use heartbeat system for online status
  useOnlineHeartbeat(!!user);

  const fetchUserProfile = useCallback(async (userId: string) => {
    console.log('🔄 fetchUserProfile: Starting for user:', userId);
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User profile fetch timeout')), 10000);
      });
      
      const fetchPromise = fetch(`/api/users/${userId}`);
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
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
        console.error('❌ fetchUserProfile: HTTP error', response.status);
        // Still set loading to false even if user fetch fails
        setLoading(false);
      }
    } catch (error) {
      console.error("❌ fetchUserProfile: Error:", error);
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
          // Set user offline before clearing state
          setOffline();
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
    // Set user offline before signing out
    setOffline();
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // State will be cleared by onAuthStateChange event automatically
    // This prevents race conditions with ClientAuthGuard
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
