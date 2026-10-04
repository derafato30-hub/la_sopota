// Custom lightweight TOTP implementation using Web Crypto API
// No dependencies required (Removes need for otplib and node polyfills)

const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBuf(base32) {
  let bits = '';
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    if (val === -1) throw new Error('Invalid base32 character in key');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

export function generateSecret(length = 20) {
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);
  let bits = '';
  for (let i = 0; i < randomBytes.length; i++) {
    bits += randomBytes[i].toString(2).padStart(8, '0');
  }
  let base32 = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    base32 += base32chars.charAt(parseInt(bits.substring(i, i + 5), 2));
  }
  return base32;
}

export function generateURI({ label, issuer, secret }) {
  return \`otpauth://totp/\${encodeURIComponent(issuer)}:\${encodeURIComponent(label)}?secret=\${secret}&issuer=\${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30\`;
}

export async function verifySync({ token, secret, window = 1 }) {
  const keyBuf = base32ToBuf(secret);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuf,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const timeStep = Math.floor(Date.now() / 1000 / 30);

  // Check current time step and +/- window for drift
  for (let i = -window; i <= window; ++i) {
    const ts = timeStep + i;
    
    // Convert 64-bit counter to 8-byte buffer
    const msg = new Uint8Array(8);
    let temp = ts;
    for (let j = 7; j >= 0; j--) {
      msg[j] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }

    const signature = await window.crypto.subtle.sign('HMAC', key, msg);
    const hmac = new Uint8Array(signature);

    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;

    const codeStr = code.toString().padStart(6, '0');
    if (codeStr === token) return true;
  }
  return false;
}
