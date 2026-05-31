import { useState, useRef, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { HiOutlineMenuAlt2, HiOutlineUser, HiOutlineLogout, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';

const Header = ({ title, subtitle, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const context = useOutletContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleSidebar = onToggleSidebar || (() => {
    if (context && Array.isArray(context)) {
      const [sidebarOpen, setSidebarOpen] = context;
      setSidebarOpen(!sidebarOpen);
    }
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-18 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-soft-white/80 backdrop-blur-md border-b border-soft-gray z-40">
      <div className="flex items-center">
        <button 
          className="lg:hidden mr-3 p-2 text-slate-gray hover:bg-slate-gray/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-none" 
          onClick={toggleSidebar}
          id="menu-toggle"
        >
          <HiOutlineMenuAlt2 size={22} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-deep-navy leading-none">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-gray mt-1 leading-none">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3" id="header-actions">
        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 bg-pure-white border border-soft-gray hover:bg-light-cream/50 rounded-full cursor-pointer text-slate-gray hover:text-deep-navy transition-all flex items-center justify-center shadow-xs outline-none"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <HiOutlineSun className="text-amber-500 animate-pulse" size={18} />
          ) : (
            <HiOutlineMoon className="text-indigo-600" size={18} />
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-2.5 p-1 pr-3 bg-pure-white border border-soft-gray rounded-full cursor-pointer hover:bg-light-cream/30 hover:border-orange/30 transition-all text-deep-navy outline-none"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange to-orange-hover flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0 shadow-inner">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold leading-tight">{user?.name || 'User'}</div>
              <div className="text-[10px] text-slate-gray leading-none mt-0.5">{user?.storeName || 'Store'}</div>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full mt-2 right-0 min-w-48 p-1.5 bg-pure-white border border-soft-gray rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-0 text-slate-gray cursor-pointer rounded-lg text-sm transition-colors hover:bg-slate-gray/5 hover:text-deep-navy text-left font-medium"
              >
                <HiOutlineUser className="shrink-0 text-slate-gray" size={16} /> Profile & Settings
              </button>
              <div className="h-px bg-soft-gray my-1.5 mx-2" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-0 text-red-give cursor-pointer rounded-lg text-sm transition-colors hover:bg-red-give/10 text-left font-medium"
              >
                <HiOutlineLogout className="shrink-0 text-red-give" size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
