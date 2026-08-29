// functions/api/auth/logout.js
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && env.AUTH_KV) {
        await env.AUTH_KV.delete(`session:${token}`);
      }
    }

    return new Response(JSON.stringify({ success: true, message: "已安全登出并销毁会话" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("登出接口异常:", error);
    return new Response(JSON.stringify({ error: "登出处理失败" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
