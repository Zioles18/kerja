import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(400).json({ message: "Email atau password salah" });
  }

  // For demo, we just check if password is "password123" or matches hash
  // In real app, use bcrypt.compare
  const isMatch = password === "password123" || await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    return res.status(400).json({ message: "Email atau password salah" });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
  
  res.json({
    token,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
    }
  });
});

router.post("/register", async (req, res) => {
  const { nama, email, password, noHp, role } = req.body;

  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ message: "Email sudah terdaftar" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUser = {
    id: Date.now().toString(),
    nama,
    email,
    password: hashedPassword,
    noHp,
    role: role || "Warga",
    profilePic: undefined,
  };

  db.users.push(newUser);

  const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: "1d" });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      nama: newUser.nama,
      email: newUser.email,
      role: newUser.role,
    }
  });
});

router.put("/profile/:id", (req, res) => {
  const { id } = req.params;
  const { nama, email, noHp, profilePic } = req.body;

  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  }

  // Update user data
  if (nama) db.users[userIndex].nama = nama;
  if (email) db.users[userIndex].email = email;
  if (noHp) db.users[userIndex].noHp = noHp;
  if (profilePic !== undefined) db.users[userIndex].profilePic = profilePic;

  const updatedUser = db.users[userIndex];

  res.json({
    user: {
      id: updatedUser.id,
      nama: updatedUser.nama,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePic: updatedUser.profilePic,
    }
  });
});

export default router;
