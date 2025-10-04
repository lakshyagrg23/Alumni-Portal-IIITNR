// Browser-side ECDH + AES-GCM helpers for simple E2E
// Uses Web Crypto API

const subtle = window.crypto.subtle;

export async function generateKeyPair() {
  const keyPair = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  return keyPair;
}

export async function exportPublicKey(key) {
  const raw = await subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importPublicKey(base64) {
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return await subtle.importKey('raw', binary.buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

export async function deriveSharedSecret(privateKey, publicKey) {
  const derivedBits = await subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
  return derivedBits; // ArrayBuffer
}

export async function deriveAESGCMKey(sharedSecret) {
  return await subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveKey']).then((hk) => {
    return subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(16), info: new Uint8Array(0) },
      hk,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  });
}

export async function encryptMessage(aesKey, plaintext) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(plaintext));
  return { iv: btoa(String.fromCharCode(...iv)), ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))) };
}

export async function decryptMessage(aesKey, ivB64, cipherB64) {
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const dec = await subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipher.buffer);
  return new TextDecoder().decode(dec);
}

export default {}
