import express from "express";
import { db } from "../db.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(db.keuangan);
});

router.post("/", (req, res) => {
  const newKeuangan = { 
    id: Date.now().toString(), 
    ...req.body, 
    tanggal: new Date().toISOString()
  };
  db.keuangan.push(newKeuangan);
  res.status(201).json(newKeuangan);
});

router.put("/:id", (req, res) => {
  const index = db.keuangan.findIndex(k => k.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Keuangan not found" });
  
  db.keuangan[index] = { ...db.keuangan[index], ...req.body };
  res.json(db.keuangan[index]);
});

router.delete("/:id", (req, res) => {
  db.keuangan = db.keuangan.filter(k => k.id !== req.params.id);
  res.json({ message: "Keuangan deleted" });
});

export default router;
