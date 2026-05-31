import { createContext, useState, useEffect } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const stored = JSON.parse(localStorage.getItem('udhaar-user'));
      if (stored?.token) {
        setUser(stored);
        try {
          const { data } = await API.get('/auth/me');
          if (data.success) {
            const freshUser = { ...stored, ...data.data };
            localStorage.setItem('udhaar-user', JSON.stringify(freshUser));
            setUser(freshUser);
          }
        } catch (err) {
          console.warn("Failed to fetch fresh user profile:", err);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  // Inactivity Auto-Logout Tracker (15 minutes of inactivity)
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        toast.info('Logged out due to 15 minutes of inactivity.', {
          toastId: 'inactivity-logout-toast', // prevent duplicates
        });
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    const userData = { ...data.data, token: data.token };
    sessionStorage.removeItem('udhaar-unlocked');
    localStorage.setItem('udhaar-user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    const userData = { ...data.data, token: data.token };
    localStorage.setItem('udhaar-user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const googleSignIn = async (token) => {
    const { data } = await API.post('/auth/google', { token });
    const userData = { ...data.data, token: data.token };
    sessionStorage.removeItem('udhaar-unlocked');
    localStorage.setItem('udhaar-user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const mockGoogleSignIn = async (email, name, avatar) => {
    const { data } = await API.post('/auth/google-mock', { email, name, avatar });
    const userData = { ...data.data, token: data.token };
    sessionStorage.removeItem('udhaar-unlocked');
    localStorage.setItem('udhaar-user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('udhaar-user');
    sessionStorage.removeItem('udhaar-unlocked');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    localStorage.setItem('udhaar-user', JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleSignIn, mockGoogleSignIn, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
