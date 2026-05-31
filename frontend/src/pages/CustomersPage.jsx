import { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useSocketSync } from '../hooks/useSocketSync';
import Header from '../components/Layout/Header';
import Modal from '../components/Common/Modal';
import Loader from '../components/Common/Loader';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineTrash, HiOutlineMicrophone, HiOutlineX, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineClock, HiOutlineMail, HiOutlineArrowUp, HiOutlineArrowDown } from 'react-icons/hi';
import { FaWhatsapp, FaSms, FaMobileAlt, FaPhone } from 'react-icons/fa';
import { useSpeechToText } from '../hooks/useSpeechToText';

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

const CustomersPage = () => {
  const { t, lang } = useLanguage();
  const { user } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', avatar: customerPresets[0].value });
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState({});
  const fileInputRef = useRef(null);

  // Quick transaction state
  const [quickTxn, setQuickTxn] = useState(null); // { customer, type }
  const [quickForm, setQuickForm] = useState({ amount: '', description: '', paymentMode: 'cash', date: new Date().toISOString().split('T')[0] });
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const openQuickTxn = (e, customer, type) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickTxn({ customer, type });
    setQuickForm({ amount: '', description: '', paymentMode: 'cash', date: new Date().toISOString().split('T')[0] });
  };

  const handleQuickTxn = async (e) => {
    e.preventDefault();
    if (!quickTxn) return;
    setQuickSubmitting(true);
    try {
      await API.post('/transactions', {
        customer: quickTxn.customer._id,
        type: quickTxn.type,
        amount: quickForm.amount,
        description: quickForm.description,
        date: quickForm.date ? new Date(quickForm.date).toISOString() : new Date().toISOString(),
        paymentMode: quickTxn.type === 'debit' ? quickForm.paymentMode : 'none',
      });
      toast.success(quickTxn.type === 'credit' ? `Udhaar recorded for ${quickTxn.customer.name}!` : `Payment received from ${quickTxn.customer.name}!`);
      setQuickTxn(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add transaction');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const speechLang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';

  const {
    isListening,
    startListening,
    stopListening,
    isSupported: isSpeechSupported
  } = useSpeechToText({
    lang: speechLang,
    onResult: (text) => {
      let cleaned = text.trim();
      cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
      const prefixRegex = /^(search\s+for|find|search|go\s+to|show)\s+/i;
      cleaned = cleaned.replace(prefixRegex, "").trim();
      
      if (cleaned) {
        setSearch(cleaned);
        toast.success(`Searching for "${cleaned}"`);
      }
    }
  });

  const toggleVoiceEntry = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchCustomers = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const { data } = await API.get('/customers', { params });
      setCustomers(data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  useSocketSync(fetchCustomers, ['customers', 'transactions']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/customers', form);
      toast.success(t('customerAdded'));
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', address: '', avatar: customerPresets[0].value });
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/customers/${deleteId}`);
      toast.success(t('customerDeleted'));
      setDeleteId(null);
      fetchCustomers();
    } catch (err) { toast.error('Delete failed'); }
  };

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

  if (loading) return <><Header title={t('customers')} subtitle={t('manageCustomers')} /><Loader fullPage /></>;

  return (
    <>
      <Header title={t('customers')} subtitle={t('manageCustomers')} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all placeholder:text-slate-gray/50" 
              placeholder={`${t('search')} ...`} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          {isSpeechSupported && (
            <button
              onClick={toggleVoiceEntry}
              className={`p-2.5 rounded-xl border-none cursor-pointer transition-all flex items-center justify-center shrink-0 shadow-sm ${
                isListening ? 'bg-red-give text-white animate-pulse' : 'bg-pure-white border border-soft-gray hover:bg-orange/10 text-slate-gray hover:text-orange'
              }`}
              title={isListening ? "Stop Listening" : "Search customer by name using voice"}
            >
              {isListening ? <HiOutlineX size={18} /> : <HiOutlineMicrophone size={18} />}
            </button>
          )}
        </div>
        <button 
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-all shadow-sm hover:shadow" 
          onClick={() => setShowForm(true)}
        >
          <HiOutlinePlus size={16} /> {t('addCustomer')}
        </button>
      </div>

      {customers.length === 0 ? (
        search ? (
          <div className="bg-pure-white border border-soft-gray rounded-2xl p-12 text-center shadow-sm space-y-4 max-w-xl mx-auto">
            <h3 className="text-lg font-bold text-deep-navy mb-0">No customer found matching "{search}"</h3>
            <p className="text-sm text-slate-gray mt-0">Would you like to add them to your ledger?</p>
            <button 
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-all shadow-sm hover:shadow" 
              onClick={() => {
                setForm(prev => ({ ...prev, name: search }));
                setShowForm(true);
              }}
            >
              <HiOutlinePlus size={16} /> Add "{search}"
            </button>
          </div>
        ) : (
          <div className="bg-pure-white border border-soft-gray rounded-2xl p-12 text-center shadow-sm space-y-4 max-w-xl mx-auto">
            <h3 className="text-lg font-bold text-deep-navy mb-0">{t('noCustomers')}</h3>
            <p className="text-sm text-slate-gray mt-0">{t('addFirstCustomer')}</p>
            <button 
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-all shadow-sm hover:shadow" 
              onClick={() => setShowForm(true)}
            >
              <HiOutlinePlus size={16} /> {t('addCustomer')}
            </button>
          </div>
        )
      ) : (
        <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-soft-white border-b border-soft-gray">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('customerName')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('phone')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('balance')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">Status & Score</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-b border-soft-gray/50 hover:bg-light-cream/10 transition-colors">
                  <td className="px-6 py-4 text-sm align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full border border-soft-gray overflow-hidden flex items-center justify-center bg-light-cream flex-shrink-0">
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-extrabold text-orange uppercase">{c.name.charAt(0)}</span>
                        )}
                      </div>
                      <Link to={`/customers/${c._id}`} className="text-deep-navy font-bold hover:text-orange transition-colors decoration-none">
                        {c.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm align-middle text-deep-navy">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span>{c.phone}</span>
                      </div>
                      {c.email && (
                        <span className="text-[11px] text-slate-gray/70 font-medium block mt-0.5 select-all">
                          {c.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm align-middle font-bold ${c.balance > 0 ? 'text-red-give' : 'text-green-get'}`}>
                    ₹{Math.abs(c.balance).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    {c.totalTransactions > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full w-max ${
                          c.duePrediction === 'trusted' ? 'bg-green-get/10 text-green-get' :
                          c.duePrediction === 'delay' ? 'bg-warning-pending/10 text-warning-pending' :
                          'bg-red-give/10 text-red-give'
                        }`}>
                          {c.duePrediction === 'trusted' ? (
                            <>
                              <HiOutlineCheckCircle size={12} className="shrink-0 text-green-get" />
                              Trusted
                            </>
                          ) : c.duePrediction === 'delay' ? (
                            <>
                              <HiOutlineExclamation size={12} className="shrink-0 text-warning-pending" />
                              Late Payer
                            </>
                          ) : (
                            <>
                              <HiOutlineExclamation size={12} className="shrink-0 text-red-give" />
                              Risky
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-gray/70 font-semibold px-2">
                          Score: <strong className={
                            c.creditScore >= 700 ? 'text-green-get' :
                            c.creditScore >= 550 ? 'text-warning-pending' :
                            'text-red-give'
                          }>{c.creditScore}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full w-max bg-slate-gray/10 text-slate-gray">
                          <HiOutlineClock size={12} className="shrink-0" /> No History
                        </span>
                        <span className="text-[10px] text-slate-gray/50 font-semibold px-2">
                          Score: <strong>—</strong>
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    {c.balance > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-give/10 text-red-give">{t('due')}</span>
                    ) : c.balance < 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-get/10 text-green-get">{t('advance')}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-get/10 text-green-get">{t('clear')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <div className="flex items-center gap-1.5">
                      <button
                        title="You Gave — Record Udhaar"
                        onClick={(e) => openQuickTxn(e, c, 'credit')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-give/10 hover:bg-red-give/20 text-red-give text-[10px] font-bold rounded-lg border-none cursor-pointer transition-colors"
                      >
                        <HiOutlineArrowUp size={11} /> You Gave
                      </button>
                      <button
                        title="You Got — Record Payment"
                        onClick={(e) => openQuickTxn(e, c, 'debit')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-get/10 hover:bg-green-get/20 text-green-get text-[10px] font-bold rounded-lg border-none cursor-pointer transition-colors"
                      >
                        <HiOutlineArrowDown size={11} /> You Got
                      </button>
                      {c.balance > 0 && (
                        <button 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange hover:bg-orange-hover text-white text-[10px] font-bold rounded-lg border-none cursor-pointer transition-colors shadow-sm" 
                          title="Send Email Reminder" 
                          onClick={(e) => handleEmailRemind(e, c)}
                          disabled={sendingEmail[c._id]}
                        >
                          {sendingEmail[c._id] ? (
                            <span className="w-3 h-3 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <HiOutlineMail size={11} />
                          )}
                          Email
                        </button>
                      )}
                      <button 
                        className="p-1.5 text-slate-gray hover:text-red-give hover:bg-red-give/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-transparent transition-colors" 
                        onClick={() => setDeleteId(c._id)} 
                        title={t('delete')}
                      >
                        <HiOutlineTrash size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={t('addCustomer')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">Profile Photo</label>
            <div className="flex items-center gap-4 p-3 bg-soft-white border border-soft-gray rounded-xl w-full">
              {/* Avatar Preview */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <div 
                  className="w-16 h-16 rounded-full bg-pure-white border-2 border-orange flex items-center justify-center overflow-hidden cursor-pointer shadow-sm hover:scale-105 transition-transform"
                  onClick={() => fileInputRef.current.click()}
                  type="button"
                >
                  {form.avatar ? (
                    <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
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
                  ref={fileInputRef}
                  onChange={handleFileChange}
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
                    const isSelected = form.avatar === p.value;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all p-0 cursor-pointer ${
                          isSelected ? 'border-orange scale-110 shadow-sm' : 'border-soft-gray opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => setForm(prev => ({ ...prev, avatar: p.value }))}
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
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('customerName')} *</label>
            <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('phone')} *</label>
            <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" required value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+91 9876543210" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Email Address</label>
            <input type="email" className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="customer@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('address')}</label>
            <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-soft-gray">
            <button type="button" className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors" onClick={() => setShowForm(false)}>{t('cancel')}</button>
            <button type="submit" className="px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm" disabled={submitting}>{submitting ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t('deleteCustomer')} message={t('deleteCustomerMsg')} />

      {/* Quick Add Transaction Modal */}
      <Modal
        isOpen={!!quickTxn}
        onClose={() => setQuickTxn(null)}
        title={quickTxn?.type === 'credit'
          ? `Udhaar — ${quickTxn?.customer?.name}`
          : `Payment Received — ${quickTxn?.customer?.name}`}
      >
        {quickTxn && (
          <form onSubmit={handleQuickTxn} className="space-y-4">
            {/* Type toggle */}
            <div className="flex rounded-xl overflow-hidden border border-soft-gray">
              <button
                type="button"
                onClick={() => setQuickTxn(prev => ({ ...prev, type: 'credit' }))}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-none cursor-pointer transition-colors ${
                  quickTxn.type === 'credit'
                    ? 'bg-red-give text-white'
                    : 'bg-transparent text-slate-gray hover:bg-red-give/5'
                }`}
              >
                <HiOutlineArrowUp size={13} /> You Gave
              </button>
              <button
                type="button"
                onClick={() => setQuickTxn(prev => ({ ...prev, type: 'debit' }))}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-none cursor-pointer transition-colors ${
                  quickTxn.type === 'debit'
                    ? 'bg-green-get text-white'
                    : 'bg-transparent text-slate-gray hover:bg-green-get/5'
                }`}
              >
                <HiOutlineArrowDown size={13} /> You Got
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Amount *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-gray font-extrabold text-base">₹</span>
                <input
                  className="w-full pl-8 pr-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all font-bold text-deep-navy"
                  type="number" min="0.01" step="0.01" required autoFocus
                  value={quickForm.amount}
                  onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Description</label>
              <input
                className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
                value={quickForm.description}
                onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                placeholder={quickTxn.type === 'credit' ? 'e.g. Rice 5kg, Atta 2kg' : 'e.g. Cash payment'}
              />
            </div>

            {quickTxn.type === 'debit' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Mode</label>
                <select
                  className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
                  value={quickForm.paymentMode}
                  onChange={(e) => setQuickForm({ ...quickForm, paymentMode: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="online">Online Transfer</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('date') || 'Date'}</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setQuickForm({ ...quickForm, date: new Date().toISOString().split('T')[0] })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    quickForm.date === new Date().toISOString().split('T')[0]
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
                    setQuickForm({ ...quickForm, date: yesterday.toISOString().split('T')[0] });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    quickForm.date === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                      ? 'bg-orange text-white border-orange shadow-xs'
                      : 'bg-soft-white text-slate-gray border-soft-gray hover:bg-slate-gray/5'
                  }`}
                >
                  Yesterday
                </button>
              </div>
              <input
                className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
                type="date"
                value={quickForm.date || ''}
                onChange={(e) => setQuickForm({ ...quickForm, date: e.target.value })}
              />
            </div>

            {/* Live Preview Card */}
            {quickForm.amount && parseFloat(quickForm.amount) > 0 && (() => {
              const currentBal = quickTxn.customer.balance;
              const txnAmount = parseFloat(quickForm.amount) || 0;
              const isCredit = quickTxn.type === 'credit';
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

            <div className="flex justify-end gap-3 pt-3 border-t border-soft-gray">
              <button
                type="button"
                className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                onClick={() => setQuickTxn(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={quickSubmitting}
                className={`px-5 py-2.5 text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm disabled:opacity-50 ${
                  quickTxn.type === 'credit' ? 'bg-red-give hover:bg-red-hover' : 'bg-green-get hover:bg-green-hover'
                }`}
              >
                {quickSubmitting ? 'Adding...' : 'Add Transaction'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {isListening && (
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
              <span className="inline-block mt-3 text-[10px] bg-soft-white border border-soft-gray px-2 py-1 rounded-full text-slate-gray font-semibold">
                Telugu / Hindi / English supported
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 h-8 my-2">
              <span className="w-1 h-3 bg-red-give rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span className="w-1 h-6 bg-red-give rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-1 h-4 bg-red-give rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              <span className="w-1 h-7 bg-red-give rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              <span className="w-1 h-5 bg-red-give rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
              <span className="w-1 h-3 bg-red-give rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
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
    </>
  );
};

export default CustomersPage;
