import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Common/Logo';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineX } from 'react-icons/hi';
import { useGoogleLogin } from '@react-oauth/google';

const mockGoogleAccounts = [
  {
    name: 'Akhilesh Goud',
    email: 'akhilesh.goud@mock.digitaludhaar.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'
  },
  {
    name: 'Punju Store Owner',
    email: 'punju.store@mock.digitaludhaar.com',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150'
  },
  {
    name: 'Demo Merchant',
    email: 'demo.merchant@mock.digitaludhaar.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150'
  }
];

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMockChooser, setShowMockChooser] = useState(false);
  const { login, googleSignIn, mockGoogleSignIn } = useAuth();
  const navigate = useNavigate();

  const googleLoginTrigger = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setLoading(true);
      try {
        await googleSignIn(tokenResponse.access_token);
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.message || 'Google Sign-In failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setShowMockChooser(true);
    }
  });

  const handleGoogleClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('dummy')) {
      setShowMockChooser(true);
      return;
    }
    try {
      googleLoginTrigger();
    } catch (err) {
      setShowMockChooser(true);
    }
  };

  const handleMockSelect = async (mockAccount) => {
    setShowMockChooser(false);
    setError('');
    setLoading(true);
    try {
      await mockGoogleSignIn(mockAccount.email, mockAccount.name, mockAccount.avatar);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light-cream to-soft-white p-5 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute w-[500px] h-[500px] bg-radial from-orange/5 to-transparent -top-[100px] -right-[100px] rounded-full"></div>
      <div className="absolute w-[400px] h-[400px] bg-radial from-info-analytics/5 to-transparent -bottom-[80px] -left-[80px] rounded-full"></div>
      
      <div className="w-full max-w-md p-10 bg-pure-white border border-soft-gray rounded-2xl shadow-lg relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-light-cream border border-soft-gray flex items-center justify-center p-2 shadow-inner">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-deep-navy mb-1">Login</h1>
          <p className="text-sm text-slate-gray">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="bg-red-give/10 border border-red-give/20 rounded-lg p-3.5 mb-4 text-red-give text-sm text-center font-medium animate-pulse">
            {error}
          </div>
        )}
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input 
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all"
              type="email" 
              placeholder="you@example.com" 
              required
              value={form.email} 
              onChange={(e) => setForm({...form, email: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input 
                className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all pr-12"
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                required
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-gray cursor-pointer p-1 flex items-center justify-center hover:text-deep-navy transition-colors"
              >
                {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link to="/forgot-password" className="text-xs font-semibold text-orange hover:underline">
                Forgot Password?
              </Link>
            </div>
          </div>
          <button 
            className="w-full py-3.5 px-6 font-semibold text-sm rounded-lg bg-orange text-white hover:bg-orange-hover transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-soft-gray" />
          <span className="text-xs text-slate-gray font-medium">or</span>
          <div className="flex-1 h-px bg-soft-gray" />
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-white border border-soft-gray rounded-lg text-deep-navy text-sm font-semibold hover:bg-light-cream/60 hover:border-slate-gray/40 transition-all shadow-sm cursor-pointer"
        >
          {/* Official Google G Logo */}
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        <div className="text-center mt-2.5">
          <button
            type="button"
            onClick={() => setShowMockChooser(true)}
            className="text-[11px] text-orange hover:text-orange-hover font-semibold transition-colors bg-transparent border-none cursor-pointer hover:underline"
          >
            Google Auth blocked? Try Simulated Accounts
          </button>
        </div>

        <div className="text-center mt-5 text-sm text-slate-gray">
          Don't have an account? <Link to="/register" className="text-orange font-semibold hover:underline">Sign up</Link>
        </div>
      </div>

      {showMockChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full relative">
            <button 
              onClick={() => setShowMockChooser(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-50"
            >
              <HiOutlineX size={20} />
            </button>

            <div className="text-center mb-6">
              {/* Official Google G Logo */}
              <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl p-2 shadow-inner">
                <svg width="24" height="24" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-deep-navy">Sign in with Google</h2>
              <p className="text-xs text-slate-gray mt-1">Select an account to log into Digital Udhaar</p>
            </div>

            <div className="space-y-2.5">
              {mockGoogleAccounts.map((account, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMockSelect(account)}
                  className="w-full flex items-center gap-3 p-3 text-left border border-slate-100 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <img src={account.avatar} alt={account.name} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{account.name}</p>
                    <p className="text-xs text-slate-400 truncate">{account.email}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 text-[10px] text-slate-400 text-center leading-relaxed">
              Google Sign-In is configured. If you deploy to production, verify you have configured the <code className="bg-slate-50 px-1 py-0.5 rounded text-red-500 font-mono">VITE_GOOGLE_CLIENT_ID</code> env variable.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
