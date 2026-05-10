import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Calendar, 
  Clock,
  ChevronRight, 
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Edit2,
  Scan,
  Info,
  X,
  Trash2,
  Flag,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { Medicine } from '../types';
import BarcodeScanner from '../components/BarcodeScanner';

export default function Inventory() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [viewingUsage, setViewingUsage] = useState<Medicine | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const toggleSelection = (id: string | number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredMeds.length && filteredMeds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMeds.map(m => m.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedIds.length} SKU records? This action cannot be reversed.`)) {
      try {
        await Promise.all(selectedIds.map(id => api.delete(`/api/medicines/${id}`)));
        setSelectedIds([]);
        fetchMedicines();
      } catch (err: any) {
        alert('Failed to delete some records. They might have active sales history.');
        fetchMedicines();
      }
    }
  };

  const handleBulkMarkLowStock = async () => {
    const toMark = filteredMeds.filter(m => selectedIds.includes(m.id) && m.stockCount < 20);
    if (toMark.length === 0) {
      alert("No selected items meet the 'Low Stock' criteria (Stock < 20).");
      return;
    }
    
    try {
      await Promise.all(toMark.map(m => api.patch(`/api/medicines/${m.id}`, { isFlagged: true })));
      alert(`Success: ${toMark.length} items flagged for replenishment.`);
      setSelectedIds([]);
      fetchMedicines();
    } catch (err: any) {
      alert('Error marking items for replenishment.');
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    composition: '',
    therapeuticUses: '',
    manufacturer: '',
    batchNumber: '',
    expiryDate: '',
    mrp: '',
    costPrice: '',
    stockCount: '',
    category: 'Tablet',
    gstPercentage: '12',
    location: ''
  });

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/medicines');
      setMedicines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        expiryDate: formData.expiryDate || null,
        mrp: formData.mrp ? parseFloat(formData.mrp) : 0,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : 0,
        stockCount: formData.stockCount ? parseInt(formData.stockCount) : 0,
        gstPercentage: formData.gstPercentage ? parseFloat(formData.gstPercentage) : 12
      };
      if (editingMedicine) {
        await api.patch(`/api/medicines/${editingMedicine.id}`, dataToSave);
      } else {
        await api.post('/api/medicines', dataToSave);
      }
      setShowAddModal(false);
      setEditingMedicine(null);
      setFormData({
        name: '', barcode: '', composition: '', therapeuticUses: '', manufacturer: '', batchNumber: '', expiryDate: '',
        mrp: '', costPrice: '', stockCount: '', category: 'Tablet', gstPercentage: '12', location: ''
      });
      fetchMedicines();
    } catch (err: any) {
      const message = err?.error || err?.message || 'Error saving medicine';
      const details = err?.details || '';
      alert(`${message}${details ? `\n\n${details}` : ''}`);
    }
  };

  const handleBarcodeScan = (code: string) => {
    setFormData(prev => ({ ...prev, barcode: code }));
    // If it's a new medicine, we could optionally search if it exists
    const existing = medicines.find(m => m.barcode === code);
    if (existing && !editingMedicine) {
      if (confirm(`SKU with barcode ${code} already exists (${existing.name}). Load it for editing?`)) {
        setEditingMedicine(existing);
        setFormData({
          name: existing.name, 
          barcode: existing.barcode || code,
          composition: existing.composition || '', 
          therapeuticUses: existing.therapeuticUses || '', 
          manufacturer: existing.manufacturer || '',
          batchNumber: existing.batchNumber || '', 
          expiryDate: existing.expiryDate?.split('T')[0] || '',
          mrp: existing.mrp.toString(), 
          costPrice: existing.costPrice.toString(), 
          stockCount: existing.stockCount.toString(),
          category: existing.category, 
          gstPercentage: existing.gstPercentage.toString(), 
          location: existing.location || ''
        });
      }
    }
  };

  const filteredMeds = medicines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.composition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.therapeuticUses?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLowStock = (med: Medicine) => med.stockCount < 20;

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

  const isExpiringSoon = (expiry?: string) => {
    if (!expiry) return false;
    const date = new Date(expiry);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return date < threeMonthsFromNow;
  };

  const handleDelete = async (id: string | number, name: string) => {
    if (confirm(`Are you sure you want to PERMANENTLY DELETE "${name}" from the SKU registry? This action cannot be undone.`)) {
      // Optimistic update
      const previousMedicines = [...medicines];
      setMedicines(prev => prev.filter(m => m.id !== id));
      
      try {
        await api.delete(`/api/medicines/${id}`);
        // Optional: refresh to keep everything in sync
        fetchMedicines();
      } catch (err: any) {
        // Rollback
        setMedicines(previousMedicines);
        
        const message = err?.error || err?.message || 'Failed to delete medicine';
        const details = err?.details || '';
        alert(`${message}${details ? `\n\n${details}` : ''}`);
      }
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Catalog & Stock</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Manage SKU distribution, pricing, and stock levels</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Filter inventory..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-border-subtle shadow-sm rounded-xl py-2.5 pl-10 pr-4 w-full md:w-80 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:shadow-[0_0_20px_rgba(37,99,235,0.15)] outline-none transition-all font-medium text-text-main text-sm"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-brand-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center hover:bg-blue-700 active:scale-[0.98] transition-all text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add SKU
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-slate-900/20">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-2 rounded-lg">
                  <CheckSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Bulk Operations</p>
                  <p className="text-sm font-bold">{selectedIds.length} Medicine{selectedIds.length > 1 ? 's' : ''} Selected</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBulkMarkLowStock}
                  className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-blue-500/20"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Mark Low Stock
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
                <div className="w-px h-8 bg-white/10 mx-1" />
                <button 
                  onClick={() => setSelectedIds([])}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border-subtle shadow-sm overflow-hidden flex flex-col transition-colors">
        <div className="grid grid-cols-6 p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-border-subtle text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="col-span-2 pl-2 flex items-center gap-4">
            <button 
              onClick={selectAll}
              className={`p-1 rounded transition-colors ${selectedIds.length === filteredMeds.length && filteredMeds.length > 0 ? 'text-brand-primary' : 'text-slate-300 hover:text-slate-400'}`}
            >
              {selectedIds.length === filteredMeds.length && filteredMeds.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
            Medicine Details
          </div>
          <div>Batch & Expiry</div>
          <div>Inventory</div>
          <div>Pricing (MRP)</div>
          <div className="text-right pr-2">Manage</div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border-subtle custom-scrollbar">
          {loading ? (
             <div className="h-full flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
             </div>
          ) : filteredMeds.length === 0 ? (
            <div className="p-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No matching SKUs found</div>
          ) : (
            filteredMeds.map((med) => (
              <div key={med.id} className={`grid grid-cols-6 p-5 items-center group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.includes(med.id) ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}>
                <div className="col-span-2 flex items-center">
                  <button 
                    onClick={() => toggleSelection(med.id)}
                    className={`p-1 mr-3 rounded transition-colors ${selectedIds.includes(med.id) ? 'text-brand-primary' : 'text-slate-200 group-hover:text-slate-300'}`}
                  >
                    {selectedIds.includes(med.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${
                    med.category === 'Tablet' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600' : 
                    med.category === 'Syrup' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600'
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <h4 className="font-bold text-text-main text-sm leading-tight">{highlightText(med.name, searchTerm)}</h4>
                      {isExpiringSoon(med.expiryDate) && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-600 text-[8px] font-black uppercase tracking-widest rounded border border-red-100 dark:border-red-500/20 flex items-center">
                          <Clock className="w-2 h-2 mr-0.5" />
                          Expiry Risk
                        </span>
                      )}
                      {med.isFlagged && (
                        <span className="ml-2 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 text-[8px] font-black uppercase tracking-widest rounded border border-orange-100 dark:border-orange-500/20 flex items-center">
                          <AlertTriangle className="w-2 h-2 mr-0.5" />
                          Low Stock Ref.
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{med.composition}</p>
                    {med.therapeuticUses && (
                      <p className="text-[9px] font-bold text-slate-400 italic mt-0.5 line-clamp-1 max-w-[150px]">Uses: {med.therapeuticUses}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="flex flex-col gap-1 items-start">
                    <div className="flex items-center text-xs font-mono text-slate-700 dark:text-slate-300">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2" title="Batch">{med.batchNumber}</span>
                    </div>
                    {med.barcode && (
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-brand-primary rounded border border-blue-100/50">
                        <Scan className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-black tracking-tight">{med.barcode}</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-[10px] font-black uppercase flex items-center mt-1.5 ${isExpiringSoon(med.expiryDate) ? 'text-red-500' : 'text-slate-400'}`}>
                    <Calendar className="w-3 h-3 mr-1" />
                    {med.expiryDate ? new Date(med.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className={`text-lg font-black ${isLowStock(med) ? 'text-red-500' : 'text-text-main'}`}>{med.stockCount}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Units</p>
                </div>

                <div>
                   <p className="text-lg font-black text-brand-primary">₹{med.mrp}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Price</p>
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                   onClick={() => setViewingUsage(med)}
                   className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                   title="View Medicinal Use"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button 
                   onClick={() => {
                       setEditingMedicine(med);
                       setFormData({
                           name: med.name, 
                           barcode: med.barcode || '',
                           composition: med.composition || '', 
                           therapeuticUses: med.therapeuticUses || '', 
                           manufacturer: med.manufacturer || '',
                           batchNumber: med.batchNumber || '', 
                           expiryDate: med.expiryDate?.split('T')[0] || '',
                           mrp: med.mrp.toString(), 
                           costPrice: med.costPrice.toString(), 
                           stockCount: med.stockCount.toString(),
                           category: med.category, 
                           gstPercentage: med.gstPercentage.toString(), 
                           location: med.location || ''
                       });
                       setShowAddModal(true);
                   }}
                   className="p-2 text-slate-400 hover:text-brand-primary hover:bg-white rounded-lg border border-transparent hover:border-slate-200 hover:shadow-sm transition-all"
                   title="Edit SKU"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-[95%] max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] border border-border-subtle"
            >
              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 h-full">
                <div className="p-5 bg-slate-50 dark:bg-slate-950/50 border-b border-border-subtle flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-text-main tracking-tight leading-none">
                        {editingMedicine ? 'Edit SKU Record' : 'Register New SKU'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] tracking-tight uppercase tracking-widest mt-1.5">Regulatory Pharmaceutical Intelligence Intake</p>
                  </div>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-8 flex-1 min-h-0 custom-scrollbar overscroll-contain">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    <div className="space-y-6">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Clinical Information</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" placeholder="Barcode ID (Optional)" 
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                            value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="p-2.5 bg-brand-primary text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center shrink-0 shadow-sm"
                          >
                            <Scan className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 ml-1">Medicine Name</p>
                          <input 
                            type="text" placeholder="e.g. Paracetamol 500mg" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                            value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 ml-1">Salt Composition</p>
                          <input 
                            type="text" placeholder="Active ingredients..." 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                            value={formData.composition} onChange={(e) => setFormData({...formData, composition: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 ml-1">Indications & Uses</p>
                          <textarea 
                            placeholder="e.g. Pain, Fever, Infection" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm min-h-[70px] resize-none"
                            value={formData.therapeuticUses} onChange={(e) => setFormData({...formData, therapeuticUses: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                             <p className="text-[10px] font-bold text-slate-400 ml-1">Category</p>
                             <select 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm cursor-pointer"
                              value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                             >
                               <option>Tablet</option>
                               <option>Syrup</option>
                               <option>Injection</option>
                               <option>Ointment</option>
                               <option>Drops</option>
                             </select>
                           </div>
                           <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 ml-1">Storage Shelf</p>
                            <input 
                              type="text" placeholder="e.g. A-12" 
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                              value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
                            />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Batch & Compliance</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 ml-1">Batch No.</p>
                            <input 
                              type="text" placeholder="e.g. B-2024" 
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                              value={formData.batchNumber} onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 ml-1">Expiry Date</p>
                            <input 
                              type="date" 
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                              value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 ml-1">Manufacturer</p>
                          <input 
                            type="text" placeholder="e.g. Cipla Ltd." 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                            value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 ml-1">Stock Count (Units)</p>
                          <input 
                            type="number" placeholder="0" 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                            value={formData.stockCount} onChange={(e) => setFormData({...formData, stockCount: e.target.value})}
                          />
                        </div>
                     </div>

                     <div className="space-y-4 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Financial Data (₹)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 ml-1">Cost Price</p>
                              <input 
                                type="number" step="0.01" placeholder="0.00" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                                value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                              />
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 ml-1">Selling MRP</p>
                              <input 
                                type="number" step="0.01" placeholder="0.00" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                                value={formData.mrp} onChange={(e) => setFormData({...formData, mrp: e.target.value})}
                              />
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 ml-1">GST %</p>
                              <input 
                                type="number" placeholder="12" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-2 px-3.5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm"
                                value={formData.gstPercentage} onChange={(e) => setFormData({...formData, gstPercentage: e.target.value})}
                              />
                           </div>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-slate-950/50 shrink-0 border-t border-border-subtle flex gap-4 items-center">
                  {editingMedicine && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAddModal(false);
                        handleDelete(editingMedicine.id, editingMedicine.name);
                      }} 
                      className="px-5 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all border border-red-200 dark:border-red-500/20 text-sm flex items-center gap-2"
                    >
                      Delete SKU
                    </button>
                  )}
                  <div className="flex-1" />
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all border border-border-subtle text-sm">
                    Discard
                  </button>
                  <button type="submit" className="px-8 bg-brand-primary text-white font-bold rounded-xl py-3 hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-100 dark:shadow-none transition-all text-sm">
                    {editingMedicine ? 'Apply Updates' : 'Commit SKU to Registry'}
                  </button>
                </div>
              </form>
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

      {/* Usage Info Modal */}
      <AnimatePresence>
        {viewingUsage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingUsage(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-border-subtle"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-text-main leading-tight">{viewingUsage.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Medicinal Usage Guide</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-border-subtle">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Indications</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                      {viewingUsage.therapeuticUses || 'No usage information registered for this SKU.'}
                    </p>
                  </div>
                  
                  {viewingUsage.composition && (
                    <div className="px-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Composition</p>
                      <p className="text-xs font-medium text-slate-500 italic">{viewingUsage.composition}</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setViewingUsage(null)}
                  className="w-full mt-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all text-sm"
                >
                  Close Reference
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
