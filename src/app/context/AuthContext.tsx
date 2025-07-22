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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
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
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      supabaseUser, 
      setUser, 
      clearUser, 
      loading, 
      signIn, 
      signOut 
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
