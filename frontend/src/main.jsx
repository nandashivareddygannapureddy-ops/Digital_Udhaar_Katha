import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { toast } from 'react-toastify'
import './index.css'
import App from './App.jsx'

// Overriding default toast functions to automatically format string messages as title/subtitle
const originalSuccess = toast.success;
const originalError = toast.error;
const originalWarn = toast.warn;
const originalWarning = toast.warning;
const originalInfo = toast.info;

const getNotificationTitle = (message, type) => {
  const msg = message.toLowerCase();
  
  if (type === 'success') {
    if (msg.includes('udhaar') || msg.includes('gave')) return 'Udhaar Recorded';
    if (msg.includes('jama') || msg.includes('got') || msg.includes('settled')) return 'Payment Received';
    if (msg.includes('customer') && msg.includes('add')) return 'Customer Added';
    if (msg.includes('customer') && msg.includes('delet')) return 'Customer Deleted';
    if (msg.includes('customer') && msg.includes('restor')) return 'Customer Restored';
    if (msg.includes('customer') && msg.includes('updat')) return 'Customer Updated';
    if (msg.includes('backup') && (msg.includes('creat') || msg.includes('success') || msg.includes('complete'))) return 'Backup Completed';
    if (msg.includes('restored') || (msg.includes('restore') && (msg.includes('success') || msg.includes('complete')))) return 'Backup Restored';
    if (msg.includes('cashbook')) return 'Entry Added';
    if (msg.includes('password') && msg.includes('sent')) return 'Link Sent';
    if (msg.includes('password') && msg.includes('reset')) return 'Password Reset';
    if (msg.includes('password')) return 'Security Updated';
    if (msg.includes('login') || msg.includes('sign in')) return 'Logged In';
    if (msg.includes('register') || msg.includes('sign up')) return 'Account Created';
    if (msg.includes('pin') && msg.includes('setup')) return 'PIN Configured';
    if (msg.includes('pin') && msg.includes('change')) return 'PIN Updated';
    if (msg.includes('trash') || msg.includes('clear')) return 'Trash Cleared';
    
    return 'Success';
  } else if (type === 'error') {
    if (msg.includes('udhaar') || msg.includes('entry') || msg.includes('transaction')) return 'Transaction Failed';
    if (msg.includes('customer')) return 'Customer Error';
    if (msg.includes('backup')) return 'Backup Failed';
    if (msg.includes('restore')) return 'Restore Failed';
    if (msg.includes('password')) return 'Password Error';
    if (msg.includes('pin')) return 'PIN Error';
    if (msg.includes('login') || msg.includes('auth')) return 'Authentication Failed';
    
    return 'Error';
  } else if (type === 'warning') {
    return 'Warning';
  } else {
    return 'Info';
  }
};

const formatMessage = (content, type) => {
  if (typeof content === 'string') {
    const title = getNotificationTitle(content, type);
    return (
      <div className="flex flex-col">
        <span className="font-extrabold text-[13px] text-deep-navy">{title}</span>
        <span className="text-[11px] text-slate-gray mt-0.5">{content}</span>
      </div>
    );
  }
  return content;
};

const wrapToast = (originalFn, type) => {
  return (content, options) => {
    const formatted = formatMessage(content, type);
    const toastId = originalFn(formatted, options);
    const delay = (options && typeof options.autoClose === 'number') ? options.autoClose : 1500;
    if (delay !== false) {
      setTimeout(() => {
        toast.dismiss(toastId);
      }, delay);
    }
    return toastId;
  };
};

toast.success = wrapToast(originalSuccess, 'success');
toast.error = wrapToast(originalError, 'error');
toast.warn = wrapToast(originalWarn, 'warning');
toast.warning = wrapToast(originalWarning, 'warning');
toast.info = wrapToast(originalInfo, 'info');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
