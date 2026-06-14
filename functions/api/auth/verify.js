// 这个文件处理验证码校验，并颁发安全 Token
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { username, code } = body;

    // 1. 基本校验
    if (!username || !code) {
      return new Response(JSON.stringify({ error: "参数不完整" }), { status: 400 });
    }

    // 2. 从 Cloudflare KV 中读取存储的验证码
    const storedCode = await env.AUTH_KV.get(`code:${username}`);

    // 3. 校验比对
    if (!storedCode || storedCode !== code) {
      return new Response(JSON.stringify({ error: "验证码错误或已过期" }), { status: 401 });
    }

    // 4. 验证成功：生成安全的访问 Token (这里使用标准 UUID)
    const token = crypto.randomUUID();

    // 5. 将 Token 存入 KV，代表用户已登录，有效期设置 7 天 (604800 秒)
    await env.AUTH_KV.put(`session:${token}`, username, { expirationTtl: 604800 });

    // 6. 阅后即焚：立即销毁用过的验证码，防止重放攻击
    await env.AUTH_KV.delete(`code:${username}`);

    // 7. 将 Token 返回给前端
    return new Response(JSON.stringify({ success: true, token: token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "验证过程发生错误" }), { status: 500 });
  }
}
