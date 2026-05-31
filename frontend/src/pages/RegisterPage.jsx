import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Common/Logo';
import { HiOutlineEye, HiOutlineEyeOff, HiPlus, HiOutlineX } from 'react-icons/hi';
import { useGoogleLogin } from '@react-oauth/google';

const mockGoogleAccounts = [
  {
    name: 'Nandashivareddy Gannapureddy',
    email: 'nandashivareddygannapureddy@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'
  },
  {
    name: 'Akhilesh Goud',
    email: 'akhilesh.goud@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150'
  },
  {
    name: 'Demo Merchant',
    email: 'demo.merchant@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150'
  }
];

// Helper to safely convert raw ASCII SVG to a standard Base64 Data URL
const svgToBase64 = (svgMarkup) => {
  return `data:image/svg+xml;base64,${btoa(svgMarkup.trim())}`;
};

const storeSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#E0F2FE"/>
  <rect x="25" y="55" width="50" height="25" rx="2" fill="#0EA5E9"/>
  <path d="M20 45h60l-5 12H25l-5-12z" fill="#0284C7"/>
  <path d="M20 45l5-8h50l5 8H20z" fill="#0369A1"/>
  <rect x="42" y="62" width="16" height="18" rx="1" fill="#F8FAFC"/>
  <circle cx="46" cy="71" r="1.5" fill="#64748B"/>
  <rect x="29" y="62" width="10" height="10" rx="1" fill="#38BDF8"/>
  <rect x="61" y="62" width="10" height="10" rx="1" fill="#38BDF8"/>
</svg>
`;

const maleSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#E6F4F1"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#0D9488"/>
  <rect x="45" y="52" width="10" height="12" fill="#F3B395"/>
  <circle cx="50" cy="42" r="16" fill="#F8C4AD"/>
  <path d="M34 38c2-10 10-14 16-14s14 4 16 14c-1-5-6-8-16-8s-15 3-16 8z" fill="#2E2219"/>
  <path d="M33 38c0-3 3-8 8-10h18c5 2 8 7 8 10v4h-4c-2-3-6-4-10-4s-8 1-10 4h-2v-4z" fill="#2E2219"/>
  <circle cx="45" cy="42" r="1.8" fill="#2E2219"/>
  <circle cx="55" cy="42" r="1.8" fill="#2E2219"/>
  <path d="M47 48.5c1.5 1.5 4.5 1.5 6 0" stroke="#2E2219" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;

const femaleSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#FDF2F8"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#EC4899"/>
  <rect x="45" y="52" width="10" height="12" fill="#F3B395"/>
  <circle cx="50" cy="42" r="16" fill="#F8C4AD"/>
  <path d="M34 44c-1-8 4-16 16-16s17 8 16 16c0 10-2 15-4 17-2-6-5-9-12-9s-10 3-12 9c-2-2-4-7-4-17z" fill="#4B3621"/>
  <path d="M34 35c3-6 10-7 16-7s13 1 16 7" stroke="#4B3621" stroke-width="3" stroke-linecap="round"/>
  <circle cx="45" cy="42" r="1.8" fill="#2E2219"/>
  <circle cx="55" cy="42" r="1.8" fill="#2E2219"/>
  <path d="M47 48.5c1.5 1.5 4.5 1.5 6 0" stroke="#2E2219" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;

const ledgerSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#FFFBEB"/>
  <rect x="30" y="28" width="40" height="48" rx="4" fill="#F59E0B"/>
  <rect x="34" y="28" width="36" height="48" rx="2" fill="#D97706"/>
  <rect x="26" y="34" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="44" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="54" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="64" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <path d="M44 42h12M44 47h9M49 42c3.5 0 5 2 5 4s-1.5 4-5 4h-4l6 7" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const presets = [
  { label: 'Store', value: svgToBase64(storeSvg) },
  { label: 'Male Merchant', value: svgToBase64(maleSvg) },
  { label: 'Female Merchant', value: svgToBase64(femaleSvg) },
  { label: 'Ledger Book', value: svgToBase64(ledgerSvg) }
];

const RegisterPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    storeName: '',
    phone: '',
    avatar: presets[0].value
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMockChooser, setShowMockChooser] = useState(false);
  const { register, googleSignIn, mockGoogleSignIn } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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
      setError(err.response?.data?.message || 'Simulated Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const phoneParam = query.get('phone');
    if (phoneParam) {
      setForm(prev => ({ ...prev, phone: `+91 ${phoneParam}` }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const update = (field) => (e) => setForm({...form, [field]: e.target.value});

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light-cream to-soft-white p-5 relative overflow-hidden py-12">
      {/* Decorative background shapes */}
      <div className="absolute w-[500px] h-[500px] bg-radial from-orange/5 to-transparent -top-[100px] -right-[100px] rounded-full"></div>
      <div className="absolute w-[400px] h-[400px] bg-radial from-info-analytics/5 to-transparent -bottom-[80px] -left-[80px] rounded-full"></div>

      <div className="w-full max-w-md p-8 bg-pure-white border border-soft-gray rounded-2xl shadow-lg relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-light-cream border border-soft-gray flex items-center justify-center p-2 shadow-inner">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-deep-navy mb-1">Create Account</h1>
          <p className="text-sm text-slate-gray">Start managing your store's khata digitally</p>
        </div>
        
        {error && (
          <div className="bg-red-give/10 border border-red-give/20 rounded-lg p-3.5 mb-4 text-red-give text-sm text-center font-medium animate-pulse">
            {error}
          </div>
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          
          <div className="flex flex-col gap-2.5 mb-2">
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider">
              Profile Picture
            </label>
            <div className="flex items-center gap-5 p-4 bg-light-cream/30 border border-soft-gray rounded-xl w-full">
              {/* Avatar Preview */}
              <div className="relative w-20 h-20 shrink-0">
                <div 
                  className="w-20 h-20 rounded-full bg-light-cream/40 border-2 border-orange flex items-center justify-center overflow-hidden cursor-pointer shadow-md hover:scale-105 transition-transform"
                  onClick={() => fileInputRef.current.click()}
                >
                  {form.avatar ? (
                    <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-gray">Upload</span>
                  )}
                </div>
                {/* Plus badge */}
                <div className="absolute bottom-0.5 right-0.5 bg-orange w-6 h-6 rounded-full flex items-center justify-center text-white border-2 border-pure-white pointer-events-none">
                  <HiPlus size={14} />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Presets Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-gray font-medium">
                  Select preset or upload custom photo:
                </span>
                <div className="flex gap-2.5">
                  {presets.map((p, idx) => {
                    const isSelected = form.avatar === p.value;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setForm({ ...form, avatar: p.value })}
                        className={`w-11 h-11 rounded-full border cursor-pointer flex items-center justify-center overflow-hidden p-0 transition-all ${
                          isSelected 
                            ? 'border-2 border-orange scale-110 shadow-lg shadow-orange/15' 
                            : 'border-soft-gray hover:scale-105'
                        }`}
                      >
                        <img src={p.value} alt={p.label} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Your Name
            </label>
            <input 
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all"
              placeholder="Rajesh Kumar" 
              required 
              value={form.name} 
              onChange={update('name')} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Store Name
            </label>
            <input 
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all"
              placeholder="Kumar General Store" 
              required 
              value={form.storeName} 
              onChange={update('storeName')} 
            />
          </div>
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
              onChange={update('email')} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Phone Number
            </label>
            <input 
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all"
              placeholder="+91 9876543210" 
              value={form.phone} 
              onChange={update('phone')} 
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
                placeholder="Min 6 characters" 
                required 
                minLength={6} 
                value={form.password} 
                onChange={update('password')} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-gray cursor-pointer p-1 flex items-center justify-center hover:text-deep-navy transition-colors"
              >
                {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
              </button>
            </div>
          </div>
          <button 
            className="w-full py-3.5 px-6 font-semibold text-sm rounded-lg bg-orange text-white hover:bg-orange-hover transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
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
          Already have an account? <Link to="/login" className="text-orange font-semibold hover:underline">Sign in</Link>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
