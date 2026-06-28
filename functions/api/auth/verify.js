export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { code } = body;

    // 1. 基本校验
    if (!code) {
      return new Response(JSON.stringify({ error: "请输入验证码" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 🆕 安全修复：防止暴力猜解破解 (Brute-force protection)
    const attempts = parseInt(await env.AUTH_KV.get('attempts:admin') || '0');
    if (attempts >= 5) {
      return new Response(JSON.stringify({ error: "错误次数过多，系统已锁定该验证码，请重新获取" }), {
        status: 429, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 从 Cloudflare KV 中读取存储的验证码
    const storedCode = await env.AUTH_KV.get('code:admin');

    // 3. 校验比对
    if (!storedCode || storedCode !== code) {
      // 记录失败次数，防止爆破，5 分钟有效 (跟随验证码有效期)
      await env.AUTH_KV.put('attempts:admin', (attempts + 1).toString(), { expirationTtl: 300 });
      return new Response(JSON.stringify({ error: "验证码错误或已过期" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. 验证成功：清除失败记录并生成安全的访问 Token
    await env.AUTH_KV.delete('attempts:admin');
    // 使用 Web Crypto API 生成高强度随机 UUID
    const token = crypto.randomUUID();

    // 5. 将 Token 存入 KV，代表用户已登录，有效期设置 7 天 (60 * 60 * 24 * 7 = 604800 秒)
    await env.AUTH_KV.put(`session:${token}`, 'valid', { expirationTtl: 604800 });

    // 6. 安全加固：验证成功后，立即销毁当前验证码（防止验证码重放攻击）
    await env.AUTH_KV.delete('code:admin');

    // 7. 返回 Token 给前端
    return new Response(JSON.stringify({ success: true, token: token }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("verify 接口发生异常:", error);
    return new Response(JSON.stringify({ error: "服务器内部错误，验证失败" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
