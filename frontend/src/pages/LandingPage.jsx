import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  HiOutlinePhone, 
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineBell,
  HiOutlineTrendingUp,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineSun,
  HiOutlineMoon
} from 'react-icons/hi';
import Logo from '../components/Common/Logo';
import { useTheme } from '../context/ThemeContext';

const LandingPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleGetStarted = (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Please enter a phone number to get started.');
      return;
    }
    // Redirect to register page and prefill the phone number
    navigate(`/register?phone=${encodeURIComponent(phoneNumber)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F2] to-[#F8F7F5] dark:from-[#0B0F19] dark:to-[#151D30] text-deep-navy font-sans">
      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-pure-white/80 backdrop-blur-md border-b border-soft-gray px-8 md:px-16 flex items-center justify-between z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-xl bg-pure-white border border-soft-gray flex items-center justify-center p-1.5 shadow-sm">
            <Logo />
          </div>
          <span className="text-lg font-bold text-deep-navy font-outfit">Udhaar Khata</span>
        </div>
        
        <div className="flex items-center gap-4">
          <a href="tel:+919876543210" className="hidden md:flex items-center gap-2 px-4 py-2 bg-transparent text-slate-gray hover:text-deep-navy text-sm font-semibold transition-colors decoration-none">
            <HiOutlinePhone size={18} />
            <span>+91 98765 43210</span>
          </a>
          
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 bg-pure-white border border-soft-gray hover:bg-light-cream/50 rounded-full cursor-pointer text-slate-gray hover:text-deep-navy transition-all flex items-center justify-center shadow-xs outline-none"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <HiOutlineSun className="text-amber-500 animate-pulse" size={18} />
            ) : (
              <HiOutlineMoon className="text-indigo-600" size={18} />
            )}
          </button>

          <button 
            className="px-6 py-2.5 bg-orange text-white hover:bg-orange-hover font-semibold text-sm rounded-lg transition-colors shadow-sm cursor-pointer border-none" 
            onClick={() => navigate('/login')}
          >
            Log In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 md:px-16 pt-32 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-extrabold text-deep-navy leading-[1.1] font-outfit">
            Business hua <br />
            <span className="text-orange">easy</span>
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-deep-navy/80 font-outfit">with Udhaar Khata on Desktop</h2>
          <p className="text-base text-slate-gray leading-relaxed max-w-lg">
            Manage udhaar, track payments and grow your business — all in one place.
          </p>
          
          <form className="flex flex-col sm:flex-row gap-3 max-w-md" onSubmit={handleGetStarted}>
            <div className="flex-1 flex items-center bg-pure-white border border-soft-gray rounded-lg px-3 focus-within:border-orange focus-within:ring-2 focus-within:ring-orange/20 transition-all">
              <span className="text-sm font-semibold text-slate-gray pr-2 border-r border-soft-gray">+91</span>
              <input 
                type="tel" 
                className="w-full bg-transparent border-none py-3.5 px-2.5 text-sm text-deep-navy placeholder-slate-gray/40 outline-none" 
                placeholder="Enter your phone number" 
                maxLength="10" 
                pattern="[0-9]{10}"
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button type="submit" className="px-8 py-3.5 bg-orange hover:bg-orange-hover text-white font-semibold text-sm rounded-lg transition-colors shadow-md shrink-0 cursor-pointer border-none">
              Get Started
            </button>
          </form>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-green-get">
            <HiOutlineShieldCheck size={16} />
            <span>Safe. Secure. Reliable.</span>
          </div>
        </div>
        
        {/* Mockups Container */}
        <div className="relative flex items-center justify-center p-4 lg:p-8">
          {/* Laptop Mockup */}
          <div className="w-full max-w-[500px] aspect-[16/10] bg-[#0F172A] rounded-2xl border border-soft-gray/50 shadow-2xl relative overflow-hidden flex flex-col p-1.5">
            <div className="flex-1 bg-soft-white rounded-lg overflow-hidden flex">
              {/* Mini Sidebar */}
              <div className="w-12 bg-light-cream border-r border-soft-gray flex flex-col items-center py-3 gap-2">
                <div className="w-6 h-6 rounded bg-orange/25" />
                <div className="w-8 h-2.5 rounded bg-orange/20" />
                <div className="w-8 h-2.5 rounded bg-slate-gray/10" />
                <div className="w-8 h-2.5 rounded bg-slate-gray/10" />
                <div className="w-8 h-2.5 rounded bg-slate-gray/10" />
              </div>
              
              {/* Mini Main Content Area */}
              <div className="flex-1 flex flex-col p-3 overflow-hidden text-[9px] space-y-2">
                <div className="flex justify-between items-center mb-1 pb-1 border-b border-soft-gray">
                  <span className="font-bold text-deep-navy">Dashboard</span>
                  <div className="w-4 h-4 rounded-full bg-orange" />
                </div>
                
                {/* Balance Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded border bg-red-give/5 border-red-give/10 text-red-give flex flex-col justify-between">
                    <span className="text-[6px] uppercase tracking-wider font-semibold">You Will Get</span>
                    <span className="text-[10px] font-extrabold text-red-give">₹4,000</span>
                  </div>
                  <div className="p-2 rounded border bg-green-get/5 border-green-get/10 text-green-get flex flex-col justify-between">
                    <span className="text-[6px] uppercase tracking-wider font-semibold">You Will Give</span>
                    <span className="text-[10px] font-extrabold text-green-get">₹0</span>
                  </div>
                </div>
                
                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-1">
                  <div className="p-1 bg-pure-white border border-soft-gray rounded flex flex-col items-center">
                    <span className="text-[5px] text-slate-gray">Customers</span>
                    <span className="text-[8px] font-bold text-deep-navy">2</span>
                  </div>
                  <div className="p-1 bg-pure-white border border-soft-gray rounded flex flex-col items-center">
                    <span className="text-[5px] text-slate-gray">Today's Txns</span>
                    <span className="text-[8px] font-bold text-deep-navy">2</span>
                  </div>
                  <div className="p-1 bg-pure-white border border-soft-gray rounded flex flex-col items-center">
                    <span className="text-[5px] text-slate-gray">Pending</span>
                    <span className="text-[8px] font-bold text-deep-navy">1</span>
                  </div>
                  <div className="p-1 bg-pure-white border border-soft-gray rounded flex flex-col items-center">
                    <span className="text-[5px] text-slate-gray">High Risk</span>
                    <span className="text-[8px] font-bold text-deep-navy">0</span>
                  </div>
                </div>
                
                {/* Bottom Lists */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <div className="p-2 bg-pure-white border border-soft-gray rounded">
                    <span className="font-bold text-deep-navy block mb-1 text-[7px]">Pending Dues</span>
                    <div className="flex justify-between text-[7px] py-0.5 border-b border-soft-gray last:border-0">
                      <span>Akhilesh</span>
                      <span className="text-red-give font-semibold">₹4,000</span>
                    </div>
                  </div>
                  <div className="p-2 bg-pure-white border border-soft-gray rounded">
                    <span className="font-bold text-deep-navy block mb-1 text-[7px]">Recent Transactions</span>
                    <table className="w-full text-left text-[6px]">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Cust</th>
                          <th>Amt</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-soft-gray/30">
                          <td>26 May</td>
                          <td>nanda</td>
                          <td className="text-green-get">+₹50k</td>
                        </tr>
                        <tr>
                          <td>26 May</td>
                          <td>Akhilesh</td>
                          <td className="text-red-give">+₹4k</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Mockup */}
          <div className="absolute -bottom-4 -left-4 w-32 aspect-[9/19] bg-[#0F172A] border-4 border-soft-gray/50 rounded-2xl shadow-xl hidden md:flex flex-col p-1 overflow-hidden z-10">
            <div className="w-8 h-2.5 bg-[#0F172A] mx-auto rounded-b-md" />
            <div className="flex-1 bg-soft-white rounded-lg flex flex-col p-1.5 overflow-hidden text-[6px] space-y-1.5">
              <div className="flex justify-between items-center pb-0.5 border-b border-soft-gray">
                <span className="font-bold text-deep-navy">Dashboard</span>
                <div className="w-2.5 h-2.5 rounded-full bg-orange" />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="p-1 rounded bg-red-give/5 border border-red-give/10 text-red-give flex flex-col">
                  <span className="text-[4px] uppercase tracking-wider font-semibold">Get</span>
                  <span className="text-[7px] font-extrabold text-red-give">₹4,000</span>
                </div>
                <div className="p-1 rounded bg-green-get/5 border border-green-get/10 text-green-get flex flex-col">
                  <span className="text-[4px] uppercase tracking-wider font-semibold">Give</span>
                  <span className="text-[7px] font-extrabold text-green-get">₹0</span>
                </div>
              </div>
              
              <div className="p-1 bg-pure-white border border-soft-gray rounded flex-1 flex flex-col">
                <span className="font-bold text-deep-navy block mb-0.5 text-[5px]">Recent Activity</span>
                <div className="flex justify-between text-[5px] py-0.5 border-b border-soft-gray/50 last:border-none">
                  <span>nanda shiva</span>
                  <span className="text-green-get font-semibold">₹50,000</span>
                </div>
                <div className="flex justify-between text-[5px] py-0.5 border-b border-soft-gray/50 last:border-none">
                  <span>Akhilesh</span>
                  <span className="text-red-give font-semibold">₹4,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Banner Section */}
      <section className="bg-pure-white border-y border-soft-gray py-16" id="features">
        <div className="max-w-7xl mx-auto px-8 md:px-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-orange/10 text-orange rounded-xl flex items-center justify-center text-xl shrink-0">
              <HiOutlineDocumentText size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-deep-navy">Digital Udhaar Register</h4>
              <p className="text-xs text-slate-gray leading-relaxed">Maintain all your credit and debit records digitally in one place.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-orange/10 text-orange rounded-xl flex items-center justify-center text-xl shrink-0">
              <HiOutlineBell size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-deep-navy">Payment Reminders</h4>
              <p className="text-xs text-slate-gray leading-relaxed">Send automated payment reminders to customers via SMS and WhatsApp.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-orange/10 text-orange rounded-xl flex items-center justify-center text-xl shrink-0">
              <HiOutlineTrendingUp size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-deep-navy">Reports & Insights</h4>
              <p className="text-xs text-slate-gray leading-relaxed">Track store growth and get outstanding balance sheets easily.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-orange/10 text-orange rounded-xl flex items-center justify-center text-xl shrink-0">
              <HiOutlineShieldCheck size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-deep-navy">Secure & Reliable</h4>
              <p className="text-xs text-slate-gray leading-relaxed">100% safe and secure cloud storage. Never lose your business records.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-8 md:px-16 py-20" id="how-it-works">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold text-deep-navy font-outfit">Simple & Seamless</h2>
          <p className="text-sm text-slate-gray">Get set up and start tracking outstanding balances in just 3 quick steps.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-pure-white border border-soft-gray rounded-2xl relative shadow-sm">
            <span className="w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center font-bold text-sm absolute -top-4 left-8 shadow-md">1</span>
            <h3 className="text-lg font-bold text-deep-navy mb-2">Create Account</h3>
            <p className="text-xs text-slate-gray leading-relaxed">
              Sign up with your store name and details. It takes less than a minute.
            </p>
          </div>
          <div className="p-8 bg-pure-white border border-soft-gray rounded-2xl relative shadow-sm">
            <span className="w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center font-bold text-sm absolute -top-4 left-8 shadow-md">2</span>
            <h3 className="text-lg font-bold text-deep-navy mb-2">Add Customers</h3>
            <p className="text-xs text-slate-gray leading-relaxed">
              Type customer phone numbers to begin tracking their ledger.
            </p>
          </div>
          <div className="p-8 bg-pure-white border border-soft-gray rounded-2xl relative shadow-sm">
            <span className="w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center font-bold text-sm absolute -top-4 left-8 shadow-md">3</span>
            <h3 className="text-lg font-bold text-deep-navy mb-2">Record Transactions</h3>
            <p className="text-xs text-slate-gray leading-relaxed">
              Enter Credit (You Gave) or Debit (You Got) amounts. Send reminders anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
