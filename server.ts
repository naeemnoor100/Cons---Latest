import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { DB_CONFIG } from "./db_config.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(DB_CONFIG.database);

// Initialize Relational DB
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema, (err) => {
  if (err) console.error("Database initialization error:", err);
  else console.log("Relational database initialized");
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Helper to run queries as promises
  const run = (sql: string, params: unknown[] = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

  const all = (sql: string, params: unknown[] = []) => new Promise<unknown[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  const get = (sql: string, params: unknown[] = []) => new Promise<unknown>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
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
        const projects = await all("SELECT * FROM projects");
        const vendors = await all("SELECT * FROM vendors");
        const materials = await all("SELECT * FROM materials");
        const expenses = await all("SELECT * FROM expenses");
        const payments = await all("SELECT * FROM payments");
        const incomes = await all("SELECT * FROM incomes");
        const invoices = await all("SELECT * FROM invoices");
        const employees = await all("SELECT * FROM employees");
        const laborLogs = await all("SELECT * FROM labor_logs");
        const laborPayments = await all("SELECT * FROM labor_payments");
        const settings = await get("SELECT * FROM settings WHERE id = ?", [syncId]);

        // Fetch history for each material
        for (const mat of materials) {
          mat.history = await all("SELECT * FROM stock_history WHERE material_id = ?", [mat.id]);
        }

        if (!settings) {
          return res.json({ status: "new" });
        }

        const state = {
          syncId,
          theme: settings.theme,
          allowDecimalStock: !!settings.allow_decimal_stock,
          tradeCategories: JSON.parse(settings.trade_categories || '[]'),
          stockingUnits: JSON.parse(settings.stocking_units || '[]'),
          siteStatuses: JSON.parse(settings.site_statuses || '[]'),
          projects: projects.map(p => ({ ...p, isGodown: !!p.is_godown })),
          vendors: vendors.map(v => ({ ...v, isActive: !!v.is_active })),
          materials: materials.map(m => ({
            ...m,
            costPerUnit: m.cost_per_unit,
            totalPurchased: m.total_purchased,
            totalUsed: m.total_used,
            lowStockThreshold: m.low_stock_threshold,
            history: m.history.map((h: Record<string, unknown>) => ({
              ...h,
              projectId: h.project_id,
              vendorId: h.vendor_id,
              unitPrice: h.unit_price,
              parentPurchaseId: h.parent_purchase_id
            }))
          })),
          expenses: expenses.map(e => ({
            ...e,
            projectId: e.project_id,
            vendorId: e.vendor_id,
            materialId: e.material_id,
            materialQuantity: e.material_quantity,
            unitPrice: e.unit_price,
            inventoryAction: e.inventory_action,
            parentPurchaseId: e.parent_purchase_id
          })),
          payments: payments.map(p => ({
            ...p,
            vendorId: p.vendor_id,
            materialBatchId: p.material_batch_id,
            masterPaymentId: p.master_payment_id,
            isAllocation: !!p.is_allocation
          })),
          incomes: incomes.map(i => ({ ...i, projectId: i.project_id })),
          invoices: invoices.map(i => ({ ...i, projectId: i.project_id })),
          employees: employees.map(e => ({ ...e, dailyWage: e.daily_wage, isActive: !!e.is_active })),
          laborLogs: laborLogs.map(l => ({
            ...l,
            employeeId: l.employee_id,
            projectId: l.project_id,
            wageAmount: l.wage_amount
          })),
          laborPayments: laborPayments.map(lp => ({
            ...lp,
            employeeId: lp.employee_id
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
        // Use a transaction for atomic updates
        await run("BEGIN TRANSACTION");

        // Update Settings
        await run(`
          INSERT INTO settings (id, theme, allow_decimal_stock, trade_categories, stocking_units, site_statuses)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            theme = excluded.theme,
            allow_decimal_stock = excluded.allow_decimal_stock,
            trade_categories = excluded.trade_categories,
            stocking_units = excluded.stocking_units,
            site_statuses = excluded.site_statuses
        `, [
          syncId,
          data.theme,
          data.allowDecimalStock ? 1 : 0,
          JSON.stringify(data.tradeCategories || []),
          JSON.stringify(data.stockingUnits || []),
          JSON.stringify(data.siteStatuses || [])
        ]);

        // Helper to clear and refill tables
        const refillTable = async (table: string, items: unknown[], insertSql: string, paramsFn: (item: Record<string, unknown>) => unknown[]) => {
          await run(`DELETE FROM ${table}`);
          for (const item of items) {
            await run(insertSql, paramsFn(item));
          }
        };

        // Projects
        await refillTable("projects", data.projects || [], `
          INSERT INTO projects (id, name, location, client, supervisor, status, is_godown, start_date, end_date, budget, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, p => [p.id, p.name, p.location, p.client, p.supervisor, p.status, p.isGodown ? 1 : 0, p.startDate, p.endDate, p.budget, p.notes]);

        // Vendors
        await refillTable("vendors", data.vendors || [], `
          INSERT INTO vendors (id, name, contact, category, balance, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `, v => [v.id, v.name, v.contact, v.category, v.balance, v.isActive ? 1 : 0]);

        // Materials & History
        await run("DELETE FROM stock_history");
        await run("DELETE FROM materials");
        for (const m of (data.materials || [])) {
          await run(`
            INSERT INTO materials (id, name, unit, cost_per_unit, total_purchased, total_used, low_stock_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [m.id, m.name, m.unit, m.costPerUnit, m.totalPurchased, m.totalUsed, m.lowStockThreshold]);
          
          for (const h of (m.history || [])) {
            await run(`
              INSERT INTO stock_history (id, material_id, date, type, quantity, project_id, vendor_id, note, unit_price, parent_purchase_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [h.id, m.id, h.date, h.type, h.quantity, h.projectId, h.vendorId, h.note, h.unitPrice, h.parentPurchaseId]);
          }
        }

        // Expenses
        await refillTable("expenses", data.expenses || [], `
          INSERT INTO expenses (id, date, project_id, vendor_id, amount, category, payment_method, notes, material_id, material_quantity, unit_price, inventory_action, parent_purchase_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, e => [e.id, e.date, e.projectId, e.vendorId, e.amount, e.category, e.paymentMethod, e.notes, e.materialId, e.materialQuantity, e.unitPrice, e.inventoryAction, e.parentPurchaseId]);

        // Payments
        await refillTable("payments", data.payments || [], `
          INSERT INTO payments (id, date, vendor_id, amount, method, reference, material_batch_id, master_payment_id, is_allocation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, p => [p.id, p.date, p.vendorId, p.amount, p.method, p.reference, p.materialBatchId, p.masterPaymentId, p.isAllocation ? 1 : 0]);

        // Incomes
        await refillTable("incomes", data.incomes || [], `
          INSERT INTO incomes (id, date, project_id, amount, source, method, reference, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, i => [i.id, i.date, i.projectId, i.amount, i.source, i.method, i.reference, i.notes]);

        // Invoices
        await refillTable("invoices", data.invoices || [], `
          INSERT INTO invoices (id, project_id, amount, date, due_date, description, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, i => [i.id, i.projectId, i.amount, i.date, i.dueDate, i.description, i.status]);

        // Employees
        await refillTable("employees", data.employees || [], `
          INSERT INTO employees (id, name, role, phone, daily_wage, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `, e => [e.id, e.name, e.role, e.phone, e.dailyWage, e.isActive ? 1 : 0]);

        // Labor Logs
        await refillTable("labor_logs", data.laborLogs || [], `
          INSERT INTO labor_logs (id, employee_id, project_id, date, status, wage_amount, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, l => [l.id, l.employeeId, l.projectId, l.date, l.status, l.wageAmount, l.notes]);

        // Labor Payments
        await refillTable("labor_payments", data.laborPayments || [], `
          INSERT INTO labor_payments (id, employee_id, amount, date, method, reference, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, lp => [lp.id, lp.employeeId, lp.amount, lp.date, lp.method, lp.reference, lp.notes]);

        await run("COMMIT");
        return res.json({ success: true });
      } catch (err) {
        await run("ROLLBACK");
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
