// functions/api/crypto.js

async function getDerivedKey(keyString, usage) {
  const enc = new TextEncoder();
  const keyHash = await crypto.subtle.digest("SHA-256", enc.encode(keyString));
  return await crypto.subtle.importKey(
    "raw",
    keyHash,
    { name: "AES-GCM" },
    false,
    [usage]
  );
}

async function getLegacyKey(keyString, usage) {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode((keyString || '').padEnd(32, '0').slice(0, 32)),
    { name: "AES-GCM" },
    false,
    [usage]
  );
}

export async function decryptData(cipherText, envKey) {
  if (!cipherText) return '';

  // 1. 新版安全密钥派生 AES-GCM 解密 (V2: SHA-256 KDF)
  if (cipherText.startsWith('AESGCM_V2_')) {
    try {
      const parts = cipherText.split('_');
      if (parts.length !== 4) return cipherText;
      const ivBytes = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
      const cipherBytes = Uint8Array.from(atob(parts[3]), c => c.charCodeAt(0));
      
      if (!envKey) {
        console.error("AESGCM_V2 解密失败：缺少 AES_SECRET_KEY 环境变量");
        return '[加密配置异常：缺少密钥]';
      }
      
      const keyMaterial = await getDerivedKey(envKey, "decrypt");
      const plaintextBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        keyMaterial,
        cipherBytes
      );
      return new TextDecoder().decode(plaintextBuffer);
    } catch (e) {
      console.error("AESGCM_V2 解密失败:", e);
      return cipherText;
    }
  }

  // 2. 旧版向后兼容 AES-GCM 解密 (V1: padEnd 32 字节直接截取)
  if (cipherText.startsWith('AESGCM_')) {
    try {
      const parts = cipherText.split('_');
      if (parts.length !== 3) return cipherText;
      const ivBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
      const cipherBytes = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
      
      // 优先使用用户配置的 envKey，若未配置则尝试旧默认密钥以确保历史数据可救回
      const keyString = envKey || 'default_backend_secret_key_2026_CHANGE_ME';
      const keyMaterial = await getLegacyKey(keyString, "decrypt");
      
      const plaintextBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        keyMaterial,
        cipherBytes
      );
      return new TextDecoder().decode(plaintextBuffer);
    } catch (e) {
      console.error("AES-GCM 旧版兼容解密失败:", e);
      return cipherText;
    }
  }

  // 如果不是 AESGCM 加密格式，直接返回原文 (当作明文处理)
  return cipherText;
}

export async function encryptData(text, envKey) {
  if (!text) return '';
  if (!envKey) {
    throw new Error("安全配置缺失：未配置 AES_SECRET_KEY 环境变量，系统拒绝写入敏感数据");
  }
  
  const keyMaterial = await getDerivedKey(envKey, "encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    enc.encode(text)
  );
  
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
  
  return `AESGCM_V2_${ivBase64}_${cipherBase64}`;
}
