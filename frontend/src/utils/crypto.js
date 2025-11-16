// Browser-side ECDH + AES-GCM helpers for simple E2E
// Uses Web Crypto API

const { subtle } = window.crypto;

export async function generateKeyPair() {
  return await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
}

export async function exportPublicKey(key) {
  const raw = await subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function exportPrivateKey(privateKey) {
  // Export as JWK for portability
  const jwk = await subtle.exportKey('jwk', privateKey);
  return btoa(JSON.stringify(jwk));
}

export async function importPrivateKey(jwkB64) {
  const jwk = JSON.parse(atob(jwkB64));
  return await subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
}

export async function importPublicKey(base64) {
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return await subtle.importKey('raw', binary.buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

export async function deriveSharedSecret(privateKey, publicKey) {
  return await subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
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
