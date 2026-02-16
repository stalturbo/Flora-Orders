import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { User, Organization } from '@/lib/types';
import { api, getToken, setToken } from '@/lib/api';

interface AuthContextValue {
  currentUser: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, organizationName: string, devPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initialize = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) {
        const { user, organization: org } = await api.auth.me();
        setCurrentUser(user);
        setOrganization(org);
      }
    } catch (error) {
      console.error('Auth init error:', error);
      await setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = useCallback(async (email: string, password: string) => {
    const { user, organization: org, token } = await api.auth.login({ email, password });
    await setToken(token);
    setCurrentUser(user);
    setOrganization(org);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, organizationName: string, devPassword: string) => {
    const { user, organization: org, token } = await api.auth.register({ 
      email, 
      password, 
      name, 
      organizationName,
      devPassword
    });
    await setToken(token);
    setCurrentUser(user);
    setOrganization(org);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (e) {}
    await setToken(null);
    setCurrentUser(null);
    setOrganization(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user, organization: org } = await api.auth.me();
      setCurrentUser(user);
      setOrganization(org);
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  }, []);

  const value = useMemo(() => ({
    currentUser,
    organization,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }), [currentUser, organization, isLoading, login, register, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
