import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import CashbookPage from './pages/CashbookPage';
import RemindersPage from './pages/RemindersPage';
import SettingsPage from './pages/SettingsPage';
import Loader from './components/Common/Loader';
import LandingPage from './pages/LandingPage';
import PermanentHistoryPage from './pages/PermanentHistoryPage';
import SecuritySetupPage from './pages/SecuritySetupPage';
import SecurityLockScreen from './components/Security/SecurityLockScreen';
import PaymentCheckoutPage from './pages/PaymentCheckoutPage';
import { initSocket } from './services/socket';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('udhaar-unlocked') === 'true');

  if (loading) return <Loader fullPage />;
  if (!user) return <Navigate to="/" />;

  if (!user.hasPin) {
    return <Navigate to="/security-setup" />;
  }

  if (!unlocked) {
    return <SecurityLockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullPage />;
  return user ? <Navigate to="/" /> : children;
};

const SecuritySetupRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullPage />;
  if (!user) return <Navigate to="/" />;
  if (user.hasPin) return <Navigate to="/" />;
  return children;
};

const IndexRoute = () => {
  const { user, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('udhaar-unlocked') === 'true');

  if (loading) return <Loader fullPage />;
  if (user) {
    if (!user.hasPin) {
      return <Navigate to="/security-setup" />;
    }
    if (!unlocked) {
      return <SecurityLockScreen onUnlock={() => setUnlocked(true)} />;
    }
    return <Layout><DashboardPage /></Layout>;
  }
  return <LandingPage />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
    <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/security-setup" element={<SecuritySetupRoute><SecuritySetupPage /></SecuritySetupRoute>} />
    <Route path="/pay/:customerId" element={<PaymentCheckoutPage />} />
    <Route path="/" element={<IndexRoute />} />
    <Route path="/customers" element={<ProtectedRoute><Layout><CustomersPage /></Layout></ProtectedRoute>} />
    <Route path="/customers/:id" element={<ProtectedRoute><Layout><CustomerDetailPage /></Layout></ProtectedRoute>} />
    <Route path="/transactions" element={<Navigate to="/customers" />} />
    <Route path="/cashbook" element={<ProtectedRoute><Layout><CashbookPage /></Layout></ProtectedRoute>} />
    <Route path="/reminders" element={<ProtectedRoute><Layout><RemindersPage /></Layout></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute><Layout><PermanentHistoryPage /></Layout></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
);

function App() {
  useEffect(() => {
    initSocket();
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "307628625740-9cjprtk1hpua2cmhanlee8nqpss26org.apps.googleusercontent.com"}>
            <LanguageProvider>
              <AppRoutes />
              <ToastContainer
                position="top-center"
                style={{ top: '10vh', left: '50%', transform: 'translateX(-50%)' }}
                autoClose={1500}
                hideProgressBar
                pauseOnHover={false}
                pauseOnFocusLoss={false}
              />
            </LanguageProvider>
          </GoogleOAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
