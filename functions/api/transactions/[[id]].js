// 处理带 ID 路径的删除请求
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  
  try {
    // 鉴权已由 /api/_middleware.js 统一处理

    // 2. 执行删除
    const id = params.id;
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
