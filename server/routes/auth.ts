import type { RequestHandler } from "express";
import { verifyPassword, hashPassword } from "../lib/password";
import { clearSession, setSession } from "../lib/session";
import { getAdmin, setAdmin, getTeacherByEmail } from "../db/repo";

export const setupAdmin: RequestHandler = async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });
  const normEmail = email.trim().toLowerCase();
  const existing = await getAdmin();
  if (existing)
    return res.status(400).json({ error: "Admin already configured" });
  await setAdmin(normEmail, hashPassword(password));
  setSession(res, { sub: "admin", role: "superadmin", iat: Date.now() });
  res.json({ ok: true });
};

export const login: RequestHandler = async (req, res) => {
  const { role, email, password } = req.body as {
    role?: "superadmin" | "teacher";
    email?: string;
    password?: string;
  };
  if (!role || !email || !password)
    return res.status(400).json({ error: "Missing fields" });
  const normEmail = email.trim().toLowerCase();
  if (role === "superadmin") {
    const admin = await getAdmin();
    if (!admin) return res.status(400).json({ error: "Admin not configured" });
    if (
      admin.email !== normEmail ||
      !verifyPassword(password, admin.passwordHash)
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    setSession(res, { sub: "admin", role: "superadmin", iat: Date.now() });
    return res.json({ ok: true, role });
  }
  // teacher
  const teacher = await getTeacherByEmail(normEmail);
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

export const status: RequestHandler = async (_req, res) => {
  const admin = await getAdmin();
  res.json({ adminConfigured: !!admin });
};

// Danger: force reset admin (keeps teachers/students). Intended for initial setup/testing.
export const setupAdminForce: RequestHandler = async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });
  const normEmail = email.trim().toLowerCase();
  await setAdmin(normEmail, hashPassword(password));
  setSession(res, { sub: "admin", role: "superadmin", iat: Date.now() });
  res.json({ ok: true, forced: true });
};
