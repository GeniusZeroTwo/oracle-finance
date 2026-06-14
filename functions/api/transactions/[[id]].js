// 处理带 ID 路径的删除请求
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  
  try {
    // 1. 安全鉴权（检查 Header 是否携带 Token）
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "未授权操作" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    const token = authHeader.split(' ')[1];
    const isValidSession = await env.AUTH_KV.get(`session:${token}`);
    if (!isValidSession) {
      return new Response(JSON.stringify({ error: "登录已过期" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. 执行删除
    const id = params.id[0];
    await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
    
    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
    
  } catch (error) {
    // 容灾处理：如果数据库删除失败，返回规范的 500 错误
    return new Response(JSON.stringify({ error: "服务器内部错误" }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
