import express from "express";
import { db } from "../db.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(db.surat);
});

router.post("/", (req, res) => {
  const newSurat = { 
    id: Date.now().toString(), 
    ...req.body, 
    status: "Pending",
    tanggal: new Date().toISOString()
  };
  db.surat.push(newSurat);
  res.status(201).json(newSurat);
});

router.put("/:id", (req, res) => {
  const index = db.surat.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Surat not found" });
  
  db.surat[index] = { ...db.surat[index], ...req.body };
  res.json(db.surat[index]);
});

export default router;
