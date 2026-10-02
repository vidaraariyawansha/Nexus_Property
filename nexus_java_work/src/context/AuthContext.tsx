import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSummary, UserRole } from '../types';
import { api } from '../api/client';

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
  role?: UserRole;
}

export interface RegisterResponse {
  token: string;
  user: UserSummary;
  verificationToken?: string;
}

interface AuthContextType {
  user: UserSummary | null;
  loading: boolean;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<UserSummary>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string; demoToken?: string }>;
  logout: () => Promise<void>;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  updateUserProfile: (data: { fullName?: string; phone?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = api.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const userData = await api.get<UserSummary>('/api/auth/me');
      setUser(userData);
    } catch {
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string, rememberMe: boolean = false): Promise<UserSummary> => {
    const res = await api.post<{ token: string; user: UserSummary }>('/api/auth/login', {
      email,
      password: pass,
      rememberMe,
    });
    api.setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: RegisterData): Promise<RegisterResponse> => {
    const res = await api.post<RegisterResponse>('/api/auth/register', data);
    api.setToken(res.token);
    setUser(res.user);
    return res;
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.post<{ success: boolean; message: string }>('/api/auth/verify-email', { token });
    if (user) {
      setUser({ ...user, emailVerified: true });
    }
    return res;
  };

  const resendVerification = async (email: string): Promise<{ success: boolean; message: string; demoToken?: string }> => {
    return await api.post<{ success: boolean; message: string; demoToken?: string }>('/api/auth/resend-verification', { email });
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore
    } finally {
      api.setToken(null);
      setUser(null);
    }
  };

  const quickDemoLogin = async (role: UserRole) => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      ADMIN: { email: 'admin@nexusproperty.com', pass: 'Admin@123' },
      AGENT: { email: 'agent.sarah@nexusproperty.com', pass: 'Agent@123' },
      PROPERTY_OWNER: { email: 'owner.david@nexusproperty.com', pass: 'Owner@123' },
      CUSTOMER: { email: 'customer.elena@nexusproperty.com', pass: 'Customer@123' },
    };
    const c = creds[role];
    await login(c.email, c.pass);
  };

  const updateUserProfile = async (data: { fullName?: string; phone?: string }) => {
    const updated = await api.put<UserSummary>('/api/auth/profile', data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyEmail,
        resendVerification,
        logout,
        quickDemoLogin,
        updateUserProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
