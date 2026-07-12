// 这是一个融合了 Token 鉴权和 D1 数据库操作的综合后端路由
// 只有携带合法 Token 才能读写数据库
export async function onRequest(context) {
  const { request, env } = context;

  // 鉴权已由 /api/_middleware.js 统一处理

  // ==========================================
  // 业务逻辑 (D1 数据库读写)
  // ==========================================
  const db = env.DB; // 之前绑定的 D1 数据库

  // 处理 GET 请求：获取所有数据
  if (request.method === 'GET') {
    try {
      const { results } = await db.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "数据库读取失败: " + e.message }), { status: 500 });
    }
  }

  // 处理 POST 请求：添加新数据
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      await db.prepare(
        "INSERT INTO transactions (id, type, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(data.id, data.type, data.amount, data.category, data.date, data.description || '').run();
      return new Response(JSON.stringify({ success: true }), { status: 201 });
    } catch (e) {
      return new Response(JSON.stringify({ error: "保存失败: " + e.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
