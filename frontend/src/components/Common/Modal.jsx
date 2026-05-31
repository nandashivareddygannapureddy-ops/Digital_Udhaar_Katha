const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-deep-navy/45 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-pure-white border border-soft-gray rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-3 border-b border-soft-gray">
          <h2 className="text-lg font-bold text-deep-navy m-0">{title}</h2>
          <button className="text-slate-gray hover:text-deep-navy bg-transparent border-none text-2xl leading-none cursor-pointer p-0" onClick={onClose}>&times;</button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
