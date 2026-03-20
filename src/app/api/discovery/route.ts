import { NextResponse } from 'next/server'
import { getDiscoverySnapshot } from '@/lib/discovery'

export async function GET() {
  try {
    const snapshot = await getDiscoverySnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Failed to build discovery snapshot:', error)
    return NextResponse.json({ error: 'Failed to build discovery snapshot' }, { status: 500 })
  }
}
