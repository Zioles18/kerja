import express from "express";
import { db } from "../db.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(db.warga);
});

router.post("/", (req, res) => {
  const newWarga = { id: Date.now().toString(), ...req.body };
  db.warga.push(newWarga);
  res.status(201).json(newWarga);
});

router.post("/bulk", (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ message: "Data harus berupa array" });
  }

  const validWargaList = [];

  for (let i = 0; i < req.body.length; i++) {
    const warga = req.body[i];
    
    // Auto-generate NIK if missing to prevent failures
    const nik = warga.nik ? String(warga.nik).trim() : `AUTO-${Date.now()}-${i}`;
    
    const newWargaData = {
      id: (Date.now() + i).toString(),
      nik: nik,
      nama: String(warga.nama || "Tanpa Nama").trim(),
      kk: String(warga.kk || "-").trim(),
      alamat: String(warga.alamat || "-").trim(),
      noHp: String(warga.noHp || "-").trim(),
      status: String(warga.status || "Aktif").trim(),
    };

    // Check for duplicate NIK in existing db
    const existingIndex = db.warga.findIndex(w => w.nik === nik);

    if (existingIndex !== -1) {
      // Update existing record silently instead of throwing an error
      db.warga[existingIndex] = { 
        ...db.warga[existingIndex], 
        ...newWargaData, 
        id: db.warga[existingIndex].id // preserve original ID
      };
    } else {
      validWargaList.push(newWargaData);
    }
  }

  if (validWargaList.length > 0) {
    db.warga.push(...validWargaList);
  }

  res.status(201).json({ message: "Data berhasil diimport secara instan!", count: req.body.length });
});

router.put("/:id", (req, res) => {
  const index = db.warga.findIndex(w => w.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Warga not found" });
  
  db.warga[index] = { ...db.warga[index], ...req.body };
  res.json(db.warga[index]);
});

router.delete("/:id", (req, res) => {
  db.warga = db.warga.filter(w => w.id !== req.params.id);
  res.json({ message: "Warga deleted" });
});

export default router;
