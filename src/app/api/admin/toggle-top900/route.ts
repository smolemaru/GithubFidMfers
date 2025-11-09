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
    const { generationId, selected } = body

    if (!generationId || typeof selected !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing generationId or selected' },
        { status: 400 }
      )
    }

    // If selecting, check if we haven't exceeded 900
    if (selected) {
      const currentCount = await db.generation.count({
        where: { selectedFor900: true },
      })

      if (currentCount >= 900) {
        return NextResponse.json(
          { error: 'Already selected 900 generations' },
          { status: 400 }
        )
      }
    }

    // Update generation
    await db.generation.update({
      where: { id: generationId },
      data: {
        selectedFor900: selected,
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error toggling top 900:', error)
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    )
  }
}

