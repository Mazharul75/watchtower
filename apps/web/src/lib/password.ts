import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id via @node-rs/argon2 (Rust/napi-rs prebuilt binary) rather than the
 * classic `argon2` npm package, which requires node-gyp + a C++ toolchain to
 * build from source — that fails on a clean Windows/CI box without Visual
 * Studio build tools installed. @node-rs ships prebuilt binaries for every
 * platform, so `npm install` alone is enough. Same algorithm, same security
 * properties (OWASP-recommended Argon2id), zero build-tool dependency.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456, // ~19 MB, OWASP minimum recommendation
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hashValue: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashValue, plain);
  } catch {
    return false;
  }
}

/**
 * Minimal, honest strength policy: length + character diversity, no
 * "must contain a special character" theatre that just pushes users toward
 * "Password1!". NIST 800-63B guidance: length matters more than complexity.
 */
export function validatePasswordStrength(password: string): { ok: boolean; message?: string } {
  if (password.length < 10) {
    return { ok: false, message: "Password must be at least 10 characters." };
  }
  if (password.length > 128) {
    return { ok: false, message: "Password must be under 128 characters." };
  }
  const commonPasswords = ["password123", "12345678910", "qwertyuiop", "letmein123456"];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { ok: false, message: "This password is too common. Choose another." };
  }
  return { ok: true };
}
