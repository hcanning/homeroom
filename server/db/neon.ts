import { Pool } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool | null {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!url) return null;
  if (_pool) return _pool;
  _pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  return _pool;
}

export async function ensureSchema() {
  const pool = getPool();
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      pronouns TEXT,
      dept TEXT,
      photo_url TEXT,
      homeroom TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      pronouns TEXT,
      dept TEXT,
      photo_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS attendance (
      teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      date_key DATE NOT NULL,
      present_ids TEXT[] NOT NULL DEFAULT '{}',
      saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (teacher_id, date_key)
    );
  `);
}
