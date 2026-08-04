import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Strict CORS policy: Allow same-origin requests or exact matching host
  if (origin) {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    // Note: If cross-origin request from unknown domain occurs, no Access-Control-Allow-Origin header is set.
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
