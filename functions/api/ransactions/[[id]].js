// 处理带 ID 路径的删除请求
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  
  // 1. 安全鉴权（同上）
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return new Response("未授权", { status: 401 });
  const token = authHeader.split(' ')[1];
  const isValidSession = await env.AUTH_KV.get(`session:${token}`);
  if (!isValidSession) return new Response("过期", { status: 401 });

  // 2. 执行删除
  const id = params.id[0];
  await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
