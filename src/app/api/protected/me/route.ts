import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/quickauth'
import { env } from '@/env'

export async function GET(request: NextRequest) {
  // Get user from JWT token
  const authHeader = request.headers.get('authorization')
  console.log('Auth header present:', !!authHeader)
  
  const user = await getUserFromRequest(request)
  
  if (!user) {
    console.error('getUserFromRequest returned null - authentication failed')
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Failed to authenticate. Check server logs for details.'
    }, { status: 401 })
  }
  
  console.log('User authenticated:', user.fid)

  try {
    // Fetch user from Neynar API
    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${user.fid}`,
      {
        headers: {
          'api_key': env.NEYNAR_API_KEY || '',
        },
      }
    )

    if (!neynarResponse.ok) {
      throw new Error('Failed to fetch user from Neynar')
    }

    const neynarData = await neynarResponse.json()
    const neynarUser = neynarData.users[0]

    if (!neynarUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Upsert user in database with latest Neynar data
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        username: neynarUser.username || null,
        displayName: neynarUser.display_name || null,
        pfpUrl: neynarUser.pfp_url || null,
        bio: neynarUser.profile?.bio?.text || null,
        primaryAddress: neynarUser.verified_addresses?.eth_addresses?.[0] || null,
      },
    })

    return NextResponse.json({
      fid: updatedUser.fid,
      username: updatedUser.username || null,
      displayName: updatedUser.displayName || null,
      pfpUrl: updatedUser.pfpUrl,
      bio: updatedUser.bio,
      primaryAddress: updatedUser.primaryAddress,
      referralCode: updatedUser.referralCode,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}

