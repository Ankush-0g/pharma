export interface User {
  id: string | number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'pharmacist';
}

export interface Medicine {
  id: string | number;
  name: string;
  barcode?: string;
  composition?: string;
  therapeuticUses?: string;
  manufacturer?: string;
  batchNumber?: string;
  expiryDate?: string;
  mrp: number;
  costPrice: number;
  stockCount: number;
  category: string;
  gstPercentage: number;
  location?: string;
  isFlagged?: boolean;
}

export interface Customer {
  id: string | number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditBalance: number;
  loyaltyPoints: number;
}

export interface SaleItem {
  medicineId: string | number;
  name: string;
  quantity: number;
  price: number;
  gstAmount: number;
  batchNumber?: string;
  Medicine?: Medicine;
}

export interface Sale {
  id: string | number;
  invoiceNumber: string;
  customerId?: string | number | Customer;
  items: SaleItem[];
  subTotal: number;
  totalGst: number;
  totalAmount: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'credit';
  saleDate: string;
}

export interface DashboardStats {
  revenue: number;
  transactionCount: number;
  lowStockCount: number;
  nearingExpiryCount: number;
  salesChart: {
    labels: string[];
    data: number[];
  };
}
