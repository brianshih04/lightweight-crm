import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `密碼至少需要 ${PASSWORD_MIN_LENGTH} 個字元`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `密碼不可超過 ${PASSWORD_MAX_LENGTH} 個字元`;
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${HASH_PREFIX}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedPassword: string): Promise<boolean> {
  const [prefix, saltValue, hashValue] = storedPassword.split("$");
  if (prefix !== HASH_PREFIX || !saltValue || !hashValue) {
    // Transitional support for existing installations. A successful legacy login
    // is immediately upgraded to a scrypt hash by the login route.
    const provided = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    return provided.length === stored.length && timingSafeEqual(provided, stored);
  }

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function passwordNeedsUpgrade(storedPassword: string): boolean {
  return !storedPassword.startsWith(`${HASH_PREFIX}$`);
}
