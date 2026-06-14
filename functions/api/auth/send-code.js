export async function onRequestPost(context) {
  const { env } = context;
  
  try {
    // 1. 生成 6 位随机数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. 将验证码存入 Cloudflare KV，这里简化键名为 'code:admin'，5 分钟有效
    await env.AUTH_KV.put('code:admin', code, { expirationTtl: 300 });

    // 3. 调用 Telegram Bot API 发送消息到指定管理员的 chat_id
    const tgUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`;
    const message = `🔐 *甲骨文财务面板登录请求*\n\n验证码: \`${code}\`\n\n_验证码 5 分钟内有效。如非本人操作，请警惕！_`;

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
      return new Response(JSON.stringify({ error: "TG 发信失败，请检查机器人配置" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. 返回成功响应给前端
    return new Response(JSON.stringify({ success: true, message: "验证码已发送" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("发送验证码异常:", error);
    return new Response(JSON.stringify({ error: "内部服务器错误" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
