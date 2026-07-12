// functions/api/crypto.js

// 历史遗留 RC4 密钥 (原前端硬编码密钥，用于兼容解密老数据)
const LEGACY_RC4_KEY = 'oracle_finance_secure_key_2026_CHANGE_ME';
const LEGACY_XOR_KEY = 'fallback_local_secret_key_2026';

const rc4 = (key, str) => {
  let s = [], j = 0, x, res = '';
  for (let i = 0; i < 256; i++) { s[i] = i; }
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
  }
  let i = 0; j = 0;
  for (let y = 0; y < str.length; y++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
    res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
  }
  return res;
};

export async function decryptData(cipherText, envKey) {
  if (!cipherText) return '';

  // 1. 新版后端 AES-GCM 解密
  if (cipherText.startsWith('AESGCM_')) {
    try {
      const parts = cipherText.split('_');
      if (parts.length !== 3) return cipherText;
      const ivBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
      const cipherBytes = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
      
      const keyString = envKey || 'default_backend_secret_key_2026_CHANGE_ME';
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(keyString.padEnd(32, '0').slice(0, 32)),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      
      const plaintextBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        keyMaterial,
        cipherBytes
      );
      return new TextDecoder().decode(plaintextBuffer);
    } catch (e) {
      console.error("AES-GCM 解密失败", e);
      return cipherText;
    }
  }

  // 2. 旧版 RC4 解密
  if (cipherText.startsWith('V2_')) {
    try {
      const actualCipher = cipherText.substring(3);
      const decryptedText = decodeURIComponent(rc4(LEGACY_RC4_KEY, atob(actualCipher)));
      if (decryptedText) return decryptedText;
    } catch (e) {
      // ignore
    }
  }

  // 3. 旧版 XOR 解密
  if (!/^[a-zA-Z0-9+/]*={0,2}$/.test(cipherText)) {
    return cipherText; // 不是 base64 则认为是明文
  }

  try {
    const decoded = atob(cipherText);
    const text = decodeURIComponent(decoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ LEGACY_XOR_KEY.charCodeAt(i % LEGACY_XOR_KEY.length));
    }
    return result || cipherText;
  } catch (error) {
    return cipherText;
  }
}

export async function encryptData(text, envKey) {
  if (!text) return '';
  const keyString = envKey || 'default_backend_secret_key_2026_CHANGE_ME';
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyString.padEnd(32, '0').slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    enc.encode(text)
  );
  
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
  
  return `AESGCM_${ivBase64}_${cipherBase64}`;
}
