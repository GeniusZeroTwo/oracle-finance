/**
 * 校验请求的 Origin 是否在允许列表中
 * 1. 同源请求 (Origin 与当前 Host 完全一致)
 * 2. 本地开发环境 (localhost / 127.0.0.1 任意端口)
 * 3. 环境变量 ALLOWED_ORIGINS 白名单列表 (逗号分隔)
 */
function isAllowedOrigin(origin, requestUrl, env) {
  if (!origin) return false;

  try {
    const currentUrl = new URL(requestUrl);
    // 1. 同源访问允许
    if (origin === currentUrl.origin) return true;

    const originUrl = new URL(origin);
    // 2. 本地开发环境允许 (http://localhost:*, http://127.0.0.1:*)
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
      return true;
    }

    // 3. 环境变量白名单
    if (env && env.ALLOWED_ORIGINS) {
      const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase());
      if (allowedOrigins.includes(origin.toLowerCase())) {
        return true;
      }
    }
  } catch (e) {
    return false;
  }

  return false;
}

function applyCorsHeaders(response, origin) {
  const res = new Response(response.body, response);
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Vary', 'Origin');
  return res;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowed = isAllowedOrigin(origin, request.url, env);

  // 1. 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    if (origin && !allowed) {
      return new Response(JSON.stringify({ error: "CORS 策略拒绝该跨域来源" }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const preflightHeaders = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (origin && allowed) {
      preflightHeaders['Access-Control-Allow-Origin'] = origin;
      preflightHeaders['Vary'] = 'Origin';
    }

    return new Response(null, {
      status: 204,
      headers: preflightHeaders
    });
  }

  // 辅助函数：统一给响应附带 CORS 头（若来源合法且属于跨域请求）
  const wrapResponse = (res) => {
    if (origin && allowed) {
      return applyCorsHeaders(res, origin);
    }
    return res;
  };

  // 放行免鉴权的路由 (如登录和发送验证码)
  if (url.pathname.startsWith('/api/auth/')) {
    const authRes = await next();
    return wrapResponse(authRes);
  }

  // 2. 鉴权：检查 Authorization 头
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return wrapResponse(new Response(JSON.stringify({ error: "未授权访问，缺失 Token" }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  
  const token = authHeader.split(' ')[1];
  
  // 3. 校验 Token 并在 KV 中查询会话数据
  const sessionDataStr = await env.AUTH_KV.get(`session:${token}`);
  if (!sessionDataStr) {
    return wrapResponse(new Response(JSON.stringify({ error: "登录已过期，请重新验证" }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // 4. 安全校验：检查 User-Agent（防止跨设备/跨浏览器窃取 Token），放宽动态 IP 限制以适应家庭宽带、IPv6及移动网络
  try {
    const sessionData = JSON.parse(sessionDataStr);
    const currentUserAgent = request.headers.get('User-Agent') || 'unknown';

    // 如果会话包含 User-Agent 且与当前请求明显不匹配（跨设备/跨浏览器使用），则拒绝访问
    if (sessionData.userAgent && sessionData.userAgent !== currentUserAgent) {
      return wrapResponse(new Response(JSON.stringify({ error: "检测到异地设备环境变动，请重新登录" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  } catch (e) {
    // 向前兼容：如果解析 JSON 失败（老的会话字符串 'valid'），允许通过但建议重新登录
    if (sessionDataStr !== 'valid') {
       return wrapResponse(new Response(JSON.stringify({ error: "会话数据异常，请重新登录" }), { 
         status: 401,
         headers: { 'Content-Type': 'application/json' }
       }));
    }
  }

  // 5. 执行后续的 API 处理逻辑
  const res = await next();
  return wrapResponse(res);
}
