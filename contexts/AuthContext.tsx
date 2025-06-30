import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import {
  getHasSeenWelcome,
  setHasSeenWelcome,
  resetHasSeenWelcome,
} from '@/utils/onboarding';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  profile?: Profile;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  hasSeenWelcome: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    username: string,
    avatarUrl?: string
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
  completeOnboarding: () => void;
  resetOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for both checks to complete before proceeding
        const [seen, { data }] = await Promise.all([
          getHasSeenWelcome(),
          supabase.auth.getSession(),
        ]);
        
        const currentSession = data.session;

        setHasSeenWelcome(seen);
        setSession(currentSession);

        if (currentSession?.user) {
          updateUserFromSession(currentSession);
          await fetchProfile(currentSession.user.id);
        }
      } catch (e) {
        console.error("Error initializing app state:", e);
      } finally {
        // Only set loading to false after all initial checks are complete
        setIsLoading(false);
      }
    };

    initializeApp();

    // Listen for subsequent auth changes without affecting initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          updateUserFromSession(session);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const updateUserFromSession = (session: Session) => {
    const supabaseUser = session.user;
    const userData: User = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name:
        supabaseUser.user_metadata?.username ||
        supabaseUser.email?.split('@')[0] ||
        'User',
      avatar:
        supabaseUser.user_metadata?.avatar_url ||
        'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
    };
    setUser(userData);
  };

  const fetchProfile = async (userId: string | null | undefined) => {
    if (!userId) {
      console.warn('fetchProfile called with null or undefined userId');
      return;
    }
    console.log('[fetchProfile] Fetching profile for userId:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1);

      console.log('[fetchProfile] Supabase data:', data);
      if (error) {
        console.error('[fetchProfile] Supabase error:', error);
      }

      if (data && data.length > 0) {
        const profile = data[0];
        setProfile(profile);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: profile.username || prev.name,
                avatar: profile.avatar_url || prev.avatar,
                profile: profile,
              }
            : null
        );
      } else {
        // No profile found, set to null and reset user data to defaults
        setProfile(null);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: prev.email?.split('@')[0] || 'User',
                avatar:
                  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
                profile: undefined,
              }
            : null
        );
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      // Immediately update context after login
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession?.user) {
        updateUserFromSession(newSession);
        await fetchProfile(newSession.user?.id);
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    username: string,
    avatarUrl?: string
  ): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);

      // Validate username format
      if (!username.startsWith('@')) {
        return { error: 'Username must start with @' };
      }

      const usernameWithoutAt = username.slice(1);
      if (usernameWithoutAt.length < 3) {
        return {
          error: 'Username must be at least 4 characters long (including @)',
        };
      }

      if (!/^[a-zA-Z0-9_]+$/.test(usernameWithoutAt)) {
        return {
          error:
            'Username can only contain letters, numbers, and underscores after @',
        };
      }

      // Check if username is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingProfile) {
        return { error: 'Username is already taken' };
      }

      const {
        data: { session: newSession, user: newUser },
        error,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username,
            avatar_url: avatarUrl,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (newSession?.user) {
        updateUserFromSession(newSession);
        await fetchProfile(newSession.user.id);
      } else if (newUser) {
        // If sign up requires confirmation, user object might be returned instead of session
        setUser({
          id: newUser.id,
          email: newUser.email || '',
          name: username,
          avatar: avatarUrl || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
        });
      }

      return {};
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      // Reset user state
      setUser(null);
      setProfile(null);
      setSession(null);
      // Reset onboarding
      await resetOnboarding();
    } catch (error) {
      console.error('Error during sign out process:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (
    updates: Partial<Profile>
  ): Promise<{ error?: string }> => {
    try {
      if (!user) {
        return { error: 'No user logged in' };
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { error: error.message };
      }

      // Refresh profile data
      if (user?.id) {
        await fetchProfile(user.id);
      }
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const completeOnboarding = async () => {
    await setHasSeenWelcome(true);
    setHasSeenWelcome(true);
  };

  const resetOnboarding = async () => {
    await resetHasSeenWelcome();
    setHasSeenWelcome(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoggedIn: !!session,
        isLoading,
        hasSeenWelcome,
        signIn,
        signUp,
        signOut,
        updateProfile,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
