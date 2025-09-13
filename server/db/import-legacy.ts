import { getPool, ensureSchema } from "./neon";
import { readDB, type DBShape } from "../lib/secure-store";
import { existsSync } from "fs";

function hasLegacyData(db: DBShape): boolean {
  if (db.admin) return true;
  if (Object.keys(db.teachers).length) return true;
  if (Object.keys(db.students).some((k) => Object.keys(db.students[k] ?? {}).length)) return true;
  if (db.attendance && Object.keys(db.attendance).some((t) => Object.keys(db.attendance![t] ?? {}).length)) return true;
  return false;
}

export async function importLegacyJsonToNeonIfPresent(): Promise<{ imported: boolean }> {
  const pool = getPool();
  if (!pool) return { imported: false };

  // Best-effort: read legacy JSON (encrypted). If files are missing, this will return empty defaults
  let db: DBShape;
  try {
    db = readDB();
  } catch {
    // If decryption fails or file missing, skip
    return { imported: false };
  }
  if (!hasLegacyData(db)) return { imported: false };

  await ensureSchema();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Admin (only insert if none exists)
    if (db.admin) {
      const r = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM admins");
      if (r.rows[0] && r.rows[0].count === "0") {
        await client.query(
          "INSERT INTO admins (email, password_hash, created_at) VALUES ($1, $2, COALESCE($3::timestamptz, now()))",
          [db.admin.email, db.admin.passwordHash, db.admin.createdAt ?? null],
        );
      }
    }

    // Teachers
    for (const t of Object.values(db.teachers)) {
      await client.query(
        `INSERT INTO teachers (id, email, password_hash, name, pronouns, dept, photo_url, homeroom, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9::timestamptz, now()))
         ON CONFLICT (id)
         DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           pronouns = EXCLUDED.pronouns,
           dept = EXCLUDED.dept,
           photo_url = EXCLUDED.photo_url,
           homeroom = EXCLUDED.homeroom`,
        [
          t.id,
          t.email,
          t.passwordHash,
          t.name,
          t.pronouns ?? null,
          t.dept ?? null,
          t.photoUrl ?? null,
          (t as any).homeroom ?? null,
          t.createdAt ?? null,
        ],
      );
    }

    // Students (grouped by teacher)
    for (const teacherId of Object.keys(db.students)) {
      const group = db.students[teacherId] ?? {};
      for (const s of Object.values(group)) {
        await client.query(
          `INSERT INTO students (id, teacher_id, name, pronouns, dept, photo_url, created_at)
           VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7::timestamptz, now()))
           ON CONFLICT (id)
           DO UPDATE SET
             teacher_id = EXCLUDED.teacher_id,
             name = EXCLUDED.name,
             pronouns = EXCLUDED.pronouns,
             dept = EXCLUDED.dept,
             photo_url = EXCLUDED.photo_url`,
          [
            s.id,
            s.teacherId,
            s.name,
            s.pronouns ?? null,
            s.dept ?? null,
            s.photoUrl ?? null,
            s.createdAt ?? null,
          ],
        );
      }
    }

    // Attendance
    if (db.attendance) {
      for (const teacherId of Object.keys(db.attendance)) {
        const byDate = db.attendance[teacherId] ?? {} as Record<string, { presentIds: string[]; savedAt: string }>;
        for (const dateKey of Object.keys(byDate)) {
          const rec = byDate[dateKey];
          await client.query(
            `INSERT INTO attendance (teacher_id, date_key, present_ids, saved_at)
             VALUES ($1, $2::date, $3, COALESCE($4::timestamptz, now()))
             ON CONFLICT (teacher_id, date_key)
             DO UPDATE SET present_ids = EXCLUDED.present_ids, saved_at = EXCLUDED.saved_at`,
            [teacherId, dateKey, rec.presentIds ?? [], rec.savedAt ?? null],
          );
        }
      }
    }

    await client.query("COMMIT");
    return { imported: true };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    return { imported: false };
  } finally {
    client.release();
  }
}
