import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type UserRole = 'user' | 'vip' | 'moderator' | 'support' | 'developer' | 'admin' | 'super_admin';

interface RoleHierarchy {
  [key: string]: number;
}

const roleHierarchy: RoleHierarchy = {
  super_admin: 100,
  admin: 90,
  developer: 80,
  moderator: 50,
  support: 40,
  vip: 20,
  user: 10
};

export function useRole() {
  const { profile } = useAuth();
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchUserRole();
    }
  }, [profile]);

  const fetchUserRole = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', profile.id)
        .single();

      if (data) {
        setRole((data.role as UserRole) || 'user');
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    const userLevel = roleHierarchy[role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isModerator = (): boolean => {
    return hasRole('moderator');
  };

  const isSupport = (): boolean => {
    return hasRole('support');
  };

  const isDeveloper = (): boolean => {
    return hasRole('developer');
  };

  const isSuperAdmin = (): boolean => {
    return role === 'super_admin';
  };

  return {
    role,
    loading,
    hasRole,
    isAdmin,
    isModerator,
    isSupport,
    isDeveloper,
    isSuperAdmin
  };
}

