import { encryptData } from '../crypto.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  
  // 鉴权已由 /api/_middleware.js 统一处理

  const db = env.DB;
  const id = params.id[0];

  // DELETE: 删除账号记录
  if (request.method === 'DELETE') {
    try {
      await db.prepare("DELETE FROM accounts WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "删除失败" }), { status: 500 });
    }
  }

  // PATCH: 更新账号状态 (存活/封禁)
  if (request.method === 'PATCH') {
    try {
      const data = await request.json();
      if (data.status) {
        await db.prepare("UPDATE accounts SET status = ? WHERE id = ?").bind(data.status, id).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: "参数不完整" }), { status: 400 });
    } catch (error) {
      return new Response(JSON.stringify({ error: "更新失败" }), { status: 500 });
    }
  }

  // PUT: 更新完整账号记录 (新增全字段覆盖接口)
  if (request.method === 'PUT') {
    try {
      const data = await request.json();
      
      const encryptedEmail = await encryptData(data.email, env.AES_SECRET_KEY);
      const encryptedTwoFactor = await encryptData(data.twoFactor, env.AES_SECRET_KEY);

      await db.prepare(
        "UPDATE accounts SET email = ?, password = ?, twoFactor = ?, cost = ?, status = ?, date = ?, description = ? WHERE id = ?"
      ).bind(
        encryptedEmail,
        'MERGED_DATA',
        encryptedTwoFactor,
        data.cost || 0,
        data.status || 'alive',
        data.date,
        data.description || '',
        id
      ).run();
      
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: "完整更新失败" }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
