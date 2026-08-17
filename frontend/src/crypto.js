const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

const toBase64 = (bytes) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const deriveKey = async (passphrase, saltHex) => {
  const enc = new TextEncoder();
  const salt = fromBase64(saltHex);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const looksLikeEncryptedBlob = (value) => typeof value === 'string' && value.startsWith('enc:v1:');

export const encryptSyncBlob = async (plaintext, passphrase, teacherId) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(`${passphrase}:${teacherId}`, toBase64(salt));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    TEXT_ENCODER.encode(plaintext)
  );

  const payload = {
    v: 1,
    iv: toBase64(iv),
    salt: toBase64(salt),
    ct: toBase64(new Uint8Array(encrypted))
  };

  return `enc:v1:${btoa(JSON.stringify(payload))}`;
};

export const decryptSyncBlob = async (ciphertext, passphrase, teacherId) => {
  const encoded = ciphertext.replace(/^enc:v1:/, '');
  const payload = JSON.parse(atob(encoded));
  const key = await deriveKey(`${passphrase}:${teacherId}`, payload.salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ct)
  );

  return TEXT_DECODER.decode(decrypted);
};
