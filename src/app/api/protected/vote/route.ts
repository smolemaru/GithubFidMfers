import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const fid = request.headers.get('x-user-fid')
  
  if (!fid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { generationId } = body

    if (!generationId) {
      return NextResponse.json(
        { error: 'Missing generationId' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { fid: parseInt(fid) },
      include: {
        votes: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has already voted (max 2 votes per user)
    if (user.votes.length >= 2) {
      return NextResponse.json(
        { error: 'You have used all your votes (2 max)' },
        { status: 400 }
      )
    }

    // Check if user already voted for this generation
    const existingVote = await db.vote.findUnique({
      where: {
        userId_generationId: {
          userId: user.id,
          generationId,
        },
      },
    })

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted for this generation' },
        { status: 400 }
      )
    }

    // Create vote
    await db.vote.create({
      data: {
        userId: user.id,
        generationId,
      },
    })

    // Update generation vote count
    await db.generation.update({
      where: { id: generationId },
      data: {
        voteCount: {
          increment: 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
      votesRemaining: 2 - (user.votes.length + 1),
    })
  } catch (error) {
    console.error('Error voting:', error)
    return NextResponse.json(
      { error: 'Failed to vote' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const fid = request.headers.get('x-user-fid')
  
  if (!fid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { generationId } = body

    if (!generationId) {
      return NextResponse.json(
        { error: 'Missing generationId' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { fid: parseInt(fid) },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete vote
    const deleted = await db.vote.delete({
      where: {
        userId_generationId: {
          userId: user.id,
          generationId,
        },
      },
    })

    // Update generation vote count
    await db.generation.update({
      where: { id: generationId },
      data: {
        voteCount: {
          decrement: 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    )
  }
}

