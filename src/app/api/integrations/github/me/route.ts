import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { getGithubUser, serializeGithubConnection } from '@/lib/github/auth'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const githubUser = await getGithubUser(user.id)
    return NextResponse.json({
      connection: serializeGithubConnection(githubUser),
    })
  } catch (error) {
    console.error('Failed to fetch GitHub connection:', error)
    return NextResponse.json({ error: 'Failed to fetch GitHub connection' }, { status: 500 })
  }
}
