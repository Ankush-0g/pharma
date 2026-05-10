import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  User, 
  ShoppingCart, 
  Search, 
  X, 
  Printer, 
  Download,
  CreditCard,
  Banknote,
  Smartphone,
  Sparkles,
  Loader2,
  RefreshCw,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { generateInvoicePDF } from '../lib/pdfGenerator';
import { Medicine, Customer, SaleItem } from '../types';
import { GoogleGenAI } from "@google/genai";
import BarcodeScanner from '../components/BarcodeScanner';

export default function POS() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' });
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [settlementSummary, setSettlementSummary] = useState({ cash: 0, upi: 0, card: 0, credit: 0, total: 0 });
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddData, setQuickAddData] = useState({ name: '', phone: '' });
  
  // AI related
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);

  const fetchRecentSales = async () => {
    try {
      const data = await api.get('/api/sales');
      if (Array.isArray(data)) {
        setRecentSales(data.slice(0, 10));
        
        // Calculate today's settlement from the last few sales (for demo/quick view)
        const summary = data.slice(0, 50).reduce((acc: any, sale: any) => {
          const mode = (sale.paymentMode || 'cash').toLowerCase();
          acc[mode] = (acc[mode] || 0) + sale.totalAmount;
          acc.total += sale.totalAmount;
          return acc;
        }, { cash: 0, upi: 0, card: 0, credit: 0, total: 0 });
        setSettlementSummary(summary);
      }
    } catch (err) {
      console.error("Failed to fetch recent sales:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const medsData = await api.get('/api/medicines');
        const custsData = await api.get('/api/customers');
        setMedicines(Array.isArray(medsData) ? medsData : []);
        setCustomers(Array.isArray(custsData) ? custsData : []);
        fetchRecentSales();
      } catch (err) {
        console.error("Fetch failed:", err);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length > 1) {
      const lowerTerm = term.toLowerCase();
      const results = medicines.filter(m => 
        m.name.toLowerCase().includes(lowerTerm) || 
        m.composition?.toLowerCase().includes(lowerTerm) ||
        m.therapeuticUses?.toLowerCase().includes(lowerTerm)
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleBarcodeScan = (code: string) => {
    const med = medicines.find(m => m.barcode === code);
    if (med) {
      addToCart(med);
    } else {
      alert(`No medicine found with barcode: ${code}`);
    }
  };

  const addToCart = (medicine: Medicine) => {
    const existing = cart.find(item => item.medicineId === medicine.id);
    if (existing) {
      setCart(cart.map(item => 
        item.medicineId === medicine.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      const gstAmount = (medicine.mrp * (medicine.gstPercentage / 100));
      setCart([...cart, {
        medicineId: medicine.id,
        name: medicine.name,
        quantity: 1,
        price: medicine.mrp,
        gstAmount,
        batchNumber: medicine.batchNumber
      }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.medicineId !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart(cart.map(item => 
      item.medicineId === id ? { ...item, quantity: qty } : item
    ));
  };

  const calculateSubtotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const calculateTotalGst = () => cart.reduce((acc, item) => acc + (item.gstAmount * item.quantity), 0);
  const calculateTotal = () => calculateSubtotal() + calculateTotalGst();

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      let customerId = selectedCustomer?.id;
      let finalCustomer = selectedCustomer;

      if (isNewCustomer) {
        if (!newCustomerData.name || !newCustomerData.phone) {
          throw new Error('Please enter both Name and Mobile Number for the new patient.');
        }
        // Create new customer first
        const createdCustomer = await api.post('/api/customers', {
          name: newCustomerData.name,
          phone: newCustomerData.phone,
          loyaltyPoints: 0
        });
        customerId = createdCustomer.id;
        finalCustomer = createdCustomer;
        
        // Refresh customer list for future use
        const custsData = await api.get('/api/customers');
        setCustomers(Array.isArray(custsData) ? custsData : []);
      }

      const saleData = {
        invoiceNumber: `INV-${Date.now()}`,
        customerId: customerId,
        items: cart,
        subTotal: calculateSubtotal(),
        totalGst: calculateTotalGst(),
        totalAmount: calculateTotal(),
        paymentMode,
        customer: finalCustomer // Pass customer object for immediate PDF use
      };
      await api.post('/api/sales', saleData);
      alert('Sale completed successfully!');
      generateInvoicePDF(saleData);
      setCart([]);
      setSelectedCustomer(null);
      setIsNewCustomer(false);
      setNewCustomerData({ name: '', phone: '' });
      fetchRecentSales();
    } catch (err: any) {
      alert(err.message || 'Checkout failed. Please check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddData.name || !quickAddData.phone) {
      alert('Please enter both Name and Mobile Number.');
      return;
    }
    setIsProcessing(true);
    try {
      const createdCustomer = await api.post('/api/customers', {
        name: quickAddData.name,
        phone: quickAddData.phone,
        loyaltyPoints: 0
      });
      
      // Update customers list
      const custsData = await api.get('/api/customers');
      setCustomers(Array.isArray(custsData) ? custsData : []);
      
      // Auto select
      setSelectedCustomer(createdCustomer);
      setShowQuickAddModal(false);
      setQuickAddData({ name: '', phone: '' });
    } catch (err: any) {
      alert('Failed to add customer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAiSuggestions = async (medicineName: string) => {
    setAiLoading(true);
    setShowAiModal(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a professional pharmacist assistant. 
        Provide 5 high-quality generic or alternative medicines for "${medicineName}". 
        For each alternative, provide the name and a very brief reason why it's a good alternative (e.g., same composition, cheaper, fewer side effects).
        Format the response as a JSON array of objects with "name" and "reason" keys.`,
        config: {
          responseMimeType: "application/json"
        }
      });
      const text = response.text || "[]";
      try {
        const parsed = JSON.parse(text);
        setAiSuggestions(Array.isArray(parsed) ? parsed : []);
      } catch {
        setAiSuggestions([]);
      }
    } catch (err) {
      console.error(err);
      setAiSuggestions(["Unable to fetch suggestions at this time."]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-8 h-[calc(100vh-140px)]">
      {/* Left: Billing Items */}
      <div className="col-span-12 lg:col-span-9 flex flex-col gap-6 overflow-hidden">
        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-border-subtle p-3 flex items-center gap-4 shrink-0 transition-colors">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-12 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:shadow-[0_0_20px_rgba(37,99,235,0.15)] outline-none transition-all font-medium text-text-main placeholder:text-slate-400" 
              placeholder="Scan Barcode or Search Medicine (Alt+S)..." 
            />
            <button 
              onClick={() => setShowScanner(true)}
              className="absolute right-3 top-2 text-slate-400 hover:text-brand-primary transition-colors"
            >
              <Scan className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-border-subtle overflow-hidden z-50 max-h-96 overflow-y-auto"
                >
                  {searchResults.map((med) => (
                    <div 
                      key={med.id}
                      onClick={() => addToCart(med)}
                      className="w-full p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-b border-border-subtle last:border-0 text-left cursor-pointer"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-text-main text-sm whitespace-pre-wrap">{med.name}</p>
                        {med.therapeuticUses && (
                          <p className="text-[10px] text-slate-500 font-medium italic mt-0.5 line-clamp-1">
                            Uses: {med.therapeuticUses}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">{med.composition}</span>
                          <span className="text-[9px] font-black text-brand-primary/70 uppercase bg-slate-50 dark:bg-slate-800 px-1 rounded flex items-center gap-1">
                            Batch: {med.batchNumber || 'N/A'}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-1 rounded ${med.stockCount < 10 ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                            Stock: {med.stockCount}
                          </span>
                        </div>
                      </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="font-bold text-brand-primary">₹{med.mrp}</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              getAiSuggestions(med.name);
                            }}
                            className="bg-purple-50 text-purple-600 p-1.5 rounded-lg hover:bg-purple-100 transition-colors"
                            title="Get AI Suggestions"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="px-6 py-2.5 bg-brand-primary text-white rounded-lg font-semibold shadow-lg shadow-blue-100 text-sm active:scale-[0.98] transition-all">Add Item</button>
        </div>

        {/* Cart Table */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-border-subtle overflow-hidden flex flex-col transition-colors">
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950/50 border-b border-border-subtle z-10">
                <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="px-6 py-3">Item Name</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">MRP</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-20 text-center text-slate-300 dark:text-slate-700">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="font-mono text-[10px] uppercase tracking-widest font-bold">Cart Empty</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.medicineId} className="hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="font-medium text-text-main">{item.name}</span>
                           <button 
                            onClick={() => getAiSuggestions(item.name)}
                            className="p-1 text-purple-400 hover:text-purple-600 transition-colors"
                           >
                             <Sparkles className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{item.batchNumber || '-'}</td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-xs">08/26</td>
                      <td className="px-4 py-4">
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => updateQuantity(item.medicineId, parseInt(e.target.value) || 1)}
                          className="w-12 text-center bg-slate-100 dark:bg-slate-800 rounded-md border-none p-1 font-bold text-text-main outline-none focus:ring-1 focus:ring-brand-primary h-8"
                        />
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-600 dark:text-slate-400">₹{item.price.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-bold text-text-main">₹{(item.price * item.quantity).toFixed(2)}</td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => removeFromCart(item.medicineId)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="border-t border-border-subtle bg-slate-50 dark:bg-slate-950/50 p-3 flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
            <div className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-border-subtle rounded shrink-0">F4: Disc %</div>
            <div className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-border-subtle rounded shrink-0">F7: Change Qty</div>
            <div className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-border-subtle rounded shrink-0">F9: Payment</div>
            <div className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-border-subtle rounded shrink-0">Esc: Cancel</div>
          </div>
        </div>
      </div>

      {/* Right: Summary Sidebar */}
      <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
        {/* Customer Info */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border-subtle p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
              {isNewCustomer ? "New Patient Register" : "Customer Detail"}
            </h3>
            <button 
              onClick={() => {
                setIsNewCustomer(!isNewCustomer);
                setSelectedCustomer(null);
              }}
              className="text-brand-primary text-[10px] font-bold uppercase px-2 py-1 bg-blue-50 dark:bg-blue-500/10 rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            >
              {isNewCustomer ? "Select Existing" : "+ Quick Add"}
            </button>
          </div>
          
          {isNewCustomer ? (
            <div className="space-y-3">
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Full Name"
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg py-2 pl-8 pr-3 text-xs font-bold text-text-main outline-none focus:ring-1 focus:ring-brand-primary placeholder:text-slate-500"
                />
              </div>
              <div className="relative">
                <Smartphone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Mobile Number"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg py-2 pl-8 pr-3 text-xs font-bold text-text-main outline-none focus:ring-1 focus:ring-brand-primary placeholder:text-slate-500"
                />
              </div>
            </div>
          ) : selectedCustomer ? (
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-text-main leading-none">{selectedCustomer.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedCustomer.phone}</p>
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-4 py-2 px-3 bg-green-50 dark:bg-green-500/10 rounded-lg text-green-700 dark:text-green-500 text-[10px] font-bold flex items-center justify-between border border-green-100 dark:border-green-500/20">
                <span>Loyalty: {selectedCustomer.loyaltyPoints} pts</span>
                <span className="font-black">₹{(selectedCustomer.loyaltyPoints / 10).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg py-2 pl-8 pr-8 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none focus:ring-1 focus:ring-brand-primary appearance-none"
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const cust = customers.find(c => c.id.toString() === e.target.value);
                    if (cust) setSelectedCustomer(cust);
                  }}
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
              {!selectedCustomer && (
                <button 
                  onClick={() => setShowQuickAddModal(true)}
                  className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-3 rounded-lg flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                  title="Quick Add Customer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pricing Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border-subtle p-6 shadow-sm flex-1 flex flex-col transition-colors">
          <div className="space-y-4 mb-auto">
            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-tight">
              <span>Sub Total</span>
              <span className="font-mono">₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-tight">
              <span>Tax (GST)</span>
              <span className="font-mono">₹{calculateTotalGst().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-tight">
              <span>Discount</span>
              <span className="font-mono text-green-600">-₹0.00</span>
            </div>
            <div className="my-6 h-px bg-slate-100 dark:bg-slate-800"></div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Payable Amount</span>
              <span className="text-4xl font-black text-text-main tracking-tighter leading-none font-mono">₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'cash', icon: Banknote, label: 'CASH', activeClass: 'bg-emerald-600 border-emerald-600 shadow-emerald-100 dark:shadow-none' },
                { id: 'upi', icon: Smartphone, label: 'UPI / QR', activeClass: 'bg-indigo-600 border-indigo-600 shadow-indigo-100 dark:shadow-none' },
                { id: 'card', icon: CreditCard, label: 'CARD', activeClass: 'bg-blue-600 border-blue-600 shadow-blue-100 dark:shadow-none' },
                { id: 'credit', icon: User, label: 'CREDIT', activeClass: 'bg-amber-600 border-amber-600 shadow-amber-100 dark:shadow-none' }
              ].map((mode) => (
                <button 
                  key={mode.id}
                  onClick={() => setPaymentMode(mode.id as any)}
                  className={`py-3 rounded-xl flex flex-col items-center gap-1.5 transition-all border-2 font-black ${
                    paymentMode === mode.id 
                    ? `${mode.activeClass} text-white shadow-xl scale-105 z-10` 
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <mode.icon className={`w-5 h-5 ${paymentMode === mode.id ? 'text-white' : 'text-slate-300 dark:text-slate-700'}`} />
                  <span className="text-[10px] tracking-widest">{mode.label}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0}
              className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-lg shadow-2xl shadow-indigo-200/50 dark:shadow-none uppercase tracking-widest hover:bg-black dark:hover:bg-slate-100 active:enabled:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Printer className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Settle & Print Billing</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Settlement Summary */}
        <div className="bg-slate-900 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/10" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Session Settlement</h3>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-colors">
                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Cash</p>
                <p className="text-sm font-black text-white">₹{settlementSummary.cash?.toLocaleString() ?? '0'}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-colors">
                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Digital</p>
                <p className="text-sm font-black text-white">₹{((settlementSummary.upi || 0) + (settlementSummary.card || 0)).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-end justify-between border-t border-white/10 pt-4">
               <div>
                 <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Total Settle</p>
                 <p className="text-xl font-black text-emerald-400">₹{settlementSummary.total?.toLocaleString() ?? '0'}</p>
               </div>
               {settlementSummary.credit > 0 && (
                 <div className="text-right">
                   <p className="text-[9px] font-bold text-orange-500/80 uppercase mb-1">On Credit</p>
                   <p className="text-sm font-black text-orange-400">₹{settlementSummary.credit?.toLocaleString() ?? '0'}</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border-subtle p-5 shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Recent Sales</h3>
            <button 
              onClick={fetchRecentSales}
              className="text-brand-primary text-[10px] font-bold uppercase flex items-center gap-1"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Refresh
            </button>
          </div>
          
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center py-2">No recent records</p>
            ) : recentSales.map(sale => (
              <div key={sale.id} className="flex items-center justify-between group">
                <div className="overflow-hidden">
                  <p className="text-[11px] font-bold text-text-main truncate">{sale.invoiceNumber}</p>
                  <p className="text-[9px] text-slate-400">₹{sale.totalAmount.toFixed(2)} • {sale.paymentMode}</p>
                </div>
                <button 
                  onClick={() => generateInvoicePDF(sale)}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-brand-primary hover:text-white rounded-md transition-all shadow-sm"
                  title="Re-print Receipt"
                >
                  <Printer className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[10px] text-slate-400 leading-tight uppercase font-bold">
            Compliance Check: Verified<br />
            GSTIN: 27AABCM8812F1Z5
          </p>
        </div>
      </aside>

      {/* AI Suggestions Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-border-subtle"
            >
              <div className="p-8 bg-purple-600 text-white relative">
                 <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                 <Sparkles className="w-10 h-10 mb-4" />
                 <h2 className="text-3xl font-black">Smart Alternatives</h2>
                 <p className="text-purple-100 font-medium">Pharmacist-grade generic drug suggestions</p>
              </div>
              <div className="p-8">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                    <p className="font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Analyzing Drug Composition...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aiSuggestions.map((suggestion: any, i) => (
                      <div 
                        key={i} 
                        className="p-4 bg-purple-50 dark:bg-purple-900/50 rounded-2xl group hover:bg-purple-100 dark:hover:bg-purple-900 transition-all cursor-pointer border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                        onClick={() => {
                          setSearchTerm(suggestion.name);
                          handleSearch(suggestion.name);
                          setShowAiModal(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-900 dark:text-purple-100">{suggestion.name}</span>
                          <Plus className="w-5 h-5 text-purple-400 group-hover:text-purple-600" />
                        </div>
                        {suggestion.reason && (
                          <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1 font-medium">{suggestion.reason}</p>
                        )}
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500 font-bold uppercase text-center mt-6">
                      * Always consult a qualified physician before switching medications.
                    </p>
                  </div>
                )}
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-black dark:hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  Close Insights
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner 
            onScan={handleBarcodeScan} 
            onClose={() => setShowScanner(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-border-subtle"
            >
              <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Quick Add Patient</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Instant Registration</p>
                </div>
                <button 
                  onClick={() => setShowQuickAddModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Patient Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                      autoFocus
                      type="text" 
                      value={quickAddData.name}
                      onChange={(e) => setQuickAddData({...quickAddData, name: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 font-bold text-text-main outline-none focus:ring-2 focus:ring-brand-primary/20 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Mobile Number</label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      value={quickAddData.phone}
                      onChange={(e) => setQuickAddData({...quickAddData, phone: e.target.value})}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 font-bold text-text-main outline-none focus:ring-2 focus:ring-brand-primary/20 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleQuickAdd}
                  disabled={isProcessing}
                  className="w-full py-4 bg-brand-primary text-white rounded-xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Create and Select Patient</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
