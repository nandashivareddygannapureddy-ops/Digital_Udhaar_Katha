import { HiOutlineExclamation } from 'react-icons/hi';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', danger = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-deep-navy/45 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-pure-white border border-soft-gray rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
            danger ? 'bg-red-give/10 text-red-give' : 'bg-orange/10 text-orange'
          }`}>
            <HiOutlineExclamation size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-deep-navy mb-0">{title || 'Are you sure?'}</h3>
            <p className="text-sm text-slate-gray mt-1 mb-0">{message || 'This action cannot be undone.'}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-3">
            <button className="px-4 py-2.5 bg-transparent border border-soft-gray text-slate-gray hover:bg-slate-gray/5 rounded-xl text-sm font-semibold cursor-pointer transition-colors" onClick={onClose}>Cancel</button>
            <button 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm ${
                danger 
                  ? 'bg-red-give hover:bg-red-hover text-white' 
                  : 'bg-orange hover:bg-orange-hover text-white'
              }`} 
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
