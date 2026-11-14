import { createContext, useContext, useEffect, useState } from "react";

import {
  loginUser,
  logoutUser,
  refreshSession,
  getCurrentUser,
} from "../services/auth.service.js";

import { clearAccessToken } from "../api/axios.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session when application starts
  useEffect(() => {
    const restoreSession = async () => {
      try {
        await refreshSession();

        const response = await getCurrentUser();
        setUser(response.user ?? response);
      } catch (error) {
        clearAccessToken();
        setUser(null);

        if (error.response?.status !== 401) {
          console.error("Session restoration failed:", error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
