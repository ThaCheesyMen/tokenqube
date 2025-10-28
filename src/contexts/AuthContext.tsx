import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { heartbeatService } from '../services/HeartbeatService';
import { errorHandler } from '../utils/errorHandler';
import { toast } from '../components/Toast';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      errorHandler.handle(error, 'AuthContext:fetchProfile');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        heartbeatService.start(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
          heartbeatService.start(session.user.id);
        } else {
          setProfile(null);
          heartbeatService.stop();
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
      if (user) {
        heartbeatService.stop(user.id);
      }
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (error) throw error;

    // If signup successful and we have a user, create profile manually
    if (data.user) {
      const userId = data.user.id;
      
      try {
        // Wait for database trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile was created by trigger
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        
        if (existingProfile) {
          console.log('Profile created successfully by database trigger');
        } else {
          // Trigger didn't work, create profile manually
          console.log('Trigger failed, creating profile manually...');
          
          // Generate referral code
          const referralCode = 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
          
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              username: username,
              referral_code: referralCode,
              token_balance: 100,
              total_earned: 100,
              total_spent: 0,
              total_tokens: 100,
              total_referrals: 0,
              signup_bonus_claimed: true,
              status: 'online',
              profile_visibility: 'public',
              profile_theme: 'default',
              show_email: false,
              show_games: true,
              show_activity: true
            });
          
          if (profileError) {
            console.error('Error creating profile manually:', profileError);
            throw profileError;
          }
          
          // Create signup bonus transaction
          await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              amount: 100,
              type: 'signup_bonus',
              description: 'Welcome bonus for signing up!'
            });
          
          console.log('Profile created manually successfully');
        }
        
        // Refresh profile to get the data
        await refreshProfile();
      } catch (err) {
        errorHandler.handle(err, 'AuthContext:signUp:profileCreation');
        // Don't throw - user is already created, they can still log in
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('Welcome back!');
    } catch (error) {
      errorHandler.handle(error, 'AuthContext:signIn');
      throw error; // Re-throw for UI to handle
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await heartbeatService.stop(user.id);
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error) {
      errorHandler.handle(error, 'AuthContext:signOut');
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
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
