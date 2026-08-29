export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

    // 1. IP 级频控校验 (防单 IP 恶意刷接口)
    const ipRateLimitKey = `ratelimit:ip:${clientIp}`;
    const isIpRateLimited = await env.AUTH_KV.get(ipRateLimitKey);
    if (isIpRateLimited) {
      return new Response(JSON.stringify({ error: "当前网络请求过于频繁，请稍后再试" }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 全局频控校验 (防 Telegram 发信轰炸)
    const isGlobalRateLimited = await env.AUTH_KV.get('ratelimit:admin');
    if (isGlobalRateLimited) {
      return new Response(JSON.stringify({ error: "请求过于频繁，请等待 60 秒后再试" }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 记录发送频控状态 (单 IP 与全局均锁定 60 秒)
    await env.AUTH_KV.put('ratelimit:admin', 'locked', { expirationTtl: 60 });
    if (clientIp !== 'unknown') {
      await env.AUTH_KV.put(ipRateLimitKey, 'locked', { expirationTtl: 60 });
    }

    // 3. 密码学安全随机数生成 6 位数字验证码
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const code = (100000 + (randomBuffer[0] % 900000)).toString();

    // 4. 将验证码存入 Cloudflare KV，设置有效期为 5 分钟 (300 秒)
    await env.AUTH_KV.put('code:admin', code, { expirationTtl: 300 });

    // 5. 关键修复：清除旧验证码的错误重试计数，解除达到 5 次后的永久锁死状态
    await env.AUTH_KV.delete('attempts:admin');

    // 3. 准备 Telegram 发送所需的环境变量
    const botToken = env.TG_BOT_TOKEN;
    // 严格使用 ADMIN_CHAT_ID，与 README 保持完全一致
    const chatId = env.ADMIN_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("环境变量未配置。目前读取到 BOT_TOKEN:", !!botToken, "CHAT_ID (ADMIN_CHAT_ID):", !!chatId);
      return new Response(JSON.stringify({ error: "系统配置错误，无法发送验证码 (缺失 TG 机器人参数或 ADMIN_CHAT_ID)" }), { 
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
      return new Response(JSON.stringify({ error: "Telegram 推送失败，请检查机器人配置是否正确" }), { 
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
