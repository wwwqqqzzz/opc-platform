import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

// Public paths that don't require authentication
const publicPaths = ['/login', '/register', '/api/auth', '/idea', '/project', '/launch', '/docs'];

// Protected paths that require authentication
const protectedPaths = ['/dashboard'];

// API routes that require authentication for specific methods
const protectedApiRoutes = [
  { path: '/api/bots', methods: ['POST'] },
  { path: '/api/ideas', methods: ['POST'] },
  { path: '/api/posts', methods: ['POST'] },
  { path: '/api/projects', methods: ['POST'] },
];

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Allow static files and assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if it's a public path
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Only redirect away from auth pages when the token is still valid.
  if (token && (pathname === '/login' || pathname === '/register')) {
    const payload = verifyToken(token);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const response = NextResponse.next();
    response.cookies.delete('auth_token');
    return response;
  }

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if it's a protected page path
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  // Check if it's a protected API route
  const protectedApiRoute = protectedApiRoutes.find(route =>
    pathname.startsWith(route.path) && route.methods.includes(request.method)
  );

  // For protected paths, verify token
  if (isProtectedPath || protectedApiRoute) {
    if (!token) {
      // For API routes, return 401
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // For page routes, redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token is valid
    const payload = verifyToken(token);
    if (!payload) {
      // Token is invalid, clear it and redirect to login with the original target.
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);

      const response = pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        : NextResponse.redirect(loginUrl);

      response.cookies.delete('auth_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
