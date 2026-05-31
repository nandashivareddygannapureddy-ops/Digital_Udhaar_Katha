import { useState, useEffect } from 'react';
import API from '../api/axios';
import Header from '../components/Layout/Header';
import { useSocketSync } from '../hooks/useSocketSync';
import Loader from '../components/Common/Loader';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import { 
  HiOutlineSearch, 
  HiOutlineClock, 
  HiOutlinePlusCircle, 
  HiOutlinePencilAlt, 
  HiOutlineTrash, 
  HiOutlineClipboardCopy,
  HiOutlineChevronRight,
  HiOutlineX
} from 'react-icons/hi';

const PermanentHistoryPage = () => {
  const { t } = useLanguage();
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'CREATE', 'UPDATE', 'DELETE'

  const fetchHistory = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const { data } = await API.get('/history', { params });
      setHistoryLogs(data.data);
    } catch (err) {
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search]);

  useSocketSync(fetchHistory, ['customers', 'transactions']);

  // Client-side filtering based on activeFilter
  const filteredLogs = historyLogs.filter(log => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'CREATE') return log.action === 'CREATE';
    if (activeFilter === 'UPDATE') return log.action === 'UPDATE';
    if (activeFilter === 'DELETE') return log.action === 'DELETE' || log.action === 'CUSTOMER_DELETED';
    return true;
  });

  // Count stats
  const totalCount = historyLogs.length;
  const createCount = historyLogs.filter(log => log.action === 'CREATE').length;
  const editCount = historyLogs.filter(log => log.action === 'UPDATE').length;
  const deleteCount = historyLogs.filter(log => log.action === 'DELETE' || log.action === 'CUSTOMER_DELETED').length;

  return (
    <>
      <Header 
        title="Transaction History" 
        subtitle="Undeletable audit record of all customers and transactions" 
      />

      {/* Audit Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-pure-white border border-soft-gray p-5 rounded-2xl shadow-xs flex items-center gap-4 transition-all hover:shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
            <HiOutlineClock size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-gray">Total Logs</span>
            <h4 className="text-xl font-extrabold text-deep-navy m-0 mt-0.5">{totalCount}</h4>
          </div>
        </div>

        <div className="bg-pure-white border border-soft-gray p-5 rounded-2xl shadow-xs flex items-center gap-4 transition-all hover:shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
            <HiOutlinePlusCircle size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-gray">New Records</span>
            <h4 className="text-xl font-extrabold text-deep-navy m-0 mt-0.5">{createCount}</h4>
          </div>
        </div>

        <div className="bg-pure-white border border-soft-gray p-5 rounded-2xl shadow-xs flex items-center gap-4 transition-all hover:shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-warning-pending/10 flex items-center justify-center text-warning-pending shrink-0">
            <HiOutlinePencilAlt size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-gray">Updates & Edits</span>
            <h4 className="text-xl font-extrabold text-deep-navy m-0 mt-0.5">{editCount}</h4>
          </div>
        </div>

        <div className="bg-pure-white border border-soft-gray p-5 rounded-2xl shadow-xs flex items-center gap-4 transition-all hover:shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-give/10 flex items-center justify-center text-red-give shrink-0">
            <HiOutlineTrash size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-gray">Deletions</span>
            <h4 className="text-xl font-extrabold text-deep-navy m-0 mt-0.5">{deleteCount}</h4>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-pure-white border border-soft-gray p-4 rounded-2xl shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/70" size={16} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-soft-white border border-soft-gray rounded-xl text-xs text-deep-navy focus:outline-none focus:border-orange focus:ring-4 focus:ring-orange/5 transition-all placeholder:text-slate-gray/40 font-medium"
            placeholder="Search by customer name, phone, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Action filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-orange text-white shadow-sm'
                : 'bg-soft-white border border-soft-gray text-slate-gray hover:bg-orange/5 hover:text-orange'
            }`}
          >
            All Logs ({totalCount})
          </button>
          <button
            onClick={() => setActiveFilter('CREATE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'CREATE'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-soft-white border border-soft-gray text-slate-gray hover:bg-green-500/5 hover:text-green-600'
            }`}
          >
            Creates ({createCount})
          </button>
          <button
            onClick={() => setActiveFilter('UPDATE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'UPDATE'
                ? 'bg-warning-pending text-white shadow-sm'
                : 'bg-soft-white border border-soft-gray text-slate-gray hover:bg-warning-pending/5 hover:text-warning-pending'
            }`}
          >
            Edits ({editCount})
          </button>
          <button
            onClick={() => setActiveFilter('DELETE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'DELETE'
                ? 'bg-red-give text-white shadow-sm'
                : 'bg-soft-white border border-soft-gray text-slate-gray hover:bg-red-give/5 hover:text-red-give'
            }`}
          >
            Deletes ({deleteCount})
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : filteredLogs.length === 0 ? (
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-16 text-center shadow-sm space-y-4 max-w-xl mx-auto">
          <HiOutlineClock className="mx-auto text-slate-gray/20" size={56} />
          <h3 className="text-lg font-bold text-deep-navy">No Transaction History Found</h3>
          <p className="text-xs text-slate-gray max-w-sm mx-auto leading-relaxed">
      Every time you create, edit, or delete a ledger entry, an transaction record will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-xs overflow-hidden mb-24">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-soft-white border-b border-soft-gray">
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-gray/80">Date & Time</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-gray/80">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-gray/80">Phone</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-gray/80 text-center">Action</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-gray/80">Log Detail</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-gray/80 text-right">Amount (₹)</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-gray/80 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray/30">
                {filteredLogs.map((log) => {
                  const formattedDate = new Date(log.date || log.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  // Set Action badges
                  let badgeClass = 'bg-slate-gray/10 text-slate-gray';
                  let actionLabel = log.action;
                  let icon = <HiOutlineClock size={12} />;

                  if (log.action === 'CREATE') {
                    badgeClass = log.type === 'customer_created' 
                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' 
                      : 'bg-green-get/10 text-green-get border border-green-get/20';
                    actionLabel = log.type === 'customer_created' ? 'NEW CUST' : 'TXN CREATE';
                    icon = <HiOutlinePlusCircle size={12} />;
                  } else if (log.action === 'UPDATE') {
                    badgeClass = 'bg-warning-pending/10 text-warning-pending border border-warning-pending/20';
                    actionLabel = 'TXN EDIT';
                    icon = <HiOutlinePencilAlt size={12} />;
                  } else if (log.action === 'DELETE') {
                    badgeClass = 'bg-red-give/10 text-red-give border border-red-give/20';
                    actionLabel = 'TXN DELETED';
                    icon = <HiOutlineTrash size={12} />;
                  } else if (log.action === 'CUSTOMER_DELETED') {
                    badgeClass = 'bg-red-give/20 text-red-give border border-red-give/30 font-bold';
                    actionLabel = 'CUST DELETED';
                    icon = <HiOutlineTrash size={12} />;
                  }

                  // Initials for avatar
                  const initials = log.customerName
                    ? log.customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    : 'C';

                  return (
                    <tr 
                      key={log._id} 
                      onClick={() => {
                        setSelectedLog(log);
                        setShowModal(true);
                      }}
                      className="group hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4.5 text-xs text-slate-gray font-medium">{formattedDate}</td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange/20 to-orange/10 text-orange font-bold text-[10px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <span className="text-xs font-bold text-deep-navy group-hover:text-orange transition-colors">
                            {log.customerName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-xs text-slate-gray font-semibold">{log.customerPhone || '—'}</td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wider uppercase ${badgeClass}`}>
                          {icon}
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-xs text-deep-navy/80 font-medium max-w-[300px] truncate" title={log.description}>
                        {log.description || '—'}
                      </td>
                      <td className="px-6 py-4.5 text-xs font-bold text-right text-deep-navy">
                        {log.amount > 0 ? (
                          <span className={log.action === 'DELETE' || log.action === 'CUSTOMER_DELETED' ? 'text-slate-gray line-through' : ''}>
                            ₹{log.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4.5 text-center shrink-0 w-10">
                        <HiOutlineChevronRight className="text-slate-gray/30 group-hover:text-orange transition-colors group-hover:translate-x-0.5 transition-transform" size={16} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Premium Detail Modal with Glassmorphism / Transitions */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-deep-navy/40 backdrop-blur-md"
            onClick={() => {
              setShowModal(false);
              setSelectedLog(null);
            }}
          />
          
          {/* Modal Container */}
          <div className="relative bg-pure-white border border-soft-gray rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-250">
            {/* Modal Header */}
            <div className="bg-[#0f172a] text-white p-5 flex justify-between items-center border-b border-soft-gray/10">
              <div>
                <h3 className="text-md font-bold tracking-tight m-0 text-white">Audit Record Details</h3>
                <p className="text-[9px] text-slate-gray/80 font-bold m-0 mt-0.5 uppercase tracking-wider">Undeletable Ledger History</p>
              </div>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setSelectedLog(null);
                }} 
                className="bg-transparent border-none text-white/80 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-pure-white/10 transition-colors flex items-center justify-center"
              >
                <HiOutlineX size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="bg-[#f8fafc] border border-soft-gray/60 rounded-2xl p-5 divide-y divide-soft-gray/40 space-y-4">
                {/* Customer Details */}
                <div className="flex justify-between items-center pb-4">
                  <div>
                    <span className="text-[9px] text-slate-gray font-extrabold uppercase tracking-wider block">Customer</span>
                    <span className="text-sm font-extrabold text-deep-navy block mt-0.5">{selectedLog.customerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-gray font-extrabold uppercase tracking-wider block">Phone</span>
                    <span className="text-xs font-semibold text-deep-navy block mt-0.5">{selectedLog.customerPhone || '—'}</span>
                  </div>
                </div>

                {/* Audit Action & Record Type */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <span className="text-[9px] text-slate-gray font-extrabold uppercase tracking-wider block">Audit Action</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wider uppercase mt-1 ${
                      selectedLog.action === 'CREATE' ? 'bg-green-500/10 text-green-600 border border-green-500/20' :
                      selectedLog.action === 'UPDATE' ? 'bg-orange/10 text-orange border border-orange/20' :
                      'bg-red-500/10 text-red-600 border border-red-500/20'
                    }`}>
                      {selectedLog.action === 'CUSTOMER_DELETED' ? 'CUST DELETED' : selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-gray font-extrabold uppercase tracking-wider block">Record Type</span>
                    <span className="text-xs font-bold text-deep-navy block mt-1.5 uppercase">
                      {selectedLog.type === 'customer_created' ? 'New Customer' :
                       selectedLog.type === 'customer_deleted' ? 'Deleted Customer' :
                       selectedLog.type}
                    </span>
                  </div>
                </div>

                {/* Transaction ID */}
                {selectedLog.transactionId && (
                  <div className="flex justify-between items-center pt-4">
                    <div>
                      <span className="text-[9px] text-slate-gray font-extrabold uppercase tracking-wider block">Transaction ID</span>
                      <span className="text-[11px] font-mono text-deep-navy font-semibold block mt-0.5">{selectedLog.transactionId}</span>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedLog.transactionId);
                        toast.success('Transaction ID copied!');
                      }}
                      className="px-2.5 py-1.5 bg-white border border-soft-gray hover:border-orange hover:text-orange text-slate-gray rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1"
                    >
                      <HiOutlineClipboardCopy size={12} />
                      Copy ID
                    </button>
                  </div>
                )}

                {/* Date & Time */}
                <div className="pt-4">
                  <span className="text-[9px] text-slate-gray font-extrabold uppercase tracking-wider block">Date & Time</span>
                  <span className="text-xs font-semibold text-deep-navy block mt-0.5">
                    {new Date(selectedLog.date || selectedLog.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>

                {/* Description */}
                <div className="pt-4">
                  <span className="text-[9px] text-slate-gray font-extrabold uppercase tracking-wider block">Log Description</span>
                  <p className="text-xs text-deep-navy font-medium leading-relaxed m-0 mt-1 whitespace-pre-line text-left">
                    {selectedLog.description || '—'}
                  </p>
                </div>

                {/* Amount */}
                {selectedLog.amount > 0 && (
                  <div className="flex justify-between items-center pt-4">
                    <span className="text-xs font-bold text-deep-navy">Transaction Amount</span>
                    <span className="text-lg font-black text-orange">₹{selectedLog.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Compliance Text */}
              <p className="text-[9px] text-slate-gray/50 text-center m-0 leading-normal font-medium">
                This is a permanent system audit record. Under tax regulations, this record cannot be modified or deleted.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#f8fafc] border-t border-soft-gray/40 p-4 flex justify-end">
              <button 
                onClick={() => {
                  setShowModal(false);
                  setSelectedLog(null);
                }} 
                className="py-2.5 px-6 bg-deep-navy hover:bg-[#1e293b] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PermanentHistoryPage;
