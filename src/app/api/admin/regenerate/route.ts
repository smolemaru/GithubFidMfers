import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/env'

export async function POST(request: NextRequest) {
  const fid = request.headers.get('x-user-fid')
  
  if (!fid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify admin
    const admin = await db.user.findUnique({
      where: { fid: parseInt(fid) },
    })

    if (!admin || admin.primaryAddress?.toLowerCase() !== env.ADMIN_WALLET_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { generationId, fid: targetFid } = body

    if (!generationId || !targetFid) {
      return NextResponse.json(
        { error: 'Missing generationId or fid' },
        { status: 400 }
      )
    }

    // Fetch user data
    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${targetFid}`,
      {
        headers: {
          'api_key': env.NEYNAR_API_KEY,
        },
      }
    )

    if (!neynarResponse.ok) {
      throw new Error('Failed to fetch user from Neynar')
    }

    const neynarData = await neynarResponse.json()
    const neynarUser = neynarData.users[0]

    // Update generation to processing
    await db.generation.update({
      where: { id: generationId },
      data: {
        status: 'PROCESSING',
        userPfpUrl: neynarUser.pfp_url,
        userBio: neynarUser.profile.bio.text,
        userFollowers: neynarUser.follower_count,
        userVerified: neynarUser.power_badge || false,
      },
    })

    // Call Python backend
    try {
      const pythonResponse = await fetch(`${env.PYTHON_BACKEND_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: targetFid,
          pfp_url: neynarUser.pfp_url,
          bio: neynarUser.profile.bio.text,
          follower_count: neynarUser.follower_count,
          power_badge: neynarUser.power_badge || false,
          generation_id: generationId,
        }),
      })

      if (!pythonResponse.ok) {
        throw new Error('Python backend generation failed')
      }

      const pythonData = await pythonResponse.json()

      // Update generation
      await db.generation.update({
        where: { id: generationId },
        data: {
          status: 'COMPLETED',
          imageUrl: pythonData.imageUrl,
        },
      })

      return NextResponse.json({
        success: true,
        imageUrl: pythonData.imageUrl,
      })
    } catch (pythonError) {
      console.error('Python generation error:', pythonError)
      
      await db.generation.update({
        where: { id: generationId },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        { error: 'Generation failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error regenerating:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate' },
      { status: 500 }
    )
  }
}

