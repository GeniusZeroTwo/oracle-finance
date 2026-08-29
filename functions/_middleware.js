export async function onRequest(context) {
  const { request, next } = context;
  const response = await next();
  
  // Clone the response so we can modify headers
  const res = new Response(response.body, response);
  
  // Apply Global Security Headers
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Hardened CSP: 移除 unsafe-eval，收敛 connect-src 仅允许 self 及汇率 API，防止凭证被外发
  res.headers.set(
    'Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://open.er-api.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
  );

  return res;
}
