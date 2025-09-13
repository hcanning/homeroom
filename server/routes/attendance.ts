import type { RequestHandler } from "express";
import { readDB, persistDB } from "../lib/secure-store";
import { getSession } from "../lib/session";

function dateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const getTodayAttendance: RequestHandler = (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const db = readDB();
  const tId = sess.sub;
  const dk = dateKey();
  const byTeacher = (db as any).attendance?.[tId] ?? {};
  const rec = byTeacher[dk] ?? null;
  if (!rec) return res.json({ attendance: null });
  res.json({
    attendance: {
      date: dk,
      presentIds: rec.presentIds ?? rec.present ?? [],
      savedAt: rec.savedAt,
    },
  });
};

export const saveTodayAttendance: RequestHandler = (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const { present } = req.body as { present?: string[] };
  if (!Array.isArray(present))
    return res
      .status(400)
      .json({ error: "present must be an array of student ids" });
  const db = readDB();
  const tId = sess.sub;
  const dk = dateKey();
  if (!db.attendance) (db as any).attendance = {} as any;
  if (!db.attendance[tId]) db.attendance[tId] = {} as any;
  // Validate student IDs belong to this teacher
  const validSet = new Set(Object.keys(db.students[tId] ?? {}));
  const filtered = present.filter((id) => validSet.has(id));
  const unique = Array.from(new Set(filtered));
  db.attendance[tId][dk] = {
    presentIds: unique,
    savedAt: new Date().toISOString(),
  } as any;
  persistDB(db);
  res.json({ ok: true, attendance: { date: dk, presentIds: unique } });
};
