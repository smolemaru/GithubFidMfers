import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/env'
import { getUserFromRequest } from '@/lib/quickauth'

export async function POST(request: NextRequest) {
  // Get user from JWT token
  const user = await getUserFromRequest(request)
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user with payments
    const userWithPayments = await db.user.findUnique({
      where: { id: user.id },
      include: {
        payments: {
          where: { status: 'CONFIRMED' },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!userWithPayments) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has available generations
    const availablePayment = userWithPayments.payments.find(p => p.generationsUsed < 2)

    if (!availablePayment) {
      return NextResponse.json(
        { error: 'No generations available. Please purchase more.' },
        { status: 400 }
      )
    }

    // Fetch user's Farcaster data
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

    // Create generation record
    const generation = await db.generation.create({
      data: {
        userId: user.id,
        fid: user.fid,
        prompt: 'FIDMfer generation',
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
      if (!env.PYTHON_BACKEND_URL) {
        throw new Error('Python backend URL not configured')
      }

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
        const errorText = await pythonResponse.text()
        console.error('Python backend error:', errorText)
        throw new Error(`Python backend generation failed: ${errorText}`)
      }

      const pythonData = await pythonResponse.json()

      if (!pythonData.imageBase64) {
        throw new Error('No image data received from Python backend')
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(pythonData.imageBase64, 'base64')

      // Upload to Pinata
      const { uploadImageToIPFS, ipfsToHttp } = await import('@/lib/ipfs')
      const ipfsUri = await uploadImageToIPFS(
        imageBuffer,
        `fidmfer-${generation.id}.png`
      )

      // Get HTTP URL for display
      const imageUrl = ipfsToHttp(ipfsUri)

      // Update generation with image URL
      await db.generation.update({
        where: { id: generation.id },
        data: {
          status: 'COMPLETED',
          imageUrl: imageUrl,
          ipfsImageUri: ipfsUri,
        },
      })

      return NextResponse.json({
        id: generation.id,
        imageUrl: imageUrl,
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
        message: pythonError instanceof Error ? pythonError.message : 'Generation failed. Please try again.',
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

