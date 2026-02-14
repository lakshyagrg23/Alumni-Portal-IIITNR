// Encryption Key Debugging Script
// Copy & paste this into browser console to diagnose decryption issues

// Check 1: Are keys stored?
console.log('=== KEY STORAGE CHECK ===');
const pub = localStorage.getItem('e2e_pub_raw');
const priv = localStorage.getItem('e2e_priv_jwk');
const pw = localStorage.getItem('e2e_decrypt_pw');

console.log('Public key exists:', !!pub);
console.log('Private key exists:', !!priv);
console.log('Decrypt password exists:', !!pw);
console.log('Password value:', pw); // Should be an email like "test@gmail.com"

// Check 2: Get verified email from JWT
console.log('\n=== JWT EMAIL CHECK ===');
const token = localStorage.getItem('token');
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Verified email from JWT:', payload.email);
  console.log('Email matches password:', payload.email.toLowerCase() === pw);
} else {
  console.log('No token found');
}

// Check 3: Are keys in sessionStorage too?
console.log('\n=== SESSION STORAGE CHECK ===');
const sessPriv = sessionStorage.getItem('e2e_priv_jwk');
const sessPub = sessionStorage.getItem('e2e_pub_raw');
const sessPw = sessionStorage.getItem('e2e_decrypt_pw');

console.log('SessionStorage - Priv exists:', !!sessPriv);
console.log('SessionStorage - Pub exists:', !!sessPub);
console.log('SessionStorage - Pw exists:', !!sessPw);

// Check 4: Try to import private key
console.log('\n=== PRIVATE KEY IMPORT CHECK ===');
(async () => {
  try {
    const crypto = (await import('/src/utils/crypto.js')).default || (await import('/src/utils/crypto.js'));
    
    if (!priv) {
      console.error('Private key not found in localStorage');
      return;
    }
    
    console.log('Attempting to import private key...');
    const importedPrivKey = await crypto.importPrivateKey(priv);
    console.log('✅ Private key imported successfully');
    console.log('Key type:', importedPrivKey.type);
    console.log('Key usages:', importedPrivKey.usages);
  } catch (err) {
    console.error('❌ Failed to import private key:', err.message);
    console.error('Private key format (first 100 chars):', priv?.substring(0, 100));
  }
})();

// Check 5: Try to import public key
console.log('\n=== PUBLIC KEY IMPORT CHECK ===');
(async () => {
  try {
    const crypto = (await import('/src/utils/crypto.js')).default || (await import('/src/utils/crypto.js'));
    
    if (!pub) {
      console.error('Public key not found in localStorage');
      return;
    }
    
    console.log('Attempting to import public key...');
    const importedPubKey = await crypto.importPublicKey(pub);
    console.log('✅ Public key imported successfully');
    console.log('Key type:', importedPubKey.type);
    console.log('Key usages:', importedPubKey.usages);
  } catch (err) {
    console.error('❌ Failed to import public key:', err.message);
  }
})();

// Check 6: Download keys for inspection
console.log('\n=== EXPORT KEYS FOR INSPECTION ===');
const keysData = {
  public_key: pub ? pub.substring(0, 100) + '...' : null,
  private_key: priv ? priv.substring(0, 100) + '...' : null,
  password: pw,
  timestamp: new Date().toISOString()
};
console.log(JSON.stringify(keysData, null, 2));

console.log('\n=== MANUAL DECRYPTION TEST ===');
console.log('To test decryption with a specific message, use:');
console.log('window.testDecrypt(messageIV, messageCiphertext, senderPublicKey)');
console.log('Example: window.testDecrypt("UhbAqrRYFVCYRNNy", "tbDVkw+T5pY1O8j+gXtJYhnnPaECn0Javx5Lg1Eg1wY=", senderPubKeyFromServer)');

// Manual decryption test function
window.testDecrypt = async (iv, ciphertext, senderPubKeyString) => {
  try {
    console.log('\n=== MANUAL DECRYPTION TEST ===');
    const crypto = (await import('/src/utils/crypto.js')).default || (await import('/src/utils/crypto.js'));
    
    const privKeyStr = localStorage.getItem('e2e_priv_jwk');
    const pubKeyStr = localStorage.getItem('e2e_pub_raw');
    
    if (!privKeyStr || !pubKeyStr) {
      console.error('Keys not found in localStorage');
      return;
    }
    
    console.log('Step 1: Import own private key');
    const privateKey = await crypto.importPrivateKey(privKeyStr);
    console.log('✅ Private key imported');
    
    console.log('Step 2: Import sender public key');
    const senderPubKey = await crypto.importPublicKey(senderPubKeyString);
    console.log('✅ Sender public key imported');
    
    console.log('Step 3: Derive shared secret');
    const shared = await crypto.deriveSharedSecret(privateKey, senderPubKey);
    console.log('✅ Shared secret derived');
    
    console.log('Step 4: Derive AES-GCM key');
    const aesKey = await crypto.deriveAESGCMKey(shared);
    console.log('✅ AES-GCM key derived');
    
    console.log('Step 5: Decrypt message');
    const plain = await crypto.decryptMessage(aesKey, iv, ciphertext);
    console.log('✅ Message decrypted!');
    console.log('Decrypted content:', plain);
    return plain;
    
  } catch (err) {
    console.error('❌ Decryption failed:', err.message);
    console.error('Full error:', err);
    throw err;
  }
};

console.log('\n=== DEBUG INFO COLLECTED ===');
console.log('Check the logs above to identify the issue.');
console.log('Common issues:');
console.log('1. Keys not in localStorage - Login again');
console.log('2. Password mismatch - Email changed since encryption');
console.log('3. Key import failed - Keys might be corrupted');
console.log('4. AES key derivation failed - Wrong private key for this message');
