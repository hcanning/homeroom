import type { RequestHandler } from "express";
import { nanoid } from "../util/nanoid";
import { hashPassword } from "../lib/secure-store";
import { getSession, requireRole } from "../lib/session";
import {
  createTeacherRec,
  deleteStudentRec,
  deleteTeacherRec,
  getStudentById,
  getTeacherByEmail,
  getTeacherById,
  listAllTeachers,
  listStudentsByTeacher,
  updateStudentRec,
  updateTeacherRec,
} from "../db/repo";

export const requireSuperadmin = requireRole("superadmin");
export const requireTeacher = requireRole("teacher");

export const createTeacher: RequestHandler = async (req, res) => {
  const { email, password, name, pronouns, dept, photoUrl, homeroom } =
    req.body as {
      email?: string;
      password?: string;
      name?: string;
      pronouns?: string;
      dept?: string;
      photoUrl?: string;
      homeroom?: string;
    };
  if (!email || !password || !name)
    return res.status(400).json({ error: "Missing required fields" });
  const normEmail = email.trim().toLowerCase();
  const exists = await getTeacherByEmail(normEmail);
  if (exists)
    return res
      .status(400)
      .json({ error: "Teacher with this email already exists" });
  const id = nanoid();
  const teacher = await createTeacherRec({
    id,
    email: normEmail,
    passwordHash: hashPassword(password),
    name,
    pronouns,
    dept,
    photoUrl,
    homeroom,
  });
  res.json({ ok: true, teacher });
};

export const listTeachers: RequestHandler = async (_req, res) => {
  const list = await listAllTeachers();
  res.json({ teachers: list });
};

export const updateTeacher: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const { email, password, name, pronouns, dept, photoUrl, homeroom } =
    req.body as {
      email?: string;
      password?: string;
      name?: string;
      pronouns?: string;
      dept?: string;
      photoUrl?: string;
      homeroom?: string;
    };
  if (email) {
    const normEmail = email.trim().toLowerCase();
    const exists = await getTeacherByEmail(normEmail);
    if (exists && exists.id !== id)
      return res.status(400).json({ error: "Email already in use" });
  }
  const updated = await updateTeacherRec(id, {
    email: email?.trim().toLowerCase(),
    passwordHash:
      password && password.length > 0 ? hashPassword(password) : undefined,
    name,
    pronouns,
    dept,
    photoUrl,
    homeroom,
  });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, teacher: updated });
};

export const deleteTeacher: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const ok = await deleteTeacherRec(id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
};

export const createStudent: RequestHandler = async (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const teacherId = sess.sub;
  const { name, pronouns, dept, photoUrl } = req.body as {
    name?: string;
    pronouns?: string;
    dept?: string;
    photoUrl?: string;
  };
  if (!name) return res.status(400).json({ error: "Missing required fields" });
  const id = nanoid();
  const student = await createStudentRec({
    id,
    teacherId,
    name,
    pronouns,
    dept,
    photoUrl,
  });
  res.json({ ok: true, student });
};

export const listStudents: RequestHandler = async (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const students = await listStudentsByTeacher(sess.sub);
  res.json({ students });
};

export const getTeacherMe: RequestHandler = async (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const t = await getTeacherById(sess.sub);
  if (!t) return res.status(404).json({ error: "Not found" });
  const { passwordHash, ...safe } = t as any;
  res.json({ teacher: safe });
};

export const updateStudent: RequestHandler = async (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const id = req.params.id;
  const { name, pronouns, dept, photoUrl } = req.body as {
    name?: string;
    pronouns?: string;
    dept?: string;
    photoUrl?: string;
  };
  const student = await updateStudentRec(sess.sub, id, {
    name,
    pronouns,
    dept,
    photoUrl,
  });
  if (!student) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, student });
};

export const deleteStudent: RequestHandler = async (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const id = req.params.id;
  const ok = await deleteStudentRec(sess.sub, id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
};

export const updateTeacherMe: RequestHandler = async (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const id = sess.sub;
  const t0 = await getTeacherById(id);
  if (!t0) return res.status(404).json({ error: "Not found" });
  const { email, password, name, pronouns, dept, photoUrl, homeroom } =
    req.body as {
      email?: string;
      password?: string;
      name?: string;
      pronouns?: string;
      dept?: string;
      photoUrl?: string;
      homeroom?: string;
    };
  if (email) {
    const normEmail = email.trim().toLowerCase();
    const exists = await getTeacherByEmail(normEmail);
    if (exists && exists.id !== id)
      return res.status(400).json({ error: "Email already in use" });
  }
  const updated = await updateTeacherRec(id, {
    email: email?.trim().toLowerCase(),
    passwordHash:
      password && password.length > 0 ? hashPassword(password) : undefined,
    name,
    pronouns,
    dept,
    photoUrl,
    homeroom,
  });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, teacher: updated });
};
