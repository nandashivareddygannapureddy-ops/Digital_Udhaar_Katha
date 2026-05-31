import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api/axios';
import { useSocketSync } from '../hooks/useSocketSync';
import Header from '../components/Layout/Header';
import Modal from '../components/Common/Modal';
import Loader from '../components/Common/Loader';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  HiOutlineArrowLeft, HiOutlineArrowUp, HiOutlineArrowDown,
  HiOutlineDocumentDownload, HiOutlineTrash,
  HiOutlinePhone, HiOutlineLocationMarker, HiOutlineCalendar,
  HiOutlineExclamation, HiOutlineCheckCircle, HiOutlinePencil,
  HiOutlineMicrophone, HiOutlineSparkles, HiOutlineLightBulb,
  HiOutlineX, HiOutlineClock, HiOutlineMail, HiOutlineCamera, HiOutlineXCircle
} from 'react-icons/hi';
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

const CustomerDetailPage = () => {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const chatEndRef = useRef(null);
  const { user } = useContext(AuthContext);
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Voice Entry configuration
  const speechLang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';

  const {
    isListening,
    startListening,
    stopListening,
    isSupported: isSpeechSupported
  } = useSpeechToText({
    lang: speechLang,
    onResult: async (text) => {
      try {
        toast.info(`Processing voice: "${text}"...`);
        const { data } = await API.post('/ai/voice-entry', { text, customerId: id });
        toast.success(data.message);
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to parse voice entry');
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
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnType, setTxnType] = useState('credit');
  const [txnForm, setTxnForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', description: '', date: '', paymentStatus: 'PENDING', paymentMode: '' });
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    riskLevel: 'low',
    avatar: '',
    paymentDueDate: ''
  });
  const customerFileInputRef = useRef(null);

  const handleCustomerFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomerForm(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [billImageBase64, setBillImageBase64] = useState('');
  const [editBillImageBase64, setEditBillImageBase64] = useState('');

  const compressAndSetImage = (file, isEdit = false) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 800;
        const max_height = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > max_width) {
            height *= max_width / width;
            width = max_width;
          }
        } else {
          if (height > max_height) {
            width *= max_height / height;
            height = max_height;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        if (isEdit) {
          setEditBillImageBase64(compressedDataUrl);
        } else {
          setBillImageBase64(compressedDataUrl);
        }
      };
    };
  };

  const handleTxnPhotoChange = (e) => {
    const file = e.target.files[0];
    compressAndSetImage(file, false);
  };

  const handleEditTxnPhotoChange = (e) => {
    const file = e.target.files[0];
    compressAndSetImage(file, true);
  };

  const openEditCustomerModal = () => {
    if (!customer) return;
    setCustomerForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      riskLevel: customer.riskLevel || 'low',
      avatar: customer.avatar || '',
      paymentDueDate: customer.paymentDueDate ? new Date(customer.paymentDueDate).toISOString().split('T')[0] : ''
    });
    setShowEditCustomer(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await API.put(`/customers/${id}`, customerForm);
      setCustomer(data.data);
      toast.success('Customer profile updated successfully');
      setShowEditCustomer(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const [qrAmount, setQrAmount] = useState(0);

  const handleDownloadQR = () => {
    if (!user?.upiId || !customer) return;
    const upiUri = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(user.storeName || 'Merchant')}&am=${qrAmount}&cu=INR&tn=${encodeURIComponent(`Payment for ${customer.name}`)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUri)}`;
    window.open(qrUrl, '_blank');
  };

  const fetchData = async () => {
    try {
      const [custRes, txnRes] = await Promise.all([
        API.get(`/customers/${id}`),
        API.get(`/transactions?customer=${id}&limit=200`),
      ]);
      const custData = custRes.data.data.customer;
      setCustomer(custData);
      setQrAmount(custData.balance > 0 ? custData.balance : 0);
      setTransactions(txnRes.data.data);
    } catch (err) { toast.error('Failed to load customer'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  useSocketSync(fetchData, ['customers', 'transactions']);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transactions]);

  const handleAddTxn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Send the full ISO datetime so the server stores the exact time of the transaction
      const now = new Date();
      const dateValue = txnForm.date && txnForm.date !== now.toISOString().split('T')[0]
        ? new Date(txnForm.date).toISOString()   // user picked a past date → midnight of that day
        : now.toISOString();                       // default → exact current time
      await API.post('/transactions', {
        customer: id, type: txnType,
        amount: txnForm.amount, description: txnForm.description, date: dateValue,
        paymentMode: txnForm.paymentMode,
        billImageUrl: billImageBase64,
      });
      toast.success(txnType === 'credit' ? t('udhaarRecorded') : t('paymentRecorded'));
      setShowTxnModal(false);
      setTxnForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash' });
      setBillImageBase64('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/transactions/${deleteId}`);
      toast.success(t('transactionDeleted'));
      setDeleteId(null);
      fetchData();
    } catch (err) { toast.error('Delete failed'); }
  };

  const openEditModal = (txn) => {
    setEditingTxn(txn);
    setEditForm({
      amount: txn.amount,
      description: txn.description || '',
      date: txn.date ? new Date(txn.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      paymentStatus: txn.paymentStatus || 'PENDING',
      paymentMode: txn.paymentMode || 'none',
    });
    setEditBillImageBase64(txn.billImageUrl || '');
    setShowEditModal(true);
  };

  const handleEditTxn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.put(`/transactions/${editingTxn._id}`, {
        amount: editForm.amount,
        description: editForm.description,
        date: editForm.date,
        paymentStatus: editForm.paymentStatus,
        paymentMode: editForm.paymentMode,
        billImageUrl: editBillImageBase64,
      });
      if (editForm.paymentStatus === 'SETTLED') {
        toast.success(t('transactionMarkedAsPaid'));
      } else {
        toast.success('Transaction updated successfully');
      }
      setShowEditModal(false);
      setEditingTxn(null);
      setEditBillImageBase64('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async (txnId) => {
    try {
      await API.put(`/transactions/${txnId}/settle`);
      toast.success(t('transactionMarkedAsPaid'));
      fetchData();
    } catch (err) { toast.error('Failed'); }
  };

  const handleApprovePayment = async (txnId) => {
    try {
      await API.put(`/transactions/${txnId}/approve`);
      toast.success('UPI Payment Approved & Ledger Settled!');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve payment'); }
  };

  const handleDeclinePayment = async (txnId) => {
    try {
      await API.put(`/transactions/${txnId}/decline`);
      toast.success('UPI Payment Declined / Verification Failed!');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to decline payment'); }
  };

  const handleEmailReminder = async () => {
    if (!customer) return;
    if (!customer.email) {
      toast.warning('Please add an email address to this customer first.');
      return;
    }
    
    setSendingEmail(true);
    try {
      const { data } = await API.post(`/reminders/send/${customer._id}`);
      toast.success(data.message || `Email Reminder sent to ${customer.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send Email reminder');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await API.get(`/reminder/statement/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customer.name}-statement.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t('downloadStatement'));
    } catch (err) { 
      toast.error('Download failed'); 
    }
  };

  const handleViewPDF = async () => {
    try {
      const response = await API.get(`/reminder/statement/${id}`, { responseType: 'blob' });
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (err) {
      toast.error('Failed to load viewer');
    }
  };

  const openTxnModal = (type) => {
    setTxnType(type);
    setTxnForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setBillImageBase64('');
    setShowTxnModal(true);
  };

  // Group transactions by date for chat separators
  // Use createdAt as the reliable timestamp (has both date & exact time), fall back to date
  const getTxnTimestamp = (txn) => new Date(txn.createdAt || txn.date);

  const groupedTransactions = () => {
    const sorted = [...transactions].sort((a, b) => getTxnTimestamp(a) - getTxnTimestamp(b));
    const groups = [];
    let currentDate = '';
    for (const txn of sorted) {
      const ts = getTxnTimestamp(txn);
      const dateStr = ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ type: 'date', label: dateStr });
      }
      groups.push({ type: 'txn', data: txn });
    }
    return groups;
  };

  if (loading) return <><Header title={t('loading')} /><Loader fullPage /></>;
  if (!customer) return <><Header title="Not Found" /><div className="bg-pure-white border border-soft-gray rounded-2xl p-12 text-center shadow-sm max-w-lg mx-auto mt-12"><h3>Customer not found</h3></div></>;

  const riskBadgeClasses = {
    low: 'bg-green-get/10 text-green-get',
    medium: 'bg-warning-pending/10 text-warning-pending',
    high: 'bg-red-give/10 text-red-give'
  };

  const totalGave = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPaid = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <>
      <Header title={customer.name} subtitle={customer.phone} />

      {/* Back link */}
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-slate-gray hover:text-deep-navy font-semibold text-sm transition-colors mb-6 decoration-none">
        <HiOutlineArrowLeft /> {t('backToCustomers')}
      </Link>

      {/* Customer Profile + Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col items-center py-3 border-b border-soft-gray/50">
            <div className="w-20 h-20 rounded-full border-2 border-orange/25 overflow-hidden flex items-center justify-center bg-light-cream shadow-sm relative mb-3">
              {customer.avatar ? (
                <img src={customer.avatar} alt={customer.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-orange uppercase">{customer.name.charAt(0)}</span>
              )}
            </div>
            <h4 className="text-base font-bold text-deep-navy m-0">{customer.name}</h4>
            <span className="text-xs text-slate-gray mt-1">{customer.phone}</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <label className="text-slate-gray font-medium inline-flex items-center"><HiOutlinePhone className="mr-1.5 text-slate-gray/60" /> {t('phone')}</label>
              <span className="font-semibold text-deep-navy">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex justify-between items-center text-sm">
                <label className="text-slate-gray font-medium inline-flex items-center"><HiOutlineMail className="mr-1.5 text-slate-gray/60" /> Email</label>
                <span className="font-semibold text-deep-navy select-all truncate max-w-[180px]" title={customer.email}>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex justify-between items-start text-sm">
                <label className="text-slate-gray font-medium inline-flex items-center"><HiOutlineLocationMarker className="mr-1.5 text-slate-gray/60" /> {t('address')}</label>
                <span className="font-semibold text-deep-navy text-right max-w-[180px] break-words">{customer.address}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <label className="text-slate-gray font-medium inline-flex items-center"><HiOutlineCalendar className="mr-1.5 text-slate-gray/60" /> Payment Due Date</label>
              <span className={`font-semibold text-deep-navy ${customer.paymentDueDate && new Date(customer.paymentDueDate) <= new Date() ? 'text-red-give font-bold' : ''}`}>
                {customer.paymentDueDate ? new Date(customer.paymentDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Due Date'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <label className="text-slate-gray font-medium inline-flex items-center"><HiOutlineCalendar className="mr-1.5 text-slate-gray/60" /> {t('customerSince')}</label>
              <span className="font-semibold text-deep-navy">{new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-soft-gray/30 pt-2.5 mt-2.5">
              <label className="text-slate-gray font-medium inline-flex items-center"><HiOutlineSparkles className="mr-1.5 text-slate-gray/60" /> Status Prediction</label>
              {customer.totalTransactions > 0 ? (
                <span className={`font-bold px-2.5 py-1 rounded-full text-[11px] inline-flex items-center gap-1 ${
                  customer.duePrediction === 'trusted' ? 'bg-green-get/10 text-green-get' :
                  customer.duePrediction === 'delay' ? 'bg-warning-pending/10 text-warning-pending' :
                  'bg-red-give/10 text-red-give'
                }`}>
                  {customer.duePrediction === 'trusted' ? (
                    <>
                      <HiOutlineCheckCircle size={13} className="shrink-0 text-green-get" />
                      Trusted Customer
                    </>
                  ) : customer.duePrediction === 'delay' ? (
                    <>
                      <HiOutlineExclamation size={13} className="shrink-0 text-warning-pending" />
                      Late Payer
                    </>
                  ) : (
                    <>
                      <HiOutlineExclamation size={13} className="shrink-0 text-red-give" />
                      Risky Customer
                    </>
                  )}
                </span>
              ) : (
                <span className="font-bold px-2.5 py-1 rounded-full text-[11px] inline-flex items-center gap-1 bg-slate-gray/10 text-slate-gray">
                  <HiOutlineClock size={13} className="shrink-0" /> No History
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <label className="text-slate-gray font-medium inline-flex items-center"><HiOutlineLightBulb className="mr-1.5 text-slate-gray/60" /> Credit Score</label>
              <div className="flex items-center gap-1 font-bold">
                {customer.totalTransactions > 0 ? (
                  <>
                    <span className={`${
                      customer.creditScore >= 700 ? 'text-green-get' :
                      customer.creditScore >= 550 ? 'text-warning-pending' :
                      'text-red-give'
                    }`}>
                      {customer.creditScore}
                    </span>
                    <span className="text-[10px] text-slate-gray/60 font-semibold">/ 900</span>
                  </>
                ) : (
                  <span className="text-slate-gray/50">—</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-3 border-t border-soft-gray/50">
            {customer.balance > 0 && (
              <button 
                className="w-full py-2.5 bg-orange hover:bg-orange-hover text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-sm" 
                onClick={handleEmailReminder} 
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <span className="w-3.5 h-3.5 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiOutlineMail size={14} />
                )}
                Send Email Reminder
              </button>
            )}
            <div className="flex gap-2 w-full">
              <button className="flex-1 py-2.5 bg-transparent hover:bg-slate-gray/5 text-slate-gray border border-soft-gray font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer" onClick={handleViewPDF}>
                View Statement
              </button>
              <button className="flex-1 py-2.5 bg-transparent hover:bg-slate-gray/5 text-slate-gray border border-soft-gray font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer" onClick={handleDownloadPDF}>
                <HiOutlineDocumentDownload size={14} /> Download PDF
              </button>
            </div>
            <button className="w-full py-2.5 bg-transparent hover:bg-orange/5 text-orange border border-orange/30 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer" onClick={openEditCustomerModal}>
              <HiOutlinePencil size={14} /> Edit Customer Profile
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-pure-white border border-soft-gray rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col md:flex-row gap-6 items-stretch h-full">
            {/* Left side: Stats */}
            <div className="flex-1 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl flex flex-col justify-between border ${
                  customer.balance > 0 ? 'bg-red-give/5 border-red-give/10' : 'bg-green-get/5 border-green-get/10'
                }`}>
                  <span className="text-xs text-slate-gray font-semibold">Remaining Outstanding</span>
                  <span className={`text-2xl font-extrabold mt-2 ${
                    customer.balance > 0 ? 'text-red-give' : 'text-green-get'
                  }`}>
                    ₹{customer.balance > 0 ? customer.balance.toLocaleString('en-IN') : 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl flex flex-col justify-between border bg-green-get/5 border-green-get/10">
                  <span className="text-xs text-slate-gray font-semibold">Total Paid (Got)</span>
                  <span className="text-2xl font-extrabold text-green-get mt-2">
                    ₹{totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs text-slate-gray/70 font-semibold pt-4 border-t border-soft-gray/50">
                <span>Total Udhaar: <strong className="text-deep-navy font-bold">₹{totalGave.toLocaleString('en-IN')}</strong></span>
                <span>{transactions.length} {t('transactions')}</span>
              </div>
            </div>

            {/* Right side: UPI QR Payment Integration */}
            <div className="w-full md:w-60 border-t md:border-t-0 md:border-l border-soft-gray/50 pt-6 md:pt-0 md:pl-6 flex flex-col items-center justify-center text-center">
              {user?.upiId ? (
                <>
                  <div className="bg-light-cream/30 border border-soft-gray/60 p-2.5 rounded-2xl shadow-inner mb-3">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(user.storeName || 'Merchant')}&am=${qrAmount}&cu=INR&tn=${encodeURIComponent(`Payment for ${customer.name}`)}`
                      )}`} 
                      alt="UPI QR Code" 
                      className="w-36 h-36 object-contain block bg-pure-white rounded-lg cursor-pointer"
                      onClick={handleDownloadQR}
                      title="Click to open full size QR code"
                    />
                  </div>
                  <span className="text-xs font-bold text-deep-navy">Scan & Pay via UPI</span>
                  
                  {/* Custom QR Amount Input */}
                  <div className="flex items-center gap-1.5 mt-2 bg-soft-white border border-soft-gray rounded-lg px-2 py-1 max-w-[150px]">
                    <span className="text-[10px] font-bold text-slate-gray">₹</span>
                    <input 
                      type="number" 
                      className="w-full bg-transparent border-none outline-none text-xs font-black text-deep-navy p-0 focus:ring-0 text-center" 
                      value={qrAmount}
                      onChange={(e) => setQrAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      title="Adjust amount for QR code"
                    />
                  </div>

                  <span className="text-[10px] text-slate-gray mt-2 max-w-[180px] leading-relaxed">
                    Scan to pay <strong className="text-orange">₹{qrAmount.toLocaleString('en-IN')}</strong> using GPay, PhonePe, or Paytm
                  </span>
                  
                  <button 
                    onClick={handleDownloadQR}
                    className="mt-2 text-[10px] font-bold text-orange hover:text-orange-hover bg-transparent border-none cursor-pointer hover:underline"
                  >
                    Open Full Size QR
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-3 h-full">
                  <div className="w-12 h-12 rounded-full bg-orange/10 flex items-center justify-center text-orange mb-3">
                    <HiOutlineExclamation size={24} />
                  </div>
                  <span className="text-xs font-bold text-deep-navy">UPI ID Required</span>
                  <p className="text-[10px] text-slate-gray mt-1 leading-relaxed max-w-[180px]">
                    Configure your UPI ID in settings to automatically generate payment QR codes.
                  </p>
                  <Link 
                    to="/settings" 
                    className="mt-3 px-3 py-1.5 bg-orange/10 hover:bg-orange/20 text-orange rounded-lg text-xs font-bold decoration-none transition-colors"
                  >
                    Setup UPI
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp-style Chat Timeline */}
      <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm overflow-hidden mb-24">
        <div className="px-6 py-4 border-b border-soft-gray">
          <h3 className="text-base font-bold text-deep-navy mb-0">{t('transactionHistory')}</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-16 px-6">
            <h3 className="text-lg font-bold text-deep-navy mb-1">{t('noTransactions')}</h3>
            <p className="text-sm text-slate-gray">{t('recordFirst')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6 bg-[#F8F7F5]/50 min-h-[300px] max-h-[500px] overflow-y-auto">
            {groupedTransactions().map((item, i) => {
              if (item.type === 'date') {
                return (
                  <div className="flex justify-center my-2" key={`date-${i}`}>
                    <span className="px-3 py-1 bg-soft-gray/50 text-slate-gray text-[10px] font-bold rounded-full shadow-sm">
                      {item.label}
                    </span>
                  </div>
                );
              }
              const txn = item.data;
              const isCredit = txn.type === 'credit';
              const isSettled = txn.paymentStatus === 'SETTLED';

              return (
                <div 
                  className={`flex flex-col p-3.5 rounded-2xl shadow-sm max-w-[75%] border gap-1 ${
                    isCredit 
                      ? 'self-end bg-[#FFF8F2] border-orange/15 rounded-tr-none' 
                      : 'self-start bg-[#F0FDF4] border-green-get/15 rounded-tl-none'
                  }`} 
                  key={txn._id}
                >
                  <div className="flex justify-between items-center gap-8 border-b border-soft-gray/30 pb-1.5 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-gray/70">
                      {isCredit ? t('youGave') : t('youGot')}
                    </span>
                    <span className="text-[9px] font-mono text-slate-gray/60 bg-soft-gray/20 px-1.5 py-0.5 rounded font-semibold" title="Transaction ID">
                      ID: {txn._id}
                    </span>
                  </div>
                  
                  {/* Amount shows green if settled or debit, red/orange if credit pending */}
                  <div className={`text-lg font-black ${
                    (isSettled || !isCredit) ? 'text-green-get' : 'text-red-give'
                  }`}>
                    {isCredit ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                  </div>

                  {txn.description && <div className="text-xs text-deep-navy/80 font-medium break-words max-w-full">{txn.description}</div>}
                  {txn.billImageUrl && (
                    <img 
                      src={txn.billImageUrl} 
                      alt="Bill" 
                      className="w-24 h-24 object-cover rounded-lg border border-soft-gray cursor-pointer hover:opacity-90 transition-opacity mt-1"
                      onClick={() => setLightboxImg(txn.billImageUrl)} 
                    />
                  )}
                  
                  <div className="flex items-center gap-2 text-[9px] text-slate-gray/60 font-semibold mt-1 border-t border-soft-gray/30 pt-1.5 justify-between">
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-[9px] text-slate-gray/70">
                        {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(txn.createdAt || txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                      {txn.type === 'debit' && txn.paymentMode && txn.paymentMode !== 'none' && (
                        <span className="text-[8px] font-extrabold uppercase text-slate-gray/80">
                          via {txn.paymentMode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 self-end">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                        isSettled 
                          ? 'bg-green-get/10 text-green-get' 
                          : 'bg-warning-pending/10 text-warning-pending'
                      }`}>
                        {isSettled ? t('settled') : t('pending')}
                      </span>
                      {isCredit && !isSettled && (
                        <button 
                          onClick={() => handleSettle(txn._id)}
                          className="bg-transparent border-none text-orange hover:text-orange-hover cursor-pointer text-[9px] font-bold flex items-center gap-0.5 p-0"
                        >
                          <HiOutlineCheckCircle size={12} /> {t('markAsSettled')}
                        </button>
                      )}
                      {!isCredit && !isSettled && (
                        <div className="flex gap-1 items-center">
                          <button 
                            onClick={() => handleApprovePayment(txn._id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded px-2 py-0.5 cursor-pointer text-[8px] font-bold flex items-center gap-0.5"
                          >
                            <HiOutlineCheckCircle size={10} /> Approve
                          </button>
                          <button 
                            onClick={() => handleDeclinePayment(txn._id)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded px-2 py-0.5 cursor-pointer text-[8px] font-bold flex items-center gap-0.5"
                          >
                            <HiOutlineXCircle size={10} /> Decline
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => openEditModal(txn)}
                        className="bg-transparent border-none text-slate-gray hover:text-deep-navy cursor-pointer p-0 ml-1"
                        title="Edit Transaction"
                      >
                        <HiOutlinePencil size={11} />
                      </button>
                      <button 
                        onClick={() => setDeleteId(txn._id)}
                        className="bg-transparent border-none text-slate-gray hover:text-red-give cursor-pointer p-0"
                        title={t('delete')}
                      >
                        <HiOutlineTrash size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30 w-full max-w-md px-4 items-center">
        <button 
          className="flex-1 py-3.5 bg-red-give hover:bg-red-hover text-white rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold text-sm border-none cursor-pointer transition-transform hover:-translate-y-0.5 animate-in slide-in-from-bottom duration-300" 
          onClick={() => openTxnModal('credit')}
        >
          <HiOutlineArrowUp size={18} /> {t('youGave')}
        </button>
        
        {isSpeechSupported && (
          <button
            type="button"
            onClick={toggleVoiceEntry}
            className={`p-3.5 rounded-xl shadow-lg flex items-center justify-center border-none cursor-pointer transition-all hover:scale-105 ${
              isListening ? 'bg-red-give text-white animate-pulse' : 'bg-orange text-white hover:bg-orange-hover'
            }`}
            title={isListening ? "Stop Listening" : "Voice Transaction Entry (Telugu/Hindi/English)"}
          >
            {isListening ? <HiOutlineX size={18} /> : <HiOutlineMicrophone size={18} />}
          </button>
        )}

        <button 
          className="flex-1 py-3.5 bg-green-get hover:bg-green-hover text-white rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold text-sm border-none cursor-pointer transition-transform hover:-translate-y-0.5 animate-in slide-in-from-bottom duration-300" 
          onClick={() => openTxnModal('debit')}
        >
          <HiOutlineArrowDown size={18} /> {t('youGot')}
        </button>
      </div>

      {/* Add Transaction Modal */}
      <Modal isOpen={showTxnModal} onClose={() => setShowTxnModal(false)}
        title={txnType === 'credit' ? t('youGave') : t('youGot')}>
        <form onSubmit={handleAddTxn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('amount')} *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-gray font-extrabold text-base">₹</span>
              <input 
                className="w-full pl-8 pr-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all font-bold text-deep-navy" 
                type="number" 
                min="0.01" 
                step="0.01" 
                required
                value={txnForm.amount} 
                onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
                placeholder="0.00" 
                autoFocus 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('description')}</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
              value={txnForm.description}
              onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })}
              placeholder="e.g., Rice 10kg, Atta 5kg" 
            />
          </div>
          {txnType === 'debit' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Mode *</label>
              <select 
                className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
                value={txnForm.paymentMode || 'cash'} 
                onChange={(e) => setTxnForm({ ...txnForm, paymentMode: e.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="online">Online Transfer</option>
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('date')}</label>
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
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
              type="date" 
              value={txnForm.date}
              onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })} 
            />
          </div>

          {/* Camera Capture for Product Photo / Proof */}
          <div className="space-y-1.5 pt-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Product or Bill Photo</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="txn-camera-input"
                className="hidden"
                onChange={handleTxnPhotoChange}
              />
              <button
                type="button"
                onClick={() => document.getElementById('txn-camera-input').click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-soft-gray hover:border-slate-350 text-deep-navy rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                <HiOutlineCamera size={15} className="text-orange" />
                <span>Take Product Photo</span>
              </button>

              {billImageBase64 && (
                <button
                  type="button"
                  onClick={() => setBillImageBase64('')}
                  className="px-3 py-2 bg-red-give/10 hover:bg-red-give/20 border border-red-give/20 hover:border-red-give/30 text-red-give rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Remove Photo
                </button>
              )}
            </div>
            {billImageBase64 && (
              <div className="mt-2 relative w-24 h-24 border border-soft-gray rounded-xl overflow-hidden shadow-sm">
                <img
                  src={billImageBase64}
                  alt="Product/Bill Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Live Preview Card */}
          {customer && txnForm.amount && parseFloat(txnForm.amount) > 0 && (() => {
            const currentBal = customer.balance;
            const txnAmount = parseFloat(txnForm.amount) || 0;
            const isCredit = txnType === 'credit';
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
              onClick={() => setShowTxnModal(false)}
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm disabled:opacity-50 ${
                txnType === 'credit' ? 'bg-red-give hover:bg-red-hover text-white' : 'bg-green-get hover:bg-green-hover text-white'
              }`} 
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Transaction">
        <form onSubmit={handleEditTxn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('amount')} (₹) *</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-lg focus:outline-none focus:border-orange transition-all text-center font-bold" 
              type="number" 
              min="0.01" 
              step="0.01" 
              required
              value={editForm.amount} 
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              placeholder="Enter amount" 
              autoFocus 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('description')}</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="e.g., Rice 10kg, Atta 5kg" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('date')}</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
              type="date" 
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Status *</label>
            <select 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-colors" 
              required 
              value={editForm.paymentStatus}
              onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
            >
              <option value="PENDING">{t('pending')}</option>
              <option value="SETTLED">{t('settled')}</option>
            </select>
          </div>
          {editingTxn?.type === 'debit' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Mode *</label>
              <select 
                className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-colors" 
                required 
                value={editForm.paymentMode || 'cash'}
                onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="online">Online Transfer</option>
              </select>
            </div>
          )}

          {/* Camera Capture for Product Photo / Proof in edit */}
          <div className="space-y-1.5 pt-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Product or Bill Photo</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="edit-txn-camera-input"
                className="hidden"
                onChange={handleEditTxnPhotoChange}
              />
              <button
                type="button"
                onClick={() => document.getElementById('edit-txn-camera-input').click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-soft-gray hover:border-slate-350 text-deep-navy rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                <HiOutlineCamera size={15} className="text-orange" />
                <span>Take Product Photo</span>
              </button>

              {editBillImageBase64 && (
                <button
                  type="button"
                  onClick={() => setEditBillImageBase64('')}
                  className="px-3 py-2 bg-red-give/10 hover:bg-red-give/20 border border-red-give/20 hover:border-red-give/30 text-red-give rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Remove Photo
                </button>
              )}
            </div>
            {editBillImageBase64 && (
              <div className="mt-2 relative w-24 h-24 border border-soft-gray rounded-xl overflow-hidden shadow-sm">
                <img
                  src={editBillImageBase64}
                  alt="Product/Bill Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-soft-gray">
            <button 
              type="button" 
              className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors" 
              onClick={() => setShowEditModal(false)}
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm" 
              disabled={submitting}
            >
              {submitting ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Profile Modal */}
      <Modal isOpen={showEditCustomer} onClose={() => setShowEditCustomer(false)} title="Edit Customer Profile">
        <form onSubmit={handleUpdateCustomer} className="space-y-4">
          {/* Profile Picture Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">Profile Photo</label>
            <div className="flex items-center gap-4 p-3 bg-soft-white border border-soft-gray rounded-xl w-full">
              {/* Avatar Preview */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <div 
                  className="w-16 h-16 rounded-full bg-pure-white border-2 border-orange flex items-center justify-center overflow-hidden cursor-pointer shadow-sm hover:scale-105 transition-transform"
                  onClick={() => customerFileInputRef.current.click()}
                  type="button"
                >
                  {customerForm.avatar ? (
                    <img src={customerForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
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
                  ref={customerFileInputRef}
                  onChange={handleCustomerFileChange}
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
                    const isSelected = customerForm.avatar === p.value;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all p-0 cursor-pointer ${
                          isSelected ? 'border-orange scale-110 shadow-sm' : 'border-soft-gray opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => setCustomerForm(prev => ({ ...prev, avatar: p.value }))}
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
            <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" required value={customerForm.name} onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('phone')} *</label>
            <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" required value={customerForm.phone} onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="+91 9876543210" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Email Address</label>
            <input type="email" className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={customerForm.email || ''} onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})} placeholder="customer@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Due Date</label>
            <input type="date" className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={customerForm.paymentDueDate || ''} onChange={(e) => setCustomerForm({...customerForm, paymentDueDate: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('address')}</label>
            <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={customerForm.address} onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-soft-gray">
            <button type="button" className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors" onClick={() => setShowEditCustomer(false)}>{t('cancel')}</button>
            <button type="submit" className="px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm" disabled={submitting}>{submitting ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 bg-deep-navy/80 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Bill" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t('deleteTransaction')} message={t('deleteTransactionMsg')} />

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
                {lang === 'hi' ? 'बोलिए (जैसे: "300 रुपये लिए")' : lang === 'te' ? 'మాట్లాడండి (ఉదాహరణకు: "300 రూపాయలు తీసుకున్నాడు")' : 'Speak now (e.g., "took 300 rupees")'}
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

export default CustomerDetailPage;
