export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { code } = body;

    // 1. 基本校验
    if (!code) {
      return new Response(JSON.stringify({ error: "请输入验证码" }), { status: 400 });
    }

    // 2. 从 Cloudflare KV 中读取存储的验证码
    const storedCode = await env.AUTH_KV.get('code:admin');

    // 3. 校验比对
    if (!storedCode || storedCode !== code) {
      return new Response(JSON.stringify({ error: "验证码错误或已过期" }), { status: 401 });
    }

    // 4. 验证成功：生成安全的访问 Token
    const token = crypto.randomUUID();

    // 5. 将 Token 存入 KV，代表用户已登录，有效期设置 7 天
    // 存储的值可以是任意内容，代表有效即可
    await env.AUTH_KV.put(`session:${token}`, 'admin_logged_in', { expirationTtl: 604800 });

    // 6. 阅后即焚：立即销毁用过的验证码
    await env.AUTH_KV.delete('code:admin');

    // 7. 将 Token 返回给前端
    return new Response(JSON.stringify({ success: true, token: token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("验证过程发生错误:", error);
    return new Response(JSON.stringify({ error: "验证过程发生错误" }), { status: 500 });
  }
}
