import { getPool, ensureSchema } from "./neon";
import {
  readDB as readJSON,
  persistDB as persistJSON,
  type DBShape,
} from "../lib/secure-store";

export function isNeon() {
  return !!getPool();
}

// Initialize schema on module load (best-effort)
(async () => {
  if (isNeon()) await ensureSchema().catch(() => {});
})();

let __schemaEnsured = false;
async function neonPool() {
  if (!__schemaEnsured && isNeon()) {
    try { await ensureSchema(); } catch {}
    __schemaEnsured = true;
  }
  const pool = getPool();
  if (!pool) throw new Error("Neon pool unavailable");
  return pool;
}

function dateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Admin
export async function getAdmin() {
  if (!isNeon()) {
    const db = readJSON();
    return db.admin;
  }
  const pool = getPool()!;
  const r = await pool.query(
    'SELECT email, password_hash AS "passwordHash", created_at AS "createdAt" FROM admins ORDER BY id ASC LIMIT 1',
  );
  return r.rows[0] ?? null;
}

export async function setAdmin(email: string, passwordHash: string) {
  if (!isNeon()) {
    const db = readJSON();
    db.admin = { email, passwordHash, createdAt: new Date().toISOString() };
    persistJSON(db);
    return;
  }
  const pool = getPool()!;
  await pool.query("DELETE FROM admins");
  await pool.query(
    "INSERT INTO admins (email, password_hash, created_at) VALUES ($1, $2, now())",
    [email, passwordHash],
  );
}

// Teachers
export async function getTeacherByEmail(email: string) {
  if (!isNeon()) {
    const db = readJSON();
    return Object.values(db.teachers).find((t) => t.email === email) ?? null;
  }
  const pool = getPool()!;
  const r = await pool.query(
    'SELECT id, email, password_hash AS "passwordHash", name, pronouns, dept, photo_url AS "photoUrl", homeroom, created_at AS "createdAt" FROM teachers WHERE email = $1',
    [email],
  );
  return r.rows[0] ?? null;
}

export async function getTeacherById(id: string) {
  if (!isNeon()) {
    const db = readJSON();
    return db.teachers[id] ?? null;
  }
  const pool = getPool()!;
  const r = await pool.query(
    'SELECT id, email, password_hash AS "passwordHash", name, pronouns, dept, photo_url AS "photoUrl", homeroom, created_at AS "createdAt" FROM teachers WHERE id = $1',
    [id],
  );
  return r.rows[0] ?? null;
}

export async function listAllTeachers() {
  if (!isNeon()) {
    const db = readJSON();
    return Object.values(db.teachers).map(({ passwordHash, ...rest }) => rest);
  }
  const pool = getPool()!;
  const r = await pool.query(
    'SELECT id, email, name, pronouns, dept, photo_url AS "photoUrl", homeroom, created_at AS "createdAt" FROM teachers ORDER BY created_at DESC',
  );
  return r.rows;
}

export async function createTeacherRec(t: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  pronouns?: string;
  dept?: string;
  photoUrl?: string;
  homeroom?: string;
}) {
  if (!isNeon()) {
    const db = readJSON();
    db.teachers[t.id] = { ...t, createdAt: new Date().toISOString() } as any;
    if (!db.students[t.id]) db.students[t.id] = {};
    persistJSON(db);
    const { passwordHash, ...safe } = db.teachers[t.id] as any;
    return safe;
  }
  const pool = getPool()!;
  await pool.query(
    `INSERT INTO teachers (id, email, password_hash, name, pronouns, dept, photo_url, homeroom, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())`,
    [
      t.id,
      t.email,
      t.passwordHash,
      t.name,
      t.pronouns ?? null,
      t.dept ?? null,
      t.photoUrl ?? null,
      t.homeroom ?? null,
    ],
  );
  const r = await pool.query(
    'SELECT id, email, name, pronouns, dept, photo_url AS "photoUrl", homeroom, created_at AS "createdAt" FROM teachers WHERE id = $1',
    [t.id],
  );
  return r.rows[0];
}

export async function updateTeacherRec(
  id: string,
  updates: {
    email?: string;
    passwordHash?: string;
    name?: string;
    pronouns?: string;
    dept?: string;
    photoUrl?: string;
    homeroom?: string;
  },
) {
  if (!isNeon()) {
    const db = readJSON();
    const t = db.teachers[id];
    if (!t) return null;
    if (updates.email) t.email = updates.email;
    if (updates.passwordHash) t.passwordHash = updates.passwordHash;
    if (typeof updates.name === "string") t.name = updates.name;
    if (typeof updates.pronouns === "string") t.pronouns = updates.pronouns;
    if (typeof updates.dept === "string") t.dept = updates.dept;
    if (typeof updates.photoUrl === "string") t.photoUrl = updates.photoUrl;
    if (typeof updates.homeroom === "string")
      (t as any).homeroom = updates.homeroom;
    persistJSON(db);
    const { passwordHash, ...safe } = t as any;
    return safe;
  }
  const pool = getPool()!;
  // Build dynamic update
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    const col =
      k === "photoUrl"
        ? "photo_url"
        : k === "passwordHash"
          ? "password_hash"
          : k;
    fields.push(`${col} = $${i++}`);
    values.push(v);
  }
  if (!fields.length) {
    const r0 = await pool.query(
      'SELECT id, email, name, pronouns, dept, photo_url AS "photoUrl", homeroom, created_at AS "createdAt" FROM teachers WHERE id = $1',
      [id],
    );
    return r0.rows[0] ?? null;
  }
  values.push(id);
  await pool.query(
    `UPDATE teachers SET ${fields.join(", ")} WHERE id = $${i}`,
    values,
  );
  const r = await pool.query(
    'SELECT id, email, name, pronouns, dept, photo_url AS "photoUrl", homeroom, created_at AS "createdAt" FROM teachers WHERE id = $1',
    [id],
  );
  return r.rows[0] ?? null;
}

export async function deleteTeacherRec(id: string) {
  if (!isNeon()) {
    const db = readJSON();
    delete db.teachers[id];
    delete db.students[id];
    persistJSON(db);
    return true;
  }
  const pool = getPool()!;
  await pool.query("DELETE FROM teachers WHERE id = $1", [id]);
  return true;
}

// Students
export async function listStudentsByTeacher(teacherId: string) {
  if (!isNeon()) {
    const db = readJSON();
    return Object.values(db.students[teacherId] ?? {});
  }
  const pool = getPool()!;
  const r = await pool.query(
    'SELECT id, teacher_id AS "teacherId", name, pronouns, dept, photo_url AS "photoUrl", created_at AS "createdAt" FROM students WHERE teacher_id = $1 ORDER BY created_at DESC',
    [teacherId],
  );
  return r.rows;
}

export async function createStudentRec(student: {
  id: string;
  teacherId: string;
  name: string;
  pronouns?: string;
  dept?: string;
  photoUrl?: string;
}) {
  if (!isNeon()) {
    const db = readJSON();
    if (!db.students[student.teacherId])
      db.students[student.teacherId] = {} as any;
    db.students[student.teacherId][student.id] = {
      ...student,
      createdAt: new Date().toISOString(),
    } as any;
    persistJSON(db);
    return db.students[student.teacherId][student.id];
  }
  const pool = getPool()!;
  await pool.query(
    `INSERT INTO students (id, teacher_id, name, pronouns, dept, photo_url, created_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())`,
    [
      student.id,
      student.teacherId,
      student.name,
      student.pronouns ?? null,
      student.dept ?? null,
      student.photoUrl ?? null,
    ],
  );
  const r = await pool.query(
    'SELECT id, teacher_id AS "teacherId", name, pronouns, dept, photo_url AS "photoUrl", created_at AS "createdAt" FROM students WHERE id = $1',
    [student.id],
  );
  return r.rows[0];
}

export async function getStudentById(teacherId: string, id: string) {
  if (!isNeon()) {
    const db = readJSON();
    return db.students[teacherId]?.[id] ?? null;
  }
  const pool = getPool()!;
  const r = await pool.query(
    'SELECT id, teacher_id AS "teacherId", name, pronouns, dept, photo_url AS "photoUrl", created_at AS "createdAt" FROM students WHERE id = $1 AND teacher_id = $2',
    [id, teacherId],
  );
  return r.rows[0] ?? null;
}

export async function updateStudentRec(
  teacherId: string,
  id: string,
  updates: {
    name?: string;
    pronouns?: string;
    dept?: string;
    photoUrl?: string;
  },
) {
  if (!isNeon()) {
    const db = readJSON();
    const s = db.students[teacherId]?.[id];
    if (!s) return null;
    if (typeof updates.name === "string") s.name = updates.name;
    if (typeof updates.pronouns === "string") s.pronouns = updates.pronouns;
    if (typeof updates.dept === "string") s.dept = updates.dept;
    if (typeof updates.photoUrl === "string") s.photoUrl = updates.photoUrl;
    persistJSON(db);
    return s;
  }
  const pool = getPool()!;
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    const col = k === "photoUrl" ? "photo_url" : k;
    fields.push(`${col} = $${i++}`);
    values.push(v);
  }
  if (fields.length) {
    values.push(id, teacherId);
    await pool.query(
      `UPDATE students SET ${fields.join(", ")} WHERE id = $${i++} AND teacher_id = $${i}`,
      values,
    );
  }
  const r = await pool.query(
    'SELECT id, teacher_id AS "teacherId", name, pronouns, dept, photo_url AS "photoUrl", created_at AS "createdAt" FROM students WHERE id = $1 AND teacher_id = $2',
    [id, teacherId],
  );
  return r.rows[0] ?? null;
}

export async function deleteStudentRec(teacherId: string, id: string) {
  if (!isNeon()) {
    const db = readJSON();
    if (!db.students[teacherId]?.[id]) return false;
    delete db.students[teacherId][id];
    persistJSON(db);
    return true;
  }
  const pool = getPool()!;
  await pool.query("DELETE FROM students WHERE id = $1 AND teacher_id = $2", [
    id,
    teacherId,
  ]);
  return true;
}

// Attendance
export async function getTodayAttendanceRec(teacherId: string) {
  const dk = dateKey();
  if (!isNeon()) {
    const db = readJSON() as DBShape & { attendance?: any };
    const rec = (db as any).attendance?.[teacherId]?.[dk] ?? null;
    return rec
      ? {
          date: dk,
          presentIds: rec.presentIds ?? rec.present ?? [],
          savedAt: rec.savedAt,
        }
      : null;
  }
  const pool = getPool()!;
  const r = await pool.query(
    'SELECT to_char(date_key,\'YYYY-MM-DD\') AS date, present_ids AS "presentIds", saved_at AS "savedAt" FROM attendance WHERE teacher_id = $1 AND date_key = $2::date',
    [teacherId, dk],
  );
  return r.rows[0] ?? null;
}

export async function saveTodayAttendanceRec(
  teacherId: string,
  presentIds: string[],
) {
  const dk = dateKey();
  if (!isNeon()) {
    const db = readJSON() as DBShape & { attendance?: any };
    if (!db.attendance) (db as any).attendance = {} as any;
    if (!db.attendance[teacherId]) db.attendance[teacherId] = {} as any;
    db.attendance[teacherId][dk] = {
      presentIds,
      savedAt: new Date().toISOString(),
    } as any;
    persistJSON(db);
    return { date: dk, presentIds };
  }
  const pool = getPool()!;
  await pool.query(
    `INSERT INTO attendance (teacher_id, date_key, present_ids, saved_at)
     VALUES ($1, $2::date, $3, now())
     ON CONFLICT (teacher_id, date_key)
     DO UPDATE SET present_ids = EXCLUDED.present_ids, saved_at = now()`,
    [teacherId, dk, presentIds],
  );
  return { date: dk, presentIds };
}
