import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import Logo from '../components/Common/Logo';
import { toast } from 'react-toastify';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState(''); // Helper for local development if email not configured

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevResetUrl('');
    setLoading(true);

    try {
      const response = await API.post('/auth/forgot-password', { email });
      setSuccess(response.data.message || 'Password reset link has been sent to your email.');
      toast.success('Reset email sent successfully!');
      
      // If server returned resetUrl (logged to console in development fallback), show it to make testing easy
      if (response.data.resetUrl) {
        setDevResetUrl(response.data.resetUrl);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      toast.error(err.response?.data?.message || 'Request failed');
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
          <h1 className="text-2xl font-bold text-deep-navy mb-1">Forgot Password</h1>
          <p className="text-sm text-slate-gray">Enter your email to receive a reset link</p>
        </div>
        
        {error && (
          <div className="bg-red-give/10 border border-red-give/20 rounded-lg p-3.5 mb-4 text-red-give text-sm text-center font-medium animate-pulse">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-get/10 border border-green-get/20 rounded-lg p-3.5 mb-4 text-green-get text-sm text-center font-medium">
            {success}
          </div>
        )}

        {devResetUrl && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 mb-4 text-amber-600 text-xs text-center font-medium">
            <p className="mb-1 font-bold">🛠️ Local Dev Notice (No SMTP Configured):</p>
            <p className="mb-2">The reset link was logged to the server console. You can click below to test directly:</p>
            <a href={devResetUrl} className="text-orange underline font-semibold break-all hover:text-orange-hover">
              Click here to Reset Password
            </a>
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
              disabled={loading}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <button 
            className="w-full py-3.5 px-6 font-semibold text-sm rounded-lg bg-orange text-white hover:bg-orange-hover transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>
        <div className="text-center mt-6 text-sm text-slate-gray">
          Remember your password? <Link to="/login" className="text-orange font-semibold hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
