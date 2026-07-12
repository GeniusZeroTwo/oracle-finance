import { encryptData, decryptData } from './crypto.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  // 鉴权已由 /api/_middleware.js 统一处理

  const db = env.DB;

  // GET: 获取所有账号库存并解密返回明文
  if (request.method === 'GET') {
    const { results } = await db.prepare("SELECT * FROM accounts ORDER BY date DESC").all();
    
    const decryptedResults = await Promise.all(results.map(async (acc) => {
      let decryptedAccountData = '';
      if (acc.password === 'MERGED_DATA') {
        decryptedAccountData = await decryptData(acc.email, env.AES_SECRET_KEY);
      } else {
        const decryptedOldPassword = await decryptData(acc.password, env.AES_SECRET_KEY);
        decryptedAccountData = acc.email + '----' + decryptedOldPassword;
      }
      const decryptedTwoFactor = await decryptData(acc.twoFactor, env.AES_SECRET_KEY);
      
      return {
        ...acc,
        email: decryptedAccountData,
        password: 'MERGED_DATA',
        twoFactor: decryptedTwoFactor
      };
    }));

    return new Response(JSON.stringify(decryptedResults), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // POST: 录入新账号 (后端加密)
  if (request.method === 'POST') {
    const data = await request.json();
    
    const encryptedEmail = await encryptData(data.email, env.AES_SECRET_KEY);
    const encryptedTwoFactor = await encryptData(data.twoFactor, env.AES_SECRET_KEY);

    await db.prepare(
      "INSERT INTO accounts (id, email, password, twoFactor, cost, status, date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      data.id, 
      encryptedEmail, 
      'MERGED_DATA', 
      encryptedTwoFactor, 
      data.cost || 0, 
      data.status, 
      data.date, 
      data.description || ''
    ).run();
    
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  }

  return new Response("Method not allowed", { status: 405 });
}
