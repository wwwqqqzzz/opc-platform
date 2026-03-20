import { NextResponse } from 'next/server';
import { clearAuthCookie, getAuthenticatedUser } from '@/lib/jwt';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      await clearAuthCookie();
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
