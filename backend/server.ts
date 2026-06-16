import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import path from "path";

// Routes
import authRoutes from "./routes/authRoutes.js";
import wargaRoutes from "./routes/wargaRoutes.js";
import suratRoutes from "./routes/suratRoutes.js";
import pengumumanRoutes from "./routes/pengumumanRoutes.js";
import keuanganRoutes from "./routes/keuanganRoutes.js";
import pengaduanRoutes from "./routes/pengaduanRoutes.js";
import notifikasiRoutes from "./routes/notifikasiRoutes.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/warga", wargaRoutes);
  app.use("/api/surat", suratRoutes);
  app.use("/api/pengumuman", pengumumanRoutes);
  app.use("/api/keuangan", keuanganRoutes);
  app.use("/api/pengaduan", pengaduanRoutes);
  app.use("/api/notifikasi", notifikasiRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
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
  });
}

startServer();
