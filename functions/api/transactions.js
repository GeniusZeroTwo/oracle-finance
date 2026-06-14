// 这是一个融合了 Token 鉴权和 D1 数据库操作的综合后端路由
// 只有携带合法 Token 才能读写数据库
export async function onRequest(context) {
  const { request, env } = context;
  
  // ==========================================
  // 安全拦截器 (Middleware 逻辑)
  // ==========================================
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response("未授权访问，缺失 Token", { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  // 去 KV 检查这个 Token 是否有效
  const isValidSession = await env.AUTH_KV.get(`session:${token}`);
  if (!isValidSession) {
    return new Response("登录已过期，请重新验证", { status: 401 });
  }

  // ==========================================
  // 业务逻辑 (D1 数据库读写)
  // ==========================================
  const db = env.DB; // 之前绑定的 D1 数据库

  // 处理 GET 请求：获取所有数据
  if (request.method === 'GET') {
    const { results } = await db.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 处理 POST 请求：添加新数据
  if (request.method === 'POST') {
    const data = await request.json();
    await db.prepare(
      "INSERT INTO transactions (id, type, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(data.id, data.type, data.amount, data.category, data.date, data.description).run();
    
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  }

  return new Response("Method not allowed", { status: 405 });
}
