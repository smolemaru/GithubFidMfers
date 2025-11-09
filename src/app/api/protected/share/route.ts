import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const fid = request.headers.get('x-user-fid')
  
  if (!fid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { generationId, platform } = body

    if (!generationId || !platform) {
      return NextResponse.json(
        { error: 'Missing generationId or platform' },
        { status: 400 }
      )
    }

    if (!['FARCASTER', 'X'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { fid: parseInt(fid) },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already shared on this platform
    const existingShare = await db.socialShare.findUnique({
      where: {
        userId_generationId_platform: {
          userId: user.id,
          generationId,
          platform: platform as 'FARCASTER' | 'X',
        },
      },
    })

    if (existingShare) {
      return NextResponse.json({
        success: true,
        message: 'Already shared on this platform',
      })
    }

    // Create share record
    const share = await db.socialShare.create({
      data: {
        userId: user.id,
        generationId,
        platform: platform as 'FARCASTER' | 'X',
        pointsAwarded: true,
      },
    })

    // Update generation vote count (social shares add to gallery score)
    await db.generation.update({
      where: { id: generationId },
      data: {
        voteCount: {
          increment: 1,
        },
        inGallery: true,
      },
    })

    return NextResponse.json({
      success: true,
      pointsAwarded: 1,
    })
  } catch (error) {
    console.error('Error recording share:', error)
    return NextResponse.json(
      { error: 'Failed to record share' },
      { status: 500 }
    )
  }
}

