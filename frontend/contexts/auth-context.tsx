import React, { createContext, useState, ReactNode } from 'react';

type AuthContextType = {
  isLoggedIn: boolean;
  userId: string | null;
  userName?: string | null;
  login: (phoneOrEmail: string, name?: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const login = (phoneOrEmail: string, name?: string) => {
    setIsLoggedIn(true);
    setUserId(phoneOrEmail);
    if (name) setUserName(name);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userId, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
