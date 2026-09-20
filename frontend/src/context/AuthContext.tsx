import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IUser } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  deskNumber: number | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  autoLoginDesk: (deskNum?: number) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('hackflow_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token: newToken, user: newUser } = res.data;
        localStorage.setItem('hackflow_token', newToken);
        setToken(newToken);
        setUser(newUser);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Server error occurred during login';
      return { success: false, message: msg };
    }
  };

  const autoLoginDesk = async (deskNum: number = 1) => {
    const creds =
      deskNum === 2
        ? { email: 'desk2@hackathon.org', password: 'desk2pass123' }
        : { email: 'desk1@hackathon.org', password: 'desk1pass123' };
    return login(creds.email, creds.password);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('hackflow_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success && res.data.user) {
            setUser(res.data.user);
            setLoading(false);
            return;
          }
        } catch (err) {
          localStorage.removeItem('hackflow_token');
          setToken(null);
        }
      }

      // If opening desk or pool on local machine without valid session, auto-authenticate to desk
      const path = window.location.pathname;
      if (!path.startsWith('/portal') && !path.startsWith('/scanner') && !path.startsWith('/login')) {
        const deskNum = path.includes('desk2') ? 2 : 1;
        await autoLoginDesk(deskNum);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('hackflow_token');
    setToken(null);
    setUser(null);
  };

  const deskNumber = user?.deskNumber || (user?.role === 'REGISTRATION_DESK_1' ? 1 : user?.role === 'REGISTRATION_DESK_2' ? 2 : null);

  return (
    <AuthContext.Provider value={{ user, token, deskNumber, login, autoLoginDesk, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
