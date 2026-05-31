import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { FiHome, FiUsers, FiSettings, FiBell, FiBookOpen, FiClock } from 'react-icons/fi';
import Logo from '../Common/Logo';

const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  const links = [
    { to: '/', icon: <FiHome size={20} />, label: t('dashboard') },
    { to: '/customers', icon: <FiUsers size={20} />, label: t('customers') },
    { to: '/cashbook', icon: <FiBookOpen size={20} />, label: t('cashbook') },
    { to: '/reminders', icon: <FiBell size={20} />, label: t('reminders') },
    { to: '/settings', icon: <FiSettings size={20} />, label: t('settings') },
    { to: '/history', icon: <FiClock size={20} />, label: 'Transaction History' },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-deep-navy/30 backdrop-blur-xs z-40 lg:hidden transition-opacity" 
          onClick={onClose} 
        />
      )}
      <aside 
        className={`fixed left-0 top-0 bottom-0 w-64 p-6 bg-pure-white border-r border-soft-gray flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-pure-white border border-soft-gray flex items-center justify-center p-1.5 shadow-sm">
            <Logo />
          </div>
          <div>
            <div className="text-base font-bold text-deep-navy leading-tight">Udhaar Khata</div>
            <span className="text-[10px] text-slate-gray font-normal block mt-0.5">{t('digitalLedger')}</span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive 
                    ? 'text-white bg-orange/95 shadow-md shadow-orange/20' 
                    : 'text-slate-gray hover:text-deep-navy hover:bg-light-cream'
                }`
              }
              onClick={onClose}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
