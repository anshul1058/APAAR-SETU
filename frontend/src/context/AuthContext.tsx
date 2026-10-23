import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (email: string, role?: UserRole) => Promise<UserProfile>;
  logout: () => void;
  isDemoMode: boolean;
  autoRefreshCountdown: number;
  isAutoRefreshPaused: boolean;
  toggleAutoRefreshPause: () => void;
  refreshTrigger: number;
  isAiAssistantOpen: boolean;
  setIsAiAssistantOpen: (open: boolean) => void;
  openAiWithContext: (initialPrompt?: string) => void;
  aiInitialPrompt: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [isDemoMode] = useState<boolean>(true);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number>(15);
  const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');

  // 15-second Demo Auto-Refresh Loop
  useEffect(() => {
    if (isAutoRefreshPaused || !user) return;

    const interval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          setRefreshTrigger((t) => t + 1);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoRefreshPaused, user]);

  const login = async (email: string, role?: UserRole): Promise<UserProfile> => {
    const res = await authService.login(email, role);
    setUser(res.user);
    setToken(res.token);
    setAutoRefreshCountdown(15);
    return res.user;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const toggleAutoRefreshPause = () => {
    setIsAutoRefreshPaused((prev) => !prev);
  };

  const openAiWithContext = (prompt = '') => {
    setAiInitialPrompt(prompt);
    setIsAiAssistantOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isDemoMode,
        autoRefreshCountdown,
        isAutoRefreshPaused,
        toggleAutoRefreshPause,
        refreshTrigger,
        isAiAssistantOpen,
        setIsAiAssistantOpen,
        openAiWithContext,
        aiInitialPrompt
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
