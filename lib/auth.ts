// lib/auth.ts
// Gestión de autenticación por PIN y sesión firmada compatible con Edge Runtime y Node.js

const SESSION_SECRET = process.env.SESSION_SECRET || "alegra_inv_secret_session_key_2024_secure_hmac";
const DEFAULT_PIN = "1219";

export const SESSION_COOKIE_NAME = "alegra_admin_session";
export const SESSION_MAX_AGE_DAYS = 30;
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

/**
 * Obtiene el PIN maestro configurado.
 * Prioriza variable de entorno ADMIN_PIN, con fallback a 1219.
 */
export function getAdminPin(): string {
  return process.env.ADMIN_PIN || DEFAULT_PIN;
}

/**
 * Valida si el PIN ingresado coincide con el PIN configurado.
 */
export function validatePin(pin: string): boolean {
  if (!pin) return false;
  return pin.trim() === getAdminPin().trim();
}

/**
 * Genera la clave CryptoKey para HMAC-SHA256 usando Web Crypto API.
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Genera un token de sesión firmado con HMAC-SHA256 y expiración de 30 días.
 */
export async function createSessionToken(): Promise<string> {
  const pin = getAdminPin();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `alegra_auth:${expiresAt}:${pin}`;
  const enc = new TextEncoder();
  const key = await getCryptoKey();
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `v1.${expiresAt}.${sigHex}`;
}

/**
 * Verifica la autenticidad y vigencia de un token de sesión.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const expiresAt = parseInt(parts[1], 10);
  if (isNaN(expiresAt) || expiresAt < Date.now()) {
    return false; // Token expirado o malformado
  }

  const currentPin = getAdminPin();
  const payload = `alegra_auth:${expiresAt}:${currentPin}`;
  const enc = new TextEncoder();
  const key = await getCryptoKey();
  const expectedSigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expectedSigHex = Array.from(new Uint8Array(expectedSigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return parts[2] === expectedSigHex;
}
