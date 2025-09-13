import type { RequestHandler } from "express";
import { getSession } from "../lib/session";
import { getTodayAttendanceRec, listStudentsByTeacher, saveTodayAttendanceRec } from "../db/repo";

function dateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const getTodayAttendance: RequestHandler = async (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const tId = sess.sub;
  const rec = await getTodayAttendanceRec(tId);
  if (!rec) return res.json({ attendance: null });
  res.json({ attendance: rec });
};

export const saveTodayAttendance: RequestHandler = async (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const { present } = req.body as { present?: string[] };
  if (!Array.isArray(present))
    return res
      .status(400)
      .json({ error: "present must be an array of student ids" });
  const tId = sess.sub;
  // Validate IDs belong to this teacher
  const students = await listStudentsByTeacher(tId);
  const validSet = new Set((students as any[]).map((s) => s.id));
  const filtered = present.filter((id) => validSet.has(id));
  const unique = Array.from(new Set(filtered));
  const saved = await saveTodayAttendanceRec(tId, unique);
  res.json({ ok: true, attendance: saved });
};
