import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "db.json");

// Initialize DB if not exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ sessions: {} }));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api.php", (req, res) => {
    const action = req.query.action;
    const syncId = req.query.syncId as string;

    const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

    if (action === 'test_connection') {
      return res.json({ success: true, message: "Node Bridge Reachable" });
    }

    if (action === 'sync') {
      if (!syncId) return res.status(400).json({ error: "No syncId" });
      const session = db.sessions[syncId];
      if (session) {
        return res.json(session.state);
      } else {
        return res.json({ status: "new" });
      }
    }

    res.status(404).json({ error: "Action not found" });
  });

  app.post("/api.php", (req, res) => {
    const action = req.query.action;
    if (action === 'save_state') {
      const data = req.body;
      if (!data || !data.syncId) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      db.sessions[data.syncId] = {
        state: data,
        lastUpdated: Date.now()
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
      return res.json({ success: true });
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
