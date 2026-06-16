import express from "express";
import { db } from "../db.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(db.pengaduan);
});

router.post("/", (req, res) => {
  const newPengaduan = { 
    id: Date.now().toString(), 
    ...req.body, 
    status: "Menunggu",
    tanggal: new Date().toISOString()
  };
  db.pengaduan.push(newPengaduan);
  res.status(201).json(newPengaduan);
});

router.put("/:id", (req, res) => {
  const index = db.pengaduan.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Pengaduan not found" });
  
  db.pengaduan[index] = { ...db.pengaduan[index], ...req.body };
  res.json(db.pengaduan[index]);
});

router.delete("/:id", (req, res) => {
  db.pengaduan = db.pengaduan.filter(p => p.id !== req.params.id);
  res.json({ message: "Pengaduan deleted" });
});

export default router;
