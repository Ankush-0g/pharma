# Pharmacy Management System (PharmaFlow)

A modern, full-stack pharmacy management application built with React, Express. PharmaStream provides a comprehensive suite of tools for inventory control, sales management, and financial reporting.

## 🚀 Features

### 📊 Dashboard
- Real-time performance metrics (Revenue, Critical Stock, Orders).
- Sales trends visualization using Recharts.
- AI-driven suggestions for inventory optimization and marketing.(Gemini)

### 📦 Inventory Management
- **Bulk Operations**: Select multiple items to delete or mark as low stock.
- **Optical SKU Scanner**: Integrated barcode scanning for quick stock entry.
- **Expiry Risk Alerts**: Visual indicators for medicines nearing expiry.
- **Smart Catalog**: Detailed tracking of composition, therapeutic uses, and batch metadata.

### 💳 Point of Sale (POS)
- Rapid item search and addition.
- Dynamic tax (GST) calculation.
- Instant invoice generation (PDF) using `jspdf`.
- Multi-mode settlement (Cash, UPI, Card).

### 👥 Customer Relationship Management
- Comprehensive customer database.
- Transaction history tracking.
- Credit/Balance monitoring.

### 📑 Financial Ledger & Reports
- Historical audit of all transactions.
- Filterable settlement history.
- Detailed consignment breakdowns.
- Exportable datastore records.

### 🌓 Theme & UI
- High-fidelity UI with smooth animations using `motion`.
- Full Dark Mode support.
- Responsive design for tablets and desktops.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Recharts, Lucide Icons.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL / SQLite 
- **AI Integration**: Google Gemini AI (@google/genai , through api key).
- **Security**: JWT Authentication, Bcrypt password hashing.

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your environment variables:
   ```env
   DATABASE_URL=your_postgres_db_url (optional, defaults to SQLite)
   JWT_SECRET=your_secret_key
   GEMINI_API_KEY=your_google_ai_key
   ```

### Running the App
- **Development Mode**:
  ```bash
  npm run dev
  ```
- **Production Build**:
  ```bash
  npm run build
  npm start
  ```

---

## ☁️ Deployment (Render)

To deploy this project on Render:

View your app : https://pharma-bxr4.onrender.com

1. **Build Settings**:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

2. **Environment Variables**:
   - Add `NODE_ENV=production`.
   - Add `GEMINI_API_KEY`, `JWT_SECRET`, etc.
   - If using a managed database, add `DATABASE_URL`.


---

## 🔒 Security
- Password hashing using `bcryptjs`.
- Stateless authentication via `jsonwebtoken`.
- Strict input validation on the server layer.

