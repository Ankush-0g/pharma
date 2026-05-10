import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Plus, Search, Calendar, CreditCard, ChevronRight, Edit2, MoreVertical, X, Filter, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { Customer } from '../types';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers...');
      const data = await api.get('/api/customers');
      console.log('Customers received:', data);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.patch(`/api/customers/${editingCustomer.id}`, formData);
      } else {
        await api.post('/api/customers', formData);
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
      fetchCustomers();
    } catch (err: any) {
      const message = err?.error || err?.message || 'Error saving customer';
      const details = err?.details || '';
      alert(`${message}${details ? `\n\n${details}` : ''}`);
    }
  };

  const handleDelete = async (id: string | number, name: string) => {
    if (confirm(`Are you sure you want to delete patient record for ${name}?`)) {
      // Store current state for rollback
      const previousCustomers = [...customers];
      
      try {
        console.log(`Starting deletion for customer ID: ${id}`);
        
        // Optimistic update
        setCustomers(prev => prev.filter(c => c.id !== id));
        
        const result = await api.delete(`/api/customers/${id}`);
        console.log('Deletion result:', result);
        
        // Final refresh to be sure
        await fetchCustomers();
        console.log('List refreshed after deletion');
      } catch (err: any) {
        console.error('Delete error:', err);
        // Rollback on error
        setCustomers(previousCustomers);
        
        const message = err?.error || err?.message || 'Failed to delete customer';
        const details = err?.details || '';
        alert(`${message}${details ? `\n\n${details}` : ''}`);
      }
    }
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setShowAddModal(true);
  };

  const closePortal = () => {
    setShowAddModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Client Directory</h1>
          <p className="text-slate-500 font-medium text-sm">Manage CRM records, loyalty points, and prescription history</p>
        </div>
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '', address: '' });
            setShowAddModal(true);
          }}
          className="bg-brand-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 dark:shadow-none flex items-center hover:bg-blue-700 active:scale-[0.98] transition-all text-sm self-start"
        >
          <Plus className="w-4 h-4 mr-2" />
          Register Patient
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border-subtle shadow-sm overflow-hidden p-1 transition-colors">
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search by name or phone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg py-2.5 pl-12 pr-6 focus:ring-1 focus:ring-brand-primary transition-all font-bold text-text-main text-sm outline-none placeholder:text-slate-500"
              />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {filtered.map((customer) => (
            <motion.div 
              key={customer.id}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 border border-border-subtle rounded-xl p-5 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-center font-black text-brand-primary text-xl">
                  {customer.name.charAt(0)}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal(customer)}
                    className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors"
                    title="Edit Patient"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(customer.id, customer.name)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove Patient"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="font-bold text-text-main text-lg leading-tight">{customer.name}</h4>
                <p className="text-sm font-medium text-slate-500">{customer.phone}</p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-xs text-slate-400 font-medium">
                  <Mail className="w-3.5 h-3.5 mr-2" />
                  {customer.email || 'No email registered'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-subtle uppercase tracking-widest text-[9px] font-bold">
                <div>
                  <p className="text-slate-400 mb-1 leading-none">Credit Bal.</p>
                  <p className={`text-sm font-black ${customer.creditBalance > 0 ? 'text-red-500' : 'text-text-main'}`}>₹{customer.creditBalance}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1 leading-none">Loyalty Pts.</p>
                  <p className="text-sm font-black text-green-600 dark:text-green-500">{customer.loyaltyPoints}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePortal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 relative z-10 shadow-2xl border border-border-subtle transition-colors"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-text-main tracking-tight">
                    {editingCustomer ? 'Update Patient Profile' : 'New Patient Profile'}
                  </h2>
                  <p className="text-slate-500 font-medium text-xs">CRM registration & loyalty setup</p>
                </div>
                <button onClick={closePortal} className="text-slate-400 hover:text-red-500">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input 
                    type="text" placeholder="e.g. Rahul Sharma" required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-3 px-5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm placeholder:text-slate-500"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mobile Number</label>
                  <input 
                    type="text" placeholder="+91 91234-XXXXX" required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-3 px-5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm placeholder:text-slate-500"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                  <input 
                    type="email" placeholder="patient@example.com" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-3 px-5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm placeholder:text-slate-500"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mailing Address</label>
                  <textarea 
                    placeholder="Residential address details..." rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-border-subtle rounded-xl py-3 px-5 font-bold text-text-main focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm resize-none placeholder:text-slate-500"
                    value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="flex justify-between items-center pt-6 mt-6 border-t border-border-subtle">
                  {editingCustomer && (
                    <button 
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        handleDelete(editingCustomer.id, editingCustomer.name);
                      }}
                      className="text-red-500 font-bold text-xs hover:underline uppercase tracking-widest"
                    >
                      Delete Account
                    </button>
                  )}
                  <div className="flex-1" />
                  <button type="submit" className="bg-brand-primary text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 active:scale-[0.98] transition-all text-sm uppercase tracking-widest">
                    {editingCustomer ? 'Apply Updates' : 'Confirm Registration'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
