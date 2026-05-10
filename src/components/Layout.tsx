import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  LogOut,
  Pill,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(user.name);
      setUserRole(user.role);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ShoppingCart, label: 'Fast Billing', path: '/pos' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
  ];

  return (
    <div className="min-h-screen bg-bg-base flex flex-col text-text-main font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5"></div>
      
      {/* Top Navigation */}
      <nav className="h-16 bg-slate-900/95 backdrop-blur-md text-white flex items-center justify-between px-6 shadow-2xl shrink-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-brand-primary p-2 rounded-lg">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">PHARMA<span className="text-blue-400">FLOW</span> Pro</h1>
        </div>
        
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> 
            System Active
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-white/10 rounded border border-white/20 font-mono text-[10px]">
            STATION: {userRole?.toUpperCase() || 'STAFF'}
          </div>
          
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <button className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Slim Sidebar - Icons Only */}
        <aside className="w-20 bg-white dark:bg-slate-900 border-r border-border-subtle hidden lg:flex flex-col items-center py-6 gap-6 shrink-0 transition-colors">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={({ isActive }) => `
                p-3 rounded-xl transition-all group relative
                ${isActive 
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-brand-primary' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
              `}
            >
              <item.icon className="w-6 h-6" />
              {location.pathname === item.path && (
                <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-primary rounded-r-full" />
              )}
            </NavLink>
          ))}

        </aside>

        {/* Dynamic Page Area */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
             <Outlet />
          </div>
        </main>
      </div>

      {/* Footer Info Bar */}
      <footer className="h-8 bg-slate-100 dark:bg-slate-950 border-t border-border-subtle px-6 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0 transition-colors">
        <div>Terminal: P01_MAIN | Ver 4.2.1</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Cloud Connected
          </div>
          <div>User: {userName}</div>
        </div>
      </footer>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed top-0 bottom-0 left-0 w-72 bg-white dark:bg-slate-900 shadow-2xl z-[70] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                <h1 className="text-xl font-bold dark:text-white">PharmaFlow</h1>
                <button onClick={() => setIsMobileMenuOpen(false)} className="dark:text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="space-y-4">
                 {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => `
                        flex items-center px-6 py-4 rounded-xl font-bold transition-all
                        ${isActive 
                          ? 'bg-brand-primary text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                          : 'text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
                      `}
                    >
                      <item.icon className="w-5 h-5 mr-4" />
                      {item.label}
                    </NavLink>
                 ))}
                 <button 
                  onClick={handleLogout}
                  className="w-full flex items-center px-6 py-4 rounded-xl font-bold text-red-500 hover:bg-red-50 mt-10 transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-4" />
                  Logout
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
