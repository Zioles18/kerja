import express from "express";
import { db } from "../db.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(db.pengumuman);
});

router.post("/", (req, res) => {
  const newPengumuman = { 
    id: Date.now().toString(), 
    ...req.body, 
    tanggal: new Date().toISOString()
  };
  db.pengumuman.push(newPengumuman);
  res.status(201).json(newPengumuman);
});

router.put("/:id", (req, res) => {
  const index = db.pengumuman.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Pengumuman not found" });
  
  db.pengumuman[index] = { ...db.pengumuman[index], ...req.body };
  res.json(db.pengumuman[index]);
});

router.delete("/:id", (req, res) => {
  db.pengumuman = db.pengumuman.filter(p => p.id !== req.params.id);
  res.json({ message: "Pengumuman deleted" });
});

export default router;
