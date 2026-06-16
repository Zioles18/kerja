import express from "express";
import { db } from "../db.js";

const router = express.Router();

// Get all notifications
router.get("/", (req, res) => {
  res.json(db.notifikasi.sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()));
});

// Create a new notification
router.post("/", (req, res) => {
  const newNotifikasi = {
    id: Date.now().toString(),
    tanggal: new Date().toISOString(),
    isRead: false,
    ...req.body,
  };
  db.notifikasi.push(newNotifikasi);
  res.status(201).json(newNotifikasi);
});

// Mark notification as read
router.put("/:id/read", (req, res) => {
  const index = db.notifikasi.findIndex((n: any) => n.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Notifikasi not found" });
  
  db.notifikasi[index].isRead = true;
  res.json(db.notifikasi[index]);
});

// Mark all as read
router.put("/read-all", (req, res) => {
  db.notifikasi = db.notifikasi.map((n: any) => ({ ...n, isRead: true }));
  res.json({ message: "All marked as read" });
});

export default router;
