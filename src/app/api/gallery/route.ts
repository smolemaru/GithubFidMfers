import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const generations = await db.generation.findMany({
      where: {
        inGallery: true,
        status: 'COMPLETED',
      },
      orderBy: [
        { voteCount: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
      include: {
        user: {
          select: {
            fid: true,
            username: true,
            pfpUrl: true,
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
    })

    const total = await db.generation.count({
      where: {
        inGallery: true,
        status: 'COMPLETED',
      },
    })

    return NextResponse.json({
      generations: generations.map(g => ({
        id: g.id,
        imageUrl: g.imageUrl,
        voteCount: g.voteCount,
        selectedFor900: g.selectedFor900,
        createdAt: g.createdAt,
        user: {
          fid: g.user.fid,
          username: g.user.username,
          pfpUrl: g.user.pfpUrl,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching gallery:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    )
  }
}

