import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  Search,
  Plus,
  MoreVertical,
  Calendar,
  X,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { api } from '../lib/api';
import { DashboardStats, Medicine } from '../types';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border-subtle shadow-sm transition-colors"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {trend && (
        <span className="flex items-center text-green-600 text-[10px] font-bold bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-500/20">
          <ArrowUpRight className="w-3 h-3 mr-1" />
          {trend}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</h3>
      <p className="text-2xl font-black text-text-main">{value}</p>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '/') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isExpiringSoon = (expiry?: string) => {
    if (!expiry) return false;
    const date = new Date(expiry);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return date < threeMonthsFromNow;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, medsData] = await Promise.all([
          api.get('/api/stats'),
          api.get('/api/medicines')
        ]);
        
        setStats(statsData);
        
        // Process alerts from medicines
        if (Array.isArray(medsData)) {
          const lowStock = medsData
            .filter((m: Medicine) => m.stockCount < 20)
            .map((m: Medicine) => ({ ...m, alertType: 'Low Stock', priority: 2, color: 'text-orange-500' }));
          
          const nearingExpiry = medsData
            .filter((m: Medicine) => isExpiringSoon(m.expiryDate))
            .map((m: Medicine) => ({ ...m, alertType: 'Near Expiry', priority: 1, color: 'text-red-500' }));
          
          // Merge and sort: Nearing Expiry (Priority 1) first, then Low Stock (Priority 2)
          const allAlerts = [...nearingExpiry, ...lowStock]
            .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) // Remove duplicates
            .sort((a, b) => a.priority - b.priority)
            .slice(0, 8);
            
          setAlerts(allAlerts);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setIsSearching(true);
        try {
          const results = await api.get(`/api/medicines?search=${encodeURIComponent(searchTerm)}`);
          setSearchResults(Array.isArray(results) ? results : []);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => (
          <span key={i} className={part.toLowerCase() === highlight.toLowerCase() ? "bg-yellow-100 text-brand-primary" : ""}>
            {part}
          </span>
        ))}
      </span>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="font-mono text-slate-400 animate-pulse text-xs tracking-tighter">INITIALIZING SYSTEM STATS...</p></div>;

  const chartData = stats?.salesChart?.labels?.map((label, index) => ({
    name: label,
    sales: stats?.salesChart?.data?.[index] || 0
  })) || [];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Performance Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Real-time pharmacy performance metrics and stock intelligence</p>
        </div>
        <div className="flex gap-3">
          <div className={`relative hidden sm:block transition-all duration-300 ${isSearchFocused ? 'w-80' : 'w-64'}`}>
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors w-4 h-4 ${isSearchFocused ? 'text-brand-primary' : 'text-slate-400'}`} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search intelligence..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl py-2.5 pl-10 pr-10 shadow-sm dark:shadow-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:shadow-[0_0_20px_rgba(37,99,235,0.15)] outline-none transition-all text-sm font-medium text-text-main"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {!searchTerm && !isSearchFocused && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 pointer-events-none">
                <span className="text-[10px] font-bold border border-slate-300 rounded px-1">/</span>
              </div>
            )}
            
            {/* Search Results Dropdown */}
            <AnimatePresence>
              {(isSearchFocused && (searchTerm || isSearching)) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 5 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-border-subtle shadow-xl z-50 overflow-hidden max-h-[400px] flex flex-col"
                >
                  <div className="p-3 border-b border-border-subtle bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Intelligence Results</span>
                    {isSearching && <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />}
                  </div>
                  <div className="overflow-y-auto custom-scrollbar p-2">
                    {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Search className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-bold text-text-main">No signals found</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Try different composition or drug name</p>
                      </div>
                    )}
                    
                    {searchResults.map((med) => (
                      <div 
                        key={med.id}
                        onClick={() => navigate('/inventory')}
                        className="group flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-border-subtle"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-text-main truncate">
                              {highlightText(med.name, searchTerm)}
                            </h4>
                            <span className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded ml-2">
                              {med.category}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <p className="text-[10px] font-bold text-slate-500 line-clamp-1 italic">
                              {med.composition ? highlightText(`Comp: ${med.composition}`, searchTerm) : "No composition listed"}
                            </p>
                            {med.barcode && (
                              <p className="text-[9px] font-black text-brand-primary flex items-center gap-1">
                                <Scan className="w-2.5 h-2.5" />
                                {highlightText(med.barcode, searchTerm)}
                              </p>
                            )}
                          </div>
                          {med.therapeuticUses && (
                            <div className="mt-2 flex items-start gap-1.5">
                              <AlertCircle className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                                <span className="text-slate-400 font-bold uppercase mr-1">Uses:</span>
                                {highlightText(med.therapeuticUses, searchTerm)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {searchTerm.length < 2 && (
                      <div className="p-6 text-center text-slate-400">
                        <p className="text-[10px] font-black uppercase tracking-widest">Type at least 2 characters...</p>
                      </div>
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                      <button 
                         onClick={() => navigate('/inventory')}
                         className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline"
                      >
                        View Full Molecule Registry
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => navigate('/pos')}
            className="bg-brand-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center hover:bg-blue-700 active:scale-[0.98] transition-all text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Fast Billing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Revenue (30d)" 
          value={`₹${stats?.revenue?.toLocaleString() ?? '0'}`} 
          icon={TrendingUp} 
          trend="+12.5%" 
          color="bg-brand-primary"
        />
        <StatCard 
          title="Daily Trans." 
          value={stats?.transactionCount || '0'} 
          icon={Package} 
          trend="+24" 
          color="bg-slate-800"
        />
        <StatCard 
          title="Low Stock" 
          value={stats?.lowStockCount || '0'} 
          icon={AlertCircle} 
          color="bg-orange-500"
        />
        <StatCard 
          title="Expiry Risks" 
          value={stats?.nearingExpiryCount || '0'} 
          icon={Clock} 
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-border-subtle shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-lg font-bold text-text-main tracking-tight">Revenue Trajectory</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">Daily financial snapshots (7d)</p>
            </div>
            <select className="bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-brand-primary outline-none uppercase tracking-widest">
              <option>Last 7 Days</option>
              <option>Monthly View</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: '#fff', fontWeight: 600, fontSize: '12px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563EB" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border-subtle shadow-sm flex flex-col overflow-hidden transition-colors">
          <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-b border-border-subtle flex justify-between items-center text-text-main">
            <h3 className="text-sm font-bold uppercase tracking-widest">Alert Ledger</h3>
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />
          </div>
          <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Package className="w-10 h-10 text-slate-200 dark:text-slate-800 mb-2" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Active Alerts</p>
              </div>
            ) : alerts.map((item, i) => (
              <div 
                key={item.id} 
                onClick={() => navigate('/inventory')}
                className="flex items-center justify-between group cursor-pointer p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mr-3 ${item.alertType === 'Near Expiry' ? 'bg-red-50 dark:bg-red-500/10' : 'bg-orange-50 dark:bg-orange-500/10'}`}>
                    {item.alertType === 'Near Expiry' ? (
                      <Clock className="w-4 h-4 text-red-500" />
                    ) : (
                      <Package className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main group-hover:text-brand-primary transition-colors">{item.name}</p>
                    <p className={`text-[9px] font-black uppercase tracking-tighter ${item.color}`}>{item.alertType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-text-main leading-none">{item.stockCount}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">IN STOCK</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-border-subtle">
            <button 
              onClick={() => navigate('/inventory')}
              className="w-full bg-white dark:bg-slate-900 border border-border-subtle text-slate-600 dark:text-slate-400 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              Audit Full Inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
