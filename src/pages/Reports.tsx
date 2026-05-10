import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { generateInvoicePDF } from '../lib/pdfGenerator';
import { Sale } from '../types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [temporalScope, setTemporalScope] = useState('Last 7 Days');
  const [paymentMode, setPaymentMode] = useState('all');
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '/') {
        // Only focus if not already typing in an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchSales = async (query = '', scope = temporalScope, pMode = paymentMode) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      if (scope) params.append('temporalScope', scope);
      if (pMode && pMode !== 'all') params.append('paymentMode', pMode);
      
      const data = await api.get(`/api/sales?${params.toString()}`);
      setSales(Array.isArray(data) ? data : []);
      // Auto-expand if exactly one result is found during a search
      if (query && Array.isArray(data) && data.length === 1) {
        setExpandedSaleId(data[0].id);
      } else {
        setExpandedSaleId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportFullHistoryPDF = async () => {
    try {
      const doc = new jsPDF() as any;
      const params = new URLSearchParams();
      if (temporalScope) params.append('temporalScope', temporalScope);
      if (paymentMode && paymentMode !== 'all') params.append('paymentMode', paymentMode);
      
      const allSales = await api.get(`/api/sales?${params.toString()}`);
      const salesArray = Array.isArray(allSales) ? allSales : [];
      
      // Page styling and header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("PHARMAFLOW MASTER LEDGER", 20, 22);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 145, 22);
      doc.text(`${temporalScope} - ${paymentMode === 'all' ? 'All Channels' : paymentMode.toUpperCase()} Audit Report`, 20, 30);
      
      const tableData = salesArray.map((sale: any) => [
        sale.invoiceNumber,
        new Date(sale.saleDate).toLocaleDateString(),
        (sale.Customer || sale.customerId as any)?.name || "Walk-in",
        sale.paymentMode.toUpperCase(),
        sale.items.length,
        `Rs. ${sale.totalAmount.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['INVOICE', 'DATE', 'CUSTOMER', 'METHOD', 'UNITS', 'TOTAL AMOUNT']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          5: { halign: 'right', fontStyle: 'bold' },
          4: { halign: 'center' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const totalRevenue = allSales.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
      const cashTotal = allSales.filter((s: any) => s.paymentMode === 'cash').reduce((sum: number, s: any) => sum + s.totalAmount, 0);
      const digitalTotal = totalRevenue - cashTotal;

      // Summary Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(120, finalY, 75, 35, 3, 3, 'FD');
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("FINANCIAL SUMMARY", 125, finalY + 8);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Cash Intake:`, 125, finalY + 16);
      doc.text(`Rs. ${cashTotal.toFixed(2)}`, 190, finalY + 16, { align: 'right' });
      
      doc.text(`Total Digital Intake:`, 125, finalY + 22);
      doc.text(`Rs. ${digitalTotal.toFixed(2)}`, 190, finalY + 22, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text(`GROSS SETTLEMENT:`, 125, finalY + 30);
      doc.text(`Rs. ${totalRevenue.toFixed(2)}`, 190, finalY + 30, { align: 'right' });

      doc.save(`PharmaFlow_Datastore_Export_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("Master Export Failed:", err);
      alert("Failed to export full datastore. Please check connection.");
    }
  };

  const highlightText = (text: string, term: string) => {
    if (!term) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-slate-900 rounded-px px-0.5">{part}</mark>
          ) : part
        )}
      </span>
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales(searchTerm, temporalScope, paymentMode);
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, temporalScope, paymentMode]);

  const getPaymentIcon = (mode: string) => {
    switch (mode) {
      case 'cash': return <Banknote className="w-4 h-4 text-green-500" />;
      case 'upi': return <Smartphone className="w-4 h-4 text-purple-500" />;
      case 'card': return <CreditCard className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };


  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Financial Ledger</h1>
          <p className="text-slate-500 font-medium text-sm">Historical audit of all pharmaceutical transactions and settlement records</p>
        </div>
        <button 
          onClick={exportFullHistoryPDF}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 dark:shadow-none flex items-center hover:bg-black dark:hover:bg-slate-100 active:scale-[0.98] transition-all text-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Datastore
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border-subtle shadow-sm h-fit transition-colors">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Audit Parameters</h3>
            <div className="space-y-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Temporal Scope</label>
                  <select 
                    value={temporalScope}
                    onChange={(e) => setTemporalScope(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg py-2.5 px-4 font-bold text-text-main text-sm focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  >
                     <option>Last 24 Hours</option>
                     <option>Last 7 Days</option>
                     <option>Current Month</option>
                     <option>Custom</option>
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Channel Isolation</label>
                  <div className="flex flex-col gap-1.5">
                     {[
                        { label: 'Primary Channel (All)', value: 'all' },
                        { label: 'Cash Handover', value: 'cash' },
                        { label: 'Digital (UPI)', value: 'upi' },
                        { label: 'Card Swipe', value: 'card' }
                     ].map(item => (
                        <button 
                          key={item.value} 
                          onClick={() => setPaymentMode(item.value)}
                          className={`text-left px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${paymentMode === item.value ? 'bg-brand-primary text-white shadow-lg shadow-blue-100 dark:shadow-none' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700'}`}
                        >
                           {item.label}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-border-subtle shadow-sm overflow-hidden flex flex-col transition-colors">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
               <div className="flex items-baseline gap-3">
                  <h2 className="text-lg font-black text-text-main tracking-tight">Settlement History</h2>
                  {!loading && sales.length > 0 && (
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {sales.length} Records Found
                    </span>
                  )}
               </div>
               <div className={`relative transition-all duration-300 ${isSearchFocused ? 'w-80' : 'w-64'}`}>
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors w-3.5 h-3.5 ${isSearchFocused ? 'text-brand-primary' : 'text-slate-400'}`} />
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Search Reference, Patient or Medicine..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="w-full bg-white dark:bg-slate-800 border border-border-subtle rounded-xl py-2 pl-9 pr-10 text-xs font-bold text-text-main outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:shadow-[0_0_20px_rgba(37,99,235,0.15)] transition-all shadow-sm" 
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!searchTerm && !isSearchFocused && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 pointer-events-none">
                      <span className="text-[10px] font-bold border border-slate-300 rounded px-1">/</span>
                    </div>
                  )}
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/30 border-b border-border-subtle font-sans">
                     <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Transaction ID</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Counterparty</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Settlement</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Value (₹)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                      {loading ? (
                        <tr><td colSpan={5} className="p-20 text-center font-bold text-slate-400 text-xs italic opacity-50 uppercase tracking-widest animate-pulse">Syncing Cryptographic Ledger...</td></tr>
                      ) : (!Array.isArray(sales) || sales.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <Search className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-lg font-black text-text-main tracking-tight">
                                  {!Array.isArray(sales) ? "Error Loading Transactions" : "No Transactions Found"}
                                </p>
                                <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
                                  {!Array.isArray(sales) 
                                    ? "There was an unexpected response from the server. Please try refreshing."
                                    : (searchTerm 
                                      ? `Could not find any results matching "${searchTerm}". Try expanding your search parameters.`
                                      : "There are no transactions recorded for the selected audit period.")}
                                </p>
                              </div>
                              {searchTerm && Array.isArray(sales) && (
                                <button 
                                  onClick={() => setSearchTerm('')}
                                  className="text-brand-primary text-xs font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                >
                                  Clear Search Query
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : sales.map((sale) => (
                        <React.Fragment key={sale.id}>
                          <tr 
                            onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group ${expandedSaleId === sale.id ? 'bg-slate-50 dark:bg-slate-800 border-l-4 border-l-brand-primary' : ''}`}
                          >
                           <td className="px-6 py-5">
                              <p className="font-black text-text-main text-sm">{highlightText(sale.invoiceNumber, searchTerm)}</p>
                              <p className="text-[10px] font-black uppercase text-brand-primary tracking-tighter mt-0.5">{sale.items.length} Units Dispatched</p>
                           </td>
                           <td className="px-6 py-5">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(sale.saleDate).toLocaleDateString()}</p>
                              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </td>
                           <td className="px-6 py-5">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center font-black text-xs text-slate-400">
                                   {((sale.customerId as any)?.name || 'G')[0]}
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{highlightText((sale.customerId as any)?.name || 'Guest Trans.', searchTerm)}</span>
                             </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-2.5 py-1 w-fit">
                                 {getPaymentIcon(sale.paymentMode)}
                                 <span className="text-[9px] font-black uppercase text-slate-500 tracking-tight">{highlightText(sale.paymentMode, searchTerm)}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-4">
                                 <p className="text-base font-black text-text-main">₹{sale.totalAmount?.toLocaleString() ?? '0'}</p>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     generateInvoicePDF(sale);
                                   }}
                                   className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-brand-primary hover:border-brand-primary rounded-xl transition-all shadow-sm group-hover:shadow-md"
                                 >
                                   <Printer className="w-4 h-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                        <AnimatePresence>
                          {expandedSaleId === sale.id && (
                            <tr>
                              <td colSpan={5} className="bg-slate-50/50 dark:bg-slate-950/30 px-6 py-0 border-l-4 border-l-brand-primary">
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="py-8 border-t border-border-subtle">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
                                      <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Counterparty Intelligence</h4>
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border-subtle shadow-sm transition-colors">
                                          <p className="text-sm font-black text-text-main">{highlightText((sale.Customer || sale.customerId as any)?.name || 'Walk-in Customer', searchTerm)}</p>
                                          <p className="text-xs font-bold text-slate-500 mt-1">{highlightText((sale.Customer || sale.customerId as any)?.phone || 'No Contact Record', searchTerm)}</p>
                                          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Status Check</p>
                                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[9px] font-black uppercase rounded tracking-tighter">Verified Order</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Financial Metadata</h4>
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border-subtle shadow-sm grid grid-cols-2 gap-8 transition-colors">
                                          <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Settlement</p>
                                            <div className="flex items-center gap-2">
                                              {getPaymentIcon(sale.paymentMode)}
                                              <p className="text-xs font-black text-text-main tracking-tight uppercase">{sale.paymentMode}</p>
                                            </div>
                                          </div>
                                          <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Reference</p>
                                            <p className="text-xs font-black text-text-main tracking-tight">#{sale.invoiceNumber}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Consignment Breakdown</h4>
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border-subtle overflow-hidden shadow-sm transition-colors">
                                      <table className="w-full text-left">
                                        <thead>
                                          <tr className="bg-slate-50/50 dark:bg-slate-950/30 border-b border-border-subtle">
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Batch</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qty</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Unit Value</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle">
                                          {sale.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                              <td className="px-6 py-4">
                                                <p className="text-sm font-black text-text-main">{highlightText(item.name, searchTerm)}</p>
                                                {item.Medicine?.therapeuticUses && (
                                                  <p className="text-[9px] text-slate-400 font-bold italic mt-0.5">
                                                    Uses: {highlightText(item.Medicine.therapeuticUses, searchTerm)}
                                                  </p>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-medium mt-1">Internal SKU: PH-MAT-{item.id || item.medicineId}</p>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{item.batchNumber || '---'}</span>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-black text-text-main">{item.quantity}</span>
                                              </td>
                                              <td className="px-6 py-4 text-right text-sm font-bold text-slate-500">₹{item.price.toFixed(2)}</td>
                                              <td className="px-6 py-4 text-right text-sm font-black text-brand-primary">₹{(item.price * item.quantity).toFixed(2)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50/50 dark:bg-slate-950/30 border-t border-border-subtle">
                                          <tr>
                                            <td colSpan={4} className="px-6 py-4 text-right">
                                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Settlement</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                              <p className="text-lg font-black text-text-main">₹{sale.totalAmount?.toLocaleString() ?? '0'}</p>
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}
