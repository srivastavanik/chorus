'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useCanvasStore } from '@/lib/store';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  signup: (email: string, pass: string, name?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setStoreUser = useCanvasStore((state) => state.setUser);

  const checkUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUserState(data.user);
        setStoreUser(data.user);
      } else {
        setUserState(null);
        setStoreUser(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [setStoreUser]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      setUserState(data.user);
      setStoreUser(data.user);
      return {};
    } catch {
      return { error: 'Login failed' };
    }
  };

  const signup = async (email: string, pass: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass, name }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      return {};
    } catch {
      return { error: 'Signup failed' };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUserState(null);
    setStoreUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUserState(updatedUser);
      setStoreUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
