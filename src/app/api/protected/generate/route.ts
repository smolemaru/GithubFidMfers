import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/env'

export async function POST(request: NextRequest) {
  const fid = request.headers.get('x-user-fid')
  
  if (!fid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await db.user.findUnique({
      where: { fid: parseInt(fid) },
      include: {
        payments: {
          where: { status: 'CONFIRMED' },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has available generations
    const availablePayment = user.payments.find(p => p.generationsUsed < 2)

    if (!availablePayment) {
      return NextResponse.json(
        { error: 'No generations available. Please purchase more.' },
        { status: 400 }
      )
    }

    // Fetch user's Farcaster data
    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
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

    // Create generation record
    const generation = await db.generation.create({
      data: {
        userId: user.id,
        fid: user.fid,
        prompt: 'VibeMfer generation',
        status: 'PROCESSING',
        userPfpUrl: neynarUser.pfp_url,
        userBio: neynarUser.profile.bio.text,
        userFollowers: neynarUser.follower_count,
        userVerified: neynarUser.power_badge || false,
        imageUrl: '', // Will be updated after generation
      },
    })

    // Update payment generations used
    await db.payment.update({
      where: { id: availablePayment.id },
      data: {
        generationsUsed: availablePayment.generationsUsed + 1,
      },
    })

    // Call Python backend to generate image
    try {
      const pythonResponse = await fetch(`${env.PYTHON_BACKEND_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: user.fid,
          pfp_url: neynarUser.pfp_url,
          bio: neynarUser.profile.bio.text,
          follower_count: neynarUser.follower_count,
          power_badge: neynarUser.power_badge || false,
          generation_id: generation.id,
        }),
      })

      if (!pythonResponse.ok) {
        throw new Error('Python backend generation failed')
      }

      const pythonData = await pythonResponse.json()

      // Update generation with image URL
      await db.generation.update({
        where: { id: generation.id },
        data: {
          status: 'COMPLETED',
          imageUrl: pythonData.imageUrl,
        },
      })

      return NextResponse.json({
        id: generation.id,
        imageUrl: pythonData.imageUrl,
        status: 'COMPLETED',
      })
    } catch (pythonError) {
      console.error('Python generation error:', pythonError)
      
      // Mark generation as failed
      await db.generation.update({
        where: { id: generation.id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json({
        id: generation.id,
        imageUrl: '',
        status: 'FAILED',
        message: 'Generation failed. Please try again.',
      })
    }
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}

