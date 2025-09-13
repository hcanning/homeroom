import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

// Paths for storing encryption key and encrypted DB
const DATA_DIR = path.join(process.cwd(), "server", "data");
const KEY_PATH = path.join(DATA_DIR, "secure-key.json");
const DB_PATH = path.join(DATA_DIR, "secure-db.json");

export interface SecureEnvelope {
  iv: string; // base64
  authTag: string; // base64
  ciphertext: string; // base64
}

// Initialize data dir
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

// Load or create a persistent 32-byte key
function loadKey(): Buffer {
  ensureDataDir();
  if (!existsSync(KEY_PATH)) {
    const key = randomBytes(32);
    writeFileSync(
      KEY_PATH,
      JSON.stringify({ key: key.toString("base64") }, null, 2),
    );
    return key;
  }
  const raw = JSON.parse(readFileSync(KEY_PATH, "utf-8"));
  return Buffer.from(raw.key, "base64");
}

const KEY = loadKey();

// Encrypt arbitrary JSON
export function encryptJSON(value: unknown): SecureEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf-8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptJSON<T = unknown>(env: SecureEnvelope): T {
  const iv = Buffer.from(env.iv, "base64");
  const authTag = Buffer.from(env.authTag, "base64");
  const ciphertext = Buffer.from(env.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf-8"));
}

export type DBShape = {
  admin: { email: string; passwordHash: string; createdAt: string } | null;
  teachers: Record<
    string,
    {
      id: string;
      email: string;
      passwordHash: string;
      name: string;
      pronouns?: string;
      dept?: string;
      photoUrl?: string;
      homeroom?: string;
      createdAt: string;
    }
  >;
  students: Record<
    string,
    Record<
      string,
      {
        id: string;
        teacherId: string;
        name: string;
        pronouns?: string;
        dept?: string;
        photoUrl?: string;
        createdAt: string;
      }
    >
  >; // students grouped by teacherId
  attendance?: Record<
    string,
    Record<string, { presentIds: string[]; savedAt: string }>
  >; // teacherId -> dateKey -> record
};

const DEFAULT_DB: DBShape = {
  admin: null,
  teachers: {},
  students: {},
  attendance: {},
};

export function readDB(): DBShape {
  ensureDataDir();
  if (!existsSync(DB_PATH)) {
    persistDB(DEFAULT_DB);
    return { ...DEFAULT_DB };
  }
  const raw = JSON.parse(readFileSync(DB_PATH, "utf-8")) as SecureEnvelope;
  try {
    return decryptJSON<DBShape>(raw);
  } catch {
    // If decryption fails, do not overwrite; throw for visibility
    throw new Error(
      "Failed to decrypt secure database. Key mismatch or file corruption.",
    );
  }
}

export function persistDB(db: DBShape): void {
  ensureDataDir();
  const env = encryptJSON(db);
  writeFileSync(DB_PATH, JSON.stringify(env, null, 2));
}

// Minimal password hashing using scrypt with random salt
// format: scrypt$N$r$p$saltBase64$dkBase64
export function hashPassword(password: string): string {
  const N = 16384,
    r = 8,
    p = 1;
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nStr, rStr, pStr, saltB64, dkB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const N = parseInt(nStr, 10),
      r = parseInt(rStr, 10),
      p = parseInt(pStr, 10);
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(dkB64, "base64");
    const key = scryptSync(password, salt, expected.length, { N, r, p });
    return timingSafeEqualFast(key, expected);
  } catch {
    return false;
  }
}

function timingSafeEqualFast(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}
