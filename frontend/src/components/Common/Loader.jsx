const Loader = ({ fullPage }) => {
  return (
    <div className={fullPage ? 'fixed inset-0 bg-[#F8F7F5]/80 backdrop-blur-md z-50 flex items-center justify-center' : 'flex items-center justify-center p-8 w-full'}>
      <div className="w-10 h-10 border-4 border-orange/20 border-t-orange rounded-full animate-spin"></div>
    </div>
  );
};

export default Loader;
