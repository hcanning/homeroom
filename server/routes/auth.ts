import type { RequestHandler } from "express";
import {
  readDB,
  persistDB,
  verifyPassword,
  hashPassword,
} from "../lib/secure-store";
import { clearSession, setSession } from "../lib/session";

export const setupAdmin: RequestHandler = (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });
  const db = readDB();
  if (db.admin)
    return res.status(400).json({ error: "Admin already configured" });
  const normEmail = email.trim().toLowerCase();
  db.admin = {
    email: normEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  persistDB(db);
  setSession(res, { sub: "admin", role: "superadmin", iat: Date.now() });
  res.json({ ok: true });
};

export const login: RequestHandler = (req, res) => {
  const { role, email, password } = req.body as {
    role?: "superadmin" | "teacher";
    email?: string;
    password?: string;
  };
  if (!role || !email || !password)
    return res.status(400).json({ error: "Missing fields" });
  const normEmail = email.trim().toLowerCase();
  const db = readDB();
  if (role === "superadmin") {
    if (!db.admin)
      return res.status(400).json({ error: "Admin not configured" });
    if (
      db.admin.email !== normEmail ||
      !verifyPassword(password, db.admin.passwordHash)
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    setSession(res, { sub: "admin", role: "superadmin", iat: Date.now() });
    return res.json({ ok: true, role });
  }
  // teacher
  const teacher = Object.values(db.teachers).find((t) => t.email === normEmail);
  if (!teacher || !verifyPassword(password, teacher.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  setSession(res, { sub: teacher.id, role: "teacher", iat: Date.now() });
  res.json({ ok: true, role });
};

export const logout: RequestHandler = (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
};

export const whoami: RequestHandler = (req, res) => {
  // session is optional
  const cookie = (req.headers["cookie"] ?? "").includes("session=");
  res.json({ hasSession: cookie });
};

export const status: RequestHandler = (_req, res) => {
  const db = readDB();
  res.json({ adminConfigured: !!db.admin });
};

// Danger: force reset admin (keeps teachers/students). Intended for initial setup/testing.
export const setupAdminForce: RequestHandler = (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });
  const db = readDB();
  const normEmail = email.trim().toLowerCase();
  db.admin = {
    email: normEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  persistDB(db);
  setSession(res, { sub: "admin", role: "superadmin", iat: Date.now() });
  res.json({ ok: true, forced: true });
};
