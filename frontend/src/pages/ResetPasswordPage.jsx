import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Logo from '../components/Common/Logo';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await API.post(`/auth/reset-password/${token}`, { password: form.password });
      setSuccess(response.data.message || 'Password has been reset successfully!');
      toast.success('Password reset successful!');
      
      // Clear session/logout so they can log in properly with the new password
      logout();

      // Redirect to login page after 2.5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
      toast.error(err.response?.data?.message || 'Reset failed');
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
          <h1 className="text-2xl font-bold text-deep-navy mb-1">Reset Password</h1>
          <p className="text-sm text-slate-gray">Choose a new password for your account</p>
        </div>
        
        {error && (
          <div className="bg-red-give/10 border border-red-give/20 rounded-lg p-3.5 mb-4 text-red-give text-sm text-center font-medium animate-pulse">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-get/10 border border-green-get/20 rounded-lg p-3.5 mb-4 text-green-get text-sm text-center font-medium">
            {success} <br/>
            <span className="text-xs text-slate-gray font-normal">Redirecting to login page...</span>
          </div>
        )}
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <input 
                className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all pr-12"
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                required
                disabled={loading || !!success}
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-gray cursor-pointer p-1 flex items-center justify-center hover:text-deep-navy transition-colors"
                disabled={loading || !!success}
              >
                {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input 
                className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none transition-all pr-12"
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                required
                disabled={loading || !!success}
                value={form.confirmPassword} 
                onChange={(e) => setForm({...form, confirmPassword: e.target.value})} 
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-gray cursor-pointer p-1 flex items-center justify-center hover:text-deep-navy transition-colors"
                disabled={loading || !!success}
              >
                {showConfirmPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
              </button>
            </div>
          </div>

          <button 
            className="w-full py-3.5 px-6 font-semibold text-sm rounded-lg bg-orange text-white hover:bg-orange-hover transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            type="submit" 
            disabled={loading || !!success}
          >
            {loading ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>
        <div className="text-center mt-6 text-sm text-slate-gray">
          Back to <Link to="/login" className="text-orange font-semibold hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
