export async function onRequestPost(context) {
  const { env } = context;
  
  try {
    // 🆕 安全修复 1：防止发信轰炸 (Rate Limiting)
    // 检查过去 60 秒内是否已经发送过请求
    const isRateLimited = await env.AUTH_KV.get('ratelimit:admin');
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: "请求过于频繁，请等待 60 秒后再试" }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 记录发送时间戳，限制 60 秒内只能发送一次
    await env.AUTH_KV.put('ratelimit:admin', 'locked', { expirationTtl: 60 });

    // 1. 生成 6 位随机数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. 将验证码存入 Cloudflare KV，设置有效期为 5 分钟 (300 秒)
    await env.AUTH_KV.put('code:admin', code, { expirationTtl: 300 });

    // 3. 准备 Telegram 发送所需的环境变量
    const botToken = env.TG_BOT_TOKEN;
    const chatId = env.TG_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("环境变量 TG_BOT_TOKEN 或 TG_CHAT_ID 未配置");
      return new Response(JSON.stringify({ error: "系统配置错误，无法发送验证码" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. 构建发送给 Telegram 的消息体
    const message = `🔐 *系统安全验证*\n\n您的登录验证码是：\`${code}\`\n该验证码在 5 分钟内有效。\n\n_如果这不是您的操作，请检查是否有人试图访问您的面板。_`;

    // 5. 调用 Telegram Bot API 发送消息
    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!tgResponse.ok) {
      const errorText = await tgResponse.text();
      console.error("Telegram API 发送失败:", errorText);
      return new Response(JSON.stringify({ error: "Telegram 推送失败，请检查机器人配置" }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. 返回成功响应
    return new Response(JSON.stringify({ success: true, message: "验证码已发送到绑定的 Telegram" }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("send-code 接口发生异常:", error);
    return new Response(JSON.stringify({ error: "服务器内部错误，发信失败" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
