import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const COOKIE_NAME = "session";

function getKey(): Buffer {
  const env = process.env.SESSION_SECRET;
  // Prefer external secret if provided
  return Buffer.from(env ?? "fallback-session-secret", "utf-8");
}

export type SessionPayload = {
  sub: string; // user id or "admin"
  role: "superadmin" | "teacher";
  iat: number;
};

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf-8").toString(
    "base64url",
  );
  const mac = createHmac("sha256", getKey()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token: string): SessionPayload | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", getKey())
    .update(body)
    .digest("base64url");
  const ok = timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  if (!ok) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export function setSession(res: Response, payload: SessionPayload) {
  const token = sign(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getSession(req: Request): SessionPayload | null {
  const cookies = parseCookies(req.headers["cookie"] ?? "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verify(token);
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  header.split(/;\s*/).forEach((part) => {
    if (!part) return;
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = decodeURIComponent(part.slice(0, idx));
    const v = decodeURIComponent(part.slice(idx + 1));
    out[k] = v;
  });
  return out;
}

export function requireRole(role: SessionPayload["role"]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sess = getSession(req);
    if (!sess || sess.role !== role)
      return res.status(401).json({ error: "Unauthorized" });
    (req as any).session = sess;
    next();
  };
}
