export async function onRequest(context) {
  const { request, env } = context;
  
  // 安全拦截：Token 鉴权
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response("未授权访问", { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  const isValidSession = await env.AUTH_KV.get(`session:${token}`);
  if (!isValidSession) {
    return new Response("登录已过期", { status: 401 });
  }

  const db = env.DB;

  // GET: 获取所有账号库存
  if (request.method === 'GET') {
    const { results } = await db.prepare("SELECT * FROM accounts ORDER BY date DESC").all();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // POST: 录入新账号 (此时接收到的 password 和 twoFactor 已是 AES 密文)
  if (request.method === 'POST') {
    const data = await request.json();
    await db.prepare(
      "INSERT INTO accounts (id, email, password, twoFactor, cost, status, date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      data.id, 
      data.email, 
      data.password, 
      data.twoFactor || '', 
      data.cost || 0, 
      data.status, 
      data.date, 
      data.description || ''
    ).run();
    
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  }

  return new Response("Method not allowed", { status: 405 });
}
