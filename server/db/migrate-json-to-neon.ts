import "dotenv/config";
import { getPool, ensureSchema } from "./neon";
import { readDB, type DBShape } from "../lib/secure-store";

async function main() {
  const pool = getPool();
  if (!pool) {
    console.error("NEON_DATABASE_URL not set or pool unavailable.");
    process.exit(1);
  }
  await ensureSchema();

  const db: DBShape = readDB();
  const admin = db.admin;
  const teachers = Object.values(db.teachers);
  const students: any[] = [];
  for (const [tid, group] of Object.entries(db.students)) {
    for (const s of Object.values(group)) students.push(s);
  }
  const attendance: { teacherId: string; dateKey: string; presentIds: string[]; savedAt?: string }[] = [];
  if (db.attendance) {
    for (const [tid, byDate] of Object.entries(db.attendance)) {
      for (const [dk, rec] of Object.entries(byDate)) {
        attendance.push({ teacherId: tid, dateKey: dk, presentIds: (rec as any).presentIds ?? (rec as any).present ?? [], savedAt: (rec as any).savedAt });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (admin) {
      await client.query(
        `INSERT INTO admins (email, password_hash, created_at)
         VALUES ($1, $2, COALESCE($3::timestamptz, now()))
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [admin.email, admin.passwordHash, admin.createdAt ?? null],
      );
    }

    for (const t of teachers) {
      await client.query(
        `INSERT INTO teachers (id, email, password_hash, name, pronouns, dept, photo_url, homeroom, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9::timestamptz, now()))
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           pronouns = EXCLUDED.pronouns,
           dept = EXCLUDED.dept,
           photo_url = EXCLUDED.photo_url,
           homeroom = EXCLUDED.homeroom`,
        [
          (t as any).id,
          (t as any).email,
          (t as any).passwordHash,
          (t as any).name,
          (t as any).pronouns ?? null,
          (t as any).dept ?? null,
          (t as any).photoUrl ?? null,
          (t as any).homeroom ?? null,
          (t as any).createdAt ?? null,
        ],
      );
    }

    for (const s of students) {
      await client.query(
        `INSERT INTO students (id, teacher_id, name, pronouns, dept, photo_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7::timestamptz, now()))
         ON CONFLICT (id) DO UPDATE SET
           teacher_id = EXCLUDED.teacher_id,
           name = EXCLUDED.name,
           pronouns = EXCLUDED.pronouns,
           dept = EXCLUDED.dept,
           photo_url = EXCLUDED.photo_url`,
        [
          (s as any).id,
          (s as any).teacherId,
          (s as any).name,
          (s as any).pronouns ?? null,
          (s as any).dept ?? null,
          (s as any).photoUrl ?? null,
          (s as any).createdAt ?? null,
        ],
      );
    }

    for (const a of attendance) {
      await client.query(
        `INSERT INTO attendance (teacher_id, date_key, present_ids, saved_at)
         VALUES ($1, $2::date, $3, COALESCE($4::timestamptz, now()))
         ON CONFLICT (teacher_id, date_key) DO UPDATE SET
           present_ids = EXCLUDED.present_ids,
           saved_at = EXCLUDED.saved_at`,
        [a.teacherId, a.dateKey, a.presentIds, a.savedAt ?? null],
      );
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ migrated: { admin: !!admin, teachers: teachers.length, students: students.length, attendance: attendance.length } }));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

main();
