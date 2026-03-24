import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { DB_CONFIG } from "./db_config.ts";
import { 
  Project, Vendor, Material, Expense, Payment, Income, Invoice, 
  Employee, LaborLog, LaborPayment, User, StockHistoryEntry 
} from "./types";

interface AppSettings {
  syncId: string;
  theme: 'light' | 'dark';
  allowDecimalStock: number;
  tradeCategories: string;
  stockingUnits: string;
  siteStatuses: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Database {
  run(sql: string, params?: unknown[]): Promise<unknown>;
  all(sql: string, params?: unknown[]): Promise<unknown[]>;
  get(sql: string, params?: unknown[]): Promise<unknown>;
  exec(sql: string): Promise<void>;
}

class SqliteDatabase implements Database {
  private db: sqlite3.Database;
  constructor() {
    this.db = new sqlite3.Database(DB_CONFIG.database);
  }
  run(sql: string, params: unknown[] = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
  all(sql: string, params: unknown[] = []) {
    return new Promise<unknown[]>((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  get(sql: string, params: unknown[] = []) {
    return new Promise<unknown>((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  exec(sql: string) {
    return new Promise<void>((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

class MysqlDatabase implements Database {
  private pool: mysql.Pool;
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  async run(sql: string, params: unknown[] = []) {
    const [result] = await this.pool.execute(sql, params);
    return result;
  }
  async all(sql: string, params: unknown[] = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows as unknown[];
  }
  async get(sql: string, params: unknown[] = []) {
    const [rows] = await this.pool.execute(sql, params);
    return (rows as unknown[])[0];
  }
  async exec(sql: string) {
    await this.pool.query(sql);
  }
}

const isMysql = !!process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1';
const db: Database = isMysql ? new MysqlDatabase() : new SqliteDatabase();
const all = db.all.bind(db);
const get = db.get.bind(db);
const run = db.run.bind(db);

class Lock {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire() {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}

const saveLock = new Lock();

// Initialize Relational DB
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");

async function initDb() {
  try {
    await db.exec(schema);
    try {
      await run("ALTER TABLE laborPayments ADD COLUMN projectId VARCHAR(255)");
      console.log("Added projectId column to laborPayments");
    } catch {
      // Column might already exist
    }
    console.log("Relational database initialized");
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
}

async function startServer() {
  try {
    await initDb();
  } catch {
    console.error("Failed to initialize database, but starting server anyway...");
  }
  
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/check-init", async (req, res) => {
    try {
      const userCount = await get("SELECT COUNT(*) as count FROM users") as { count: number };
      res.json({ initialized: userCount.count > 0 });
    } catch (err) {
      console.error("Check init error:", err);
      res.status(500).json({ error: "Failed to check initialization" });
    }
  });

  app.post("/api/signup", async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = 'user-' + Date.now();
      await run(
        "INSERT INTO users (id, name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?)",
        [id, name, email, hashedPassword, role || 'user', JSON.stringify({})]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ error: "Signup failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      const user = await get("SELECT * FROM users WHERE email = ?", [email]) as User | undefined;
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password || '');
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;
      res.json({ user: userWithoutPassword });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // API Routes
  app.get("/api.php", async (req, res) => {
    const action = req.query.action;
    const syncId = req.query.syncId as string;

    if (action === 'test_connection') {
      return res.json({ success: true, message: "Node Relational Bridge Reachable" });
    }

    if (action === 'initialize_db') {
      return res.json({ success: true, message: "Relational Database Initialized" });
    }

    if (action === 'sync') {
      if (!syncId) return res.status(400).json({ error: "No syncId" });
      
      try {
        // Reconstruct AppState from tables
        const projects = await all("SELECT * FROM projects WHERE syncId = ?", [syncId]) as Project[];
        const vendors = await all("SELECT * FROM vendors WHERE syncId = ?", [syncId]) as Vendor[];
        const materials = await all("SELECT * FROM materials WHERE syncId = ?", [syncId]) as Material[];
        const expenses = await all("SELECT * FROM expenses WHERE syncId = ?", [syncId]) as Expense[];
        const payments = await all("SELECT * FROM payments WHERE syncId = ?", [syncId]) as Payment[];
        const incomes = await all("SELECT * FROM incomes WHERE syncId = ?", [syncId]) as Income[];
        const invoices = await all("SELECT * FROM invoices WHERE syncId = ?", [syncId]) as Invoice[];
        const employees = await all("SELECT * FROM employees WHERE syncId = ?", [syncId]) as Employee[];
        const laborLogs = await all("SELECT * FROM laborLogs WHERE syncId = ?", [syncId]) as LaborLog[];
        const laborPayments = await all("SELECT * FROM laborPayments WHERE syncId = ?", [syncId]) as LaborPayment[];
        const users = await all("SELECT * FROM users WHERE syncId = ?", [syncId]) as User[];
        const settings = await get("SELECT * FROM app_settings WHERE syncId = ?", [syncId]) as AppSettings | undefined;

        // Fetch history for each material
        for (const mat of materials) {
          mat.history = await all("SELECT * FROM stockHistory WHERE materialId = ? AND syncId = ?", [mat.id, syncId]) as StockHistoryEntry[];
        }

        if (!settings) {
          return res.json({ status: "new" });
        }

        const state = {
          syncId,
          theme: settings.theme,
          allowDecimalStock: !!settings.allowDecimalStock,
          tradeCategories: JSON.parse(settings.tradeCategories || '[]'),
          stockingUnits: JSON.parse(settings.stockingUnits || '[]'),
          siteStatuses: JSON.parse(settings.siteStatuses || '[]'),
          projects: projects.map(p => ({ ...p, isGodown: !!p.isGodown, isDeleted: !!p.isDeleted })),
          vendors: vendors.map(v => ({ ...v, isActive: !!v.isActive })),
          materials: materials.map(m => ({
            ...m,
            history: (m.history || []).map((h) => ({
              ...h,
              projectId: h.projectId,
              vendorId: h.vendorId,
              unitPrice: h.unitPrice,
              parentPurchaseId: h.parentPurchaseId
            }))
          })),
          expenses: expenses.map(e => ({ ...e })),
          payments: payments.map(p => ({ ...p, isAllocation: !!p.isAllocation })),
          incomes: incomes.map(i => ({ ...i })),
          invoices: invoices.map(i => ({ ...i })),
          employees: employees.map(e => ({ ...e, isActive: !!e.isActive })),
          laborLogs: laborLogs.map(l => ({ ...l })),
          laborPayments: laborPayments.map(lp => ({ ...lp })),
          users: users.map(u => ({
            ...u,
            permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions || '{}') : (u.permissions || {})
          }))
        };

        return res.json(state);
      } catch (err) {
        console.error("Sync error:", err);
        return res.status(500).json({ error: "Sync failed" });
      }
    }

    res.status(404).json({ error: "Action not found" });
  });

  app.post("/api.php", async (req, res) => {
    const action = req.query.action;
    if (action === 'save_state') {
      const data = req.body;
      if (!data || !data.syncId) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const { syncId } = data;

      try {
        await saveLock.acquire();
        // Use a transaction for atomic updates
        await run("BEGIN TRANSACTION");

        // Update Settings
        await run(`
          INSERT INTO app_settings (syncId, theme, allowDecimalStock, tradeCategories, stockingUnits, siteStatuses)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(syncId) DO UPDATE SET
            theme = excluded.theme,
            allowDecimalStock = excluded.allowDecimalStock,
            tradeCategories = excluded.tradeCategories,
            stockingUnits = excluded.stockingUnits,
            siteStatuses = excluded.siteStatuses
        `, [
          syncId,
          data.theme,
          data.allowDecimalStock ? 1 : 0,
          JSON.stringify(data.tradeCategories || []),
          JSON.stringify(data.stockingUnits || []),
          JSON.stringify(data.siteStatuses || [])
        ]);

        // Helper to clear and refill tables
        const refillTable = async <T>(table: string, items: T[], insertSql: string, paramsFn: (item: T) => (string | number | null)[]) => {
          await run(`DELETE FROM ${table} WHERE syncId = ?`, [syncId]);
          for (const item of items) {
            await run(insertSql, [syncId, ...paramsFn(item)]);
          }
        };

        // Projects
        await refillTable("projects", data.projects || [], `
          INSERT INTO projects (syncId, id, name, location, client, startDate, endDate, budget, status, description, contactNumber, isGodown, isDeleted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, p => [p.id, p.name, p.location, p.client, p.startDate, p.endDate, p.budget, p.status, p.description, p.contactNumber, p.isGodown ? 1 : 0, p.isDeleted ? 1 : 0]);

        // Vendors
        await refillTable("vendors", data.vendors || [], `
          INSERT INTO vendors (syncId, id, name, phone, address, category, email, balance, isActive)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, v => [v.id, v.name, v.phone, v.address, v.category, v.email, v.balance, v.isActive ? 1 : 0]);

        // Materials & History
        await run("DELETE FROM stockHistory WHERE syncId = ?", [syncId]);
        await run("DELETE FROM materials WHERE syncId = ?", [syncId]);
        for (const m of (data.materials || [])) {
          await run(`
            INSERT INTO materials (syncId, id, name, unit, costPerUnit, totalPurchased, totalUsed, lowStockThreshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [syncId, m.id, m.name, m.unit, m.costPerUnit, m.totalPurchased, m.totalUsed, m.lowStockThreshold]);
          
          for (const h of (m.history || [])) {
            await run(`
              INSERT INTO stockHistory (syncId, id, materialId, date, type, quantity, projectId, vendorId, note, unitPrice, parentPurchaseId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [syncId, h.id, m.id, h.date, h.type, h.quantity, h.projectId, h.vendorId, h.note, h.unitPrice, h.parentPurchaseId]);
          }
        }

        // Expenses
        await refillTable("expenses", data.expenses || [], `
          INSERT INTO expenses (syncId, id, date, projectId, vendorId, materialId, materialQuantity, unitPrice, amount, paymentMethod, notes, invoiceUrl, category, inventoryAction, parentPurchaseId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, e => [e.id, e.date, e.projectId, e.vendorId, e.materialId, e.materialQuantity, e.unitPrice, e.amount, e.paymentMethod, e.notes, e.invoiceUrl, e.category, e.inventoryAction, e.parentPurchaseId]);

        // Payments
        await refillTable("payments", data.payments || [], `
          INSERT INTO payments (syncId, id, date, vendorId, projectId, amount, method, reference, materialBatchId, masterPaymentId, isAllocation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, p => [p.id, p.date, p.vendorId, p.projectId, p.amount, p.method, p.reference, p.materialBatchId, p.masterPaymentId, p.isAllocation ? 1 : 0]);

        // Incomes
        await refillTable("incomes", data.incomes || [], `
          INSERT INTO incomes (syncId, id, projectId, date, amount, description, method, invoiceId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, i => [i.id, i.projectId, i.date, i.amount, i.description, i.method, i.invoiceId]);

        // Invoices
        await refillTable("invoices", data.invoices || [], `
          INSERT INTO invoices (syncId, id, projectId, date, amount, description, status, dueDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, i => [i.id, i.projectId, i.date, i.amount, i.description, i.status, i.dueDate]);

        // Employees
        await refillTable("employees", data.employees || [], `
          INSERT INTO employees (syncId, id, name, role, phone, dailyWage, status, joiningDate, currentSiteId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, e => [e.id, e.name, e.role, e.phone, e.dailyWage, e.status, e.joiningDate, e.currentSiteId]);

        // Labor Logs
        await refillTable("laborLogs", data.laborLogs || [], `
          INSERT INTO laborLogs (syncId, id, date, employeeId, projectId, hoursWorked, wageAmount, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, l => [l.id, l.date, l.employeeId, l.projectId, l.hoursWorked, l.wageAmount, l.status, l.notes]);

        // Labor Payments
        await refillTable("laborPayments", data.laborPayments || [], `
          INSERT INTO laborPayments (syncId, id, employeeId, projectId, date, amount, method, reference, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, lp => [lp.id, lp.employeeId, lp.projectId, lp.date, lp.amount, lp.method, lp.reference, lp.notes]);

        // Users
        await refillTable("users", data.users || [], `
          INSERT INTO users (syncId, id, name, email, role, avatar, permissions)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, u => [u.id, u.name, u.email, u.role, u.avatar, JSON.stringify(u.permissions || {})]);

        await run("COMMIT");
        saveLock.release();
        return res.json({ success: true });
      } catch (err) {
        try {
            await run("ROLLBACK");
        } catch {
            // Ignore rollback error
        }
        saveLock.release();
        console.error("Save error:", err);
        return res.status(500).json({ error: "Save failed" });
      }
    }
    res.status(404).json({ error: "Action not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
