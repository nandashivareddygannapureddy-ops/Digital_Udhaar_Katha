import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import Header from '../components/Layout/Header';
import Modal from '../components/Common/Modal';
import Loader from '../components/Common/Loader';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import { HiOutlineTrash, HiOutlinePlus, HiOutlineCheckCircle, HiOutlinePencil, HiOutlineXCircle } from 'react-icons/hi';

const TransactionsPage = () => {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTxnId, setDeleteTxnId] = useState(null);
  const [filters, setFilters] = useState({ type: '', customer: '', startDate: '', endDate: '', status: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [txnForm, setTxnForm] = useState({ customer: '', type: 'credit', amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash' });
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', description: '', date: '', paymentStatus: '', paymentMode: '' });

  const fetchData = async () => {
    try {
      const params = {};
      Object.keys(filters).forEach(k => { if (filters[k]) params[k] = filters[k]; });
      const [txnRes, custRes] = await Promise.all([
        API.get('/transactions', { params }),
        API.get('/customers'),
      ]);
      setTransactions(txnRes.data.data);
      setCustomers(custRes.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const handleDelete = async () => {
    try {
      await API.delete(`/transactions/${deleteTxnId}`);
      toast.success(t('transactionDeleted'));
      setDeleteTxnId(null);
      fetchData();
    } catch (err) { toast.error('Delete failed'); }
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
      toast.success('Payment transaction approved successfully');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve payment'); }
  };

  const handleDeclinePayment = async (txnId) => {
    try {
      await API.put(`/transactions/${txnId}/decline`);
      toast.success('Payment transaction declined successfully');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to decline payment'); }
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
      });
      if (editForm.paymentStatus === 'SETTLED' && editingTxn.paymentStatus !== 'SETTLED') {
        toast.success(t('transactionMarkedAsPaid'));
      } else {
        toast.success('Transaction updated successfully');
      }
      setShowEditModal(false);
      setEditingTxn(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTxn = async (e) => {
    e.preventDefault();
    if (!txnForm.customer) { toast.error(t('selectCustomer')); return; }
    setSubmitting(true);
    try {
      await API.post('/transactions', txnForm);
      toast.success(txnForm.type === 'credit' ? t('udhaarRecorded') : t('paymentRecorded'));
      setShowAddModal(false);
      setTxnForm({ customer: '', type: 'credit', amount: '', description: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const hasFilters = Object.values(filters).some(v => v);

  if (loading) return <><Header title={t('transactions')} subtitle={t('allEntries')} /><Loader fullPage /></>;

  return (
    <>
      <Header title={t('transactions')} subtitle={t('allEntries')} />

      <div className="flex justify-end mb-6">
        <button 
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-all shadow-sm hover:shadow" 
          onClick={() => setShowAddModal(true)}
        >
          <HiOutlinePlus size={16} /> {t('addTransaction')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-pure-white border border-soft-gray p-4 rounded-2xl shadow-sm mb-6">
        <select 
          className="px-3 py-2 bg-transparent border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange transition-colors min-w-[130px]" 
          value={filters.type} 
          onChange={(e) => setFilters({...filters, type: e.target.value})}
        >
          <option value="">{t('allTypes')}</option>
          <option value="credit">{t('udhaar')} ({t('credit')})</option>
          <option value="debit">{t('jama')} ({t('debit')})</option>
        </select>
        <select 
          className="px-3 py-2 bg-transparent border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange transition-colors min-w-[130px]" 
          value={filters.customer} 
          onChange={(e) => setFilters({...filters, customer: e.target.value})}
        >
          <option value="">{t('allCustomers')}</option>
          {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select 
          className="px-3 py-2 bg-transparent border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange transition-colors min-w-[130px]" 
          value={filters.status} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">{t('status')}</option>
          <option value="PENDING">{t('pending')}</option>
          <option value="SETTLED">{t('settled')}</option>
        </select>
        <input 
          className="px-3 py-2 bg-transparent border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange transition-colors max-w-[140px]" 
          type="date" 
          value={filters.startDate} 
          onChange={(e) => setFilters({...filters, startDate: e.target.value})} 
        />
        <input 
          className="px-3 py-2 bg-transparent border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange transition-colors max-w-[140px]" 
          type="date" 
          value={filters.endDate} 
          onChange={(e) => setFilters({...filters, endDate: e.target.value})} 
        />
        {hasFilters && (
          <button 
            className="text-xs font-bold text-orange hover:text-orange-hover bg-transparent border-none cursor-pointer px-2 py-1 transition-colors" 
            onClick={() => setFilters({ type: '', customer: '', startDate: '', endDate: '', status: '' })}
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-12 text-center shadow-sm space-y-4 max-w-xl mx-auto">
          <h3 className="text-lg font-bold text-deep-navy mb-0">{t('noTransactionsYet')}</h3>
          <p className="text-sm text-slate-gray mt-0">{t('addFirstTransaction')}</p>
          <button 
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-all shadow-sm hover:shadow" 
            onClick={() => setShowAddModal(true)}
          >
            <HiOutlinePlus size={16} /> {t('addTransaction')}
          </button>
        </div>
      ) : (
        <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-soft-white border-b border-soft-gray">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('date')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('customers')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('type')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('description')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('amount')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn._id} className="border-b border-soft-gray/50 hover:bg-light-cream/10 transition-colors">
                  <td className="px-6 py-4 text-sm align-middle text-deep-navy">
                    {new Date(txn.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <Link to={`/customers/${txn.customer?._id}`} className="text-deep-navy font-bold hover:text-orange transition-colors decoration-none">
                      {txn.customer?.name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold w-fit ${
                        txn.type === 'credit' ? 'bg-red-give/10 text-red-give' : 'bg-green-get/10 text-green-get'
                      }`}>
                        {txn.type === 'credit' ? t('udhaar') : t('jama')}
                      </span>
                      {txn.type === 'debit' && txn.paymentMode && txn.paymentMode !== 'none' && (
                        <span className="text-[10px] text-slate-gray font-extrabold uppercase tracking-wider pl-1">
                          via {txn.paymentMode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm align-middle text-deep-navy max-w-[200px] truncate">
                    {txn.description || '—'}
                  </td>
                  <td className={`px-6 py-4 text-sm align-middle font-bold ${
                    (txn.paymentStatus === 'SETTLED' || txn.type === 'debit') ? 'text-green-get' : 'text-red-give'
                  }`}>
                    {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      txn.paymentStatus === 'SETTLED' ? 'bg-green-get/10 text-green-get' : 'bg-warning-pending/10 text-warning-pending'
                    }`}>
                      {txn.paymentStatus === 'SETTLED' ? t('settled') : t('pending')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <div className="flex items-center gap-1.5">
                      {txn.type === 'credit' && txn.paymentStatus === 'PENDING' && (
                        <button 
                          className="p-1.5 text-orange hover:text-orange-hover hover:bg-orange/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-transparent transition-colors" 
                          title={t('markAsSettled')} 
                          onClick={() => handleSettle(txn._id)}
                        >
                          <HiOutlineCheckCircle size={16} />
                        </button>
                      )}
                      {txn.type === 'debit' && txn.paymentStatus === 'PENDING' && (
                        <>
                          <button 
                            className="p-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-transparent transition-colors" 
                            title="Approve Payment" 
                            onClick={() => handleApprovePayment(txn._id)}
                          >
                            <HiOutlineCheckCircle size={16} />
                          </button>
                          <button 
                            className="p-1.5 text-red-500 hover:text-red-650 hover:bg-red-500/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-transparent transition-colors" 
                            title="Decline Payment" 
                            onClick={() => handleDeclinePayment(txn._id)}
                          >
                            <HiOutlineXCircle size={16} />
                          </button>
                        </>
                      )}
                      <button 
                        className="p-1.5 text-slate-gray hover:text-deep-navy hover:bg-slate-gray/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-transparent transition-colors" 
                        title="Edit Transaction" 
                        onClick={() => openEditModal(txn)}
                      >
                        <HiOutlinePencil size={16} />
                      </button>
                      <button 
                        className="p-1.5 text-red-give hover:text-red-hover hover:bg-red-give/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-transparent transition-colors" 
                        onClick={() => setDeleteTxnId(txn._id)}
                      >
                        <HiOutlineTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t('addTransaction')}>
        <form onSubmit={handleAddTxn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('customers')} *</label>
            <select className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" required value={txnForm.customer} onChange={(e) => setTxnForm({...txnForm, customer: e.target.value})}>
              <option value="">{t('selectCustomer')}</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} (Outstanding: ₹{Math.abs(c.balance).toLocaleString('en-IN')} {c.balance >= 0 ? 'Due' : 'Advance'})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('type')} *</label>
            <select className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={txnForm.type} onChange={(e) => setTxnForm({...txnForm, type: e.target.value})}>
              <option value="credit">{t('udhaarDesc')}</option>
              <option value="debit">{t('jamaDesc')}</option>
            </select>
          </div>
          {txnForm.type === 'debit' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Mode *</label>
              <select className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={txnForm.paymentMode || 'cash'} onChange={(e) => setTxnForm({...txnForm, paymentMode: e.target.value})}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="online">Online Transfer</option>
              </select>
            </div>
          )}
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
                onChange={(e) => setTxnForm({...txnForm, amount: e.target.value})} 
                placeholder="0.00" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('description')}</label>
            <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={txnForm.description} onChange={(e) => setTxnForm({...txnForm, description: e.target.value})} placeholder="E.g., Groceries" />
          </div>
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
            <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" type="date" value={txnForm.date} onChange={(e) => setTxnForm({...txnForm, date: e.target.value})} />
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

          <div className="flex justify-end gap-3 pt-3 border-t border-soft-gray">
            <button type="button" className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors" onClick={() => setShowAddModal(false)}>{t('cancel')}</button>
            <button type="submit" className="px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm disabled:opacity-50" disabled={submitting}>
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
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
              type="number" 
              min="0.01" 
              step="0.01" 
              required 
              value={editForm.amount}
              onChange={(e) => setEditForm({...editForm, amount: e.target.value})} 
              placeholder="Enter amount" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('description')}</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
              value={editForm.description} 
              onChange={(e) => setEditForm({...editForm, description: e.target.value})} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('date')}</label>
            <input 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
              type="date" 
              value={editForm.date} 
              onChange={(e) => setEditForm({...editForm, date: e.target.value})} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Status *</label>
            <select 
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
              required 
              value={editForm.paymentStatus}
              onChange={(e) => setEditForm({...editForm, paymentStatus: e.target.value})}
            >
              <option value="PENDING">{t('pending')}</option>
              <option value="SETTLED">{t('settled')}</option>
            </select>
          </div>
          {editingTxn?.type === 'debit' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Payment Mode *</label>
              <select 
                className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" 
                required 
                value={editForm.paymentMode || 'cash'}
                onChange={(e) => setEditForm({...editForm, paymentMode: e.target.value})}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="online">Online Transfer</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-soft-gray">
            <button type="button" className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors" onClick={() => setShowEditModal(false)}>{t('cancel')}</button>
            <button type="submit" className="px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm" disabled={submitting}>{submitting ? t('saving') : t('save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTxnId} onClose={() => setDeleteTxnId(null)} onConfirm={handleDelete}
        title={t('deleteTransaction')} message={t('deleteTransactionMsg')} />
    </>
  );
};

export default TransactionsPage;
