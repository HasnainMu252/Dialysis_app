import crypto from 'crypto';

// Base32 (RFC 4648) helpers for the shared secret.
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const generateBase32Secret = (length = 20) => {
  const bytes = crypto.randomBytes(length);
  let bits = '';
  bytes.forEach((b) => { bits += b.toString(2).padStart(8, '0'); });
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += B32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
};

const base32ToBuffer = (base32) => {
  const clean = String(base32).replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = '';
  for (const char of clean) {
    const idx = B32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const hotp = (secretBuffer, counter, digits = 6) => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secretBuffer).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, '0');
};

// Verify a TOTP token allowing +/-1 time-step for clock drift.
export const verifyTotp = (base32Secret, token, step = 30, window = 1) => {
  if (!base32Secret || !token) return false;
  const secret = base32ToBuffer(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / step);
  const candidate = String(token).replace(/\s/g, '');
  for (let error = -window; error <= window; error += 1) {
    if (hotp(secret, counter + error) === candidate) return true;
  }
  return false;
};

// otpauth:// URI for authenticator apps (Google Authenticator, Authy, etc.)
export const buildOtpAuthUrl = (secret, email, issuer = 'Dialysis CRM') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
