import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api/client.js";

const AuthContext = createContext(null);
const USER_KEY = "alf_user_profile";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setTokenState] = useState(() => getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = getToken();
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await api.auth.getMe();
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
      } catch (err) {
        console.warn("Session check failed or expired:", err.message);
        setToken(null);
        setTokenState(null);
        setUser(null);
        localStorage.removeItem(USER_KEY);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const saveAuthSession = (authToken, userProfile) => {
    setToken(authToken);
    setTokenState(authToken);
    setUser(userProfile);
    localStorage.setItem(USER_KEY, JSON.stringify(userProfile));
  };

  const register = async ({ full_name, email, password }) => {
    const data = await api.auth.register({
      full_name,
      email: email.trim().toLowerCase(),
      password,
    });
    saveAuthSession(data.access_token, data.user);
    return data.user;
  };

  const login = async ({ email, password }) => {
    const data = await api.auth.login({
      email: email.trim().toLowerCase(),
      password,
    });
    saveAuthSession(data.access_token, data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        register,
        login,
        logout,
        loading,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
