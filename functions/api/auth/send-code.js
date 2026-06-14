// 这个文件处理前端请求验证码的逻辑，并通过 TG 机器人发信
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // 1. 获取前端传来的用户名
    const body = await request.json();
    const { username } = body;

    // 2. 核心安全校验：检查是否为环境变量中配置的白名单管理员
    if (!username || username !== env.ADMIN_USERNAME) {
      // 故意模糊报错，不暴露真实原因，增加爆破难度
      return new Response(JSON.stringify({ error: "用户名不存在或无权限" }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 生成 6 位随机数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. 将验证码存入 Cloudflare KV，设置 5 分钟 (300秒) 后自动过期销毁
    // 注意：需要在 Cloudflare 后台绑定名为 AUTH_KV 的 KV 命名空间
    await env.AUTH_KV.put(`code:${username}`, code, { expirationTtl: 300 });

    // 5. 调用 Telegram Bot API 发送消息到指定管理员的 chat_id
    const tgUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`;
    const message = `🔐 *甲骨文财务面板登录请求*\n\n用户名: \`${username}\`\n验证码: \`${code}\`\n\n_验证码 5 分钟内有效。如非本人操作，请警惕！_`;

    const tgResponse = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!tgResponse.ok) {
      console.error("TG 发送失败:", await tgResponse.text());
      throw new Error("TG 发信失败");
    }

    // 6. 返回成功响应给前端
    return new Response(JSON.stringify({ success: true, message: "验证码已发送" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "内部服务器错误" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
