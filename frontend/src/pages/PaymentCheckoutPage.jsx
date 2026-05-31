import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaArrowLeft, FaQrcode, FaLock, FaCheck, FaCreditCard, FaUser, FaRegClock, FaDownload, FaWhatsapp, FaPrint, FaRegCopy, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';
import { toast } from 'react-toastify';

// High-fidelity Logo Assets
const PhonePeLogo = () => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg" 
    alt="PhonePe" 
    className="h-5 md:h-6 object-contain" 
    loading="lazy"
  />
);

const GPayLogo = () => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" 
    alt="Google Pay" 
    className="h-5 md:h-6 object-contain" 
    loading="lazy"
  />
);

const PaytmLogo = () => (
  <img 
    src="https://img.icons8.com/color/100/paytm.png" 
    alt="Paytm" 
    className="h-4 md:h-5 object-contain" 
    loading="lazy"
  />
);

const BhimUpiLogo = () => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" 
    alt="UPI" 
    className="h-5 md:h-6 object-contain" 
    loading="lazy"
  />
);

const VisaLogo = () => (
  <img
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/320px-Visa_Inc._logo.svg.png"
    alt="Visa"
    className="h-5 object-contain"
    loading="lazy"
  />
);

const MastercardLogo = () => (
  <img
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/320px-Mastercard-logo.svg.png"
    alt="Mastercard"
    className="h-6 object-contain"
    loading="lazy"
  />
);

const RupayLogo = () => (
  <svg className="w-10 h-6 shrink-0" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="20" rx="3" fill="#0A3E8A" />
    <text x="2" y="13" fill="#FF8F00" fontFamily="sans-serif" fontWeight="900" fontStyle="italic" fontSize="8">Ru</text>
    <text x="12" y="13" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontStyle="italic" fontSize="8">Pay</text>
  </svg>
);

export default function PaymentCheckoutPage() {
  const { customerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(''); // 'PENDING' or 'SETTLED'
  
  // Receipt dates (fixed on load after payment complete)
  const [receiptNo, setReceiptNo] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentTime, setPaymentTime] = useState('');

  // Active Tab Menu
  const [activeTab, setActiveTab] = useState('upi'); // 'upi' or 'card'

  // Form States
  const [utr, setUtr] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Fetch store checkout info
  useEffect(() => {
    if (!customerId) return;

    const fetchCheckoutInfo = async () => {
      try {
        const response = await axios.get(`/api/reminders/checkout/${customerId}`);
        if (response.data?.success) {
          const fetchedData = response.data.data;
          setData(fetchedData);
          setAmountPaid(fetchedData.balance.toString());
          if (fetchedData.lastPayment) {
            setPaymentStatus(fetchedData.lastPayment.status);
          }
          if (fetchedData.balance <= 0 && fetchedData.lastPayment) {
            setIsPaid(true);
            setUtr(fetchedData.lastPayment.utr);
            setAmountPaid(fetchedData.lastPayment.amount.toString());
            
            // Format receipt date from lastPayment.date
            const dateObj = new Date(fetchedData.lastPayment.date);
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            
            // Short customer id code for Receipt No
            const code = `RCP-${dateObj.getFullYear()}${(dateObj.getMonth()+1).toString().padStart(2,'0')}${dateObj.getDate().toString().padStart(2,'0')}-${customerId.slice(-3).toUpperCase()}`;
            
            setReceiptNo(code);
            setPaymentDate(dateStr);
            setPaymentTime(timeStr);
          }
        } else {
          setError(response.data?.message || 'Failed to load store checkout details.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to initialize payment portal.');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutInfo();
  }, [customerId]);

  // Generate unique receipt meta values
  const generateReceiptMeta = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const code = `RCP-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.floor(100 + Math.random() * 900)}`;
    
    setReceiptNo(code);
    setPaymentDate(dateStr);
    setPaymentTime(timeStr);
  };

  // Handle UTR Confirmation Submit
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!utr.trim() || utr.trim().length !== 12 || !/^\d+$/.test(utr)) {
      toast.error('Please enter a valid 12-digit numerical UPI Ref / UTR number.');
      return;
    }
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`/api/reminders/checkout/${customerId}/confirm-payment`, {
        utr: utr.trim(),
        amount: parseFloat(amountPaid),
      });

      if (response.data?.success) {
        generateReceiptMeta();
        const status = response.data.data?.transactionStatus || 'SETTLED';
        setPaymentStatus(status);
        if (status === 'SETTLED') {
          toast.success('Payment verified & receipt generated successfully!');
        } else {
          toast.info('Payment submitted for verification!');
        }
        setIsPaid(true);
      } else {
        toast.error(response.data?.message || 'Verification failed. Please try again.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating payment status.');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy transaction ID to clipboard
  const copyTransactionId = () => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    toast.success('Transaction ID copied to clipboard!');
  };

  // Handle Card Checkout Form Submit (Mock warning)
  const handleCardPaymentSubmit = (e) => {
    e.preventDefault();
    toast.info('Card payments are processed securely via direct UPI. Please scan the QR Code on the left or enter UPI Ref number to clear dues.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-bold text-sm">Connecting to secure billing server...</p>
        </div>
      </div>
    );
  }

  const storeName = data?.storeName || 'Digital Udhaar';
  const customerName = data?.customerName || 'Valued Customer';
  const customerPhone = data?.customerPhone || '';
  const customerAddress = data?.customerAddress || 'Ghatkesar Rd';
  const ownerName = data?.ownerName || 'Akhilesh';
  const ownerPhone = data?.ownerPhone || '+91 9849228937';
  const upiId = data?.upiId;
  const balance = data?.balance || 0;
  // If the initial balance is already zero or less on load, show the Dues Cleared panel
  if (!isPaid && balance <= 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
        <div className="max-w-md w-full bg-white border border-slate-150 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md">
            <FaCheckCircle size={44} className="text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">No Outstanding Dues</h2>
            <p className="text-slate-550 text-sm leading-relaxed">
              Namaste <strong>{customerName}</strong>, all your outstanding dues with <strong>{storeName}</strong> have been fully cleared.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500 font-bold">
            Current Account Balance: <span className="text-emerald-600 font-black">₹{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Premium Receipt Page if Payment is completed
  if (isPaid && data) {
    const firstLetter = customerName ? customerName.charAt(0).toUpperCase() : 'C';
    const amountVal = parseFloat(amountPaid) || 0;
    
    // Compute correct historical credit/debit totals
    const wasAlreadyPaidOnLoad = (data.balance <= 0);
    const totalUdhaarVal = data.totalUdhaar || Math.abs(balance);
    
    const totalJamaVal = paymentStatus === 'PENDING'
      ? (data.totalJama || 0)
      : (wasAlreadyPaidOnLoad 
          ? (data.totalJama || amountVal) 
          : ((data.totalJama || 0) + amountVal));
    
    const finalBalanceVal = paymentStatus === 'PENDING'
      ? balance
      : (wasAlreadyPaidOnLoad ? Math.max(0, balance) : Math.max(0, balance - amountVal));

    const shareUrl = `https://api.whatsapp.com/send?phone=${customerPhone.replace(/\D/g, '')}&text=${encodeURIComponent(
      `Hello ${customerName}, here is your payment receipt from ${storeName}.\n\nReceipt No: ${receiptNo}\nAmount Paid: ₹${amountVal.toFixed(2)}\nNet Balance: ₹${finalBalanceVal.toFixed(2)} (${paymentStatus === 'PENDING' ? 'Pending Approval' : 'Advance'})\nStatus: ${paymentStatus}\nUTR: ${utr || 'N/A'}\n\nThank you for doing business with us!`
    )}`;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-6 px-4 font-sans text-slate-800 antialiased print:p-0 print:bg-white" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
        
        {/* Top bar styling wrapper */}
        <div className="max-w-[800px] w-full mx-auto bg-white rounded-3xl shadow-xl border border-slate-150 overflow-hidden relative print:shadow-none print:border-none print:my-0">
          
          {/* Top Brand Stripe */}
          <div className="w-full h-1.5 bg-[#F97316]"></div>

          <div className="p-8 space-y-6 print:p-4">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:justify-between items-center gap-4 border-b border-slate-100 pb-5">
              {/* Logo block */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-11 bg-[#F97316] rounded-l-md rounded-r-xs flex items-center justify-start pl-1 relative shadow-sm">
                  <div className="w-1.5 h-full bg-white opacity-25"></div>
                  <div className="absolute right-1 top-2.5 w-1.5 h-1 bg-white rounded-sm"></div>
                  <div className="absolute right-1 top-5 w-1.5 h-1 bg-white rounded-sm"></div>
                </div>
                <div className="leading-tight text-left">
                  <span className="text-[#F97316] font-black text-sm block tracking-tighter uppercase">Udhaar</span>
                  <span className="text-slate-800 font-black text-sm block tracking-tighter uppercase">Khata</span>
                </div>
              </div>

              {/* Store title & Owner detail */}
              <div className="text-center">
                <h1 className="text-2xl font-black text-slate-850 tracking-tight">{storeName}</h1>
                <p className="text-slate-450 text-[11px] font-bold tracking-wide uppercase">Digital Udhaar Khata</p>
                <div className="flex justify-center items-center gap-4 text-slate-500 text-[11px] font-semibold mt-1">
                  <span className="flex items-center gap-1">👤 Owner: {ownerName}</span>
                  <span className="flex items-center gap-1">📞 {ownerPhone}</span>
                </div>
              </div>

              {/* Secured Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full font-bold text-[10px] border border-emerald-100 shadow-xs">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>Secured by Cashfree Payments</span>
              </div>
            </div>

            {/* Success Card banner / Pending Verification banner / Failed banner */}
            {paymentStatus === 'FAILED' ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-1">
                <FaTimesCircle size={28} className="text-red-500 animate-pulse" />
                <h2 className="text-red-800 font-black text-lg">Payment Verification Failed</h2>
                <p className="text-red-650 text-xs font-semibold">The merchant declined this transaction or the UTR was incorrect.</p>
                <button 
                  onClick={() => {
                    setIsPaid(false);
                    setUtr('');
                  }}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg border-none cursor-pointer transition-all shadow-sm"
                >
                  Re-submit UTR / Pay Again
                </button>
              </div>
            ) : paymentStatus === 'PENDING' ? (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-1">
                <FaExclamationTriangle size={28} className="text-[#D97706]" />
                <h2 className="text-[#92400E] font-black text-lg">Payment Pending Verification</h2>
                <p className="text-[#92400E]/80 text-xs font-semibold">Details submitted. Dues will update once approved by the merchant.</p>
                <button 
                  onClick={() => {
                    setIsPaid(false);
                    setUtr('');
                  }}
                  className="mt-3 px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold rounded-lg border-none cursor-pointer transition-all shadow-sm"
                >
                  Correct UTR / Pay Again
                </button>
              </div>
            ) : (
              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-1">
                <FaCheckCircle size={28} className="text-[#10B981]" />
                <h2 className="text-[#065F46] font-black text-lg">Payment Successful!</h2>
                <p className="text-[#065F46]/80 text-xs font-semibold">Thank you for your payment.</p>
              </div>
            )}

            {/* Receipt info dashboard row */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-0.5 border-r border-slate-200/65 last:border-0 md:block">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Receipt No.</span>
                <span className="text-xs font-black text-slate-800 block truncate">{receiptNo}</span>
              </div>
              <div className="space-y-0.5 md:border-r border-slate-200/65 last:border-0 block">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Date</span>
                <span className="text-xs font-black text-slate-800 block">{paymentDate}</span>
              </div>
              <div className="space-y-0.5 border-r border-slate-200/65 last:border-0 block">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Time</span>
                <span className="text-xs font-black text-slate-800 block">{paymentTime}</span>
              </div>
              <div className="space-y-0.5 last:border-0 block">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Generated On</span>
                <span className="text-xs font-black text-slate-800 block">{paymentDate}</span>
              </div>
            </div>

            {/* Customer detail card block */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative flex justify-between items-center gap-4">
              <div className="space-y-3.5 flex-1">
                <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                  <FaUser className="text-indigo-600" size={13} />
                  <h3 className="text-xs font-black uppercase tracking-wider">Customer Details</h3>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-y-1.5 text-xs">
                  <span className="text-slate-450 font-bold">Name</span>
                  <span className="text-slate-700 font-black">: {customerName}</span>
                  
                  <span className="text-slate-450 font-bold">Phone</span>
                  <span className="text-slate-700 font-black">: {customerPhone}</span>
                  
                  <span className="text-slate-450 font-bold">Address</span>
                  <span className="text-slate-700 font-black">: {customerAddress}</span>
                </div>
              </div>
              
              {/* Profile initial logo bubble */}
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center font-black text-2xl text-rose-500 shadow-sm shrink-0">
                {firstLetter}
              </div>
            </div>

            {/* Two-column Payment details and Summary card layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Payment Info Left Card */}
              <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3 text-slate-800">
                    <FaCreditCard className="text-indigo-600" size={13} />
                    <h3 className="text-xs font-black uppercase tracking-wider">Payment Details</h3>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-semibold">Amount Paid</span>
                      <span className="text-emerald-600 font-black text-sm">₹{amountVal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-semibold">Payment Method</span>
                      <span className="text-slate-800 font-black">UPI</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-">Payment Status</span>
                      {paymentStatus === 'FAILED' ? (
                        <span className="px-2.5 py-0.5 bg-red-50 text-red-650 rounded-full font-bold text-[10px] tracking-wide uppercase">
                          Verification Failed
                        </span>
                      ) : paymentStatus === 'PENDING' ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 rounded-full font-bold text-[10px] tracking-wide uppercase">
                          Pending Approval
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-bold text-[10px] tracking-wide uppercase">
                          Success
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* UTR reference with copy tag */}
                {utr && (
                  <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
                    <div className="space-y-0.5 text-left">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Transaction ID (UTR)</span>
                      <span className="text-xs font-black text-slate-700 block tracking-wider">{utr}</span>
                    </div>
                    <button 
                      onClick={copyTransactionId} 
                      className="p-2 text-slate-450 hover:text-slate-700 bg-slate-55 hover:bg-slate-100 rounded-lg transition-all cursor-pointer shadow-xs border border-slate-100"
                    >
                      <FaRegCopy size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Khata Summary Right Card */}
              <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3 text-slate-800">
                    <FaRegClock className="text-indigo-600" size={13} />
                    <h3 className="text-xs font-black uppercase tracking-wider">Khata Summary</h3>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-semibold">Total Udhaar (Credit)</span>
                      <span className="text-slate-700 font-bold">₹{totalUdhaarVal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 font-semibold">Total Jama (Debit)</span>
                      <span className="text-slate-700 font-bold">₹{totalJamaVal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
                  <div className="text-left">
                    <span className="text-xs font-black text-emerald-600 block">Net Balance</span>
                    <span className="text-[9px] text-emerald-600 font-bold block">
                      {paymentStatus === 'FAILED' ? '(Verification Failed)' : paymentStatus === 'PENDING' ? '(Pending Verification)' : '(Advance)'}
                    </span>
                  </div>
                  <span className={`text-lg font-black ${paymentStatus === 'FAILED' ? 'text-red-500' : 
                    paymentStatus === 'PENDING' ? 'text-amber-500' : 
                    'text-[#10B981]'}`}>
                    ₹{finalBalanceVal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Timeline */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-4 text-slate-800">
                <FaRegClock className="text-indigo-600" size={13} />
                <h3 className="text-xs font-black uppercase tracking-wider">Transaction Timeline</h3>
              </div>

              {/* Dotted Timeline list */}
              <div className="space-y-4 relative pl-4 before:absolute before:left-[19.5px] before:top-2 before:bottom-2 before:w-0.5 before:border-l-2 before:border-dashed before:border-slate-200">
                
                {/* Event 1: Udhaar Added */}
                <div className="flex justify-between items-start gap-4 relative">
                  {/* Timeline Dot Indicator */}
                  <span className="absolute -left-5.5 top-1.5 w-3 h-3 bg-[#F97316] rounded-full border-2 border-white ring-2 ring-orange-100"></span>
                  <div className="text-left text-xs">
                    <span className="text-slate-400 font-semibold block">{paymentDate}</span>
                    <span className="text-slate-400 font-semibold text-[10px] block">{paymentTime}</span>
                  </div>
                  <div className="flex-1 text-left text-xs font-semibold text-slate-700">
                    Udhaar Added
                  </div>
                  <span className="text-xs font-black text-red-500">₹{totalUdhaarVal.toFixed(2)}</span>
                </div>

                {/* Event 2: Payment Received / Failed */}
                <div className="flex justify-between items-start gap-4 relative">
                  {/* Timeline Dot Indicator */}
                  <span className={`absolute -left-5.5 top-1.5 w-3 h-3 ${
                    paymentStatus === 'FAILED' ? 'bg-red-500 ring-red-100' :
                    paymentStatus === 'PENDING' ? 'bg-amber-500 ring-amber-100' : 
                    'bg-[#10B981] ring-emerald-100'
                  } rounded-full border-2 border-white ring-2`}></span>
                  <div className="text-left text-xs">
                    <span className="text-slate-400 font-semibold block">{paymentDate}</span>
                    <span className="text-slate-400 font-semibold text-[10px] block">{paymentTime}</span>
                  </div>
                  <div className="flex-1 text-left text-xs">
                    <span className="font-bold text-slate-700 block">
                      {paymentStatus === 'FAILED' 
                        ? 'Payment Verification Failed' 
                        : paymentStatus === 'PENDING' 
                          ? 'Payment Submitted (Pending Verification)' 
                          : 'Payment Received via UPI'}
                    </span>
                    {utr && <span className="text-[10px] text-slate-400 block font-semibold">UTR: {utr}</span>}
                  </div>
                  <span className={`text-xs font-black ${
                    paymentStatus === 'FAILED' ? 'text-red-500' :
                    paymentStatus === 'PENDING' ? 'text-amber-600' : 
                    'text-[#10B981]'
                  }`}>
                    ₹{amountVal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Re-submit Button for Pending/Failed Payments */}
            {(paymentStatus === 'PENDING' || paymentStatus === 'FAILED') && (
              <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
                <div className="text-left space-y-0.5">
                  <h4 className="text-xs font-black text-slate-800">Need to correct your payment details?</h4>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                    If the entered UTR was incorrect or declined, click here to submit a valid UTR or scan and pay again.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsPaid(false);
                    setUtr('');
                  }}
                  className="w-full sm:w-auto py-2.5 px-5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-bold text-xs cursor-pointer transition-all shadow-sm shrink-0 border-none"
                >
                   Pay Again
                </button>
              </div>
            )}

            {/* Action buttons drawer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 print:hidden">
              <a 
                href={`/api/reminders/checkout/${customerId}/receipt`}
                download
                className="py-3 px-4 border border-rose-200 text-rose-600 hover:bg-rose-50/50 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs bg-transparent no-underline text-center"
              >
                <FaDownload /> Download PDF
              </a>
              
              <button 
                onClick={() => window.print()}
                className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md border-none"
              >
                <FaPrint /> Print Receipt
              </button>
            </div>

            {/* Footer Support Info */}
            <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Left verification QR */}
              <div className="flex items-center gap-3">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(window.location.href)}`} 
                  alt="Verify QR" 
                  className="w-16 h-16 border border-slate-200 p-1 rounded-lg"
                />
                <div className="text-left space-y-0.5">
                  <h4 className="text-xs font-black text-slate-800">Scan to Verify</h4>
                  <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                    Receipt No.<br />
                    <span className="text-slate-600 font-bold">{receiptNo}</span>
                  </p>
                </div>
              </div>

              {/* Right support contact details */}
              <div className="text-left sm:text-right space-y-1">
                <h4 className="text-xs font-black text-slate-800">Need Help?</h4>
                <p className="text-[11px] text-slate-500 font-semibold flex items-center justify-start sm:justify-end gap-1.5">
                  <FaPhoneAlt size={9} className="text-slate-400" /> {ownerPhone}
                </p>
                <p className="text-[11px] text-slate-500 font-semibold flex items-center justify-start sm:justify-end gap-1.5">
                  <FaEnvelope size={9} className="text-slate-400" /> support@udhaarkhata.com
                </p>
              </div>
            </div>

            {/* Legal / Compliance Disclaimer */}
            <div className="border-t border-slate-100 pt-4 text-center space-y-2">
              <p className="text-[10px] text-slate-400 leading-normal flex items-center justify-center gap-1.5 font-medium">
                <FaLock size={8} className="text-slate-350" />
                This is a computer generated receipt and does not require any signature.
              </p>
              <p className="text-[10px] text-slate-450 font-bold">
                Powered by Digital Udhaar Khata &nbsp;|&nbsp; Secured by <span className="text-indigo-600 font-black">Cashfree Payments</span>
              </p>
            </div>
            
          </div>
        </div>
        
      </div>
    );
  }

  // Construct UPI Deep Link URI for dynamic QR generation
  const upiUri = upiId 
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${balance}&cu=INR&tn=${encodeURIComponent('Invoice Clearance')}`
    : '';

  const qrImageUrl = upiUri 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`
    : '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-700" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      {/* Top Navbar Header */}
      <div className="w-full bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10 shrink-0 shadow-sm print:hidden">
        {/* Back Button */}
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-all py-1 cursor-pointer"
        >
          <FaArrowLeft /> Back
        </button>

        {/* Store Title & Tagline */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-850 tracking-tight">{storeName}</h1>
          <p className="text-slate-400 text-[10px] font-bold tracking-wide uppercase mt-0.5">
            Instant UPI Payment Portal
          </p>
        </div>

        {/* Secure Connection Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full font-bold text-xs border border-emerald-100 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span>Direct Bank Transfer</span>
        </div>
      </div>

      {/* Main 2-Column Dashboard Area */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6 items-stretch print:hidden">
        {/* Left Column: Unified Tabbed Payment Options Container */}
        <div className="w-full md:w-1/2 bg-white rounded-3xl shadow-lg border border-slate-100 flex flex-col overflow-hidden">
          {/* Top Payment Navigation Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50">
            <button
              onClick={() => setActiveTab('upi')}
              className={`flex-1 py-4 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'upi'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <FaQrcode size={14} />
              UPI Apps & QR
            </button>
            <button
              onClick={() => setActiveTab('card')}
              className={`flex-1 py-4 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'card'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <FaCreditCard size={14} />
              Debit / Credit Card
            </button>
          </div>

          {/* Tab Body View */}
          <div className="p-8 flex-1 flex flex-col justify-between items-center text-center">
            {activeTab === 'upi' ? (
              <>
                <div className="w-full border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-base font-black text-slate-800 mb-1">Scan & Pay QR Code</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Open PhonePe, Google Pay, Paytm, or BHIM to scan and send payment directly.
                  </p>
                </div>

                {upiId ? (
                  <div className="space-y-6 flex-1 flex flex-col justify-center items-center">
                    {/* QR Image Container */}
                    <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl shadow-inner relative flex items-center justify-center">
                      <img 
                        src={qrImageUrl} 
                        alt="UPI QR Code" 
                        className="w-52 h-52 rounded-xl"
                        loading="lazy"
                      />
                    </div>

                    {/* Dues Detail Tag */}
                    <div className="space-y-1">
                      <div className="text-slate-455 text-[10px] font-bold uppercase tracking-wider">Amount to Transfer</div>
                      <div className="text-3xl font-black text-slate-800">₹{balance.toFixed(2)}</div>
                      <div className="text-[11px] font-semibold text-slate-400">
                        Beneficiary VPA: <span className="text-slate-600 font-bold">{upiId}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center py-12 px-6 bg-rose-50 border border-rose-100 rounded-2xl max-w-sm my-6">
                    <FaExclamationTriangle size={36} className="text-rose-500 mb-3" />
                    <h4 className="font-bold text-rose-800 text-sm mb-1">No UPI Configuration</h4>
                    <p className="text-rose-600 text-xs leading-relaxed">
                      The merchant hasn't linked their UPI ID yet. Please contact {storeName} directly to clear your outstanding dues.
                    </p>
                  </div>
                )}

                {/* GPay, PhonePe, Paytm Logos Container */}
                <div className="w-full border-t border-slate-100 pt-4 mt-6 flex justify-center items-center gap-3">
                  <PhonePeLogo />
                  <GPayLogo />
                  <PaytmLogo />
                  <BhimUpiLogo />
                </div>
              </>
            ) : (
              // Card Payment Form Tab Panel
              <form onSubmit={handleCardPaymentSubmit} className="w-full flex-grow flex flex-col gap-5">
                {/* ── Card Type Detection Helper ── */}
                {(() => {
                  const raw = cardNo.replace(/\s/g, '');
                  let cardType = null;
                  if (/^4/.test(raw)) cardType = 'visa';
                  else if (/^5[1-5]/.test(raw) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(raw)) cardType = 'mastercard';
                  else if (/^6(0|52[1-9]|53\d|54[0-5])/.test(raw)) cardType = 'rupay';
                  else if (/^3[47]/.test(raw)) cardType = 'amex';
                  else if (/^6(011|22|4[4-9]|5)/.test(raw)) cardType = 'discover';
                  
                  const getGradient = () => {
                    if (cardType === 'visa') return 'from-blue-900 via-blue-800 to-blue-700';
                    if (cardType === 'mastercard') return 'from-gray-900 via-gray-800 to-red-900';
                    if (cardType === 'rupay') return 'from-indigo-900 via-indigo-800 to-orange-700';
                    if (cardType === 'amex') return 'from-emerald-900 via-emerald-800 to-emerald-700';
                    if (cardType === 'discover') return 'from-orange-900 via-orange-800 to-orange-600';
                    return 'from-slate-800 via-slate-700 to-slate-600';
                  };

                  const displayNumber = cardNo
                    ? cardNo.replace(/\s/g,'').padEnd(16,'•').replace(/(.{4})/g,'$1 ').trim()
                    : '•••• •••• •••• ••••';

                  return (
                    <div style={{ perspective: '1000px' }} className="w-full flex justify-center">
                      <div
                        style={{
                          width: '100%', maxWidth: '360px', height: '200px',
                          position: 'relative', transformStyle: 'preserve-3d',
                          transition: 'transform 0.6s cubic-bezier(.4,0,.2,1)',
                          transform: cardCvv.length > 0 ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                      >
                        {/* FRONT */}
                        <div
                          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                          className={`rounded-2xl bg-gradient-to-br ${getGradient()} p-5 shadow-2xl flex flex-col justify-between text-white overflow-hidden`}
                        >
                          {/* Shimmer overlay */}
                          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)',pointerEvents:'none' }} />
                          
                          {/* Top row: chip + card type */}
                          <div className="flex justify-between items-start">
                            {/* Chip */}
                            <svg width="40" height="30" viewBox="0 0 40 30">
                              <rect width="40" height="30" rx="5" fill="#d4a843"/>
                              <rect x="13" y="0" width="14" height="30" fill="#c49a35"/>
                              <rect x="0" y="10" width="40" height="10" fill="#c49a35"/>
                              <rect x="13" y="10" width="14" height="10" fill="#b8902a"/>
                              <rect x="15" y="5" width="10" height="5" rx="1" fill="#d4a843"/>
                              <rect x="15" y="20" width="10" height="5" rx="1" fill="#d4a843"/>
                            </svg>
                            {/* Detected card type logo */}
                            <div className="text-right">
                              {cardType === 'visa' && (
                                <img
                                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/320px-Visa_Inc._logo.svg.png"
                                  alt="Visa"
                                  style={{height:'24px',objectFit:'contain',filter:'brightness(0) invert(1)'}}
                                  loading="lazy"
                                />
                              )}
                              {cardType === 'mastercard' && (
                                <img
                                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/320px-Mastercard-logo.svg.png"
                                  alt="Mastercard"
                                  style={{height:'28px',objectFit:'contain'}}
                                  loading="lazy"
                                />
                              )}
                              {cardType === 'rupay' && (
                                <span style={{fontFamily:'sans-serif',fontWeight:900,fontSize:'14px',color:'#fff'}}>Ru<span style={{color:'#f97316'}}>Pay</span></span>
                              )}
                              {cardType === 'amex' && (
                                <span style={{fontFamily:'sans-serif',fontWeight:900,fontSize:'13px',color:'#fff',letterSpacing:'1px'}}>AMEX</span>
                              )}
                              {cardType === 'discover' && (
                                <span style={{fontFamily:'sans-serif',fontWeight:900,fontSize:'11px',color:'#fff'}}>DISCOVER</span>
                              )}
                              {!cardType && (
                                <FaCreditCard size={24} style={{opacity:0.5}}/>
                              )}
                            </div>
                          </div>

                          {/* Card Number */}
                          <div className="text-center" style={{letterSpacing:'3px',fontSize:'18px',fontWeight:700,fontFamily:'monospace',textShadow:'0 1px 3px rgba(0,0,0,0.4)'}}>
                            {displayNumber}
                          </div>

                          {/* Bottom row: name + expiry */}
                          <div className="flex justify-between items-end">
                            <div>
                              <div style={{fontSize:'8px',opacity:0.6,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'2px'}}>Card Holder</div>
                              <div style={{fontSize:'13px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',maxWidth:'180px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                                {cardHolder || 'FULL NAME'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div style={{fontSize:'8px',opacity:0.6,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'2px'}}>Expires</div>
                              <div style={{fontSize:'13px',fontWeight:700,fontFamily:'monospace'}}>
                                {cardExpiry || 'MM/YY'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BACK */}
                        <div
                          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}
                          className={`rounded-2xl bg-gradient-to-br ${getGradient()} shadow-2xl overflow-hidden`}
                        >
                          <div className="bg-slate-900 h-10 mt-7 w-full" />
                          <div className="px-5 mt-4">
                            <div className="bg-slate-100 rounded-lg flex items-center justify-between px-4 py-2">
                              <span style={{fontSize:'9px',color:'#64748b',textTransform:'uppercase',letterSpacing:'1px'}}>CVV / CVC</span>
                              <span style={{fontFamily:'monospace',fontWeight:900,fontSize:'16px',color:'#1e293b',letterSpacing:'4px'}}>
                                {cardCvv ? '•'.repeat(cardCvv.length) : '•••'}
                              </span>
                            </div>
                            <p style={{fontSize:'8px',color:'rgba(255,255,255,0.5)',marginTop:'12px',textAlign:'center'}}>
                              This card is for display purposes only
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Form Fields ── */}
                <div className="space-y-3 text-left">
                  {/* Card Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={19}
                        value={cardNo}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                          setCardNo(raw.replace(/(.{4})/g, '$1 ').trim());
                        }}
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl font-semibold text-sm tracking-widest transition-all focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                        <FaCreditCard size={16} />
                      </span>
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      placeholder="AS ON CARD"
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl font-semibold text-sm tracking-wider uppercase transition-all focus:outline-none"
                    />
                  </div>

                  {/* Expiry + CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expiry Date</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                          setCardExpiry(val);
                        }}
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl font-semibold text-sm text-center tracking-widest transition-all focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CVV / CVC</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        onFocus={() => {}}
                        onBlur={() => {}}
                        placeholder="•••"
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl font-semibold text-sm text-center tracking-widest transition-all focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <FaLock size={12} /> Pay ₹{balance.toFixed(2)} via Card
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Payment Confirmation & UTR Form */}
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <form 
            onSubmit={handleConfirmPayment}
            className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col justify-between flex-1"
          >
            {/* Orange top bar */}
            <div className="h-1.5 w-full bg-[#F97316]" />

            <div className="p-8 space-y-5 flex-1 flex flex-col justify-between">
              {/* Header */}
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#F97316] uppercase">Step 2 of 2</span>
                <h2 className="text-xl font-black text-slate-900 mt-1 tracking-tight">Confirm Your Transfer</h2>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">After scanning and paying, enter the UTR reference number below to confirm your payment.</p>
              </div>

              <div className="space-y-4">
                {/* Amount pill */}
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-center">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">Amount to Pay</p>
                  <p className="text-4xl font-light text-white tracking-tight">₹{balance.toFixed(2)}</p>
                  <p className="text-slate-400 text-[11px] mt-2 font-medium">To: <span className="text-white font-bold">{storeName}</span></p>
                </div>

                {/* Customer info */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl divide-y divide-slate-100">
                  <div className="flex justify-between items-center px-4 py-3 text-xs">
                    <span className="text-slate-400 font-semibold">Customer</span>
                    <span className="text-slate-800 font-black">{customerName}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 text-xs">
                    <span className="text-slate-400 font-semibold">Due Amount</span>
                    <span className="text-red-500 font-black">₹{balance.toFixed(2)}</span>
                  </div>
                  {upiId && (
                    <div className="flex justify-between items-center px-4 py-3 text-xs">
                      <span className="text-slate-400 font-semibold">UPI ID</span>
                      <span className="text-slate-800 font-black font-mono">{upiId}</span>
                    </div>
                  )}
                </div>

                {/* Amount input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Amount Transferred (₹)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="Enter exact amount paid"
                    className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#F97316] rounded-2xl font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
                  />
                </div>

                {/* UTR Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    12-Digit UPI Ref / UTR Number
                  </label>
                  <input 
                    type="text"
                    maxLength={12}
                    required
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 308945678912"
                    className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#F97316] rounded-2xl font-bold text-sm tracking-widest placeholder:tracking-normal transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                    Found in transaction details of your UPI app (PhonePe, GPay, Paytm) after payment.
                  </span>
                </div>
              </div>

              {/* CTA + secure note */}
              <div className="space-y-3 pt-1">
                <button 
                  type="submit"
                  disabled={submitting || !upiId}
                  className="w-full py-4 px-6 bg-[#F97316] hover:bg-[#ea6c10] active:scale-[0.98] disabled:bg-slate-300 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying Payment...</span>
                    </>
                  ) : (
                    <>
                      <FaCheck size={13} />
                      <span>Confirm Payment — ₹{parseFloat(amountPaid || 0).toFixed(2)}</span>
                    </>
                  )}
                </button>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2">
                  <FaLock size={11} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-emerald-700 text-[10px] leading-relaxed font-semibold">
                    Secure & encrypted. UTR numbers are cross-verified instantly. False claims won't affect your balance.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Page Footer */}
      <div className="w-full text-center py-4 bg-slate-100 border-t border-slate-200/80 text-[10px] text-slate-400 font-semibold shrink-0 print:hidden">
        Powered by Digital Udhaar (Direct & Safe UPI Payments)
      </div>
    </div>
  );
}
