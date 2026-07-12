import { encryptData } from '../crypto.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  
  // 鉴权已由 /api/_middleware.js 统一处理

  try {
    const db = env.DB;
    const id = params.id;

    // DELETE: 删除账号记录
    if (request.method === 'DELETE') {
      await db.prepare("DELETE FROM accounts WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // PATCH: 更新账号状态 (存活/封禁)
    if (request.method === 'PATCH') {
      const data = await request.json();
      if (data.status) {
        await db.prepare("UPDATE accounts SET status = ? WHERE id = ?").bind(data.status, id).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: "参数不完整" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // PUT: 更新完整账号记录 (全字段覆盖)
    if (request.method === 'PUT') {
      const data = await request.json();
      
      const encryptedEmail = await encryptData(data.email, env.AES_SECRET_KEY);
      const encryptedTwoFactor = await encryptData(data.twoFactor, env.AES_SECRET_KEY);

      await db.prepare(
        "UPDATE accounts SET email = ?, password = ?, twoFactor = ?, cost = ?, status = ?, date = ?, description = ?, region = ? WHERE id = ?"
      ).bind(
        encryptedEmail,
        'MERGED_DATA',
        encryptedTwoFactor,
        data.cost || 0,
        data.status || 'alive',
        data.date,
        data.description || '',
        data.region || '',
        id
      ).run();
      
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('accounts/[[id]].js 顶层错误:', e.message, e.stack);
    return new Response(JSON.stringify({ error: "服务器内部错误: " + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

