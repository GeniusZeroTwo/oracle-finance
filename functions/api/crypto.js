// functions/api/crypto.js


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

  // 如果不是 AESGCM 加密格式，直接返回原文 (当作明文处理)
  return cipherText;
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
