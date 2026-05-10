import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Sequelize, DataTypes, Model, Op } from "sequelize";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

let isDbConnected = false;
let dbError: string | null = null;
let isConnecting = false;

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - DB:${isDbConnected ? 'On' : 'Off'}`);
  next();
});

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "pharmaflow_secret_key_123";

// Determine dialect and configuration
const isPostgres = !!DATABASE_URL;
const LIKE_OP = isPostgres ? Op.iLike : Op.like;
let sequelize: Sequelize;

if (isPostgres) {
  console.log("Database Mode: PostgreSQL");
  sequelize = new Sequelize(DATABASE_URL!, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: DATABASE_URL!.includes("render.com") || DATABASE_URL!.includes("supabase") || DATABASE_URL!.includes("p-") ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000
    },
    retry: {
      max: 3
    }
  });
} else {
  console.log("Database Mode: SQLite (Local Fallback)");
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });
}

// Define Models
class User extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: string;
}

User.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("admin", "staff", "pharmacist"), defaultValue: "staff" }
}, { sequelize, modelName: 'user' });

class Medicine extends Model {
  public id!: number;
  public name!: string;
  public barcode!: string;
  public stockCount!: number;
  public therapeuticUses!: string;
  public isFlagged!: boolean;
}

Medicine.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  barcode: { type: DataTypes.STRING, unique: true },
  composition: { type: DataTypes.STRING },
  therapeuticUses: { type: DataTypes.TEXT },
  manufacturer: { type: DataTypes.STRING },
  batchNumber: { type: DataTypes.STRING },
  expiryDate: { type: DataTypes.DATE },
  mrp: { type: DataTypes.FLOAT },
  costPrice: { type: DataTypes.FLOAT },
  stockCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  category: { type: DataTypes.STRING },
  gstPercentage: { type: DataTypes.FLOAT, defaultValue: 12 },
  location: { type: DataTypes.STRING },
  isFlagged: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { sequelize, modelName: 'medicine' });

class Customer extends Model {
  public id!: number;
}

Customer.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, unique: true },
  email: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  creditBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
  loyaltyPoints: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { sequelize, modelName: 'customer' });

class Sale extends Model {
  public id!: number;
}

Sale.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  invoiceNumber: { type: DataTypes.STRING, unique: true },
  subTotal: { type: DataTypes.FLOAT },
  totalGst: { type: DataTypes.FLOAT },
  totalAmount: { type: DataTypes.FLOAT },
  paymentMode: { type: DataTypes.ENUM("cash", "upi", "card", "credit") },
  saleDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'sale' });

class SaleItem extends Model {}

SaleItem.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING },
  quantity: { type: DataTypes.INTEGER },
  price: { type: DataTypes.FLOAT },
  gstAmount: { type: DataTypes.FLOAT },
  batchNumber: { type: DataTypes.STRING }
}, { sequelize, modelName: 'sale_item' });

// Associations
Sale.belongsTo(Customer);
Sale.belongsTo(User, { as: 'createdBy' });
Sale.hasMany(SaleItem, { as: 'items' });
SaleItem.belongsTo(Medicine);

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  if (!isDbConnected) {
    return res.status(503).json({ error: "Database Connection Offline", details: dbError });
  }
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Seed Logic
const seedData = async () => {
    try {
        const userCount = await User.count();
        if (userCount === 0) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await User.create({ 
                name: "Admin Pharmacist", 
                email: "admin@pharmaflow.com", 
                password: hashedPassword, 
                role: "admin" 
            });
            console.log("Admin user seeded: admin@pharmaflow.com / admin123");
        }

        const medCount = await Medicine.count();
        if (medCount === 0) {
            await Medicine.bulkCreate([
                { name: "Paracetamol 500mg", composition: "Paracetamol", therapeuticUses: "Fever, Pain relief, Headache", mrp: 40, costPrice: 22, stockCount: 150, category: "Tablet", batchNumber: "B123", expiryDate: new Date("2027-12-31") },
                { name: "Amoxicillin 250mg", composition: "Amoxicillin", therapeuticUses: "Bacterial infections, Sore throat, Ear infections", mrp: 120, costPrice: 85, stockCount: 15, category: "Tablet", batchNumber: "AX45", expiryDate: new Date("2026-06-01") },
                { name: "Benadryl Cough Syrup", composition: "Diphenhydramine", therapeuticUses: "Cough, Allergic symptoms, Runny nose", mrp: 180, costPrice: 120, stockCount: 40, category: "Syrup", batchNumber: "BN88", expiryDate: new Date("2027-01-15") },
                { name: "Azithromycin 500", composition: "Azithromycin", therapeuticUses: "Pneumonia, Bronchitis, Skin infections", mrp: 95, costPrice: 60, stockCount: 8, category: "Tablet", batchNumber: "AZ00", expiryDate: new Date("2026-11-20") },
                { name: "Metformin 500mg", composition: "Metformin Hydrochloride", therapeuticUses: "Type 2 Diabetes, Blood sugar control", mrp: 55, costPrice: 35, stockCount: 200, category: "Tablet", batchNumber: "MF99", expiryDate: new Date("2027-05-10") },
                { name: "Omeprazole 20mg", composition: "Omeprazole", therapeuticUses: "Acid reflux, Heartburn, Gastric ulcers", mrp: 75, costPrice: 45, stockCount: 90, category: "Capsule", batchNumber: "OM22", expiryDate: new Date("2026-09-15") },
                { name: "Loratadine 10mg", composition: "Loratadine", therapeuticUses: "Allergies, Hay fever, Hives", mrp: 30, costPrice: 18, stockCount: 120, category: "Tablet", batchNumber: "LT11", expiryDate: new Date("2027-02-28") },
                { name: "Amlodipine 5mg", composition: "Amlodipine", therapeuticUses: "High blood pressure, Hypertension, Chest pain", mrp: 65, costPrice: 40, stockCount: 110, category: "Tablet", batchNumber: "AL55", expiryDate: new Date("2026-10-20") }
            ]);
        }

        const custCount = await Customer.count();
        if (custCount === 0) {
            await Customer.bulkCreate([
                { name: "John Doe", phone: "9876543210", email: "john@example.com", creditBalance: 0, loyaltyPoints: 120 },
                { name: "Ankush Sharma", phone: "1234567890", email: "ankush@example.com", creditBalance: 500, loyaltyPoints: 450 }
            ]);
        }
    } catch (err) {
        console.error("Seeding error:", err);
    }
};

async function connectWithRetry() {
  if (isConnecting) return;
  isConnecting = true;
  
  try {
    const mode = !!process.env.DATABASE_URL ? "PostgreSQL" : "SQLite";
    console.log(`Connecting to ${mode} Database...`);
    
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    
    console.log(`Connected to ${mode} Database successfully`);
    isDbConnected = true;
    dbError = null;
    await seedData();
  } catch (err: any) {
    console.error("Database Connection Failed:", err.message);
    isDbConnected = false;
    dbError = err.message;
  } finally {
    isConnecting = false;
  }
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: isDbConnected ? "online" : "offline", 
    isConnecting,
    dbError: dbError || "none",
    isConfigMissing: !process.env.DATABASE_URL,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/db/reconnect", async (req, res) => {
  if (isConnecting) return res.json({ message: "Connection attempt already in progress" });
  connectWithRetry();
  res.json({ message: "Reconnection attempt started" });
});

app.post("/api/auth/login", async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ error: "Database Connection Offline", details: dbError });
  }
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid Credentials", details: "No account found." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Credentials", details: "Incorrect password." });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ error: "Server Error", details: err.message });
  }
});

app.get("/api/medicines", authenticate, asyncHandler(async (req: any, res: any) => {
  const { search } = req.query;
  const whereClause: any = {};
  
  if (search) {
    whereClause[Op.or] = [
      { name: { [LIKE_OP]: `%${search}%` } },
      { barcode: { [Op.eq]: search } },
      { composition: { [LIKE_OP]: `%${search}%` } },
      { therapeuticUses: { [LIKE_OP]: `%${search}%` } }
    ];
  }

  const medicines = await Medicine.findAll({ 
    where: whereClause,
    order: [['name', 'ASC']] 
  });
  res.json(medicines);
}));

app.post("/api/medicines", authenticate, asyncHandler(async (req: any, res: any) => {
  try {
    const data = { ...req.body };
    if (data.expiryDate === "" || data.expiryDate === "Invalid date") data.expiryDate = null;
    if (data.stockCount === "") data.stockCount = 0;
    if (data.mrp === "") data.mrp = 0;
    if (data.costPrice === "") data.costPrice = 0;

    const medicine = await Medicine.create(data);
    res.json(medicine);
  } catch (err: any) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: "Duplicate Entry", 
        details: "A medicine with this barcode already exists in the inventory registry." 
      });
    }
    throw err;
  }
}));

app.patch("/api/medicines/:id", authenticate, asyncHandler(async (req: any, res: any) => {
  try {
    const data = { ...req.body };
    if (data.expiryDate === "" || data.expiryDate === "Invalid date") data.expiryDate = null;
    if (data.stockCount === "") data.stockCount = 0;
    if (data.mrp === "") data.mrp = 0;
    if (data.costPrice === "") data.costPrice = 0;

    const medicine = await Medicine.findByPk(req.params.id);
    if (medicine) {
      await medicine.update(data);
      res.json(medicine);
    } else {
      res.status(404).json({ error: "Medicine not found" });
    }
  } catch (err: any) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: "Duplicate Entry", 
        details: "Another medicine already uses this barcode. Each SKU must have a unique identifier." 
      });
    }
    throw err;
  }
}));

app.delete("/api/medicines/:id", authenticate, asyncHandler(async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`Attempting to delete medicine with ID: ${id}`);
    const medicine = await Medicine.findByPk(id);
    if (medicine) {
      await medicine.destroy();
      console.log(`Successfully deleted medicine with ID: ${id}`);
      res.json({ message: "Medicine deleted successfully", id });
    } else {
      console.log(`Medicine with ID: ${id} not found`);
      res.status(404).json({ error: "Medicine not found" });
    }
  } catch (err: any) {
    console.error(`Error deleting medicine ${req.params.id}:`, err);
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        error: "Cannot delete medicine", 
        details: "This medicine has existing sales records and cannot be removed for audit integrity. Consider marking it as out of stock instead." 
      });
    }
    throw err;
  }
}));

app.get("/api/customers", authenticate, asyncHandler(async (req: any, res: any) => {
    const customers = await Customer.findAll({ order: [['name', 'ASC']] });
    res.json(customers);
}));

app.post("/api/customers", authenticate, asyncHandler(async (req: any, res: any) => {
  try {
    const customer = await Customer.create(req.body);
    res.json(customer);
  } catch (err: any) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: "Duplicate Entry", 
        details: "A customer with this phone number already exists in the system." 
      });
    }
    throw err;
  }
}));

app.patch("/api/customers/:id", authenticate, asyncHandler(async (req: any, res: any) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (customer) {
      await customer.update(req.body);
      res.json(customer);
    } else {
      res.status(404).json({ error: "Customer not found" });
    }
  } catch (err: any) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: "Duplicate Entry", 
        details: "The phone number is already registered to another patient." 
      });
    }
    throw err;
  }
}));

app.delete("/api/customers/:id", authenticate, asyncHandler(async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`Attempting to delete customer with ID: ${id}`);
    const customer = await Customer.findByPk(id);
    if (customer) {
      await customer.destroy();
      console.log(`Successfully deleted customer with ID: ${id}`);
      res.json({ message: "Customer deleted successfully", id });
    } else {
      console.log(`Customer with ID: ${id} not found`);
      res.status(404).json({ error: "Customer not found" });
    }
  } catch (err: any) {
    console.error(`Error deleting customer ${req.params.id}:`, err);
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        error: "Cannot delete patient", 
        details: "This patient has existing purchase history and cannot be removed for audit integrity. Consider updating their details instead." 
      });
    }
    throw err;
  }
}));

app.get("/api/sales", authenticate, asyncHandler(async (req: any, res: any) => {
    const { search, temporalScope, paymentMode } = req.query;
    const whereClause: any = {};
    
    if (search) {
      whereClause[Op.or] = [
        { invoiceNumber: { [LIKE_OP]: `%${search}%` } },
        { '$Customer.name$': { [LIKE_OP]: `%${search}%` } },
        { '$Customer.phone$': { [LIKE_OP]: `%${search}%` } },
        { '$items.name$': { [LIKE_OP]: `%${search}%` } },
        { '$items.medicine.therapeuticUses$': { [LIKE_OP]: `%${search}%` } }
      ];
    }

    if (temporalScope) {
      const now = new Date();
      if (temporalScope === 'Last 24 Hours') {
        whereClause.saleDate = { [Op.gte]: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      } else if (temporalScope === 'Last 7 Days') {
        whereClause.saleDate = { [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (temporalScope === 'Current Month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        whereClause.saleDate = { [Op.gte]: startOfMonth };
      }
    }

    if (paymentMode && paymentMode !== 'all') {
      whereClause.paymentMode = paymentMode;
    }

    const sales = await Sale.findAll({ 
      where: whereClause,
      include: [
        { model: Customer }, 
        { 
          model: SaleItem, 
          as: 'items',
          include: [{ model: Medicine }] // Include medicine to search by its uses
        }
      ],
      order: [['saleDate', 'DESC']] 
    });
    res.json(sales);
}));

app.post("/api/sales", authenticate, asyncHandler(async (req: any, res: any) => {
  const t = await sequelize.transaction();
  try {
    const saleData = req.body;
    
    const sale = await Sale.create({
      ...saleData,
      customerId: saleData.customerId,
      createdById: (req as any).user.id,
      saleDate: new Date()
    }, { transaction: t });

    for (const item of saleData.items) {
      const medicine = await Medicine.findByPk(item.medicineId, { transaction: t });
      if (!medicine || medicine.stockCount < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
      await medicine.update({ stockCount: medicine.stockCount - item.quantity }, { transaction: t });
      
      await SaleItem.create({
        ...item,
        saleId: sale.id,
        medicineId: item.medicineId
      }, { transaction: t });
    }

    await t.commit();
    res.json(sale);
  } catch (err: any) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
}));

app.get("/api/stats", authenticate, asyncHandler(async (req: any, res: any) => {
        const totalSales = await Sale.findAll({
          attributes: [
            [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'total'],
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
          ],
          raw: true
        }) as any;

        const lowStock = await Medicine.count({ where: { stockCount: { [Op.lt]: 20 } } });
        const nearingExpiry = await Medicine.count({ 
            where: { 
                expiryDate: { [Op.lte]: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } 
            } 
        });
        
        // Last 7 days sales
        const last7DaysSalesLabels = [];
        const last7DaysSalesData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const daySale = await Sale.findAll({
              where: {
                saleDate: {
                  [Op.gte]: date,
                  [Op.lt]: nextDate
                }
              },
              attributes: [[Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'total']],
              raw: true
            }) as any;
            
            last7DaysSalesLabels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            last7DaysSalesData.push(daySale[0]?.total || 0);
        }

        res.json({
            revenue: parseFloat(totalSales[0]?.total || 0),
            transactionCount: parseInt(totalSales[0]?.count || 0),
            lowStockCount: lowStock,
            nearingExpiryCount: nearingExpiry,
            salesChart: {
                labels: last7DaysSalesLabels,
                data: last7DaysSalesData
            }
        });
}));

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    error: err.name || "Internal Server Error",
    message: err.message || "An unexpected error occurred",
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    connectWithRetry();
  });
}

startServer();
