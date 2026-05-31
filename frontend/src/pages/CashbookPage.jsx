import { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import Header from '../components/Layout/Header';
import { useSocketSync } from '../hooks/useSocketSync';
import Modal from '../components/Common/Modal';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import Loader from '../components/Common/Loader';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineDownload,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineBookOpen,
} from 'react-icons/hi';

const CashbookPage = () => {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    cashInHand: 0,
    todayCashIn: 0,
    todayCashOut: 0,
    filteredIn: 0,
    filteredOut: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters State
  const [period, setPeriod] = useState('today');
  const [paymentMode, setPaymentMode] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add Entry Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [entryType, setEntryType] = useState('in'); // 'in' or 'out'
  const [entryForm, setEntryForm] = useState({
    amount: '',
    description: '',
    paymentMode: 'cash',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete Entry State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    try {
      const params = {};
      if (period !== 'custom') {
        params.period = period;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      if (paymentMode !== 'all') {
        params.paymentMode = paymentMode;
      }

      if (search) {
        params.search = search;
      }

      const { data } = await API.get('/cashbook', { params });
      setEntries(data.data);
      setStats(data.stats);
    } catch (err) {
      toast.error('Failed to load cashbook entries');
    } finally {
      setLoading(false);
    }
  }, [period, paymentMode, search, startDate, endDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useSocketSync(fetchEntries, ['cashbook']);

  // Open Modal for In/Out
  const handleOpenAddModal = (type) => {
    setEntryType(type);
    setEntryForm({
      amount: '',
      description: '',
      paymentMode: 'cash',
      category: type === 'in' ? 'Sales' : 'Other',
      date: new Date().toISOString().split('T')[0],
    });
    setShowAddModal(true);
  };

  // Submit new entry
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!entryForm.amount || parseFloat(entryForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/cashbook', {
        type: entryType,
        ...entryForm,
      });
      toast.success(
        entryType === 'in' ? 'Cash In recorded successfully' : 'Cash Out recorded successfully'
      );
      setShowAddModal(false);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save cashbook entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Entry
  const handleOpenDelete = (entry) => {
    setEntryToDelete(entry);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    setDeleting(true);
    try {
      await API.delete(`/cashbook/${entryToDelete._id}`);
      toast.success('Cashbook entry deleted');
      setShowDeleteDialog(false);
      setEntryToDelete(null);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete cashbook entry');
    } finally {
      setDeleting(false);
    }
  };

  // Download PDF Report
  const handleDownloadReport = async () => {
    try {
      const params = {};
      if (period !== 'custom') {
        params.period = period;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      if (paymentMode !== 'all') {
        params.paymentMode = paymentMode;
      }

      if (search) {
        params.search = search;
      }

      const response = await API.get('/cashbook/report', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `cashbook_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t('downloadStatement'));
    } catch (err) {
      toast.error('Failed to download PDF report');
    }
  };

  // Daily Profit Calculation
  const todayDateString = new Date().toDateString();
  const todayEntries = entries.filter(e => new Date(e.date).toDateString() === todayDateString);
  const todayIn = todayEntries.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0);
  const todayOut = todayEntries.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0);
  const dailyProfit = todayIn - todayOut;

  // Weekly Spending calculation
  const getWeeklySpending = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push({
        dateLabel: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        dateStr: d.toDateString(),
        amount: 0
      });
    }

    entries.forEach(e => {
      if (e.type === 'out') {
        const entryDayStr = new Date(e.date).toDateString();
        const dayObj = last7Days.find(d => d.dateStr === entryDayStr);
        if (dayObj) {
          dayObj.amount += e.amount;
        }
      }
    });

    return last7Days;
  };
  const weeklySpending = getWeeklySpending();
  const maxWeeklyAmount = Math.max(...weeklySpending.map(w => w.amount), 1);

  // Category breakdown calculation
  const getCategoryBreakdown = () => {
    const categories = {
      Stock: 0,
      Rent: 0,
      Salary: 0,
      Electricity: 0,
      Food: 0,
      Other: 0
    };
    
    entries.forEach(e => {
      if (e.type === 'out') {
        const cat = e.category || 'Other';
        if (categories[cat] !== undefined) {
          categories[cat] += e.amount;
        } else {
          categories['Other'] += e.amount;
        }
      }
    });

    return Object.entries(categories).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  };
  const categoryBreakdown = getCategoryBreakdown();
  const maxCategoryAmount = Math.max(...categoryBreakdown.map(c => c.amount), 1);

  const handleDownloadExcel = async () => {
    try {
      const response = await API.get('/cashbook/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `cashbook_statement_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Excel statement downloaded successfully!");
    } catch (err) {
      toast.error('Failed to download Excel statement');
    }
  };

  return (
    <>
      <Header
        title={t('cashbook')}
        subtitle={t('cashInHandDesc')}
        onToggleSidebar={() => {}}
      />

      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-center transition-all ${
          stats.cashInHand >= 0 
            ? 'bg-green-get/5 border-green-get/20' 
            : 'bg-red-give/5 border-red-give/20'
        }`}>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-gray mb-2">
            <HiOutlineBookOpen className={stats.cashInHand >= 0 ? 'text-green-get' : 'text-red-give'} size={18} /> 
            <span>{t('cashInHand')}</span>
          </div>
          <div className={`text-3xl font-extrabold ${stats.cashInHand >= 0 ? 'text-green-get' : 'text-red-give'}`}>
            ₹{stats.cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-gray mt-1">{t('cashInHandDesc')}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-pure-white border border-soft-gray rounded-2xl p-5 flex flex-col justify-center shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-gray mb-1">
              {t('todaysCashIn')}
            </span>
            <div className="text-xl font-extrabold text-green-get flex items-center gap-1">
              <HiOutlineArrowDown size={18} />
              ₹{stats.todayCashIn.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-pure-white border border-soft-gray rounded-2xl p-5 flex flex-col justify-center shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-gray mb-1">
              {t('todaysCashOut')}
            </span>
            <div className="text-xl font-extrabold text-red-give flex items-center gap-1">
              <HiOutlineArrowUp size={18} />
              ₹{stats.todayCashOut.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly Spending (Bar Chart) */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-5 shadow-sm">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-gray mb-4">Weekly Spending (Last 7 Days)</h4>
          <div className="h-36 flex items-end justify-between gap-2 pt-2">
            {weeklySpending.map((w, index) => {
              const barHeightPercent = (w.amount / maxWeeklyAmount) * 100;
              return (
                <div key={index} className="flex flex-col items-center flex-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 bg-deep-navy text-white text-[9px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    ₹{w.amount.toLocaleString('en-IN')}
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full bg-[#fce7e7] group-hover:bg-red-give rounded-md transition-colors"
                    style={{ height: `${Math.max(barHeightPercent, 5)}%`, minHeight: '6px' }}
                  />
                  <span className="text-[9px] text-slate-gray mt-2 text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">
                    {w.dateLabel.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-5 shadow-sm">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-gray mb-4">Highest Expense Categories</h4>
          <div className="space-y-3 h-36 overflow-y-auto pr-1">
            {categoryBreakdown.map((cat, index) => {
              const widthPercent = (cat.amount / maxCategoryAmount) * 100;
              if (cat.amount === 0) return null;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-deep-navy">{cat.name}</span>
                    <span className="text-slate-gray">₹{cat.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-soft-white h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        index === 0 ? 'bg-red-give' : 'bg-warning-pending'
                      }`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {categoryBreakdown.filter(cat => cat.amount > 0).length === 0 && (
              <div className="text-center text-xs text-slate-gray/60 py-8">No expenses recorded yet</div>
            )}
          </div>
        </div>

        {/* Daily Profit & Income Breakdown */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-gray mb-2">Daily Profit Calculation</h4>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-extrabold ${dailyProfit >= 0 ? 'text-green-get' : 'text-red-give'}`}>
                {dailyProfit >= 0 ? '+' : ''}₹{dailyProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-slate-gray">(Today's Profit)</span>
            </div>
            <div className="text-[9px] text-slate-gray mt-1">Today's In: ₹{todayIn.toLocaleString('en-IN')} | Out: ₹{todayOut.toLocaleString('en-IN')}</div>
          </div>

          <div className="pt-2 border-t border-soft-gray/50 mt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-gray mb-2">Monthly Cashflow Ratio</h4>
            {stats.filteredIn === 0 && stats.filteredOut === 0 ? (
              <div className="text-xs text-slate-gray/60 text-center py-2">No transactions in selected period</div>
            ) : (
              <div className="space-y-1">
                <div className="w-full bg-soft-white h-3 rounded-lg overflow-hidden flex">
                  <div 
                    className="bg-green-get h-full"
                    style={{ width: `${(stats.filteredIn / (stats.filteredIn + stats.filteredOut || 1)) * 100}%` }}
                    title={`Cash In: ${((stats.filteredIn / (stats.filteredIn + stats.filteredOut || 1)) * 100).toFixed(0)}%`}
                  />
                  <div 
                    className="bg-red-give h-full"
                    style={{ width: `${(stats.filteredOut / (stats.filteredIn + stats.filteredOut || 1)) * 100}%` }}
                    title={`Cash Out: ${((stats.filteredOut / (stats.filteredIn + stats.filteredOut || 1)) * 100).toFixed(0)}%`}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-gray font-semibold">
                  <span className="text-green-get">In: {((stats.filteredIn / (stats.filteredIn + stats.filteredOut || 1)) * 100).toFixed(0)}%</span>
                  <span className="text-red-give">Out: {((stats.filteredOut / (stats.filteredIn + stats.filteredOut || 1)) * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Content */}
      <div className="bg-pure-white border border-soft-gray rounded-2xl p-6 shadow-sm mb-24">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
          <h3 className="text-base font-bold text-deep-navy mb-0">{t('transactionHistory')}</h3>
          <div className="flex gap-2">
            <button 
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-soft-gray hover:bg-slate-gray/5 text-slate-gray font-bold rounded-xl text-xs transition-colors cursor-pointer bg-transparent" 
              onClick={handleDownloadReport}
            >
              <HiOutlineDownload size={14} /> PDF
            </button>
            <button 
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-soft-gray hover:bg-slate-gray/5 text-slate-gray font-bold rounded-xl text-xs transition-colors cursor-pointer bg-transparent" 
              onClick={handleDownloadExcel}
            >
              <HiOutlineDownload size={14} /> Excel
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-soft-white border border-soft-gray p-4 rounded-2xl mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray" size={15} />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 bg-pure-white border border-soft-gray rounded-xl text-xs focus:outline-none focus:border-orange transition-all placeholder:text-slate-gray/50"
              placeholder="Search remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="px-3 py-2 bg-pure-white border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange transition-colors min-w-[120px]"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="today">{t('today')}</option>
              <option value="yesterday">{t('yesterday')}</option>
              <option value="this-month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            <select
              className="px-3 py-2 bg-pure-white border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange transition-colors min-w-[120px]"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="cash">{t('cash')}</option>
              <option value="online">{t('online')}</option>
            </select>

            {period === 'custom' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  className="px-2 py-1.5 bg-pure-white border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-xs text-slate-gray">to</span>
                <input
                  type="date"
                  className="px-2 py-1.5 bg-pure-white border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Entries Table */}
        {loading ? (
          <Loader />
        ) : entries.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <HiOutlineBookOpen className="mx-auto text-slate-gray/30" size={48} />
            <h3 className="text-base font-bold text-deep-navy mb-0">{t('noCashbookEntries')}</h3>
            <p className="text-xs text-slate-gray mt-0">{t('addFirstCashbook')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-soft-gray">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-soft-white border-b border-soft-gray">
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-gray">Date & Time</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('paymentMode')}</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-gray">Category</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('remarks')}</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-gray text-right">{t('cashIn')} (₹)</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-gray text-right">{t('cashOut')} (₹)</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-gray text-center w-[80px]">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isCashIn = entry.type === 'in';
                    const formattedDate = new Date(entry.date).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={entry._id} className="border-b border-soft-gray/50 hover:bg-light-cream/10 transition-colors">
                        <td className="px-5 py-4 text-xs text-slate-gray align-middle">{formattedDate}</td>
                        <td className="px-5 py-4 text-xs align-middle">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              entry.paymentMode === 'cash' 
                                ? 'bg-warning-pending/10 text-warning-pending' 
                                : 'bg-green-get/10 text-green-get'
                            }`}
                          >
                            {entry.paymentMode === 'cash' ? t('cash') : t('online')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-gray align-middle">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                            entry.type === 'in' 
                              ? 'bg-green-get/5 text-green-get border border-green-get/10' 
                              : 'bg-red-give/5 text-red-give border border-red-give/10'
                          }`}>
                            {entry.category || 'Other'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-deep-navy align-middle">{entry.description || '—'}</td>
                        <td className="px-5 py-4 text-sm font-bold text-green-get text-right align-middle">
                          {isCashIn ? `+₹${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-red-give text-right align-middle">
                          {!isCashIn ? `-₹${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-5 py-4 text-sm text-center align-middle">
                          <button
                            className="p-1.5 text-red-give hover:text-red-hover hover:bg-red-give/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-transparent transition-colors mx-auto"
                            onClick={() => handleOpenDelete(entry)}
                            title={t('delete')}
                          >
                            <HiOutlineTrash size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Filter Summary footer */}
            <div className="mt-4 flex justify-end gap-6 p-4 bg-soft-white border border-soft-gray rounded-xl text-xs font-bold text-slate-gray">
              <div>
                <span>Total Cash In: </span>
                <span className="text-green-get">
                  ₹{stats.filteredIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span>Total Cash Out: </span>
                <span className="text-red-give">
                  ₹{stats.filteredOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex gap-3 z-30 shadow-lg p-2 bg-pure-white/80 backdrop-blur-md rounded-2xl border border-soft-gray">
        <button
          className="inline-flex items-center gap-2 px-5 py-3 bg-green-get hover:bg-green-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-all shadow-md"
          onClick={() => handleOpenAddModal('in')}
        >
          <HiOutlineArrowDown size={16} /> {t('addCashIn')}
        </button>
        <button
          className="inline-flex items-center gap-2 px-5 py-3 bg-red-give hover:bg-red-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-all shadow-md"
          onClick={() => handleOpenAddModal('out')}
        >
          <HiOutlineArrowUp size={16} /> {t('addCashOut')}
        </button>
      </div>

      {/* Add Cash In / Cash Out Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={entryType === 'in' ? t('addCashIn') : t('addCashOut')}
      >
        <form onSubmit={handleAddEntry} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('amount')} (₹) *</label>
            <input
              type="number"
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
              required
              min="0.01"
              step="0.01"
              placeholder="Enter amount"
              value={entryForm.amount}
              onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('paymentMode')} *</label>
            <select
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
              required
              value={entryForm.paymentMode}
              onChange={(e) => setEntryForm({ ...entryForm, paymentMode: e.target.value })}
            >
              <option value="cash">{t('cash')}</option>
              <option value="online">{t('online')}</option>
            </select>
          </div>

          {entryType === 'out' ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Category *</label>
              <select
                className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
                required
                value={entryForm.category}
                onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
              >
                <option value="Stock">Stock Purchase</option>
                <option value="Rent">Rent</option>
                <option value="Salary">Salary / Wages</option>
                <option value="Electricity">Electricity / Bills</option>
                <option value="Food">Food & Chai</option>
                <option value="Other">Other Expense</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">Category *</label>
              <select
                className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
                required
                value={entryForm.category}
                onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
              >
                <option value="Sales">Store Sales</option>
                <option value="Other">Other Income</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('remarks')}</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
              placeholder="e.g. Paid tea vendor, received opening bal..."
              value={entryForm.description}
              onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('date')}</label>
            <input
              type="date"
              className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
              value={entryForm.date}
              onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-soft-gray">
            <button
              type="button"
              className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
              onClick={() => setShowAddModal(false)}
            >
              {t('cancel')}
            </button>
            <button type="submit" className="px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm" disabled={submitting}>
              {submitting ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Cashbook Entry?"
        message="Are you sure you want to delete this cash entry? The cash balance will be recalculated."
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        danger={true}
      />
    </>
  );
};

export default CashbookPage;
