import type { RequestHandler } from "express";
import { nanoid } from "../util/nanoid";
import { persistDB, readDB, hashPassword } from "../lib/secure-store";
import { getSession, requireRole } from "../lib/session";

export const requireSuperadmin = requireRole("superadmin");
export const requireTeacher = requireRole("teacher");

export const createTeacher: RequestHandler = (req, res) => {
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
  const db = readDB();
  const normEmail = email.trim().toLowerCase();
  const exists = Object.values(db.teachers).some((t) => t.email === normEmail);
  if (exists)
    return res
      .status(400)
      .json({ error: "Teacher with this email already exists" });
  const id = nanoid();
  db.teachers[id] = {
    id,
    email: normEmail,
    passwordHash: hashPassword(password),
    name,
    pronouns,
    dept,
    photoUrl,
    homeroom,
    createdAt: new Date().toISOString(),
  };
  if (!db.students[id]) db.students[id] = {};
  persistDB(db);
  res.json({
    ok: true,
    teacher: { ...db.teachers[id], passwordHash: undefined },
  });
};

export const listTeachers: RequestHandler = (_req, res) => {
  const db = readDB();
  const list = Object.values(db.teachers).map(
    ({ passwordHash, ...rest }) => rest,
  );
  res.json({ teachers: list });
};

export const updateTeacher: RequestHandler = (req, res) => {
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
  const db = readDB();
  const t = db.teachers[id];
  if (!t) return res.status(404).json({ error: "Not found" });
  if (email) {
    const normEmail = email.trim().toLowerCase();
    const exists = Object.values(db.teachers).some(
      (x) => x.email === normEmail && x.id !== id,
    );
    if (exists) return res.status(400).json({ error: "Email already in use" });
    t.email = normEmail;
  }
  if (typeof name === "string") t.name = name;
  if (typeof pronouns === "string") t.pronouns = pronouns;
  if (typeof dept === "string") t.dept = dept;
  if (typeof photoUrl === "string") t.photoUrl = photoUrl;
  if (typeof homeroom === "string") t.homeroom = homeroom;
  if (password && password.length > 0) t.passwordHash = hashPassword(password);
  persistDB(db);
  const { passwordHash, ...safe } = t;
  res.json({ ok: true, teacher: safe });
};

export const deleteTeacher: RequestHandler = (req, res) => {
  const id = req.params.id;
  const db = readDB();
  if (!db.teachers[id]) return res.status(404).json({ error: "Not found" });
  delete db.teachers[id];
  delete db.students[id];
  persistDB(db);
  res.json({ ok: true });
};

export const createStudent: RequestHandler = (req, res) => {
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
  const db = readDB();
  const id = nanoid();
  const student = {
    id,
    teacherId,
    name,
    pronouns,
    dept,
    photoUrl,
    createdAt: new Date().toISOString(),
  };
  if (!db.students[teacherId]) db.students[teacherId] = {};
  db.students[teacherId][id] = student;
  persistDB(db);
  res.json({ ok: true, student });
};

export const listStudents: RequestHandler = (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const db = readDB();
  const students = Object.values(db.students[sess.sub] ?? {});
  res.json({ students });
};

export const getTeacherMe: RequestHandler = (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const db = readDB();
  const t = db.teachers[sess.sub];
  if (!t) return res.status(404).json({ error: "Not found" });
  const { passwordHash, ...safe } = t as any;
  res.json({ teacher: safe });
};

export const updateStudent: RequestHandler = (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const db = readDB();
  const id = req.params.id;
  const student = db.students[sess.sub]?.[id];
  if (!student) return res.status(404).json({ error: "Not found" });
  const { name, pronouns, dept, photoUrl } = req.body as {
    name?: string;
    pronouns?: string;
    dept?: string;
    photoUrl?: string;
  };
  if (typeof name === "string") student.name = name;
  if (typeof pronouns === "string") student.pronouns = pronouns;
  if (typeof dept === "string") student.dept = dept;
  if (typeof photoUrl === "string") student.photoUrl = photoUrl;
  persistDB(db);
  res.json({ ok: true, student });
};

export const deleteStudent: RequestHandler = (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const db = readDB();
  const id = req.params.id;
  if (!db.students[sess.sub]?.[id])
    return res.status(404).json({ error: "Not found" });
  delete db.students[sess.sub][id];
  persistDB(db);
  res.json({ ok: true });
};

export const updateTeacherMe: RequestHandler = (req, res) => {
  const sess = getSession(req);
  if (!sess || sess.role !== "teacher")
    return res.status(401).json({ error: "Unauthorized" });
  const db = readDB();
  const id = sess.sub;
  const t = db.teachers[id];
  if (!t) return res.status(404).json({ error: "Not found" });
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
    const exists = Object.values(db.teachers).some(
      (x) => x.email === normEmail && x.id !== id,
    );
    if (exists) return res.status(400).json({ error: "Email already in use" });
    t.email = normEmail;
  }
  if (typeof name === "string") t.name = name;
  if (typeof pronouns === "string") t.pronouns = pronouns;
  if (typeof dept === "string") t.dept = dept;
  if (typeof photoUrl === "string") t.photoUrl = photoUrl;
  if (typeof homeroom === "string") (t as any).homeroom = homeroom;
  if (password && password.length > 0) t.passwordHash = hashPassword(password);
  persistDB(db);
  const { passwordHash, ...safe } = t as any;
  res.json({ ok: true, teacher: safe });
};
