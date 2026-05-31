import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AIChatAssistant from '../AI/AIChatAssistant';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-soft-white text-deep-navy">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:pl-64 pt-18 min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children || <Outlet context={[sidebarOpen, setSidebarOpen]} />}
        </div>
      </main>
      <AIChatAssistant />
    </div>
  );
};

export default Layout;
