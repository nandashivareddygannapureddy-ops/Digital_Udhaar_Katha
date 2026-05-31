import { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import API from '../api/axios';
import { useSocketSync } from '../hooks/useSocketSync';
import Header from '../components/Layout/Header';
import Modal from '../components/Common/Modal';
import Loader from '../components/Common/Loader';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { toast } from 'react-toastify';
import {
  HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineUsers,
  HiOutlineCreditCard, HiOutlineExclamation, HiOutlineClock,
  HiOutlineMicrophone, HiOutlineUser, HiOutlineX,
  HiOutlineSearch, HiOutlineFilter, HiOutlinePlus,
  HiOutlineDotsVertical, HiOutlineDocumentText, HiOutlineDatabase,
  HiOutlineCog, HiOutlineBell, HiOutlineUserAdd
} from 'react-icons/hi';
import { FaWhatsapp, FaSms, FaMobileAlt, FaPhone } from 'react-icons/fa';

const defaultUserSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#E2E8F0"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#64748B"/>
  <circle cx="50" cy="40" r="16" fill="#94A3B8"/>
</svg>
`;

const maleUserSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#E0F2FE"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#0284C7"/>
  <rect x="45" y="52" width="10" height="12" fill="#F3B395"/>
  <circle cx="50" cy="42" r="16" fill="#F8C4AD"/>
  <path d="M34 38c2-10 10-14 16-14s14 4 16 14c-1-5-6-8-16-8s-15 3-16 8z" fill="#1E293B"/>
  <circle cx="45" cy="42" r="1.8" fill="#1E293B"/>
  <circle cx="55" cy="42" r="1.8" fill="#1E293B"/>
  <path d="M47 48.5c1.5 1.5 4.5 1.5 6 0" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;

const femaleUserSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#FCE7F3"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#DB2777"/>
  <rect x="45" y="52" width="10" height="12" fill="#F3B395"/>
  <circle cx="50" cy="42" r="16" fill="#F8C4AD"/>
  <path d="M34 44c-1-8 4-16 16-16s17 8 16 16c0 10-2 15-4 17-2-6-5-9-12-9s-10 3-12 9c-2-2-4-7-4-17z" fill="#312E81"/>
  <circle cx="45" cy="42" r="1.8" fill="#2E2219"/>
  <circle cx="55" cy="42" r="1.8" fill="#2E2219"/>
  <path d="M47 48.5c1.5 1.5 4.5 1.5 6 0" stroke="#2E2219" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;

const shopUserSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#FEF3C7"/>
  <rect x="25" y="55" width="50" height="25" rx="2" fill="#D97706"/>
  <path d="M20 45h60l-5 12H25l-5-12z" fill="#B45309"/>
  <path d="M20 45l5-8h50l5 8H20z" fill="#78350F"/>
  <rect x="42" y="62" width="16" height="18" rx="1" fill="#F8FAFC"/>
  <rect x="29" y="62" width="10" height="10" rx="1" fill="#FBBF24"/>
  <rect x="61" y="62" width="10" height="10" rx="1" fill="#FBBF24"/>
</svg>
`;

const svgToBase64 = (svgMarkup) => {
  return `data:image/svg+xml;base64,${btoa(svgMarkup.trim())}`;
};

const customerPresets = [
  { label: 'Standard', value: svgToBase64(defaultUserSvg) },
  { label: 'Male', value: svgToBase64(maleUserSvg) },
  { label: 'Female', value: svgToBase64(femaleUserSvg) },
  { label: 'Business', value: svgToBase64(shopUserSvg) }
];

const avatarColors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const getAvatarColor = (name) => avatarColors[name.charCodeAt(0) % avatarColors.length];

const DashboardPage = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState({ customer: '', type: 'credit', amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash' });
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState({});
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [custFilter, setCustFilter] = useState('all');
  const [custSearch, setCustSearch] = useState('');

  const [showCustModal, setShowCustModal] = useState(false);
  const [custForm, setCustForm] = useState({ name: '', phone: '', email: '', address: '', avatar: customerPresets[0].value, paymentDueDate: '' });
  const [custSubmitting, setCustSubmitting] = useState(false);
  const custFileRef = useRef(null);

  const handleCustFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustForm(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustSubmit = async (e) => {
    e.preventDefault();
    setCustSubmitting(true);
    try {
      await API.post('/customers', custForm);
      toast.success(t('customerAdded') || 'Customer added successfully');
      setShowCustModal(false);
      setCustForm({ name: '', phone: '', email: '', address: '', avatar: customerPresets[0].value, paymentDueDate: '' });
      // Refresh dashboard lists
      const [statsRes, txnRes, custRes] = await Promise.all([
        API.get('/transactions/stats'),
        API.get('/transactions?limit=5'),
        API.get('/customers?sort=balance-high'),
      ]);
      setStats(statsRes.data.data);
      setTransactions(txnRes.data.data);
      setCustomers(custRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer');
    } finally {
      setCustSubmitting(false);
    }
  };

  const speechLang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';

  const {
    isListening: listening,
    startListening,
    stopListening,
    isSupported
  } = useSpeechToText({
    lang: speechLang,
    onResult: async (text) => {
      try {
        toast.info(`Processing voice: "${text}"...`);
        const { data } = await API.post('/ai/voice-entry', { text });
        toast.success(data.message);
        // Refresh dashboard data
        const [statsRes, txnRes, custRes] = await Promise.all([
          API.get('/transactions/stats'),
          API.get('/transactions?limit=5'),
          API.get('/customers?sort=balance-high'),
        ]);
        setStats(statsRes.data.data);
        setTransactions(txnRes.data.data);
        setCustomers(custRes.data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to parse voice entry');
      }
    }
  });

  const [sidebarOpen, setSidebarOpen] = useOutletContext() || [false, () => {}];

  const handleEmailRemind = async (e, customer) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!customer.email) {
      toast.warning('Please edit this customer and add an email address first.');
      return;
    }
    
    setSendingEmail(prev => ({ ...prev, [customer._id]: true }));
    try {
      const { data } = await API.post(`/reminders/send/${customer._id}`);
      toast.success(data.message || `Email Reminder sent to ${customer.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send Email reminder');
    } finally {
      setSendingEmail(prev => ({ ...prev, [customer._id]: false }));
    }
  };

  const fetchAll = async () => {
    try {
      const [statsRes, txnRes, custRes] = await Promise.all([
        API.get('/transactions/stats'),
        API.get('/transactions?limit=5'),
        API.get('/customers?sort=balance-high'),
      ]);
      setStats(statsRes.data.data);
      setTransactions(txnRes.data.data);
      setCustomers(custRes.data.data);
    } catch (err) { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useSocketSync(fetchAll, ['transactions', 'customers']);

  const handleVoice = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleAddTxn = async (e) => {
    e.preventDefault();
    if (!txnForm.customer) { toast.error(t('selectCustomer')); return; }
    setSubmitting(true);
    try {
      await API.post('/transactions', txnForm);
      toast.success(txnForm.type === 'credit' ? t('udhaarRecorded') : t('paymentRecorded'));
      setShowTxnModal(false);
      setTxnForm({ customer: '', type: 'credit', amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash' });
      // Refresh
      const [statsRes, txnRes, custRes] = await Promise.all([
        API.get('/transactions/stats'), API.get('/transactions?limit=5'), API.get('/customers?sort=balance-high'),
      ]);
      setStats(statsRes.data.data); setTransactions(txnRes.data.data); setCustomers(custRes.data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const openTxnModal = (type) => {
    setTxnForm({ ...txnForm, type, customer: '', amount: '', description: '', paymentMode: 'cash' });
    setShowTxnModal(true);
  };

  if (loading) return (
    <div>
      <Header title={t('dashboard')} subtitle={t('overviewOfStore')} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Loader fullPage />
    </div>
  );

  const filteredCustomers = customers.filter(c => {
    const name = c.name || '';
    const phone = c.phone || '';
    const matchesSearch = name.toLowerCase().includes(custSearch.toLowerCase()) || 
                          phone.includes(custSearch);
    if (custFilter === 'get') {
      return matchesSearch && c.balance > 0;
    }
    if (custFilter === 'pay') {
      return matchesSearch && c.balance < 0;
    }
    return matchesSearch;
  });

  const activeCustomer = selectedCustomerId
    ? (customers.find(c => c._id === selectedCustomerId) || customers[0] || null)
    : (customers[0] || null);

  const activeCustomerTxns = activeCustomer
    ? transactions.filter(txn => txn.customer?._id === activeCustomer._id)
    : [];

  const youWillGet = stats?.youWillGet || 0;
  const youWillGive = stats?.youWillGive || 0;
  const totalUdharVal = youWillGet + youWillGive || 1;
  const creditPct = (youWillGet / totalUdharVal) * 100;
  const debitPct = (youWillGive / totalUdharVal) * 100;
  const radius = 35;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius; 
  const creditStroke = (youWillGet / totalUdharVal) * circumference;
  const debitStroke = (youWillGive / totalUdharVal) * circumference;

  const handleBackup = () => {
    toast.success('Database backup completed successfully.');
  };

  const openCustomerTxnModal = (type) => {
    if (activeCustomer) {
      setTxnForm({ 
        customer: activeCustomer._id, 
        type, 
        amount: '', 
        description: '', 
        date: new Date().toISOString().split('T')[0] 
      });
      setShowTxnModal(true);
    } else {
      toast.info("Please add a customer first to record transactions");
    }
  };

  return (
    <div className="space-y-6">
      <Header 
        title={t('dashboard')} 
        subtitle={t('overviewOfStore')} 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-orange/8 border border-orange/20 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-xs font-semibold text-slate-gray block tracking-wide">{t('totalBalance') || 'Total Balance'}</span>
            <span className="text-xl font-black text-deep-navy block mt-1 font-outfit">
              ₹{((stats?.youWillGet || 0) - (stats?.youWillGive || 0)).toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-slate-gray block mt-1 font-medium">{t('totalUdhar') || 'Total Transactions Balance'}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange text-white flex items-center justify-center font-bold text-lg shadow-sm">
            ₹
          </div>
        </div>

        <div className="p-5 bg-green-get/8 border border-green-get/20 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-xs font-semibold text-slate-gray block tracking-wide">{t('youWillGet')}</span>
            <span className="text-xl font-black text-green-get block mt-1 font-outfit">
              ₹{(stats?.youWillGet || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-slate-gray block mt-1 font-medium">{stats?.customersWithDues || 0} {t('customers')}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-get text-white flex items-center justify-center text-xl shadow-sm">
            <HiOutlineArrowDown />
          </div>
        </div>

        <div className="p-5 bg-red-give/8 border border-red-give/20 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-xs font-semibold text-slate-gray block tracking-wide">{t('youWillGive')}</span>
            <span className="text-xl font-black text-red-give block mt-1 font-outfit">
              ₹{(stats?.youWillGive || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-sm text-slate-gray block mt-1 font-medium">{t('advancePayments') || 'Advance accounts'}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-give text-white flex items-center justify-center text-xl shadow-sm">
            <HiOutlineArrowUp />
          </div>
        </div>

        <div className="p-5 bg-slate-gray/8 border border-slate-gray/20 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-xs font-semibold text-slate-gray block tracking-wide">{t('totalTransactions') || 'Total Transactions'}</span>
            <span className="text-xl font-black text-deep-navy block mt-1 font-outfit">
              {(stats?.todayTransactions || 0) + (stats?.pendingTransactions || 0)}
            </span>
            <span className="text-sm text-slate-gray block mt-1 font-medium">{t('thisMonth') || 'This Month'}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-gray text-white flex items-center justify-center text-xl shadow-sm">
            <HiOutlineCreditCard />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm p-6">
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-gray/10 text-slate-gray flex items-center justify-center mb-4">
                  <HiOutlineUsers size={32} />
                </div>
                <h4 className="text-sm font-bold text-deep-navy">No Customers Added</h4>
                <p className="text-xs text-slate-gray max-w-xs mt-1 mb-4">
                  Manage your digital Transactions accounts easily. Add your first customer to get started.
                </p>
                <button
                  onClick={() => setShowCustModal(true)}
                  className="px-5 py-2.5 bg-orange hover:bg-orange-hover text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer border-none flex items-center gap-2"
                >
                  <HiOutlinePlus size={16} /> Add Customer
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h3 className="text-base font-bold text-deep-navy">{t('customers')}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-light-cream rounded-xl p-0.5 border border-soft-gray">
                      <button 
                        onClick={() => setCustFilter('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all border-none ${
                          custFilter === 'all' ? 'bg-orange text-white shadow-xs' : 'text-slate-gray hover:text-deep-navy'
                        }`}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setCustFilter('get')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all border-none ${
                          custFilter === 'get' ? 'bg-orange text-white shadow-xs' : 'text-slate-gray hover:text-deep-navy'
                        }`}
                      >
                        You Will Get
                      </button>
                      <button 
                        onClick={() => setCustFilter('pay')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all border-none ${
                          custFilter === 'pay' ? 'bg-orange text-white shadow-xs' : 'text-slate-gray hover:text-deep-navy'
                        }`}
                      >
                        You Will Pay
                      </button>
                    </div>
                    <div className="relative flex-1 sm:w-48">
                      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray" size={16} />
                      <input 
                        type="text"
                        value={custSearch}
                        onChange={(e) => setCustSearch(e.target.value)}
                        placeholder="Search customers..."
                        className="w-full pl-9 pr-4 py-2 border border-soft-gray rounded-xl bg-light-cream/40 text-xs focus:border-orange focus:ring-2 focus:ring-orange/20 outline-none text-deep-navy"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-soft-gray">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-light-cream/40 border-b border-soft-gray">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wider">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wider">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wider">Total Balance</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wider">Prediction</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-gray uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft-gray/30">
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-xs font-semibold text-slate-gray">
                            No customers matching your search/filters
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((c) => (
                          <tr 
                            key={c._id} 
                            onClick={() => setSelectedCustomerId(c._id)}
                            className={`hover:bg-slate-gray/5 transition-colors cursor-pointer ${
                              activeCustomer?._id === c._id ? 'bg-orange/5' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-deep-navy flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-inner" 
                                style={{ background: getAvatarColor(c.name) }}
                              >
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="block">{c.name}</span>
                                <span className="text-[10px] text-slate-gray font-normal block mt-0.5">{c.phone}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                c.balance >= 0 ? 'bg-green-get/10 text-green-get' : 'bg-red-give/10 text-red-give'
                              }`}>
                                {c.balance >= 0 ? 'You Will Get' : 'You Will Pay'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm font-bold font-outfit ${
                                c.balance >= 0 ? 'text-green-get' : 'text-red-give'
                            }`}>
                              ₹{Math.abs(c.balance).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                c.duePrediction === 'trusted' ? 'bg-green-get/10 text-green-get' :
                                c.duePrediction === 'delay' ? 'bg-warning-pending/10 text-warning-pending' :
                                'bg-red-give/10 text-red-give'
                              }`}>
                                {c.duePrediction === 'trusted' ? 'Trusted' : c.duePrediction === 'delay' ? 'Delay' : 'Risky'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button className="p-1 hover:bg-slate-gray/10 text-slate-gray hover:text-deep-navy rounded-lg border-none cursor-pointer">
                                <HiOutlineDotsVertical size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-deep-navy">{t('recentTransactions')}</h3>
                <Link to="/transactions" className="text-xs font-semibold text-orange hover:underline">{t('viewAll')}</Link>
              </div>
              {transactions.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-gray">No transactions yet</h3>
                  <p className="text-[11px] text-slate-gray/60">Create transaction to view stats</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 4).map((txn) => (
                    <div key={txn._id} className="flex items-center justify-between p-3 hover:bg-slate-gray/5 rounded-xl border border-soft-gray/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-light-cream flex items-center justify-center font-bold text-xs text-deep-navy shrink-0 shadow-inner">
                          {txn.customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-deep-navy block">{txn.customer?.name || 'Customer Name'}</span>
                          <span className="text-[9px] text-slate-gray block mt-0.5">{new Date(txn.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold block ${txn.type === 'credit' ? 'text-red-give' : 'text-green-get'}`}>
                          {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] text-slate-gray block mt-0.5 uppercase tracking-wider font-semibold">
                          {txn.type === 'credit' ? t('udhaar') : t('jama')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm p-6">
              <h3 className="text-base font-bold text-deep-navy mb-4">{t('reportsOverview') || 'Reports Overview'}</h3>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-3.5 flex-1">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-gray uppercase block tracking-wider">Total Transactions</span>
                    <span className="text-lg font-black text-deep-navy font-outfit block mt-0.5">
                      ₹{(stats?.youWillGet || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-gray uppercase block tracking-wider">Net Balance</span>
                    <span className="text-lg font-black text-orange font-outfit block mt-0.5">
                      ₹{Math.abs((stats?.youWillGet || 0) - (stats?.youWillGive || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="relative flex items-center justify-center shrink-0">
                  <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="stroke-soft-gray"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="stroke-orange transition-all duration-700"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (creditStroke || 0.1)}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="stroke-green-get transition-all duration-700"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (debitStroke || 0.1)}
                      transform={`rotate(${(youWillGet / totalUdharVal) * 360} 50 50)`}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] text-slate-gray font-bold uppercase tracking-wider">Transactions</span>
                    <span className="text-xs font-extrabold text-deep-navy font-outfit mt-0.5">
                      {Math.round((youWillGet / totalUdharVal) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-5 border-t border-soft-gray/30 pt-3.5 text-[10px] font-semibold text-slate-gray">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange inline-block" />
                  <span>Get</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-get inline-block" />
                  <span>Pay</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center pb-2 border-b border-soft-gray/30">
              <h3 className="text-base font-bold text-deep-navy">{t('customerDetails') || 'Customer Details'}</h3>
              {activeCustomer && (
                <button 
                  onClick={() => navigate(`/customers/${activeCustomer._id}`)}
                  className="p-1.5 hover:bg-slate-gray/10 text-slate-gray hover:text-deep-navy rounded-lg border-none cursor-pointer flex items-center justify-center"
                >
                  <HiOutlineUser size={16} />
                </button>
              )}
            </div>

            {!activeCustomer ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-soft-gray rounded-2xl bg-light-cream/20">
                <div className="w-12 h-12 rounded-full bg-slate-gray/5 text-slate-gray/40 flex items-center justify-center mb-3">
                  <HiOutlineUser size={24} />
                </div>
                <span className="text-xs font-semibold text-slate-gray">No Customer Selected</span>
                <p className="text-[10px] text-slate-gray/60 mt-1 max-w-[200px]">
                  Add a customer to view Transactions, Balance, Logs, and perform actions.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-lg text-white shrink-0 shadow-md"
                    style={{ background: getAvatarColor(activeCustomer.name) }}
                  >
                    {activeCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-deep-navy truncate">{activeCustomer.name}</h4>
                    <p className="text-xs text-slate-gray font-medium mt-0.5">{activeCustomer.phone}</p>
                  </div>
                </div>
                <div className="bg-zinc-800 text-white p-5 rounded-2xl shadow-xs border border-zinc-900 flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Transactions</span>
                  <span className="text-2xl font-black font-outfit mt-2">
                    ₹{activeCustomer.balance.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-2.5 font-semibold">
                    {activeCustomer.balance >= 0 ? 'You Will Get' : 'You Will Give'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-light-cream border border-soft-gray rounded-xl">
                    <span className="text-[9px] font-semibold text-slate-gray uppercase block tracking-wider">Added</span>
                    <span className="text-xs font-bold text-red-give block mt-1 font-outfit">
                      ₹{activeCustomer.balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 bg-light-cream border border-soft-gray rounded-xl">
                    <span className="text-[9px] font-semibold text-slate-gray uppercase block tracking-wider">Paid</span>
                    <span className="text-xs font-bold text-green-get block mt-1 font-outfit">
                      ₹0
                    </span>
                  </div>
                  <div className="p-3 bg-light-cream border border-soft-gray rounded-xl">
                    <span className="text-[9px] font-semibold text-slate-gray uppercase block tracking-wider">Txns</span>
                    <span className="text-xs font-bold text-deep-navy block mt-1 font-outfit">
                      {activeCustomerTxns.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-slate-gray uppercase tracking-wider block">Activity Logs</span>
                  {activeCustomerTxns.length === 0 ? (
                    <div className="text-center py-4 bg-light-cream/40 border border-dashed border-soft-gray rounded-xl">
                      <span className="text-[10px] text-slate-gray">No activity logged</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                      {activeCustomerTxns.map((t) => (
                        <div key={t._id} className="flex justify-between items-center p-2 bg-light-cream border border-soft-gray/50 rounded-lg text-xs">
                          <span className="font-semibold text-deep-navy truncate max-w-[100px]">{t.description || 'Transaction entry'}</span>
                          <span className={`font-bold ${t.type === 'credit' ? 'text-red-give' : 'text-green-get'}`}>
                            ₹{t.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-1">
                  <button 
                    onClick={() => openCustomerTxnModal('credit')}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer border-none bg-red-give text-white hover:bg-red-hover"
                  >
                    + Add Udhar
                  </button>
                  <button 
                    onClick={() => openCustomerTxnModal('debit')}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer border-none bg-green-get text-white hover:bg-green-hover"
                  >
                    Get Paid
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-deep-navy mb-4">{t('quickActions') || 'Quick Actions'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowCustModal(true)}
                className="p-4 bg-pure-white border border-soft-gray rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-orange hover:shadow-xs hover:-translate-y-0.5 transition-all text-deep-navy font-semibold text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center text-lg">
                  <HiOutlineUserAdd />
                </div>
                <span>Add Customer</span>
              </button>
              <button 
                onClick={() => openTxnModal('credit')}
                className="p-4 bg-pure-white border border-soft-gray rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-orange hover:shadow-xs hover:-translate-y-0.5 transition-all text-deep-navy font-semibold text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-green-get/10 text-green-get flex items-center justify-center text-lg">
                  <HiOutlineCreditCard />
                </div>
                <span>Add Entry</span>
              </button>
              <button 
                onClick={() => navigate('/transactions')}
                className="p-4 bg-pure-white border border-soft-gray rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-orange hover:shadow-xs hover:-translate-y-0.5 transition-all text-deep-navy font-semibold text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-info-analytics/10 text-info-analytics flex items-center justify-center text-lg">
                  <HiOutlineDocumentText />
                </div>
                <span>Reports</span>
              </button>
              <button 
                onClick={() => navigate('/reminders')}
                className="p-4 bg-pure-white border border-soft-gray rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-orange hover:shadow-xs hover:-translate-y-0.5 transition-all text-deep-navy font-semibold text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-warning-pending/10 text-warning-pending flex items-center justify-center text-lg">
                  <HiOutlineBell />
                </div>
                <span>Reminders</span>
              </button>
              <button 
                onClick={handleBackup}
                className="p-4 bg-pure-white border border-soft-gray rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-orange hover:shadow-xs hover:-translate-y-0.5 transition-all text-deep-navy font-semibold text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-gray/10 text-slate-gray flex items-center justify-center text-lg">
                  <HiOutlineDatabase />
                </div>
                <span>Backup</span>
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="p-4 bg-pure-white border border-soft-gray rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-orange hover:shadow-xs hover:-translate-y-0.5 transition-all text-deep-navy font-semibold text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-gray/10 text-slate-gray flex items-center justify-center text-lg">
                  <HiOutlineCog />
                </div>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSupported && (
        <button 
          className={`fixed bottom-6 right-24 w-14 h-14 bg-orange text-white rounded-full flex items-center justify-center text-xl shadow-lg border-none cursor-pointer hover:bg-orange-hover hover:scale-105 transition-all z-40 ${
            listening ? 'ring-4 ring-red-give/30 bg-red-give animate-pulse' : ''
          }`} 
          onClick={handleVoice} 
          title={listening ? "Stop Listening" : "Voice Entry"}
        >
          {listening ? <HiOutlineX size={24} /> : <HiOutlineMicrophone size={24} />}
        </button>
      )}

      <Modal isOpen={showTxnModal} onClose={() => setShowTxnModal(false)} title={t('addTransaction')}>
        <form onSubmit={handleAddTxn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">{t('customers')} *</label>
            <select 
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" 
              required 
              value={txnForm.customer} 
              onChange={(e) => setTxnForm({...txnForm, customer: e.target.value})}
            >
              <option value="">{t('selectCustomer')}</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} (Outstanding: ₹{Math.abs(c.balance).toLocaleString('en-IN')} {c.balance >= 0 ? 'Due' : 'Advance'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">{t('type')} *</label>
            <select 
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" 
              value={txnForm.type} 
              onChange={(e) => setTxnForm({...txnForm, type: e.target.value})}
            >
              <option value="credit">{t('udhaarDesc')}</option>
              <option value="debit">{t('jamaDesc')}</option>
            </select>
          </div>
          {txnForm.type === 'debit' && (
            <div>
              <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">Payment Mode *</label>
              <select 
                className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" 
                value={txnForm.paymentMode || 'cash'} 
                onChange={(e) => setTxnForm({...txnForm, paymentMode: e.target.value})}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="online">Online Transfer</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">{t('amount')} *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-gray font-extrabold text-base">₹</span>
              <input 
                className="w-full pl-8 pr-4 py-2.5 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 font-bold" 
                type="number" 
                min="0.01" 
                step="0.01" 
                required 
                value={txnForm.amount}
                onChange={(e) => setTxnForm({...txnForm, amount: e.target.value})} 
                placeholder="0.00" 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">{t('description')}</label>
            <input 
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy placeholder-slate-gray/40 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" 
              value={txnForm.description} 
              onChange={(e) => setTxnForm({...txnForm, description: e.target.value})} 
              placeholder="E.g., Grocery purchase"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">{t('date')}</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              <button 
                type="button" 
                onClick={() => setTxnForm({...txnForm, date: new Date().toISOString().split('T')[0]})}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  txnForm.date === new Date().toISOString().split('T')[0] 
                    ? 'bg-orange text-white border-orange shadow-xs' 
                    : 'bg-soft-white text-slate-gray border-soft-gray hover:bg-slate-gray/5'
                }`}
              >
                Today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setTxnForm({...txnForm, date: yesterday.toISOString().split('T')[0]});
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  txnForm.date === new Date(Date.now() - 86400000).toISOString().split('T')[0] 
                    ? 'bg-orange text-white border-orange shadow-xs' 
                    : 'bg-soft-white text-slate-gray border-soft-gray hover:bg-slate-gray/5'
                }`}
              >
                Yesterday
              </button>
            </div>
            <input 
              className="w-full px-4 py-3 bg-light-cream/40 border border-soft-gray rounded-lg text-deep-navy text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" 
              type="date" 
              value={txnForm.date} 
              onChange={(e) => setTxnForm({...txnForm, date: e.target.value})} 
            />
          </div>

          {/* Live Preview Card */}
          {txnForm.customer && txnForm.amount && parseFloat(txnForm.amount) > 0 && (() => {
            const selectedCust = customers.find(c => c._id === txnForm.customer);
            if (!selectedCust) return null;
            const currentBal = selectedCust.balance;
            const txnAmount = parseFloat(txnForm.amount) || 0;
            const isCredit = txnForm.type === 'credit';
            const newBal = isCredit ? (currentBal + txnAmount) : (currentBal - txnAmount);
            return (
              <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-soft-gray/80 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="text-[10px] font-bold text-slate-gray/70 uppercase tracking-widest border-b border-soft-gray/30 pb-2 flex items-center justify-between">
                  <span>Balance Preview</span>
                  <span className="text-[9px] bg-slate-200/60 dark:bg-slate-800 text-slate-gray px-2 py-0.5 rounded-md font-semibold">Live Preview</span>
                </div>
                
                <div className="flex justify-between items-center gap-1.5 text-center relative">
                  {/* Card 1: Current */}
                  <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl">
                    <span className="text-[9px] text-slate-gray font-bold uppercase tracking-wider">Current</span>
                    <span className="text-xs font-mono font-bold text-deep-navy mt-1">
                      ₹{Math.abs(currentBal).toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-1 ${
                      currentBal >= 0 ? 'bg-red-give/10 text-red-give' : 'bg-green-get/10 text-green-get'
                    }`}>
                      {currentBal >= 0 ? 'Due' : 'Advance'}
                    </span>
                  </div>

                  {/* Arrow 1 */}
                  <span className="text-slate-gray/30 text-xs shrink-0 select-none">➜</span>

                  {/* Card 2: Transaction */}
                  <div className="flex-1 flex flex-col items-center justify-center p-2 bg-pure-white border border-soft-gray/50 rounded-xl shadow-xs">
                    <span className="text-[9px] text-slate-gray font-bold uppercase tracking-wider">Transaction</span>
                    <span className={`text-xs font-mono font-black mt-1 ${isCredit ? 'text-red-give' : 'text-green-get'}`}>
                      {isCredit ? '+' : '-'}₹{txnAmount.toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded-md mt-1 text-white ${
                      isCredit ? 'bg-red-give' : 'bg-green-get'
                    }`}>
                      {isCredit ? 'Gave' : 'Got'}
                    </span>
                  </div>

                  {/* Arrow 2 */}
                  <span className="text-slate-gray/30 text-xs shrink-0 select-none">➜</span>

                  {/* Card 3: New Balance */}
                  <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl">
                    <span className="text-[9px] text-slate-gray font-bold uppercase tracking-wider">New Balance</span>
                    <span className={`text-xs font-mono font-extrabold mt-1 ${
                      newBal >= 0 ? 'text-red-give' : 'text-green-get'
                    }`}>
                      ₹{Math.abs(newBal).toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-1 ${
                      newBal >= 0 ? 'bg-red-give/10 text-red-give' : 'bg-green-get/10 text-green-get'
                    }`}>
                      {newBal >= 0 ? 'Due' : 'Advance'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-4 border-t border-soft-gray/50">
            <button 
              type="button" 
              className="px-5 py-2.5 rounded-lg border border-soft-gray text-slate-gray bg-transparent cursor-pointer font-medium text-sm hover:bg-slate-gray/5" 
              onClick={() => setShowTxnModal(false)}
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-lg bg-orange text-white border-none cursor-pointer font-bold text-sm hover:bg-orange-hover disabled:opacity-50" 
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showCustModal} onClose={() => setShowCustModal(false)} title={t('addCustomer') || 'Add Customer'}>
        <form onSubmit={handleAddCustSubmit} className="space-y-4">
          {/* Profile Picture Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">Profile Photo</label>
            <div className="flex items-center gap-4 p-3 bg-soft-white border border-soft-gray rounded-xl w-full">
              {/* Avatar Preview */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <div 
                  className="w-16 h-16 rounded-full bg-pure-white border-2 border-orange flex items-center justify-center overflow-hidden cursor-pointer shadow-sm hover:scale-105 transition-transform"
                  onClick={() => custFileRef.current.click()}
                  type="button"
                >
                  {custForm.avatar ? (
                    <img src={custForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-gray font-extrabold uppercase">Upload</span>
                  )}
                </div>
                {/* Plus badge */}
                <div className="absolute bottom-0 right-0 bg-orange w-5 h-5 rounded-full flex items-center justify-center text-white border border-pure-white cursor-pointer shadow pointer-events-none">
                  <span className="text-xs font-bold">+</span>
                </div>
                <input
                  type="file"
                  ref={custFileRef}
                  onChange={handleCustFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Presets Selection */}
              <div className="space-y-1 flex-1">
                <span className="text-[10px] font-bold text-slate-gray mb-1 block">
                  Select Preset or Upload Custom
                </span>
                <div className="flex gap-2 flex-wrap">
                  {customerPresets.map((p, idx) => {
                    const isSelected = custForm.avatar === p.value;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all p-0 cursor-pointer ${
                          isSelected ? 'border-orange scale-110 shadow-sm' : 'border-soft-gray opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => setCustForm(prev => ({ ...prev, avatar: p.value }))}
                      >
                        <img src={p.value} alt={p.label} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('customerName') || 'Customer Name'} *</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all text-deep-navy" 
              required 
              value={custForm.name} 
              onChange={(e) => setCustForm({...custForm, name: e.target.value})} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('phone') || 'Phone'} *</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all text-deep-navy" 
              required 
              value={custForm.phone} 
              onChange={(e) => setCustForm({...custForm, phone: e.target.value})} 
              placeholder="+91 9876543210" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Email Address</label>
            <input 
              type="email"
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all text-deep-navy" 
              value={custForm.email || ''} 
              onChange={(e) => setCustForm({...custForm, email: e.target.value})} 
              placeholder="customer@example.com" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Due Date</label>
            <input 
              type="date"
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all text-deep-navy" 
              value={custForm.paymentDueDate || ''} 
              onChange={(e) => setCustForm({...custForm, paymentDueDate: e.target.value})} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('address') || 'Address'}</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all text-deep-navy" 
              value={custForm.address} 
              onChange={(e) => setCustForm({...custForm, address: e.target.value})} 
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-soft-gray">
            <button 
              type="button" 
              className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors" 
              onClick={() => setShowCustModal(false)}
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm disabled:opacity-50" 
              disabled={custSubmitting}
            >
              {custSubmitting ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
            </button>
          </div>
        </form>
      </Modal>

      {listening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-pure-white border border-soft-gray p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-red-give/10 flex items-center justify-center text-red-give relative">
              <span className="absolute w-16 h-16 rounded-full bg-red-give/20 animate-ping" />
              <HiOutlineMicrophone size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-deep-navy">
                {lang === 'hi' ? 'सुन रहा हूँ...' : lang === 'te' ? 'వింటున్నాను...' : 'Listening...'}
              </h3>
              <p className="text-xs text-slate-gray mt-1 font-medium">
                {lang === 'hi' ? 'बोलिए (जैसे: "रवि ने 300 रुपये दिए")' : lang === 'te' ? 'మాట్లాడండి (ఉదాహరణకు: "రవి 300 రూపాయలు తీసుకున్నాడు")' : 'Speak now (e.g., "Ravi took 300 rupees")'}
              </p>
            </div>
            <button
              onClick={stopListening}
              className="mt-2 w-full py-2.5 px-4 bg-deep-navy hover:bg-deep-navy-hover text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
            >
              <HiOutlineX size={18} />
              {lang === 'hi' ? 'रोकें (Stop)' : lang === 'te' ? 'ఆపండి (Stop)' : 'Stop Listening'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
