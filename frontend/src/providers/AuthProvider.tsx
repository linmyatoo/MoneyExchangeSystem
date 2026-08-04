'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, AuthState } from '@/types/auth';
import { apiClient } from '@/lib/axios';

interface AuthContextType extends AuthState {
  login: (access_token: string, refresh_token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  
  const router = useRouter();
  const pathname = usePathname();

  const login = (access_token: string, refresh_token: string, user: User) => {
    sessionStorage.setItem('access_token', access_token);
    sessionStorage.setItem('refresh_token', refresh_token);
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    
    if (user.role.name === 'staff') {
      router.push('/dashboard/wallet-transactions');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Failed to log out on backend', e);
    }
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    router.push('/login');
  };

  const checkAuth = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        throw new Error('No token');
      }
      
      const response = await apiClient.get('/auth/me');
      setState({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      // Don't auto-redirect here, let the ProtectedLayout handle it
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
