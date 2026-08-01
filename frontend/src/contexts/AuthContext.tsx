import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { storage } from '../utils/storage';

export interface User {
  id: string;
  name?: string;
  ownerName?: string;
  gymName?: string;
  email: string;
  role: 'super_admin' | 'gym_owner';
  status?: 'pending_activation' | 'active' | 'suspended';
  subscription?: {
    planType: string;
    startDate: string;
    expiryDate: string;
    status: 'active' | 'expired' | 'suspended';
    amountPaid: number;
  };
  branding?: {
    gymLogo?: string;
    gymName: string;
    address: string;
    contactNumber: string;
    whatsAppNumber: string;
  };
  isTrial?: boolean;
  subscriptionHistory?: any[];
  authProviders?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUserBranding: (branding: NonNullable<User['branding']>) => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isGymOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    async function restoreSession() {
      const token = await storage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.user) {
            // Map keys
            const mappedUser: User = {
              id: res.user._id,
              name: res.user.name,
              ownerName: res.user.ownerName,
              gymName: res.user.gymName,
              email: res.user.email,
              role: res.user.role || (res.user.passwordHash ? 'gym_owner' : 'super_admin'),
              subscription: res.user.subscription,
              branding: res.user.branding,
              isTrial: res.user.isTrial,
              status: res.user.status,
              subscriptionHistory: res.user.subscriptionHistory,
              authProviders: res.user.authProviders || ['password']
            };
            setUser(mappedUser);
            await storage.setItem('user', JSON.stringify(mappedUser));
          } else {
            await logout();
          }
        } catch (err) {
          console.error('Session restore failed:', err);
          await logout();
        }
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.token && res.user) {
      await storage.setItem('token', res.token);
      const mappedUser: User = {
        id: res.user.id,
        name: res.user.name,
        ownerName: res.user.ownerName,
        gymName: res.user.gymName,
        email: res.user.email,
        role: res.user.role,
        subscription: res.user.subscription,
        branding: res.user.branding,
        isTrial: res.user.isTrial,
        status: res.user.status,
        subscriptionHistory: res.user.subscriptionHistory,
        authProviders: res.user.authProviders || ['password']
      };
      setUser(mappedUser);
      await storage.setItem('user', JSON.stringify(mappedUser));
    }
  };

  const loginWithToken = async (token: string, rawUser: any) => {
    await storage.setItem('token', token);
    const mappedUser: User = {
      id: rawUser._id || rawUser.id,
      name: rawUser.name || rawUser.ownerName,
      ownerName: rawUser.ownerName,
      gymName: rawUser.gymName,
      email: rawUser.email,
      role: rawUser.role || 'gym_owner',
      subscription: rawUser.subscription,
      branding: rawUser.branding,
      isTrial: rawUser.isTrial,
      status: rawUser.status,
      subscriptionHistory: rawUser.subscriptionHistory,
      authProviders: rawUser.authProviders || ['password']
    };
    setUser(mappedUser);
    await storage.setItem('user', JSON.stringify(mappedUser));
  };

  const logout = async () => {
    await storage.removeItem('token');
    await storage.removeItem('user');
    setUser(null);
  };

  const updateUserBranding = async (newBranding: NonNullable<User['branding']>) => {
    if (user) {
      const updated = { ...user, branding: newBranding, gymName: newBranding.gymName };
      setUser(updated);
      await storage.setItem('user', JSON.stringify(updated));
    }
  };

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'super_admin';
  const isGymOwner = user?.role === 'gym_owner';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithToken,
        logout,
        updateUserBranding,
        isAuthenticated,
        isSuperAdmin,
        isGymOwner
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
