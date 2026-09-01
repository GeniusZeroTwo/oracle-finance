export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 放行 OPTIONS 请求，以便 CORS 预检通过（如果需要在开发环境中跨域调用）
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // 放行免鉴权的路由 (如登录和发送验证码)
  if (url.pathname.startsWith('/api/auth/')) {
    return next();
  }

  // 1. 鉴权：检查 Authorization 头
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: "未授权访问，缺失 Token" }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  // 2. 校验 Token 并在 KV 中查询会话数据
  const sessionDataStr = await env.AUTH_KV.get(`session:${token}`);
  if (!sessionDataStr) {
    return new Response(JSON.stringify({ error: "登录已过期，请重新验证" }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. 安全校验：检查 User-Agent（防止跨设备/跨浏览器窃取 Token），放宽动态 IP 限制以适应家庭宽带、IPv6及移动网络
  try {
    const sessionData = JSON.parse(sessionDataStr);
    const currentUserAgent = request.headers.get('User-Agent') || 'unknown';

    // 如果会话包含 User-Agent 且与当前请求明显不匹配（跨设备/跨浏览器使用），则拒绝访问
    if (sessionData.userAgent && sessionData.userAgent !== currentUserAgent) {
      return new Response(JSON.stringify({ error: "检测到异地设备环境变动，请重新登录" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (e) {
    // 向前兼容：如果解析 JSON 失败（老的会话字符串 'valid'），允许通过但建议重新登录
    if (sessionDataStr !== 'valid') {
       return new Response(JSON.stringify({ error: "会话数据异常，请重新登录" }), { 
         status: 401,
         headers: { 'Content-Type': 'application/json' }
       });
    }
  }

  // 4. 执行后续的 API 处理逻辑
  return next();
}
