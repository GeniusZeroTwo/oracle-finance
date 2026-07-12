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
  
  // Basic CSP: Allows scripts and styles to be loaded safely for React apps
  res.headers.set(
    'Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
  );

  return res;
}
