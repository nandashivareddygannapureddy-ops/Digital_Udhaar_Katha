import { useState, useEffect } from 'react';
import API from '../api/axios';
import Header from '../components/Layout/Header';
import Loader from '../components/Common/Loader';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import { HiOutlinePaperAirplane, HiOutlineCheckCircle, HiOutlineMail } from 'react-icons/hi';

const RemindersPage = () => {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [bulkSending, setBulkSending] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data } = await API.get('/customers?sort=balance-high');
        setCustomers(data.data.filter(c => c.balance > 0));
      } catch (err) { 
        console.error(err);
        toast.error('Failed to load customers'); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchCustomers();
  }, []);

  const sendEmailRemind = async (customer) => {
    if (!customer.email) {
      toast.warning(`Please edit ${customer.name} and add an email address first.`);
      return;
    }
    setSending(p => ({ ...p, [customer._id]: true }));
    try {
      const { data } = await API.post(`/reminders/send/${customer._id}`);
      toast.success(data.message || `Email Reminder sent to ${customer.name}!`);
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to send reminder'); 
    } finally { 
      setSending(p => ({ ...p, [customer._id]: false })); 
    }
  };

  const sendBulk = async () => {
    const customersWithEmail = customers.filter(c => c.email);
    if (customersWithEmail.length === 0) {
      toast.error('No customers with registered email addresses found.');
      return;
    }
    setBulkSending(true);
    try {
      const { data } = await API.post('/reminders/send-bulk');
      toast.success(data.message || 'Bulk Email Reminders sent successfully!');
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Bulk send failed'); 
    } finally { 
      setBulkSending(false); 
    }
  };

  if (loading) return <><Header title={t('reminders')} subtitle={t('sendPaymentReminders')} /><Loader fullPage /></>;

  return (
    <>
      <Header title={t('reminders')} subtitle={t('sendPaymentReminders')} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-gray">
            {customers.length} {t('customersWithDues')} ({customers.filter(c => c.email).length} with Email)
          </span>
        </div>
        <button 
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={sendBulk} 
          disabled={bulkSending || customers.filter(c => c.email).length === 0}
        >
          <HiOutlinePaperAirplane className="rotate-45" size={15} /> 
          {bulkSending ? t('sending') : 'Send Email to All'}
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-get/10 text-green-get flex items-center justify-center mx-auto mb-4">
            <HiOutlineCheckCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-deep-navy mb-0">{t('noPendingDues')}</h3>
          <p className="text-sm text-slate-gray mt-0">{t('noPendingDuesMsg')}</p>
        </div>
      ) : (
        <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-soft-white border-b border-soft-gray">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('customerName')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">Email Address</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('phone')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('pendingAmount')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-b border-soft-gray/50 hover:bg-light-cream/10 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-deep-navy align-middle">{c.name}</td>
                  <td className="px-6 py-4 text-sm align-middle text-deep-navy">
                    {c.email ? (
                      <span className="font-semibold text-deep-navy">{c.email}</span>
                    ) : (
                      <span className="text-xs text-slate-gray/50 italic">No Email Added</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm align-middle text-deep-navy">{c.phone}</td>
                  <td className="px-6 py-4 text-sm align-middle font-bold text-red-give">₹{c.balance.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <button 
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange hover:bg-orange-hover text-white text-xs font-bold rounded-lg border-none cursor-pointer transition-colors shadow-sm disabled:opacity-50" 
                      title="Send Email Reminder" 
                      onClick={() => sendEmailRemind(c)}
                      disabled={sending[c._id] || !c.email}
                    >
                      {sending[c._id] ? (
                        <span className="w-3.5 h-3.5 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <HiOutlineMail size={14} />
                      )}
                      Email Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default RemindersPage;
