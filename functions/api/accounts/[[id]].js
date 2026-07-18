import { encryptData, decryptData } from '../crypto.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const db = env.DB;
    // [[id]] catch-all gives an array, or undefined if no path segments
    const id = (params.id && params.id.length > 0) ? params.id[0] : undefined;

    // ==========================================
    // 根路径路由 (/api/accounts)
    // ==========================================
    if (!id) {
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
          const decryptedEmailTwoFactor = await decryptData(acc.email2fa, env.AES_SECRET_KEY);
          const decryptedVerificationCode = await decryptData(acc.verificationCode, env.AES_SECRET_KEY);

          return {
            ...acc,
            email: decryptedAccountData,
            password: 'MERGED_DATA',
            twoFactor: decryptedTwoFactor,
            email2fa: decryptedEmailTwoFactor,
            verificationCode: decryptedVerificationCode
          };
        }));

        return new Response(JSON.stringify(decryptedResults), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'POST') {
        const data = await request.json();

        const encryptedEmail = await encryptData(data.email, env.AES_SECRET_KEY);
        const encryptedTwoFactor = await encryptData(data.twoFactor, env.AES_SECRET_KEY);
        const encryptedEmailTwoFactor = await encryptData(data.email2fa, env.AES_SECRET_KEY);
        const encryptedVerificationCode = await encryptData(data.verificationCode, env.AES_SECRET_KEY);

        await db.prepare(
          "INSERT INTO accounts (id, email, password, twoFactor, cost, status, date, description, region, email2fa, verificationCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          data.id,
          encryptedEmail,
          'MERGED_DATA',
          encryptedTwoFactor,
          data.cost || 0,
          data.status,
          data.date,
          data.description || '',
          data.region || '',
          encryptedEmailTwoFactor,
          encryptedVerificationCode
        ).run();

        return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: `Method not allowed on root: ${request.method}` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    // ==========================================
    // ID 路径路由 (/api/accounts/:id)
    // ==========================================
    if (request.method === 'DELETE') {
      await db.prepare("DELETE FROM accounts WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'PATCH') {
      const data = await request.json();
      if (data.status) {
        await db.prepare("UPDATE accounts SET status = ? WHERE id = ?").bind(data.status, id).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: "参数不完整" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'PUT') {
      const data = await request.json();
      
      const encryptedEmail = await encryptData(data.email, env.AES_SECRET_KEY);
      const encryptedTwoFactor = await encryptData(data.twoFactor, env.AES_SECRET_KEY);
      const encryptedEmailTwoFactor = await encryptData(data.email2fa, env.AES_SECRET_KEY);
      const encryptedVerificationCode = await encryptData(data.verificationCode, env.AES_SECRET_KEY);

      await db.prepare(
        "UPDATE accounts SET email = ?, password = ?, twoFactor = ?, cost = ?, status = ?, date = ?, description = ?, region = ?, email2fa = ?, verificationCode = ? WHERE id = ?"
      ).bind(
        encryptedEmail,
        'MERGED_DATA',
        encryptedTwoFactor,
        data.cost || 0,
        data.status || 'alive',
        data.date,
        data.description || '',
        data.region || '',
        encryptedEmailTwoFactor,
        encryptedVerificationCode,
        id
      ).run();
      
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `Method not allowed on ID route: ${request.method}` }), { status: 405, headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('accounts/[[id]].js 顶层错误:', e.message, e.stack);
    return new Response(JSON.stringify({ error: "服务器内部错误: " + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

