import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const fid = request.headers.get('x-user-fid')
  
  if (!fid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch user from Neynar API
    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY!,
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

    // Upsert user in database
    const user = await db.user.upsert({
      where: { fid: parseInt(fid) },
      update: {
        username: neynarUser.username,
        displayName: neynarUser.display_name,
        pfpUrl: neynarUser.pfp_url,
        bio: neynarUser.profile.bio.text,
        primaryAddress: neynarUser.verified_addresses.eth_addresses[0] || null,
      },
      create: {
        fid: parseInt(fid),
        username: neynarUser.username,
        displayName: neynarUser.display_name,
        pfpUrl: neynarUser.pfp_url,
        bio: neynarUser.profile.bio.text,
        primaryAddress: neynarUser.verified_addresses.eth_addresses[0] || null,
      },
    })

    return NextResponse.json({
      fid: user.fid,
      username: user.username || null,
      displayName: user.displayName || null,
      pfpUrl: user.pfpUrl,
      bio: user.bio,
      primaryAddress: user.primaryAddress,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}

